# Corrigir exclusão de projeto e padronizar regra de exclusão de tarefas (OSG/Tax)

Base: instrução detalhada em `prompt-lovable-exclusao-projeto-osg.md` (upload do usuário).

## Problema

`org_tasks.project_id` é `NOT NULL`, mas a FK `org_tasks_project_id_fkey` é `ON DELETE SET NULL` — contradição que torna impossível excluir qualquer projeto com tarefas (erro 23502, exibido ao usuário como "Operação não permitida para o seu perfil"). Em produção, 91 dos 110 projetos estão nessa situação.

## Regra de negócio (definida pela liderança)

Só tarefas em **Backlog** (`backlog`) e **A Fazer** (`todo`) podem ser excluídas. Demais status bloqueiam: `waiting_client`, `in_progress`, `review`, `em_ajuste`, `done`. Vale para tarefa, subtarefa, qualquer nível, e para exclusão em cascata via projeto.

## Passos

### 1. Migration (idempotente, timestamp real)

Em `supabase/migrations/`:

- Recriar a FK `org_tasks_project_id_fkey` como `ON DELETE CASCADE` (drop constraint if exists + add constraint).
- Criar a função `public.org_tasks_bloqueia_delete_iniciada()` (trigger BEFORE DELETE FOR EACH ROW): se `OLD.status not in ('backlog','todo')`, `raise exception` com mensagem citando título e rótulo do status em PT-BR (sem `USING ERRCODE` — P0001 entrega a mensagem literal via caminho `trigger_blocked` do `can_perform`).
- Criar o trigger `trg_org_tasks_bloqueia_delete_iniciada` em `public.org_tasks` (drop if exists antes). **Sem** `pg_trigger_depth()` — precisa disparar dentro da cascata para cobrir subtarefas/netas.
- Aplicar no Lovable Cloud e regenerar `src/integrations/supabase/types.ts`.

### 2. `src/hooks/useOrgTasks.ts`

- Renomear `contarSubtarefasAtivas` → `contarSubtarefasBloqueantes` e `mensagemSubtarefasAtivas` → `mensagemSubtarefasBloqueantes` (`done` não é "ativa" mas bloqueia).
- Trocar o predicado `.neq('status','done')` por `.not('status','in','("backlog","todo")')`.
- Nova mensagem: "Existe(m) N subtarefa(s) fora de Backlog/A Fazer. Só tarefas em Backlog ou A Fazer podem ser excluídas."
- Atualizar os dois pontos de uso: `PainelTarefas.tsx` (linhas 12-13, 258, 269) e `useDeleteOrgTask` (linhas 731-732).

### 3. `src/hooks/useOrgProjects.ts`

- Adicionar `resumoExclusaoProjeto(projectId)`: conta tarefas do projeto e quantas estão fora de backlog/todo; retorna `{ total, bloqueantes }`.
- `useDeleteOrgProject` **não muda** — o trigger entrega a mensagem literal na tela.

### 4. `src/hooks/useProjetosCadastroController.ts`

- Criar `handleRequestDelete(projectId)`: chama `resumoExclusaoProjeto` antes de abrir o diálogo.
  - `bloqueantes > 0` → `toast.error` ("Não é possível excluir este projeto: N tarefa(s) estão fora de Backlog/A Fazer...") e **não** abre o diálogo.
  - Caso contrário → guarda `total` no estado e abre o diálogo.
- Expor `handleRequestDelete` e o total no contexto. Em `PainelTarefas.tsx`, trocar `onDeleteProject={projectController.setDeleteProjectId}` por `handleRequestDelete`. Verificar também o uso equivalente em `ProjetosCadastroTable.tsx` e `EquipeProjetos.tsx` para manter a mesma regra em todos os caminhos de exclusão.

### 5. `src/components/equipe/projetos-cadastro/ProjetoDeleteDialog.tsx`

- Descrição condicional conforme `total`:
  - `0`: "Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
  - `>0`: "Este projeto tem N tarefa(s) em Backlog/A Fazer, que serão excluídas junto com ele. Esta ação não pode ser desfeita."

## NÃO fazer (restrições do briefing)

- Não alterar `can_perform` nem `src/lib/rlsMessages.ts`.
- Não adicionar `pg_trigger_depth()` ao trigger.
- Não remover o `NOT NULL` de `org_tasks.project_id`.
- Não mexer em `validate_org_task_reviewer` nem em `org_tasks_team_member_status_only`.

## Validação no preview (nesta ordem)

1. Projeto sem tarefa → exclui normalmente.
2. Projeto só com Backlog/A Fazer → diálogo avisa a quantidade e exclui.
3. Projeto com tarefa Em Progresso → recusa antes de abrir o diálogo, com a quantidade.
4. Tarefa Concluída avulsa → recusa com a mensagem do trigger citando o título.
5. Tarefa A Fazer com subtarefa em Revisão → recusa.

## Detalhes técnicos

- Ordem: migration primeiro (banco recebe a regra antes do código), types regenerado, depois front.
- Testes: atualizar `ProjetosTarefasList.test.tsx` se quebrar pela troca de prop; rodar typecheck + testes afetados ao final.
- Impacto esperado em produção: 11 projetos passam a ser excluíveis (43 tarefas backlog/todo), 19 sem tarefa continuam excluíveis, 80 seguem bloqueados com mensagem explicativa.
