
-- Root cause: em UPDATE, a USING da SELECT policy é reaplicada como implicit WITH CHECK
-- sobre a NOVA linha (Postgres garante que o usuário continue enxergando a linha após update).
-- Como ordem_servico_select tinha (excluido = false), setar excluido=true violava a policy.
-- Fix: ampliar o SELECT para admin enxergar linhas excluídas também.

DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select
  ON public.ordem_servico
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      excluido = false
      AND (
        cliente_visivel_para(id_cliente)
        OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid())))
      )
    )
  );

-- Remove policies que criei enquanto investigava (a UPDATE original já cobre admin via 'sublider').
DROP POLICY IF EXISTS rls_ordem_servico_update_admin ON public.ordem_servico;
DROP POLICY IF EXISTS debug_admin_uncond ON public.ordem_servico;
