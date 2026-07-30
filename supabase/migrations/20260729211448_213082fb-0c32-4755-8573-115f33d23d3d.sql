BEGIN;

CREATE OR REPLACE FUNCTION public.gerar_solicitacao_os(
  _cliente_id uuid,
  _ordem_servico_id uuid
) RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_criados integer;
BEGIN
  IF NOT public.cliente_visivel_para(_cliente_id) THEN
    RAISE EXCEPTION 'cliente fora do seu escopo' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = _ordem_servico_id
      AND os.id_cliente = _cliente_id
      AND os.excluido = false
  ) THEN
    RAISE EXCEPTION 'ordem de servico nao encontrada para este cliente' USING ERRCODE = '42501';
  END IF;

  WITH itens AS (
    SELECT pci.item_padrao_id, bool_or(pci.obrigatorio) AS obrigatorio
    FROM public.os_produtos_contratados opc
    JOIN public.produto_checklist_item pci
      ON pci.produto_segmento_id = opc.produto_segmento_id
    WHERE opc.ordem_servico_id = _ordem_servico_id
    GROUP BY pci.item_padrao_id
  ),
  alvos AS (
    SELECT i.item_padrao_id, i.obrigatorio,
           p.id AS pessoa_id, NULL::uuid AS bem_id, NULL::uuid AS matricula_id
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.pessoa p ON p.cliente_id = _cliente_id AND p.tipo_pessoa = 'PF'
    WHERE ip.granularidade = 'pessoa_pf'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           p.id, NULL::uuid, NULL::uuid
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.pessoa p ON p.cliente_id = _cliente_id AND p.tipo_pessoa = 'PJ'
    WHERE ip.granularidade = 'pessoa_pj'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, b.id, NULL::uuid
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.bem b ON b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'bem'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, m.id
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    CROSS JOIN public.matricula m
    JOIN public.bem b ON b.id = m.bem_id AND b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'matricula_rural'
      AND (COALESCE(m.tipo_bem, b.tipo_bem) = 'IR' OR COALESCE(m.tipo_bem, b.tipo_bem) IS NULL)
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, m.id
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    CROSS JOIN public.matricula m
    JOIN public.bem b ON b.id = m.bem_id AND b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'matricula_urbana'
      AND COALESCE(m.tipo_bem, b.tipo_bem) IS NOT NULL
      AND COALESCE(m.tipo_bem, b.tipo_bem) <> 'IR'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, NULL::uuid
    FROM itens i
    JOIN public.checklist_item_padrao ip ON ip.id = i.item_padrao_id AND ip.ativo
    WHERE ip.granularidade NOT IN ('pessoa_pf','pessoa_pj','bem','matricula_rural','matricula_urbana')
  ),
  novos AS (
    INSERT INTO public.checklist_cliente_item (
      cliente_id, item_padrao_id, modulo, entidade, documento, nota,
      categoria, categoria_docbox, confidencial, obrigatorio,
      origem, status, pessoa_id, bem_id, matricula_id
    )
    SELECT _cliente_id, a.item_padrao_id, ip.modulo, ip.entidade, ip.documento, ip.nota,
           ip.categoria, ip.categoria_docbox, ip.confidencial, a.obrigatorio,
           'padrao'::public.osg_checklist_origem,
           'solicitado'::public.osg_checklist_status,
           a.pessoa_id, a.bem_id, a.matricula_id
    FROM alvos a
    JOIN public.checklist_item_padrao ip ON ip.id = a.item_padrao_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.checklist_cliente_item c
      WHERE c.cliente_id     = _cliente_id
        AND c.item_padrao_id = a.item_padrao_id
        AND c.pessoa_id      IS NOT DISTINCT FROM a.pessoa_id
        AND c.bem_id         IS NOT DISTINCT FROM a.bem_id
        AND c.matricula_id   IS NOT DISTINCT FROM a.matricula_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_criados FROM novos;

  RETURN v_criados;
END;
$$;

COMMENT ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) IS
  'Cria em checklist_cliente_item os documentos exigidos pelos produtos da OS, com origem=padrao e status=solicitado. Uma linha por item x entidade cadastrada conforme a granularidade. Idempotente: so insere o que falta, nunca atualiza nem apaga.';

REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) TO authenticated;

COMMIT;