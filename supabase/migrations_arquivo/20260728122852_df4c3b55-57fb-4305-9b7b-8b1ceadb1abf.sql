-- ENUMs
CREATE TYPE public.org_comment_entity AS ENUM ('org_task', 'org_project');
CREATE TYPE public.org_comment_kind AS ENUM (
  'comment',
  'assignment_changed',
  'review_submitted',
  'review_approved',
  'review_adjustments',
  'status_changed'
);

-- Tabela unificada de comentários
CREATE TABLE public.org_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.org_comment_entity NOT NULL,
  entity_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.org_projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.org_comments(id) ON DELETE CASCADE,
  kind public.org_comment_kind NOT NULL DEFAULT 'comment',
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text,
  editado_em timestamptz,
  excluido boolean NOT NULL DEFAULT false,
  excluido_em timestamptz,
  excluido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTs (policies virão no EDU-10)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_comments TO authenticated;
GRANT ALL ON public.org_comments TO service_role;

-- RLS habilitada; sem policies ainda (bloqueado até EDU-10)
ALTER TABLE public.org_comments ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX org_comments_entity_created_idx
  ON public.org_comments (entity_type, entity_id, created_at DESC)
  WHERE excluido = false;

CREATE INDEX org_comments_project_feed_idx
  ON public.org_comments (project_id, created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment';

CREATE INDEX org_comments_parent_idx
  ON public.org_comments (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX org_comments_author_idx
  ON public.org_comments (author_id);

-- Trigger de updated_at
CREATE TRIGGER trg_org_comments_updated_at
  BEFORE UPDATE ON public.org_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- org_tasks.project_id agora obrigatório
ALTER TABLE public.org_tasks ALTER COLUMN project_id SET NOT NULL;