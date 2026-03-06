-- fiscal_task_comments.user_id → SET NULL
ALTER TABLE public.fiscal_task_comments DROP CONSTRAINT fiscal_task_comments_user_id_fkey;
ALTER TABLE public.fiscal_task_comments ADD CONSTRAINT fiscal_task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- fiscal_tasks.created_by → SET NULL
ALTER TABLE public.fiscal_tasks DROP CONSTRAINT fiscal_tasks_created_by_fkey;
ALTER TABLE public.fiscal_tasks ADD CONSTRAINT fiscal_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- fiscal_tasks.assigned_to → SET NULL
ALTER TABLE public.fiscal_tasks DROP CONSTRAINT fiscal_tasks_assigned_to_fkey;
ALTER TABLE public.fiscal_tasks ADD CONSTRAINT fiscal_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- improvement_team_members.profile_id → CASCADE
ALTER TABLE public.improvement_team_members DROP CONSTRAINT improvement_team_members_profile_id_fkey;
ALTER TABLE public.improvement_team_members ADD CONSTRAINT improvement_team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- process_improvements.evaluated_by → SET NULL
ALTER TABLE public.process_improvements DROP CONSTRAINT process_improvements_evaluated_by_fkey;
ALTER TABLE public.process_improvements ADD CONSTRAINT process_improvements_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- project_work_packages.assigned_to → SET NULL
ALTER TABLE public.project_work_packages DROP CONSTRAINT project_work_packages_assigned_to_fkey;
ALTER TABLE public.project_work_packages ADD CONSTRAINT project_work_packages_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- project_work_packages.responsible → SET NULL
ALTER TABLE public.project_work_packages DROP CONSTRAINT project_work_packages_responsible_fkey;
ALTER TABLE public.project_work_packages ADD CONSTRAINT project_work_packages_responsible_fkey FOREIGN KEY (responsible) REFERENCES profiles(id) ON DELETE SET NULL;

-- project_work_packages.created_by → SET NULL
ALTER TABLE public.project_work_packages DROP CONSTRAINT project_work_packages_created_by_fkey;
ALTER TABLE public.project_work_packages ADD CONSTRAINT project_work_packages_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- projects.leader_id → SET NULL
ALTER TABLE public.projects DROP CONSTRAINT projects_leader_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- routines.assigned_to → SET NULL
ALTER TABLE public.routines DROP CONSTRAINT routines_assigned_to_fkey;
ALTER TABLE public.routines ADD CONSTRAINT routines_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- routines.created_by → SET NULL
ALTER TABLE public.routines DROP CONSTRAINT routines_created_by_fkey;
ALTER TABLE public.routines ADD CONSTRAINT routines_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- sprint_backlog_items.suggested_by → SET NULL
ALTER TABLE public.sprint_backlog_items DROP CONSTRAINT sprint_backlog_items_suggested_by_fkey;
ALTER TABLE public.sprint_backlog_items ADD CONSTRAINT sprint_backlog_items_suggested_by_fkey FOREIGN KEY (suggested_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- sprint_deliverables.assigned_to → SET NULL
ALTER TABLE public.sprint_deliverables DROP CONSTRAINT sprint_deliverables_assigned_to_fkey;
ALTER TABLE public.sprint_deliverables ADD CONSTRAINT sprint_deliverables_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- tax_projects.leader_id → SET NULL
ALTER TABLE public.tax_projects DROP CONSTRAINT tax_projects_leader_id_fkey;
ALTER TABLE public.tax_projects ADD CONSTRAINT tax_projects_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- tax_projects.responsible_id → SET NULL
ALTER TABLE public.tax_projects DROP CONSTRAINT tax_projects_responsible_id_fkey;
ALTER TABLE public.tax_projects ADD CONSTRAINT tax_projects_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- tax_projects.created_by → SET NULL
ALTER TABLE public.tax_projects DROP CONSTRAINT tax_projects_created_by_fkey;
ALTER TABLE public.tax_projects ADD CONSTRAINT tax_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ticket_attachments.uploaded_by → SET NULL
ALTER TABLE public.ticket_attachments DROP CONSTRAINT ticket_attachments_uploaded_by_fkey;
ALTER TABLE public.ticket_attachments ADD CONSTRAINT ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- tickets.assigned_to → SET NULL
ALTER TABLE public.tickets DROP CONSTRAINT tickets_assigned_to_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- work_package_activities.user_id → SET NULL
ALTER TABLE public.work_package_activities DROP CONSTRAINT work_package_activities_user_id_fkey;
ALTER TABLE public.work_package_activities ADD CONSTRAINT work_package_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- work_package_files.uploaded_by → SET NULL
ALTER TABLE public.work_package_files DROP CONSTRAINT work_package_files_uploaded_by_fkey;
ALTER TABLE public.work_package_files ADD CONSTRAINT work_package_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- work_package_relations.created_by → SET NULL
ALTER TABLE public.work_package_relations DROP CONSTRAINT work_package_relations_created_by_fkey;
ALTER TABLE public.work_package_relations ADD CONSTRAINT work_package_relations_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- work_package_watchers.user_id → CASCADE
ALTER TABLE public.work_package_watchers DROP CONSTRAINT work_package_watchers_user_id_fkey;
ALTER TABLE public.work_package_watchers ADD CONSTRAINT work_package_watchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;