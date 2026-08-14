-- RLS-P1-06 (correção) — projeto_justificativas: fechar SELECT e INSERT

-- SELECT
DROP POLICY IF EXISTS team_member_select_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_select ON public.projeto_justificativas;
CREATE POLICY projeto_justificativas_select ON public.projeto_justificativas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
             AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))))
);

-- INSERT
DROP POLICY IF EXISTS team_member_insert_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_insert ON public.projeto_justificativas;
CREATE POLICY projeto_justificativas_insert ON public.projeto_justificativas FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
                  AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))))
);