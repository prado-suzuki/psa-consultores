

# Correção do Sheet cortado no SprintCalendar

## Problema
O `SheetContent` no `SprintCalendar.tsx` usa o tamanho padrão `sm:max-w-sm` (384px), que é estreito demais para exibir os títulos das tarefas sem corte. Além disso, o título usa `truncate` que corta o texto.

## Solução

**Arquivo:** `src/components/sprint/SprintCalendar.tsx`

1. Aumentar a largura do `SheetContent` para `sm:max-w-md` (448px), alinhando com o padrão visual do TaskCalendar de tarefas fiscais
2. Remover `truncate` do título da tarefa e usar `break-words` para exibir o texto completo nos cards do sheet

Alteração única e pontual — apenas 2 linhas modificadas no componente.

