-- Allow clients to read their own representante row
CREATE POLICY "Clients can read their own representante"
ON public.representante
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow clients to read cliente_clusters of their own cliente
CREATE POLICY "Clients can read their cliente_clusters"
ON public.cliente_clusters
FOR SELECT
TO authenticated
USING (
  cliente_id IN (
    SELECT id_cliente FROM public.representante
    WHERE user_id = auth.uid() AND excluido = false
  )
);