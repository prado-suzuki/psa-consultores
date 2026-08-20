
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Team members can manage inscricoes" ON public.inscricao_contribuinte;

-- Create role-restricted policies
CREATE POLICY "Team and admin can select inscricoes"
ON public.inscricao_contribuinte FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Team and admin can insert inscricoes"
ON public.inscricao_contribuinte FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Team and admin can update inscricoes"
ON public.inscricao_contribuinte FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Team and admin can delete inscricoes"
ON public.inscricao_contribuinte FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);
