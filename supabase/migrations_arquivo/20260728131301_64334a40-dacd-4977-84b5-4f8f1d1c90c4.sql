-- EDU-11: menções em comentários

CREATE TABLE public.org_comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.org_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.org_comment_mentions TO authenticated;
GRANT ALL ON public.org_comment_mentions TO service_role;

CREATE INDEX org_comment_mentions_unread_idx
  ON public.org_comment_mentions (mentioned_user_id, created_at DESC)
  WHERE lido_em IS NULL;

ALTER TABLE public.org_comment_mentions ENABLE ROW LEVEL SECURITY;

-- SELECT: o próprio mencionado OU quem já enxerga o comentário (delegado à RLS de org_comments)
CREATE POLICY org_comment_mentions_select
ON public.org_comment_mentions
FOR SELECT
TO authenticated
USING (
  mentioned_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.org_comments c
    WHERE c.id = org_comment_mentions.comment_id
  )
);

-- INSERT: quem pode comentar naquele comentário (autor do comentário)
CREATE POLICY org_comment_mentions_insert
ON public.org_comment_mentions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_comments c
    WHERE c.id = org_comment_mentions.comment_id
      AND c.author_id = auth.uid()
  )
);

-- UPDATE: só o próprio mencionado
CREATE POLICY org_comment_mentions_update
ON public.org_comment_mentions
FOR UPDATE
TO authenticated
USING (mentioned_user_id = auth.uid())
WITH CHECK (mentioned_user_id = auth.uid());

-- Trigger que só permite alterar lido_em
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Menção: apenas lido_em pode ser alterado' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_comment_mentions_guard_update
BEFORE UPDATE ON public.org_comment_mentions
FOR EACH ROW EXECUTE FUNCTION public.org_comment_mentions_guard_update();