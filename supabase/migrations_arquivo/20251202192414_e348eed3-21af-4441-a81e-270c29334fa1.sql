-- Create routines table for persistent routine data
CREATE TABLE public.routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'daily',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.profiles(id),
  estimated_hours numeric,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team members
CREATE POLICY "Team members can view routines"
ON public.routines
FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create routines"
ON public.routines
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update routines"
ON public.routines
FOR UPDATE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete routines"
ON public.routines
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_routines_updated_at
BEFORE UPDATE ON public.routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();