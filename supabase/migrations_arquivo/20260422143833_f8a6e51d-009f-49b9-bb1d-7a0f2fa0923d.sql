-- Passo 1: Policies SELECT abertas em page_permissions e user_page_access
-- page_permissions: qualquer autenticado lê (apenas metadados de rota)
DROP POLICY IF EXISTS "Team members can view page permissions" ON public.page_permissions;
DROP POLICY IF EXISTS "Authenticated users can view page permissions" ON public.page_permissions;
DROP POLICY IF EXISTS "Admins can manage page permissions" ON public.page_permissions;

CREATE POLICY "Authenticated users can view page permissions"
  ON public.page_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage page permissions"
  ON public.page_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_page_access: usuário lê o próprio; admin lê todos
DROP POLICY IF EXISTS "Team members can view all user page access" ON public.user_page_access;
DROP POLICY IF EXISTS "Users can view their own page access" ON public.user_page_access;
DROP POLICY IF EXISTS "Admins can view all user page access" ON public.user_page_access;
DROP POLICY IF EXISTS "Admins can manage user page access" ON public.user_page_access;

CREATE POLICY "Users can view their own page access"
  ON public.user_page_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user page access"
  ON public.user_page_access
  FOR SELECT
  TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage user page access"
  ON public.user_page_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Passo 2: Sync idempotente de PROTECTED_PAGES → page_permissions
INSERT INTO public.page_permissions (page_path, page_name, page_description, category, requires_admin, requires_team_member, is_active)
VALUES
  ('/equipe/dashboard','Dashboard Equipe','Painel principal da equipe','geral',false,true,true),
  ('/equipe/relatorios','Relatórios','Relatórios gerais da equipe','geral',false,true,true),
  ('/equipe/kanban','Kanban','Quadro Kanban de tarefas','geral',false,true,true),
  ('/equipe/sprints','Sprints','Gerenciamento de sprints','geral',false,true,true),
  ('/equipe/daily','Daily','Registro de daily standups','geral',false,true,true),
  ('/equipe/rotinas','Rotinas','Gerenciamento de rotinas recorrentes','geral',false,true,true),
  ('/equipe/tarefas','Tarefas','Listagem e gestão de tarefas','geral',false,true,true),
  ('/equipe/tarefas/nova','Nova Tarefa','Criação de nova tarefa','geral',false,true,true),
  ('/equipe/processos','Processos','Gestão de processos internos','geral',false,true,true),
  ('/equipe/projetos','Projetos','Gerenciamento de projetos','geral',false,true,true),
  ('/equipe/biblioteca','Biblioteca','Biblioteca de documentos e recursos','geral',false,true,true),
  ('/equipe/backlog','Backlog','Backlog de tarefas e demandas','geral',false,true,true),
  ('/equipe/chamados','Chamados Equipe','Visualizar e gerenciar chamados atribuídos','geral',false,true,true),
  ('/equipe/acessos','Controle de Acessos (Equipe)','Gerenciar permissões de páginas e usuários','gestao',true,true,true),
  ('/equipe/dev','Dev Dashboard','Painel de desenvolvimento','dev',false,true,true),
  ('/equipe/dev/nova-ferramenta','Nova Ferramenta','Criar nova ferramenta','dev',false,true,true),
  ('/equipe/dev/ferramenta','Detalhe Ferramenta','Visualização de ferramenta específica','dev',false,true,true),
  ('/equipe/dev/consulta-xmls','Consulta XMLs','Consultar arquivos XML','dev',false,true,true),
  ('/equipe/dev/consulta-efd','EFD Contribuições','Consulta de arquivos EFD Contribuições','dev',false,true,true),
  ('/equipe/dev/consulta-efd-icms','EFD ICMS/IPI','Consulta de arquivos EFD ICMS/IPI','dev',false,true,true),
  ('/equipe/dev/consulta-ecd','Consulta ECD','Consulta de arquivos ECD','dev',false,true,true),
  ('/equipe/dev/consulta-ecf','Consulta ECF','Consulta de arquivos ECF','dev',false,true,true),
  ('/equipe/dev/gerenciar-dados','Gerenciar Dados','Gerenciamento de dados','dev',false,true,true),
  ('/equipe/dev/processo-difal','Processo DIFAL','Ferramenta de auditoria DIFAL','dev',false,true,true),
  ('/equipe/dev/controle-perdcomp','Controle PERDCOMP','Gerenciamento de PER, DCOMP e Situações','dev',false,true,true),
  ('/equipe/dev/controle-balancetes','Controle Balancetes','Gerenciamento de balancetes','dev',false,true,true),
  ('/equipe/dev/gestao-clientes','Gestão Clientes','Gerenciamento de clientes Dev','dev',false,true,true),
  ('/equipe/dev/calculadora-ibs-cbs','Calculadora IBS/CBS','Calculadora de IBS e CBS','dev',false,true,true),
  ('/equipe/dev/apuracao-pis-cofins','Apuração PIS/COFINS','Motor de apuração PIS e COFINS','dev',false,true,true),
  ('/equipe/dev/mapa-ncm-pis-cofins','Mapa NCM PIS/COFINS','Gerenciamento de regras fiscais NCM para PIS/COFINS','dev',false,true,true),
  ('/equipe/dev/cruzamento-dados','Análise Cruzada','Cruzamento de dados EFD, Balancete e XMLs','dev',false,true,true),
  ('/equipe/dev/correcoes-sped','Correções no SPED','Revisão de notas e itens EFD vs XML para correções','dev',false,true,true),
  ('/equipe/dev/procedimentos','Procedimentos','Biblioteca de procedimentos técnicos gerados por IA','dev',false,true,true),
  ('/equipe/dev/apuracao-difal/icms-saidas','ICMS das Saídas','Classificação fiscal de produtos em saídas interestaduais (Beta)','dev',false,true,true),
  ('/equipe/tax/dashboard','Tax Dashboard','Painel principal da área Tax','tax',false,true,true),
  ('/equipe/tax/projetos/cadastro','Tax Entregas','Entregas de projetos da área Tax','tax',false,true,true),
  ('/equipe/tax/projetos/tarefas','Tax Tarefas','Tarefas de projetos da área Tax','tax',false,true,true),
  ('/equipe/tax/projetos/clientes','Tax Clientes','Cadastros de clientes da área Tax','tax',false,true,true),
  ('/equipe/tax/auditoria','Auditoria Tax','Histórico de alterações em projetos e tarefas Tax','tax',false,true,true),
  ('/equipe/osg/dashboard','OSG Dashboard','Painel principal da área OSG','osg',false,true,true),
  ('/equipe/osg/auditoria','Auditoria OSG','Histórico de alterações em projetos e tarefas OSG','osg',false,true,true),
  ('/equipe/board/dashboard','Board Dashboard','Painel principal da área Board','board',false,true,true),
  ('/equipe/board/performance','Performance','Painel executivo consolidado de performance','board',false,true,true),
  ('/equipe/board/desempenho','Desempenho - Visão Geral','Painel geral de desempenho e performance','board',false,true,true),
  ('/equipe/board/desempenho/ciclos','Desempenho - Ciclos','Gestão de ciclos de avaliação','board',false,true,true),
  ('/equipe/board/desempenho/metas','Desempenho - Metas','Gestão de metas hierárquicas','board',false,true,true),
  ('/equipe/board/desempenho/feedbacks','Desempenho - Feedbacks','Registro e visualização de feedbacks','board',false,true,true),
  ('/equipe/board/desempenho/1a1','Desempenho - 1:1s','Registro de reuniões 1:1','board',false,true,true),
  ('/equipe/board/desempenho/evolucao','Desempenho - Evolução','Análise de evolução individual','board',false,true,true),
  ('/equipe/board/desempenho/decisoes','Desempenho - Decisões','Recomendações de IA para promoção e reajuste','board',false,true,true),
  ('/equipe/board/desempenho/relatorios','Desempenho - Relatórios','Geração de relatórios individuais com IA','board',false,true,true),
  ('/equipe/board/desempenho/minha-evolucao','Minha Evolução','Visão individual de metas, feedbacks e PPR','board',false,true,true),
  ('/gestao','Novidades','Gerenciar novidades do site','gestao',false,true,true),
  ('/gestao/chamados','Chamados','Gerenciar chamados','gestao',false,true,true),
  ('/gestao/contatos','Contatos','Gerenciar contatos do site','gestao',false,true,true),
  ('/gestao/acessos','Controle de Acessos','Gerenciar permissões de acesso','gestao',true,true,true)
ON CONFLICT (page_path) DO NOTHING;

-- Passo 4 (parte 1): Backfill user_page_access para rotas categoria 'geral'
-- Concede acesso explícito para todos os internos atuais antes de remover o bypass no código
INSERT INTO public.user_page_access (user_id, page_permission_id)
SELECT DISTINCT ur.user_id, pp.id
FROM public.user_roles ur
CROSS JOIN public.page_permissions pp
WHERE ur.role IN ('team_member','lider','sublider')
  AND pp.category = 'geral'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_page_access upa
    WHERE upa.user_id = ur.user_id AND upa.page_permission_id = pp.id
  );