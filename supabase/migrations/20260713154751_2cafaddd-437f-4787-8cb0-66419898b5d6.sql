CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role_or_higher(auth.uid(),'sublider'::app_role) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours') THEN
    RAISE EXCEPTION 'team_member só pode alterar o status da própria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

DO $$
DECLARE v_task uuid := '7779a346-5fba-4bd2-9f05-a84bdd198898';
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"2d1c60f5-ed90-40cd-a361-bb56ba3e1686","role":"authenticated"}', true);

  -- TESTE 1: status + estimated_hours + actual_hours na PRÓPRIA tarefa DEVE PASSAR
  BEGIN
    UPDATE public.org_tasks
       SET status='done', estimated_hours=9, actual_hours=7
     WHERE id=v_task;
    RAISE EXCEPTION 'GATE_OK_1';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'GATE_OK_1' THEN
      RAISE EXCEPTION 'GATE FALHOU (1): team_member ainda nao grava horas -> %', SQLERRM;
    END IF;
  END;

  -- TESTE 2: mudar "title" DEVE CONTINUAR BLOQUEADO
  BEGIN
    UPDATE public.org_tasks SET title = title || ' [gate]' WHERE id=v_task;
    RAISE EXCEPTION 'GATE FALHOU (2): title mudou (afrouxou demais!)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'GATE FALHOU%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', true);
  RAISE NOTICE 'GATE OK: estimated_hours + actual_hours liberadas para o dono; title segue bloqueado.';
END $$;