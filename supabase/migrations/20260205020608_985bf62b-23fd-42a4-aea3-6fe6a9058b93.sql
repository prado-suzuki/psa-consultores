-- Adicionar campos de vinculo em fiscal_tasks
ALTER TABLE public.fiscal_tasks 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.cliente(id) ON DELETE SET NULL;

-- Adicionar indices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_tasks_project_id ON public.fiscal_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_tasks_client_id ON public.fiscal_tasks(client_id);