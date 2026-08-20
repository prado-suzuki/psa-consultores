DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;

CREATE POLICY rls_org_tasks_insert ON public.org_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    OR assigned_to = auth.uid()
    OR (
      created_by = auth.uid()
      AND parent_task_id IS NOT NULL
      AND public.org_task_visivel(parent_task_id)
    )
  );

COMMENT ON POLICY rls_org_tasks_insert ON public.org_tasks IS
  'Cria tarefa: admin, sublider ou acima, ou quem sera o responsavel. O criador tambem cria, mas so subtarefa de tarefa que ele ja ve (destrava a criacao rapida da secao Subtarefas para team_member).';