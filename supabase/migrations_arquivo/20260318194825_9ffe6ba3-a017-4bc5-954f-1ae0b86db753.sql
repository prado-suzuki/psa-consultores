-- 1. empresas_faturamento: restrict SELECT to internal roles
DROP POLICY IF EXISTS "Authenticated users can read empresas_faturamento" ON public.empresas_faturamento;

CREATE POLICY "Internal roles can read empresas_faturamento"
ON public.empresas_faturamento FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

-- 2. distribuicao_receita: restrict ALL operations to internal roles
DROP POLICY IF EXISTS "Authenticated users can manage distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Authenticated users can select distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Authenticated users can insert distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Authenticated users can update distribuicao_receita" ON public.distribuicao_receita;
DROP POLICY IF EXISTS "Authenticated users can delete distribuicao_receita" ON public.distribuicao_receita;

CREATE POLICY "Internal roles can select distribuicao_receita"
ON public.distribuicao_receita FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Internal roles can insert distribuicao_receita"
ON public.distribuicao_receita FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Internal roles can update distribuicao_receita"
ON public.distribuicao_receita FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);

CREATE POLICY "Internal roles can delete distribuicao_receita"
ON public.distribuicao_receita FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lider'::app_role)
  OR has_role(auth.uid(), 'sublider'::app_role)
);