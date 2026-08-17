
-- Helper: visibilidade de tarefa (mesma lógica do SELECT atual de org_tasks)
CREATE OR REPLACE FUNCTION public.org_task_visivel(p_task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_tasks t
    WHERE t.id = p_task_id AND (
      public.has_role(auth.uid(),'admin'::app_role)
      OR (t.project_id IS NOT NULL
          AND (public.has_role(auth.uid(),'lider'::app_role) OR public.has_role(auth.uid(),'sublider'::app_role))
          AND public.can_view_org_project(auth.uid(), t.project_id))
      OR t.assigned_to = auth.uid()
      OR t.created_by  = auth.uid()
    )
  );
$$;

-- 2) org_tasks — só escrita (SELECT intocado)
DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;
CREATE POLICY rls_org_tasks_insert ON public.org_tasks FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(),'sublider'::app_role)
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (project_id IS NOT NULL
      AND (public.has_role(auth.uid(),'lider'::app_role) OR public.has_role(auth.uid(),'sublider'::app_role))
      AND public.can_view_org_project(auth.uid(), project_id))
  OR assigned_to = auth.uid()
  OR created_by  = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (project_id IS NOT NULL
      AND (public.has_role(auth.uid(),'lider'::app_role) OR public.has_role(auth.uid(),'sublider'::app_role))
      AND public.can_view_org_project(auth.uid(), project_id))
  OR assigned_to = auth.uid()
  OR created_by  = auth.uid()
);

DROP POLICY IF EXISTS rls_org_tasks_delete ON public.org_tasks;
CREATE POLICY rls_org_tasks_delete ON public.org_tasks FOR DELETE TO authenticated
USING (public.has_role_or_higher(auth.uid(),'lider'::app_role));

-- Trigger: team_member puro só pode mudar 'status' (e 'updated_at')
CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.has_role_or_higher(auth.uid(),'sublider'::app_role) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'team_member só pode alterar o status da própria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_org_tasks_team_member_status_only ON public.org_tasks;
CREATE TRIGGER trg_org_tasks_team_member_status_only
  BEFORE UPDATE ON public.org_tasks
  FOR EACH ROW EXECUTE FUNCTION public.org_tasks_team_member_status_only();

-- 3) org_task_comments — SELECT herda da tarefa
DROP POLICY IF EXISTS "Team members can view org task comments" ON public.org_task_comments;
DROP POLICY IF EXISTS org_task_comments_select ON public.org_task_comments;
CREATE POLICY org_task_comments_select ON public.org_task_comments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.org_task_visivel(task_id)
);

-- 4) ordem_servico — SELECT por cliente/cluster
DROP POLICY IF EXISTS team_select_ordem_servico ON public.ordem_servico;
DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select ON public.ordem_servico FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.cliente_visivel_para(id_cliente)
  OR (cluster_id IS NOT NULL AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
);

-- 5) projeto_justificativas — SELECT amarrado ao projeto (projects.cluster_id)
DROP POLICY IF EXISTS projeto_justificativas_auth_select ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_select ON public.projeto_justificativas;
CREATE POLICY projeto_justificativas_select ON public.projeto_justificativas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = projeto_id
      AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
  )
);
