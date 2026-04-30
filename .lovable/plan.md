# Bug: coluna "Fechado em" sempre mostra "—"

## Diagnóstico

O trigger `trg_tickets_set_closed_at` está funcionando perfeitamente — verifiquei no banco e todos os 277 tickets `resolvido` e 7 `fechado` têm `closed_at` preenchido, inclusive um ticket fechado em 16/04 e outros fechados hoje (30/04).

O problema é puramente **frontend**: em `src/hooks/useTickets.ts`, a função `useTicketsList` faz `SELECT` incluindo `closed_at`, mas o `.map()` final que monta cada objeto `TicketListItem` **não copia** o campo `closed_at` para o objeto retornado. Resultado: `ticket.closed_at` chega como `undefined` no componente, e o ternário em `GestaoChamados.tsx` (linha 659) cai sempre em `'—'`.

## Correção

Em `src/hooks/useTickets.ts`, dentro do `return ticketsData.map(ticket => ({ ... }))` da função `useTicketsList`, adicionar:

```ts
closed_at: ticket.closed_at ?? null,
```

ao lado de `updated_at`.

## Arquivos alterados

- `src/hooks/useTickets.ts` — uma linha adicionada no mapeamento do `useTicketsList`.

Não há mudanças de banco, migrations ou outros componentes — assim que o campo for propagado, a coluna "Fechado em" da `/gestao/chamados` passa a exibir a data corretamente para os tickets já fechados e para novos fechamentos.