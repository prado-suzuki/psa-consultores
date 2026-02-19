ALTER TABLE public.fiscal_tasks
ADD COLUMN categoria_id uuid REFERENCES public.tax_categorias(id) ON DELETE SET NULL;