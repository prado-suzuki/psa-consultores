-- PASSO 1: coluna reviewer_id
ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.org_tasks.reviewer_id IS
  'Lider/sublider designado como revisor quando a tarefa entra em review. Nao altera assigned_to.';
CREATE INDEX IF NOT EXISTS idx_org_tasks_reviewer_id ON public.org_tasks(reviewer_id);

-- PASSO 2: novo enum value
ALTER TYPE public.fiscal_task_status ADD VALUE IF NOT EXISTS 'em_ajuste' AFTER 'review';

-- PASSO 3: recriar SELECT policy preservando o QUAL do 0.3 + ramo do revisor
DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select ON public.org_tasks
  FOR SELECT TO authenticated
  USING (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR ((project_id IS NOT NULL)
          AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
          AND can_view_org_project(auth.uid(), project_id))
      OR (assigned_to = auth.uid())
      OR (created_by = auth.uid())
    )
    OR reviewer_id = auth.uid()
  );

-- PASSO 4: trigger com '- reviewer_id' adicional (mudanca unica vs 0.4)
CREATE OR REPLACE FUNCTION public.org_tasks_team_member_status_only()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role_or_higher(auth.uid(),'sublider'::app_role) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id') THEN
    RAISE EXCEPTION 'team_member só pode alterar o status da própria tarefa (RLS-06)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

-- PASSO 5: GATE fail-safe
DO $$
DECLARE v_task uuid := '7779a346-5fba-4bd2-9f05-a84bdd198898';
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"2d1c60f5-ed90-40cd-a361-bb56ba3e1686","role":"authenticated"}', true);

  -- TESTE 1: team_member DELEGA (status=review + reviewer_id) -> DEVE PASSAR
  BEGIN
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'GATE_OK_1' THEN
      RAISE EXCEPTION 'GATE FALHOU (1): delegar bloqueado -> %', SQLERRM;
    END IF;
  END;

  -- TESTE 2: mudar title (campo proibido) -> DEVE CONTINUAR BLOQUEADO
  BEGIN
    UPDATE public.org_tasks SET title = title || ' [gate]' WHERE id = v_task;
    RAISE EXCEPTION 'GATE FALHOU (2): title mudou (afrouxou demais!)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'GATE FALHOU%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', true);
  RAISE NOTICE 'GATE OK: delegar (reviewer_id) liberado; title segue bloqueado.';
END $$;