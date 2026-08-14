
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS equipe_id uuid REFERENCES public.estrutura_equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_equipe_id ON public.projects(equipe_id);

CREATE OR REPLACE FUNCTION public.sync_project_area_from_equipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_name text;
BEGIN
  IF NEW.equipe_id IS NOT NULL THEN
    SELECT a.name INTO v_area_name
    FROM public.estrutura_equipes eq
    JOIN public.estrutura_areas a ON a.id = eq.area_id
    WHERE eq.id = NEW.equipe_id;
    IF v_area_name IS NOT NULL THEN
      NEW.area := v_area_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_sync_area_from_equipe ON public.projects;
CREATE TRIGGER trg_projects_sync_area_from_equipe
BEFORE INSERT OR UPDATE OF equipe_id ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_project_area_from_equipe();
