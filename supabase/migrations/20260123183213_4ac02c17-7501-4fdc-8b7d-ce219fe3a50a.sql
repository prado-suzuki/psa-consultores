-- Adicionar campos de baseline na tabela processes
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS time_spent_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS time_spent_frequency TEXT,
ADD COLUMN IF NOT EXISTS cost_monthly DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS volume_executions INTEGER,
ADD COLUMN IF NOT EXISTS people_involved INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS complexity_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS automation_potential DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS evaluation_period_days INTEGER DEFAULT 30;

-- Criar tabela de cargos com custo/hora
CREATE TABLE public.job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  category TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  monthly_salary_ref DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- Política de leitura para membros da equipe
CREATE POLICY "Team members can view job roles"
ON public.job_roles
FOR SELECT
USING (true);

-- Política de escrita para admins
CREATE POLICY "Admins can manage job roles"
ON public.job_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'team_member')
  )
);

-- Inserir cargos com valores de mercado
INSERT INTO public.job_roles (name, level, category, hourly_rate, monthly_salary_ref) VALUES
  ('Estagiário', 'junior', 'Geral', 15.00, 1500),
  ('Assistente Administrativo', 'junior', 'Administrativo', 25.00, 2500),
  ('Analista Fiscal Jr', 'junior', 'Fiscal', 35.00, 3500),
  ('Analista Fiscal Pleno', 'pleno', 'Fiscal', 55.00, 5500),
  ('Analista Fiscal Sr', 'senior', 'Fiscal', 80.00, 8000),
  ('Analista Contábil Jr', 'junior', 'Contábil', 35.00, 3500),
  ('Analista Contábil Pleno', 'pleno', 'Contábil', 55.00, 5500),
  ('Analista Contábil Sr', 'senior', 'Contábil', 80.00, 8000),
  ('Consultor Tributário Jr', 'junior', 'Consultoria', 45.00, 4500),
  ('Consultor Tributário Pleno', 'pleno', 'Consultoria', 70.00, 7000),
  ('Consultor Tributário Sr', 'senior', 'Consultoria', 100.00, 10000),
  ('Especialista Tributário', 'especialista', 'Consultoria', 130.00, 13000),
  ('Analista de TI Jr', 'junior', 'TI', 40.00, 4000),
  ('Analista de TI Pleno', 'pleno', 'TI', 60.00, 6000),
  ('Desenvolvedor Sr', 'senior', 'TI', 90.00, 9000),
  ('Arquiteto de Sistemas', 'especialista', 'TI', 120.00, 12000),
  ('Coordenador', 'senior', 'Gestão', 110.00, 11000),
  ('Gerente', 'especialista', 'Gestão', 150.00, 15000),
  ('Diretor', 'especialista', 'Gestão', 200.00, 20000);

-- Criar tabela de avaliações de melhoria
CREATE TABLE public.process_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vínculos
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  sprint_deliverable_id UUID REFERENCES public.sprint_deliverables(id),
  project_id UUID REFERENCES public.projects(id),
  
  -- Dados do Baseline (copiados do processo no momento da melhoria)
  baseline_time_hours DECIMAL(10,2),
  baseline_cost_monthly DECIMAL(12,2),
  baseline_volume INTEGER,
  baseline_people_involved INTEGER,
  
  -- Dados Pós-Melhoria (preenchidos após período de avaliação)
  improved_time_hours DECIMAL(10,2),
  improved_cost_monthly DECIMAL(12,2),
  improved_volume INTEGER,
  improved_people_involved INTEGER,
  
  -- Configuração de Avaliação
  evaluation_period_days INTEGER DEFAULT 30,
  evaluation_start_date DATE,
  evaluation_end_date DATE,
  evaluation_status TEXT DEFAULT 'pending',
  
  -- Resultados Calculados
  time_saved_hours DECIMAL(10,2),
  cost_saved_monthly DECIMAL(12,2),
  time_saved_percent DECIMAL(5,2),
  cost_saved_percent DECIMAL(5,2),
  
  -- ROI
  implementation_hours DECIMAL(10,2),
  implementation_cost DECIMAL(12,2),
  roi_time_months DECIMAL(5,2),
  roi_fte_annual DECIMAL(12,2),
  roi_percentage DECIMAL(8,2),
  
  -- Metadados
  improvement_description TEXT,
  evaluated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_improvements_process ON public.process_improvements(process_id);
CREATE INDEX idx_improvements_status ON public.process_improvements(evaluation_status);
CREATE INDEX idx_improvements_project ON public.process_improvements(project_id);

-- Habilitar RLS
ALTER TABLE public.process_improvements ENABLE ROW LEVEL SECURITY;

-- Políticas para process_improvements
CREATE POLICY "Team members can view improvements"
ON public.process_improvements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'team_member')
  )
);

CREATE POLICY "Team members can manage improvements"
ON public.process_improvements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'team_member')
  )
);

-- Tabela de membros da equipe por melhoria
CREATE TABLE public.improvement_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_id UUID NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  job_role_id UUID REFERENCES public.job_roles(id),
  hours_allocated DECIMAL(10,2),
  is_baseline BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.improvement_team_members ENABLE ROW LEVEL SECURITY;

-- Políticas para improvement_team_members
CREATE POLICY "Team members can view improvement members"
ON public.improvement_team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'team_member')
  )
);

CREATE POLICY "Team members can manage improvement members"
ON public.improvement_team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'team_member')
  )
);

-- Trigger para atualizar updated_at em process_improvements
CREATE TRIGGER update_process_improvements_updated_at
BEFORE UPDATE ON public.process_improvements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();