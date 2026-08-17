
-- === Finding 1: profiles_safe SECURITY DEFINER view -> SECURITY INVOKER wrapping a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.list_profiles_safe()
RETURNS TABLE(id uuid, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE public.has_role_or_higher(auth.uid(), 'team_member'::app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.list_profiles_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_profiles_safe() TO authenticated, service_role;

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = true, security_barrier = true)
AS SELECT id, first_name, last_name FROM public.list_profiles_safe();

REVOKE ALL ON public.profiles_safe FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT ALL    ON public.profiles_safe TO service_role;

-- === Finding 3: gargalo_melhorias / gargalo_etapas policies scoped to authenticated
DROP POLICY IF EXISTS "Team members can read gargalo_etapas" ON public.gargalo_etapas;
DROP POLICY IF EXISTS "Team members can write gargalo_etapas" ON public.gargalo_etapas;
CREATE POLICY "Team members can read gargalo_etapas"
  ON public.gargalo_etapas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can write gargalo_etapas"
  ON public.gargalo_etapas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Team members can read gargalo_melhorias" ON public.gargalo_melhorias;
DROP POLICY IF EXISTS "Team members can write gargalo_melhorias" ON public.gargalo_melhorias;
CREATE POLICY "Team members can read gargalo_melhorias"
  ON public.gargalo_melhorias FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can write gargalo_melhorias"
  ON public.gargalo_melhorias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- === Finding 2: documents bucket ownership - add join-based validation against public.documents
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND d.user_id = auth.uid()
    )
  );
