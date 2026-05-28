-- =============================================================================
-- Diagnóstico Patrimonial: torna area_real opcional na tabela matricula
-- =============================================================================

ALTER TABLE public.matricula
  ALTER COLUMN area_real DROP NOT NULL;
