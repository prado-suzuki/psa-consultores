
-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage participante" ON public.participante;
DROP POLICY IF EXISTS "Team members can view participante" ON public.participante;

-- SELECT
CREATE POLICY "Team can view participante"
  ON public.participante FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'sublider'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- INSERT
CREATE POLICY "Team can insert participante"
  ON public.participante FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'sublider'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- UPDATE
CREATE POLICY "Team can update participante"
  ON public.participante FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'sublider'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- DELETE (apenas admin e lider)
CREATE POLICY "Leaders can delete participante"
  ON public.participante FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
  );
