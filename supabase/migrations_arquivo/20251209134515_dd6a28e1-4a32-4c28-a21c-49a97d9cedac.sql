-- Create table for company processes with stages
CREATE TABLE public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  area TEXT,
  stage TEXT NOT NULL DEFAULT 'discovery',
  priority TEXT DEFAULT 'medium',
  frequency TEXT,
  volume_month INTEGER,
  financial_impact TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team members can view processes"
ON public.processes FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create processes"
ON public.processes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update processes"
ON public.processes FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can delete processes"
ON public.processes FOR DELETE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_processes_updated_at
BEFORE UPDATE ON public.processes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for project_id
CREATE INDEX idx_processes_project_id ON public.processes(project_id);

-- Add index for stage
CREATE INDEX idx_processes_stage ON public.processes(stage);