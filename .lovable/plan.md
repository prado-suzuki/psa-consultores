

# Renomear "Data de Entrega" para "Data de Vencimento"

## Escopo

Apenas **1 arquivo** precisa ser alterado nos componentes fiscais:

### `src/components/equipe/fiscal/tasks/TaskTable.tsx`
- **Linha 246**: Trocar o cabeçalho da tabela de `Data de Entrega` para `Data de Vencimento`

## Contexto

O formulário de criação/edição de tarefa (`TaskModal.tsx`) já usa "Data de Vencimento" (linha 569). Esta alteração alinha o cabeçalho da tabela com o formulário, mantendo consistência na nomenclatura.

Os demais componentes fiscais (TaskCard, TaskCalendar, TaskTodayView, TaskFutureView, WorkPackageSheet, FiscalWorkPackages) não exibem esse label textualmente — eles apenas mostram a data formatada sem rótulo visível, então não precisam de alteração.
