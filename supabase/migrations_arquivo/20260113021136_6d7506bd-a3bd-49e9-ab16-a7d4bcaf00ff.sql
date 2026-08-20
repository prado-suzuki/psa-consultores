-- Tabela de permissões por página/funcionalidade
CREATE TABLE public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  page_description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  requires_admin BOOLEAN DEFAULT false,
  requires_team_member BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de liberação individual por usuário
CREATE TABLE public.user_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_permission_id UUID REFERENCES public.page_permissions(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_permission_id)
);

-- Tabela de senha da área de gestão
CREATE TABLE public.gestao_area_password (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_area_password ENABLE ROW LEVEL SECURITY;

-- Políticas para page_permissions
CREATE POLICY "Admins podem gerenciar permissões de página"
ON public.page_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members podem ver permissões de página"
ON public.page_permissions
FOR SELECT
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para user_page_access
CREATE POLICY "Admins podem gerenciar acessos de usuário"
ON public.user_page_access
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver próprias permissões"
ON public.user_page_access
FOR SELECT
USING (user_id = auth.uid());

-- Políticas para gestao_area_password
CREATE POLICY "Admins podem gerenciar senha da gestão"
ON public.gestao_area_password
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir dados iniciais das páginas do sistema
INSERT INTO public.page_permissions (page_path, page_name, page_description, category, requires_team_member) VALUES
  ('/equipe/dashboard', 'Dashboard Equipe', 'Painel principal da equipe', 'rotina', true),
  ('/equipe/projetos', 'Projetos', 'Gerenciamento de projetos', 'rotina', true),
  ('/equipe/kanban', 'Kanban', 'Quadro Kanban de tarefas', 'rotina', true),
  ('/equipe/sprints', 'Sprints', 'Gerenciamento de sprints', 'rotina', true),
  ('/equipe/tarefas', 'Tarefas', 'Lista de tarefas', 'rotina', true),
  ('/equipe/demandas', 'Demandas', 'Gerenciamento de demandas', 'rotina', true),
  ('/equipe/processos', 'Processos', 'Mapeamento de processos', 'rotina', true),
  ('/equipe/backlog', 'Backlog', 'Backlog de itens', 'rotina', true),
  ('/equipe/daily', 'Daily', 'Standups diários', 'rotina', true),
  ('/equipe/biblioteca', 'Biblioteca', 'Documentos e arquivos', 'rotina', true),
  ('/equipe/dev', 'Dev Dashboard', 'Painel de desenvolvimento', 'dev', true),
  ('/equipe/dev/nova-ferramenta', 'Nova Ferramenta', 'Criar nova ferramenta', 'dev', true),
  ('/equipe/dev/consulta-xmls', 'Consulta XMLs', 'Consultar arquivos XML', 'dev', true),
  ('/equipe/dev/gerenciar-dados', 'Gerenciar Dados', 'Gerenciamento de dados', 'dev', true),
  ('/gestao/novidades', 'Novidades', 'Gerenciar novidades do site', 'gestao', true),
  ('/gestao/chamados', 'Chamados', 'Gerenciar chamados', 'gestao', true);

-- Inserir senha padrão inicial (hash de "admin123" - deve ser alterada)
-- Usando uma senha inicial simples que deve ser trocada
INSERT INTO public.gestao_area_password (password_hash) VALUES ('$2a$10$defaulthashplaceholder');