CREATE OR REPLACE FUNCTION public.get_pendencias_documentos_cliente()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cli AS (
    SELECT public.resolve_user_cliente_id(auth.uid()) AS id
  ),
  sol AS (
    SELECT s.id, s.status, s.enviada_em, s.encerrada_em
      FROM public.solicitacao s
      CROSS JOIN cli
     WHERE s.cliente_id = cli.id
       AND s.status IN ('em_checklist'::public.osg_solicitacao_status,
                        'encerrada'::public.osg_solicitacao_status)
     ORDER BY (s.status = 'em_checklist'::public.osg_solicitacao_status) DESC,
              COALESCE(s.encerrada_em, s.enviada_em, s.created_at) DESC
     LIMIT 1
  ),
  inst AS (
    SELECT 'pessoa'::text AS kind,
           p.id,
           p.denominacao AS nome,
           NULL::text AS detalhe,
           CASE WHEN p.tipo_pessoa = 'PJ' THEN 'pessoa_pj' ELSE 'pessoa_pf' END AS grao
      FROM public.pessoa p
      CROSS JOIN cli
     WHERE p.cliente_id = cli.id
    UNION ALL
    SELECT 'bem',
           b.id,
           NULLIF(CONCAT_WS(' · ', NULLIF(b.referencia_dp, ''), NULLIF(b.denominacao, '')), ''),
           NULL,
           'bem'
      FROM public.bem b
      CROSS JOIN cli
     WHERE b.cliente_id = cli.id
    UNION ALL
    SELECT 'matricula',
           m.id,
           COALESCE(NULLIF(bm.denominacao, ''), NULLIF(bm.referencia_dp, ''), 'Matrícula ' || m.numero),
           CASE WHEN COALESCE(NULLIF(bm.denominacao, ''), NULLIF(bm.referencia_dp, '')) IS NOT NULL
                THEN 'Matrícula ' || m.numero END,
           CASE WHEN m.tipo_bem = 'IR' THEN 'matricula_rural' ELSE 'matricula_urbana' END
      FROM public.matricula m
      LEFT JOIN public.bem bm ON bm.id = m.bem_id
      CROSS JOIN cli
     WHERE bm.cliente_id = cli.id
        OR EXISTS (SELECT 1
                     FROM public.titularidade t
                     JOIN public.pessoa tp ON tp.id = t.titular_pessoa_id
                    WHERE t.matricula_id = m.id
                      AND tp.cliente_id = cli.id)
    UNION ALL
    SELECT 'cliente', NULL::uuid, 'Documentos gerais', NULL, 'cliente' FROM cli
  ),
  itens AS (
    SELECT i.id,
           COALESCE(i.item_padrao_id, av.id) AS documento_tipo_id,
           i.grupo,
           COALESCE(i.documento, t.documento) AS documento,
           COALESCE(i.nota, t.nota) AS nota,
           i.granularidade,
           i.ordem
      FROM public.solicitacao_item i
      JOIN sol ON sol.id = i.solicitacao_id
      LEFT JOIN public.documento_tipo t ON t.id = i.item_padrao_id
      LEFT JOIN public.documento_tipo av ON av.solicitacao_item_id = i.id AND av.ativo
     WHERE i.status = 'ativo'::public.osg_solicitacao_item_status
  ),
  arq AS (
    SELECT da.id,
           da.nome_original,
           da.created_at,
           da.fonte,
           da.documento_tipo_id,
           CASE WHEN da.pessoa_id IS NOT NULL THEN 'pessoa'
                WHEN da.bem_id IS NOT NULL THEN 'bem'
                WHEN da.matricula_id IS NOT NULL THEN 'matricula'
                ELSE 'cliente' END AS kind,
           COALESCE(da.pessoa_id, da.bem_id, da.matricula_id) AS alvo_id
      FROM public.documento_arquivo da
      CROSS JOIN cli
     WHERE da.cliente_id = cli.id
       AND da.excluido = false
       AND da.status = 'ativo'::public.osg_doc_status
       AND da.documento_tipo_id IS NOT NULL
  ),
  linhas AS (
    SELECT it.id AS solicitacao_item_id,
           it.documento_tipo_id,
           it.grupo,
           it.documento,
           it.nota,
           it.granularidade,
           it.ordem,
           inst.kind,
           inst.id AS alvo_id,
           inst.nome,
           inst.detalhe,
           a.arquivos_cliente,
           a.tem_arquivo,
           a.tem_interno
      FROM itens it
      JOIN inst ON inst.grao = it.granularidade
      LEFT JOIN LATERAL (
        SELECT COALESCE(
                 JSONB_AGG(JSONB_BUILD_OBJECT('id', x.id, 'nome', x.nome_original)
                           ORDER BY x.created_at)
                 FILTER (WHERE x.fonte = 'cliente'::public.osg_doc_fonte),
                 '[]'::jsonb) AS arquivos_cliente,
               COUNT(*) > 0 AS tem_arquivo,
               COALESCE(BOOL_OR(x.fonte <> 'cliente'::public.osg_doc_fonte), false) AS tem_interno
          FROM arq x
         WHERE x.documento_tipo_id = it.documento_tipo_id
           AND x.kind = inst.kind
           AND x.alvo_id IS NOT DISTINCT FROM inst.id
      ) a ON true
     WHERE NOT EXISTS (
             SELECT 1
               FROM public.solicitacao_item_nao_aplicavel na
              WHERE na.solicitacao_item_id = it.id
                AND ((inst.kind = 'pessoa' AND na.pessoa_id = inst.id)
                  OR (inst.kind = 'bem' AND na.bem_id = inst.id)
                  OR (inst.kind = 'matricula' AND na.matricula_id = inst.id)))
  )
  SELECT JSONB_BUILD_OBJECT(
    'solicitacao',
      (SELECT JSONB_BUILD_OBJECT(
                'id',           sol.id,
                'status',       sol.status,
                'enviada_em',   sol.enviada_em,
                'encerrada_em', sol.encerrada_em)
         FROM sol),
    'pendencias',
      COALESCE(
        (SELECT JSONB_AGG(
                  JSONB_BUILD_OBJECT(
                    'solicitacao_item_id', l.solicitacao_item_id,
                    'documento_tipo_id',   l.documento_tipo_id,
                    'grupo',               l.grupo,
                    'documento',           l.documento,
                    'nota',                l.nota,
                    'granularidade',       l.granularidade,
                    'alvo', JSONB_BUILD_OBJECT(
                              'kind',    l.kind,
                              'id',      l.alvo_id,
                              'nome',    l.nome,
                              'detalhe', l.detalhe),
                    'recebido',          COALESCE(l.tem_arquivo, false),
                    'recebido_interno',  COALESCE(l.tem_interno, false),
                    'arquivos',          COALESCE(l.arquivos_cliente, '[]'::jsonb))
                  ORDER BY l.grupo, l.ordem, l.documento, l.nome)
           FROM linhas l),
        '[]'::jsonb)
  );
$function$;

COMMENT ON FUNCTION public.get_pendencias_documentos_cliente() IS
  'Fase de checklist do portal do cliente: uma linha por documento pedido × entidade do cadastro, com documento_tipo_id e alvo (para o upload nascer classificado), o que já chegou e a nota do pedido. Multiplica dentro da função porque o portal não lê pessoa/bem/matricula: só o nome da entidade sai daqui. Item dispensado e instância marcada como não aplicável não viram linha. Arquivo subido pela PSA conta como recebido (sinalizado em recebido_interno) mas não é exposto na lista de arquivos. Sem solicitação em em_checklist nem encerrada, devolve solicitacao nula e pendencias vazio. A solicitação INICIAL continua sendo lida por get_solicitacao_ativa_cliente, que esta função não substitui.';

REVOKE ALL ON FUNCTION public.get_pendencias_documentos_cliente() FROM public;
GRANT EXECUTE ON FUNCTION public.get_pendencias_documentos_cliente() TO authenticated;