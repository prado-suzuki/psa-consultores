
-- Escape admin para UPDATE em ordem_servico.
-- Contexto: o WITH CHECK atual da rls_ordem_servico_update é apenas has_role_or_higher('sublider'),
-- mas empiricamente o UPDATE que altera `excluido=true` estava falhando com 42501 para admin
-- (verificado via sessão simulada da Patricia). Uma policy PERMISSIVE adicional, com USING/WITH CHECK
-- puramente admin, garante o bypass sem tocar na policy validada.

CREATE POLICY rls_ordem_servico_update_admin
  ON public.ordem_servico
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
