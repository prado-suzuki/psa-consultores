
## Plano: Corrigir FK de project_id e Melhorar Subtarefas

### Problema 1: Erro de Foreign Key
A coluna `project_id` da tabela `fiscal_tasks` referencia `projects(id)`, mas o formulario seleciona projetos da tabela `tax_projects`. Isso causa o erro de FK ao salvar. A solucao e alterar a constraint para apontar para `tax_projects(id)`.

### Problema 2: Subtarefas
O campo "Tarefa Pai" ja existe no modal, mas so aparece se `parentTasks.length > 0`. Falta uma forma intuitiva de **criar subtarefas a partir de uma tarefa mae** (ex: botao "Adicionar Subtarefa" no card/tabela) e de **visualizar subtarefas** agrupadas sob a tarefa pai.

---

### Alteracoes

#### 1. Migracao de banco de dados
- Remover a FK atual `fiscal_tasks_project_id_fkey` que aponta para `projects(id)`
- Criar nova FK apontando para `tax_projects(id) ON DELETE SET NULL`

```sql
ALTER TABLE fiscal_tasks DROP CONSTRAINT fiscal_tasks_project_id_fkey;
ALTER TABLE fiscal_tasks ADD CONSTRAINT fiscal_tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES tax_projects(id) ON DELETE SET NULL;
```

#### 2. Botao "Adicionar Subtarefa" nas views

**Arquivo:** `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx`
- Adicionar funcao `handleAddSubtask(parentTask)` que abre o TaskModal com o `parent_task_id` pre-selecionado
- Passar essa funcao para TaskTable, TaskKanban, TaskCalendar, TaskCard

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskTable.tsx`
- Adicionar item "Adicionar Subtarefa" no dropdown de acoes de cada tarefa pai
- Exibir subtarefas indentadas abaixo da tarefa pai com indicador visual (linha ou recuo)

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskCard.tsx`
- Adicionar item "Adicionar Subtarefa" no dropdown de acoes
- Mostrar contador de subtarefas no card (ex: "3 subtarefas")

#### 3. Melhorar TaskModal para subtarefas

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskModal.tsx`
- Permitir que o campo "Tarefa Pai" sempre apareca (remover condicao `parentTasks.length > 0`)
- Quando aberto via "Adicionar Subtarefa", pre-selecionar o parent e herdar projeto/cliente da tarefa pai
- Usar valor `_none` em vez de string vazia para o SelectItem "Nenhuma" (corrige bug do Radix Select)

#### 4. Agrupamento visual na TaskTable

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskTable.tsx`
- Agrupar tarefas: primeiro renderizar tarefas pai, depois subtarefas logo abaixo com indentacao
- Botao expand/collapse para mostrar/ocultar subtarefas de cada tarefa mae
- Icone de subtarefa (seta curva ou indentacao) para diferenciar visualmente

### Detalhes Tecnicos

| Componente | Alteracao |
|---|---|
| Migracao SQL | Trocar FK de `projects` para `tax_projects` |
| `FiscalDemandasTarefas.tsx` | Novo handler `handleAddSubtask`, passar `onAddSubtask` para views |
| `TaskModal.tsx` | Aceitar prop `defaultParentId`; sempre mostrar campo parent; usar `_none` |
| `TaskTable.tsx` | Agrupar pai+filhos; expand/collapse; item "Adicionar Subtarefa" |
| `TaskCard.tsx` | Item "Adicionar Subtarefa" no menu; badge com contagem |

### Resultado Esperado
- Criar tarefas com projeto de `tax_projects` sem erro de FK
- Criar subtarefas diretamente a partir de qualquer tarefa
- Visualizar subtarefas agrupadas sob a tarefa mae na tabela
- Campo "Tarefa Pai" sempre disponivel no modal
