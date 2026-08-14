
-- Tabela de regras PIS/COFINS
CREATE TABLE public.pis_cofins_regra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_segmento TEXT NOT NULL,
  cod_ncm TEXT NOT NULL,
  cst_pis TEXT,
  cst_cofins TEXT,
  desc_cst TEXT,
  base_legal TEXT,
  permite_credito TEXT,
  tipo_credito TEXT,
  observacoes TEXT,
  data_vigencia_inicio BIGINT,
  data_vigencia_fim BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de classificações PIS/COFINS
CREATE TABLE public.pis_cofins_class (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_ncm TEXT,
  cod_produto TEXT,
  id_contribuinte UUID REFERENCES public.contribuinte(id),
  id_regra UUID REFERENCES public.pis_cofins_regra(id),
  classificado_por UUID REFERENCES public.profiles(id),
  classificado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pis_cofins_regra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pis_cofins_class ENABLE ROW LEVEL SECURITY;

-- Policies: acesso para team members e admins
CREATE POLICY "Team members can read pis_cofins_regra"
  ON public.pis_cofins_regra FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );

CREATE POLICY "Team members can insert pis_cofins_regra"
  ON public.pis_cofins_regra FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );

CREATE POLICY "Team members can update pis_cofins_regra"
  ON public.pis_cofins_regra FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );

CREATE POLICY "Team members can read pis_cofins_class"
  ON public.pis_cofins_class FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );

CREATE POLICY "Team members can insert pis_cofins_class"
  ON public.pis_cofins_class FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );

CREATE POLICY "Team members can update pis_cofins_class"
  ON public.pis_cofins_class FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'team_member') OR
    public.has_role(auth.uid(), 'lider') OR
    public.has_role(auth.uid(), 'sublider')
  );
