

## Plano: Filtrar projetos pelo cliente selecionado no TaskModal

### O que muda

No `TaskModal.tsx`, 3 alterações simples:

1. **`filteredProjects` via `useMemo`** — filtra `projects` pelo `watchedClientId`. Se nenhum cliente selecionado, mostra todos.

```ts
const filteredProjects = useMemo(() => {
  if (!watchedClientId) return projects;
  return projects.filter(p => p.external_client_id === watchedClientId);
}, [projects, watchedClientId]);
```

2. **`useEffect` para limpar `project_id`** — quando o cliente muda e o projeto atual não pertence ao novo cliente, limpa a seleção.

3. **Dropdown de projetos (linha 405)** — trocar `projects` por `filteredProjects`.

### Arquivo alterado
- `src/components/equipe/fiscal/tasks/TaskModal.tsx`

Nenhuma alteração de banco ou RLS.

