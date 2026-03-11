
ALTER TABLE public.produto_segmento DROP COLUMN IF EXISTS cluster_id;
ALTER TABLE public.contribuinte DROP COLUMN IF EXISTS inscricoes_estaduais;
ALTER TABLE public.contribuinte_dev DROP COLUMN IF EXISTS inscricoes_estaduais;
