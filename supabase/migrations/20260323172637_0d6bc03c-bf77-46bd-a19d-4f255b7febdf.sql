
-- Tabela setor_cliente
CREATE TABLE public.setor_cliente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- Dados iniciais
INSERT INTO public.setor_cliente (nome, sigla, descricao) VALUES
  ('Transportadora', 'TRA', 'Atividades relacionadas ao setor de transportes'),
  ('Agropecuária', 'AGR', 'Atividades relacionadas ao setor agropecuário'),
  ('Revenda', 'REV', 'Atividades relacionadas a revenda'),
  ('Indústria', 'IND', 'Atividades relacionadas ao setor industrial'),
  ('Cooperativa', 'COO', 'Atividades relacionadas a cooperativas'),
  ('Infraestrutura', 'INF', 'Atividades relacionadas a infraestrutura'),
  ('Diversificado', 'DIV', 'Atividades diversificadas'),
  ('Instituições do agro', 'INS', 'Instituições do setor agropecuário');

-- FK na tabela cliente (NÃO remove coluna texto existente)
ALTER TABLE public.cliente ADD COLUMN setor_cliente_id uuid REFERENCES public.setor_cliente(id);

-- Backfill: popular setor_cliente_id com base na sigla existente
UPDATE public.cliente c SET setor_cliente_id = sc.id
FROM public.setor_cliente sc WHERE c.setor_cliente = sc.sigla AND c.setor_cliente IS NOT NULL;

-- RLS
ALTER TABLE public.setor_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read setor_cliente"
  ON public.setor_cliente FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert setor_cliente"
  ON public.setor_cliente FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update setor_cliente"
  ON public.setor_cliente FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete setor_cliente"
  ON public.setor_cliente FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
