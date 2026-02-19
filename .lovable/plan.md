

## Filtrar "Tarefa Pai" pelo projeto selecionado

Atualmente, o campo "Tarefa Pai (subtarefa de)" mostra todas as tarefas de todos os projetos. O objetivo e filtrar para mostrar apenas as tarefas do projeto selecionado.

---

### O que muda

**Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`**

1. **Filtrar parentTasks pelo projeto selecionado:** Dentro do componente, criar uma lista filtrada `filteredParentTasks` que mostra apenas as tarefas cujo `project_id` corresponde ao `watchedProjectId`. Se nenhum projeto estiver selecionado, a lista fica vazia (ou mostra todas, conforme preferencia).

2. **Limpar parent_task_id ao trocar de projeto:** Adicionar logica no `useEffect` que ja limpa `categoria_id` para tambem limpar `parent_task_id` quando o projeto muda, evitando referencia a uma tarefa de outro projeto.

3. **Usar lista filtrada no Select:** Substituir `parentTasks` por `filteredParentTasks` no render do campo "Tarefa Pai".

---

### Detalhes tecnicos

```text
// Pseudo-codigo da logica:
const filteredParentTasks = watchedProjectId
  ? parentTasks.filter(t => t.project_id === watchedProjectId)
  : parentTasks;

// No useEffect de watchedProjectId, adicionar:
form.setValue('parent_task_id', undefined);
```

### O que NAO muda

- Nenhuma alteracao no banco de dados
- Nenhuma alteracao na pagina `FiscalDemandasTarefas.tsx` -- a filtragem acontece dentro do modal

