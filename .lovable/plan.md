

## Reorganizar formulário de projetos — Plano confirmado

### 1. `src/hooks/useTaxProjects.ts`

**TaxProjectFormData** — remove `sublider_ids`, `objective`, `category_ids`:
```typescript
export interface TaxProjectFormData {
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  leader_ids: string[];
  external_client_id: string;
  contribuinte_id?: string;
  estrutura_area_id: string;
  member_ids: string[];
  ordem_servico_id: string;
}
```

**useCreateTaxProject** — remove `objective` from insert, remove `project_servicos` insert block (lines 214-219).

**useUpdateTaxProject** — remove `oldCategoryIds` param, remove `objective` from comparisons and update, remove `project_servicos` upsert/delete (lines 279-284, 305, 310-318). Remove `project-servicos` invalidation.

**buildMembersList** — remove `sublider_ids` loop (lines 385-388).

### 2. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**Imports — remove:**
- `useServicosPrestados`, `useAreaServicos`, `useSubliderTeamMembers` (lines 49-53)
- `useProjectServicos` (line 66)
- `useServicosContratados` (line 74)
- `Checkbox` (line 13)

**Hooks/state — remove:**
- `currentProjectCategories` / `useProjectServicos` (line 103)
- `suggestedCategoryIds` / `useServicosContratados` (lines 114-115)
- `taxCategorias` / `useServicosPrestados` (line 122)
- `areaCategoryLinks` / `useAreaServicos` (line 123)
- `sublideres` useMemo (lines 139-148)
- `filteredMemberIds` / `useSubliderTeamMembers` (lines 150-153)
- `filteredCategories` useMemo (lines 195-201)

**formData — remove fields:** `sublider_ids`, `objective`, `category_ids` from initial state, handleOpenModal, handleCloseModal.

**Functions — remove:** `handleCategoryToggle` (lines 324-331).

**Effects — remove:** categories loading effect (lines 248-253).

**Effects — adjust:**
- Area change effect (line 206): remove `category_ids: []` from reset
- Edit members effect (line 243): remove `sublider_ids` from setFormData
- `availableMembers` (line 379): remove `formData.sublider_ids` and `filteredMemberIds` refs; simplify to only use `areaMemberIds` when area is set, otherwise show all team members minus leaders.

**handleSubmit — adjust:**
- KEEP `leader_ids.length === 0` validation (Líder Geral obrigatório)
- Remove `oldCategoryIds` from updateProject.mutate call

**Members fallback text (lines 824-827):** change to "Selecione uma área para ver os membros disponíveis."

**JSX modal — new order:**

```text
SEÇÃO 1: IDENTIFICAÇÃO
  Label: "Identificação"
  - Cliente * (full width select)
  - [OS vinculadas — conditional, as-is]
  - Nome do Projeto * (full width input)
  - Área * | Status (grid 2 cols)

SEÇÃO 2: PERÍODO
  Label: "Período"
  - Data de Início | Data de Término (grid 2 cols)

SEÇÃO 3: EQUIPE
  Label: "Equipe"
  - Líder Geral (popover multi-select — as-is)
  - Membros do Projeto (popover multi-select — as-is, without sublíder)

SEÇÃO 4: DETALHES
  Label: "Detalhes"
  - Descrição do Projeto (textarea, rows=3)
```

**Remove from JSX:**
- Sublíder popover (lines 747-798)
- Objetivo textarea (lines 902-910)
- Categorias section (lines 922-977)

### Not changed
- `project_servicos` table in the database
- `useProjectServicos` hook export kept (may be used elsewhere)
- Listing/table logic unchanged
- No database migrations

