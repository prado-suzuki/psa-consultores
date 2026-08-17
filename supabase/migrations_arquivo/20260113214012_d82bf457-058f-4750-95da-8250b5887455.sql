ALTER TABLE sprint_deliverables 
ADD COLUMN project_id uuid REFERENCES projects(id),
ADD COLUMN process_id uuid REFERENCES processes(id);

CREATE INDEX idx_sprint_deliverables_project ON sprint_deliverables(project_id);
CREATE INDEX idx_sprint_deliverables_process ON sprint_deliverables(process_id);