
-- TRIGGER 1: resolve project_id e valida existência da entidade
CREATE OR REPLACE FUNCTION public.org_comments_resolve_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.entity_type = 'org_project'::public.org_comment_entity THEN
    IF NOT EXISTS (SELECT 1 FROM public.org_projects WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'Projeto % nao encontrado', NEW.entity_id USING ERRCODE = '23503';
    END IF;
    NEW.project_id := NEW.entity_id;
  ELSIF NEW.entity_type = 'org_task'::public.org_comment_entity THEN
    SELECT t.project_id INTO v_project_id FROM public.org_tasks t WHERE t.id = NEW.entity_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tarefa % nao encontrada', NEW.entity_id USING ERRCODE = '23503';
    END IF;
    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Tarefa % nao possui projeto vinculado', NEW.entity_id USING ERRCODE = '23502';
    END IF;
    NEW.project_id := v_project_id;
  ELSE
    RAISE EXCEPTION 'entity_type invalido: %', NEW.entity_type USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_comments_resolve_scope
BEFORE INSERT ON public.org_comments
FOR EACH ROW EXECUTE FUNCTION public.org_comments_resolve_scope();

-- TRIGGER 2: thread de um nível só
CREATE OR REPLACE FUNCTION public.org_comments_validate_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.org_comments%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_parent FROM public.org_comments WHERE id = NEW.parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentario pai % nao encontrado', NEW.parent_id USING ERRCODE = '23503';
  END IF;

  IF v_parent.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Nao e permitido responder uma resposta (thread de um nivel so)' USING ERRCODE = '23514';
  END IF;

  IF v_parent.entity_type IS DISTINCT FROM NEW.entity_type
     OR v_parent.entity_id IS DISTINCT FROM NEW.entity_id THEN
    RAISE EXCEPTION 'Resposta deve estar no mesmo escopo do comentario pai' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_comments_validate_parent
BEFORE INSERT OR UPDATE ON public.org_comments
FOR EACH ROW EXECUTE FUNCTION public.org_comments_validate_parent();

-- TRIGGER 3: trava colunas imutáveis e autoria em UPDATE
CREATE OR REPLACE FUNCTION public.org_comments_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_diff jsonb;
BEGIN
  IF NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Colunas imutaveis do comentario nao podem ser alteradas' USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL AND v_uid = OLD.author_id THEN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
      NEW.editado_em := now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Nao autor: unica mudanca permitida e soft-delete (false -> true)
  IF OLD.excluido = false AND NEW.excluido = true THEN
    v_diff := (to_jsonb(NEW) - 'excluido' - 'excluido_em' - 'excluido_por' - 'updated_at')
           #- '{}'::text[];
    IF v_diff IS DISTINCT FROM
       ((to_jsonb(OLD) - 'excluido' - 'excluido_em' - 'excluido_por' - 'updated_at') #- '{}'::text[]) THEN
      RAISE EXCEPTION 'Nao autor so pode marcar o comentario como excluido' USING ERRCODE = '42501';
    END IF;
    NEW.excluido_em := now();
    NEW.excluido_por := v_uid;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Somente o autor pode editar este comentario' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_org_comments_guard_update
BEFORE UPDATE ON public.org_comments
FOR EACH ROW EXECUTE FUNCTION public.org_comments_guard_update();

-- TRIGGER 4: apagar tarefa remove seus comentarios
CREATE OR REPLACE FUNCTION public.org_tasks_cascade_delete_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.org_comments
   WHERE entity_type = 'org_task'::public.org_comment_entity
     AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_org_tasks_cascade_delete_comments
AFTER DELETE ON public.org_tasks
FOR EACH ROW EXECUTE FUNCTION public.org_tasks_cascade_delete_comments();
