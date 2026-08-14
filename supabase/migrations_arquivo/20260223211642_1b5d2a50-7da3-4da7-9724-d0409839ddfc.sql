
-- 1. Criar tabela contrato_dev (espelho de contrato, FK para cliente_dev)
CREATE TABLE public.contrato_dev (
  id_contrato uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_cliente uuid NOT NULL REFERENCES public.cliente_dev(id),
  numero_contrato text,
  tipo_contrato text,
  valor_fixo numeric,
  aliquota_contrato numeric,
  data_inicio date,
  data_fim date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Criar tabela servico_dev (espelho de servico, FK para contrato_dev)
CREATE TABLE public.servico_dev (
  id_servico uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_contrato uuid NOT NULL REFERENCES public.contrato_dev(id_contrato),
  descricao text,
  valor double precision,
  id_catalog_client uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS para contrato_dev
ALTER TABLE public.contrato_dev ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view contratos_dev"
  ON public.contrato_dev FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create contratos_dev"
  ON public.contrato_dev FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update contratos_dev"
  ON public.contrato_dev FOR UPDATE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contratos_dev"
  ON public.contrato_dev FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. RLS para servico_dev
ALTER TABLE public.servico_dev ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view servicos_dev"
  ON public.servico_dev FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create servicos_dev"
  ON public.servico_dev FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update servicos_dev"
  ON public.servico_dev FOR UPDATE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete servicos_dev"
  ON public.servico_dev FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Triggers de updated_at
CREATE TRIGGER update_contrato_dev_updated_at
  BEFORE UPDATE ON public.contrato_dev
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servico_dev_updated_at
  BEFORE UPDATE ON public.servico_dev
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
