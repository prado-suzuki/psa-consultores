-- FK: SET NULL era incompatível com a coluna NOT NULL. Passa a CASCADE.
alter table public.org_tasks
  drop constraint if exists org_tasks_project_id_fkey;

alter table public.org_tasks
  add constraint org_tasks_project_id_fkey
  foreign key (project_id) references public.org_projects(id) on delete cascade;

-- Regra: só tarefa em Backlog ou A Fazer pode ser excluída.
create or replace function public.org_tasks_bloqueia_delete_iniciada()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if OLD.status not in ('backlog','todo') then
    raise exception
      'A tarefa "%" está em "%" e não pode ser excluída. Só tarefas em Backlog ou A Fazer podem ser excluídas.',
      OLD.title,
      case OLD.status
        when 'waiting_client' then 'Pendente Cliente'
        when 'in_progress'    then 'Em Progresso'
        when 'review'         then 'Revisão'
        when 'em_ajuste'      then 'Em Ajuste'
        when 'done'           then 'Concluído'
        else OLD.status::text
      end;
  end if;
  return OLD;
end;
$$;

drop trigger if exists trg_org_tasks_bloqueia_delete_iniciada on public.org_tasks;

create trigger trg_org_tasks_bloqueia_delete_iniciada
  before delete on public.org_tasks
  for each row execute function public.org_tasks_bloqueia_delete_iniciada();