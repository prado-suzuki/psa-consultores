-- Add new columns to routines table for demands functionality
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS due_date date;

-- Update existing routines to be recurring (they were all routines before)
UPDATE public.routines SET is_recurring = true WHERE is_recurring IS NULL;

-- Create demand_items table for sub-demands
CREATE TABLE public.demand_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  status text DEFAULT 'pending',
  assigned_to uuid,
  estimated_hours numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on demand_items
ALTER TABLE public.demand_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for demand_items
CREATE POLICY "Team members can view demand items"
ON public.demand_items
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create demand items"
ON public.demand_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update demand items"
ON public.demand_items
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demand items"
ON public.demand_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on demand_items
CREATE TRIGGER update_demand_items_updated_at
BEFORE UPDATE ON public.demand_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();