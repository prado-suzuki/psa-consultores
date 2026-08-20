-- O anexo do cliente na fase de checklist: valida e grava a linha já classificada.
--
-- POR QUE UMA RPC, E NÃO O INSERT DIRETO QUE JÁ EXISTE
--
-- A policy `cliente can insert own documento_arquivo` (EDU-01) checa duas coisas:
-- `fonte = 'cliente'` e o `cliente_id`. Nenhuma coluna de vínculo é validada, e
-- isso era inofensivo enquanto o front mandava tudo nulo (o cliente jogava no
-- balde e a PSA classificava). Na fase de checklist o front passa a mandar dono e
-- tipo, e sem validação o cliente poderia:
--
--   * apontar o arquivo para pessoa ou imóvel de OUTRO cliente (a FK só garante
--     que a entidade existe, não de quem ela é);
--   * gravar `documento_tipo_id` de um documento que ninguém pediu a ele, o que
--     faria a subtração dar "recebido" e o consultor, cuja tela é só leitura,
--     acreditar. Ou seja: mentir para a PSA sem esforço.
--
-- Por isso o tipo NÃO vem do cliente: é derivado aqui, do item pedido.
--
-- O QUE ESTA FUNÇÃO RECUSA (tudo com 42501, que o PostgREST devolve como 403)
--
--   1. usuário sem cliente vinculado;
--   2. item que não é do cliente, ou cuja solicitação não está em `em_checklist`
--      (rascunho e enviada são a fase de gaveta; encerrada não recebe mais nada);
--   3. item dispensado;
--   4. grão do item que não combina com o tipo do alvo (pedir CPF apontando para
--      uma matrícula, por exemplo);
--   5. alvo que não pertence ao cliente;
--   6. par (item, alvo) marcado como "não se aplica";
--   7. item sem tipo no catálogo nem tipo avulso, que não teria como ser
--      classificado;
--   8. `gcs_uri` que não contém `/<cliente_id>/`, defesa contra anexar objeto de
--      outro cliente;
--   9. categoria `georreferenciamento`, que tem caminho próprio de ingestão.
--
-- A `anexar_documento_solicitado` (2026-07-23) fica onde está, intocada: ela
-- valida contra `checklist_cliente_item`, tabela que a frente do checklist
-- derivado deixou sem leitor. Esta é a substituta, com nome próprio, e a antiga
-- pode ser derrubada em limpeza separada.
--
-- `categoria` vem do front, e é a mesma que ele usou para montar o caminho no
-- GCS (a da gaveta do grupo, GRUPOS_DOCUMENTO em src/lib/agrupadorDocumentos.ts).
-- Não é campo de segurança: define pasta no explorador. Derivar aqui do catálogo
-- faria a linha discordar do caminho onde o binário foi realmente parar.
--
-- Reversão: DROP FUNCTION public.anexar_documento_pendencia(uuid,text,uuid,text,text,text,bigint,text,text,text);

BEGIN;

CREATE OR REPLACE FUNCTION public.anexar_documento_pendencia(
  _solicitacao_item_id uuid,
  _alvo_kind text,
  _alvo_id uuid,
  _categoria text,
  _gcs_uri text,
  _checksum text,
  _tamanho bigint,
  _mime text,
  _nome_original text,
  _ambiente text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
  v_item public.solicitacao_item%ROWTYPE;
  v_status public.osg_solicitacao_status;
  v_solicitacao uuid;
  v_tipo uuid;
  v_categoria public.osg_doc_categoria;
  v_kind_esperado text;
  v_doc_id uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'sem cliente vinculado' USING ERRCODE = '42501';
  END IF;

  SELECT i.* INTO v_item
    FROM public.solicitacao_item i
    JOIN public.solicitacao s ON s.id = i.solicitacao_id
   WHERE i.id = _solicitacao_item_id
     AND s.cliente_id = v_cliente;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento pedido nao encontrado ou sem permissao' USING ERRCODE = '42501';
  END IF;

  SELECT s.status, s.id INTO v_status, v_solicitacao
    FROM public.solicitacao s WHERE s.id = v_item.solicitacao_id;
  IF v_status <> 'em_checklist'::public.osg_solicitacao_status THEN
    RAISE EXCEPTION 'esta solicitacao nao esta na fase de checklist' USING ERRCODE = '42501';
  END IF;

  IF v_item.status <> 'ativo'::public.osg_solicitacao_item_status THEN
    RAISE EXCEPTION 'documento dispensado deste pedido' USING ERRCODE = '42501';
  END IF;

  -- O grão do item manda em que tipo de entidade o arquivo pode ser pendurado.
  v_kind_esperado := CASE v_item.granularidade
    WHEN 'pessoa_pf' THEN 'pessoa'
    WHEN 'pessoa_pj' THEN 'pessoa'
    WHEN 'matricula_rural' THEN 'matricula'
    WHEN 'matricula_urbana' THEN 'matricula'
    WHEN 'bem' THEN 'bem'
    ELSE 'cliente'
  END;
  IF _alvo_kind IS DISTINCT FROM v_kind_esperado THEN
    RAISE EXCEPTION 'entidade incompativel com o documento pedido' USING ERRCODE = '42501';
  END IF;
  IF v_kind_esperado = 'cliente' AND _alvo_id IS NOT NULL THEN
    RAISE EXCEPTION 'este documento e do cliente, nao de uma entidade' USING ERRCODE = '42501';
  END IF;
  IF v_kind_esperado <> 'cliente' AND _alvo_id IS NULL THEN
    RAISE EXCEPTION 'informe a entidade do documento' USING ERRCODE = '42501';
  END IF;

  -- O alvo tem de ser do cliente. Matrícula segue o mesmo critério das telas
  -- internas: o bem é dele, ou ele titulariza.
  IF _alvo_kind = 'pessoa' AND NOT EXISTS (
       SELECT 1 FROM public.pessoa p WHERE p.id = _alvo_id AND p.cliente_id = v_cliente) THEN
    RAISE EXCEPTION 'pessoa nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;
  IF _alvo_kind = 'bem' AND NOT EXISTS (
       SELECT 1 FROM public.bem b WHERE b.id = _alvo_id AND b.cliente_id = v_cliente) THEN
    RAISE EXCEPTION 'bem nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;
  IF _alvo_kind = 'matricula' AND NOT EXISTS (
       SELECT 1
         FROM public.matricula m
         LEFT JOIN public.bem bm ON bm.id = m.bem_id
        WHERE m.id = _alvo_id
          AND (bm.cliente_id = v_cliente
            OR EXISTS (SELECT 1 FROM public.titularidade t
                         JOIN public.pessoa tp ON tp.id = t.titular_pessoa_id
                        WHERE t.matricula_id = m.id AND tp.cliente_id = v_cliente))) THEN
    RAISE EXCEPTION 'imovel nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
       SELECT 1 FROM public.solicitacao_item_nao_aplicavel na
        WHERE na.solicitacao_item_id = _solicitacao_item_id
          AND ((_alvo_kind = 'pessoa' AND na.pessoa_id = _alvo_id)
            OR (_alvo_kind = 'bem' AND na.bem_id = _alvo_id)
            OR (_alvo_kind = 'matricula' AND na.matricula_id = _alvo_id))) THEN
    RAISE EXCEPTION 'este documento foi marcado como nao aplicavel a esta entidade'
      USING ERRCODE = '42501';
  END IF;

  -- O tipo é DERIVADO, nunca recebido: é o do catálogo, ou o avulso que nasceu do
  -- item pedido à mão (migration 20260807150000).
  SELECT COALESCE(v_item.item_padrao_id,
                  (SELECT dt.id FROM public.documento_tipo dt
                    WHERE dt.solicitacao_item_id = v_item.id AND dt.ativo LIMIT 1))
    INTO v_tipo;
  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'documento pedido sem tipo cadastrado; fale com a PSA' USING ERRCODE = '42501';
  END IF;

  v_categoria := COALESCE(NULLIF(_categoria, '')::public.osg_doc_categoria,
                          'outros'::public.osg_doc_categoria);
  IF v_categoria = 'georreferenciamento'::public.osg_doc_categoria THEN
    RAISE EXCEPTION 'documentos de georreferenciamento nao sao enviados por aqui'
      USING ERRCODE = '42501';
  END IF;

  IF position('/' || v_cliente::text || '/' IN _gcs_uri) = 0 THEN
    RAISE EXCEPTION 'arquivo nao pertence ao cliente' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.documento_arquivo (
    cliente_id, fonte, categoria, documento_tipo_id, solicitacao_id,
    pessoa_id, bem_id, matricula_id,
    nome_original, gcs_uri, checksum, mime, tamanho, status, ambiente, created_by
  ) VALUES (
    v_cliente,
    'cliente'::public.osg_doc_fonte,
    v_categoria,
    v_tipo,
    v_solicitacao,
    CASE WHEN _alvo_kind = 'pessoa' THEN _alvo_id END,
    CASE WHEN _alvo_kind = 'bem' THEN _alvo_id END,
    CASE WHEN _alvo_kind = 'matricula' THEN _alvo_id END,
    -- Ordem conferida contra a lista de colunas acima: a `anexar_documento_solicitado`
    -- de 2026-07-23 trocava `mime` com `tamanho` aqui e estourava no insert. Ela
    -- nunca foi exercitada porque a tela que a chamava saiu na EDU-27.
    _nome_original, _gcs_uri, _checksum, _mime, _tamanho,
    'ativo'::public.osg_doc_status, _ambiente, auth.uid()
  ) RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

COMMENT ON FUNCTION public.anexar_documento_pendencia(uuid,text,uuid,text,text,text,bigint,text,text,text) IS
  'Anexo do cliente na fase de checklist: grava documento_arquivo já classificado (documento_tipo_id derivado do item pedido, nunca recebido do cliente) e vinculado à entidade. Recusa item de outro cliente, solicitação fora de em_checklist, item dispensado, grão incompatível com o alvo, alvo de outro cliente, par marcado como não aplicável, item sem tipo, gcs_uri fora da pasta do cliente e categoria georreferenciamento. Substitui anexar_documento_solicitado, que validava contra checklist_cliente_item.';

REVOKE ALL ON FUNCTION public.anexar_documento_pendencia(uuid,text,uuid,text,text,text,bigint,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.anexar_documento_pendencia(uuid,text,uuid,text,text,text,bigint,text,text,text) TO authenticated;

COMMIT;
