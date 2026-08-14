-- Enum para status de tarefas
CREATE TYPE task_status AS ENUM ('backlog', 'to_do', 'in_progress', 'review', 'done');

-- Enum para clusters de trabalho
CREATE TYPE work_cluster AS ENUM ('database', 'frontend', 'management');

-- Enum para prioridade
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tabela de Sprints
CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Tarefas
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id),
  cluster work_cluster NOT NULL,
  status task_status DEFAULT 'backlog',
  priority task_priority DEFAULT 'medium',
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Daily Standups
CREATE TABLE public.daily_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_yesterday TEXT,
  will_do_today TEXT,
  blockers TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Tabela de Comentários em Tarefas
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "Team members can view sprints"
ON public.sprints FOR SELECT
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create sprints"
ON public.sprints FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Team members can update sprints"
ON public.sprints FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'));

-- RLS Policies for tasks
CREATE POLICY "Team members can view tasks"
ON public.tasks FOR SELECT
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update tasks"
ON public.tasks FOR UPDATE
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tasks"
ON public.tasks FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_standups
CREATE POLICY "Team members can view standups"
ON public.daily_standups FOR SELECT
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create their standups"
ON public.daily_standups FOR INSERT
WITH CHECK ((public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin')) AND auth.uid() = user_id);

CREATE POLICY "Team members can update their standups"
ON public.daily_standups FOR UPDATE
USING ((public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin')) AND auth.uid() = user_id);

-- RLS Policies for task_comments
CREATE POLICY "Team members can view comments"
ON public.task_comments FOR SELECT
USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create comments"
ON public.task_comments FOR INSERT
WITH CHECK ((public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin')) AND auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_sprints_updated_at
BEFORE UPDATE ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();