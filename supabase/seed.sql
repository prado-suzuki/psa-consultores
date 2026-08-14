-- Seed local. Roda automaticamente no fim de todo `supabase db reset`.
--
-- Não contém dados de cliente: só a infraestrutura de storage que o app espera
-- encontrar (buckets e as policies de storage.objects), copiada de produção.
-- O bucket database_export_* foi deixado de fora de propósito: é artefato do
-- export do Lovable, não do app.

insert into storage.buckets (id, name, public) values
  ('comment-attachments',     'comment-attachments',     false),
  ('deliverable-attachments', 'deliverable-attachments', false),
  ('documents',               'documents',               false),
  ('osg-apresentacoes',       'osg-apresentacoes',       false),
  ('osg-templates',           'osg-templates',           false),
  ('project-documents',       'project-documents',       false),
  ('sop-documents',           'sop-documents',           false),
  ('ticket-attachments',      'ticket-attachments',      false),
  ('work-package-files',      'work-package-files',      false)
on conflict (id) do nothing;


-- RLS em storage.objects já vem ligada pela própria stack local, e postgres não é
-- dono da tabela, então não dá (nem precisa) reafirmar aqui.

-- Policies de storage.objects, extraídas do mesmo dump que gerou o baseline.
-- Os drops deixam o seed reaplicável sem precisar de reset.
drop policy if exists "Admins can delete any documents" on storage.objects;
drop policy if exists "Admins can delete project documents files" on storage.objects;
drop policy if exists "Admins can update any documents" on storage.objects;
drop policy if exists "Admins can upload any documents" on storage.objects;
drop policy if exists "Admins can view all documents" on storage.objects;
drop policy if exists "Admins can view all ticket attachments" on storage.objects;
drop policy if exists "Team members can delete SOP documents" on storage.objects;
drop policy if exists "Team members can delete deliverable files" on storage.objects;
drop policy if exists "Team members can delete work package files" on storage.objects;
drop policy if exists "Team members can read SOP documents" on storage.objects;
drop policy if exists "Team members can update SOP documents" on storage.objects;
drop policy if exists "Team members can update deliverable files" on storage.objects;
drop policy if exists "Team members can update project documents files" on storage.objects;
drop policy if exists "Team members can update work package files" on storage.objects;
drop policy if exists "Team members can upload SOP documents" on storage.objects;
drop policy if exists "Team members can upload deliverable files" on storage.objects;
drop policy if exists "Team members can upload project documents files" on storage.objects;
drop policy if exists "Team members can upload work package files" on storage.objects;
drop policy if exists "Team members can view deliverable files" on storage.objects;
drop policy if exists "Team members can view project documents files" on storage.objects;
drop policy if exists "Team members can view work package files" on storage.objects;
drop policy if exists "Ticket attachments delete by team" on storage.objects;
drop policy if exists "Ticket attachments select scoped" on storage.objects;
drop policy if exists "Users can delete their own documents" on storage.objects;
drop policy if exists "Users can update their own documents" on storage.objects;
drop policy if exists "Users can upload their own documents" on storage.objects;
drop policy if exists "Users can upload to their ticket folder" on storage.objects;
drop policy if exists "Users can view their own documents" on storage.objects;
drop policy if exists comment_attachments_storage_delete on storage.objects;
drop policy if exists comment_attachments_storage_insert on storage.objects;
drop policy if exists comment_attachments_storage_select on storage.objects;
drop policy if exists osg_apresentacoes_select_internal on storage.objects;
drop policy if exists osg_apresentacoes_write_internal on storage.objects;
drop policy if exists osg_templates_select_internal on storage.objects;
drop policy if exists osg_templates_write_admin on storage.objects;

CREATE POLICY "Admins can delete any documents" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'documents'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: objects Admins can delete project documents files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Admins can delete project documents files" ON storage.objects FOR DELETE USING (((bucket_id = 'project-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));


-- Name: objects Admins can update any documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Admins can update any documents" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'documents'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((bucket_id = 'documents'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: objects Admins can upload any documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Admins can upload any documents" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'documents'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: objects Admins can view all documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT USING (((bucket_id = 'documents'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: objects Admins can view all ticket attachments; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Admins can view all ticket attachments" ON storage.objects FOR SELECT USING (((bucket_id = 'ticket-attachments'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: objects Team members can delete SOP documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can delete SOP documents" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'sop-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can delete deliverable files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can delete deliverable files" ON storage.objects FOR DELETE USING (((bucket_id = 'deliverable-attachments'::text) AND (public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


-- Name: objects Team members can delete work package files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can delete work package files" ON storage.objects FOR DELETE USING (((bucket_id = 'work-package-files'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));


-- Name: objects Team members can read SOP documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can read SOP documents" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'sop-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can update SOP documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can update SOP documents" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'sop-documents'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role))) WITH CHECK (((bucket_id = 'sop-documents'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects Team members can update deliverable files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can update deliverable files" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'deliverable-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role))) WITH CHECK (((bucket_id = 'deliverable-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects Team members can update project documents files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can update project documents files" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'project-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role]))))))) WITH CHECK (((bucket_id = 'project-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can update work package files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can update work package files" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'work-package-files'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role]))))))) WITH CHECK (((bucket_id = 'work-package-files'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can upload SOP documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can upload SOP documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'sop-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can upload deliverable files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can upload deliverable files" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'deliverable-attachments'::text) AND (public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


-- Name: objects Team members can upload project documents files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can upload project documents files" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'project-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can upload work package files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can upload work package files" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'work-package-files'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can view deliverable files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can view deliverable files" ON storage.objects FOR SELECT USING (((bucket_id = 'deliverable-attachments'::text) AND (public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


-- Name: objects Team members can view project documents files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can view project documents files" ON storage.objects FOR SELECT USING (((bucket_id = 'project-documents'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Team members can view work package files; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Team members can view work package files" ON storage.objects FOR SELECT USING (((bucket_id = 'work-package-files'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['team_member'::public.app_role, 'admin'::public.app_role])))))));


-- Name: objects Ticket attachments delete by team; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Ticket attachments delete by team" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'ticket-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects Ticket attachments select scoped; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Ticket attachments select scoped" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'ticket-attachments'::text) AND (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE (((t.id)::text = (storage.foldername(objects.name))[1]) AND ((t.user_id = auth.uid()) OR public.is_ticket_assigned_to(t.id, auth.uid()))))))));


-- Name: objects Users can delete their own documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (EXISTS ( SELECT 1
   FROM public.documents d
  WHERE ((d.file_path = objects.name) AND (d.user_id = auth.uid()))))));


-- Name: objects Users can update their own documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (EXISTS ( SELECT 1
   FROM public.documents d
  WHERE ((d.file_path = objects.name) AND (d.user_id = auth.uid())))))) WITH CHECK (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (EXISTS ( SELECT 1
   FROM public.documents d
  WHERE ((d.file_path = objects.name) AND (d.user_id = auth.uid()))))));


-- Name: objects Users can upload their own documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


-- Name: objects Users can upload to their ticket folder; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Users can upload to their ticket folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'ticket-attachments'::text) AND (auth.uid() IS NOT NULL) AND (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE (((t.id)::text = (storage.foldername(objects.name))[1]) AND ((t.user_id = auth.uid()) OR public.is_ticket_assigned_to(t.id, auth.uid()))))))));


-- Name: objects Users can view their own documents; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (EXISTS ( SELECT 1
   FROM public.documents d
  WHERE ((d.file_path = objects.name) AND (d.user_id = auth.uid()))))));


-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: objects comment_attachments_storage_delete; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY comment_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'comment-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects comment_attachments_storage_insert; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY comment_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'comment-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects comment_attachments_storage_select; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY comment_attachments_storage_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'comment-attachments'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: objects osg_apresentacoes_select_internal; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY osg_apresentacoes_select_internal ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'osg-apresentacoes'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects osg_apresentacoes_write_internal; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY osg_apresentacoes_write_internal ON storage.objects TO authenticated USING (((bucket_id = 'osg-apresentacoes'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role))) WITH CHECK (((bucket_id = 'osg-apresentacoes'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects osg_templates_select_internal; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY osg_templates_select_internal ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'osg-templates'::text) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


-- Name: objects osg_templates_write_admin; Type: POLICY; Schema: storage; Owner: -

CREATE POLICY osg_templates_write_admin ON storage.objects TO authenticated USING (((bucket_id = 'osg-templates'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((bucket_id = 'osg-templates'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -


-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -


-- PostgreSQL database dump complete


