

# Remover hardcode de assigned_to nos chamados

## Alterações

**Arquivo 1:** `src/pages/cliente/NovoChamado.tsx` (linha 100)
- Remover a linha `assigned_to: '0a58af80-e2d4-4a7d-bbd1-0a532b71e3e6'` e o comentário de teste

**Arquivo 2:** `src/components/gestao/CreateTicketDialog.tsx` (linha 148)
- Remover a linha `assigned_to: '0a58af80-e2d4-4a7d-bbd1-0a532b71e3e6'` e o comentário de teste

Ambos os inserts voltarão a criar tickets sem `assigned_to` pré-definido, permitindo que a atribuição siga o fluxo normal.

