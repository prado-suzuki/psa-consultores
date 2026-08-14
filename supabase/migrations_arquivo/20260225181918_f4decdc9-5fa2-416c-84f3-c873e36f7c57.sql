
-- Fix self-referencing parent_task_id (task pointing to itself)
UPDATE fiscal_tasks
SET parent_task_id = NULL
WHERE parent_task_id = id;

-- Add a CHECK constraint to prevent this from happening again
ALTER TABLE fiscal_tasks
ADD CONSTRAINT fiscal_tasks_no_self_parent CHECK (parent_task_id IS NULL OR parent_task_id != id);
