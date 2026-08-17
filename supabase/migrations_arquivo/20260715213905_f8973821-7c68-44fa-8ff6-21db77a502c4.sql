-- RLS-P1-05 — projeto_justificativas: UPDATE e DELETE por checagem real
-- SELECT já restrito (projeto_justificativas_select, 09/07). Aqui só UPDATE/DELETE.
-- Cluster deriva de projeto_id -> projects.cluster_id (sem coluna própria).
-- UPDATE = team_member+ no cluster do projeto (espelha o SELECT).
-- DELETE = lider+ no cluster do projeto (endurecido). Admin bypassa.
-- Aditivo e reversível.

-- limpeza defensiva de USING(true)/WITH CHECK(true)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='projeto_justificativas' AND (qual='true' OR with_check='true')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.projeto_justificativas', pol.policyname); END LOOP;
END $$;

DROP POLICY IF EXISTS team_member_update_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS team_member_delete_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_update ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_delete ON public.projeto_justificativas;

CREATE POLICY projeto_justificativas_update ON public.projeto_justificativas FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
                  AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
                  AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))))
);

CREATE POLICY projeto_justificativas_delete ON public.projeto_justificativas FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'lider'::app_role)
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
                  AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))))
);