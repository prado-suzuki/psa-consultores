-- Mesclar empresas_faturamento em estrutura_clusters

-- 1. Adicionar novas colunas
ALTER TABLE public.estrutura_clusters
  ADD COLUMN nome_empresa text,
  ADD COLUMN cnpj text,
  ADD COLUMN cost_center_id uuid REFERENCES public.centros_custo(id);

-- 2. Copiar dados das empresas vinculadas aos clusters existentes
UPDATE public.estrutura_clusters c
SET nome_empresa   = e.nome,
    cnpj           = e.cnpj,
    cost_center_id = e.centro_custo_id
FROM public.empresas_faturamento e
WHERE c.empresa_id = e.id;

-- 3. Criar clusters inativos para empresas sem cluster
INSERT INTO public.estrutura_clusters (name, nome_empresa, cnpj, cost_center_id, is_active)
SELECT e.nome, e.nome, e.cnpj, e.centro_custo_id, false
FROM public.empresas_faturamento e
WHERE NOT EXISTS (
  SELECT 1 FROM public.estrutura_clusters c WHERE c.empresa_id = e.id
);

-- 4. Dropar colunas antigas e tabela empresas_faturamento
ALTER TABLE public.estrutura_clusters
  DROP COLUMN empresa_id,
  DROP COLUMN cost_center;

DROP TABLE public.empresas_faturamento;