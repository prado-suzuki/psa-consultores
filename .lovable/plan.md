

## Migração: select de Área de `tax_areas` para `estrutura_areas` — Fases 1-9

### Dados verificados

- `estrutura_areas` com `page_categories` contendo `'tax'`: **5 áreas** (Fiscal, Fixos, Pontuais, PSA Consultores, Societário)
- `tax_projects`: 23 total, **7 sem `estrutura_area_id`** (6 mapeáveis via `tax_areas`, 1 sem `area_id`)
- `area_servicos` já tem coluna `estrutura_area_id` preenchida em todos os registros

### Fase 1 — Migration SQL
Preencher `estrutura_area_id` nos 6 projetos que têm `area_id` mapeável:
```sql
UPDATE tax_projects tp
SET estrutura_area_id = ta.estrutura_area_id
FROM tax_areas ta
WHERE tp.area_id = ta.id
  AND tp.estrutura_area_id IS NULL
  AND ta.estrutura_area_id IS NOT NULL;
```

### Fase 2 — Criar `useEstruturaAreas`
Novo hook em `src/hooks/useEstruturaAreas.ts`:
- Busca `estrutura_areas` filtrado por `.contains('page_categories', [category])`
- Retorna `{ id, name, color, cluster_id }`
- Chamada: `useEstruturaAreas('tax')`

### Fase 3 — `FiscalProjetosCadastro.tsx`
- Trocar import `useTaxAreas` → `useEstruturaAreas`
- `formData.area_id` → `formData.estrutura_area_id`
- Select dropdown: popular com `name` de `estrutura_areas`
- Eliminar derivação de `estruturaAreaId` — usar direto `formData.estrutura_area_id`
- Filtro de categorias: `link.estrutura_area_id === formData.estrutura_area_id`
- `handleOpenModal` (edição): carregar `project.estrutura_area_id`
- `getAreaLabel`: usar `area_ref.name` (ajustado no hook)

### Fase 4 — `useTaxProjects.ts`
- Join: trocar `tax_areas!tax_projects_area_id_fkey` → `estrutura_areas!tax_projects_estrutura_area_id_fkey`
- `area_ref` retorna `{ id, name }` (em vez de `{ id, nome }`)
- `TaxProject`: trocar `area_id` → `estrutura_area_id`
- `TaxProjectFormData`: trocar `area_id` → `estrutura_area_id`
- Mutations (create/update): gravar em `estrutura_area_id`
- Comparisons no update: trocar campo

### Fase 5 — `useTaxProjectsList`
- Trocar `area_id` → `estrutura_area_id` no select

### Fase 6 — `TaskModal.tsx`
- Remover import `useTaxAreas`
- `selectedProjectAreaId` → `proj?.estrutura_area_id || null`
- Eliminar segundo `useMemo` que fazia lookup intermediário
- Passar `selectedProjectAreaId` direto para `useEstruturaArea`

### Fase 7 — `FiscalDashboard.tsx`
- Trocar `useTaxAreas` → `useEstruturaAreas('tax')`
- Query inline: trocar `area_id` → `estrutura_area_id`
- Lookup: `areaMap[proj.estrutura_area_id]` com `a.name` (não `a.nome`)

### Fase 8 — `AuditLogTable.tsx` + `auditFieldFormatter.ts`
- Lookup duplo: buscar `estrutura_areas` primeiro, merge com `tax_areas` como fallback
- `auditFieldFormatter.ts`: adicionar key `estrutura_area_id` apontando para `'areas'`

### Fase 9 — `useTaxReferenceData.ts` (`useAreaServicos`)
- Incluir `estrutura_area_id` no select
- Tipo `TaxAreaCategoria`: adicionar `estrutura_area_id: string | null`

### Arquivos modificados (9 arquivos)
1. `src/hooks/useEstruturaAreas.ts` (novo)
2. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`
3. `src/hooks/useTaxProjects.ts`
4. `src/components/equipe/fiscal/tasks/TaskModal.tsx`
5. `src/pages/equipe/fiscal/FiscalDashboard.tsx`
6. `src/components/equipe/audit/AuditLogTable.tsx`
7. `src/components/equipe/audit/auditFieldFormatter.ts`
8. `src/hooks/useTaxReferenceData.ts`
9. Migration SQL (Fase 1)

### Não alterado
- RLS policies (já usam `estrutura_area_id`)
- `useTaxAreas.ts` (mantido como fallback até Fase 11)
- `tax_areas` tabela (mantida)

