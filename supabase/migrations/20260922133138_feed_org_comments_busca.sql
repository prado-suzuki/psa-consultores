-- 20260922133138_feed_org_comments_busca.sql
-- Feed: busca textual no corpo do comentario (item 2 do checklist do feed).
--
-- Os filtros do feed sao cliente, projeto, autor, so mencoes e periodo. Nenhum
-- deles responde "onde ficou aquilo": o feed conta o que aconteceu hoje e nao
-- acha a fala de 2022 em que o balancete foi combinado. Sem isso o balancete
-- volta reenviado como `(3).pdf`, porque ninguem achou o primeiro.
--
-- O filtro entra no MESMO lugar dos outros: `_busca` na `feed_org_comments`,
-- resolvido no WHERE, antes do LIMIT. Filtrar no front filtraria a janela de 20
-- comentarios da pagina, nao o feed.
--
-- POR QUE NAO E UM `body ILIKE '%termo%'`. A coluna `org_comments.body` guarda
-- tres formas (ver `src/lib/orgCommentRichText.ts`): o documento do editor
-- (`[[org-comment-rich-text:v1]]` + JSON do TipTap), o documento de revisao
-- (`[[review-rich-text:v1]]` + JSON) e o texto plano do legado. Nas duas
-- primeiras, o JSON leva as chaves da estrutura junto do texto de gente:
-- buscar "doc", "text", "paragraph" ou "label" casaria com TODO comentario
-- rico do sistema, e a busca devolveria o feed inteiro dizendo que achou.
-- Por isso a comparacao e feita sobre o texto EXTRAIDO do documento.
--
-- A extracao nao e regex sobre o JSON: e `jsonb`, que desfaz as escapes do
-- proprio JSON (`\"`, `\n`, `\uXXXX`). Regex acharia `\"` no meio da frase e
-- nao acharia a aspa que a pessoa digitou.
--
-- Fora de escopo, de proposito: nao mexe em RLS, na view, em dado nenhum e nao
-- cria indice. Quem ve o que continua vindo da RLS de `org_comments`. Sem
-- indice porque a busca so entra quando ha termo digitado, e o volume da tabela
-- (153 linhas no sandbox em 22/09/2026) nao paga um indice de trigrama, que
-- ainda exigiria a extensao `pg_trgm`, hoje ausente nos dois bancos. Se um dia
-- pagar, o caminho e um indice GIN sobre `org_comment_texto_pesquisavel(body)`,
-- que ja e IMMUTABLE justamente para isso.
--
-- Sem mudanca de schema: nao precisa regerar types.ts (a funcao ja entra por
-- cast de shim no front, ver `useDomainFeedComentarios`).
--
-- Reversao: dropar `feed_org_comments` com o `_busca` e recriar a assinatura de
-- oito parametros da migration `20260831174631_feed_org_comments_eventos.sql`.

-- O texto pesquisavel de um corpo de comentario, em qualquer das tres formas.
--
-- IMMUTABLE porque e funcao pura do texto: o mesmo corpo da sempre o mesmo
-- resultado, e e isso que permitiria indexa-la depois.
--
-- Marcador com JSON quebrado cai para o texto cru em vez de estourar, do mesmo
-- jeito que `lerCorpo` faz na tela: comentario antigo ou corrompido continua
-- legivel la, e aqui continua pesquisavel.
--
-- O marcador e procurado EM QUALQUER POSICAO, e nao so no comeco. O evento de
-- revisao grava um prefixo em texto antes dele ("Devolvido para ajustes: "),
-- que a tela remove em `corpoDoEvento` e que aqui entra na busca: e frase de
-- gente, e e por ela que se acha a devolucao. Procurar so no inicio deixava as
-- 31 linhas de revisao do sandbox com o JSON inteiro como texto pesquisavel —
-- exatamente o que esta migration existe para impedir.
CREATE OR REPLACE FUNCTION public.org_comment_texto_pesquisavel(_body text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
DECLARE
  v_marcador text;
  v_pos      int := 0;
  v_prefixo  text := '';
  v_payload  text;
  v_doc      jsonb;
BEGIN
  IF _body IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH v_marcador IN ARRAY ARRAY['[[org-comment-rich-text:v1]]', '[[review-rich-text:v1]]'] LOOP
    v_pos := strpos(_body, v_marcador);
    IF v_pos > 0 THEN
      v_prefixo := left(_body, v_pos - 1);
      v_payload := substr(_body, v_pos + length(v_marcador));
      EXIT;
    END IF;
  END LOOP;

  -- Texto plano do legado: ele proprio ja e o texto pesquisavel. A mencao
  -- antiga vive nele como `@[Nome](uuid)`, entao procurar pelo nome acha.
  IF v_payload IS NULL THEN
    RETURN _body;
  END IF;

  BEGIN
    v_doc := v_payload::jsonb;
  EXCEPTION WHEN others THEN
    RETURN v_prefixo || v_payload;
  END;

  -- `text` e o texto digitado; `label` e o nome que aparece no chip da mencao,
  -- e procurar por quem foi chamado numa conversa e caso de uso, nao sobra.
  RETURN v_prefixo || COALESCE((
    SELECT string_agg(valor #>> '{}', ' ')
      FROM jsonb_array_elements(
             jsonb_path_query_array(v_doc, '$.**.text')
             || jsonb_path_query_array(v_doc, '$.**.label')
           ) AS valor
  ), '');
END;
$$;

COMMENT ON FUNCTION public.org_comment_texto_pesquisavel(text) IS
  'Texto de gente dentro de org_comments.body, sem a estrutura do documento. '
  'Le as tres formas do corpo (rich text do editor, rich text de revisao e '
  'texto plano legado) e devolve so o que foi escrito, incluindo o nome nos '
  'chips de mencao. Existe para a busca do feed nao casar com as chaves do '
  'JSON ("doc", "text", "paragraph"), que estao em todo comentario rico.';

-- O corpo atende ao que foi digitado na busca?
--
-- Os termos sao E, nao OU, e a ordem nao importa: "balancete marco" acha a
-- fala que tem as duas palavras em qualquer posicao, que e como se busca em
-- caixa de conversa. Fossem OU, qualquer termo comum devolveria o feed todo.
--
-- `%` e `_` digitados sao escapados: quem procura por "50%" esta procurando o
-- caractere, nao pedindo curinga.
CREATE OR REPLACE FUNCTION public.org_comment_casa_busca(_body text, _busca text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN COALESCE(btrim(_busca), '') = '' THEN true
    ELSE NOT EXISTS (
      SELECT 1
        FROM regexp_split_to_table(btrim(_busca), '\s+') AS termo
       WHERE COALESCE(public.org_comment_texto_pesquisavel(_body), '') NOT ILIKE
             '%' || replace(replace(replace(termo, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  END;
$function$;

COMMENT ON FUNCTION public.org_comment_casa_busca(text, text) IS
  'O corpo do comentario contem TODOS os termos digitados, em qualquer ordem? '
  'Compara sobre org_comment_texto_pesquisavel, nunca sobre o body cru. Busca '
  'vazia passa tudo. `%` e `_` do termo sao escapados, nao viram curinga.';

-- A assinatura MUDA (ganha `_busca`), entao a antiga precisa sair: um
-- `CREATE OR REPLACE` deixaria as duas de pe como sobrecargas, e a chamada do
-- PostgREST sem `_busca` ficaria ambigua entre elas.
DROP FUNCTION IF EXISTS public.feed_org_comments(
  timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean, timestamp with time zone
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
  _busca text DEFAULT NULL::text
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
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$function$;

COMMENT ON FUNCTION public.feed_org_comments(
  timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean,
  timestamp with time zone, text
) IS
  'Uma pagina do feed de projetos e tarefas, em ordem cronologica decrescente. '
  'Traz a conversa humana E os eventos de sistema (revisao, solicitacao de '
  'documentos e o que vier depois): todo kind de org_comments entra, o recorte e '
  'apenas excluido = false. Paginacao por cursor em (created_at, id), nunca '
  'OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, mencoes a '
  'mim (so motivo = mencao, nao a notificacao de resposta), piso de periodo e '
  'busca textual no corpo (todos os termos, em qualquer ordem, sobre o texto '
  'extraido do documento); parametro nulo = sem filtro, array vazio = nenhum '
  'resultado. A relevancia vem da RLS de org_comments (funcao SECURITY INVOKER '
  'lendo view security_invoker).';

-- GATE: falha a migration se o feed ficou sem a busca, se a assinatura antiga
-- sobreviveu (sobrecarga ambigua para o PostgREST) ou se a extracao passou a
-- casar com as chaves do JSON.
DO $$
DECLARE
  v_src        text;
  v_assinaturas int;
  v_corpo_rico text := '[[org-comment-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Balancete de marco conferido"},{"type":"mencaoUsuario","attrs":{"id":"u1","label":"Ana Souza"}}]}]}';
  v_corpo_revisao text := '[[review-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"rever a conta 1.1.02"}]}]}';
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
  IF v_src NOT LIKE '%org_comment_casa_busca%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments nao aplica a busca no WHERE';
  END IF;
  IF v_src LIKE '%kind%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments voltou a filtrar por kind: %', v_src;
  END IF;
  IF v_src NOT LIKE '%excluido = false%' THEN
    RAISE EXCEPTION 'GATE: feed_org_comments perdeu o recorte de excluido';
  END IF;

  -- A estrutura do documento NAO pode ser pesquisavel, e o que foi escrito tem
  -- de ser: as duas metades do motivo desta migration existir.
  IF public.org_comment_texto_pesquisavel(v_corpo_rico) ILIKE '%paragraph%' THEN
    RAISE EXCEPTION 'GATE: a extracao deixou a estrutura do JSON pesquisavel';
  END IF;
  IF NOT public.org_comment_casa_busca(v_corpo_rico, 'marco balancete') THEN
    RAISE EXCEPTION 'GATE: a busca nao casa termos fora de ordem no corpo rico';
  END IF;
  IF NOT public.org_comment_casa_busca(v_corpo_rico, 'Ana') THEN
    RAISE EXCEPTION 'GATE: a busca nao alcanca o nome no chip de mencao';
  END IF;
  IF public.org_comment_casa_busca(v_corpo_rico, 'balancete abril') THEN
    RAISE EXCEPTION 'GATE: os termos da busca estao valendo como OU, e nao como E';
  END IF;
  IF NOT public.org_comment_casa_busca('comentario antigo, texto plano', 'plano') THEN
    RAISE EXCEPTION 'GATE: a busca nao alcanca o corpo legado em texto plano';
  END IF;

  -- O evento de revisao poe um prefixo em texto ANTES do marcador. As duas
  -- metades tem de ser pesquisaveis, e o JSON do meio nao.
  IF public.org_comment_texto_pesquisavel('Devolvido para ajustes: ' || v_corpo_revisao) ILIKE '%paragraph%' THEN
    RAISE EXCEPTION 'GATE: o corpo de revisao com prefixo ficou com o JSON pesquisavel';
  END IF;
  IF NOT public.org_comment_casa_busca('Devolvido para ajustes: ' || v_corpo_revisao, 'devolvido rever') THEN
    RAISE EXCEPTION 'GATE: a busca nao alcanca prefixo e corpo do evento de revisao juntos';
  END IF;
  IF NOT public.org_comment_casa_busca(v_corpo_rico, '   ') THEN
    RAISE EXCEPTION 'GATE: busca so com espaco deveria passar tudo';
  END IF;
  IF public.org_comment_casa_busca(v_corpo_rico, '%') THEN
    RAISE EXCEPTION 'GATE: o %% digitado esta virando curinga em vez de caractere';
  END IF;
END $$;
