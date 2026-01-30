-- Create table for client visible projects (links portal users to internal projects)
CREATE TABLE public.client_visible_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visible_since timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, project_id)
);

-- Create table for client documents/dashboards
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('dashboard', 'documento')),
  name text NOT NULL,
  description text,
  url text,
  file_path text,
  file_name text,
  file_size bigint,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.client_visible_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_visible_projects
CREATE POLICY "Clients can view their assigned projects"
  ON public.client_visible_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can manage project assignments"
  ON public.client_visible_projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for client_documents
CREATE POLICY "Clients can view their documents"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can manage client documents"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for projects table so clients can read projects assigned to them
CREATE POLICY "Clients can view projects assigned to them"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_visible_projects cvp
      WHERE cvp.project_id = projects.id
      AND cvp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'team_member')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Create trigger for updated_at on client_documents
CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();