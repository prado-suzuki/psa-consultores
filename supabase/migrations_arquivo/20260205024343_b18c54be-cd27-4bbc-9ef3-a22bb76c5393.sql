-- Adicionar novos campos ao projeto para área Tax
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS external_client_id UUID REFERENCES public.cliente(id),
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Comentários para documentar os campos
COMMENT ON COLUMN public.projects.responsible_id IS 'Responsável interno do projeto (membro da equipe)';
COMMENT ON COLUMN public.projects.leader_id IS 'Líder responsável pelo projeto';
COMMENT ON COLUMN public.projects.external_client_id IS 'Cliente externo associado ao projeto';
COMMENT ON COLUMN public.projects.area IS 'Área do projeto (tributário, contábil, etc)';
COMMENT ON COLUMN public.projects.objective IS 'Objetivo do projeto';
COMMENT ON COLUMN public.projects.categories IS 'Categorias do projeto';