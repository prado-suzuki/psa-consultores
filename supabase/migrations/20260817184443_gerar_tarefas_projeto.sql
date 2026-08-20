-- 20260817184443_gerar_tarefas_projeto.sql
-- EDU-12 . A funcao que gera as tarefas do catalogo do produto no projeto.
--
-- Molde linha por linha: 20260804010000_gerar_solicitacao_os_v2.sql (irma gemea):
-- retorna inteiro, linguagem com definidor de seguranca e caminho de busca
-- fixado, guarda de escopo com 42501, o padrao de contar o criado por CTE que
-- retorna e depois soma, o comentario na funcao, e o bloco final de permissoes.
--
-- POR QUE FUNCAO NO BANCO, e nao no front: a politica de insercao de tarefa so
-- deixa criar tarefa PARA SI MESMO quem nao e sublider ou superior, e quem cria
-- projeto e frequentemente membro comum. Mesmo motivo do trigger da EDU-11.
--
-- A GUARDA NAO E has_role: e can_view_org_project, a MESMA funcao que
-- rls_org_tasks_select usa. Definidor de seguranca sem guarda e furo, e verificar
-- papel seria a guarda errada, porque o que importa aqui e enxergar o projeto.
--
-- Conferido no banco em 14/08/2026, nao presumido:
--   can_view_org_project(uuid, uuid) existe e resolve por admin, membro direto,
--   responsavel, lider, criador, lider por area e sublider por equipe. NAO e
--   permissiva para qualquer autenticado, e e ela a unica protecao desta funcao.
--   gerar_tarefas_projeto ainda nao existe.
--   org_projects tem start_date, responsible_id e leader_id.
--   org_tasks tem description, assigned_to_name, due_date, estimated_hours e
--   tarefa_padrao_id (esta ultima veio da EDU-10).
--   fiscal_task_priority tem 'medium', fiscal_task_status tem 'todo' e
--   fiscal_task_category tem 'task'.
--   produto_tarefa_padrao esta VAZIO (0 linhas): enquanto a carga da ALE-6 nao
--   acontecer, esta funcao devolve 0 para qualquer projeto, e isso e CORRETO.
--   87 dos 98 projetos ja tem produto_segmento_id, entao a frase do enunciado de
--   que ela "devolve zero para todo projeto existente" NAO vale mais: assim que o
--   catalogo tiver linha, ela gera de verdade na primeira chamada.
--   4 projetos tem produto e NAO tem start_date: neles a tarefa nasce SEM prazo,
--   e o `case when v_inicio is not null` abaixo e o que cobre isso.
--
-- OBSERVACAO PARA DECISAO, nao corrigida aqui: o insert do enunciado NAO preenche
-- client_id, enquanto o do trigger da EDU-11 preenche. A coluna e anulavel, entao
-- nada quebra, mas as tarefas geradas por esta funcao nascem sem cliente mesmo o
-- projeto sabendo qual e. Se alguma tela filtrar tarefa por cliente, elas nao
-- aparecem. Escrito conforme o enunciado; mudar isso e decisao de quem conduz.
--
-- SEM IDEMPOTENCIA DE CONTEUDO, e isto esta dito no comentario da funcao de
-- proposito: ela so INSERE o que falta, nunca atualiza e nunca apaga. Editar o
-- titulo no catalogo depois e rodar de novo NAO atualiza tarefa ja criada. E
-- igual a irma gemea, que declara o mesmo. Sem esse aviso, vira defeito
-- reportado.
--
-- Alternativa descartada: ON CONFLICT DO NOTHING em vez de NOT EXISTS. Funciona,
-- mas o molde da casa e a clausula, ela permite contar o criado sem inflar, e
-- conflito sobre indice PARCIAL exigiria repetir o predicado. Fica o NOT EXISTS,
-- e o indice unico uq_org_tasks_tarefa_padrao (EDU-10) como rede contra chamada
-- simultanea.
--
-- Alternativa descartada: resolver o produto por os_produtos_contratados a partir
-- da ordem de servico do projeto. Nao serve: a ordem tem N produtos e o projeto e
-- um por produto. E exatamente o dado que faltava e que a EDU-10 criou.
--
-- Reversao:
--   drop function if exists public.gerar_tarefas_projeto(uuid);

BEGIN;

create or replace function public.gerar_tarefas_projeto(_project_id uuid)
returns integer
language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_produto  uuid;
  v_inicio   date;
  v_resp     uuid;
  v_lider    uuid;
  v_criados  integer;
begin
  -- A guarda NAO e has_role: e a mesma funcao que rls_org_tasks_select usa.
  if not public.can_view_org_project(auth.uid(), _project_id) then
    raise exception 'projeto fora do seu escopo' using errcode = '42501';
  end if;

  select p.produto_segmento_id, p.start_date, p.responsible_id, p.leader_id
    into v_produto, v_inicio, v_resp, v_lider
    from public.org_projects p where p.id = _project_id;

  -- Projeto sem produto ainda nao tem catalogo. Nao e erro.
  if v_produto is null then return 0; end if;

  with novos as (
    insert into public.org_tasks (project_id, tarefa_padrao_id, title, description,
                                  assigned_to, assigned_to_name, due_date,
                                  estimated_hours, priority, status, category)
    select _project_id, t.id, t.titulo, t.descricao,
           alvo.user_id, alvo.nome,
           case when v_inicio is not null then v_inicio + t.dias_offset end,
           t.horas_estimadas,
           'medium'::public.fiscal_task_priority,
           'todo'::public.fiscal_task_status,
           'task'::public.fiscal_task_category
      from public.produto_tarefa_padrao t
      left join lateral (
        select u.id as user_id,
               u.first_name || ' ' || coalesce(u.last_name, '') as nome
          from public.profiles u
         where u.id = coalesce(
                 case t.papel_responsavel
                   when 'responsible' then v_resp
                   when 'leader'      then v_lider
                   when 'member'      then (select m.user_id
                                              from public.org_project_members m
                                             where m.project_id = _project_id
                                               and m.role = 'member'
                                             order by m.created_at, m.user_id
                                             limit 1)
                 end,
                 v_resp, v_lider)   -- alternativa em cadeia; tudo nulo = tarefa
                                    -- nasce sem responsavel, e a geracao NAO falha
      ) alvo on true
     where t.produto_segmento_id = v_produto
       and t.ativo
       and not exists (select 1 from public.org_tasks o
                        where o.project_id       = _project_id
                          and o.tarefa_padrao_id = t.id)
     order by t.ordem
    returning 1)
  select count(*) into v_criados from novos;

  return v_criados;
end $fn$;

comment on function public.gerar_tarefas_projeto is
  'Gera as tarefas do catalogo do produto do projeto. Idempotente: so INSERE o '
  'que falta, nunca faz update, nunca faz delete -- editar o titulo no catalogo '
  'depois NAO atualiza tarefa ja criada.';

revoke all     on function public.gerar_tarefas_projeto(uuid) from anon;
revoke all     on function public.gerar_tarefas_projeto(uuid) from service_role;
revoke all     on function public.gerar_tarefas_projeto(uuid) from public;
grant execute  on function public.gerar_tarefas_projeto(uuid) to authenticated;

COMMIT;
