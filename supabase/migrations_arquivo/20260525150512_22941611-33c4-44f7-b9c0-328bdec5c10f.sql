
-- 1. Fix SECURITY DEFINER functions: pin search_path
CREATE OR REPLACE FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM estrutura_equipe_membros em
    JOIN estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE em.user_id = _user_id AND eq.area_id = _estrutura_area_id
    UNION ALL
    SELECT 1 FROM estrutura_equipes eq
    WHERE eq.gestor_id = _user_id AND eq.area_id = _estrutura_area_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM tickets
    WHERE id = p_ticket_id AND assigned_to = p_user_id
  );
$function$;

-- 2. Restrict novidades SELECT to internal users (team_member or higher)
DROP POLICY IF EXISTS "rls_novidades_select_active" ON public.novidades;
CREATE POLICY "rls_novidades_select_active"
ON public.novidades
FOR SELECT
TO authenticated
USING (ativo = true AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 3. Replace ticket-attachments INSERT policy to verify ownership/assignment of the ticket
DROP POLICY IF EXISTS "Users can upload to their ticket folder" ON storage.objects;
CREATE POLICY "Users can upload to their ticket folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (t.user_id = auth.uid() OR public.is_ticket_assigned_to(t.id, auth.uid()))
    )
  )
);

-- 4. Storage bucket 'documents': allow users to UPDATE/DELETE their own folder; admins anything
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can update any documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Storage bucket 'project-documents': add UPDATE policy for team members
CREATE POLICY "Team members can update project documents files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['team_member'::app_role, 'admin'::app_role])
  )
)
WITH CHECK (
  bucket_id = 'project-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['team_member'::app_role, 'admin'::app_role])
  )
);

-- 6. Storage bucket 'work-package-files': add UPDATE policy for team members
CREATE POLICY "Team members can update work package files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-package-files'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['team_member'::app_role, 'admin'::app_role])
  )
)
WITH CHECK (
  bucket_id = 'work-package-files'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['team_member'::app_role, 'admin'::app_role])
  )
);
