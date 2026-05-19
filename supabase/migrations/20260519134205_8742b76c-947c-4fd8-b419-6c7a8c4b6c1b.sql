ALTER TABLE public.distribuicao_dcomp ADD COLUMN IF NOT EXISTS valor_original NUMERIC(18,2) NULL;
ALTER TABLE public.per ADD COLUMN IF NOT EXISTS vlr_ressarcido_original NUMERIC(18,2) NULL;