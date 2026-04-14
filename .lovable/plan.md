

# Migração de queries inline — Chamados (Etapas 1-4)

## Ajustes confirmados

1. **useTicketAreas**: `useEstruturaAreas` ja filtra `.eq('is_active', true)` (L22). Nao precisa de wrapper — componentes usarao `useEstruturaAreas` diretamente (sem `page_categories`, busca geral com `.eq('is_active', true)`). Porem `useEstruturaAreas` exige `category` obrigatorio e filtra por `page_categories`. As queries de chamados buscam TODAS as areas ativas sem filtro de category. Solucao: criar uma variante `useAllActiveAreas()` em `useEstruturaAreas.ts` (2 linhas) que nao filtra por category.

2. **downloadFile**: Sera funcao utilitaria em `src/lib/ticketUtils.ts`, nao hook.

---

## Arquivos a criar

### 1. `src/lib/ticketUtils.ts`
- `downloadTicketFile(filePath: string, fileName: string)` — download de storage + createObjectURL + click
- `isImageFile(fileType: string)` — helper reutilizado em 3 componentes

### 2. `src/hooks/useTickets.ts` — Queries de leitura

| Hook | Tabela(s) | Usado por |
|------|-----------|-----------|
| `useMyTickets(userId)` | `tickets` JOIN `profiles_safe` | MeusChamados |
| `useTicketsList(options?)` | `tickets` + `profiles_safe` + `ticket_attachments` | GestaoChamados, EquipeChamados |
| `useTicketDetail(ticketId)` | `tickets` + `profiles_safe` + `estrutura_areas` | GestaoDetalhes, EquipeDetalhes, DetalhesChamado |
| `useTicketMessages(ticketId, enrichProfiles?)` | `ticket_messages` + `profiles_safe` | GestaoDetalhes, EquipeDetalhes, DetalhesChamado |
| `useTicketAttachments(ticketId)` | `ticket_attachments` | GestaoDetalhes, EquipeDetalhes, DetalhesChamado |
| `useTicketAgents()` | `user_roles` + `profiles_safe` | GestaoChamados, GestaoDetalhes, EquipeChamados |

### 3. `src/hooks/useTicketMutations.ts` — Mutations

| Hook | Operacao | Usado por |
|------|----------|-----------|
| `useAssignTicket()` | UPDATE `tickets.assigned_to` + notify | GestaoChamados, GestaoDetalhes, EquipeChamados |
| `useUpdateTicketStatus()` | UPDATE `tickets.status` + notify | GestaoDetalhes, EquipeDetalhes |
| `useUpdateTicketDeadline()` | UPDATE `tickets.deadline` | GestaoChamados |
| `useSendTicketMessage()` | INSERT `ticket_messages` + UPDATE `tickets.activity_status` + notify | GestaoDetalhes, EquipeDetalhes, DetalhesChamado |
| `useUploadTicketAttachments()` | storage upload + INSERT `ticket_attachments` + notify | DetalhesChamado, EquipeDetalhes |
| `useDeleteTickets()` | DELETE cascata (storage + attachments + messages + tickets) | GestaoChamados |

Todas as mutations invalidam `['tickets']` e queries relacionadas.

### 4. `src/hooks/useCreateTicket.ts` — Criacao de chamados

| Hook | Operacao | Usado por |
|------|----------|-----------|
| `useCreateTicketCliente()` | resolve representante + INSERT ticket + upload files + notify | NovoChamado |
| `useCreateTicketGestao()` | INSERT ticket + upload files + notify | CreateTicketDialog |
| `useTicketEmpresas()` | SELECT `cliente` ativas | CreateTicketDialog |
| `useTicketAreasForCliente(clienteId)` | `cliente_clusters` + `estrutura_areas` | CreateTicketDialog |
| `useTicketClientProfiles()` | `user_roles` role=client + RPC `get_profiles_with_email` | CreateTicketDialog |

### 5. Alteracao em `src/hooks/useEstruturaAreas.ts`
Adicionar export `useAllActiveAreas()` — SELECT todas areas ativas sem filtro de `page_categories`.

---

## Etapa 4: Refatorar MeusChamados.tsx

- Remover import de `supabase`
- Remover `fetchTickets` inline (L95-115)
- Usar `useMyTickets(user?.id)` do novo hook
- Substituir `useState<Ticket[]>` + `useEffect` por dados do hook
- Manter toda logica de filtro client-side (useMemo) inalterada
- ~20 linhas removidas, ~5 adicionadas

---

## Resumo da execucao

| Etapa | Arquivo | Acao |
|-------|---------|------|
| 1 | `src/lib/ticketUtils.ts` | Criar |
| 1 | `src/hooks/useEstruturaAreas.ts` | Adicionar `useAllActiveAreas` |
| 2 | `src/hooks/useTickets.ts` | Criar (6 hooks) |
| 3 | `src/hooks/useTicketMutations.ts` | Criar (6 hooks) |
| 3 | `src/hooks/useCreateTicket.ts` | Criar (5 hooks) |
| 4 | `src/pages/cliente/MeusChamados.tsx` | Refatorar (1 query removida) |

- **5 arquivos criados/editados**
- **1 componente refatorado** (demais nas etapas 5-11)
- Zero alteracao de banco/RLS/rotas

