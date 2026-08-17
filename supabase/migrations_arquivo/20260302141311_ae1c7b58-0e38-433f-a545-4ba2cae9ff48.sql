
-- 1. Create ordem_servico table
CREATE TABLE public.ordem_servico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_cliente uuid NOT NULL,
  numero_os text,
  data_emissao date,
  data_inicio date,
  data_fim date,
  valor_projeto numeric DEFAULT 0,
  valor_reembolso_km numeric DEFAULT 0,
  valor_reembolso_refeicao numeric DEFAULT 0,
  situacao text DEFAULT 'em_andamento',
  observacoes text,
  servicos_contratados jsonb DEFAULT '[]'::jsonb,
  centros_custo jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.ordem_servico ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (same pattern as contrato)
CREATE POLICY "Team members can view ordem_servico"
  ON public.ordem_servico FOR SELECT
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create ordem_servico"
  ON public.ordem_servico FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update ordem_servico"
  ON public.ordem_servico FOR UPDATE
  USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ordem_servico"
  ON public.ordem_servico FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Migrate existing OS data from contrato
INSERT INTO public.ordem_servico (id_cliente, numero_os, data_emissao, data_inicio, data_fim, valor_projeto, valor_reembolso_km, valor_reembolso_refeicao, situacao, observacoes, servicos_contratados, centros_custo, created_at, updated_at)
SELECT
  id_cliente,
  numero_contrato,
  data_emissao,
  data_inicio,
  data_fim,
  COALESCE(valor_fixo, 0),
  COALESCE(valor_reembolso_km, 0),
  COALESCE(valor_reembolso_refeicao, 0),
  COALESCE(situacao_projeto, 'em_andamento'),
  observacoes_projeto,
  COALESCE(servicos_contratados, '[]'::jsonb),
  COALESCE(centros_custo, '[]'::jsonb),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.contrato
WHERE servicos_contratados IS NOT NULL
   OR situacao_projeto IS NOT NULL;

-- 5. Drop OS-specific columns from contrato
ALTER TABLE public.contrato
  DROP COLUMN IF EXISTS data_emissao,
  DROP COLUMN IF EXISTS valor_reembolso_km,
  DROP COLUMN IF EXISTS valor_reembolso_refeicao,
  DROP COLUMN IF EXISTS situacao_projeto,
  DROP COLUMN IF EXISTS observacoes_projeto,
  DROP COLUMN IF EXISTS servicos_contratados,
  DROP COLUMN IF EXISTS centros_custo;
