-- 1. Create tax_projects table
CREATE TABLE public.tax_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  external_client_id UUID REFERENCES public.cliente(id),
  responsible_id UUID REFERENCES public.profiles(id),
  leader_id UUID REFERENCES public.profiles(id),
  area TEXT,
  objective TEXT,
  categories TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.tax_projects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Team members can view tax_projects"
  ON public.tax_projects FOR SELECT
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create tax_projects"
  ON public.tax_projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update tax_projects"
  ON public.tax_projects FOR UPDATE
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tax_projects"
  ON public.tax_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- 4. Create trigger for updated_at
CREATE TRIGGER update_tax_projects_updated_at
  BEFORE UPDATE ON public.tax_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Migrate existing tax projects from projects table
INSERT INTO public.tax_projects (name, description, status, external_client_id, responsible_id, leader_id, area, objective, categories, start_date, end_date, created_by, created_at, updated_at)
SELECT name, description, status, external_client_id, responsible_id, leader_id, area, objective, categories, start_date, end_date, created_by, created_at, updated_at
FROM public.projects
WHERE source_area = 'tax';

-- 6. Delete migrated records from projects
DELETE FROM public.projects WHERE source_area = 'tax';

-- 7. Clean up projects table - remove Tax-specific columns
ALTER TABLE public.projects 
  DROP COLUMN IF EXISTS responsible_id,
  DROP COLUMN IF EXISTS leader_id,
  DROP COLUMN IF EXISTS external_client_id,
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS objective,
  DROP COLUMN IF EXISTS categories,
  DROP COLUMN IF EXISTS source_area;