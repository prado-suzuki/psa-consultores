-- Enums para fiscal_tasks
DO $$ BEGIN
  CREATE TYPE fiscal_task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_category AS ENUM ('task', 'fixed_event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_department AS ENUM ('commercial', 'financial', 'administrative', 'operations');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela principal de tarefas fiscais
CREATE TABLE public.fiscal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status fiscal_task_status NOT NULL DEFAULT 'todo',
  priority fiscal_task_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id),
  assigned_to_name text,
  created_by uuid REFERENCES public.profiles(id),
  due_date date,
  due_time time,
  is_recurring boolean DEFAULT false,
  recurrence_type fiscal_recurrence_type,
  category fiscal_task_category NOT NULL DEFAULT 'task',
  tags text[] DEFAULT '{}',
  department fiscal_task_department,
  parent_task_id uuid REFERENCES public.fiscal_tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de comentários das tarefas
CREATE TABLE public.fiscal_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.fiscal_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  user_name text,
  comment text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.fiscal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_task_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para fiscal_tasks
CREATE POLICY "Team members can view fiscal tasks" ON public.fiscal_tasks
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create fiscal tasks" ON public.fiscal_tasks
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update fiscal tasks" ON public.fiscal_tasks
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators and admins can delete fiscal tasks" ON public.fiscal_tasks
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Políticas para fiscal_task_comments
CREATE POLICY "Team members can view fiscal task comments" ON public.fiscal_task_comments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create fiscal task comments" ON public.fiscal_task_comments
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fiscal_tasks_updated_at
  BEFORE UPDATE ON public.fiscal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();