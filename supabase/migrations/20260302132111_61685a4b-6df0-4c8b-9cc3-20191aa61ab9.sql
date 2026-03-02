
-- =====================================================
-- Fase 1: ADD COLUMN nas tabelas de PRODUÇÃO apenas
-- =====================================================

-- 1.1 Tabela cliente
ALTER TABLE public.cliente
  ADD COLUMN IF NOT EXISTS empresa_faturamento text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo_produto_segmento text,
  ADD COLUMN IF NOT EXISTS tipo_produto_segmento_custom text,
  ADD COLUMN IF NOT EXISTS regiao text;

-- 1.2 Tabela contribuinte
ALTER TABLE public.contribuinte
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS situacao_inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS contribuinte_faturamento boolean DEFAULT false;

-- 1.3 Tabela participante
ALTER TABLE public.participante
  ADD COLUMN IF NOT EXISTS tipo_participante text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS acesso_chamados boolean DEFAULT false;

-- 1.4 Tabela contrato
ALTER TABLE public.contrato
  ADD COLUMN IF NOT EXISTS data_emissao date,
  ADD COLUMN IF NOT EXISTS valor_reembolso_km numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_reembolso_refeicao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS situacao_projeto text DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS observacoes_projeto text,
  ADD COLUMN IF NOT EXISTS servicos_contratados jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS centros_custo jsonb DEFAULT '[]'::jsonb;
