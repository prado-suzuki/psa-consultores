

# Plano: Refatoração de Débito Técnico (TAX e PROJETOS)

## Achados Reais da Investigação

### Problema 1 — Queries Inline

| Arquivo | Queries Inline | Status |
|---|---|---|
| `FiscalProjetosCadastro.tsx` | 9 queries (servicos_prestados, area_servicos, profiles_safe, user_roles, sublider-team-members, external-clients, contribuintes, cliente-os, estrutura) | Violação confirmada |
| `FiscalDemandasTarefas.tsx` | 2 queries (team-members-for-tasks, tax-projects-for-filter) | Violação confirmada |
| `FiscalClients.tsx` | 1 query (empresa-clients) | Violação confirmada |
| `FiscalDemandasClientes.tsx` | 0 queries — é apenas wrapper que renderiza `<FiscalClients />` | Falso positivo |

### Problema 2 — `as any`

| Arquivo | Ocorrências |
|---|---|
| `FiscalProjetosCadastro.tsx` | 21 — tabelas não tipadas: `servicos_prestados`, `area_servicos`, `ordem_servico` + casts em objetos OS |
| `WorkPackageDetail.tsx`, `WorkPackageForm.tsx`, `WorkPackageList.tsx`, `FiscalClients.tsx` | **0 ocorrências** — falso positivo do relatório |

---

## Plano de Correção

### Etapa 1: Criar `src/hooks/useTaxReferenceData.ts`

Hook novo que centraliza as 9 queries de referência de `FiscalProjetosCadastro.tsx`:

- `useServicosPrestados()` — catálogo `servicos_prestados`
- `useAreaServicos()` — links `area_servicos`
- `useTeamProfilesSafe()` — `profiles_safe` com nomes
- `useTeamRolesForProjects()` — `user_roles` filtrado
- `useSubliderTeamMembers(subliderIds)` — membros das equipes
- `useExternalClients(editingClientId?)` — clientes com fallback cross-env
- `useContribuintes(clientId, editingContribuinteId?)` — contribuintes com fallback
- `useClienteOrdens(clientId)` — ordens de serviço

Todos os `as any` nestas queries receberão comentário justificativo:
```typescript
// as any: tabela 'servicos_prestados' ausente do schema tipado gerado
```

Os casts `(os as any).data_inicio` serão substituídos por interface local `OrdemServico`.

### Etapa 2: Criar `src/hooks/useFiscalClients.ts`

Hook novo com `useFiscalClientsList()` extraído de `FiscalClients.tsx`. Inclui a interface `Cliente` e a lógica de seleção de tabela prod/dev.

### Etapa 3: Atualizar `FiscalDemandasTarefas.tsx`

As 2 queries inline serão substituídas por:
- `useTeamProfilesSafe()` do novo `useTaxReferenceData.ts`
- Query de `tax_projects` — adicionar `useTaxProjectsForFilter()` ao mesmo hook ou reutilizar `useTaxProjects` existente

### Etapa 4: Atualizar componentes consumidores

- **`FiscalProjetosCadastro.tsx`** — substituir 9 `useQuery` + `supabase` pelos hooks de `useTaxReferenceData`, remover imports de `useQuery` e `supabase`
- **`FiscalClients.tsx`** — substituir `useQuery` pelo `useFiscalClientsList()`
- **`FiscalDemandasTarefas.tsx`** — substituir 2 `useQuery` pelos hooks novos

### Etapa 5: `WorkPackageForm.tsx` (4 queries inline)

Criar `src/hooks/useWorkPackageFormData.ts` com:
- `useWPTeamMembers()` — profiles para dropdown
- `useWPClients()` — catalog_clients
- `useWPProjects()` — projects
- `useWPParentPackages()` — work packages pai

Atualizar `WorkPackageForm.tsx` para consumir o novo hook.

---

## Resumo de Arquivos

| Ação | Arquivo |
|---|---|
| **Criar** | `src/hooks/useTaxReferenceData.ts` |
| **Criar** | `src/hooks/useFiscalClients.ts` |
| **Criar** | `src/hooks/useWorkPackageFormData.ts` |
| **Editar** | `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` |
| **Editar** | `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx` |
| **Editar** | `src/components/equipe/fiscal/FiscalClients.tsx` |
| **Editar** | `src/components/projetos/WorkPackageForm.tsx` |
| **Ignorar** | `FiscalDemandasClientes.tsx` (wrapper sem queries), `WorkPackageDetail.tsx`, `WorkPackageList.tsx` (sem violações) |

