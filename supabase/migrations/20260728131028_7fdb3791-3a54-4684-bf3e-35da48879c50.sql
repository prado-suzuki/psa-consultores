-- EDU-10: RLS de org_comments com visibilidade em lote

GRANT SELECT, INSERT, UPDATE ON public.org_comments TO authenticated;
GRANT ALL ON public.org_comments TO service_role;

-- FUNÇÃO 1: projetos visíveis ao usuário (espelha can_view_org_project)
CREATE OR REPLACE FUNCTION public.visible_org_project_ids(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT pid), '{}')::uuid[]
  FROM (
    -- membro direto
    SELECT opm.project_id AS pid
    FROM public.org_project_members opm
    WHERE opm.user_id = _uid

    UNION

    -- responsável, líder ou criador
    SELECT p.id
    FROM public.org_projects p
    WHERE p.responsible_id = _uid
       OR p.leader_id = _uid
       OR p.created_by = _uid

    UNION

    -- líder: membros do projeto pertencem a alguma equipe/área do líder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    -- sublíder: membros do projeto pertencem a equipe do sublíder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_uid))
  ) s
  WHERE pid IS NOT NULL;
$$;

-- FUNÇÃO 2: tarefas alcançáveis por relação direta
CREATE OR REPLACE FUNCTION public.own_org_task_ids(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT t.id), '{}')::uuid[]
  FROM public.org_tasks t
  WHERE t.assigned_to = _uid
     OR t.created_by = _uid
     OR (t.reviewer_id = _uid AND t.status = 'review'::public.fiscal_task_status);
$$;

GRANT EXECUTE ON FUNCTION public.visible_org_project_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.own_org_task_ids(uuid) TO authenticated;

-- POLICIES
DROP POLICY IF EXISTS org_comments_select ON public.org_comments;
DROP POLICY IF EXISTS org_comments_insert ON public.org_comments;
DROP POLICY IF EXISTS org_comments_update ON public.org_comments;

CREATE POLICY org_comments_select
ON public.org_comments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR project_id = ANY(public.visible_org_project_ids(auth.uid()))
  OR (entity_type = 'org_task'::public.org_comment_entity
      AND entity_id = ANY(public.own_org_task_ids(auth.uid())))
);

CREATE POLICY org_comments_insert
ON public.org_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND excluido = false
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR project_id = ANY(public.visible_org_project_ids(auth.uid()))
    OR (entity_type = 'org_task'::public.org_comment_entity
        AND entity_id = ANY(public.own_org_task_ids(auth.uid())))
  )
);

CREATE POLICY org_comments_update
ON public.org_comments
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
)
WITH CHECK (
  author_id = auth.uid()
  OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
);

-- Nenhuma policy de DELETE: exclusão é soft delete via UPDATE (excluido = true).