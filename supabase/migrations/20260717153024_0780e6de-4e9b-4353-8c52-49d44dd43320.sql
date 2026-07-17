set local session_replication_role='replica';
update public.org_tasks
  set assigned_to='3f4870f5-cd37-4892-bcc9-c2bbfeb005a2',
      reviewer_id=null,
      status='todo'
  where id='64d76e32-24c0-49a8-a5eb-4cb8d9e6293d';
delete from public.org_task_comments where task_id='64d76e32-24c0-49a8-a5eb-4cb8d9e6293d' and created_at > now() - interval '30 min';
set local session_replication_role='origin';