-- Alinha as RLS do cadastro de clientes com a matriz de alcadas aprovada em
-- 11/09/2026.
--
-- Decisoes aplicadas nesta migration:
--   1. OS, rateios e produtos contratados passam a exigir `lider` ou acima
--      para ler, criar, alterar e excluir. A leitura continua por cluster.
--   2. Proposta comercial passa a exigir `lider` ou acima para ler, anexar,
--      alterar e excluir. As outras categorias de `documento_arquivo` mantem
--      as permissoes atuais de `team_member` ou acima.
--   3. A leitura de representante passa a seguir o cluster do cliente.
--   4. As funcoes SECURITY DEFINER de exclusao logica de cliente e
--      contribuinte passam a conferir o cluster por dentro.
--   5. O historico do cadastro passa a recortar por cluster os logs de
--      cliente, contribuinte, representante e ordem de servico. Os outros
--      tipos de audit_logs conservam a regra atual.
--
-- Faturamento nao tem tabela nem escrita propria: a aba e uma leitura derivada
-- de contribuinte e OS. Ele acompanha a nova permissao da OS sem DDL adicional.
--
-- Esta migration NAO altera a visibilidade das abas nem o botao Excluir da
-- lista. Esses guardas sao de front. Ela altera somente as autorizacoes do
-- banco e nao muda o schema tipado.
--
-- Idempotencia: toda policy usa `drop policy if exists` + `create policy`; as
-- funcoes usam `create or replace function`; grants sao reemitidos.

-- ---------------------------------------------------------------------------
-- 1. Ordem de servico e filhos: leitura e gravacao so para lider ou acima
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select ON public.ordem_servico
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
      AND (
        public.cliente_visivel_para(id_cliente)
        OR (
          cluster_id IS NOT NULL
          AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
        )
      )
    )
  );

DROP POLICY IF EXISTS rls_ordem_servico_insert ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS distribuicao_receita_select ON public.distribuicao_receita;
CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
      AND EXISTS (
        SELECT 1
          FROM public.ordem_servico os
         WHERE os.id = distribuicao_receita.id_ordem_servico
           AND public.cliente_visivel_para(os.id_cliente)
      )
    )
  );

DROP POLICY IF EXISTS rls_distribuicao_receita_insert ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_insert ON public.distribuicao_receita
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_distribuicao_receita_update ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_update ON public.distribuicao_receita
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_distribuicao_receita_delete ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS os_produtos_contratados_select ON public.os_produtos_contratados;
CREATE POLICY os_produtos_contratados_select ON public.os_produtos_contratados
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
      AND EXISTS (
        SELECT 1
          FROM public.ordem_servico os
         WHERE os.id = os_produtos_contratados.ordem_servico_id
           AND public.cliente_visivel_para(os.id_cliente)
      )
    )
  );

DROP POLICY IF EXISTS rls_os_produtos_contratados_insert ON public.os_produtos_contratados;
CREATE POLICY rls_os_produtos_contratados_insert ON public.os_produtos_contratados
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_os_produtos_contratados_update ON public.os_produtos_contratados;
CREATE POLICY rls_os_produtos_contratados_update ON public.os_produtos_contratados
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

DROP POLICY IF EXISTS rls_os_produtos_contratados_delete ON public.os_produtos_contratados;
CREATE POLICY rls_os_produtos_contratados_delete ON public.os_produtos_contratados
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
  );

-- ---------------------------------------------------------------------------
-- 2. Proposta comercial: lider ou acima, sem afetar os demais documentos
-- ---------------------------------------------------------------------------

-- As policies antigas eram globais para documento_arquivo. Elas continuam
-- valendo para as outras categorias e deixam proposta_comercial para as
-- policies especificas logo abaixo.
DROP POLICY IF EXISTS "team_member+ can view documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "team_member+ can view documento_arquivo" ON public.documento_arquivo
  FOR SELECT TO authenticated
  USING (
    excluido = false
    AND categoria <> 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS "team_member+ can insert documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "team_member+ can insert documento_arquivo" ON public.documento_arquivo
  FOR INSERT TO authenticated
  WITH CHECK (
    categoria <> 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS "team_member+ can update documento_arquivo" ON public.documento_arquivo;
CREATE POLICY "team_member+ can update documento_arquivo" ON public.documento_arquivo
  FOR UPDATE TO authenticated
  USING (
    excluido = false
    AND categoria <> 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    categoria <> 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS "lider+ can view proposta_comercial" ON public.documento_arquivo;
CREATE POLICY "lider+ can view proposta_comercial" ON public.documento_arquivo
  FOR SELECT TO authenticated
  USING (
    excluido = false
    AND categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS "lider+ can view deleted proposta_comercial" ON public.documento_arquivo;
CREATE POLICY "lider+ can view deleted proposta_comercial" ON public.documento_arquivo
  FOR SELECT TO authenticated
  USING (
    excluido = true
    AND categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS "lider+ can insert proposta_comercial" ON public.documento_arquivo;
CREATE POLICY "lider+ can insert proposta_comercial" ON public.documento_arquivo
  FOR INSERT TO authenticated
  WITH CHECK (
    categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS "lider+ can update proposta_comercial" ON public.documento_arquivo;
CREATE POLICY "lider+ can update proposta_comercial" ON public.documento_arquivo
  FOR UPDATE TO authenticated
  USING (
    excluido = false
    AND categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  )
  WITH CHECK (
    categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS "lider+ can delete proposta_comercial" ON public.documento_arquivo;
CREATE POLICY "lider+ can delete proposta_comercial" ON public.documento_arquivo
  FOR DELETE TO authenticated
  USING (
    categoria = 'proposta_comercial'::public.osg_doc_categoria
    AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

-- ---------------------------------------------------------------------------
-- 3. Representante: a leitura volta a ser o portao do cluster
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS team_select_representante ON public.representante;
CREATE POLICY team_select_representante ON public.representante
  FOR SELECT TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(id_cliente)
  );

-- ---------------------------------------------------------------------------
-- 4. Soft delete: SECURITY DEFINER precisa conferir o cluster por dentro
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_contribuinte(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM public.contribuinte ct
   WHERE ct.id = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM public.contribuinte ct
   WHERE ct.id = ANY (_ids)
     AND (
       public.has_role(v_uid, 'admin'::public.app_role)
       OR (
         ct.excluido = false
         AND public.has_role_or_higher(v_uid, 'sublider'::public.app_role)
         AND public.cliente_visivel_para(ct.cliente_id)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Contribuinte nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % contribuinte(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.contribuinte ct
     SET excluido = true
   WHERE ct.id = ANY (_ids)
     AND ct.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_cliente(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM public.cliente cl
   WHERE cl.id = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM public.cliente cl
   WHERE cl.id = ANY (_ids)
     AND (
       public.has_role(v_uid, 'admin'::public.app_role)
       OR (
         cl.excluido = false
         AND public.has_role_or_higher(v_uid, 'sublider'::public.app_role)
         AND public.cliente_visivel_para(cl.id)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Cliente nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % cliente(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.cliente cl
     SET excluido = true
   WHERE cl.id = ANY (_ids)
     AND cl.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_cliente(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_cliente(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_cliente(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_cliente(uuid[]) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Historico do cadastro: associa cada log conhecido ao cliente de origem
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_log_cliente_id(
  _entity_type text,
  _entity_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE _entity_type
    WHEN 'cliente' THEN (
      SELECT cl.id
        FROM public.cliente cl
       WHERE cl.id = _entity_id
    )
    WHEN 'contribuinte' THEN coalesce(
      (SELECT ct.cliente_id FROM public.contribuinte ct WHERE ct.id = _entity_id),
      (SELECT cl.id FROM public.cliente cl WHERE cl.id = _entity_id)
    )
    WHEN 'representante' THEN coalesce(
      (SELECT r.id_cliente FROM public.representante r WHERE r.id_representante = _entity_id),
      (SELECT cl.id FROM public.cliente cl WHERE cl.id = _entity_id)
    )
    WHEN 'ordem_servico' THEN coalesce(
      (SELECT os.id_cliente FROM public.ordem_servico os WHERE os.id = _entity_id),
      (SELECT cl.id FROM public.cliente cl WHERE cl.id = _entity_id)
    )
    ELSE NULL
  END;
$function$;

REVOKE ALL ON FUNCTION public.audit_log_cliente_id(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_log_cliente_id(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.audit_log_cliente_id(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_cliente_id(text, uuid) TO service_role;

COMMENT ON FUNCTION public.audit_log_cliente_id(text, uuid) IS
  'Resolve o cliente de logs do cadastro para a RLS por cluster. O fallback para cliente cobre logs de criacao que registram temporariamente o id do cliente como entity_id da linha filha.';

DROP POLICY IF EXISTS rls_audit_logs_select ON public.audit_logs;
CREATE POLICY rls_audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR entity_type NOT IN (
        'cliente',
        'contribuinte',
        'representante',
        'ordem_servico'
      )
      OR public.cliente_visivel_para(
        public.audit_log_cliente_id(entity_type, entity_id)
      )
    )
  );
