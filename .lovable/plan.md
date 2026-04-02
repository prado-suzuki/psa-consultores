

## Etapa 2 — Renomeação Frontend: tax_projects → org_projects

O SQL já foi executado. Agora atualizar todo o frontend.

---

### Alterações

#### 1. Criar `src/hooks/useOrgProjects.ts` (novo arquivo, cópia de useTaxProjects.ts com renomeações)

- Tipos: `TaxProject` → `OrgProject`, `TaxProjectMember` → `OrgProjectMember`, `TaxProjectFormData` → `OrgProjectFormData`
- Manter aliases `@deprecated` para compatibilidade: `export type TaxProject = OrgProject` etc.
- Hooks: `useTaxProjects` → `useOrgProjects`, `useTaxProjectsList` → `useOrgProjectsList`, `useCreateTaxProject` → `useCreateOrgProject`, `useUpdateTaxProject` → `useUpdateOrgProject`, `useDeleteTaxProject` → `useDeleteOrgProject`
- Manter aliases `@deprecated`: `export const useTaxProjects = useOrgProjects` etc.
- `.from('tax_projects')` → `.from('org_projects')` (6 ocorrências)
- `.from('tax_project_members')` → `.from('org_project_members')` (3 ocorrências)
- FK hints: `tax_projects_responsible_id_fkey` → `org_projects_responsible_id_fkey`, idem `leader_id`, `estrutura_area_id`
- Query keys: `tax-projects` → `org-projects`, `tax-project-members` → `org-project-members`

#### 2. Deletar `src/hooks/useTaxProjects.ts`

#### 3. `src/hooks/useFiscalTasks.ts` (linha 95)
- `project:tax_projects(id, name)` → `project:org_projects(id, name)`

#### 4. `src/hooks/usePerformanceData.ts` (linhas 95-103)
- `.from('tax_projects')` → `.from('org_projects')`
- `tax_projects_external_client_id_fkey` → `org_projects_external_client_id_fkey`
- `tax_projects_estrutura_area_id_fkey` → `org_projects_estrutura_area_id_fkey`
- `.from('tax_project_members')` → `.from('org_project_members')`

#### 5. `src/hooks/useTaxReferenceData.ts` (linhas 198-205)
- `.from('tax_projects')` → `.from('org_projects')`
- Renomear export `useTaxProjectsForFilter` → `useOrgProjectsForFilter` (manter alias deprecated)
- Query key: `tax-projects-for-filter` → `org-projects-for-filter`

#### 6. `src/components/equipe/audit/AuditLogTable.tsx` (linha 78)
- `.from('tax_projects')` → `.from('org_projects')`

#### 7. `src/pages/equipe/fiscal/FiscalDashboard.tsx` (linha 31)
- `.from('tax_projects')` → `.from('org_projects')`

#### 8. `supabase/functions/gerar-sintese-executiva/index.ts` (linha 52)
- `.from("tax_projects")` → `.from("org_projects")`

#### 9. Atualizar imports nos consumidores

| Arquivo | Import antigo | Import novo |
|---------|--------------|-------------|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | `from '@/hooks/useTaxProjects'` | `from '@/hooks/useOrgProjects'` (nomes internos preservados via aliases deprecated) |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx` | `useTaxProjectsList from '@/hooks/useTaxProjects'` | `from '@/hooks/useOrgProjects'` |
| `src/components/equipe/fiscal/FiscalWorkPackages.tsx` | `useTaxProjectsList from '@/hooks/useTaxProjects'` | `from '@/hooks/useOrgProjects'` |
| `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx` | `useTaxProjectsForFilter from '@/hooks/useTaxReferenceData'` | Sem mudança de path (alias deprecated mantido em useTaxReferenceData) |

#### 10. `src/integrations/supabase/types.ts` — NÃO editar. Regenera automaticamente.

---

### Estratégia de compatibilidade

Todos os nomes antigos (`TaxProject`, `useTaxProjects`, `useCreateTaxProject`, etc.) são mantidos como aliases `@deprecated` re-exportados do novo arquivo. Isso garante que qualquer arquivo não listado acima que importe esses nomes continue funcionando. Arquivos listados serão atualizados para os novos nomes.

**Total: 9 arquivos alterados, 1 arquivo criado, 1 arquivo deletado.**

