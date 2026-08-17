-- Create storage bucket for deliverable attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverable-attachments', 'deliverable-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create deliverable_attachments table
CREATE TABLE public.deliverable_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES public.sprint_deliverables(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deliverable_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team members and admins
CREATE POLICY "Team members can view deliverable attachments"
ON public.deliverable_attachments
FOR SELECT
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can upload deliverable attachments"
ON public.deliverable_attachments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can delete deliverable attachments"
ON public.deliverable_attachments
FOR DELETE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Storage policies for deliverable-attachments bucket
CREATE POLICY "Team members can view deliverable files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deliverable-attachments' AND (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Team members can upload deliverable files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'deliverable-attachments' AND (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Team members can delete deliverable files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'deliverable-attachments' AND (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin')));