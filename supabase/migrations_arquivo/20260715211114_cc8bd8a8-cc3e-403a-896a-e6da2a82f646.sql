-- ============================================================================
-- RLS-P1-04 — Módulo Sistemas: isolamento por cluster (fiel ao M:N)
-- Visibilidade de um sistema = cluster primário do usuário OU sistema
--   compartilhado ao cluster do usuário (via sistema_clusters). Os 2 sistemas
--   de primário NULL (PSA PROJECTS, Google Chat) são org-wide e seguem visíveis
--   aos clusters vinculados (NÃO viram admin-only).
-- VER = primário ou compartilhado | EDITAR/INSERIR = dono primário | DELETE = lider+.
-- Aditivo e reversível; admin sempre bypassa.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sistema_cluster_visivel(_sistema_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.sistemas_processo sp
               WHERE sp.id = _sistema_id AND sp.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
    OR EXISTS (SELECT 1 FROM public.sistema_clusters sc
               WHERE sc.sistema_id = _sistema_id AND sc.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())));
$$;

DO $$
DECLARE pol record;
  tables text[] := ARRAY['sistemas_processo','sistema_clusters','sistema_responsaveis'];
BEGIN
  FOR pol IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename = ANY(tables) AND (qual='true' OR with_check='true')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); END LOOP;
END $$;

-- sistemas_processo (VER = primário ou compartilhado; EDITAR = primário; DELETE = lider+)
ALTER TABLE public.sistemas_processo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_member_select_sistemas_processo ON public.sistemas_processo;
DROP POLICY IF EXISTS team_member_insert_sistemas_processo ON public.sistemas_processo;
DROP POLICY IF EXISTS team_member_update_sistemas_processo ON public.sistemas_processo;
DROP POLICY IF EXISTS team_member_delete_sistemas_processo ON public.sistemas_processo;

CREATE POLICY rls_sistemas_processo_select ON public.sistemas_processo FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND ( cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))
            OR EXISTS (SELECT 1 FROM public.sistema_clusters sc
                       WHERE sc.sistema_id = sistemas_processo.id
                         AND sc.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))) ))
);
CREATE POLICY rls_sistemas_processo_insert ON public.sistemas_processo FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
);
CREATE POLICY rls_sistemas_processo_update ON public.sistemas_processo FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
);
CREATE POLICY rls_sistemas_processo_delete ON public.sistemas_processo FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
);

-- sistema_clusters (M:N — isola pelo próprio cluster_id)
ALTER TABLE public.sistema_clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_member_select_sistema_clusters ON public.sistema_clusters;
DROP POLICY IF EXISTS team_member_insert_sistema_clusters ON public.sistema_clusters;
DROP POLICY IF EXISTS team_member_update_sistema_clusters ON public.sistema_clusters;
DROP POLICY IF EXISTS team_member_delete_sistema_clusters ON public.sistema_clusters;

CREATE POLICY rls_sistema_clusters_select ON public.sistema_clusters FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))));
CREATE POLICY rls_sistema_clusters_insert ON public.sistema_clusters FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))));
CREATE POLICY rls_sistema_clusters_update ON public.sistema_clusters FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))));
CREATE POLICY rls_sistema_clusters_delete ON public.sistema_clusters FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role) AND cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))));

-- sistema_responsaveis (deriva via sistema_id -> sistema_cluster_visivel)
ALTER TABLE public.sistema_responsaveis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_member_select_sistema_responsaveis ON public.sistema_responsaveis;
DROP POLICY IF EXISTS team_member_insert_sistema_responsaveis ON public.sistema_responsaveis;
DROP POLICY IF EXISTS team_member_update_sistema_responsaveis ON public.sistema_responsaveis;
DROP POLICY IF EXISTS team_member_delete_sistema_responsaveis ON public.sistema_responsaveis;

CREATE POLICY rls_sistema_responsaveis_select ON public.sistema_responsaveis FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.sistema_cluster_visivel(sistema_id)));
CREATE POLICY rls_sistema_responsaveis_insert ON public.sistema_responsaveis FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.sistema_cluster_visivel(sistema_id)));
CREATE POLICY rls_sistema_responsaveis_update ON public.sistema_responsaveis FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.sistema_cluster_visivel(sistema_id)))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.sistema_cluster_visivel(sistema_id)));
CREATE POLICY rls_sistema_responsaveis_delete ON public.sistema_responsaveis FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role) AND public.sistema_cluster_visivel(sistema_id)));