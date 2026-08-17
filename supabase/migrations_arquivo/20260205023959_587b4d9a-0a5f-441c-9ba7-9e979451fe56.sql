-- Adicionar coluna source_area para identificar a origem do projeto (Digital Rotina, Tax, etc.)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS source_area TEXT DEFAULT 'digital';

-- Atualizar projetos existentes baseado em padrões conhecidos
-- Os projetos da screenshot (P2, P3, P4, P5, P7) são de Digital Rotina (criados pela equipe Digital para área Fiscal)
-- Projetos criados diretamente na área Tax terão source_area = 'tax'

COMMENT ON COLUMN public.projects.source_area IS 'Identifica a área de origem do projeto: digital, tax, osg, etc.';