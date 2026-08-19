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