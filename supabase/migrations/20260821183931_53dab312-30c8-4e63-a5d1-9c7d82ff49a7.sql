do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.org_projects'::regclass
                    and conname = 'org_projects_external_client_id_fkey') then
    alter table public.org_projects
      add constraint org_projects_external_client_id_fkey
      foreign key (external_client_id) references public.cliente(id);
  end if;
end $$;
