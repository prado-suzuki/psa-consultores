
-- 1. Clusters
CREATE TABLE public.estrutura_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  cost_center TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estrutura_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clusters"
  ON public.estrutura_clusters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lider can manage clusters"
  ON public.estrutura_clusters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));

CREATE TRIGGER update_estrutura_clusters_updated_at
  BEFORE UPDATE ON public.estrutura_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Areas
CREATE TABLE public.estrutura_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, name)
);

ALTER TABLE public.estrutura_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read areas"
  ON public.estrutura_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lider can manage areas"
  ON public.estrutura_areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));

CREATE TRIGGER update_estrutura_areas_updated_at
  BEFORE UPDATE ON public.estrutura_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Area leaders
CREATE TABLE public.estrutura_area_lideres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.estrutura_areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(area_id)
);

ALTER TABLE public.estrutura_area_lideres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read area lideres"
  ON public.estrutura_area_lideres FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lider can manage area lideres"
  ON public.estrutura_area_lideres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));

-- 4. Teams
CREATE TABLE public.estrutura_equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.estrutura_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sublider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estrutura_equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read equipes"
  ON public.estrutura_equipes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lider can manage equipes"
  ON public.estrutura_equipes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));

-- 5. Team members
CREATE TABLE public.estrutura_equipe_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id UUID NOT NULL REFERENCES public.estrutura_equipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipe_id, user_id)
);

ALTER TABLE public.estrutura_equipe_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read equipe membros"
  ON public.estrutura_equipe_membros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and lider can manage equipe membros"
  ON public.estrutura_equipe_membros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));
