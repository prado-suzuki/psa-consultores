-- Add parent_id and task_code columns to sprint_deliverables for task/subtask hierarchy
ALTER TABLE sprint_deliverables ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES sprint_deliverables(id) ON DELETE CASCADE;
ALTER TABLE sprint_deliverables ADD COLUMN IF NOT EXISTS task_code text;

-- Create index for faster hierarchy queries
CREATE INDEX IF NOT EXISTS idx_deliverables_parent ON sprint_deliverables(parent_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_task_code ON sprint_deliverables(task_code);