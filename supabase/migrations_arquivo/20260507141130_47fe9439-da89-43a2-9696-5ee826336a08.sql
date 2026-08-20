ALTER TABLE public.org_projects
  ADD COLUMN IF NOT EXISTS is_multidisciplinar boolean NOT NULL DEFAULT false;