

## Plano: Atualizar TaskCalendar para ficar igual ao SprintCalendar

### Arquivo: `src/components/equipe/fiscal/tasks/TaskCalendar.tsx`

**Todas as alterações em um único arquivo:**

1. **Imports**: Adicionar `getTodayBrazil` de `@/lib/dateUtils`, remover `isSameMonth` (não usado para dias fora do mês).

2. **Remover `priorityColors`** — substituído por `statusColors` já importado.

3. **Adicionar legenda de status no header** — ao lado dos botões de navegação, mostrar os 6 status com dot colorido (`bgSolid`) + label, visível apenas em `sm:flex`.

4. **Cells dos dias**: Trocar `aspect-square` por `min-h-[80px] sm:min-h-[100px]`, layout `flex flex-col items-start overflow-hidden`.

5. **Conteúdo das cells**: Substituir dots de prioridade por barras verticais coloridas (por status via `statusColors[task.status]?.bgSolid`) + título truncado, limitando a 2 tarefas + "+N mais".

6. **Click condicional**: Só abrir Sheet quando `dayTasks.length > 0`.

7. **Usar `getTodayBrazil()`** em vez de `new Date()` para `isToday`.

8. **Remover `isSameMonth`** do import e da lógica (só renderiza dias do mês atual via `eachDayOfInterval`).

O `statusColors` em `taskStatusColors.ts` já cobre todos os 6 status usados (`backlog`, `waiting_client`, `todo`, `in_progress`, `review`, `done`). Nenhuma alteração necessária nesse arquivo.

O Sheet lateral continuará usando `TaskCard` sem alterações.

