
-- 1. Criar tabelas de referência
CREATE TABLE public.tax_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL
);

CREATE TABLE public.tax_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL
);

CREATE TABLE public.tax_area_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.tax_areas(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.tax_categorias(id) ON DELETE CASCADE,
  UNIQUE(area_id, categoria_id)
);

-- 2. Criar tabela de vínculo projeto-categoria
CREATE TABLE public.tax_project_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.tax_projects(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES public.tax_categorias(id) ON DELETE RESTRICT,
  UNIQUE(project_id, categoria_id)
);

-- 3. Alterar tax_projects
ALTER TABLE public.tax_projects DROP COLUMN IF EXISTS area;
ALTER TABLE public.tax_projects DROP COLUMN IF EXISTS categories;
ALTER TABLE public.tax_projects ADD COLUMN area_id uuid REFERENCES public.tax_areas(id);

-- 4. RLS
ALTER TABLE public.tax_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_area_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_project_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view tax_areas" ON public.tax_areas FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tax_areas" ON public.tax_areas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view tax_categorias" ON public.tax_categorias FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tax_categorias" ON public.tax_categorias FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view tax_area_categorias" ON public.tax_area_categorias FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tax_area_categorias" ON public.tax_area_categorias FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view tax_project_categorias" ON public.tax_project_categorias FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can insert tax_project_categorias" ON public.tax_project_categorias FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can delete tax_project_categorias" ON public.tax_project_categorias FOR DELETE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Popular áreas
INSERT INTO public.tax_areas (nome) VALUES
  ('Fixos'),
  ('Pontuais'),
  ('Levantamento de Credito'),
  ('Societario'),
  ('Estudos e Pesquisas');

-- 6. Popular categorias (lista corrigida)
INSERT INTO public.tax_categorias (nome) VALUES
  ('Planejamento Tributário'),
  ('Diagnóstico Contábil e Tributário'),
  ('IRPJ/CSLL'),
  ('IRPF'),
  ('Revisão Contábil'),
  ('Revisão PIS/COFINS'),
  ('Revisão IRPJ/CSLL'),
  ('Revisão Controle de Depreciação (ECF)'),
  ('Memória de Cálculo IRPJ/CSLL'),
  ('Análise Contábil'),
  ('Contabilização por Equivalência Patrimonial'),
  ('Revisão Societária'),
  ('Estudo Migração PF para PJ'),
  ('Estudo Alterações PATDF'),
  ('Consultoria Tributária'),
  ('Revisão Fiscal'),
  ('Due Diligence Tributária'),
  ('Contencioso Administrativo'),
  ('Contencioso Judicial'),
  ('Treinamentos e Capacitações'),
  ('Atendimento a Fiscalizações'),
  ('Análise de Benefícios Fiscais'),
  ('Pareceres Técnicos'),
  ('Outros'),
  ('Recuperação de Créditos PIS/COFINS'),
  ('Recuperação de Créditos ICMS'),
  ('Recuperação de Créditos IPI'),
  ('Recuperação de Créditos IRPJ/CSLL'),
  ('Compensações e Restituições (PER/DCOMP)'),
  ('Levantamento de Créditos Tributários'),
  ('Reestruturação Societária'),
  ('Fusão / Cisão / Incorporação'),
  ('Sucessão Familiar'),
  ('Due Diligence Fiscal'),
  ('Constituição de Empresa'),
  ('Encerramento / Liquidação'),
  ('Reforma Tributária'),
  ('Treinamentos TAX'),
  ('Comunicados'),
  ('Administradora Judicial'),
  ('Análise Tributária'),
  ('Simulação — Reforma Tributária');

-- 7. Vínculos área-categoria
-- Fixos
INSERT INTO public.tax_area_categorias (area_id, categoria_id)
SELECT a.id, c.id FROM public.tax_areas a, public.tax_categorias c
WHERE a.nome = 'Fixos' AND c.nome IN (
  'Planejamento Tributário','Diagnóstico Contábil e Tributário','IRPJ/CSLL','IRPF',
  'Revisão Contábil','Revisão PIS/COFINS','Revisão IRPJ/CSLL',
  'Revisão Controle de Depreciação (ECF)','Memória de Cálculo IRPJ/CSLL',
  'Análise Contábil','Contabilização por Equivalência Patrimonial',
  'Revisão Societária','Estudo Migração PF para PJ','Estudo Alterações PATDF'
);

-- Pontuais
INSERT INTO public.tax_area_categorias (area_id, categoria_id)
SELECT a.id, c.id FROM public.tax_areas a, public.tax_categorias c
WHERE a.nome = 'Pontuais' AND c.nome IN (
  'Planejamento Tributário','Diagnóstico Contábil e Tributário',
  'Revisão IRPJ/CSLL','Consultoria Tributária','Revisão Fiscal',
  'Due Diligence Tributária','Contencioso Administrativo','Contencioso Judicial',
  'Treinamentos e Capacitações','Atendimento a Fiscalizações',
  'Análise de Benefícios Fiscais','Pareceres Técnicos','Outros'
);

-- Levantamento de Crédito
INSERT INTO public.tax_area_categorias (area_id, categoria_id)
SELECT a.id, c.id FROM public.tax_areas a, public.tax_categorias c
WHERE a.nome = 'Levantamento de Credito' AND c.nome IN (
  'Recuperação de Créditos PIS/COFINS','Recuperação de Créditos ICMS',
  'Recuperação de Créditos IPI','Recuperação de Créditos IRPJ/CSLL',
  'Compensações e Restituições (PER/DCOMP)','Análise de Benefícios Fiscais',
  'Levantamento de Créditos Tributários','Revisão Fiscal','Outros'
);

-- Societário
INSERT INTO public.tax_area_categorias (area_id, categoria_id)
SELECT a.id, c.id FROM public.tax_areas a, public.tax_categorias c
WHERE a.nome = 'Societario' AND c.nome IN (
  'Reestruturação Societária','Fusão / Cisão / Incorporação','Sucessão Familiar',
  'Due Diligence Fiscal','Constituição de Empresa','Encerramento / Liquidação'
);

-- Estudos e Pesquisas
INSERT INTO public.tax_area_categorias (area_id, categoria_id)
SELECT a.id, c.id FROM public.tax_areas a, public.tax_categorias c
WHERE a.nome = 'Estudos e Pesquisas' AND c.nome IN (
  'Reforma Tributária','Treinamentos TAX','Comunicados','Administradora Judicial',
  'Análise Tributária','Simulação — Reforma Tributária','Pareceres Técnicos','Outros'
);
