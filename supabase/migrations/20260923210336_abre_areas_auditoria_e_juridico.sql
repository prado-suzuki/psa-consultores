-- Abre as areas Auditoria e Juridico: o de-para area->cluster e o registro das
-- paginas. NAO concede acesso a ninguem; a liberacao nominal sai por /equipe/acessos.

-- Sem este vinculo `useClusterIdByPageCategory` devolve nulo e as telas da area
-- aparecem vazias, indistinguivel de "nao ha projetos".
insert into public.estrutura_areas (id, cluster_id, name, page_categories, color_index, is_active)
select 'ae18ac27-f31a-4a89-9d96-d391272d8c43'::uuid,
       'ce7f2633-eceb-4341-a97b-51279f5a6e7d'::uuid,
       'Auditoria', array['auditoria']::text[], 4, true
where not exists (
  select 1 from public.estrutura_areas
  where cluster_id = 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'::uuid and name = 'Auditoria'
);

insert into public.estrutura_areas (id, cluster_id, name, page_categories, color_index, is_active)
select 'a2a59390-9ddf-41b4-8125-89faf3d3e144'::uuid,
       '39e30aff-fc2a-405a-b9d6-305497477da6'::uuid,
       'Juridico', array['juridico']::text[], 8, true
where not exists (
  select 1 from public.estrutura_areas
  where cluster_id = '39e30aff-fc2a-405a-b9d6-305497477da6'::uuid and name = 'Juridico'
);

-- Pagina sem linha aqui e tratada como ACESSO LIVRE por `usePageAccess`, entao
-- estas linhas precisam existir antes de o codigo das rotas chegar em producao.
insert into public.page_permissions
  (page_path, page_name, page_description, category, is_active, requires_admin, requires_team_member)
values
  ('/equipe/auditoria/inicio', 'Boas-vindas Auditoria', 'Tela inicial da area Auditoria', 'auditoria', true, false, true),
  ('/equipe/auditoria/dashboard', 'Auditoria Projects', 'Painel principal de projetos da area Auditoria', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/clientes', 'Clientes Auditoria', 'Cadastros de clientes e contribuintes', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/cadastro', 'Auditoria Projetos e Tarefas', 'Projetos e tarefas organizados por ordem de servico', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/cadastro-lote', 'Auditoria Criar Projetos em Lote', 'Criacao de projetos em lote a partir de uma ordem de servico', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/controle', 'Controle de Projetos Auditoria', 'Onde cada cliente esta, um produto contratado por linha', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/tarefas', 'Auditoria Tarefas', 'Projetos e tarefas organizados por ordem de servico', 'auditoria', true, false, true),
  ('/equipe/auditoria/projetos/feed', 'Feed Auditoria', 'Atualizacoes e conversas vinculadas a projetos e tarefas', 'auditoria', true, false, true),
  ('/equipe/auditoria/work', 'Auditoria Work', 'Ferramentas e aplicacoes da area Auditoria', 'auditoria', true, false, true),
  ('/equipe/juridico/inicio', 'Boas-vindas Juridico', 'Tela inicial da area Juridico', 'juridico', true, false, true),
  ('/equipe/juridico/dashboard', 'Juridico Projects', 'Painel principal de projetos da area Juridico', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/clientes', 'Clientes Juridico', 'Cadastros de clientes e contribuintes', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/cadastro', 'Juridico Projetos e Tarefas', 'Projetos e tarefas organizados por ordem de servico', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/cadastro-lote', 'Juridico Criar Projetos em Lote', 'Criacao de projetos em lote a partir de uma ordem de servico', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/controle', 'Controle de Projetos Juridico', 'Onde cada cliente esta, um produto contratado por linha', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/tarefas', 'Juridico Tarefas', 'Projetos e tarefas organizados por ordem de servico', 'juridico', true, false, true),
  ('/equipe/juridico/projetos/feed', 'Feed Juridico', 'Atualizacoes e conversas vinculadas a projetos e tarefas', 'juridico', true, false, true),
  ('/equipe/juridico/work', 'Juridico Work', 'Ferramentas e aplicacoes da area Juridico', 'juridico', true, false, true)
on conflict (page_path) do nothing;
