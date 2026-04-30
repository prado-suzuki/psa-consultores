## Adicionar seletor de Prazo no detalhe do chamado

Hoje, em `/gestao/chamados/:id`, o card de detalhe permite alterar **Status** e **Responsável**, mas o **Prazo** só pode ser editado pela tabela em `/gestao/chamados`. Vou replicar o mesmo seletor no detalhe.

### O que será feito

1. **`src/pages/gestao/GestaoDetalhesChamado.tsx`**
   - Importar `useUpdateTicketDeadline` de `@/hooks/useTicketMutations`.
   - Importar utilitários: `format`, `addDays`, `differenceInCalendarDays`, `parseDate`, `isPastBrazil`, `isTodayBrazil`, `isTomorrowBrazil`.
   - Replicar a constante `deadlineOptions` (Sem prazo, 1, 3, 5, 7, 10, 15 dias) — mesmo padrão da listagem para manter consistência.
   - Adicionar `<Select>` "Prazo" ao lado do seletor de Responsável (linha ~220), seguindo o mesmo estilo (`w-40 bg-white border-slate-200`).
   - Handler `handleDeadlineChange(days)`: calcula `deadline = addDays(created_at, N)` no formato `yyyy-MM-dd` (ou `null` para "Sem prazo") e chama `updateDeadline.mutateAsync({ ticketId, deadline })`.
   - Função `getDeadlineSelectValue(ticket)`: igual à da listagem — retorna a chave do `deadlineOptions` correspondente ou `'none'`.
   - Adicionar uma `Badge` "Prazo: dd/MM/yyyy (Seg)" no grupo de badges existente (linha 224), colorida conforme vencimento (vermelho se atrasado, âmbar se hoje/amanhã, slate caso contrário) — mesmo padrão visual da tabela.
   - Toast de sucesso/erro via `useToast`.

### Notas técnicas

- O hook `useUpdateTicketDeadline` já existe e já registra auditoria via `useAuditLog` — nenhuma mudança necessária no backend ou em hooks.
- O campo `deadline` já é retornado por `useTicketDetail` (`src/hooks/useTickets.ts` linha 239).
- Sem mudanças de banco de dados, RLS ou edge functions.

### Arquivos alterados
- `src/pages/gestao/GestaoDetalhesChamado.tsx` (único arquivo)
