DROP POLICY IF EXISTS rls_novidades_select_active ON public.novidades;

CREATE POLICY "novidades_select_publico"
  ON public.novidades
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);