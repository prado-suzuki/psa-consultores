-- Add new columns to projects table for Digital Rotina enriched structure
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS external_client_id UUID REFERENCES public.cliente(id),
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS product_service TEXT,
  ADD COLUMN IF NOT EXISTS project_front TEXT,
  ADD COLUMN IF NOT EXISTS justification_type TEXT,
  ADD COLUMN IF NOT EXISTS justification_detail TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.projects.external_client_id IS 'Cliente PSA externo (da tabela cliente)';
COMMENT ON COLUMN public.projects.leader_id IS 'Líder interno do projeto (da tabela profiles)';
COMMENT ON COLUMN public.projects.area IS 'Área do projeto: fiscal, consultoria, fixos, transversal, etc';
COMMENT ON COLUMN public.projects.product_service IS 'Produto ou serviço relacionado ao projeto';
COMMENT ON COLUMN public.projects.project_front IS 'Frente/categoria do projeto';
COMMENT ON COLUMN public.projects.justification_type IS 'Tipo de justificativa: financeiro, tempo, comunicacao, automacao, qualidade, compliance';
COMMENT ON COLUMN public.projects.justification_detail IS 'Detalhamento da justificativa do projeto';