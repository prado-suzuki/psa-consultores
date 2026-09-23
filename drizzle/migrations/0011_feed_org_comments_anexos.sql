-- 20260922191622_feed_org_comments_anexos.sql
-- Feed: leitura "so com anexo", ao lado de "Tudo" e "Mencoes".
--
-- A pergunta que ela responde e "onde esta o arquivo que mandaram", e a busca
-- textual nao responde: o nome do arquivo nao esta no corpo, e muita fala com
-- anexo nem tem texto.
--
-- O filtro entra no MESMO lugar dos outros: `_only_attachments` na
-- `feed_org_comments`, resolvido no WHERE, antes do LIMIT. Filtrar no front
-- filtraria a janela de 20 comentarios da pagina, nao o feed.
--
-- Anexo e linha de `org_comment_attachments` (a tabela nao tem soft delete).
-- O `EXISTS` roda sob a RLS dela, que e a mesma leitura que a tela ja faz para
-- desenhar o anexo: se a pessoa nao enxerga o arquivo, a fala nao entra no
-- recorte "com anexo" dela.
--
-- Sem mudanca de schema: nao precisa regerar types.ts (a funcao entra por cast
-- de shim no front, ver `useDomainFeedComentarios`).
--
-- Reversao: dropar `feed_org_comments` com o `_only_attachments` e recriar a
-- assinatura de nove parametros da migration
-- `20260922133138_feed_org_comments_busca.sql`.

-- A assinatura MUDA, entao a antiga precisa sair: um `CREATE OR REPLACE`
-- deixaria as duas de pe como sobrecargas, e a chamada do PostgREST ficaria
-- ambigua entre elas.
DROP FUNCTION IF EXISTS public.feed_org_comments(
  timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean,
  timestamp with time zone, text
);

CREATE OR REPLACE FUNCTION public.feed_org_comments(
  _cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _cursor_id uuid DEFAULT NULL::uuid,
  _limit integer DEFAULT 20,
  _client_ids uuid[] DEFAULT NULL::uuid[],
  _project_ids uuid[] DEFAULT NULL::uuid[],
  _author_ids uuid[] DEFAULT NULL::uuid[],
  _only_mentions boolean DEFAULT false,
  _since timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _busca text DEFAULT NULL::text,
  _only_attachments boolean DEFAULT false
)
RETURNS SETOF public.org_comments_feed
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT f.*
    FROM public.org_comments_feed f
   WHERE f.excluido = false
     AND (f.created_at, f.id) < (
           COALESCE(_cursor_created_at, 'infinity'::timestamptz),
           COALESCE(_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
         )
     AND (_client_ids  IS NULL OR f.client_id  = ANY (_client_ids))
     AND (_project_ids IS NULL OR f.project_id = ANY (_project_ids))
     AND (_author_ids  IS NULL OR f.author_id  = ANY (_author_ids))
     AND (_since IS NULL OR f.created_at >= _since)
     AND public.org_comment_casa_busca(f.body, _busca)
     AND (
           COALESCE(_only_mentions, false) = false
           OR f.id IN (
                SELECT m.comment_id
                  FROM public.org_comment_mentions m
                 WHERE m.mentioned_user_id = (SELECT auth.uid())
                   AND m.motivo = 'mencao'
              )
         )
     AND (
           COALESCE(_only_attachments, false) = false
           OR EXISTS (
                SELECT 1
                  FROM public.org_comment_attachments a
                 WHERE a.comment_id = f.id
              )
         )
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$function$;

COMMENT ON FUNCTION public.feed_org_comments(
  timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean,
  timestamp with time zone, text, boolean
) IS
  'Uma pagina do feed de projetos e tarefas, em ordem cronologica decrescente. '
  'Traz a conversa humana E os eventos de sistema (revisao, solicitacao de '
  'documentos e o que vier depois): todo kind de org_comments entra, o recorte e '
  'apenas excluido = false. Paginacao por cursor em (created_at, id), nunca '
  'OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, mencoes a '
  'mim (so motivo = mencao, nao a notificacao de resposta), piso de periodo, '
  'busca textual no corpo (todos os termos, em qualquer ordem, sobre o texto '
  'extraido do documento) e so comentarios com anexo; parametro nulo = sem '
  'filtro, array vazio = nenhum resultado. A relevancia vem da RLS de '
  'org_comments (funcao SECURITY INVOKER lendo view security_invoker).';

-- GATE: falha a migration se o feed ficou sem o filtro de anexo, se a
-- assinatura antiga sobreviveu (sobrecarga ambigua para o PostgREST) ou se os
-- filtros anteriores se perderam na reescrita.
DO $$
DECLARE
  v_src         text;
  v_assinaturas int;
BEGIN
  SELECT p.prosrc, count(*) OVER () INTO v_src, v_assinaturas
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'feed_org_comments';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: feed_org_comments nao existe apos a migration';
  END IF;
  IF v_assinaturas <> 1 THEN
    RAISE EXCEPTION 'GATE: feed_org_comments tem % assinaturas; a antiga nao foi dropada', v_assinaturas;
  END IF;
  IF v_src NOT LIKE '%org_comment_attachments%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments nao aplica o filtro de anexo no WHERE';
  END IF;
  IF v_src NOT LIKE '%org_comment_casa_busca%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments perdeu a busca';
  END IF;
  IF v_src NOT LIKE '%excluido = false%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments perdeu o recorte de excluido';
  END IF;
END $$;
