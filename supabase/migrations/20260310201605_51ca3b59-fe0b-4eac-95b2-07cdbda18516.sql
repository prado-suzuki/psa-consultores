
CREATE TABLE public.produto_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_segmento_id uuid NOT NULL REFERENCES public.produto_segmento(id) ON DELETE CASCADE,
  servico_prestado_id uuid NOT NULL REFERENCES public.servicos_prestados(id) ON DELETE CASCADE,
  UNIQUE(produto_segmento_id, servico_prestado_id)
);

ALTER TABLE public.produto_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view produto_servico"
  ON public.produto_servico FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage produto_servico"
  ON public.produto_servico FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
