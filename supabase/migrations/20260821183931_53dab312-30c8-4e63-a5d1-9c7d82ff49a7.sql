alter table public.org_projects
  add constraint org_projects_external_client_id_fkey
  foreign key (external_client_id) references public.cliente(id);