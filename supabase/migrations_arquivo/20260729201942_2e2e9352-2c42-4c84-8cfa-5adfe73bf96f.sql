-- (A) Único hit fora do padrão admin nas 8 tabelas: cliente_clusters.sublider_or_higher_manage_own_cluster_links
-- Regra única: prefixar escape de admin, preservando expressão original palavra por palavra.
DROP POLICY IF EXISTS "sublider_or_higher_manage_own_cluster_links" ON public.cliente_clusters;

CREATE POLICY "sublider_or_higher_manage_own_cluster_links"
  ON public.cliente_clusters
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND (cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (has_role_or_higher(auth.uid(), 'sublider'::app_role) AND (cluster_id = ANY (resolve_user_cluster_ids(auth.uid()))))
  );