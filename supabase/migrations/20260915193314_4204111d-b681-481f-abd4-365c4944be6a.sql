ALTER VIEW IF EXISTS public.org_comments_feed SET (security_invoker = on);
ALTER VIEW IF EXISTS public.cliente_setor_regiao_atual SET (security_invoker = on);

DROP POLICY IF EXISTS agente_config_select ON public.agente_config;
CREATE POLICY agente_config_select ON public.agente_config
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

DROP POLICY IF EXISTS agente_aprendizados_select ON public.agente_aprendizados;
CREATE POLICY agente_aprendizados_select ON public.agente_aprendizados
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;
CREATE POLICY rls_org_tasks_insert ON public.org_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
      AND (
        assigned_to = auth.uid()
        OR (
          created_by = auth.uid()
          AND parent_task_id IS NOT NULL
          AND public.org_task_visivel(parent_task_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role))
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
      AND (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR (reviewer_id = auth.uid() AND status = 'review'::public.fiscal_task_status)
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role))
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR (
      public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
      AND (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR (reviewer_id = auth.uid() AND status = ANY (ARRAY['review'::public.fiscal_task_status, 'em_ajuste'::public.fiscal_task_status]))
      )
    )
  );