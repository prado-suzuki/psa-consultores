-- 20260908113717_modelo_de_documento_no_catalogo.sql
-- Sprint 13 / card 4: o modelo em branco passa a viver no catálogo de documentos.
--
-- Dois dos documentos que a OSG pede não são documento que o cliente já tem (CPF,
-- matrícula): são planilha que a PSA manda EM BRANCO para ele preencher — "Relação
-- de áreas exploradas por imóvel" e "Planilha de resultado projetado (PF e PJ)".
-- Hoje o modelo vai por e-mail, fora do portal, então a tela pede o documento e não
-- entrega o formulário: o cliente vê a linha "envie a planilha" sem ter a planilha.
--
-- POR QUE O MODELO É CAMPO DO CATÁLOGO, e não da linha do cliente: ele é o MESMO
-- para todos. Copiar o caminho para `solicitacao_item` faria cada pedido carregar
-- uma cópia do endereço, e trocar o arquivo passaria a exigir varrer todas as
-- solicitações abertas. No catálogo, substituir o objeto no bucket vale para todo
-- mundo no mesmo instante. É também o que mantém a regra da EDU-25: `solicitacao_item`
-- não copia texto do catálogo — e endereço de modelo é texto do catálogo.
--
-- POR QUE AS DUAS RPCs ENTRAM AQUI: o cliente não lê `documento_tipo`. As duas RPCs
-- do portal são o ÚNICO caminho por onde o modelo chega até ele. A mudança em cada
-- uma é uma chave nova no jsonb do item; a assinatura (`returns jsonb`) não muda, e
-- por isso nem `types.ts` nem hook nenhum precisa de cast novo.
--
-- POR QUE O CAMINHO PODE FICAR NULO POR ENQUANTO: o UPDATE que grava
-- `modelo_path` é passo separado, depois de os arquivos estarem no bucket
-- `osg-modelos`. Com `modelo_path` nulo a tela não mostra botão nenhum — então
-- nunca existe link quebrado, nem entre a aplicação desta migração e o upload.

-- 1. As três colunas.
alter table public.documento_tipo
  add column if not exists modelo_bucket text,
  add column if not exists modelo_path   text,
  add column if not exists modelo_nome   text;

comment on column public.documento_tipo.modelo_bucket is
  'Bucket do Storage onde está o modelo em branco deste documento. Hoje sempre '
  '"osg-modelos" (privado, leitura para logado, escrita só admin). Nulo = documento '
  'sem modelo, que é o caso dos 60+ tipos restantes.';

comment on column public.documento_tipo.modelo_path is
  'Caminho do objeto dentro do bucket. É O CAMPO QUE LIGA A FEATURE: nulo faz a tela '
  'não mostrar botão de baixar, no analista e no cliente. Trocar o arquivo neste '
  'caminho troca o modelo para todos os clientes no mesmo instante — é de propósito.';

comment on column public.documento_tipo.modelo_nome is
  'Nome amigável do arquivo, o que a tela escreve e o que o navegador salva. Nulo '
  'faz as duas pontas caírem no basename de modelo_path (a RPC por regexp_replace, o '
  'front por resolverModelo) — os dois lados mostram o mesmo nome.';

-- 2. Bucket e caminho andam juntos.
--
-- Sem isto, um UPDATE que grava só o caminho produz linha com endereço pela metade,
-- e a tela chamaria createSignedUrl com bucket undefined. Guarda de par, não de
-- conteúdo: `modelo_nome` continua opcional de propósito (ver comentário acima).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.documento_tipo'::regclass
       and conname  = 'documento_tipo_modelo_par_completo'
  ) then
    alter table public.documento_tipo
      add constraint documento_tipo_modelo_par_completo
      check ((modelo_bucket is null) = (modelo_path is null));
  end if;
end $$;

-- 3. As duas RPCs do portal, recriadas. A assinatura nao muda (() returns jsonb):
--    o delta e uma chave 'modelo' no jsonb de cada item. Base conferida contra
--    producao em 08/09/2026 (md5 do pg_get_functiondef bate byte a byte com esta
--    versao menos as adicoes marcadas).

CREATE OR REPLACE FUNCTION public.get_solicitacao_ativa_cliente()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH s AS (
    SELECT sol.id, sol.status, sol.enviada_em, sol.encerrada_em
    FROM public.solicitacao sol
    WHERE sol.cliente_id = public.resolve_user_cliente_id(auth.uid())
    ORDER BY sol.encerrada_em DESC NULLS FIRST, sol.created_at DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'solicitacao',
      (SELECT jsonb_build_object(
                'id',           s.id,
                'status',       s.status,
                'enviada_em',   s.enviada_em,
                'encerrada_em', s.encerrada_em
              )
         FROM s),
    'itens',
      COALESCE(
        (SELECT jsonb_agg(
                  jsonb_build_object(
                    'id',        i.id,
                    'grupo',     i.grupo,
                    'documento', COALESCE(i.documento, t.documento),
                    'nota',      COALESCE(i.nota,      t.nota),
                    'entidade',  COALESCE(i.entidade,  t.entidade),
                    'ordem',     i.ordem,
                    -- NOVO (card 4). Só do CATÁLOGO (`t`): o modelo é fixo para
                    -- todos, e item pedido à mão não tem catálogo, logo não tem
                    -- modelo. `case` sem `else` devolve NULL quando não há
                    -- caminho, e o front trata `modelo == null` como "sem botão".
                    'modelo',
                      CASE WHEN t.modelo_path IS NOT NULL THEN
                        jsonb_build_object(
                          'bucket', t.modelo_bucket,
                          'path',   t.modelo_path,
                          'nome',   COALESCE(t.modelo_nome,
                                             regexp_replace(t.modelo_path, '^.*/', ''))
                        )
                      END
                  )
                  ORDER BY i.grupo, i.ordem, COALESCE(i.documento, t.documento)
                )
           FROM public.solicitacao_item i
           JOIN s ON s.id = i.solicitacao_id
           LEFT JOIN public.documento_tipo t ON t.id = i.item_padrao_id
          WHERE i.status = 'ativo'::public.osg_solicitacao_item_status
            AND s.status <> 'rascunho'::public.osg_solicitacao_status),
        '[]'::jsonb)
  );
$function$;

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
           i.ordem,
           -- MUDANÇA 1/3 (card 4). Só do CATÁLOGO (`t`), nunca do avulso (`av`):
           -- `av` é linha DO CLIENTE, e o modelo é fixo para todos.
           CASE WHEN t.modelo_path IS NOT NULL THEN
             jsonb_build_object(
               'bucket', t.modelo_bucket,
               'path',   t.modelo_path,
               'nome',   COALESCE(t.modelo_nome,
                                  regexp_replace(t.modelo_path, '^.*/', ''))
             )
           END AS modelo
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
           da.revisao,
           da.revisao_motivo,
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
           it.modelo,                      -- MUDANÇA 2/3 (card 4)
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
                 JSONB_AGG(JSONB_BUILD_OBJECT('id',      x.id,
                                              'nome',    x.nome_original,
                                              'revisao', x.revisao,
                                              'motivo',  x.revisao_motivo)
                           ORDER BY x.created_at)
                 FILTER (WHERE x.fonte = 'cliente'::public.osg_doc_fonte),
                 '[]'::jsonb) AS arquivos_cliente,
               COUNT(*) FILTER (
                 WHERE x.revisao <> 'recusado'::public.osg_doc_revisao) > 0 AS tem_arquivo,
               COALESCE(BOOL_OR(x.fonte <> 'cliente'::public.osg_doc_fonte
                                AND x.revisao <> 'recusado'::public.osg_doc_revisao), false) AS tem_interno
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
                    'arquivos',          COALESCE(l.arquivos_cliente, '[]'::jsonb),
                    'modelo',            l.modelo)   -- MUDANÇA 3/3 (card 4)
                  ORDER BY l.grupo, l.ordem, l.documento, l.nome)
           FROM linhas l),
        '[]'::jsonb)
  );
$function$;