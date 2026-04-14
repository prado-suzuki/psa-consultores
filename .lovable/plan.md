

# AdminChamados.tsx — Migração para hooks + correção de deadline

## Diagnóstico

AdminChamados.tsx tem **3 queries inline + 1 mutation**:

| # | Função | Tabela | Operação |
|---|--------|--------|----------|
| 1 | `fetchTickets` (L193-261) | `tickets` + `profiles_safe` + `ticket_attachments` | SELECT (4 queries encadeadas) |
| 2 | `fetchAgents` (L171-191) | `user_roles` + `profiles_safe` | SELECT (2 queries encadeadas) |
| 3 | `assignAgent` (L417-445) | `tickets` | UPDATE |

**Deadline**: Já usa `deadline` real do banco com fallback 5 dias (L61-103). Lógica **já está correta** — idêntica à de EquipeChamados/GestaoChamados.

## Plano

### Substituições

| Inline | Hook existente |
|--------|---------------|
| `fetchTickets` | `useTicketsList()` de `useTickets.ts` |
| `fetchAgents` | `useTicketAgents()` de `useTickets.ts` |
| `assignAgent` | `useAssignTicket()` de `useTicketMutations.ts` |

### Alterações em AdminChamados.tsx

**Remover**:
- Imports: `supabase`, `useQueryClient`
- Interface local `Profile`, `Ticket` (usar tipos de `useTickets.ts`)
- `useState` para `tickets`, `agents`, `loading`
- `useEffect` com `fetchTickets`/`fetchAgents`
- Funções `fetchTickets`, `fetchAgents`, `assignAgent`

**Adicionar**:
- `import { useTicketsList, useTicketAgents } from '@/hooks/useTickets'`
- `import { useAssignTicket } from '@/hooks/useTicketMutations'`
- `const { data: tickets = [], isLoading: loading } = useTicketsList()`
- `const { data: agents = [] } = useTicketAgents()`
- `const assignMutation = useAssignTicket()`
- Handler `assignAgent` chama `assignMutation.mutate(...)` com toast no `onSuccess`

**Manter inalterado**:
- `calcularPrazoResposta` (lógica de deadline já correta)
- Constantes de cores/labels
- Toda lógica de filtros e ordenação (`filteredAndSortedTickets`)
- JSX completo

### Resultado
- Zero `supabase.from()` no componente
- ~90 linhas removidas (fetching + state + interfaces)
- Deadline: sem alteração necessária (já usa padrão correto)
- 0 hooks novos, 0 alterações de banco

