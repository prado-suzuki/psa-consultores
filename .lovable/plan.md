

## Fix: KPI Cards devem refletir os filtros ativos

### Causa raiz
`TaskKPICards` chama `useFiscalTasks({})` com filtros vazios (linha 7), ignorando completamente os filtros selecionados na página. Por isso os contadores são sempre estáticos.

### Solução

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskKPICards.tsx`

Receber as tasks já filtradas via props em vez de fazer query própria:

```tsx
interface TaskKPICardsProps {
  tasks: { status: string }[];
}

export const TaskKPICards = ({ tasks }: TaskKPICardsProps) => {
  const counts = statusList.reduce(...)  // mesmo cálculo, usando props
  ...
};
```

**Arquivo:** `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx`

Passar as tasks filtradas (já disponíveis na linha 43):

```tsx
<TaskKPICards tasks={tasks} />
```

### Alterações

| Arquivo | Mudança |
|---|---|
| `TaskKPICards.tsx` | Remover `useFiscalTasks`, receber `tasks` via props |
| `FiscalDemandasTarefas.tsx` | Passar `tasks={tasks}` ao componente |

