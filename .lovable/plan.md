

## Ocultar tarefas pai no Kanban quando possuem subtarefas

A tarefa pai (ex: "Analise do balancete") nao precisa aparecer no Kanban se suas subtarefas ja estao desmembradas como cards independentes. A informacao ja esta visivel nos badges dos cards filhos.

### Alteracao

**Arquivo: `src/components/equipe/fiscal/tasks/TaskKanban.tsx`**

Na funcao `getTasksByStatus`, adicionar um filtro que exclui tarefas que possuem pelo menos uma subtarefa:

```typescript
const tasksWithChildren = new Set(tasks.filter(t => t.parent_task_id).map(t => t.parent_task_id));

const getTasksByStatus = (status: FiscalTaskStatus) =>
  tasks.filter(t => t.status === status && !tasksWithChildren.has(t.id));
```

Isso remove do Kanban apenas as tarefas pai que tem filhos. Tarefas sem subtarefas continuam aparecendo normalmente.

### O que nao muda
- `TaskCard.tsx` permanece igual (badge de tarefa pai nos cards filhos continua)
- Nenhuma alteracao no banco ou no hook

