ALTER TABLE fiscal_tasks DROP CONSTRAINT fiscal_tasks_project_id_fkey;
ALTER TABLE fiscal_tasks ADD CONSTRAINT fiscal_tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES tax_projects(id) ON DELETE SET NULL;