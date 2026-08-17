ALTER TABLE public.org_projects ADD COLUMN equipe_id uuid REFERENCES public.estrutura_equipes(id);
CREATE INDEX idx_org_projects_equipe_id ON public.org_projects(equipe_id);

UPDATE public.org_projects
SET equipe_id = '4995f1d5-bdaa-4854-b88c-cf0f42380d13'
WHERE estrutura_area_id IN (
  '947fc502-91cd-4fc2-8d88-76cd9d829754',
  'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3',
  'a76d5f03-de4b-499d-9fb2-d9764b26422a'
);

UPDATE public.org_projects p
SET equipe_id = e.id
FROM public.estrutura_equipes e
WHERE e.area_id = p.estrutura_area_id
  AND p.equipe_id IS NULL;