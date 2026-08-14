-- Add new columns to contatos table for better lead qualification
ALTER TABLE public.contatos 
ADD COLUMN IF NOT EXISTS porte_empresa TEXT,
ADD COLUMN IF NOT EXISTS como_conheceu TEXT;