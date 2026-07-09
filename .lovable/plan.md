## RLS-06 — Projetos e OS

Baseline confirmado ✅
- `org_tasks.SELECT` já é a versão fina (admin OR (project_id + líder/sublíder + can_view_org_project) OR assigned_to OR created_by) — **não será tocado**.
- `org_tasks.UPDATE` hoje: `team_member+` (aberto). `INSERT`: `sublider+` OR `team_member+ AND (project_id IS NULL OR is_project_member)`. `DELETE`: `lider+ OR created_by=me`.
- `org_task_comments.SELECT`: `team_member+` (aberto).
- `ordem_servico.SELECT`: `team_member+` (aberto). OS tem `id_cliente` e `cluster_id`.
- `projeto_justificativas.SELECT/INSERT/UPDATE/DELETE`: `true` (totalmente aberto). FK: `projeto_id → projects(id)` (não `org_projects`).

### Migração (uma transação)

**1. Helper `org_task_visivel(uuid)`** — SECURITY DEFINER, replica a lógica do SELECT de `org_tasks` para reuso em comentários.

**2. `org_tasks` — SÓ escrita (SELECT intocado):**
- `INSERT`: `admin OR sublider+ OR assigned_to = auth.uid()` (team_member só cria pra si).
- `UPDATE`: mesma alçada do SELECT (dono / líder|sublíder do projeto / admin).
- `DELETE`: `lider+` (remove ramo `created_by`).
- **Trigger** `BEFORE UPDATE`: se usuário não é `sublider+`, rejeita qualquer alteração fora de `status` (comparação via `to_jsonb(NEW) - 'status' - 'updated_at'` vs OLD).

**3. `org_task_comments.SELECT`**: `admin OR org_task_visivel(task_id)`.

**4. `ordem_servico.SELECT`**: `admin OR cliente_visivel_para(id_cliente) OR (cluster_id IS NOT NULL AND cluster_id = ANY(resolve_user_cluster_ids(auth.uid())))`.

**5. `projeto_justificativas.SELECT`**: substituir `USING(true)` por `admin OR EXISTS (SELECT 1 FROM projects p WHERE p.id = projeto_id AND (p.cluster_id IS NULL OR p.cluster_id = ANY(resolve_user_cluster_ids(auth.uid()))))`. INSERT/UPDATE/DELETE de justificativas ficam intocados nesta onda (`true`) — Patricia não alinhou escrita ainda.

### GATES pós-migração
1. **SELECT de `org_tasks` inalterado** (comparar `qual` com baseline). Se mudou → rollback.
2. **0 tarefas órfãs** verificado ao vivo (382/382 com dono) — nenhum team_member perde visibilidade.
3. Simular team_member: UPDATE de status próprio ✅; UPDATE de `title` próprio ❌ (trigger); UPDATE de tarefa de outro ❌; INSERT com `assigned_to != me` ❌; DELETE ❌.
4. Simular sublíder: INSERT/UPDATE em tarefa da equipe ✅; DELETE ❌.
5. `ordem_servico`: usuário com cluster OSG vê OS dos clientes visíveis + OS com `cluster_id` do usuário; usuário sem cluster relevante vê 0 (admin vê tudo).
6. `projeto_justificativas`: usuário só vê justificativa de projeto do seu cluster.

### Rollback
Dropar policies novas + `org_task_visivel` + trigger/função `org_tasks_team_member_status_only`; recriar policies do baseline (dump acima).

### Frontend
Nenhuma mudança — SELECT de `org_tasks` preservado; hooks existentes continuam funcionando. Se o trigger disparar em edição de team_member, a mensagem "team_member só pode alterar o status da própria tarefa (RLS-06)" será exibida via toast pelo padrão atual de erros de mutação.
