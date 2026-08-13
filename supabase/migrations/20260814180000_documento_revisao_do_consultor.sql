-- A revisão do consultor sobre o arquivo que o cliente enviou no checklist, e a
-- remoção pelo cliente enquanto ninguém aprovou.
--
-- O QUE FALTAVA
--
-- A fase de checklist (13/08/2026) fechou o envio por pendência: o cliente manda o
-- arquivo na linha e ele nasce classificado. Só que o que chegava era ACEITO em
-- silêncio — a subtração dava a pendência por recebida no instante do upload, sem
-- ninguém olhar. Foto tremida, documento vencido ou o arquivo errado fechavam a
-- linha igual ao documento certo, e o consultor não tinha como devolver.
--
-- O VEREDITO MORA NO ARQUIVO, NÃO NA PENDÊNCIA
--
-- Poderia ser uma tabela (documento_revisao) ou uma marca na pendência. É coluna
-- em `documento_arquivo` porque o que se aprova é o ARQUIVO, não a linha: a mesma
-- pendência pode receber três tentativas, e cada uma tem o seu destino. Com a
-- marca na pendência, recusar a segunda tentativa apagaria a memória da primeira,
-- e "quantas vezes isso voltou" é justamente o que o consultor quer ver.
--
-- Três estados, e o default é `pendente`: todo arquivo que já existe entra como
-- "ainda não olhado", que é a verdade sobre ele.
--
-- SEM BACKFILL, de propósito (decisão de 14/08/2026): o que está hoje em
-- `documento_arquivo` é dado de teste (plano §3.1), então não há acervo real a
-- classificar retroativamente. Quem carrega essa história daqui para a frente é o
-- front: CLASSIFICAR É APROVAR, e o Cadastro por Documento grava
-- `revisao = 'aprovado'` no mesmo patch do vínculo (`patchVinculo`, em
-- src/lib/classificarFicha.ts). Sem isso o consultor veria o balde inteiro voltar
-- como "a revisar" depois de já ter aberto arquivo por arquivo — e, pior, o
-- cliente continuaria podendo remover pelo portal um arquivo já vinculado a uma
-- pessoa ou imóvel, porque o guard da remoção olha só `aprovado`. Devolver o
-- arquivo ao balde (`patchDesfazerTriagem`) reabre a revisão junto.
--
-- O QUE MUDA NA CONTA (docs/planos/checklist-por-subtracao.md §2)
--
--   recebido = existe arquivo do tipo/dono   →   ...que NÃO esteja recusado
--
-- Recusar, portanto, "desmarca" a pendência: ela volta a faltar, o botão de envio
-- reaparece e o arquivo recusado continua listado, com o motivo, para o cliente
-- saber o que corrigir em vez de reenviar o mesmo arquivo. Aprovado e ainda não
-- revisado contam igual: quem entregou entregou, e travar o progresso até o
-- consultor passar o olho faria a barra do cliente mentir para baixo.
--
-- POR QUE O CLIENTE PERDE O BOTÃO DE REMOVER DEPOIS DA APROVAÇÃO
--
-- Antes da aprovação, o arquivo é dele: mandou errado, tira e manda de novo. Depois
-- que a PSA aprovou, aquele arquivo virou insumo de trabalho interno (vínculo com
-- pessoa/imóvel, base de documento gerado), e sumir com ele por fora quebraria o
-- que já foi feito em cima. O guard mora na RPC, não na tela: esconder o botão é
-- cortesia, recusar no banco é a regra.
--
-- Reversão:
--   DROP FUNCTION public.revisar_documento_pendencia(uuid,text,text);
--   ALTER TABLE public.documento_arquivo
--     DROP COLUMN revisao, DROP COLUMN revisao_em,
--     DROP COLUMN revisao_por, DROP COLUMN revisao_motivo;
--   DROP TYPE public.osg_doc_revisao;
--   (e reinstalar as versões anteriores de get_pendencias_documentos_cliente e
--    soft_delete_documento_cliente, que esta migration substitui)

BEGIN;

/* ------------------------------------------------------------------ schema */

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                   JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public' AND t.typname = 'osg_doc_revisao') THEN
    CREATE TYPE public.osg_doc_revisao AS ENUM ('pendente', 'aprovado', 'recusado');
  END IF;
END $$;

ALTER TABLE public.documento_arquivo
  ADD COLUMN IF NOT EXISTS revisao public.osg_doc_revisao NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS revisao_em timestamptz,
  ADD COLUMN IF NOT EXISTS revisao_por uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS revisao_motivo text;

COMMENT ON COLUMN public.documento_arquivo.revisao IS
  'Veredito sobre o arquivo recebido do cliente: pendente (ainda não olhado), aprovado (o cliente não remove mais) ou recusado (não conta como recebido no checklist e o envio reabre). Vira aprovado por duas vias: o consultor no checklist (revisar_documento_pendencia) e a classificação no Cadastro por Documento, que grava o vínculo e a aprovação no mesmo patch. Só é interpretada para fonte cliente: arquivo produzido pela PSA não passa por aprovação.';
COMMENT ON COLUMN public.documento_arquivo.revisao_motivo IS
  'O que o cliente lê quando o arquivo é recusado. Só existe em revisao = recusado; aprovar limpa.';

/* ---------------------------------------------- veredito (consultor) */

-- Escrita restrita por PAPEL, não por RLS: a tela do consultor lê o checklist
-- derivado e não tinha nenhuma escrita até aqui. Concentrar a regra numa função
-- evita espalhar "só fonte cliente", "limpa o motivo ao aprovar" e o carimbo de
-- quem/quando por telas futuras.
CREATE OR REPLACE FUNCTION public.revisar_documento_pendencia(
  _documento_id uuid,
  _veredito text,
  _motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_revisao public.osg_doc_revisao;
BEGIN
  IF NOT public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) THEN
    RAISE EXCEPTION 'sem permissao para revisar documento' USING ERRCODE = '42501';
  END IF;

  IF _veredito NOT IN ('pendente', 'aprovado', 'recusado') THEN
    RAISE EXCEPTION 'veredito invalido' USING ERRCODE = '22023';
  END IF;
  v_revisao := _veredito::public.osg_doc_revisao;

  -- Só arquivo RECEBIDO do cliente é revisável. O que a própria PSA subiu não
  -- passa por aprovação: não faria sentido a casa recusar o que a casa produziu.
  UPDATE public.documento_arquivo
     SET revisao = v_revisao,
         revisao_em = CASE WHEN v_revisao = 'pendente' THEN NULL ELSE now() END,
         revisao_por = CASE WHEN v_revisao = 'pendente' THEN NULL ELSE auth.uid() END,
         -- O motivo é a explicação da recusa: aprovar ou reabrir apaga, senão o
         -- cliente continuaria lendo "está ilegível" embaixo de um documento aceito.
         revisao_motivo = CASE WHEN v_revisao = 'recusado' THEN NULLIF(BTRIM(COALESCE(_motivo, '')), '') END,
         updated_at = now()
   WHERE id = _documento_id
     AND excluido = false
     AND fonte = 'cliente'::public.osg_doc_fonte;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento nao encontrado, excluido ou nao veio do cliente'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.revisar_documento_pendencia(uuid,text,text) IS
  'Veredito do consultor (team_member+) sobre arquivo enviado pelo cliente: aprovado, recusado (com motivo) ou pendente para desfazer. Recusado sai da conta de recebido em get_pendencias_documentos_cliente e reabre o envio da pendência; aprovado trava a remoção pelo cliente em soft_delete_documento_cliente. Recusa arquivo de fonte psa: só o que veio do cliente é revisável.';

REVOKE ALL ON FUNCTION public.revisar_documento_pendencia(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.revisar_documento_pendencia(uuid,text,text) TO authenticated;

/* ------------------------------------- remoção pelo cliente (com o guard) */

-- Mesma função da EDU-02 (20260723150854), com uma condição a mais. O corpo é
-- repetido inteiro de propósito: CREATE OR REPLACE substitui, e deixar a versão
-- antiga viva em outro arquivo daria duas leituras da mesma regra.
CREATE OR REPLACE FUNCTION public.soft_delete_documento_cliente(_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;

  -- Aprovado é intocável, e a mensagem diz isso separado do "não encontrado":
  -- o cliente que insiste no botão precisa saber que o arquivo está aceito, não
  -- que ele sumiu.
  IF EXISTS (SELECT 1
               FROM public.documento_arquivo d
              WHERE d.id = _id
                AND d.cliente_id = v_cliente
                AND d.excluido = false
                AND d.revisao = 'aprovado'::public.osg_doc_revisao) THEN
    RAISE EXCEPTION 'este documento já foi aprovado pela PSA e não pode mais ser removido'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.documento_arquivo
     SET excluido = true,
         updated_at = now()
   WHERE id = _id
     AND fonte = 'cliente'
     AND excluido = false
     AND cliente_id = v_cliente;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.soft_delete_documento_cliente(uuid) IS
  'Remoção (soft) de arquivo do próprio cliente. Recusa arquivo aprovado pelo consultor (revisao = aprovado), arquivo de outro cliente e arquivo de fonte psa.';

REVOKE ALL ON FUNCTION public.soft_delete_documento_cliente(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.soft_delete_documento_cliente(uuid) TO authenticated;

/* --------------------------------------- leitura do cliente, com o veredito */

-- Igual à versão de 20260814160000, com duas mudanças, ambas em `arq`/`linhas`:
--   1. `tem_arquivo` (o "recebido") ignora o que está recusado;
--   2. cada arquivo do cliente sai com `revisao` e `motivo`, para a tela mostrar
--      a tag e liberar (ou não) o botão de remover.
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
               -- O recusado continua na lista acima (é o que o cliente precisa
               -- ver), mas some daqui: é o que reabre a pendência.
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
                    'arquivos',          COALESCE(l.arquivos_cliente, '[]'::jsonb))
                  ORDER BY l.grupo, l.ordem, l.documento, l.nome)
           FROM linhas l),
        '[]'::jsonb)
  );
$function$;

COMMENT ON FUNCTION public.get_pendencias_documentos_cliente() IS
  'Fase de checklist do portal do cliente: uma linha por documento pedido × entidade do cadastro, com documento_tipo_id e alvo (para o upload nascer classificado), o que já chegou e a nota do pedido. Arquivo RECUSADO pelo consultor não conta como recebido (a pendência reabre) mas continua na lista arquivos, com revisao e motivo, para o cliente saber o que corrigir. Multiplica dentro da função porque o portal não lê pessoa/bem/matricula: só o nome da entidade sai daqui. Item dispensado e instância marcada como não aplicável não viram linha. Arquivo subido pela PSA conta como recebido (sinalizado em recebido_interno) mas não é exposto na lista de arquivos. A solicitação INICIAL continua sendo lida por get_solicitacao_ativa_cliente, que esta função não substitui.';

REVOKE ALL ON FUNCTION public.get_pendencias_documentos_cliente() FROM public;
GRANT EXECUTE ON FUNCTION public.get_pendencias_documentos_cliente() TO authenticated;

COMMIT;
