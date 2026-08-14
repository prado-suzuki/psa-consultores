ALTER TABLE public.sprint_backlog_items
  ADD COLUMN IF NOT EXISTS project_id uuid
  REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sprint_backlog_items_project_id_idx
  ON public.sprint_backlog_items(project_id);