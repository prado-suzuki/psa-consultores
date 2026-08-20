ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;