-- 20260817184423_delegar_chamado_gera_tarefa.sql
-- EDU-11 . Chamado delegado vira tarefa no projeto de chamados do cliente.
--
-- Hoje a delegacao grava tickets.assigned_to e para ai. A tarefa equivalente,
-- quando existe, foi digitada a mao. Isto poe a criacao no banco: um trigger
-- AFTER em tickets, para que os tres pontos de delegacao do front
-- (GestaoChamados, GestaoDetalhesChamado e EquipeChamados, os tres via
-- useAssignTicket) fiquem cobertos por um caminho so, dentro da MESMA
-- transacao do UPDATE que delega.
--
-- Decisoes de 09/08/2026:
--   - AFTER e nao BEFORE. Em BEFORE INSERT a linha de tickets ainda nao existe
--     e a FK org_tasks.ticket_id -> tickets(id) falharia com 23503.
--   - reentrancia pelo indice unico parcial uq_org_tasks_ticket + ON CONFLICT.
--     Delegar de novo troca a pessoa; nunca abre segunda linha.
--   - cliente sem projeto de canal: RAISE WARNING e segue. NUNCA EXCEPTION: a
--     delegacao e operacao de gestao e nao pode ser bloqueada por falta de
--     cadastro. Quem avisa o usuario na tela e a ALE-5.
--   - desatribuir (assigned_to -> null) NAO apaga a tarefa ja criada.
--   - sem backfill dos chamados ja delegados.
--
-- Conferido no banco em 09/08/2026, nao presumido:
--   tickets tinha 347 linhas, TODAS com assigned_to preenchido e NENHUMA com
--   cliente_id nulo; priority e text ANULAVEL sem check.
--   org_tasks nao tem ticket_id, dona = postgres e relforcerowsecurity = false.
--   E POR ISSO que SECURITY DEFINER daqui nao esbarra em rls_org_tasks_insert:
--   dona de tabela sem FORCE nao passa por RLS.
--
-- RECONFERIDO EM 14/08/2026, quatro pontos:
--   1. tickets agora tem 352 linhas, todas delegadas, nenhuma sem cliente, e os
--      11 clientes distintos seguem 11. As prioridades vivas continuam tres:
--      'alta', 'normal' e 'urgente'. 'baixa' e oferecida na tela e nunca
--      apareceu: o ELSE do CASE cobre.
--   2. org_tasks tem 27 colunas e nao 26, porque a EDU-10 acrescentou
--      tarefa_padrao_id. Com a ticket_id daqui vai a 28, como o enunciado previa.
--      relforcerowsecurity segue false.
--   3. RECURSAO: o enunciado afirma que org_tasks tem QUATRO triggers e que
--      nenhum escreve em tickets. HOJE SAO SEIS: entraram
--      trg_notificar_tarefa_atribuida e trg_notificar_tarefa_em_revisao, da
--      frente de notificacoes. Conferido um a um: nenhum trigger de org_tasks
--      toca tickets e nenhum de tickets toca org_tasks, entao CONTINUA SEM
--      CICLO. Antes de pendurar qualquer trigger novo em org_tasks, volte aqui.
--   4. EFEITO COLATERAL NOVO, e ele e desejado: trg_notificar_tarefa_atribuida e
--      AFTER UPDATE OF assigned_to em org_tasks, com WHEN de responsavel novo
--      diferente do anterior e diferente de quem agiu. Logo o caminho
--      ON CONFLICT DO UPDATE daqui (a REDELEGACAO) vai acordar esse trigger e
--      NOTIFICAR o novo responsavel. Na criacao inicial ele nao dispara, porque
--      e trigger de UPDATE. O enunciado, de 09/08, nao previa isso.
--
--   is_canal_chamados existe (EDU-10 aplicada) mas NENHUM produto esta marcado
--   ainda: enquanto for assim, todo chamado delegado cai no ramo do WARNING e
--   zero tarefa e criada. Isso e CORRETO, nao defeito. Marcar e dado, ALE-4/6.
--
-- O NOME DO ARQUIVO nao e o que a tarefa prescreve (20260814120000). Aquela
-- versao e ANTERIOR a 20260814200000, que e a EDU-10, e esta migration depende
-- dela: ordenada assim, uma reconstrucao do banco rodaria a filha antes da mae e
-- falharia. Conteudo identico, versao 20260814210000.
--
-- Reversao:
--   drop trigger if exists trg_tickets_gera_tarefa on public.tickets;
--   drop function if exists public.delegar_chamado_gera_tarefa();
--   drop index if exists public.uq_org_tasks_ticket;
--   alter table public.org_tasks drop column if exists ticket_id;
--   org_tasks_team_member_status_only volta ao corpo que estava em producao em
--   14/08/2026, isto e, este mesmo menos o bloco de pg_trigger_depth().

BEGIN;

-- ── 1) A coluna que liga a tarefa ao chamado ────────────────────────────────
-- CASCADE: a tarefa se chama "Chamado: ..." e nao tem sentido sem ele. Existe
-- exclusao de chamado em massa, so para admin (useTicketMutations). Ela passa a
-- levar junto a tarefa gerada E os comentarios dela, via
-- trg_org_tasks_cascade_delete_comments. E o preco do CASCADE, escrito aqui de
-- proposito para ninguem descobrir depois.
alter table public.org_tasks
  add column if not exists ticket_id uuid
  references public.tickets(id) on delete cascade;

comment on column public.org_tasks.ticket_id is
  'Chamado que originou esta tarefa. Escrito por delegar_chamado_gera_tarefa(). Nulo = tarefa que nao veio de chamado.';

-- E ESTE indice que da reentrancia, e nao um IF dentro da funcao: duas abas
-- delegando ao mesmo tempo passariam pelas duas verificacoes e abririam duas
-- tarefas. Parcial porque as tarefas de hoje nascem todas com ticket_id nulo, e
-- nulo nao colide com nulo (NULLS DISTINCT, o padrao).
create unique index if not exists uq_org_tasks_ticket
  on public.org_tasks (ticket_id) where ticket_id is not null;

-- ── 2) O guarda RLS-06 passa a ignorar escrita feita por outro trigger ──────
-- Corpo IDENTICO ao que esta em producao, mais o bloco de pg_trigger_depth() no
-- topo. Sem esse bloco, o caminho ON CONFLICT DO UPDATE la de baixo morre com
-- 42501 sempre que auth.uid() nao for sublider ou superior, e isso inclui
-- auth.uid() NULO (editor SQL, service_role, cron): OLD.reviewer_id e
-- OLD.created_by sao nulos, as tres primeiras condicoes nao casam, e a
-- comparacao final ve assigned_to mudando e aborta.
-- O comentario original desta funcao ja diz que ela e "a barreira de
-- integridade para UPDATEs diretos". Escrita vinda de trigger nao e direta.
-- pg_trigger_depth() e 1 num UPDATE do usuario e 2 aqui dentro, e NAO E
-- FORJAVEL pelo cliente, ao contrario de uma flag em GUC.
create or replace function public.org_tasks_team_member_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Escrita aninhada em outro trigger (delegar_chamado_gera_tarefa) nao e
  -- UPDATE direto do usuario. A RLS da tabela continua valendo normalmente.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status IS DISTINCT FROM 'done'::public.fiscal_task_status
     AND NEW.status = 'done'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor nao pode concluir a tarefa; devolva para ajustes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status = 'review'::public.fiscal_task_status THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN (
      'review'::public.fiscal_task_status,
      'em_ajuste'::public.fiscal_task_status
    ) THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF public.has_role_or_higher(v_user_id, 'sublider'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- team_member CRIADOR pode editar por inteiro a propria tarefa.
  -- Guardrail: created_by imutavel.
  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- team_member nao-criador (tarefa delegada): so status, horas e revisor.
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id') THEN
    RAISE EXCEPTION 'Tarefa delegada: team_member so pode alterar status, horas e revisor (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

revoke all on function public.org_tasks_team_member_status_only() from public;

-- ── 3) A funcao do trigger ──────────────────────────────────────────────────
create or replace function public.delegar_chamado_gera_tarefa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
  v_qtd     integer;
  v_nome    text;
  v_prio    public.fiscal_task_priority;
begin
  -- Chamado nasce ou fica sem responsavel: nada a fazer.
  if NEW.assigned_to is null then
    return null;
  end if;

  -- IF ANINHADO, e nao "TG_OP = 'UPDATE' and NEW.assigned_to is not distinct
  -- from OLD.assigned_to". SQL nao garante avaliacao da esquerda para a
  -- direita, e no ramo de INSERT o registro OLD nao esta atribuido: tocar
  -- OLD.assigned_to ali levanta 55000.
  if TG_OP = 'UPDATE' then
    if NEW.assigned_to is not distinct from OLD.assigned_to then
      return null;   -- delegou para a mesma pessoa: nada mudou
    end if;
  end if;

  -- tickets.cliente_id e ANULAVEL. Hoje nenhuma linha esta nula, mas o schema
  -- permite e chamado interno nao tem cliente.
  if NEW.cliente_id is null then
    return null;
  end if;

  -- Casa por UUID de cliente, NUNCA por nome de projeto: cliente e
  -- multi-ambiente e o mesmo cliente existe em dev e em prod com ids
  -- diferentes (doutrina em src/lib/ambienteScope.ts). Casando por id o
  -- ambiente sai certo sem nenhum filtro extra, e org_projects nao tem coluna
  -- `ambiente` para filtrar de qualquer jeito.
  -- count(*) over () e calculado ANTES do LIMIT: da o total na mesma passada.
  select q.id, q.total into v_project, v_qtd
    from (select p.id, count(*) over () as total
            from public.org_projects     p
            join public.produto_segmento ps
              on ps.id = p.produto_segmento_id
             and ps.is_canal_chamados
           where p.external_client_id = NEW.cliente_id
           order by p.created_at nulls last, p.id
           limit 1) q;

  if v_project is null then
    -- WARNING e nao EXCEPTION. Esta e a borda que a ALE-5 mostra na tela; aqui
    -- ela so nao pode derrubar a delegacao.
    raise warning 'delegar_chamado_gera_tarefa: cliente % sem projeto de canal de chamados; chamado % delegado SEM tarefa',
      NEW.cliente_id, NEW.id;
    return null;
  end if;

  if v_qtd > 1 then
    -- A EDU-10 garante UM produto marcado como canal, nao um projeto por
    -- cliente. Com dois projetos do mesmo produto a escolha e a do mais antigo,
    -- deterministica; o aviso existe para o DADO ser corrigido, porque o hook
    -- da ALE-5 usa maybeSingle() e vai acusar multiplicidade.
    raise warning 'delegar_chamado_gera_tarefa: cliente % tem % projetos de canal de chamados; usando o mais antigo (%)',
      NEW.cliente_id, v_qtd, v_project;
  end if;

  -- assigned_to_name e COLUNA que a interface le, nao juncao: TaskCard,
  -- TaskCalendar, TaskGantt, TaskKanban, TaskTable e ReassignModal leem dela.
  -- Mesma montagem do front (orgTaskForm.ts): nome e sobrenome, sem sobra.
  select btrim(p.first_name || ' ' || coalesce(p.last_name, ''))
    into v_nome
    from public.profiles p
   where p.id = NEW.assigned_to;

  -- tickets.priority e text ANULAVEL e sem check no banco. Os quatro valores
  -- da tela estao em CreateTicketDialog; 'baixa' e oferecido e ainda nao
  -- apareceu em nenhuma linha. O ELSE cobre 'normal', o nulo e o que vier.
  v_prio := (case lower(coalesce(NEW.priority, ''))
               when 'baixa'   then 'low'
               when 'alta'    then 'high'
               when 'urgente' then 'urgent'
               else                'medium'
             end)::public.fiscal_task_priority;

  insert into public.org_tasks (project_id, ticket_id, client_id,
                                title, description,
                                assigned_to, assigned_to_name,
                                due_date, priority, status, category,
                                created_by)
  values (v_project, NEW.id, NEW.cliente_id,
          'Chamado: ' || NEW.title, NEW.description,
          NEW.assigned_to, v_nome,
          NEW.deadline, v_prio,
          'todo'::public.fiscal_task_status,
          'task'::public.fiscal_task_category,
          auth.uid())
  -- O WHERE do indice parcial e OBRIGATORIO na clausula de inferencia. Sem ele
  -- o Postgres nao casa uq_org_tasks_ticket e levanta 42P10.
  on conflict (ticket_id) where ticket_id is not null
  do update set assigned_to      = excluded.assigned_to,
                assigned_to_name = excluded.assigned_to_name;
  -- SO a pessoa e o nome. Titulo, prazo, prioridade e status ficam como estao:
  -- quem trabalha a tarefa pode ter editado, e redelegar troca o dono, nao
  -- reescreve o trabalho.
  --
  -- reviewer_id NAO aparece no insert: trg_org_tasks_validate_reviewer levanta
  -- 23514 se ele vier com status diferente de 'review'.
  --
  -- CIENTE (14/08/2026): este DO UPDATE acorda trg_notificar_tarefa_atribuida,
  -- que e AFTER UPDATE OF assigned_to em org_tasks, e o novo responsavel recebe
  -- notificacao interna. Comportamento desejado e decidido de proposito.

  return null;   -- trigger AFTER: o valor de retorno e ignorado
end $$;

comment on function public.delegar_chamado_gera_tarefa() is
  'Cria, ou reaponta, a tarefa do projeto de canal de chamados do cliente quando um chamado e delegado. Nunca bloqueia a delegacao: cliente sem projeto de canal vira RAISE WARNING e zero tarefa.';

revoke all on function public.delegar_chamado_gera_tarefa() from public;

-- ── 4) O trigger ────────────────────────────────────────────────────────────
drop trigger if exists trg_tickets_gera_tarefa on public.tickets;
create trigger trg_tickets_gera_tarefa
  after insert or update of assigned_to on public.tickets
  for each row
  execute function public.delegar_chamado_gera_tarefa();
-- A lista de colunas vale SO para UPDATE; no ramo de INSERT o trigger dispara
-- sempre, e quem filtra e a guarda de assigned_to nulo.
-- Convive com trg_capture_ticket_assignment (BEFORE UPDATE OF assigned_to,
-- grava assigned_at, de 20260519133235): mesma condicao de disparo, momentos
-- diferentes, nenhuma interacao. Um cita o outro de proposito.

COMMIT;
