-- Tarefa gerada a partir do servico nasce com CLIENTE e DATA DE INICIO.
--
-- O DEFEITO
--    `gerar_tarefas_projeto` cria a tarefa-pai de cada servico do produto, mas o
--    insert so listava project_id, servico_id, title, responsavel, due_date,
--    prioridade, status e categoria. Resultado: `org_tasks.client_id` e
--    `org_tasks.start_date` nasciam NULOS em toda tarefa gerada -- a tarefa
--    aparece na tela sem cliente e sem data de inicio, e some do filtro por
--    cliente (`useOrgTasks` filtra por `client_id`, nao pelo cliente do projeto).
--
-- A REGRA QUE JA EXISTIA E NAO ESTAVA AQUI
--    Cliente e contribuinte da tarefa acompanham o PROJETO. Isso ja e o que
--    `buildMoveTaskPlan` (src/lib/orgTaskMove.ts) faz ao mover tarefa entre
--    projetos: `client_id <- projeto.external_client_id` e
--    `contribuinte_id <- projeto.contribuinte_id`, porque contribuinte pertence a
--    um cliente. A geracao passa a nascer com o mesmo vinculo, em vez de deixar
--    a tarefa orfa ate alguem move-la.
--
-- DATA DE INICIO
--    `start_date <- projeto.start_date`, a mesma fonte que ja alimentava o
--    `due_date`. O `due_date` NAO muda nesta migracao: prazo = data de inicio do
--    projeto foi decisao registrada em 20260819180810 (o catalogo de servico nao
--    tem deslocamento em dias), e trocar isso e outra conversa.
--
-- BACKFILL das tarefas ja geradas
--    O recorte e o formato exato que esta funcao produz: tarefa de nivel
--    superior, com servico, cujo titulo E o nome do servico. Preenche so o que
--    esta nulo, entao tarefa editada a mao nao e sobrescrita. Medido no sandbox
--    em 25/08/2026: 32 tarefas nesse formato, 29 sem cliente e 29 sem inicio.

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
                                  priority, status, category)
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
           'task'::public.fiscal_task_category
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
  'Cria uma tarefa-pai por servico vinculado ao produto do projeto. Fonte: produto_servico + servicos_prestados (a produto_tarefa_padrao foi abandonada em 18/08/2026). Idempotente pelo guarda de tarefa-pai ja existente por (projeto, servico). Responsavel = responsavel do projeto, caindo para o lider; cliente e contribuinte = os do projeto (mesma regra de buildMoveTaskPlan); data de inicio e prazo = data de inicio do projeto; horas e descricao nulas, porque o catalogo de servico nao tem esses campos.';

-- Backfill idempotente: so mexe em coluna nula.
--
-- O `disable trigger` e necessario, nao zelo: `trg_org_tasks_team_member_status_only`
-- decide o que pode ser alterado a partir de `auth.uid()`, que em migracao e NULO.
-- Sem `auth.uid()` a guarda cai no ramo "tarefa delegada" e recusa qualquer coluna
-- fora de status/horas/revisor -- inclusive este backfill. Fica dentro de um bloco
-- DO para que qualquer falha desfaca tambem o disable, junto com a subtransacao.
do $backfill$
begin
  alter table public.org_tasks disable trigger trg_org_tasks_team_member_status_only;

  update public.org_tasks t
     set client_id       = coalesce(t.client_id, p.external_client_id),
         contribuinte_id = coalesce(t.contribuinte_id, p.contribuinte_id),
         start_date      = coalesce(t.start_date, p.start_date)
    from public.org_projects p,
         public.servicos_prestados sp
   where p.id  = t.project_id
     and sp.id = t.servico_id
     and t.parent_task_id is null
     and t.title = sp.nome
     and (
       (t.client_id       is null and p.external_client_id is not null)
       or (t.contribuinte_id is null and p.contribuinte_id  is not null)
       or (t.start_date      is null and p.start_date       is not null)
     );

  alter table public.org_tasks enable trigger trg_org_tasks_team_member_status_only;
end
$backfill$;
