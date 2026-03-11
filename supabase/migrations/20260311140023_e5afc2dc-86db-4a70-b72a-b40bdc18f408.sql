
ALTER TABLE public.contribuinte
ADD COLUMN IF NOT EXISTS inscricoes_estaduais jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.contribuinte_dev
ADD COLUMN IF NOT EXISTS inscricoes_estaduais jsonb DEFAULT '[]'::jsonb;
