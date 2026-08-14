-- Criar tabela de projetos
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  client_name text,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para projetos
CREATE POLICY "Team members can view projects" 
ON public.projects FOR SELECT 
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create projects" 
ON public.projects FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update projects" 
ON public.projects FOR UPDATE 
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Adicionar coluna project_id na tabela sprints
ALTER TABLE public.sprints ADD COLUMN project_id uuid REFERENCES public.projects(id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();