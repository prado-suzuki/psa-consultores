-- Dois defeitos com a mesma vitima: a tarefa gerada que aparece na tela de
-- alguem de outro cluster, sem cliente e sem criador.
--
-- ------------------------------------------------------------------------
-- 1. O VAZAMENTO DE AMBIENTE
--
-- `org_projects` e `org_tasks` nao tem coluna `ambiente`: o ambiente delas e o
-- do cliente vinculado, e o corte e feito no front por `isDoAmbiente`
-- (src/lib/ambienteScope.ts). Essa funcao tem um fallback deliberado:
--
--     cliente ausente do indice (soft-deleted, fora do RLS) tambem passa,
--     porque sumir com trabalho real por falta de dado e pior que mostrar
--     de mais.
--
-- O indice, porem, era montado com um `select id, ambiente from cliente` --
-- sob a RLS `cliente_select_scoped`, que exige `cliente_visivel_para(id)`, ou
-- seja, leitura POR CLUSTER. Entao "ausente do indice" nunca foi o caso raro
-- que o fallback imaginava: e o caso NORMAL de todo cliente de outro cluster.
-- Resultado medido em producao em 08/09/2026: um projeto de `ambiente = dev`,
-- cujo cliente e do cluster OSG, aparecia na lista de PRODUCAO de uma pessoa do
-- cluster TAX -- com o nome do cliente em branco, pela mesma ausencia. Quatro
-- pessoas reais estavam com tarefa de teste atribuida por esse caminho.
--
-- A correcao nao e tirar o fallback (ele protege trabalho real de cliente que a
-- pessoa nao le): e fazer o indice parar de mentir. Esta funcao devolve so o par
-- (id, ambiente) -- nenhum nome, nenhum dado de cadastro -- por SECURITY
-- DEFINER, de forma que "ausente do indice" volte a significar "nao existe".
--
-- O corte por papel continua: para quem nao e do time (portal do cliente) a
-- funcao devolve vazio, e o fallback do front segue valendo como hoje.
--
-- ------------------------------------------------------------------------
-- 2. A TAREFA GERADA SEM CRIADOR
--
-- `gerar_tarefas_projeto` monta a tarefa-pai de cada servico do produto, mas o
-- insert nunca listou `created_by` -- toda tarefa gerada nascia com o campo
-- NULO, e a tela mostra "criado por" em branco. Quem abriu a demanda e quem
-- responde por ela, entao passa a gravar `auth.uid()`. A funcao e SECURITY
-- DEFINER, mas `auth.uid()` le o claim do JWT do CHAMADOR, nao o dono da
-- funcao: continua sendo a pessoa que clicou.
--
-- Nao ha backfill: nas tarefas ja geradas nao existe de onde tirar o criador
-- sem inventar. Ficam nulas, e o `created_at` delas continua dizendo quando.

BEGIN;

-- ── 1. Indice de ambiente sem o corte por cluster ──────────────────────────

create or replace function public.ambiente_por_cliente()
returns table (cliente_id uuid, ambiente text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c.id, c.ambiente
    from public.cliente c
   where c.excluido = false
     and public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role);
$function$;

comment on function public.ambiente_por_cliente() is
  'Regua de ambiente das listas cujo registro nao tem a coluna `ambiente` (org_projects, org_tasks, ordem_servico): id do cliente para o ambiente dele. SECURITY DEFINER de proposito, porque lida sob a RLS por cluster de `cliente` a regua ficava incompleta, e o fallback de `isDoAmbiente` (ausente = passa) deixava projeto de dev vazar para a lista de producao de quem e de outro cluster. Devolve so o par (id, ambiente): nenhum nome, nenhum dado de cadastro. Vazia para quem nao e do time.';

revoke all    on function public.ambiente_por_cliente() from public;
revoke all    on function public.ambiente_por_cliente() from anon;
grant execute on function public.ambiente_por_cliente() to authenticated;

-- ── 2. `created_by` na tarefa gerada ───────────────────────────────────────
--
-- Corpo identico ao de 20260825205139, com `created_by` acrescentado ao insert
-- e ao select. Nada mais muda: mesma fonte (produto_servico + servicos_prestados),
-- mesma guarda de escopo, mesma idempotencia por (projeto, servico).

create or replace function public.gerar_tarefas_projeto(_project_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_produto uuid;
  v_inicio  date;
  v_resp    uuid;
  v_lider   uuid;
  v_cliente uuid;
  v_contrib uuid;
  v_criados integer;
begin
  if not public.can_view_org_project(auth.uid(), _project_id) then
    raise exception 'projeto fora do seu escopo' using errcode = '42501';
  end if;

  select p.produto_segmento_id, p.start_date, p.responsible_id, p.leader_id,
         p.external_client_id, p.contribuinte_id
    into v_produto, v_inicio, v_resp, v_lider, v_cliente, v_contrib
    from public.org_projects p
   where p.id = _project_id;

  -- Projeto sem produto gravado nao tem catalogo a aplicar. Silencioso de
  -- proposito: e o caso dos 11 projetos que o backfill da ALE-4 nao identificou.
  if v_produto is null then return 0; end if;

  with novos as (
    insert into public.org_tasks (project_id, servico_id, title,
                                  client_id, contribuinte_id,
                                  assigned_to, assigned_to_name,
                                  start_date, due_date,
                                  priority, status, category,
                                  created_by)
    select _project_id,
           sp.id,
           sp.nome,
           v_cliente,
           v_contrib,
           alvo.user_id,
           alvo.nome,
           v_inicio,
           v_inicio,
           'medium'::public.fiscal_task_priority,
           'todo'::public.fiscal_task_status,
           'task'::public.fiscal_task_category,
           auth.uid()
      from public.produto_servico pv
      join public.servicos_prestados sp on sp.id = pv.servico_prestado_id
      left join lateral (
        select u.id as user_id,
               btrim(u.first_name || ' ' || coalesce(u.last_name, '')) as nome
          from public.profiles u
         where u.id = coalesce(v_resp, v_lider)
      ) alvo on true
     where pv.produto_segmento_id = v_produto
       and not exists (
         select 1 from public.org_tasks o
          where o.project_id      = _project_id
            and o.servico_id      = sp.id
            and o.parent_task_id is null
       )
     order by sp.nome
    returning 1)
  select count(*) into v_criados from novos;

  return v_criados;
end;
$function$;

comment on function public.gerar_tarefas_projeto(uuid) is
  'Cria uma tarefa-pai por servico vinculado ao produto do projeto. Fonte: produto_servico + servicos_prestados (a produto_tarefa_padrao foi abandonada em 18/08/2026). Idempotente pelo guarda de tarefa-pai ja existente por (projeto, servico). Responsavel = responsavel do projeto, caindo para o lider; cliente e contribuinte = os do projeto (mesma regra de buildMoveTaskPlan); data de inicio e prazo = data de inicio do projeto; criador = quem chamou a funcao (auth.uid(), o claim do JWT, nao o dono da funcao); horas e descricao nulas, porque o catalogo de servico nao tem esses campos.';

COMMIT;
