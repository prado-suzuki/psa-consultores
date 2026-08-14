
-- TEMP DEBUG: policy incondicional para admin em ordem_servico.
-- Se essa fizer o soft-delete passar, o problema é a avaliação de has_role() dentro de WITH CHECK.
-- Se falhar mesmo assim, algo mais está em jogo.
DROP POLICY IF EXISTS debug_admin_uncond ON public.ordem_servico;
CREATE POLICY debug_admin_uncond
  ON public.ordem_servico
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
