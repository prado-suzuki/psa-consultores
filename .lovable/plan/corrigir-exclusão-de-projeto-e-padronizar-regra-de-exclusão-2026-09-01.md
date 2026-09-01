# Corrigir exclusão de projeto e padronizar regra de exclusão de tarefas (OSG/Tax)

Base: instrução corrigida em `prompt-lovable-exclusao-projeto-osg-CORRIGIDO.md` (upload do usuário), referências verificadas contra `main` no commit `9e6b498c`. Substitui o plano anterior.

## Problema

`org_tasks.project_id` é `NOT NULL`, mas a FK `org_tasks_project_id_fkey` é `ON DELETE SET NULL` — contradição que torna impossível excluir qualquer projeto com tarefas (erro 23502, exibido como "Operação não permitida para o seu perfil", porque `can_perform` só captura P0001/42501). Em produção, 91 dos 110 projetos estão nessa situação.

## Regra de negócio (definida pela liderança)

Só tarefas em **Backlog** (`backlog`) e **A Fazer** (`todo`) podem ser excluídas. Bloqueiam: `waiting_client`, `in_progress`, `review`, `em_ajuste`, `done`. Vale para tarefa, subtarefa, qualquer nível, e para a cascata via projeto. Sem válvula de escape, nem para admin. Inverte a regra atual de subtarefa (hoje `done` é o único excluível; passa a ser o único bloqueante).

## Passos

### 1. Migration (idempotente, timestamp real)

Em `supabase/migrations/`, SQL fornecido no briefing:

- Recriar a FK `org_tasks_project_id_fkey` como `ON DELETE CASCADE` (drop constraint if exists + add constraint).
- Criar `public.org_tasks_bloqueia_delete_iniciada()` (trigger BEFORE DELETE FOR EACH ROW): se `OLD.status not in ('backlog','todo')`, `raise exception` com título e rótulo PT-BR do status. **Sem** `USING ERRCODE` — o P0001 padrão é o que entrega a mensagem literal na tela pelo caminho `trigger_blocked` já existente.
- Criar o trigger `trg_org_tasks_bloqueia_delete_iniciada` (drop if exists antes). **Sem** `pg_trigger_depth()` — precisa disparar dentro da cascata para cobrir subtarefas/netas.
- Aplicar no Lovable Cloud e regenerar `src/integrations/supabase/types.ts`.

Raio de alcance (verificado no briefing): único delete de `org_tasks` no app é `useDeleteOrgTask` (`useOrgTasks.ts:739`); a edge `delete-team-member` só nullifica colunas; nada apaga `org_projects` fora do app.

### 2. `src/hooks/useOrgTasks.ts`

- Renomear `contarSubtarefasAtivas` (`:707`) → `contarSubtarefasBloqueantes` e `mensagemSubtarefasAtivas` (`:717`) → `mensagemSubtarefasBloqueantes`.
- Trocar o predicado `.neq('status','done')` por `.not('status','in','("backlog","todo")')`.
- Nova mensagem: "Existe(m) N subtarefa(s) fora de Backlog/A Fazer. Só tarefas em Backlog ou A Fazer podem ser excluídas."
- Atualizar os usos: `PainelTarefas.tsx:12-13, 258, 269` e `useOrgTasks.ts:731-732` (dentro de `useDeleteOrgTask`).

### 3. `src/hooks/useOrgProjects.ts`

- Adicionar `resumoExclusaoProjeto(projectId)`: select de `status` das tarefas do projeto; retorna `{ total, bloqueantes }` (bloqueantes = fora de backlog/todo).
- `useDeleteOrgProject` (`:565`) **não muda** — o trigger P0001 entrega a mensagem literal na tela.

### 4. Guarda na PORTA, não nos chamadores — `src/hooks/useProjetosCadastroController.ts`

Existem duas rotas até o diálogo de exclusão: dropdown da lista (via `PainelTarefas.tsx:429`) e lixeira da tabela de cadastro (`ProjetosCadastroTable.tsx:78`, contexto direto, **não** passa pelo `PainelTarefas`). Por isso a regra vai no controller:

- Criar `handleRequestDelete(projectId)`: chama `resumoExclusaoProjeto` antes de abrir o diálogo.
  - `bloqueantes > 0` → `toast.error` ("Não é possível excluir este projeto: N tarefa(s) estão fora de Backlog/A Fazer. Só projetos sem tarefas, ou com tarefas em Backlog/A Fazer, podem ser excluídos.") e **não** abre o diálogo.
  - Caso contrário → guarda `total` no estado e abre o diálogo.
- **Parar de expor `setDeleteProjectId` cru** no retorno do controller (`:439`). Expor `handleRequestDelete` para abrir e `closeDeleteDialog()` para fechar (o `ProjetoDeleteDialog.tsx:6` usa `setDeleteProjectId(null)` no `onOpenChange`).
- Atualizar os consumidores: `PainelTarefas.tsx:429` e `ProjetosCadastroTable.tsx:51,78`.

### 5. `src/components/equipe/projetos-cadastro/ProjetoDeleteDialog.tsx`

- Descrição condicional conforme `total`:
  - `0`: "Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
  - `>0`: "Este projeto tem N tarefa(s) em Backlog/A Fazer, que serão excluídas junto com ele. Esta ação não pode ser desfeita."

### 6. Testes

- `src/components/equipe/tarefas/ProjetosTarefasList.test.tsx:57` — passa `onDeleteProject={noop}`.
- `src/pages/equipe/fiscal/FiscalProjetosCadastro.test.tsx:99` — mocka `useDeleteOrgProject` e renderiza `ProjetosCadastroContent`; mais provável de quebrar pela mudança do contexto.
- Rodar typecheck e os testes afetados ao final.

## NÃO fazer

- Não tocar em `src/pages/equipe/EquipeProjetos.tsx` — é do módulo mapa, apaga da tabela `projects`, não `org_projects`.
- Não alterar `can_perform` nem `src/lib/rlsMessages.ts`.
- Não adicionar `pg_trigger_depth()` ao trigger.
- Não remover o `NOT NULL` de `org_tasks.project_id`.
- Não mexer em `validate_org_task_reviewer` nem `org_tasks_team_member_status_only`.

## Validação no preview (nesta ordem)

1. Projeto sem tarefa → exclui normalmente.
2. Projeto só com Backlog/A Fazer → diálogo avisa a quantidade e exclui.
3. Projeto com tarefa Em Progresso → recusa antes de abrir o diálogo, com a quantidade.
4. Tarefa Concluída avulsa → recusa com a mensagem do trigger citando o título.
5. Tarefa A Fazer com subtarefa em Revisão → recusa.
6. Pela lixeira da tabela de cadastro (não a lista) → mesma recusa do caso 3 (caminho que não passa pelo `PainelTarefas`).

## Detalhes técnicos

- Ordem: migration primeiro (banco recebe a regra antes do código), types regenerado, depois front.
- Impacto esperado em produção: 11 projetos passam a ser excluíveis (43 tarefas backlog/todo, nenhuma com hora apontada), 19 sem tarefa continuam excluíveis, 80 seguem bloqueados com mensagem explicativa.
- As 43 tarefas apagadas por cascata não geram linha em `audit_logs` (cascade não passa pelo app) — gap aceito, já registrado em `docs/geral/auditoria-gaps-cud.md`.
