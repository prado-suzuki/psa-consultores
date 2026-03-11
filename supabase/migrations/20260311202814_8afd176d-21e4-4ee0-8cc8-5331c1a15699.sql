ALTER TABLE public.participante
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;

ALTER TABLE public.participante_dev
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;