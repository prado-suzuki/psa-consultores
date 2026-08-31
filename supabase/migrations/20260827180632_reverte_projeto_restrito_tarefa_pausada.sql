-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827180632, nome `reverte_projeto_restrito_tarefa_pausada` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

-- Reverte por completo os quatro blocos de "projeto restrito": a tarefa foi
-- pausada pela Patricia em 27/08/2026 e o trabalho saiu da develop para a branch
-- local feat/projeto-restrito. As definicoes abaixo foram lidas de PRODUCAO, que
-- esta intocada, e nao transcritas de memoria.

-- ── 1. As quatro funcoes, como estao em producao ──

CREATE OR REPLACE FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.is_project_member(_user_id, _project_id)
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
    );
$function$;

CREATE OR REPLACE FUNCTION public.org_task_visivel(p_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_tasks t
    WHERE t.id = p_task_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          t.project_id IS NOT NULL
          AND (
            public.has_role(auth.uid(), 'lider'::public.app_role)
            OR public.has_role(auth.uid(), 'sublider'::public.app_role)
          )
          AND public.can_view_org_project(auth.uid(), t.project_id)
        )
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
        OR (
          t.reviewer_id = auth.uid()
          AND t.status = 'review'::public.fiscal_task_status
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.visible_org_project_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT pid), '{}')::uuid[]
  FROM (
    SELECT opm.project_id AS pid
    FROM public.org_project_members opm
    WHERE opm.user_id = _uid
    UNION
    SELECT p.id
    FROM public.org_projects p
    WHERE p.responsible_id = _uid
       OR p.leader_id = _uid
       OR p.created_by = _uid
    UNION
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
$function$;

CREATE OR REPLACE FUNCTION public.own_org_task_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT t.id), '{}')::uuid[]
  FROM public.org_tasks t
  WHERE t.assigned_to = _uid
     OR t.created_by = _uid
     OR (t.reviewer_id = _uid AND t.status = 'review'::public.fiscal_task_status);
$function$;

-- ── 2. As policies, tambem como estao em producao ──
-- ATENCAO: rls_org_projects_select e TO public em producao, nao TO authenticated.

DROP POLICY IF EXISTS rls_org_projects_select ON public.org_projects;
CREATE POLICY rls_org_projects_select ON public.org_projects FOR SELECT TO public
  USING (has_role((SELECT auth.uid()), 'admin'::app_role)
         OR created_by = (SELECT auth.uid())
         OR responsible_id = (SELECT auth.uid())
         OR leader_id = (SELECT auth.uid())
         OR can_view_org_project((SELECT auth.uid()), id));

DROP POLICY IF EXISTS rls_org_projects_update ON public.org_projects;
CREATE POLICY rls_org_projects_update ON public.org_projects FOR UPDATE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'sublider'::app_role)
         OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_project_member(auth.uid(), id)))
  WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role)
         OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND is_project_member(auth.uid(), id)));

DROP POLICY IF EXISTS rls_org_projects_delete ON public.org_projects;
CREATE POLICY rls_org_projects_delete ON public.org_projects FOR DELETE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'lider'::app_role) OR created_by = auth.uid());

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select ON public.org_tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR (project_id IS NOT NULL
             AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
             AND can_view_org_project(auth.uid(), project_id))
         OR assigned_to = auth.uid()
         OR created_by = auth.uid()
         OR (reviewer_id = auth.uid() AND status = 'review'::fiscal_task_status));

DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR (project_id IS NOT NULL
             AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
             AND can_view_org_project(auth.uid(), project_id))
         OR assigned_to = auth.uid()
         OR created_by = auth.uid()
         OR (reviewer_id = auth.uid() AND status = 'review'::fiscal_task_status))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role)
         OR (project_id IS NOT NULL
             AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
             AND can_view_org_project(auth.uid(), project_id))
         OR assigned_to = auth.uid()
         OR created_by = auth.uid()
         OR (reviewer_id = auth.uid()
             AND status = ANY (ARRAY['review'::fiscal_task_status, 'em_ajuste'::fiscal_task_status])));

DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;
CREATE POLICY rls_org_tasks_insert ON public.org_tasks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role)
         OR has_role_or_higher(auth.uid(), 'sublider'::app_role)
         OR assigned_to = auth.uid()
         OR (created_by = auth.uid() AND parent_task_id IS NOT NULL AND org_task_visivel(parent_task_id)));

DROP POLICY IF EXISTS rls_org_tasks_delete ON public.org_tasks;
CREATE POLICY rls_org_tasks_delete ON public.org_tasks FOR DELETE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'lider'::app_role)
         OR (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND created_by = auth.uid()));

DROP POLICY IF EXISTS rls_org_task_comments_insert ON public.org_task_comments;
CREATE POLICY rls_org_task_comments_insert ON public.org_task_comments FOR INSERT TO authenticated
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_org_task_comments_update ON public.org_task_comments;
CREATE POLICY rls_org_task_comments_update ON public.org_task_comments FOR UPDATE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_org_project_members_insert ON public.org_project_members;
CREATE POLICY rls_org_project_members_insert ON public.org_project_members FOR INSERT TO authenticated
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_org_project_members_update ON public.org_project_members;
CREATE POLICY rls_org_project_members_update ON public.org_project_members FOR UPDATE TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_audit_logs_select ON public.audit_logs;
CREATE POLICY rls_audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- ── 3. Triggers e funcoes que so existiam para a feature ──

DROP TRIGGER IF EXISTS trg_org_projects_sincroniza_membros ON public.org_projects;
DROP TRIGGER IF EXISTS trg_org_projects_espelha_restricted ON public.org_projects;
DROP TRIGGER IF EXISTS trg_org_projects_guarda_restricted ON public.org_projects;
DROP TRIGGER IF EXISTS trg_org_tasks_herda_restricted ON public.org_tasks;
DROP TRIGGER IF EXISTS trg_org_tasks_guarda_restrito ON public.org_tasks;

DROP FUNCTION IF EXISTS public.org_projects_sincroniza_membros();
DROP FUNCTION IF EXISTS public.org_projects_espelha_restricted();
DROP FUNCTION IF EXISTS public.org_projects_guarda_restricted();
DROP FUNCTION IF EXISTS public.org_tasks_herda_restricted();
DROP FUNCTION IF EXISTS public.org_tasks_guarda_restrito();
DROP FUNCTION IF EXISTS public.audit_log_projeto(text, uuid);

-- ── 4. As 53 linhas do backfill, identificadas pelo carimbo E pelo padrao ──
-- 52 criadores (role 'member') e 1 responsavel, todas de 27/08/2026 13:53.
-- Ninguem perde acesso: a funcao restaurada acima tem o ramo `created_by`.

DELETE FROM public.org_project_members m
USING public.org_projects p
WHERE p.id = m.project_id
  AND m.created_at >= '2026-08-27 13:53:00+00'
  AND m.created_at <  '2026-08-27 13:54:00+00'
  AND (
    (m.role = 'member'      AND m.user_id = p.created_by)
    OR (m.role = 'responsible' AND m.user_id = p.responsible_id)
  );

-- ── 5. As colunas, por ultimo e SEM CASCADE ──
-- Sem CASCADE de proposito: se algo que eu nao vi ainda depender delas, o comando
-- falha e a transacao inteira volta atras, em vez de derrubar em silencio.

ALTER TABLE public.org_tasks    DROP COLUMN IF EXISTS project_restricted;
ALTER TABLE public.org_projects DROP COLUMN IF EXISTS restricted;
