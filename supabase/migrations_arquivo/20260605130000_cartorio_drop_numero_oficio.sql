-- =========================================================
-- Remove a coluna numero_oficio da tabela cartorio
-- =========================================================

ALTER TABLE public.cartorio
  DROP COLUMN IF EXISTS numero_oficio;
