
-- Permite bens imóveis (IR/IB) sem valor contábil agregado: os valores passam a viver na matrícula.
ALTER TABLE public.bem ALTER COLUMN vlr_contabil DROP NOT NULL;

-- Replica colunas de valores e adiciona tipo do bem (apenas IR/IB) na matricula.
ALTER TABLE public.matricula
  ADD COLUMN IF NOT EXISTS tipo_bem text CHECK (tipo_bem IN ('IR','IB')),
  ADD COLUMN IF NOT EXISTS vlr_contabil numeric,
  ADD COLUMN IF NOT EXISTS vlr_contabil_ajustado numeric,
  ADD COLUMN IF NOT EXISTS vlr_benfeitorias numeric,
  ADD COLUMN IF NOT EXISTS vlr_mercado numeric,
  ADD COLUMN IF NOT EXISTS vlr_imposto_anual numeric,
  ADD COLUMN IF NOT EXISTS imposto_anual_exercicio integer;

COMMENT ON COLUMN public.matricula.tipo_bem IS 'Tipo do imóvel da matrícula: IR (Rural) ou IB (Urbano). Para IR/IB os valores vivem aqui (não no bem).';
