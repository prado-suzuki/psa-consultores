ALTER TABLE public.catalog_clients 
  ADD COLUMN IF NOT EXISTS estrutura_area_id UUID REFERENCES public.estrutura_areas(id) ON DELETE SET NULL;