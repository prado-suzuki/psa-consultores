

## Plano: Reestruturar OS — serviço único, distribuição de receita, remoção de tabelas legadas

### Etapa 1 — Migration SQL

Uma única migration com todas as alterações de schema:

```sql
-- Novas colunas na ordem_servico
ALTER TABLE public.ordem_servico
  ADD COLUMN id_servico uuid REFERENCES public.servicos_prestados(id) ON DELETE SET NULL,
  ADD COLUMN id_produto_segmento uuid REFERENCES public.produto_segmento(id) ON DELETE SET NULL;

-- Remover colunas JSONB da OS
ALTER TABLE public.ordem_servico
  DROP COLUMN IF EXISTS servicos_contratados,
  DROP COLUMN IF EXISTS centros_custo;

-- Remover colunas do cliente/cliente_dev
ALTER TABLE public.cliente
  DROP COLUMN IF EXISTS empresa_faturamento,
  DROP COLUMN IF EXISTS tipo_produto_segmento,
  DROP COLUMN IF EXISTS tipo_produto_segmento_custom;
ALTER TABLE public.cliente_dev
  DROP COLUMN IF EXISTS empresa_faturamento,
  DROP COLUMN IF EXISTS tipo_produto_segmento,
  DROP COLUMN IF EXISTS tipo_produto_segmento_custom;

-- Dropar tabelas obsoletas
DROP TABLE IF EXISTS public.contrato CASCADE;
DROP TABLE IF EXISTS public.contrato_dev CASCADE;
DROP TABLE IF EXISTS public.servico CASCADE;
DROP TABLE IF EXISTS public.servico_dev CASCADE;

-- Criar distribuicao_receita
CREATE TABLE public.distribuicao_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ordem_servico uuid NOT NULL REFERENCES public.ordem_servico(id) ON DELETE CASCADE,
  id_centro_custo uuid NOT NULL REFERENCES public.centros_custo(id) ON DELETE CASCADE,
  percentual_rateio numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.distribuicao_receita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can manage distribuicao"
  ON public.distribuicao_receita FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

### Etapa 2 — Frontend: `src/config/api.ts`

- Remover entrada `ordem_servico` do `TABLE_NAMES` (não há mais bifurcação dev/prod para OS)

### Etapa 3 — Frontend: `NewClientModal.tsx`

- Remover `contratoTable` e `ordemServicoTable` — usar `"ordem_servico"` direto em todas as queries
- Remover toda lógica de bifurcação `isProductionEnvironment` para OS (campos `id_contrato` vs `id`, colunas diferentes, etc.)
- Atualizar `DraftOrdemServico`: `servicos_contratados: string[]` → `id_servico: string`; `centros_custo` → `distribuicao_receita: Array<{id_centro_custo, percentual_rateio}>`; adicionar `id_produto_segmento: string`
- Remover `EMPRESA_FATURAMENTO_OPTIONS`, `toggleEmpresaFaturamento`, validação e UI de `empresa_faturamento`
- Remover `tipo_produto_segmento` e `tipo_produto_segmento_custom` do `clientData` e da seção "Classificação do Cliente"
- UI da OS: Select único para serviço (sem array), distribuição de receita persiste em `distribuicao_receita`, campo tipo_produto_segmento na OS
- Save: após salvar OS, fazer delete+insert em `distribuicao_receita`; remover campos legados do payload do cliente e do `syncCadastrosToDW`

### Etapa 4 — Frontend: `FiscalProjetosCadastro.tsx`

- Usar `"ordem_servico"` direto (remover `ordemServicoTable`)
- Query de `suggestedCategoryIds`: ler `id_servico` (UUID direto) em vez de parsear JSONB `servicos_contratados`

### Etapa 5 — Frontend: `GestaoClientes.tsx`

- Remover variável `ordemServicoTable` (usar `"ordem_servico"` direto)

### Etapa 6 — Frontend: `CadastroCategorias.tsx`

- Remover aba "Empresa / Faturamento" (`EmpresaFaturamentoTab`) e a `TabsTrigger` correspondente

### O que NÃO será feito

- Nenhuma migração de dados de `contrato_dev` para `ordem_servico`
- A tabela `empresas_faturamento` (catálogo) permanece no banco — apenas removida do formulário de cliente
- Nenhuma alteração em RLS de tabelas existentes

