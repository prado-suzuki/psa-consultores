
-- Drop existing RESTRICTIVE policies on user_page_access
DROP POLICY IF EXISTS "Admins podem gerenciar acessos de usuário" ON public.user_page_access;
DROP POLICY IF EXISTS "Usuários podem ver próprias permissões" ON public.user_page_access;

-- Recreate as PERMISSIVE policies (OR logic)
CREATE POLICY "Admins podem gerenciar acessos de usuário"
ON public.user_page_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver próprias permissões"
ON public.user_page_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
