BEGIN;

CREATE OR REPLACE FUNCTION public.is_valid_org_task_reviewer(
  _reviewer_id uuid,
  _project_id uuid,
  _assigned_to uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _reviewer_id IS NOT NULL
     AND _project_id IS NOT NULL
     AND _reviewer_id IS DISTINCT FROM _assigned_to
     AND public.has_role_or_higher(_reviewer_id, 'team_member'::public.app_role)
     AND public.org_project_cluster_ids(_project_id)
         && public.resolve_user_cluster_ids(_reviewer_id);
$$;

COMMENT ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) IS
  'Valida papel team_member+ e vinculo entre o revisor e pelo menos um cluster do projeto.';

REVOKE ALL ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_org_task_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.reviewer_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM 'review'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor so pode ser definido quando a tarefa esta em revisao'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     AND NEW.status IS DISTINCT FROM 'review'::public.fiscal_task_status
     AND NOT (
       NEW.reviewer_id IS NULL
       AND OLD.reviewer_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.profiles p
         WHERE p.id = OLD.reviewer_id
       )
     ) THEN
    RAISE EXCEPTION 'O revisor so pode ser alterado quando a tarefa esta em revisao'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'review'::public.fiscal_task_status
     AND NEW.reviewer_id IS NOT NULL
     AND NOT public.is_valid_org_task_reviewer(
       NEW.reviewer_id,
       NEW.project_id,
       NEW.assigned_to
     ) THEN
    RAISE EXCEPTION 'Revisor deve ser membro da equipe vinculado ao cluster da tarefa e diferente do responsavel'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_org_task_reviewer() FROM PUBLIC;

COMMIT;