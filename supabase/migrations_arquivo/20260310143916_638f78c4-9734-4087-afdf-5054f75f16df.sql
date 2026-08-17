ALTER TABLE public.tax_areas
ADD COLUMN estrutura_area_id uuid REFERENCES public.estrutura_areas(id) ON DELETE SET NULL;