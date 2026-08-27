-- 20260820134839_alinhar_delegar_chamado_gera_tarefa_com_producao.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Alinha o sandbox com producao: as duas funcoes e o trigger do EDU-11, na
-- versao aplicada em producao em 19/08/2026 13:10 (migration 20260819131007).
alter table public.org_tasks
  add column if not exists ticket_id uuid references public.tickets(id) on delete cascade;

create unique index if not exists uq_org_tasks_ticket
  on public.org_tasks (ticket_id) where ticket_id is not null;

create or replace function public.org_tasks_team_member_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
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

  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

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

  if TG_OP = 'UPDATE' then
    if NEW.assigned_to is not distinct from OLD.assigned_to then
      return null;   -- delegou para a mesma pessoa: nada mudou
    end if;
  end if;

  if NEW.cliente_id is null then
    return null;
  end if;

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
    raise warning 'delegar_chamado_gera_tarefa: cliente % sem projeto de canal de chamados; chamado % delegado SEM tarefa',
      NEW.cliente_id, NEW.id;
    return null;
  end if;

  if v_qtd > 1 then
    raise warning 'delegar_chamado_gera_tarefa: cliente % tem % projetos de canal de chamados; usando o mais antigo (%)',
      NEW.cliente_id, v_qtd, v_project;
  end if;

  select btrim(p.first_name || ' ' || coalesce(p.last_name, ''))
    into v_nome
    from public.profiles p
   where p.id = NEW.assigned_to;

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
  on conflict (ticket_id) where ticket_id is not null
  do update set assigned_to      = excluded.assigned_to,
                assigned_to_name = excluded.assigned_to_name;

  return null;   -- trigger AFTER: o valor de retorno e ignorado
end
$$;

revoke all on function public.delegar_chamado_gera_tarefa() from public;

drop trigger if exists trg_tickets_gera_tarefa on public.tickets;
create trigger trg_tickets_gera_tarefa
  after insert or update of assigned_to on public.tickets
  for each row
  execute function public.delegar_chamado_gera_tarefa();
