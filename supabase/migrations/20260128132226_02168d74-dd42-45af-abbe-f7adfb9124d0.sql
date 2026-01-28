-- Fix 1: job_roles - Drop overly permissive SELECT policy and create proper one
DROP POLICY IF EXISTS "Team members can view job roles" ON public.job_roles;

CREATE POLICY "Team members can view job roles"
ON public.job_roles
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: contatos - Add RLS policy to restrict SELECT to team/admin only
-- First, ensure RLS is enabled
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Drop any existing public SELECT policy if it exists
DROP POLICY IF EXISTS "Qualquer pessoa pode ver contatos" ON public.contatos;
DROP POLICY IF EXISTS "Public can view contatos" ON public.contatos;

-- Create restrictive SELECT policy - only team members and admins can view
CREATE POLICY "Team members and admins can view contatos"
ON public.contatos
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));