# Plano: Mesclar `empresas_faturamento` em `estrutura_clusters`

## Objetivo

Eliminar a tabela `empresas_faturamento` e absorver seus campos (`nome`, `cnpj`, `centro_custo_id`) diretamente em `estrutura_clusters`. As 5 empresas hoje sem cluster vinculado serão migradas como novos clusters inativos.

## Estado atual (auditoria rápida)

- **Dados**: 4 clusters (todos com `empresa_id`); 9 empresas, 5 sem cluster.
- **FK externa**: nenhuma referencia `empresas_faturamento`. Apenas `estrutura_clusters.empresa_id` aponta pra ela.
- **RLS**: 2 policies em `empresas_faturamento` (`lider_manage_empresas_faturamento`, `team_select_empresas_faturamento`).
- **Frontend**:
  - `src/hooks/useEstruturaManager.ts` — interface `Cluster`, `EmpresaFat`, `useEstruturaEmpresas`, `saveCluster`.
  - `src/hooks/useCategorias.ts` — CRUD de empresas (sem UI consumidora ativa).
  - `src/components/equipe/estrutura/EstruturaManager.tsx` — único componente que usa `empresa_id` + lookup de empresa/CC.
- **Edge function**: `supabase/functions/dw-query/index.ts` apenas lista o nome da tabela em allowlist.

## Nova estrutura

```text
estrutura_clusters {
  id              uuid PK
  name            text   -- nome do cluster
  nome_empresa    text   -- antigo empresas_faturamento.nome
  cnpj            text   -- antigo empresas_faturamento.cnpj
  cost_center_id  uuid FK -> centros_custo(id)
  is_active       boolean
}
```

Removidos: `cost_center` (texto livre), `empresa_id`.

## Etapas (ordem importa)

### 1. Backup
`SELECT *` de `estrutura_clusters` e `empresas_faturamento` → CSVs em `/mnt/documents/` para rollback manual.

### 2. Migration única (schema + dados, transacional)

```sql
-- 2.1 Adicionar novas colunas
ALTER TABLE public.estrutura_clusters
  ADD COLUMN nome_empresa text,
  ADD COLUMN cnpj text,
  ADD COLUMN cost_center_id uuid REFERENCES public.centros_custo(id);

-- 2.2 Copiar dados das empresas vinculadas
UPDATE public.estrutura_clusters c
SET nome_empresa   = e.nome,
    cnpj           = e.cnpj,
    cost_center_id = e.centro_custo_id
FROM public.empresas_faturamento e
WHERE c.empresa_id = e.id;

-- 2.3 Criar clusters inativos para empresas sem cluster
INSERT INTO public.estrutura_clusters (name, nome_empresa, cnpj, cost_center_id, is_active)
SELECT e.nome, e.nome, e.cnpj, e.centro_custo_id, false
FROM public.empresas_faturamento e
WHERE NOT EXISTS (
  SELECT 1 FROM public.estrutura_clusters c WHERE c.empresa_id = e.id
);

-- 2.4 Dropar coluna antiga e tabela
ALTER TABLE public.estrutura_clusters
  DROP COLUMN empresa_id,
  DROP COLUMN cost_center;

DROP TABLE public.empresas_faturamento;
-- (RLS policies da tabela caem junto)
```

### 3. Frontend

- **`src/hooks/useEstruturaManager.ts`**:
  - `Cluster`: trocar `cost_center` + `empresa_id` por `nome_empresa`, `cnpj`, `cost_center_id`.
  - Remover `EmpresaFat` e `useEstruturaEmpresas`.
  - `saveCluster`: aceitar `{ name, nome_empresa, cnpj, cost_center_id }`.
- **`src/components/equipe/estrutura/EstruturaManager.tsx`**:
  - Form de cluster passa a ter campos: Nome, Nome da Empresa, CNPJ, Centro de Custo (select de `centros_custo`).
  - Remover lookup `empresas.find(...)`, `getEmpresaCcLabel`, e o select "Empresa".
  - Listagem mostra `cluster.nome_empresa` e label do CC via `centrosCusto.find(c => c.id === cluster.cost_center_id)`.
- **`src/hooks/useCategorias.ts`**: remover `useEmpresasFaturamentoList/Save/Toggle/Delete` (CRUD órfão) e a interface `EmpresaFat`.
- **`supabase/functions/dw-query/index.ts`**: remover `'empresas_faturamento'` da allowlist.
- **`src/integrations/supabase/types.ts`**: regenerado automaticamente após migration.

### 4. Validação

- `SELECT count(*) FROM estrutura_clusters` → esperado 9 (4 originais + 5 novos inativos).
- Conferir que clusters originais mantiveram `id` e ganharam `nome_empresa`/`cnpj`/`cost_center_id`.
- Smoke-test no preview: tela Estrutura abre, edição de cluster salva, criação de cluster novo funciona.
- `bun run build` (automático no Lovable) sem erros de tipos.

## Fora de escopo

- Não mexer em `centros_custo` nem em `cliente_clusters`.
- Não criar UI nova de "gerenciar empresas" — o cadastro passa a ser feito direto no cluster.
- Não migrar audit logs antigos que referenciavam `empresa_id` (ficam históricos).
