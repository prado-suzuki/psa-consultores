-- =============================================================================
-- Ajustes na feature de comentários, após as migrations EDU-08 a EDU-13.
--
-- 1) Cria o bucket `comment-attachments` (as policies dele foram criadas no
--    EDU-12, mas o bucket em si não — upload falharia com "Bucket not found").
-- 2) A view `org_comments_feed` passa a expor `excluido` e deixa de esconder o
--    comentário excluído: quem filtra é o front (convenção do AGENTS.md), e o
--    BER-24 precisa do comentário excluído para não deixar as respostas órfãs.
-- 3) `criar_org_comment` deixa de quebrar quando `_id` chega nulo.
-- 4) A policy de SELECT dos anexos passa a delegar a visibilidade à RLS de
--    `org_comments`, em vez de reimplementá-la (faltava o caso do admin).
-- 5) `org_comments_guard_update` sem o `#- '{}'::text[]`, que era no-op na
--    melhor hipótese e erro de caminho vazio na pior.
-- 6) REVOKE do DELETE em `org_comments`: exclusão é soft delete.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Bucket dos anexos
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) View de feed: expõe `excluido` e não filtra mais
--
-- `excluido` entra como última coluna de propósito: CREATE OR REPLACE VIEW só
-- aceita acréscimo no fim, sem DROP (que invalidaria os grants).
-- `reply_count` continua contando apenas respostas não excluídas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.org_comments_feed
WITH (security_invoker = on) AS
SELECT
    c.id,
    c.entity_type,
    c.entity_id,
    c.project_id,
    c.parent_id,
    c.kind,
    c.body,
    c.metadata,
    c.author_id,
    c.author_name,
    c.editado_em,
    c.created_at,
    c.updated_at,
    COALESCE(t.title, p.name) AS entity_title,
    p.name                    AS project_name,
    (
      SELECT COUNT(*)::int
        FROM public.org_comments r
       WHERE r.parent_id = c.id
         AND r.excluido  = false
    )                         AS reply_count,
    (
      SELECT COUNT(*)::int
        FROM public.org_comment_attachments a
       WHERE a.comment_id = c.id
    )                         AS attachment_count,
    c.excluido
  FROM public.org_comments  c
  JOIN public.org_projects  p  ON  p.id           = c.project_id
  LEFT JOIN public.org_tasks t  ON  t.id          = c.entity_id
                               AND c.entity_type  = 'org_task'::public.org_comment_entity;

COMMENT ON VIEW public.org_comments_feed IS
  'Comentários com o título da entidade e o nome do projeto resolvidos (o entity_id não é FK, então o PostgREST não faz embed). NÃO filtra excluido — o consumidor filtra, conforme a convenção de soft delete do AGENTS.md.';

-- -----------------------------------------------------------------------------
-- 3) RPC: um único id para o comentário e seus filhos
--
-- Antes: o comentário usava COALESCE(_id, gen_random_uuid()), cada menção
-- chamava COALESCE de novo (gerando OUTRO uuid, que violava a FK), os anexos
-- usavam `_id` cru (violando o NOT NULL) e o RETURN devolvia nulo. Só não
-- estourava porque o front sempre manda o id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_org_comment(
  _id           uuid,
  _entity_type  public.org_comment_entity,
  _entity_id    uuid,
  _parent_id    uuid,
  _body         text,
  _mentions     uuid[],
  _attachments  jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_id          uuid := COALESCE(_id, gen_random_uuid());
  v_author_name text;
  v_mention     uuid;
  v_att         jsonb;
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
        INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id)
        VALUES (v_id, v_mention)
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
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

-- -----------------------------------------------------------------------------
-- 4) Anexos: SELECT delega a visibilidade à RLS de org_comments
--
-- A policy anterior reimplementava a regra de acesso e esquecia o admin, então
-- um admin não-membro via o comentário mas não os anexos dele. Como a RLS de
-- `org_comments` também vale dentro do subselect de uma policy, basta perguntar
-- "eu vejo este comentário?" — e a regra deixa de existir em dois lugares.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_comment_attachments_select" ON public.org_comment_attachments;

CREATE POLICY "org_comment_attachments_select"
  ON public.org_comment_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.org_comments c
       WHERE c.id       = org_comment_attachments.comment_id
         AND c.excluido = false
    )
  );

-- -----------------------------------------------------------------------------
-- 5) Guard de UPDATE sem o `#-` de caminho vazio
--
-- Mesma intenção da versão anterior, com a lista de colunas imutáveis explícita
-- em vez de comparação de jsonb: autor altera `body`; não-autor (lider+, pela
-- policy) só marca `excluido` de false para true.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.org_comments_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Imutáveis para todos, inclusive o autor.
  IF NEW.id          IS DISTINCT FROM OLD.id
  OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
  OR NEW.entity_id   IS DISTINCT FROM OLD.entity_id
  OR NEW.project_id  IS DISTINCT FROM OLD.project_id
  OR NEW.kind        IS DISTINCT FROM OLD.kind
  OR NEW.author_id   IS DISTINCT FROM OLD.author_id
  OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Colunas imutáveis do comentário não podem ser alteradas'
      USING ERRCODE = '42501';
  END IF;

  -- Autor: edita o corpo e/ou marca como excluído.
  IF v_uid IS NOT NULL AND v_uid = OLD.author_id THEN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
      NEW.editado_em := now();
    END IF;
    IF OLD.excluido = false AND NEW.excluido = true THEN
      NEW.excluido_em  := now();
      NEW.excluido_por := v_uid;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Não-autor: a única mudança permitida é o soft delete.
  IF OLD.excluido = false AND NEW.excluido = true THEN
    IF NEW.parent_id   IS DISTINCT FROM OLD.parent_id
    OR NEW.body        IS DISTINCT FROM OLD.body
    OR NEW.metadata    IS DISTINCT FROM OLD.metadata
    OR NEW.author_name IS DISTINCT FROM OLD.author_name
    OR NEW.editado_em  IS DISTINCT FROM OLD.editado_em THEN
      RAISE EXCEPTION 'Não autor só pode marcar o comentário como excluído'
        USING ERRCODE = '42501';
    END IF;
    NEW.excluido_em  := now();
    NEW.excluido_por := v_uid;
    NEW.updated_at   := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Somente o autor pode editar este comentário'
    USING ERRCODE = '42501';
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Sem DELETE para o usuário final: exclusão é soft delete
--
-- O EDU-08 concedeu DELETE a `authenticated` e o EDU-10 não revogou. Não havia
-- brecha (sem policy de DELETE, a RLS já negava), mas o grant contradizia o
-- desenho. O cascade da tarefa apagada continua funcionando: roda dentro de uma
-- função SECURITY DEFINER, com os privilégios do dono.
-- -----------------------------------------------------------------------------
REVOKE DELETE ON public.org_comments FROM authenticated;
