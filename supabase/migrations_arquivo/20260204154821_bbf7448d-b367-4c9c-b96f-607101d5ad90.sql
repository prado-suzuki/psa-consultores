-- Create ENUM types for work packages
CREATE TYPE work_package_type AS ENUM ('fase', 'tarefa', 'epico');
CREATE TYPE work_package_status AS ENUM ('novo', 'pendente_agendamento', 'agendado', 'em_progresso', 'em_revisao', 'concluido', 'rejeitado');
CREATE TYPE work_package_priority AS ENUM ('alta', 'normal', 'baixa');
CREATE TYPE work_package_area AS ENUM ('fiscal', 'osg', 'fixos', 'pontuais');
CREATE TYPE work_package_stage AS ENUM ('solicitacao_documentos', 'analise_documentacao', 'elaboracao_wp', 'elaboracao_relatorios', 'entrega_cliente', 'conclusao');
CREATE TYPE work_package_relation_type AS ENUM ('filho', 'relacionado', 'anterior', 'sucessor', 'pai', 'duplicado');
CREATE TYPE work_package_activity_type AS ENUM ('status_change', 'assignment', 'comment', 'file_upload', 'relation_change', 'field_update', 'created');

-- Create sequence for work package codes
CREATE SEQUENCE work_package_code_seq START 1;

-- Create main work packages table
CREATE TABLE public.project_work_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code INTEGER NOT NULL DEFAULT nextval('work_package_code_seq'),
  title TEXT NOT NULL,
  description TEXT,
  type work_package_type NOT NULL DEFAULT 'tarefa',
  status work_package_status NOT NULL DEFAULT 'novo',
  priority work_package_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES public.profiles(id),
  responsible UUID REFERENCES public.profiles(id),
  parent_id UUID REFERENCES public.project_work_packages(id),
  project_id UUID REFERENCES public.projects(id),
  client_id UUID REFERENCES public.catalog_clients(id),
  area work_package_area NOT NULL DEFAULT 'fiscal',
  estimated_hours DECIMAL(10,2),
  spent_hours DECIMAL(10,2) DEFAULT 0,
  remaining_hours DECIMAL(10,2),
  completion_percent INTEGER DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  start_date DATE,
  due_date DATE,
  stage work_package_stage,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table for audit trail
CREATE TABLE public.work_package_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action_type work_package_activity_type NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create relations table for parent/child and other relationships
CREATE TABLE public.work_package_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
  relation_type work_package_relation_type NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_relation UNIQUE (source_id, target_id, relation_type),
  CONSTRAINT no_self_relation CHECK (source_id != target_id)
);

-- Create files table
CREATE TABLE public.work_package_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watchers table
CREATE TABLE public.work_package_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_watcher UNIQUE (work_package_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_work_packages_status ON public.project_work_packages(status);
CREATE INDEX idx_work_packages_area ON public.project_work_packages(area);
CREATE INDEX idx_work_packages_assigned_to ON public.project_work_packages(assigned_to);
CREATE INDEX idx_work_packages_parent_id ON public.project_work_packages(parent_id);
CREATE INDEX idx_work_packages_client_id ON public.project_work_packages(client_id);
CREATE INDEX idx_work_packages_project_id ON public.project_work_packages(project_id);
CREATE INDEX idx_work_package_activities_wp_id ON public.work_package_activities(work_package_id);
CREATE INDEX idx_work_package_relations_source ON public.work_package_relations(source_id);
CREATE INDEX idx_work_package_relations_target ON public.work_package_relations(target_id);

-- Add updated_at trigger
CREATE TRIGGER update_work_packages_updated_at
  BEFORE UPDATE ON public.project_work_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.project_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_package_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_package_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_package_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_package_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work packages (team members can read all, write based on area)
CREATE POLICY "Team members can view all work packages"
  ON public.project_work_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can create work packages"
  ON public.project_work_packages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can update work packages"
  ON public.project_work_packages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can delete work packages"
  ON public.project_work_packages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin')
    )
  );

-- RLS for activities
CREATE POLICY "Team members can view activities"
  ON public.work_package_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can create activities"
  ON public.work_package_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

-- RLS for relations
CREATE POLICY "Team members can view relations"
  ON public.work_package_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can manage relations"
  ON public.work_package_relations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

-- RLS for files
CREATE POLICY "Team members can view files"
  ON public.work_package_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can manage files"
  ON public.work_package_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

-- RLS for watchers
CREATE POLICY "Team members can view watchers"
  ON public.work_package_watchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

CREATE POLICY "Team members can manage watchers"
  ON public.work_package_watchers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('team_member', 'admin')
    )
  );

-- Create storage bucket for work package files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-package-files', 'work-package-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Team members can view work package files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'work-package-files' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('team_member', 'admin')
  ));

CREATE POLICY "Team members can upload work package files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'work-package-files' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('team_member', 'admin')
  ));

CREATE POLICY "Team members can delete work package files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'work-package-files' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin')
  ));