-- Adicionar colunas para SOP
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS sop_link text,
ADD COLUMN IF NOT EXISTS sop_document_path text;

-- Criar bucket para documentos SOP
INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-documents', 'sop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politicas de storage para membros da equipe
CREATE POLICY "Team members can read SOP documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sop-documents' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('team_member', 'admin'))
));

CREATE POLICY "Team members can upload SOP documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sop-documents' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('team_member', 'admin'))
));

CREATE POLICY "Team members can delete SOP documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sop-documents' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('team_member', 'admin'))
));