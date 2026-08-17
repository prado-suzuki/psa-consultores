
-- Funções auxiliares (SECURITY DEFINER) para resolver áreas/equipes do usuário

CREATE OR REPLACE FUNCTION public.user_estrutura_area_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT eq.area_id
  FROM public.estrutura_equipe_membros em
  JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
  WHERE em.user_id = _user_id AND eq.area_id IS NOT NULL
  UNION
  SELECT eq.area_id
  FROM public.estrutura_equipes eq
  WHERE eq.gestor_id = _user_id AND eq.area_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_estrutura_equipe_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT em.equipe_id
  FROM public.estrutura_equipe_membros em
  WHERE em.user_id = _user_id
  UNION
  SELECT eq.id
  FROM public.estrutura_equipes eq
  WHERE eq.gestor_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin vê tudo
    public.has_role(_user_id, 'admin'::app_role)
    -- Membro direto do projeto
    OR public.is_project_member(_user_id, _project_id)
    -- Fallback: responsável, líder ou criador
    OR EXISTS (
      SELECT 1 FROM public.org_projects p
      WHERE p.id = _project_id
        AND (p.responsible_id = _user_id OR p.leader_id = _user_id OR p.created_by = _user_id)
    )
    -- Líder: algum membro do projeto pertence a uma das áreas do líder
    OR (
      public.has_role(_user_id, 'lider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
      )
    )
    -- Sublíder: algum membro do projeto pertence a uma das equipes do sublíder
    OR (
      public.has_role(_user_id, 'sublider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
      )
    );
$$;

-- Substitui a policy de SELECT
DROP POLICY IF EXISTS rls_org_projects_select ON public.org_projects;

CREATE POLICY rls_org_projects_select
ON public.org_projects
FOR SELECT
USING (public.can_view_org_project(auth.uid(), id));
