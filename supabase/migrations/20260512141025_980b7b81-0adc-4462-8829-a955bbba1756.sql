ALTER TABLE public.fiscal_tasks RENAME TO org_tasks;
ALTER TABLE public.fiscal_task_comments RENAME TO org_task_comments;

ALTER INDEX fiscal_tasks_pkey RENAME TO org_tasks_pkey;
ALTER INDEX fiscal_task_comments_pkey RENAME TO org_task_comments_pkey;
ALTER INDEX idx_fiscal_tasks_project_id RENAME TO idx_org_tasks_project_id;
ALTER INDEX idx_fiscal_tasks_client_id RENAME TO idx_org_tasks_client_id;

ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_parent_task_id_fkey TO org_tasks_parent_task_id_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_assigned_to_fkey TO org_tasks_assigned_to_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_created_by_fkey TO org_tasks_created_by_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_project_id_fkey TO org_tasks_project_id_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_client_id_fkey TO org_tasks_client_id_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_contribuinte_id_fkey TO org_tasks_contribuinte_id_fkey;
ALTER TABLE public.org_tasks RENAME CONSTRAINT fiscal_tasks_categoria_id_fkey TO org_tasks_categoria_id_fkey;
ALTER TABLE public.org_task_comments RENAME CONSTRAINT fiscal_task_comments_task_id_fkey TO org_task_comments_task_id_fkey;
ALTER TABLE public.org_task_comments RENAME CONSTRAINT fiscal_task_comments_user_id_fkey TO org_task_comments_user_id_fkey;

ALTER TRIGGER update_fiscal_tasks_updated_at ON public.org_tasks RENAME TO update_org_tasks_updated_at;

ALTER POLICY rls_fiscal_tasks_select ON public.org_tasks RENAME TO rls_org_tasks_select;
ALTER POLICY rls_fiscal_tasks_insert ON public.org_tasks RENAME TO rls_org_tasks_insert;
ALTER POLICY rls_fiscal_tasks_update ON public.org_tasks RENAME TO rls_org_tasks_update;
ALTER POLICY rls_fiscal_tasks_delete ON public.org_tasks RENAME TO rls_org_tasks_delete;
ALTER POLICY rls_fiscal_task_comments_insert ON public.org_task_comments RENAME TO rls_org_task_comments_insert;
ALTER POLICY rls_fiscal_task_comments_update ON public.org_task_comments RENAME TO rls_org_task_comments_update;
ALTER POLICY rls_fiscal_task_comments_delete ON public.org_task_comments RENAME TO rls_org_task_comments_delete;
ALTER POLICY "Team members can view fiscal task comments" ON public.org_task_comments RENAME TO "Team members can view org task comments";