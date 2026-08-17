ALTER TABLE public.tax_projects
  ADD COLUMN ordem_servico_id UUID REFERENCES public.ordem_servico(id);

CREATE INDEX idx_tax_projects_ordem_servico ON public.tax_projects(ordem_servico_id);