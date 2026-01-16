-- Add project_id and process_id columns to daily_standups table
ALTER TABLE daily_standups
ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN process_id uuid REFERENCES processes(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_daily_standups_project_id ON daily_standups(project_id);
CREATE INDEX idx_daily_standups_process_id ON daily_standups(process_id);