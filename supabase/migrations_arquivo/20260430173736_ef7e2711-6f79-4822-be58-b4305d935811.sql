CREATE POLICY "sublider_or_higher_manage_cliente_clusters"
ON public.cliente_clusters
FOR ALL
TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS sublider_select_cliente_clusters ON public.cliente_clusters;