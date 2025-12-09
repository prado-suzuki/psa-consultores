-- Add assigned_to column to store which agent is assigned to the ticket
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id);

-- Add activity_status column to track ticket activity
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS activity_status text DEFAULT 'aguardando_resposta';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_activity_status ON public.tickets(activity_status);