
-- Add missing columns to cliente_dev
ALTER TABLE public.cliente_dev
  ADD COLUMN IF NOT EXISTS empresa_faturamento text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_produto_segmento text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_produto_segmento_custom text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS regiao text DEFAULT NULL;

-- Add missing columns to contribuinte_dev
ALTER TABLE public.contribuinte_dev
  ADD COLUMN IF NOT EXISTS telefone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_fantasia text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS situacao_inscricao_estadual text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cep text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logradouro text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS numero text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS complemento text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bairro text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS municipio text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uf text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contribuinte_faturamento boolean DEFAULT false;

-- Add missing columns to participante_dev
ALTER TABLE public.participante_dev
  ADD COLUMN IF NOT EXISTS tipo_participante text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacoes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS acesso_chamados boolean DEFAULT false;

-- Add missing columns to contrato_dev (used as OS fallback)
ALTER TABLE public.contrato_dev
  ADD COLUMN IF NOT EXISTS data_emissao text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_reembolso_km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_reembolso_refeicao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS situacao text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacoes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS servicos_contratados jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS centros_custo jsonb DEFAULT '[]'::jsonb;
