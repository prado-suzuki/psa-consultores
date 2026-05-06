-- 1. Add gestor_id column to estrutura_equipes
ALTER TABLE public.estrutura_equipes
  ADD COLUMN gestor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Populate gestor_id from area leaders (all areas have at most 1 leader)
UPDATE public.estrutura_equipes e
SET gestor_id = al.user_id
FROM public.estrutura_area_lideres al
WHERE al.area_id = e.area_id;

-- 3. Recreate is_area_member to use gestor_id (drop reference to estrutura_area_lideres)
CREATE OR REPLACE FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM estrutura_equipe_membros em
    JOIN estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE em.user_id = _user_id AND eq.area_id = _estrutura_area_id
    UNION ALL
    SELECT 1 FROM estrutura_equipes eq
    WHERE eq.gestor_id = _user_id AND eq.area_id = _estrutura_area_id
  );
$function$;

-- 4. Drop the old table
DROP TABLE public.estrutura_area_lideres;

-- 5. Index for lookups by gestor
CREATE INDEX IF NOT EXISTS idx_estrutura_equipes_gestor_id ON public.estrutura_equipes(gestor_id);