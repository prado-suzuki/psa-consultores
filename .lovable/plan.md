

# Atualização do AI_CONTEXT.md — Plano de alterações

## Seções a alterar

### 1. Seção 3.2 — Catálogo de hooks (L100-137)
**Adicionar** ao final da tabela:

| Hook | Propósito |
|---|---|
| `useClusterIdByPageCategory` | Resolve `cluster_id` a partir de `page_categories` das áreas |
| `useTeamMembersForTasks` | Filtra membros por cluster para seletores de tarefas |
| `useExternalClients` | Clientes externos para projetos (em `useTaxReferenceData.ts`) |
| `useContribuintes` | Contribuintes filtrados por cliente (em `useTaxReferenceData.ts`) |
| `useFiscalDashProjects` | Projetos para dashboard fiscal (em `useFiscalDashboardData.ts`) |
| `useFiscalDashTasks` | Tarefas para dashboard fiscal (em `useFiscalDashboardData.ts`) |
| `useClientesLista` | Lista simples de clientes para dropdown (em `useGestaoClientes.ts`) |
| `useClientesFiltrados` | Clientes com filtros + enriquecimento de clusters (em `useGestaoClientes.ts`) |
| `useContribuintesPorCliente` | Contribuintes por cliente para filtro (em `useGestaoClientes.ts`) |
| `useContribuintesExpand` | Contribuintes expandidos na tabela (em `useGestaoClientes.ts`) |
| `useDeleteCliente` | Soft-delete de cliente com invalidação de cache (em `useDeleteCliente.ts`) |
| `useSetoresCliente` | Lista de setores de cliente (em `useSetorCliente.ts`) |

**Remover** a nota de exceção na L138 ("Exceções toleradas: queries inline...") e substituir por:
> **Regra estrita**: nenhuma query `supabase.from()` diretamente em componentes. Migração completa para hooks dedicados.

---

### 2. Seção 4.1 — Guardas de rota (L156-164)
**Alterar** a linha do `TeamRoute`:

De: `TeamRoute` | Role `team_member` ou `admin`
Para: `TeamRoute` | Qualquer "Internal User": `team_member`, `admin`, `lider` ou `sublider`

---

### 3. Seção 6.2 — Tabelas-chave (L236-265)

**Tax/Fiscal (L241)** — substituir `tax_projects`, `tax_project_members` por `org_projects`, `org_project_members` (já renomeados).

**Dev/Tributário (L247)** — adicionar `os_produtos_contratados` (com `horas_contratadas`), `inscricao_contribuinte` (nome correto da tabela). Confirmar `representante` (já listado).

**Chamados (L244)** — adicionar: `deadline`, `estrutura_area_id`, `cliente_id` como colunas notáveis de `tickets`.

**Cadastros organizacionais (L259)** — adicionar `cliente_clusters` (tabela N:N cliente↔cluster).

**Auth/Org (L238)** — adicionar `user_invitations` (tabela criada, sem frontend).

---

### 4. Seção 6.1 — Princípios (L228-233)
**Adicionar** novo princípio:
- `is_ticket_assigned_to(uuid, uuid)` — função SECURITY DEFINER para verificar atribuição de chamados em RLS (evita recursão)

---

### 5. Seção 6.4 — Ambientes (L273-286)
**Reforçar** na L284: o filtro `.eq('ambiente', currentAmbiente)` é obrigatório também em `ordem_servico`, `representante` e `inscricao_contribuinte`, além de `cliente` e `contribuinte`.

---

### 6. Nova seção 6.5 — Convenções de dados adicionais
**Adicionar** após seção 6.4:

```markdown
### 6.5 Convenções de dados adicionais

- **Horas estimadas em tarefas**: `fiscal_tasks.estimated_hours` é obrigatório no formulário de tarefas.
- **Prazo de chamados**: usar `tickets.deadline` real do banco. Fallback: 5 dias úteis a partir da criação se `deadline` for null.
- **Soft-delete**: tabelas `cliente`, `contribuinte`, `representante`, `ordem_servico` usam coluna `excluido` (boolean). Queries DEVEM filtrar `.eq('excluido', false)`.
```

---

### 7. Seção 5.3 — Estrutura organizacional (L205-222)
**Corrigir** L221: substituir `tax_projects → tax_areas → estrutura_areas` por `org_projects → tax_areas → estrutura_areas` (tabela renomeada).

**Adicionar** após L216: `cliente_clusters` — associação N:N entre `cliente` e `estrutura_clusters`.

---

## Resumo
- **0 seções removidas** — apenas adições e correções
- **7 blocos alterados/adicionados** no documento
- Todas as mudanças refletem o estado real do código atual

