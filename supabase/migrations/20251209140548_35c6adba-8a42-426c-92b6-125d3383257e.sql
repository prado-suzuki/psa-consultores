
-- Create process_stages table for detailed step information
CREATE TABLE public.process_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  time_current TEXT,
  time_target TEXT,
  frequency TEXT,
  volume TEXT,
  automation_level TEXT,
  inputs JSONB DEFAULT '[]'::jsonb,
  outputs JSONB DEFAULT '[]'::jsonb,
  systems JSONB DEFAULT '[]'::jsonb,
  related_projects TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create project_processes table for N:N relationship
CREATE TABLE public.project_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  impact_type TEXT DEFAULT 'secundario',
  impacted_stages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, process_id)
);

-- Enable RLS
ALTER TABLE public.process_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_processes ENABLE ROW LEVEL SECURITY;

-- RLS policies for process_stages
CREATE POLICY "Team members can view process stages"
ON public.process_stages FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create process stages"
ON public.process_stages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update process stages"
ON public.process_stages FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can delete process stages"
ON public.process_stages FOR DELETE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- RLS policies for project_processes
CREATE POLICY "Team members can view project processes"
ON public.project_processes FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create project processes"
ON public.project_processes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update project processes"
ON public.project_processes FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can delete project processes"
ON public.project_processes FOR DELETE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_process_stages_updated_at
BEFORE UPDATE ON public.process_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
