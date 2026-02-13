
-- =====================================================
-- 1. AUDIT_LOGS: Restrict INSERT to admins only
-- Team members should NOT be able to insert audit logs directly
-- =====================================================
DROP POLICY IF EXISTS "Team members can insert audit_logs" ON public.audit_logs;

-- =====================================================
-- 2. PARTICIPANTE: Replace ALL policy with granular policies
-- Only admins get full CRUD, team members get SELECT only
-- =====================================================
DROP POLICY IF EXISTS "team_members_all_participante" ON public.participante;

CREATE POLICY "Team members can view participante"
  ON public.participante FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage participante"
  ON public.participante FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. PARTICIPANTE_DEV: Same treatment
-- =====================================================
DROP POLICY IF EXISTS "team_members_all_participante_dev" ON public.participante_dev;

CREATE POLICY "Team members can view participante_dev"
  ON public.participante_dev FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage participante_dev"
  ON public.participante_dev FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. PROFILES: Restrict team member SELECT to hide sensitive fields
-- Create a secure view that excludes email/phone for non-admin access
-- =====================================================

-- Create a view without sensitive fields for team member usage
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
  SELECT id, first_name, last_name, company, created_at, updated_at
  FROM public.profiles;

-- Drop the broad team member SELECT policy on profiles
DROP POLICY IF EXISTS "Team members can view all profiles" ON public.profiles;

-- Re-create a more restrictive team member policy: only view own profile
-- Admins keep full access, users keep own profile access (already exists)
-- Team members now must use profiles_safe view for listing other users
