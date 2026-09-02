-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827154935, nome `projeto_restrito_vinculado_ve_tudo` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;
CREATE POLICY rls_org_tasks_select
  ON public.org_tasks FOR SELECT TO authenticated
  USING (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        project_id IS NOT NULL
        AND (has_role(auth.uid(), 'lider'::app_role) OR has_role(auth.uid(), 'sublider'::app_role))
        AND can_view_org_project(auth.uid(), project_id)
      )
      OR assigned_to = auth.uid()
      OR created_by  = auth.uid()
      OR (reviewer_id = auth.uid() AND status = 'review'::fiscal_task_status)
      OR (project_restricted AND is_project_member(auth.uid(), project_id))
    )
    AND (
      NOT project_restricted
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_project_member(auth.uid(), project_id)
    )
  );

CREATE OR REPLACE FUNCTION public.org_task_visivel(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_tasks t
    WHERE t.id = p_task_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          (NOT t.project_restricted OR public.is_project_member(auth.uid(), t.project_id))
          AND (
            (
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
            OR (t.project_restricted AND public.is_project_member(auth.uid(), t.project_id))
          )
        )
      )
  );
$function$;
