-- EDU-01: policies aditivas para o portal do cliente em public.documento_arquivo.
-- Não altera nem remove as policies existentes de team_member+/admin.

DROP POLICY IF EXISTS "cliente can view own documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "cliente can view own documento_arquivo"
ON public.documento_arquivo
FOR SELECT
TO authenticated
USING (
  fonte = 'cliente'
  AND excluido = false
  AND cliente_id = public.resolve_user_cliente_id(auth.uid())
);

DROP POLICY IF EXISTS "cliente can insert own documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "cliente can insert own documento_arquivo"
ON public.documento_arquivo
FOR INSERT
TO authenticated
WITH CHECK (
  fonte = 'cliente'
  AND cliente_id = public.resolve_user_cliente_id(auth.uid())
);