-- ============================================================================
-- RLS-P1-03 — Módulo Melhorias: isolamento por cluster
-- Mesmo padrão de RLS-P1-01 (Processos) e RLS-P1-02 (Gargalos), 14/07.
-- Pai: process_improvements (cluster_id direto) | Filhas: via melhoria_id.
-- Decisão A (Eduardo, 15/07): cluster_id NULL (5 melhorias de teste do DIFAL)
--   sem ramo de exceção -> admin-only. SELECT/INSERT/UPDATE=team_member+; DELETE=lider+.
-- Aditivo e reversível; admin sempre bypassa.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.melhoria_cluster_visivel(_melhoria_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.process_improvements pi
        WHERE pi.id = _melhoria_id
          AND pi.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;

-- Limpeza defensiva: derrubar qualquer USING(true)/WITH CHECK(true) remanescente
DO $$
DECLARE pol record;
  tables text[] := ARRAY['process_improvements','melhoria_processos','melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'];
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename = ANY(tables)
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- PAI: process_improvements (cluster_id direto)
DROP POLICY IF EXISTS "Team members can view improvements"  ON public.process_improvements;
DROP POLICY IF EXISTS "Team members can manage improvements" ON public.process_improvements;

ALTER TABLE public.process_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_process_improvements_select ON public.process_improvements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))));

CREATE POLICY rls_process_improvements_insert ON public.process_improvements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))));

CREATE POLICY rls_process_improvements_update ON public.process_improvements FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))));

CREATE POLICY rls_process_improvements_delete ON public.process_improvements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role) AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))));

-- FILHAS: derivam o cluster via melhoria_id -> process_improvements
DO $$
DECLARE t text;
  tables text[] := ARRAY['melhoria_processos','melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS team_member_select_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS team_member_insert_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS team_member_update_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS team_member_delete_%1$s ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY rls_%1$s_select ON public.%1$I FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.melhoria_cluster_visivel(melhoria_id)));

      CREATE POLICY rls_%1$s_insert ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.melhoria_cluster_visivel(melhoria_id)));

      CREATE POLICY rls_%1$s_update ON public.%1$I FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.melhoria_cluster_visivel(melhoria_id)))
      WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.melhoria_cluster_visivel(melhoria_id)));

      CREATE POLICY rls_%1$s_delete ON public.%1$I FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(),'lider'::app_role) AND public.melhoria_cluster_visivel(melhoria_id)));
    $f$, t);
  END LOOP;
END $$;