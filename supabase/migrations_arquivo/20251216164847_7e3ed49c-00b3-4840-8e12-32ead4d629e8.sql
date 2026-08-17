
-- Criar tabela sprint_backlog_items para armazenar itens do backlog de cada sprint
CREATE TABLE public.sprint_backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid REFERENCES sprints(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  estimated_hours numeric,
  suggested_by uuid REFERENCES profiles(id),
  status text DEFAULT 'pending',
  moved_to_deliverable_id uuid REFERENCES sprint_deliverables(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sprint_backlog_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Team members can view backlog items"
ON public.sprint_backlog_items
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create backlog items"
ON public.sprint_backlog_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update backlog items"
ON public.sprint_backlog_items
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete backlog items"
ON public.sprint_backlog_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sprint_backlog_items_updated_at
BEFORE UPDATE ON public.sprint_backlog_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
