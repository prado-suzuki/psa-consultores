-- Adicionar colunas faltantes na tabela cliente
ALTER TABLE public.cliente ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE public.cliente ADD COLUMN IF NOT EXISTS uf TEXT;
ALTER TABLE public.cliente ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;