-- =============================================================================
-- Diagnóstico Patrimonial: torna vlr_mercado opcional na tabela bem
-- =============================================================================

ALTER TABLE public.bem
  ALTER COLUMN vlr_mercado DROP NOT NULL;
