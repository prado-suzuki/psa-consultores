
-- 1. Create centros_custo table
CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read centros_custo" ON public.centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can manage centros_custo" ON public.centros_custo FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
);

-- 2. Create empresas_faturamento table
CREATE TABLE public.empresas_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.empresas_faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read empresas_faturamento" ON public.empresas_faturamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can manage empresas_faturamento" ON public.empresas_faturamento FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider')
);

-- 3. Add empresa_id to estrutura_clusters
ALTER TABLE public.estrutura_clusters ADD COLUMN empresa_id uuid REFERENCES public.empresas_faturamento(id);

-- 4. Add cost_center_id to estrutura_areas
ALTER TABLE public.estrutura_areas ADD COLUMN cost_center_id uuid REFERENCES public.centros_custo(id);

-- 5. Add estrutura_area_id to tax_projects
ALTER TABLE public.tax_projects ADD COLUMN estrutura_area_id uuid REFERENCES public.estrutura_areas(id);
