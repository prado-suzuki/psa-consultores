ALTER TABLE public.sprint_backlog_items
  ADD COLUMN cluster_id uuid NULL REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sprint_backlog_items_cluster_id
  ON public.sprint_backlog_items(cluster_id);