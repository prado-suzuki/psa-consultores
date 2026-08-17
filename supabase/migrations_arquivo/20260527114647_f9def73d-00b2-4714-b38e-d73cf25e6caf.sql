
CREATE POLICY "Team members can update deliverable files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'deliverable-attachments' AND has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (bucket_id = 'deliverable-attachments' AND has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "Team members can update SOP documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sop-documents' AND has_role_or_higher(auth.uid(), 'team_member'::app_role))
WITH CHECK (bucket_id = 'sop-documents' AND has_role_or_higher(auth.uid(), 'team_member'::app_role));
