-- 1. Novas colunas + FKs
ALTER TABLE public.distribuicao_dcomp
  ADD COLUMN IF NOT EXISTS grupo_tributo_id uuid NULL,
  ADD COLUMN IF NOT EXISTS codigo_receita_id uuid NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'distribuicao_dcomp_grupo_tributo_id_fkey'
  ) THEN
    ALTER TABLE public.distribuicao_dcomp
      ADD CONSTRAINT distribuicao_dcomp_grupo_tributo_id_fkey
      FOREIGN KEY (grupo_tributo_id) REFERENCES public.grupo_tributo(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'distribuicao_dcomp_codigo_receita_id_fkey'
  ) THEN
    ALTER TABLE public.distribuicao_dcomp
      ADD CONSTRAINT distribuicao_dcomp_codigo_receita_id_fkey
      FOREIGN KEY (codigo_receita_id) REFERENCES public.codigo_receita(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_distribuicao_dcomp_grupo_tributo_id
  ON public.distribuicao_dcomp(grupo_tributo_id);
CREATE INDEX IF NOT EXISTS idx_distribuicao_dcomp_codigo_receita_id
  ON public.distribuicao_dcomp(codigo_receita_id);

-- 2. Backfill idempotente
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'PIS' AND g.sigla = 'PIS/PASEP';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'COFINS' AND g.sigla = 'COFINS';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'IPI' AND g.sigla = 'IPI';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'INSS' AND g.sigla = 'CP SEGURADOS';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'IRRF' AND g.sigla = 'IRRF';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'IRPJ' AND g.sigla = 'IRPJ';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'CSLL' AND g.sigla = 'CSLL';
UPDATE public.distribuicao_dcomp d SET grupo_tributo_id = g.id
  FROM public.grupo_tributo g
  WHERE d.grupo_tributo_id IS NULL AND d.tributo = 'CSRF' AND g.sigla = 'CSRF';