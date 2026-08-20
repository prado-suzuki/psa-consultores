-- Add start_date column to sprint_deliverables
ALTER TABLE public.sprint_deliverables 
ADD COLUMN start_date date;

-- Backfill existing deliverables with sprint start_date
UPDATE public.sprint_deliverables sd
SET start_date = s.start_date
FROM public.sprints s
WHERE sd.sprint_id = s.id AND sd.start_date IS NULL;