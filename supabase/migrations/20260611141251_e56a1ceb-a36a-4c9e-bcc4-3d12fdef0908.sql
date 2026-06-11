DROP POLICY IF EXISTS "Admins can manage job roles" ON public.job_roles;

CREATE POLICY "Lider e admin podem gerenciar job_roles"
ON public.job_roles
FOR ALL
TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));