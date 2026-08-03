BEGIN;

-- ── 1) As tabelas ───────────────────────────────────────────────────────────
alter table public.checklist_item_padrao  rename to documento_tipo;
alter table public.produto_checklist_item rename to produto_documento_tipo;

-- ── 2) A função, com o corpo de hoje e os nomes novos ───────────────────────
CREATE OR REPLACE FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    JOIN public.produto_documento_tipo pci
      ON pci.produto_segmento_id = opc.produto_segmento_id
    WHERE opc.ordem_servico_id = _ordem_servico_id
    GROUP BY pci.item_padrao_id
  ),
  alvos AS (
    SELECT i.item_padrao_id, i.obrigatorio,
           p.id AS pessoa_id, NULL::uuid AS bem_id, NULL::uuid AS matricula_id
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.pessoa p ON p.cliente_id = _cliente_id AND p.tipo_pessoa = 'PF'
    WHERE ip.granularidade = 'pessoa_pf'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           p.id, NULL::uuid, NULL::uuid
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.pessoa p ON p.cliente_id = _cliente_id AND p.tipo_pessoa = 'PJ'
    WHERE ip.granularidade = 'pessoa_pj'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, b.id, NULL::uuid
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
    JOIN public.bem b ON b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'bem'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, m.id
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
    CROSS JOIN public.matricula m
    JOIN public.bem b ON b.id = m.bem_id AND b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'matricula_rural'
      AND (COALESCE(m.tipo_bem, b.tipo_bem) = 'IR' OR COALESCE(m.tipo_bem, b.tipo_bem) IS NULL)
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, m.id
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
    CROSS JOIN public.matricula m
    JOIN public.bem b ON b.id = m.bem_id AND b.cliente_id = _cliente_id
    WHERE ip.granularidade = 'matricula_urbana'
      AND COALESCE(m.tipo_bem, b.tipo_bem) IS NOT NULL
      AND COALESCE(m.tipo_bem, b.tipo_bem) <> 'IR'
    UNION ALL
    SELECT i.item_padrao_id, i.obrigatorio,
           NULL::uuid, NULL::uuid, NULL::uuid
    FROM itens i
    JOIN public.documento_tipo ip ON ip.id = i.item_padrao_id AND ip.ativo
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
    JOIN public.documento_tipo ip ON ip.id = a.item_padrao_id
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
$function$;

REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) TO authenticated;

-- ── 3) O que o RENAME arrasta com o nome velho ──────────────────────────────

-- gatilhos
alter trigger trg_chk_padrao_updated_at            on public.documento_tipo         rename to trg_documento_tipo_updated_at;
alter trigger trg_produto_checklist_item_updated_at on public.produto_documento_tipo rename to trg_produto_documento_tipo_updated_at;

-- constraints
alter table public.documento_tipo         rename constraint checklist_item_padrao_pkey                      to documento_tipo_pkey;
alter table public.documento_tipo         rename constraint checklist_item_padrao_codigo_key                to documento_tipo_codigo_key;
alter table public.produto_documento_tipo rename constraint produto_checklist_item_pkey                     to produto_documento_tipo_pkey;
alter table public.produto_documento_tipo rename constraint produto_checklist_item_unq                      to produto_documento_tipo_unq;
alter table public.produto_documento_tipo rename constraint produto_checklist_item_item_padrao_id_fkey      to produto_documento_tipo_item_padrao_id_fkey;
alter table public.produto_documento_tipo rename constraint produto_checklist_item_produto_segmento_id_fkey to produto_documento_tipo_produto_segmento_id_fkey;

-- índice solto
alter index idx_produto_checklist_item_padrao rename to idx_produto_documento_tipo_item;

-- policies
alter policy "team_member+ can view checklist_item_padrao"   on public.documento_tipo         rename to "team_member+ can view documento_tipo";
alter policy "team_member+ can write checklist_item_padrao"  on public.documento_tipo         rename to "team_member+ can write documento_tipo";
alter policy "team_member+ can view produto_checklist_item"  on public.produto_documento_tipo rename to "team_member+ can view produto_documento_tipo";
alter policy "sublider+ can insert produto_checklist_item"   on public.produto_documento_tipo rename to "sublider+ can insert produto_documento_tipo";
alter policy "sublider+ can update produto_checklist_item"   on public.produto_documento_tipo rename to "sublider+ can update produto_documento_tipo";
alter policy "sublider+ can delete produto_checklist_item"   on public.produto_documento_tipo rename to "sublider+ can delete produto_documento_tipo";

COMMIT;