-- Migra os eventos legados para a thread unificada. A tabela antiga permanece
-- temporariamente para rollback operacional, mas o frontend deixa de gravá-la.
INSERT INTO public.org_comments (
  id,
  entity_type,
  entity_id,
  project_id,
  kind,
  body,
  author_id,
  author_name,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  'org_task'::public.org_comment_entity,
  legacy.task_id,
  task.project_id,
  CASE
    WHEN legacy.comment LIKE 'Tarefa reatribuída%' THEN 'assignment_changed'
    WHEN legacy.comment LIKE 'Enviado para revisão%' THEN 'review_submitted'
    WHEN legacy.comment = 'Tarefa aprovada' THEN 'review_approved'
    WHEN legacy.comment LIKE 'Devolvido para ajustes%' THEN 'review_adjustments'
    ELSE 'comment'
  END::public.org_comment_kind,
  legacy.comment,
  legacy.user_id,
  legacy.user_name,
  COALESCE(legacy.created_at, now()),
  COALESCE(legacy.created_at, now())
FROM public.org_task_comments legacy
JOIN public.org_tasks         task ON task.id = legacy.task_id
ON CONFLICT (id) DO NOTHING;
