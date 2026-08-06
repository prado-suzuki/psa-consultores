# Auditoria — Módulo Equipe / Sprint (Scrum)

**Data:** 2026-07-09
**Escopo:** módulo `/equipe` (Sprints, Backlog, Daily, Kanban, Tarefas, Projetos)
**Fonte:** schema (`src/integrations/supabase/types.ts`) + telas (`src/pages/equipe/`) + contagens reais via SQL Editor do Supabase.

> **Nota de método:** a chave anônima/pública é barrada pelo RLS — consultas via REST anônimo retornam `0` mesmo com dados. Os números abaixo vieram de queries rodadas no SQL Editor autenticado.

---

## Volume real por tabela

| Tabela | Linhas | Situação |
|---|---:|---|
| `sprint_deliverables` | 903 | 🟢 coração do sistema — onde o trabalho vive |
| `org_tasks` | 374 | 🟢 tarefas fiscais/organizacionais |
| `daily_standups` | 298 | 🟢 ativo diariamente |
| `sprints` | 16 | 🟢 3 ativas + 13 concluídas |
| `sprint_backlog_items` | 14 | 🟡 usado, porém enxuto |
| `sprint_events` | 11 | 🔴 abandonado desde dez/2025 |
| `sprint_metrics` | 6 | 🟡 pouco uso |
| `tasks` | 0 | ⚫ tabela vazia — não é usada |

**Descoberta-chave:** a tabela genérica `tasks` (a única com `actual_hours` **e** status de 5 estados `backlog/to_do/in_progress/review/done`) está **zerada**. O trabalho real está em `sprint_deliverables` (status usados: `pending`/`in_progress`/`completed`, **sem "bloqueado"**) e `org_tasks`.

---

## Diagnóstico item a item

### 1. Backlog priorizado — 🟢 existe e é preenchido (1 furo)
- 14 itens: **prioridade 14/14 (100%)**, **estimativa 13/14 (93%)**, status 14/14.
- ❌ `suggested_by` = 0/14 (nunca preenchem quem sugeriu); **sem campo de responsável** no backlog (o `assigned_to` só surge ao promover o item para `sprint_deliverables`).
- Prioridade: `high`/`medium`/`low`.

### 2. Status da sprint anterior — 🟢 visível / ❌ horas realizadas e carry-over
- **13 sprints concluídas** (09/12/2025 → 26/06/2026) + 3 ativas → sprint anterior é visível.
- Entregas: **847 concluídas, todas com `completed_at` (847/847)** — data de conclusão disciplinada.
- ❌ Nenhuma entrega com status "bloqueado" (só `pending`/`in_progress`/`completed`).
- ❌ **Horas realizadas × estimadas por pessoa**: `sprint_deliverables` não tem `actual_hours` e a `tasks` (que teria) está vazia. Só há o **estimado** (`estimated_hours` + `assigned_to`, agregado em EquipeSprints).
- ❌ **"Arrastado para próxima sprint"**: sem rastro/histórico (trocar `sprint_id` sobrescreve).

### 3. Dailys e impedimentos — 🟢 muito ativo / ⚠️ impedimento raso
- **298 dailys**, **59 nos últimos 30 dias**, mais recente **09/07/2026**, **4 pessoas** distintas.
- `blockers` preenchido em **30/298 (~10%)** — campo de texto livre único, **sem motivo nem responsável separados**.
- ⚠️ A tabela `impedimento` NÃO serve aqui — é do domínio imobiliário (matrícula/credor).

### 4. Disponibilidade da equipe — 🔴 falha real
- ❌ Ausências/férias/feriados: **nenhuma tabela** existe.
- 🔴 Reuniões fixas: `sprint_events` tem só **11 registros, todos `meeting`, o mais recente de 16/12/2025** (~7 meses atrás). A "review de sexta" **não está sendo registrada** — a agenda foi usada no início e abandonada.

### 5. Feedback do cliente (reviews com Mariana Marques) — ❌ não existe
- Sem campo dedicado e sem vínculo com sprint/tarefa.
- ⚠️ A tabela `feedbacks` é **avaliação interna 360°** (ligada a `ciclos_avaliacao`, `de_usuario_id`/`para_usuario_id`), não feedback de cliente.

### 6. Bloqueios externos — ❌ não rastreado
- Sem estado "bloqueado" nas entregas (0 ocorrências no banco), sem responsável externo.
- Status `blocked` só existe a nível de `projects` (não em tarefa/entrega). Dependências tipo API/Docbox não têm rastreamento estruturado.

---

## Resumo executivo

**✅ Existe E é preenchido**
- Backlog com prioridade (100%) e estimativa (93%) — `sprint_backlog_items`
- Sprints concluídas com datas (13 fechadas) — `sprints`
- Entregas com data de conclusão (847/847) — `sprint_deliverables`
- Daily standup ativo (298 registros, 4 pessoas, até hoje) — `daily_standups`

**⚠️ Existe mas incompleto/subutilizado**
- Responsável / quem sugeriu no backlog (`suggested_by` 0/14, sem `assigned_to`)
- Impedimento na daily (só ~10% preenchem; campo raso, sem motivo/responsável)
- `sprint_events` (estrutura existe, abandonada desde dez/2025; review de sexta não entra)
- `sprint_metrics` (só 6 registros)

**❌ Não existe / não é usado**
- Horas realizadas × estimadas por pessoa na sprint (falta `actual_hours`; `tasks` vazia)
- Rastro de tarefas arrastadas para a próxima sprint
- Ausências / férias / feriados (sem tabela)
- Feedback do cliente / reviews vinculado a sprint/tarefa
- Bloqueio externo estruturado com responsável externo (API, Docbox)

---

## Sugestões de correção (backlog técnico)

1. Adicionar `actual_hours` a `sprint_deliverables` → habilita estimado × realizado por pessoa.
2. Incluir estado `blocked` no status das entregas (hoje texto livre; considerar enum).
3. Criar tabela de ausências/férias/feriados para disponibilidade da equipe.
4. Estruturar impedimento na daily (motivo + responsável pelo desbloqueio, interno/externo).
5. Criar espaço de feedback de cliente por sprint (anotações da review + vínculo a sprint/tarefa).
6. Registrar histórico de carry-over ao mover item entre sprints.
