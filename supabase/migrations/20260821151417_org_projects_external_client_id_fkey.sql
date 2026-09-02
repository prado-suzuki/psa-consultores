-- Bloco D (verificação ao vivo de 21/08): a coluna `external_client_id` de
-- `org_projects` existe, mas nunca teve foreign key para `cliente`. O board
-- do Estratégico e o Operacional embutem `cliente:cliente!org_projects_external_client_id_fkey(nome)`
-- na consulta de `org_projects` -- o PostgREST não resolve o embed sem a
-- constraint, devolve 400, e a QUERY INTEIRA morre: PROJETOS ATIVOS, a
-- pontualidade, "Áreas em um olhar" e "Projetos críticos" desenham 0/vazio
-- como se fosse dado, não erro (o Operacional pelo menos avisa "Dados
-- incompletos"; o Estratégico não).
--
-- Medido antes de aplicar: 119 projetos, 100% com external_client_id
-- preenchido, ZERO órfãos (nenhum aponta para cliente inexistente). A FK
-- entra sem limpeza de dado.
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
