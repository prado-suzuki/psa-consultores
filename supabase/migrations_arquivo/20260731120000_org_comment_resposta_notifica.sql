-- =============================================================================
-- Responder alguém notifica essa pessoa, do mesmo jeito que mencionar.
--
-- `org_comment_mentions` já É a caixa de entrada dos comentários (não existe
-- tabela genérica de notificação — ver §3.4 do plano
-- `docs/planos/plano-comentarios-mencoes-feed.md`). Em vez de criar uma segunda
-- caixa, a resposta grava uma linha na mesma tabela e a coluna `motivo` diz de
-- onde ela veio. Consequência de graça: `lido_em`, o índice parcial de não
-- lidas, a RLS, o "abriu a thread → baixou o sino" e o contador do sino já
-- valem para a resposta, sem código novo.
--
-- 1) Coluna `motivo` ('mencao' | 'resposta') e o guard de UPDATE cuidando dela.
-- 2) `criar_org_comment` ganha `_respondido_id` e insere a linha da resposta.
-- 3) `feed_org_comments`: o filtro "Menções" continua sendo só menção.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) De onde veio a linha da caixa de entrada
--
-- DEFAULT 'mencao' porque é o que toda linha existente é: até aqui, a única
-- forma de entrar nesta tabela era ser mencionado.
-- -----------------------------------------------------------------------------
ALTER TABLE public.org_comment_mentions
  ADD COLUMN IF NOT EXISTS motivo text NOT NULL DEFAULT 'mencao';

ALTER TABLE public.org_comment_mentions
  DROP CONSTRAINT IF EXISTS org_comment_mentions_motivo_check;

ALTER TABLE public.org_comment_mentions
  ADD CONSTRAINT org_comment_mentions_motivo_check
  CHECK (motivo IN ('mencao', 'resposta'));

COMMENT ON COLUMN public.org_comment_mentions.motivo IS
  'Por que esta linha existe: ''mencao'' (o autor citou a pessoa no corpo) ou ''resposta'' (o autor respondeu um comentário dela). O UNIQUE (comment_id, mentioned_user_id) mantém uma linha só por pessoa e comentário — quando os dois acontecem no mesmo comentário, vale ''mencao'', que é o motivo mais forte.';

-- O guard de UPDATE existe para que a única coluna que o usuário final altera
-- seja `lido_em`. `motivo` entra na lista de imutáveis: sem isso, o mencionado
-- (que tem UPDATE na própria linha) poderia reescrever o motivo dela.
CREATE OR REPLACE FUNCTION public.org_comment_mentions_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.comment_id IS DISTINCT FROM OLD.comment_id
     OR NEW.mentioned_user_id IS DISTINCT FROM OLD.mentioned_user_id
     OR NEW.motivo IS DISTINCT FROM OLD.motivo
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Menção: apenas lido_em pode ser alterado' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) A RPC passa a notificar quem foi respondido
--
-- `_respondido_id` é o comentário em que a pessoa clicou "Responder", e NÃO é o
-- mesmo que `_parent_id`: a thread tem um nível só (o trigger
-- `org_comments_validate_parent` rejeita resposta de resposta), então responder
-- a uma resposta pendura na raiz dela. Notificar pelo `_parent_id` avisaria o
-- autor da raiz em vez de quem foi respondido — que é justamente o caso do feed,
-- onde se responde a qualquer item.
--
-- DROP + CREATE em vez de CREATE OR REPLACE: acrescentar parâmetro muda a
-- assinatura, e as duas versões convivendo deixariam o PostgREST sem saber qual
-- escolher. Com DEFAULT NULL no parâmetro novo, a chamada com os 7 argumentos
-- antigos continua resolvendo para esta função (cliente antigo publica
-- comentário; só não notifica a resposta).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.criar_org_comment(
  uuid, public.org_comment_entity, uuid, uuid, text, uuid[], jsonb
);

CREATE OR REPLACE FUNCTION public.criar_org_comment(
  _id            uuid,
  _entity_type   public.org_comment_entity,
  _entity_id     uuid,
  _parent_id     uuid,
  _body          text,
  _mentions      uuid[],
  _attachments   jsonb,
  _respondido_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid              uuid := auth.uid();
  v_id               uuid := COALESCE(_id, gen_random_uuid());
  v_author_name      text;
  v_mention          uuid;
  v_att              jsonb;
  v_respondido       uuid;
  v_respondido_autor uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT NULLIF(BTRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')), '')
    INTO v_author_name
    FROM public.profiles pr
   WHERE pr.id = v_uid;

  INSERT INTO public.org_comments (
    id, entity_type, entity_id, parent_id, kind, body, author_id, author_name
  ) VALUES (
    v_id,
    _entity_type,
    _entity_id,
    _parent_id,
    'comment'::public.org_comment_kind,
    _body,
    v_uid,
    v_author_name
  );

  IF _mentions IS NOT NULL THEN
    FOREACH v_mention IN ARRAY _mentions LOOP
      IF v_mention IS NOT NULL THEN
        INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id, motivo)
        VALUES (v_id, v_mention, 'mencao')
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Depois das menções, de propósito: quando a mesma pessoa é respondida E
  -- citada no corpo, o ON CONFLICT deixa valer a linha de menção, que é o
  -- motivo mais forte (foi chamada pelo nome).
  IF _parent_id IS NOT NULL THEN
    v_respondido := COALESCE(_respondido_id, _parent_id);

    -- O respondido tem de ser a raiz ou uma resposta dela: é o que impede
    -- despachar notificação para o autor de um comentário qualquer do sistema
    -- passando um id solto. Não filtra `excluido` — quem eu respondi continua
    -- sendo quem eu respondi, mesmo que o comentário tenha sido apagado entre
    -- abrir o campo e publicar.
    SELECT c.author_id
      INTO v_respondido_autor
      FROM public.org_comments c
     WHERE c.id = v_respondido
       AND (c.id = _parent_id OR c.parent_id = _parent_id);

    -- Autor nulo (comentário de sistema ou perfil removido) e auto-resposta não
    -- viram notificação; id fora da thread também não, e em silêncio: o
    -- comentário já está gravado, e derrubar a publicação por causa do aviso
    -- seria trocar um problema pequeno por um grande.
    IF v_respondido_autor IS NOT NULL AND v_respondido_autor <> v_uid THEN
      INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id, motivo)
      VALUES (v_id, v_respondido_autor, 'resposta')
      ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
    END IF;
  END IF;

  IF _attachments IS NOT NULL AND jsonb_typeof(_attachments) = 'array' THEN
    FOR v_att IN SELECT * FROM jsonb_array_elements(_attachments) LOOP
      INSERT INTO public.org_comment_attachments (
        comment_id, file_path, file_name, file_size, file_type,
        width, height, uploaded_by
      ) VALUES (
        v_id,
        v_att->>'file_path',
        v_att->>'file_name',
        NULLIF(v_att->>'file_size', '')::int,
        v_att->>'file_type',
        NULLIF(v_att->>'width', '')::int,
        NULLIF(v_att->>'height', '')::int,
        v_uid
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_org_comment(
  uuid, public.org_comment_entity, uuid, uuid, text, uuid[], jsonb, uuid
) TO authenticated;

COMMENT ON FUNCTION public.criar_org_comment IS
  'Cria comentário, menções, notificação de resposta e anexos numa transação só. SECURITY INVOKER — a RLS de cada tabela continua valendo. `_respondido_id` é o comentário respondido (a raiz ou uma resposta dela); nulo cai no autor de `_parent_id`.';

-- -----------------------------------------------------------------------------
-- 3) O filtro "Menções" do feed continua sendo só menção
--
-- Sem o `motivo` aqui, a caixa de resposta entraria de carona num recorte cujo
-- rótulo na tela é "conversas em que me mencionam" — o filtro passaria a mostrar
-- coisa que ninguém pediu. A caixa é compartilhada; o significado do filtro não.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.feed_org_comments(
  _cursor_created_at timestamptz DEFAULT NULL,
  _cursor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20,
  _client_ids uuid[] DEFAULT NULL,
  _project_ids uuid[] DEFAULT NULL,
  _author_ids uuid[] DEFAULT NULL,
  _only_mentions boolean DEFAULT false,
  _since timestamptz DEFAULT NULL
)
RETURNS SETOF public.org_comments_feed
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT f.*
    FROM public.org_comments_feed f
   WHERE f.kind = 'comment'
     AND f.excluido = false
     AND (f.created_at, f.id) < (
           COALESCE(_cursor_created_at, 'infinity'::timestamptz),
           COALESCE(_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
         )
     AND (_client_ids  IS NULL OR f.client_id  = ANY (_client_ids))
     AND (_project_ids IS NULL OR f.project_id = ANY (_project_ids))
     AND (_author_ids  IS NULL OR f.author_id  = ANY (_author_ids))
     AND (_since IS NULL OR f.created_at >= _since)
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
$$;

GRANT EXECUTE ON FUNCTION public.feed_org_comments(
  timestamptz, uuid, integer, uuid[], uuid[], uuid[], boolean, timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.feed_org_comments IS
  'Uma página do feed de conversas, em ordem cronológica decrescente. Paginação por cursor em (created_at, id) — nunca OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, menções a mim (só motivo = mencao, não a notificação de resposta) e piso de período; parâmetro nulo = sem filtro, array vazio = nenhum resultado. A relevância vem da RLS de org_comments (função SECURITY INVOKER lendo view security_invoker).';
