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
     AND public.has_role_or_higher(_reviewer_id, 'sublider'::public.app_role)
     AND public.org_project_cluster_ids(_project_id)
         && public.resolve_user_cluster_ids(_reviewer_id);
$$;

COMMENT ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) IS
  'Valida papel sublider+ e vinculo entre o revisor e pelo menos um cluster do projeto.';

REVOKE ALL ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_org_task_reviewer(uuid, uuid, uuid) TO authenticated;

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
    RAISE EXCEPTION 'Revisor deve ser sublider, lider ou admin vinculado ao cluster da tarefa e diferente do responsavel'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_org_task_reviewer() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_org_tasks_validate_reviewer ON public.org_tasks;
CREATE TRIGGER trg_org_tasks_validate_reviewer
  BEFORE INSERT OR UPDATE ON public.org_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_org_task_reviewer();

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select ON public.org_tasks
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (
        public.has_role(auth.uid(), 'lider'::public.app_role)
        OR public.has_role(auth.uid(), 'sublider'::public.app_role)
      )
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      reviewer_id = auth.uid()
      AND status = 'review'::public.fiscal_task_status
    )
  );

DROP POLICY IF EXISTS rls_org_tasks_update ON public.org_tasks;
CREATE POLICY rls_org_tasks_update ON public.org_tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (
        public.has_role(auth.uid(), 'lider'::public.app_role)
        OR public.has_role(auth.uid(), 'sublider'::public.app_role)
      )
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      reviewer_id = auth.uid()
      AND status = 'review'::public.fiscal_task_status
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      project_id IS NOT NULL
      AND (
        public.has_role(auth.uid(), 'lider'::public.app_role)
        OR public.has_role(auth.uid(), 'sublider'::public.app_role)
      )
      AND public.can_view_org_project(auth.uid(), project_id)
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      reviewer_id = auth.uid()
      AND status IN (
        'review'::public.fiscal_task_status,
        'em_ajuste'::public.fiscal_task_status
      )
    )
  );

CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status IS DISTINCT FROM 'done'::public.fiscal_task_status
     AND NEW.status = 'done'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor nao pode concluir a tarefa; devolva para ajustes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status = 'review'::public.fiscal_task_status THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN (
      'review'::public.fiscal_task_status,
      'em_ajuste'::public.fiscal_task_status
    ) THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF public.has_role_or_higher(v_user_id, 'sublider'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id') THEN
    RAISE EXCEPTION 'team_member so pode alterar status, horas e revisor da propria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.org_tasks_team_member_status_only() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.org_task_visivel(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_tasks t
    WHERE t.id = p_task_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          t.project_id IS NOT NULL
          AND (
            public.has_role(auth.uid(), 'lider'::public.app_role)
            OR public.has_role(auth.uid(), 'sublider'::public.app_role)
          )
          AND public.can_view_org_project(auth.uid(), t.project_id)
        )
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
        OR (
          t.reviewer_id = auth.uid()
          AND t.status = 'review'::public.fiscal_task_status
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.org_task_visivel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_task_visivel(uuid) TO authenticated;

COMMIT;