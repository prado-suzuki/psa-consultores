ALTER TABLE public.contribuinte ADD COLUMN excluido boolean NOT NULL DEFAULT false;
ALTER TABLE public.contribuinte_dev ADD COLUMN excluido boolean NOT NULL DEFAULT false;