

## Plano: Separar Líder Geral e Responsável Executor

### Alterações

**1. `src/hooks/useTaxProjects.ts`**
- Adicionar `responsible_id: string` ao `TaxProjectFormData`
- `useCreateTaxProject`: `responsible_id` recebe `data.responsible_id` (não mais `leader_ids[0]`)
- `useUpdateTaxProject`: idem no diff e no update; comparação de `responsible_id` usa `data.responsible_id`

**2. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`**

*Estado e validação:*
- Adicionar `responsible_id: ''` ao `emptyForm`
- `handleOpenModal`: preencher `responsible_id: project.responsible_id || ''`
- `handleSubmit`: validar campo obrigatório

*Novo useMemo `executores`:*
- Filtrar `teamMembers` cujo user_id tenha role `team_member` ou `sublider` (via `userRoles`)
- Excluir explicitamente quem tem role `lider` ou `admin`
- Se `estruturaAreaId` selecionada, restringir aos membros da área

*Formulário — após bloco Líder Geral (~L922):*
- Select simples "Responsável Executor *" com lista `executores`

*Tabela:*
- Renomear "Responsável" → "Executor" (L531)
- Adicionar coluna "Líder" após "Executor" com sort
- `getSortValue`: renomear case `responsavel` → `executor`, adicionar case `lider`
- `colSpan`: 11 → 12

