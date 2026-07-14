
-- Helper: visibilidade de etapa por cluster (via processes.cluster_id)
CREATE OR REPLACE FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.process_stages ps
        JOIN public.processes p ON p.id = ps.process_id
        WHERE ps.id = _etapa_id
          AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;

-- ============================================================
-- processes
-- ============================================================
DROP POLICY IF EXISTS "Team members can view processes" ON public.processes;
DROP POLICY IF EXISTS rls_processes_update ON public.processes;
DROP POLICY IF EXISTS rls_processes_delete ON public.processes;
DROP POLICY IF EXISTS rls_processes_insert ON public.processes;

CREATE POLICY rls_processes_select ON public.processes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_processes_insert ON public.processes FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_processes_update ON public.processes FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_processes_delete ON public.processes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

-- ============================================================
-- process_stages (cluster via processes.cluster_id)
-- ============================================================
DROP POLICY IF EXISTS "Team members can view process stages" ON public.process_stages;
DROP POLICY IF EXISTS rls_process_stages_update ON public.process_stages;
DROP POLICY IF EXISTS rls_process_stages_delete ON public.process_stages;
DROP POLICY IF EXISTS rls_process_stages_insert ON public.process_stages;

CREATE POLICY rls_process_stages_select ON public.process_stages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.processes p
                  WHERE p.id = process_stages.process_id
                    AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
);

CREATE POLICY rls_process_stages_insert ON public.process_stages FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.processes p
                  WHERE p.id = process_stages.process_id
                    AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
);

CREATE POLICY rls_process_stages_update ON public.process_stages FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.processes p
                  WHERE p.id = process_stages.process_id
                    AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.processes p
                  WHERE p.id = process_stages.process_id
                    AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
);

CREATE POLICY rls_process_stages_delete ON public.process_stages FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND EXISTS (SELECT 1 FROM public.processes p
                  WHERE p.id = process_stages.process_id
                    AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
);

-- ============================================================
-- documentos_processo (cluster_id direto)
-- ============================================================
DROP POLICY IF EXISTS team_member_select_documentos_processo ON public.documentos_processo;
DROP POLICY IF EXISTS team_member_insert_documentos_processo ON public.documentos_processo;
DROP POLICY IF EXISTS team_member_update_documentos_processo ON public.documentos_processo;
DROP POLICY IF EXISTS team_member_delete_documentos_processo ON public.documentos_processo;

CREATE POLICY rls_documentos_processo_select ON public.documentos_processo FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_documentos_processo_insert ON public.documentos_processo FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_documentos_processo_update ON public.documentos_processo FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_documentos_processo_delete ON public.documentos_processo FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

-- ============================================================
-- etapa_documentos
-- ============================================================
DROP POLICY IF EXISTS team_member_select_etapa_documentos ON public.etapa_documentos;
DROP POLICY IF EXISTS team_member_insert_etapa_documentos ON public.etapa_documentos;
DROP POLICY IF EXISTS team_member_update_etapa_documentos ON public.etapa_documentos;
DROP POLICY IF EXISTS team_member_delete_etapa_documentos ON public.etapa_documentos;

CREATE POLICY rls_etapa_documentos_select ON public.etapa_documentos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_documentos_insert ON public.etapa_documentos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_documentos_update ON public.etapa_documentos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_documentos_delete ON public.etapa_documentos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

-- ============================================================
-- etapa_responsaveis
-- ============================================================
DROP POLICY IF EXISTS team_member_select_etapa_responsaveis ON public.etapa_responsaveis;
DROP POLICY IF EXISTS team_member_insert_etapa_responsaveis ON public.etapa_responsaveis;
DROP POLICY IF EXISTS team_member_update_etapa_responsaveis ON public.etapa_responsaveis;
DROP POLICY IF EXISTS team_member_delete_etapa_responsaveis ON public.etapa_responsaveis;

CREATE POLICY rls_etapa_responsaveis_select ON public.etapa_responsaveis FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_responsaveis_insert ON public.etapa_responsaveis FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_responsaveis_update ON public.etapa_responsaveis FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_responsaveis_delete ON public.etapa_responsaveis FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

-- ============================================================
-- etapa_sistemas
-- ============================================================
DROP POLICY IF EXISTS team_member_select_etapa_sistemas ON public.etapa_sistemas;
DROP POLICY IF EXISTS team_member_insert_etapa_sistemas ON public.etapa_sistemas;
DROP POLICY IF EXISTS team_member_update_etapa_sistemas ON public.etapa_sistemas;
DROP POLICY IF EXISTS team_member_delete_etapa_sistemas ON public.etapa_sistemas;

CREATE POLICY rls_etapa_sistemas_select ON public.etapa_sistemas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_sistemas_insert ON public.etapa_sistemas FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_sistemas_update ON public.etapa_sistemas FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);

CREATE POLICY rls_etapa_sistemas_delete ON public.etapa_sistemas FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND public.process_stage_cluster_visivel(etapa_id))
);
