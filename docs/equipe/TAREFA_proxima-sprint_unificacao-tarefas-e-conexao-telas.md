# TAREFA (próxima sprint) — Unificar modelo de tarefa e conectar as telas do /equipe

> **Origem:** diagnóstico feito com a Patrícia em 2026-07-21 sobre "as telas não conversam / Kanban não mostra tarefa que está na sprint".
> **Contém itens que exigem migração de banco e DROP de tabela** — por isso viraram tarefa delegável em vez de mudança imediata.
> Os ajustes de UI de baixo risco (aviso de filtro no Kanban, contador de subtarefas escondidas, dashboard com todas as sprints ativas) **já foram feitos** fora desta tarefa.

## Contexto (o que está errado hoje)

Cada tela do `/equipe` faz `supabase.from()` direto no componente (sem hook), e cada uma adotou uma tabela de tarefa diferente. Existem **três modelos concorrentes que ninguém reconcilia**:

| Família | Tabela | Status | Telas |
|---|---|---|---|
| Trabalho vivo da equipe | `sprint_deliverables` | `pending / in_progress / completed` (CHECK no banco) | Sprints, Sprint-Detalhes, Kanban, Dashboard, Análise Inteligente, Backlog |
| Ilha órfã | `tasks` (enum `task_status`: `backlog/to_do/in_progress/review/done`) | | `EquipeNovaTarefa`, `EquipeTarefas` (**sem link no menu**) |
| Fiscal/OSG | `org_tasks` (enum `fiscal_task_status`) | | `board/BoardDashboard` |

- Único elo entre tabelas: `sprint_backlog_items.moved_to_deliverable_id → sprint_deliverables.id` (Backlog → Entregável, unidirecional).
- **Não há** nenhuma sincronização entre `tasks` e `sprint_deliverables`. Tarefa criada em "Nova Tarefa" recebe `sprint_id` mas grava em `tasks` → **nunca aparece no Kanban** (que lê `sprint_deliverables`).
- Daily (`daily_standups`) só se liga a sprint/projeto/processo genérico; `blockers` é texto livre que não vira tarefa nem se liga a um entregável.

---

## Subtarefas

### T1 — Eleger `sprint_deliverables` como fonte única e aposentar `tasks` ⚠️ MIGRAÇÃO + DROP
**Objetivo:** acabar com a ilha `tasks` para ninguém criar tarefa que evapora.

**✅ JÁ FEITO EM CÓDIGO (2026-07-21):**
- Rotas `/equipe/tarefas` e `/equipe/tarefas/nova` **redirecionadas para `/equipe/kanban`** (`src/App.tsx`) — não há mais entrada de UI que grave em `tasks`.
- Criados os hooks-fonte: `src/hooks/useSprints.ts` (`useSprints`/`useActiveSprints`), `src/hooks/useSprintDeliverables.ts` (list + create/update/delete), `src/hooks/useProcessAreas.ts`.
- `sprint_deliverables` fica oficializada como fonte única de tarefa da equipe.

**✅ PRÉ-REQUISITOS DE CÓDIGO CONCLUÍDOS (2026-07-21, 2ª leva):**
- `useDomainAdminPerformance.ts`: removido o `tasksQuery` (`from('tasks')`); o `deliverablesQuery` agora traz também `inProgress`. `AdminPerformance.tsx`: os dois cards ("Tarefas" + "Entregáveis") viraram **um único card "Entregáveis da equipe"** com os 3 status (Pendentes/Em Progresso/Concluídos) — fonte única `sprint_deliverables`.
- Deletados os órfãos: `src/pages/equipe/EquipeTarefas.tsx`, `src/pages/equipe/EquipeNovaTarefa.tsx`, `src/hooks/useDomainEquipeTarefas.ts`, `src/hooks/useDomainNovaTarefa.ts` e os 2 testes correspondentes. Removidas as entradas `/equipe/tarefas` e `/equipe/tarefas/nova` de `src/config/protectedPages.ts`.
- Verificado: **nenhuma referência a `tasks` / `useDomainEquipeTarefas` / `useDomainNovaTarefa` no `src/`**. Typecheck 0 erros; suíte 1168 testes passando.

**✅ BANCO CONCLUÍDO (2026-07-21):** `tasks` estava vazia (count 0) e tinha dependente órfão `public.task_comments` (FK `task_comments_task_id_fkey`, também count 0 — comentários das tarefas antigas; **não confundir** com `org_task_comments`, que é de `org_tasks` e segue viva). A Patrícia rodou no Lovable: `DROP TABLE IF EXISTS public.task_comments; DROP TABLE IF EXISTS public.tasks; DROP TYPE IF EXISTS task_status;`. Sem migração de dados (tabelas vazias).

**Resta só:** regenerar `docs/rls/mapa-do-banco.md` (`node scripts/gen-mapa-banco.mjs`) e commitar/publicar o lote de código pelo GitHub Desktop.

**T1 = fonte única `sprint_deliverables` — CONCLUÍDO (código + banco).**

**Aceite:** nada no app referencia `tasks` (✅ já); `tasks`/`task_status` não existem mais no banco.

### T2 — Conectar Daily ↔ entregável ⚠️ MIGRAÇÃO
**Objetivo:** o update/bloqueio da daily se ligar a uma tarefa específica (destrava "bloqueio vira tarefa").

1. Migração: adicionar `daily_standups.deliverable_id uuid null references public.sprint_deliverables(id) on delete set null` (+ índice). Não referenciar `auth.users`.
2. Em `src/pages/equipe/EquipeDaily.tsx`, permitir (opcional) vincular a linha do daily a um entregável da sprint ativa.
3. RLS: garantir que a nova coluna respeita as regras vigentes de `daily_standups`.
4. Atualizar `mapa-do-banco.md`.

**Aceite:** na daily dá pra apontar "no que trabalhei / o que está bloqueado" para um entregável, e isso aparece no drill-down do entregável.

### T3 — Estruturar bloqueios ⚠️ MIGRAÇÃO (avaliar com T2)
Hoje `blockers` é um único campo texto e só ~10% preenchem. Avaliar transformar em estrutura (motivo + responsável + `deliverable_id`), seja como colunas ou tabela `daily_blockers`. Depende da decisão da Patrícia; pode ser mesclado com T2.

### T4 — Camada de hooks compartilhada (refactor, sem banco) — 🚧 EM ANDAMENTO
**Objetivo:** fazer as telas "conversarem" de verdade — mesma query, mesmo formato, em todo lugar (regra do `CLAUDE.md`: nada de `supabase.from()` em componente).

**✅ JÁ FEITO (2026-07-21):**
- Hooks criados: `useSprints`/`useActiveSprints`, `useSprintDeliverables` (list + create/update/delete, delete em **cascata** com anexos), `useProcessAreas`, `useTeamProfiles`, `useProjects`, `useProcesses`, `useDeliverableAttachments` (list/upload/delete + `downloadDeliverableAttachment`; encapsula tabela **e** storage).
- Telas migradas p/ hooks (0 `supabase.from()` direto): **`EquipeDashboard`** e **`EquipeKanban`**.

**FALTA migrar:** `EquipeSprints`, `EquipeSprintDetalhes` (criação/import/edição de entregáveis — usar `useCreateSprintDeliverable`), `EquipeBacklog` (o `moveToSprint`), `EquipeDaily`, `AnaliseInteligente`. Depois, opcional: extrair as mutações restantes que ainda usam supabase direto nessas telas. Convenção: React Query, `queryKey:[tabela]`, mutation invalida o prefixo. **Não** reusar `useProjetos`/`useProcessos` (filtram `cluster_id`, escondem Digital Rotina).

### T5 — Cockpit por projeto / visão de portfólio (código)
A tela `Análise Inteligente` já é quase o cockpit da referência (score de saúde, taxa de entrega, atrasados, scope creep, bloqueios, evolução). Falta: (a) ser a **mesma verdade** do dashboard operacional; (b) uma **visão por projeto** (saúde de cada projeto lado a lado: saudável / atenção / problema / sem monitoramento). Reaproveitar a lógica de KPIs agrupando por `project_id`.

### T6 — Kanban: subtarefa multi-nível / coluna própria (código) — ✅ CONCLUÍDO (2026-07-21)
**Decisão da Patrícia:** manter a subtarefa **aninhada na mãe** (não card solto em coluna própria) — quando abre a subtarefa pra ler a descrição, precisa achar a mãe. Ver memória `feedback-kanban-subtarefa-aninhada-na-mae`.
**Feito (código):**
- `buildEquipeKanbanHierarchy` (`src/lib/equipeKanban.ts`) reescrito: agora é recursivo/achatado — cada raiz traz TODOS os descendentes (filhas, netas, ...) em DFS por código, cada linha anotada com `depth` (indentação), `hasChildren` e `hoursDisplay`. `subtaskCount`/`completedSubtasks` contam todos os níveis; `subtaskHoursTotal` soma só as FOLHAS do ramo (não duplica). Novo tipo `EquipeKanbanSubtaskRow`.
- **Órfã (mãe fora da lista) agora vira raiz** em vez de sumir (corrige o "tarefa some no Kanban").
- `EquipeKanban.tsx`: `filteredDeliverables` passou a puxar **toda a cadeia de mães** (mãe, avó, ...) de cada item que bate no filtro — subtarefa/neta filtrada continua aninhada sob a raiz.
- Render recursivo por `depth` (indentação) no `KanbanBoard.tsx` e `KanbanTable.tsx`; linha mostra `hoursDisplay`.
- Testes: `equipeKanban.test.ts` cobre netas (profundidade, DFS, soma só folhas) e órfã-vira-raiz.

---

### B1 — "Operação não permitida para o seu perfil" ao excluir entregável — ✅ CORRIGIDO EM CÓDIGO
Reportado no uso (2026-07-21): mover item do backlog → sprint funciona, mas **excluir o entregável** dá "operação não permitida para o seu perfil" mesmo sendo admin.
- **Causa real (não é permissão):** a RLS de delete exige `lider+` e `has_role_or_higher` **inclui admin** (`WHEN 'lider' THEN role IN ('lider','admin')`) — ou seja, admin PODE. O bloqueio verdadeiro é a FK `sprint_backlog_items.moved_to_deliverable_id → sprint_deliverables(id)` **sem `ON DELETE`** (`migration 20251216164847:12`): o item do backlog aponta pro entregável e o banco recusa o DELETE. O precheck `can_perform` traduz esse erro de FK como "não permitido para o seu perfil" (mensagem enganosa).
- **Fix aplicado (código, sem banco):** em `EquipeSprintDetalhes.deleteDeliverable` e no hook `useDeleteSprintDeliverable`, antes de excluir, faz `UPDATE sprint_backlog_items SET moved_to_deliverable_id=NULL, status='pending', sprint_id=NULL WHERE moved_to_deliverable_id = <id>` → devolve o item ao backlog e libera o DELETE.
- **Opcional (banco, delegável):** trocar a FK para `ON DELETE SET NULL` (ou `SET DEFAULT`) para não depender do código; e considerar melhorar a mensagem do `can_perform` para distinguir erro de FK de erro de permissão.

## Ordem sugerida
T1 → T4 → (T2/T3) → T5 → T6. T1 é o que mais impacta o sintoma imediato ("tarefa não aparece"). T4 é o que sustenta todo o resto.

## Referências de código
- `src/pages/equipe/EquipeKanban.tsx` · `EquipeDashboard.tsx` · `EquipeSprintDetalhes.tsx` (criação, sempre `status:'pending'`) · `EquipeBacklog.tsx` (`moveToSprint`) · `EquipeDaily.tsx` · `EquipeNovaTarefa.tsx`/`EquipeTarefas.tsx` (`tasks`)
- Rotas: `src/App.tsx` (~172-187). Menu: `src/components/equipe/EquipeLayout.tsx` (`navItems`).
- Schema: `docs/rls/mapa-do-banco.md` (nunca ler `types.ts` inteiro).
