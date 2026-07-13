-- cliente.SELECT
DROP POLICY IF EXISTS "team_select_cliente" ON public.cliente;
CREATE POLICY "cliente_select_scoped"
ON public.cliente
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND public.cliente_visivel_para(cliente.id)
  )
  OR public.resolve_user_cliente_id(auth.uid()) = cliente.id
);

-- centros_custo.SELECT
DROP POLICY IF EXISTS "Authenticated users can read centros_custo" ON public.centros_custo;
CREATE POLICY "centros_custo_select_internal"
ON public.centros_custo
FOR SELECT
TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));