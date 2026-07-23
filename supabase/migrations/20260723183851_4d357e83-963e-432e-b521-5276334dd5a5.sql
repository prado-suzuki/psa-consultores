DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'anexar_documento_solicitado'
  LOOP
    IF r.args <> 'uuid, text, text, bigint, text, text, text' THEN
      EXECUTE format('DROP FUNCTION public.anexar_documento_solicitado(%s)', r.args);
    END IF;
  END LOOP;
END $$;

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