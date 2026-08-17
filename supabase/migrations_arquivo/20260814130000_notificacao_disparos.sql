-- 20260814130000_notificacao_disparos.sql
-- EDU-2 · Os tres disparos de evento que enchem a caixa criada na EDU-1.
--
-- Molde: 20260731120000_org_comment_resposta_notifica.sql, e sobretudo a regra
-- registrada nas linhas 149-152 dele: falha do aviso NAO derruba a escrita
-- principal. Os tres triggers abaixo seguem essa regra.
--
-- Por que trigger de banco e nao hook de mutacao no front: o responsavel de uma
-- tarefa muda por pelo menos tres caminhos (a reatribuicao dedicada, a
-- atualizacao generica que monta o diff dos campos alterados, e a movimentacao
-- entre projetos). Pendurar o aviso em um garante que os outros entrem em
-- producao mudos.
--
-- Decisoes tomadas em 10/08/2026, com numero medido no banco:
--   - `href` fica NULO nos tres. O endereco nao e dado da tarefa, e rota do
--     front: o mesmo aviso aparece no sino do Tax e no da OSG com URLs
--     diferentes, e essa informacao chega no componente como propriedade do
--     layout (FiscalLayout/OsgLayout passam tasksNavigateTo). Gravar a rota aqui
--     congelaria o endereco no dia em que o aviso nasceu, e mudanca de rota
--     exigiria UPDATE varrendo a tabela. Alem disso o front precisa do caminho
--     de derivacao de qualquer forma: ha 1 projeto SEM area com 6 tarefas, para
--     as quais nao existe rota derivavel, e o aviso do trigger 2 aponta para um
--     cliente, que nao tem tela de destino definida. A EDU-3 monta o destino a
--     partir de entidade_tipo + entidade_id, como o sino ja faz hoje na linha
--     262 de src/components/notifications/NotificationPopover.tsx.
--   - o contador conta as movimentacoes: 63 documentos do mesmo cliente no mesmo
--     dia dao UM aviso com quantidade = 63, e nao 63 avisos nem um aviso com
--     quantidade = 1.
--   - lider que TAMBEM e o revisor da tarefa recebe UM aviso so, o derivado de
--     "tarefa para voce revisar" que ja existe em useReviewTaskNotifications.ts.
--     O trigger 3 sai em silencio nesse caso. Medido em 10/08/2026: 16 tarefas
--     estao com reviewer_id igual ao leader_id do projeto, logo seriam 16 linhas
--     duplicadas para a mesma pessoa sem esta guarda.
--
-- Conferido no banco em 10/08/2026, nao presumido: criar_notificacao() e os
-- tipos notificacao_tipo/notificacao_canal existem (EDU-1 aplicada);
-- org_tasks.assigned_to, .title, .status, .project_id (NOT NULL) e .reviewer_id
-- existem; org_projects.leader_id existe e e nullable; documento_arquivo.fonte,
-- .excluido, .cliente_id (NOT NULL) e .ambiente existem; solicitacao.created_by,
-- .cliente_id e .status existem e `solicitacao` NAO tem coluna ambiente, logo a
-- busca abaixo nao cruza ambiente; estrutura_areas.gestor_chamados_id e
-- .is_active existem; os valores 'review' (fiscal_task_status), 'cliente'
-- (osg_doc_fonte) e 'encerrada' (osg_solicitacao_status) existem; nenhuma das
-- tres funcoes abaixo existe ainda. documento_arquivo ja tem UM trigger,
-- trg_doc_arq_updated_at (BEFORE UPDATE), que nao conflita com o AFTER INSERT
-- criado aqui.
--
-- Medido antes de aplicar (10/08/2026):
--   - 3 projetos com tarefa e SEM lider, somando 11 tarefas -> o trigger 3 TEM
--     de sair em silencio, e sai.
--   - 5 clientes ja mandaram arquivo; 2 tem solicitacao nao encerrada e 3 caem
--     no fallback dos gestores, que hoje e 1 pessoa.
--   - pior dia: 7 arquivos do mesmo cliente no mesmo dia -> o agrupamento
--     colapsa 7 linhas em 1 com quantidade = 7.
--
-- Reversao:
--   drop trigger if exists trg_notificar_tarefa_em_revisao on public.org_tasks;
--   drop trigger if exists trg_notificar_documento_recebido on public.documento_arquivo;
--   drop trigger if exists trg_notificar_tarefa_atribuida on public.org_tasks;
--   drop function if exists public.notificar_tarefa_em_revisao();
--   drop function if exists public.notificar_documento_recebido();
--   drop function if exists public.notificar_tarefa_atribuida();

BEGIN;

-- ── 1) A tarefa mudou de responsavel ────────────────────────────────────────
-- A condicao vive no WHEN do trigger, e NAO no corpo da funcao, para o plano nao
-- pagar a chamada de funcao nos updates de outras colunas de org_tasks.
create or replace function public.notificar_tarefa_atribuida()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Falha do aviso nunca derruba a escrita principal (molde 20260731120000).
  begin
    perform public.criar_notificacao(
      NEW.assigned_to, 'tarefa_atribuida',
      'Voce e o responsavel: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
      'tarefa_atribuida:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_atribuida: %', sqlerrm;
  end;
  return NEW;
end $$;

comment on function public.notificar_tarefa_atribuida() is
  'Avisa o novo responsavel da tarefa. Agrupa por tarefa: reatribuir tres vezes nao gera tres avisos.';

drop trigger if exists trg_notificar_tarefa_atribuida on public.org_tasks;
create trigger trg_notificar_tarefa_atribuida
  after update of assigned_to on public.org_tasks
  for each row
  when (NEW.assigned_to is not null
        and NEW.assigned_to is distinct from OLD.assigned_to
        and NEW.assigned_to is distinct from coalesce(auth.uid(),
              '00000000-0000-0000-0000-000000000000'::uuid))
  execute function public.notificar_tarefa_atribuida();
-- AFTER UPDATE nao cobre INSERT: tarefa criada JA com responsavel nao notifica.
-- Escolha deliberada, porque em INSERT nao existe OLD para comparar e todo
-- cadastro novo viraria aviso. A guarda de valor distinto e obrigatoria e nao
-- decorativa: trigger por coluna dispara sempre que a coluna aparece no comando,
-- ainda que o valor seja o mesmo.

-- ── 2) O cliente anexou arquivo ─────────────────────────────────────────────
-- Agrupa por CLIENTE e por DIA: 63 arquivos do mesmo cliente no mesmo dia viram
-- UM aviso com quantidade = 63, pelo indice parcial da EDU-1.
--
-- O bloco de excecao aqui NAO e zelo. O insert e feito pelo navegador do proprio
-- cliente, sob a seguranca dele, e o trigger roda na MESMA transacao: uma
-- excecao derrubaria o upload DEPOIS de o binario ja estar no GCS, deixando
-- arquivo no armazenamento e nada no banco.
--
-- Quem recebe e alguem da PSA, nunca o cliente que acabou de subir o arquivo:
-- o dono da solicitacao ativa e, na falta dele, os gestores de chamados das
-- areas ativas. Por isso este trigger NAO usa destinatarios_cliente(), que
-- devolve os usuarios do proprio cliente.
create or replace function public.notificar_documento_recebido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nome   text;
  v_dono   uuid;
  v_gestor uuid;
  v_chave  text;
begin
  begin
    v_chave := 'documento_recebido:' || NEW.cliente_id::text || ':' ||
               to_char(now(), 'YYYY-MM-DD');

    select c.nome into v_nome from public.cliente c where c.id = NEW.cliente_id;

    -- `solicitacao` nao tem coluna ambiente, entao nao ha ambiente a cruzar aqui.
    select s.created_by into v_dono
      from public.solicitacao s
     where s.cliente_id = NEW.cliente_id
       and s.status <> 'encerrada'::public.osg_solicitacao_status
     order by s.created_at desc
     limit 1;

    if v_dono is not null then
      perform public.criar_notificacao(
        v_dono, 'documento_recebido',
        'Documento recebido de ' || coalesce(v_nome, 'cliente'),
        'cliente', NEW.cliente_id,
        null,     -- corpo
        null,     -- href: sem tela de destino por cliente, ver cabecalho
        v_chave,
        -- ambiente NAO filtra o disparo, mas entra nos metadados para o item do
        -- sino nao misturar dev e prod.
        jsonb_build_object('ambiente', NEW.ambiente));
    else
      -- Sem solicitacao ativa, o aviso vai para os gestores de chamados. Se nao
      -- houver nenhum, o laco nao itera e o trigger sai em silencio.
      for v_gestor in
        select distinct a.gestor_chamados_id
          from public.estrutura_areas a
         where a.is_active and a.gestor_chamados_id is not null
      loop
        perform public.criar_notificacao(
          v_gestor, 'documento_recebido',
          'Documento recebido de ' || coalesce(v_nome, 'cliente'),
          'cliente', NEW.cliente_id,
          null, null, v_chave,
          jsonb_build_object('ambiente', NEW.ambiente));
      end loop;
    end if;
  exception when others then
    raise warning 'notificar_documento_recebido: %', sqlerrm;
  end;
  return NEW;
end $$;

comment on function public.notificar_documento_recebido() is
  'Avisa a PSA que o cliente anexou arquivo. Agrupa por cliente e por dia. Corpo protegido por bloco de excecao porque o insert vem do navegador do cliente e uma falha derrubaria o upload.';

drop trigger if exists trg_notificar_documento_recebido on public.documento_arquivo;
create trigger trg_notificar_documento_recebido
  after insert on public.documento_arquivo
  for each row
  when (NEW.fonte = 'cliente'::public.osg_doc_fonte and NEW.excluido = false)
  execute function public.notificar_documento_recebido();

-- ── 3) A tarefa entrou em revisao ───────────────────────────────────────────
-- Destinatario: o LIDER do projeto. O revisor ja e avisado pela fonte derivada
-- que existe hoje (src/hooks/useReviewTaskNotifications.ts, que filtra
-- reviewer_id = usuario e status = review).
create or replace function public.notificar_tarefa_em_revisao()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lider uuid;
begin
  begin
    select p.leader_id into v_lider
      from public.org_projects p where p.id = NEW.project_id;

    -- Projeto sem lider sai em silencio, sem excecao. Nao e caso hipotetico:
    -- medidos 3 projetos com tarefa e sem lider, somando 11 tarefas.
    if v_lider is null then return NEW; end if;

    -- Lider que TAMBEM e o revisor recebe UM aviso so, e e o derivado de
    -- "tarefa para voce revisar". Sem esta guarda seriam 16 tarefas com linha
    -- duplicada para a mesma pessoa.
    if NEW.reviewer_id is not null and NEW.reviewer_id = v_lider then
      return NEW;
    end if;

    perform public.criar_notificacao(
      v_lider, 'tarefa_em_revisao',
      'Tarefa em revisao: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
      'tarefa_em_revisao:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_em_revisao: %', sqlerrm;
  end;
  return NEW;
end $$;

comment on function public.notificar_tarefa_em_revisao() is
  'Avisa o lider do projeto que a tarefa entrou em revisao. Sai em silencio se o projeto nao tem lider ou se o lider e o proprio revisor.';

drop trigger if exists trg_notificar_tarefa_em_revisao on public.org_tasks;
create trigger trg_notificar_tarefa_em_revisao
  after update of status on public.org_tasks
  for each row
  when (NEW.status = 'review'::public.fiscal_task_status
        and OLD.status is distinct from NEW.status)
  execute function public.notificar_tarefa_em_revisao();

COMMIT;
