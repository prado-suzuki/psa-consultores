
-- Novas colunas na ordem_servico
ALTER TABLE public.ordem_servico
  ADD COLUMN id_servico uuid REFERENCES public.servicos_prestados(id) ON DELETE SET NULL,
  ADD COLUMN id_produto_segmento uuid REFERENCES public.produto_segmento(id) ON DELETE SET NULL;

-- Remover colunas JSONB da OS
ALTER TABLE public.ordem_servico
  DROP COLUMN IF EXISTS servicos_contratados,
  DROP COLUMN IF EXISTS centros_custo;

-- Remover colunas do cliente/cliente_dev
ALTER TABLE public.cliente
  DROP COLUMN IF EXISTS empresa_faturamento,
  DROP COLUMN IF EXISTS tipo_produto_segmento,
  DROP COLUMN IF EXISTS tipo_produto_segmento_custom;
ALTER TABLE public.cliente_dev
  DROP COLUMN IF EXISTS empresa_faturamento,
  DROP COLUMN IF EXISTS tipo_produto_segmento,
  DROP COLUMN IF EXISTS tipo_produto_segmento_custom;

-- Dropar tabelas obsoletas
DROP TABLE IF EXISTS public.servico CASCADE;
DROP TABLE IF EXISTS public.servico_dev CASCADE;
DROP TABLE IF EXISTS public.contrato CASCADE;
DROP TABLE IF EXISTS public.contrato_dev CASCADE;

-- Criar distribuicao_receita
CREATE TABLE public.distribuicao_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ordem_servico uuid NOT NULL REFERENCES public.ordem_servico(id) ON DELETE CASCADE,
  id_centro_custo uuid NOT NULL REFERENCES public.centros_custo(id) ON DELETE CASCADE,
  percentual_rateio numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.distribuicao_receita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can manage distribuicao"
  ON public.distribuicao_receita FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
