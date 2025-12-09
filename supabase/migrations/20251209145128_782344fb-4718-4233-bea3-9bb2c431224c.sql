-- Add estimated_hours column to sprint_deliverables
ALTER TABLE public.sprint_deliverables 
ADD COLUMN estimated_hours numeric;