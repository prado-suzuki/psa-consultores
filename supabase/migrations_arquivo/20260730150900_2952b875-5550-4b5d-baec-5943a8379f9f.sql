CREATE OR REPLACE VIEW public.cobertura_documentos_cliente
WITH (security_invoker = on) AS
SELECT
  i.cliente_id,
  i.id AS checklist_item_id,
  CASE
    WHEN i.pessoa_id IS NOT NULL AND p.tipo_pessoa = 'PJ' THEN 'pessoa_pj'
    WHEN i.pessoa_id IS NOT NULL                          THEN 'pessoa_pf'
    WHEN i.matricula_id IS NOT NULL                       THEN 'matricula'
    WHEN i.bem_id IS NOT NULL                             THEN 'bem'
    ELSE 'cliente'
  END AS entidade_tipo,
  COALESCE(i.pessoa_id, i.matricula_id, i.bem_id) AS entidade_id,
  COALESCE(
    p.denominacao,
    CASE WHEN m.id IS NOT NULL
         THEN 'Matrícula ' || m.numero || ' (' || m.municipio_imovel || '/' || m.uf_imovel || ')'
    END,
    CASE WHEN b.id IS NOT NULL
         THEN COALESCE(NULLIF(concat_ws(' — ', b.referencia_dp, b.denominacao), ''), 'Bem')
    END,
    'Cliente'
  ) AS entidade_rotulo,
  i.entidade AS entidade_catalogo,
  i.modulo,
  i.documento,
  i.categoria,
  i.obrigatorio,
  i.status,
  (
    SELECT count(*)
    FROM public.documento_arquivo d
    WHERE d.checklist_item_id = i.id
      AND d.excluido = false
      AND d.status = 'ativo'::public.osg_doc_status
  )::integer AS arquivos_vinculados
FROM public.checklist_cliente_item i
LEFT JOIN public.pessoa    p ON p.id = i.pessoa_id
LEFT JOIN public.bem       b ON b.id = i.bem_id
LEFT JOIN public.matricula m ON m.id = i.matricula_id;

COMMENT ON VIEW public.cobertura_documentos_cliente IS
  'Matriz de cobertura: um registro por documento solicitado, com a contagem de arquivos vinculados; linha com zero é o buraco e ausência de linha significa documento não solicitado para aquela entidade.';

GRANT SELECT ON public.cobertura_documentos_cliente TO authenticated;