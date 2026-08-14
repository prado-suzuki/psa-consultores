-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments from their own tickets
CREATE POLICY "Users can view their ticket attachments"
ON public.ticket_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_attachments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

-- Users can upload attachments to their own tickets
CREATE POLICY "Users can upload to their tickets"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_attachments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

-- Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
ON public.ticket_attachments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can upload attachments
CREATE POLICY "Admins can upload attachments"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for ticket-attachments bucket
CREATE POLICY "Users can upload to their ticket folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their ticket attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can view all ticket attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  has_role(auth.uid(), 'admin'::app_role)
);