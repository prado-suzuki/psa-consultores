-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827135718, nome `projeto_restrito_regras` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

CREATE OR REPLACE FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR (
      CASE
        WHEN EXISTS (SELECT 1 FROM public.org_projects p WHERE p.id = _project_id AND p.restricted)
        THEN public.is_project_member(_user_id, _project_id)
        ELSE
          public.is_project_member(_user_id, _project_id)
          OR EXISTS (
            SELECT 1 FROM public.org_projects p
            WHERE p.id = _project_id
              AND (p.responsible_id = _user_id OR p.leader_id = _user_id OR p.created_by = _user_id)
          )
          OR (
            public.has_role(_user_id, 'lider'::app_role)
            AND EXISTS (
              SELECT 1 FROM public.org_project_members opm
              JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
              JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
              WHERE opm.project_id = _project_id
                AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
              UNION ALL
              SELECT 1 FROM public.org_project_members opm
              JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
              WHERE opm.project_id = _project_id
                AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
            )
          )
          OR (
            public.has_role(_user_id, 'sublider'::app_role)
            AND EXISTS (
              SELECT 1 FROM public.org_project_members opm
              JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
              WHERE opm.project_id = _project_id
                AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
              UNION ALL
              SELECT 1 FROM public.org_project_members opm
              JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
              WHERE opm.project_id = _project_id
                AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
            )
          )
      END
    );
$function$;

CREATE OR REPLACE FUNCTION public.org_task_visivel(p_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.org_tasks t
    WHERE t.id = p_task_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          (NOT t.project_restricted OR public.is_project_member(auth.uid(), t.project_id))
          AND (
            (
              t.project_id IS NOT NULL
              AND (public.has_role(auth.uid(), 'lider'::public.app_role)
                   OR public.has_role(auth.uid(), 'sublider'::public.app_role))
              AND public.can_view_org_project(auth.uid(), t.project_id)
            )
            OR t.assigned_to = auth.uid()
            OR t.created_by = auth.uid()
            OR (t.reviewer_id = auth.uid() AND t.status = 'review'::public.fiscal_task_status)
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.visible_org_project_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT pid), '{}')::uuid[]
  FROM (
    SELECT opm.project_id AS pid FROM public.org_project_members opm WHERE opm.user_id = _uid
    UNION
    SELECT p.id FROM public.org_projects p
     WHERE p.responsible_id = _uid OR p.leader_id = _uid OR p.created_by = _uid
    UNION
    SELECT opm.project_id FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))
    UNION
    SELECT opm.project_id FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))
    UNION
    SELECT opm.project_id FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_uid))
    UNION
    SELECT opm.project_id FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_uid))
  ) s
  WHERE pid IS NOT NULL
    AND (
      public.has_role(_uid, 'admin'::app_role)
      OR NOT EXISTS (SELECT 1 FROM public.org_projects p WHERE p.id = s.pid AND p.restricted)
      OR EXISTS (SELECT 1 FROM public.org_project_members m WHERE m.project_id = s.pid AND m.user_id = _uid)
    );
$function$;

CREATE OR REPLACE FUNCTION public.own_org_task_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT t.id), '{}')::uuid[]
  FROM public.org_tasks t
  WHERE (
      t.assigned_to = _uid OR t.created_by = _uid
      OR (t.reviewer_id = _uid AND t.status = 'review'::public.fiscal_task_status)
    )
    AND (
      NOT t.project_restricted
      OR public.has_role(_uid, 'admin'::app_role)
      OR public.is_project_member(_uid, t.project_id)
    );
$function$;

DROP POLICY IF EXISTS rls_org_projects_select ON public.org_projects;
CREATE POLICY rls_org_projects_select ON public.org_projects FOR SELECT TO authenticated
  USING (
    (
      has_role((SELECT auth.uid()), 'admin'::app_role)
      OR created_by = (SELECT auth.uid())
      OR responsible_id = (SELECT auth.uid())
      OR leader_id = (SELECT auth.uid())
      OR can_view_org_project((SELECT auth.uid()), id)
    )
    AND (NOT restricted OR has_role((SELECT auth.uid()), 'admin'::app_role)
         OR is_project_member((SELECT auth.uid()), id))
  );

DROP POLICY IF EXISTS rls_org_projects_update ON public.org_projects;
CREATE POLICY rls_org_projects_update ON public.org_projects FOR UPDATE TO authenticated
  USING (
    (has_role_or_higher(auth.uid(), 'sublider'::app_role)
     OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_project_member(auth.uid(), id)))
    AND (NOT restricted OR has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), id))
  )
  WITH CHECK (
    (has_role_or_higher(auth.uid(), 'sublider'::app_role)
     OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_project_member(auth.uid(), id)))
    AND (NOT restricted OR has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), id))
  );

DROP POLICY IF EXISTS rls_org_projects_delete ON public.org_projects;
CREATE POLICY rls_org_projects_delete ON public.org_projects FOR DELETE TO authenticated
  USING (
    (has_role_or_higher(auth.uid(), 'lider'::app_role) OR created_by = auth.uid())
    AND (NOT restricted OR has_role(auth.uid(), 'admin'::app_role) OR is_project_member(auth.uid(), id))
  );

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select ON public.org_tasks FOR SELECT TO authenticated
  USING (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR (project_id IS NOT NULL
          AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
          AND can_view_org_project(auth.uid(), project_id))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR (reviewer_id = auth.uid() AND status = 'review'::fiscal_task_status)
    )
    AND (NOT project_restricted OR has_role(auth.uid(), 'admin'::app_role)
         OR is_project_member(auth.uid(), project_id))
  );

DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks FOR UPDATE TO authenticated
  USING (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR (project_id IS NOT NULL
          AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
          AND can_view_org_project(auth.uid(), project_id))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR (reviewer_id = auth.uid() AND status = 'review'::fiscal_task_status)
    )
    AND (NOT project_restricted OR has_role(auth.uid(), 'admin'::app_role)
         OR is_project_member(auth.uid(), project_id))
  )
  WITH CHECK (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR (project_id IS NOT NULL
          AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
          AND can_view_org_project(auth.uid(), project_id))
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR (reviewer_id = auth.uid()
          AND status = ANY (ARRAY['review'::fiscal_task_status, 'em_ajuste'::fiscal_task_status]))
    )
    AND (NOT project_restricted OR has_role(auth.uid(), 'admin'::app_role)
         OR is_project_member(auth.uid(), project_id))
  );

DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;
CREATE POLICY rls_org_tasks_insert ON public.org_tasks FOR INSERT TO authenticated
  WITH CHECK (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role_or_higher(auth.uid(), 'sublider'::app_role)
      OR assigned_to = auth.uid()
      OR (created_by = auth.uid() AND parent_task_id IS NOT NULL AND org_task_visivel(parent_task_id))
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR NOT EXISTS (SELECT 1 FROM public.org_projects p WHERE p.id = project_id AND p.restricted)
      OR is_project_member(auth.uid(), project_id)
    )
  );

DROP POLICY IF EXISTS rls_org_tasks_delete ON public.org_tasks;
CREATE POLICY rls_org_tasks_delete ON public.org_tasks FOR DELETE TO authenticated
  USING (
    (has_role_or_higher(auth.uid(), 'lider'::app_role)
     OR (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND created_by = auth.uid()))
    AND (NOT project_restricted OR has_role(auth.uid(), 'admin'::app_role)
         OR is_project_member(auth.uid(), project_id))
  );

DROP POLICY IF EXISTS rls_org_task_comments_insert ON public.org_task_comments;
CREATE POLICY rls_org_task_comments_insert ON public.org_task_comments FOR INSERT TO authenticated
  WITH CHECK (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (has_role(auth.uid(), 'admin'::app_role) OR org_task_visivel(task_id))
  );

DROP POLICY IF EXISTS rls_org_task_comments_update ON public.org_task_comments;
CREATE POLICY rls_org_task_comments_update ON public.org_task_comments FOR UPDATE TO authenticated
  USING (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (has_role(auth.uid(), 'admin'::app_role) OR org_task_visivel(task_id))
  )
  WITH CHECK (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (has_role(auth.uid(), 'admin'::app_role) OR org_task_visivel(task_id))
  );

CREATE OR REPLACE FUNCTION public.org_tasks_guarda_restrito()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_restrito boolean;
BEGIN
  SELECT p.restricted INTO v_restrito FROM public.org_projects p WHERE p.id = NEW.project_id;
  IF NOT coalesce(v_restrito, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NOT public.is_project_member(NEW.assigned_to, NEW.project_id) THEN
    RAISE EXCEPTION 'Projeto confidencial: a tarefa so pode ser atribuida a quem esta vinculado ao projeto'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.reviewer_id IS NOT NULL AND NOT public.is_project_member(NEW.reviewer_id, NEW.project_id) THEN
    RAISE EXCEPTION 'Projeto confidencial: o revisor precisa estar vinculado ao projeto'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.org_tasks_guarda_restrito() IS
  'Em projeto confidencial, responsavel e revisor tem que estar vinculados. Vale para atribuicao nova; tarefa que ja existia quando o projeto virou confidencial nao e revalidada.';

DROP TRIGGER IF EXISTS trg_org_tasks_guarda_restrito ON public.org_tasks;
CREATE TRIGGER trg_org_tasks_guarda_restrito
  BEFORE INSERT OR UPDATE OF assigned_to, reviewer_id, project_id ON public.org_tasks
  FOR EACH ROW EXECUTE FUNCTION public.org_tasks_guarda_restrito();
