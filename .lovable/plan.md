

# Plano: Persistir vínculo Projeto → Ordem de Serviço

## 1. Migração — adicionar coluna `ordem_servico_id` com FK formal

```sql
ALTER TABLE public.tax_projects
  ADD COLUMN ordem_servico_id UUID REFERENCES public.ordem_servico(id);

CREATE INDEX idx_tax_projects_ordem_servico ON public.tax_projects(ordem_servico_id);
```

FK formal, pois `ordem_servico` é tabela única (sem versão `_dev`).

## 2. `src/hooks/useTaxProjects.ts`

- Adicionar `ordem_servico_id` ao tipo `TaxProject` e `TaxProjectFormData`
- `useCreateTaxProject`: incluir `ordem_servico_id` no insert
- `useUpdateTaxProject`: incluir `ordem_servico_id` no update e no diff de campos alterados
- Na query principal (`useTaxProjects`): para projetos com `ordem_servico_id`, buscar a OS e resolver `id_servico` → nome via `servicos_prestados`, retornando `servico_contratado: string | null`

## 3. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

- Incluir `ordem_servico_id` no `formData` (inicializado como `''`)
- Ao selecionar OS (`setSelectedOsId`), atualizar `formData.ordem_servico_id`
- Ao abrir edição, popular `selectedOsId` a partir de `project.ordem_servico_id`

## 4. Coluna "Serviço" na tabela de listagem

- Inserir `<TableHead>Serviço</TableHead>` entre "Projeto" e "Cliente"
- Exibir `project.servico_contratado || '-'` na célula correspondente
- Ajustar `colSpan` de loading/empty states

| Arquivo | Ação |
|---|---|
| migração SQL | ADD COLUMN com FK + índice |
| `useTaxProjects.ts` | Tipos, mutations, resolução de serviço |
| `FiscalProjetosCadastro.tsx` | FormData, edição, coluna na tabela |

