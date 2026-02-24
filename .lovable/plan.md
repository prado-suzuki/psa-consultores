

# Corrigir bug de timezone nas datas das tarefas fiscais

## Problema

Ao cadastrar uma tarefa com data de entrega dia 27, ela aparece como dia 26. O `new Date("2026-02-27")` interpreta como UTC meia-noite, que no fuso brasileiro (UTC-3) vira dia 26 as 21h.

## Arquivos e alteracoes

### 1. `src/components/equipe/fiscal/tasks/TaskCalendar.tsx`
- **Linha 38**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 2. `src/components/equipe/fiscal/tasks/TaskTable.tsx`
- **Linha 185**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 3. `src/components/equipe/fiscal/tasks/TaskCard.tsx`
- **Linha 130**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- **Linha 248**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 4. `src/components/equipe/fiscal/tasks/TaskTodayView.tsx`
- **Linha 35**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 5. `src/components/equipe/fiscal/tasks/TaskFutureView.tsx`
- **Linha 25**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- **Linha 38**: trocar `new Date(task.due_date)` por `parseDate(task.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 6. `src/components/equipe/fiscal/FiscalWorkPackages.tsx`
- **Linha 134**: trocar `new Date(wp.due_date)` por `parseDate(wp.due_date)`
- **Linha 346**: trocar `new Date(wp.due_date)` por `parseDate(wp.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

### 7. `src/components/equipe/fiscal/WorkPackageSheet.tsx`
- **Linha 273**: trocar `new Date(workPackage.start_date)` por `parseDate(workPackage.start_date)`
- **Linha 284**: trocar `new Date(workPackage.due_date)` por `parseDate(workPackage.due_date)`
- Adicionar import de `parseDate` de `@/lib/dateUtils`

## Resumo

Total: **7 arquivos**, **10 ocorrencias** de `new Date()` com strings de data a serem substituidas por `parseDate()`. O formulario de criacao/edicao (TaskModal.tsx) ja usa `parseDate` corretamente -- nenhuma alteracao necessaria la. Nenhuma mudanca de banco de dados.

