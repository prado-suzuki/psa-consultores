-- Tabela de entregáveis da sprint
CREATE TABLE public.sprint_deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de eventos/reuniões da sprint
CREATE TABLE public.sprint_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'session', 'presentation', 'daily', 'planning', 'retrospective')),
  participants UUID[] DEFAULT '{}',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de métricas de sucesso da sprint
CREATE TABLE public.sprint_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sprint_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprint_deliverables
CREATE POLICY "Team members can view deliverables"
ON public.sprint_deliverables FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create deliverables"
ON public.sprint_deliverables FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update deliverables"
ON public.sprint_deliverables FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deliverables"
ON public.sprint_deliverables FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for sprint_events
CREATE POLICY "Team members can view events"
ON public.sprint_events FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create events"
ON public.sprint_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update events"
ON public.sprint_events FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.sprint_events FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for sprint_metrics
CREATE POLICY "Team members can view metrics"
ON public.sprint_metrics FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create metrics"
ON public.sprint_metrics FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update metrics"
ON public.sprint_metrics FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete metrics"
ON public.sprint_metrics FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on deliverables
CREATE TRIGGER update_sprint_deliverables_updated_at
BEFORE UPDATE ON public.sprint_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();