
-- EDU-03: RPCs para envio classificado pelo cliente via checklist

-- (a) Leitura: checklist do próprio cliente
CREATE OR REPLACE FUNCTION public.get_checklist_solicitado_cliente()
RETURNS TABLE (
  item_id uuid,
  documento text,
  entidade text,
  categoria text,
  categoria_docbox text,
  nota text,
  confidencial boolean,
  rotulo_instancia text,
  recebido boolean,
  arquivo_nome text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    i.id,
    i.documento,
    i.entidade,
    i.categoria::text,
    i.categoria_docbox,
    i.nota,
    i.confidencial,
    COALESCE(
      p.denominacao,
      b.denominacao,
      CASE WHEN m.id IS NOT NULL
           THEN 'Matrícula ' || m.numero || ' (' || m.municipio_imovel || '/' || m.uf_imovel || ')'
      END
    ) AS rotulo_instancia,
    (
      i.status = 'recebido'::public.osg_checklist_status
      OR EXISTS (
        SELECT 1 FROM public.documento_arquivo d
        WHERE d.checklist_item_id = i.id
          AND d.excluido = false
          AND d.status = 'ativo'::public.osg_doc_status
      )
    ) AS recebido,
    (SELECT d.nome_original FROM public.documento_arquivo d
      WHERE d.checklist_item_id = i.id
        AND d.excluido = false
        AND d.status = 'ativo'::public.osg_doc_status
        AND d.fonte = 'cliente'::public.osg_doc_fonte
      ORDER BY d.created_at DESC
      LIMIT 1) AS arquivo_nome
  FROM public.checklist_cliente_item i
  LEFT JOIN public.pessoa    p ON p.id = i.pessoa_id
  LEFT JOIN public.bem       b ON b.id = i.bem_id
  LEFT JOIN public.matricula m ON m.id = i.matricula_id
  WHERE i.cliente_id = public.resolve_user_cliente_id(auth.uid())
    AND i.status NOT IN ('dispensado'::public.osg_checklist_status, 'nao_aplicavel'::public.osg_checklist_status)
  ORDER BY i.entidade, i.documento;
$$;

REVOKE ALL ON FUNCTION public.get_checklist_solicitado_cliente() FROM public;
GRANT EXECUTE ON FUNCTION public.get_checklist_solicitado_cliente() TO authenticated;

-- (b) Gravação: anexa upload já finalizado a um item solicitado
CREATE OR REPLACE FUNCTION public.anexar_documento_solicitado(
  _item_id uuid,
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
  v_item public.checklist_cliente_item%ROWTYPE;
  v_doc_id uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'sem cliente vinculado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item FROM public.checklist_cliente_item WHERE id = _item_id;
  IF NOT FOUND OR v_item.cliente_id <> v_cliente THEN
    RAISE EXCEPTION 'item de checklist nao encontrado ou sem permissao' USING ERRCODE = '42501';
  END IF;

  IF v_item.status IN ('dispensado'::public.osg_checklist_status, 'nao_aplicavel'::public.osg_checklist_status) THEN
    RAISE EXCEPTION 'item indisponivel para envio' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(v_item.categoria::text, '') = 'georreferenciamento' THEN
    RAISE EXCEPTION 'documentos de georreferenciamento nao sao enviados por aqui' USING ERRCODE = '42501';
  END IF;

  -- Defesa: chave do GCS deve conter /<cliente_id>/
  IF position('/' || v_cliente::text || '/' IN _gcs_uri) = 0 THEN
    RAISE EXCEPTION 'arquivo nao pertence ao cliente' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.documento_arquivo (
    cliente_id, fonte, categoria, pessoa_id, bem_id, matricula_id, checklist_item_id,
    nome_original, gcs_uri, checksum, mime, tamanho, status, ambiente, created_by
  ) VALUES (
    v_cliente,
    'cliente'::public.osg_doc_fonte,
    COALESCE(v_item.categoria, 'outros'::public.osg_doc_categoria),
    v_item.pessoa_id, v_item.bem_id, v_item.matricula_id, v_item.id,
    _nome_original, _gcs_uri, _checksum, _tamanho, _mime,
    'ativo'::public.osg_doc_status, _ambiente, auth.uid()
  ) RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

REVOKE ALL ON FUNCTION public.anexar_documento_solicitado(uuid,text,text,bigint,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.anexar_documento_solicitado(uuid,text,text,bigint,text,text,text) TO authenticated;
