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

  -- team_member CRIADOR pode editar por inteiro a propria tarefa.
  -- Guardrail: created_by imutavel.
  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- team_member nao-criador (tarefa delegada): so status, horas e revisor.
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id') THEN
    RAISE EXCEPTION 'Tarefa delegada: team_member so pode alterar status, horas e revisor (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.org_tasks_team_member_status_only() FROM PUBLIC;