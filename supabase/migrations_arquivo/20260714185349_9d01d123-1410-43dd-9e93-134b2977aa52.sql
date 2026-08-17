
CREATE OR REPLACE FUNCTION public.gargalo_cluster_visivel(_gargalo_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.gargalos g
        WHERE g.id = _gargalo_id
          AND g.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;

-- ============================================================
-- gargalos (cluster_id direto)
-- ============================================================
DROP POLICY IF EXISTS team_member_select_gargalos ON public.gargalos;
DROP POLICY IF EXISTS team_member_insert_gargalos ON public.gargalos;
DROP POLICY IF EXISTS team_member_update_gargalos ON public.gargalos;
DROP POLICY IF EXISTS team_member_delete_gargalos ON public.gargalos;

CREATE POLICY rls_gargalos_select ON public.gargalos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_gargalos_insert ON public.gargalos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

CREATE POLICY rls_gargalos_update ON public.gargalos FOR UPDATE TO authenticated
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

CREATE POLICY rls_gargalos_delete ON public.gargalos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
);

-- ============================================================
-- gargalo_processos (via gargalo_id)
-- ============================================================
DROP POLICY IF EXISTS team_member_select_gargalo_processos ON public.gargalo_processos;
DROP POLICY IF EXISTS team_member_insert_gargalo_processos ON public.gargalo_processos;
DROP POLICY IF EXISTS team_member_update_gargalo_processos ON public.gargalo_processos;
DROP POLICY IF EXISTS team_member_delete_gargalo_processos ON public.gargalo_processos;

CREATE POLICY rls_gargalo_processos_select ON public.gargalo_processos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_processos_insert ON public.gargalo_processos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_processos_update ON public.gargalo_processos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_processos_delete ON public.gargalo_processos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

-- ============================================================
-- gargalo_responsaveis (via gargalo_id)
-- ============================================================
DROP POLICY IF EXISTS team_member_select_gargalo_responsaveis ON public.gargalo_responsaveis;
DROP POLICY IF EXISTS team_member_insert_gargalo_responsaveis ON public.gargalo_responsaveis;
DROP POLICY IF EXISTS team_member_update_gargalo_responsaveis ON public.gargalo_responsaveis;
DROP POLICY IF EXISTS team_member_delete_gargalo_responsaveis ON public.gargalo_responsaveis;

CREATE POLICY rls_gargalo_responsaveis_select ON public.gargalo_responsaveis FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_responsaveis_insert ON public.gargalo_responsaveis FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_responsaveis_update ON public.gargalo_responsaveis FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);

CREATE POLICY rls_gargalo_responsaveis_delete ON public.gargalo_responsaveis FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND public.gargalo_cluster_visivel(gargalo_id))
);
