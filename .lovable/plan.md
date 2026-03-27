

## Diagnóstico

O filtro de responsável está em `src/hooks/useFiscalTasks.ts` linhas 105-109. Ele aplica `.eq('assigned_to', filterId)` **na query do banco**, eliminando tarefas pai antes mesmo de chegarem ao frontend. Como subtarefas dependem da tarefa pai para serem exibidas (a UI agrupa por `parent_task_id`), elas somem junto.

## Plano de correção

### Arquivo: `src/hooks/useFiscalTasks.ts`

**Remover o filtro `assignedTo` da query Supabase** e aplicá-lo no lado do cliente após o fetch, com lógica bidirecional:

```
// Após receber os dados do banco:
if (filters.assignedTo && filters.assignedTo !== 'all') {
  const targetId = filters.assignedTo === 'mine' ? user.id : filters.assignedTo;
  
  // IDs de subtarefas que batem com o filtro
  const matchingSubtaskParentIds = new Set(
    allTasks
      .filter(t => t.parent_task_id && t.assigned_to === targetId)
      .map(t => t.parent_task_id)
  );
  
  // Manter: tarefas atribuídas à pessoa OU pais de subtarefas atribuídas à pessoa
  // + as próprias subtarefas que batem
  filtered = allTasks.filter(t =>
    t.assigned_to === targetId ||
    matchingSubtaskParentIds.has(t.id) ||
    (t.parent_task_id && matchingSubtaskParentIds.has(t.parent_task_id))
  );
}
```

Isso garante que:
- Tarefas diretas do responsável aparecem
- Pais de subtarefas do responsável aparecem (como container)
- As subtarefas correspondentes aparecem dentro do pai

Nenhum outro arquivo precisa mudar — a filtragem é centralizada no hook.

