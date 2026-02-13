
-- 1. Create junction table FIRST
CREATE TABLE public.tax_project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tax_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.tax_project_members ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function AFTER table exists
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tax_project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;

-- 3. RLS for tax_project_members
CREATE POLICY "Admins can manage tax_project_members"
ON public.tax_project_members FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their project members"
ON public.tax_project_members FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Team members can insert project members"
ON public.tax_project_members FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can delete project members"
ON public.tax_project_members FOR DELETE
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- 4. Replace tax_projects RLS policies
DROP POLICY IF EXISTS "Team members can view tax_projects" ON public.tax_projects;
DROP POLICY IF EXISTS "Team members can update tax_projects" ON public.tax_projects;

CREATE POLICY "Admins can view all tax_projects"
ON public.tax_projects FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their tax_projects"
ON public.tax_projects FOR SELECT
USING (is_project_member(auth.uid(), id));

CREATE POLICY "Members can update their tax_projects"
ON public.tax_projects FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_project_member(auth.uid(), id));

-- 5. Replace fiscal_tasks RLS policies
DROP POLICY IF EXISTS "Team members can view fiscal tasks" ON public.fiscal_tasks;
DROP POLICY IF EXISTS "Team members can update fiscal tasks" ON public.fiscal_tasks;

CREATE POLICY "Admins can view all fiscal_tasks"
ON public.fiscal_tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their project fiscal_tasks"
ON public.fiscal_tasks FOR SELECT
USING (
  project_id IS NULL
  OR is_project_member(auth.uid(), project_id)
);

CREATE POLICY "Members can update their project fiscal_tasks"
ON public.fiscal_tasks FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  OR project_id IS NULL
  OR is_project_member(auth.uid(), project_id)
);
