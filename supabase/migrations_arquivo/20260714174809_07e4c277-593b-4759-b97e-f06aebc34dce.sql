
-- ============================================================================
-- RLS: incorporar filtro de soft-delete (excluido = false) nas policies
-- ============================================================================
-- Escopo: 7 tabelas com coluna `excluido`.
-- Regra: SELECT/UPDATE/DELETE ganham `excluido = false` no USING.
--        UPDATE mantém WITH CHECK sem esse filtro para permitir o próprio
--        soft-delete (UPDATE ... SET excluido = true).
--        INSERT não muda (default excluido = false).
-- ============================================================================

-- ─── cliente ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS cliente_select_scoped ON public.cliente;
CREATE POLICY cliente_select_scoped ON public.cliente
FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND cliente_visivel_para(id))
    OR (resolve_user_cliente_id(auth.uid()) = id)
  )
);

DROP POLICY IF EXISTS rls_cliente_update ON public.cliente;
CREATE POLICY rls_cliente_update ON public.cliente
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ─── contribuinte ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS contribuinte_select ON public.contribuinte;
CREATE POLICY contribuinte_select ON public.contribuinte
FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR cliente_visivel_para(cliente_id)
  )
);

DROP POLICY IF EXISTS rls_contribuinte_update ON public.contribuinte;
CREATE POLICY rls_contribuinte_update ON public.contribuinte
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ─── representante ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients can read their own representante" ON public.representante;
CREATE POLICY "Clients can read their own representante" ON public.representante
FOR SELECT
USING (excluido = false AND auth.uid() = user_id);

DROP POLICY IF EXISTS team_select_representante ON public.representante;
CREATE POLICY team_select_representante ON public.representante
FOR SELECT
USING (excluido = false AND has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ─── ordem_servico ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select ON public.ordem_servico
FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR cliente_visivel_para(id_cliente)
    OR (cluster_id IS NOT NULL AND cluster_id = ANY (resolve_user_cluster_ids(auth.uid())))
  )
);

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- ─── documento_arquivo ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "team_member+ can view documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "team_member+ can view documento_arquivo" ON public.documento_arquivo
FOR SELECT
USING (excluido = false AND has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "team_member+ can update documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "team_member+ can update documento_arquivo" ON public.documento_arquivo
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "admin can delete documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "admin can delete documento_arquivo" ON public.documento_arquivo
FOR DELETE
USING (excluido = false AND has_role(auth.uid(), 'admin'::app_role));

-- ─── correcoes_icms ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS correcoes_icms_select ON public.correcoes_icms;
CREATE POLICY correcoes_icms_select ON public.correcoes_icms
FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR can_view_contribuinte(auth.uid(), contribuinte_id)
  )
);

DROP POLICY IF EXISTS "Equipe pode atualizar correcoes ICMS" ON public.correcoes_icms;
CREATE POLICY "Equipe pode atualizar correcoes ICMS" ON public.correcoes_icms
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Lider+ pode deletar correcoes ICMS" ON public.correcoes_icms;
CREATE POLICY "Lider+ pode deletar correcoes ICMS" ON public.correcoes_icms
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'lider'::app_role));

-- ─── distribuicao_receita ──────────────────────────────────────────────────
DROP POLICY IF EXISTS distribuicao_receita_select ON public.distribuicao_receita;
CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita
FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.ordem_servico os
      WHERE os.id = distribuicao_receita.id_ordem_servico
        AND cliente_visivel_para(os.id_cliente)
    )
  )
);

DROP POLICY IF EXISTS rls_distribuicao_receita_update ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_update ON public.distribuicao_receita
FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));

DROP POLICY IF EXISTS rls_distribuicao_receita_delete ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita
FOR DELETE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role));
