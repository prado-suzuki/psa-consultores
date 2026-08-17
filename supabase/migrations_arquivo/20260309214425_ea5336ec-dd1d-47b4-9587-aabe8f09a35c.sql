ALTER TABLE public.cliente ADD COLUMN excluido boolean NOT NULL DEFAULT false;
ALTER TABLE public.cliente_dev ADD COLUMN excluido boolean NOT NULL DEFAULT false;