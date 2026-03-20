ALTER TABLE public.produto_segmento
  ADD COLUMN cluster_id UUID REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;