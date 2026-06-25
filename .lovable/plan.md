## Sprint de Correção: Filtros por Cluster/Área

Baseado no diagnóstico anterior, abaixo as 8 tarefas priorizadas por risco. Cada item indica arquivo principal, mudança e critério de aceite.

---

### 🔴 CRÍTICOS (quebram isolamento de dados)

**1. Chamados — Responsável vazando entre clusters**
- **Arquivo**: `src/hooks/useTicketAgents.ts` + nova RPC `get_cluster_members(cluster_id uuid)`
- **Mudança**: Criar RPC SECURITY DEFINER que retorna apenas membros (`estrutura_equipe_membros.user_id` + `estrutura_equipes.gestor_id`) das equipes vinculadas ao cluster recebido. Refatorar `useTicketAgents` para aceitar `clusterId` e chamar a nova RPC em vez de `get_internal_users()`.
- **Consumidores**: `CreateTicketDialog`, `TicketDetails` (reassign).
- **Aceite**: Em `/equipe/chamados`, ao abrir um chamado do cluster Tax, o select "Responsável" lista apenas membros do Tax.

**2. `documento_horas_historico` — DELETE aberto**
- **Migração**: Substituir policy `USING (true)` por `using (has_role_or_higher(auth.uid(),'lider'))`.
- **Aceite**: `team_member` não consegue mais deletar histórico.

---

### 🟡 ATENÇÃO (UX inconsistente / lista global indevida)

**3. Sprints — cluster Digital hardcoded**
- **Arquivo**: `src/pages/equipe/EquipeSprintDetalhes.tsx`
- **Mudança**: Remover UUID hardcoded do cluster Digital. Resolver o cluster a partir do projeto da sprint (`sprints.project_id → org_projects.cluster_id`) e reusar a nova RPC `get_cluster_members`.
- **Aceite**: Sprint de qualquer cluster lista responsáveis corretos no modal de entregável.

**4. Backlog / Tarefas / Kanban — assignee global**
- **Arquivos**: `useOrgTaskAssignees` (ou equivalentes em `src/hooks/org/*`)
- **Mudança**: Filtrar candidatos a `assignee_id` pelos membros do cluster do projeto (`org_projects.cluster_id`), via `get_cluster_members`.
- **Aceite**: Em `/equipe/backlog` e Kanban, criar/editar tarefa só lista membros do cluster do projeto pai.

**5. Daily Standups — visibilidade**
- **Arquivo**: hook que lista `daily_standups`
- **Mudança**: Filtrar dailies pelo cluster ativo do usuário (via `resolve_user_cluster_ids`).
- **Aceite**: Membro de um cluster não vê dailies de outro.

**6. Page Permissions — vazamento entre clusters**
- **Arquivo**: trigger `auto-grant-new-page-to-area-users` + revisão de `user_page_access`
- **Mudança**: Verificar se o auto-grant respeita o cluster (não apenas a categoria de página) ao liberar novas páginas.
- **Aceite**: Nova página OSG não é concedida automaticamente a membros de outros clusters.

---

### 🟢 MELHORIAS

**7. Padronizar contexto de cluster no front**
- **Mudança**: Criar `useCurrentCluster()` (deriva do usuário/rota) para alimentar todos os pickers de responsável de forma uniforme.

**8. Cobertura de testes manuais**
- **Mudança**: Checklist QA por módulo (Chamados, Sprints, Backlog, Kanban, Daily, Acessos) executado com 2 contas de clusters distintos.

---

### Ordem de execução proposta
1 → 2 (mesma janela, ambos críticos) → 3 → 4 → 5 → 6 → 7 → 8.

### Detalhes técnicos
- **Nova RPC**: `public.get_cluster_members(_cluster_id uuid) returns table(user_id uuid, first_name text, last_name text, role text)`, `security definer`, grant `authenticated`, retorna union de `estrutura_equipe_membros.user_id` e `estrutura_equipes.gestor_id` para todas as equipes cujo `area.cluster_id = _cluster_id`.
- **Sem migrações destrutivas**. Todas as policies novas são `CREATE OR REPLACE`.
- **Auditoria**: nenhum CUD novo introduzido; sem alteração em `useAuditLog`.

Confirma a ordem? Posso começar pelo item 1 (Chamados) assim que aprovar.