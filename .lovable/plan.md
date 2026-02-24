

# Corrigir bug de data registrada um dia antes

## Problema

Ao selecionar uma data no calendario de tarefas fiscais, a data e salva corretamente (usando `format(date, 'yyyy-MM-dd')` que usa componentes locais). Porem, ao **reabrir** uma tarefa para edicao, a data e parseada com `new Date("2025-03-15")`, que o JavaScript interpreta como meia-noite UTC. No fuso horario do Brasil (UTC-3), isso vira 21h do dia **anterior**, causando a impressao de que a data foi registrada errada.

O mesmo problema ocorre em `start_date`.

## Solucao

Usar a funcao `parseDate` que ja existe em `src/lib/dateUtils.ts` para parsear as strings de data de forma segura, evitando a conversao UTC.

## Mudancas

### Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

1. Importar `parseDate` de `@/lib/dateUtils`
2. Linha 199: trocar `new Date((task as any).start_date)` por `parseDate((task as any).start_date)`
3. Linha 200: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`

Isso garante que a string `"2025-03-15"` seja parseada como 15 de marco no horario local, sem deslocamento de fuso.

## Resultado esperado

- A data selecionada no calendario sera exibida e salva corretamente, sem deslocar um dia para tras
- Nenhuma mudanca visual ou de comportamento alem da correcao do bug
