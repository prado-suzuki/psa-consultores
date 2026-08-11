-- Índices para o histórico paginado da Daily.
-- A UNIQUE antiga (user_id, date) não atende a ordenação global por data.
CREATE INDEX IF NOT EXISTS idx_daily_standups_history_date
  ON public.daily_standups (date DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_daily_standups_history_user
  ON public.daily_standups (user_id, date DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_daily_standups_history_sprint
  ON public.daily_standups (sprint_id, date DESC, created_at DESC, id DESC)
  WHERE sprint_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_standups_history_project
  ON public.daily_standups (project_id, date DESC, created_at DESC, id DESC)
  WHERE project_id IS NOT NULL;
