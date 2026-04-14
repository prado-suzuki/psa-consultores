
# Migração Etapas 5-8 — Plano resumido

## Etapa 5: DetalhesChamado.tsx (543 linhas)

**Remover**: `supabase` import, `fetchTicketDetails`, `fetchMessages`, `fetchAttachments`, `downloadFile`, `isImageFile`, `uploadFiles` inline, `handleSendMessage` inline, `useState` para ticket/messages/attachments/loading.

**Substituir por**:
- `useTicketDetail(id, { ownerOnly: user?.id })` → ticket data + loading
- `useTicketMessages(id, true)` → messages com enriquecimento de perfis admin
- `useTicketAttachments(id)` → attachments
- `useSendTicketMessage()` → handleSendMessage
- `useUploadTicketAttachments()` → uploadFiles
- `downloadTicketFile` + `isImageFile` de `@/lib/ticketUtils`
- Redirect on `!ticket && !isLoading` em vez de catch no fetch

## Etapa 6: NovoChamado.tsx (305 linhas)

**Remover**: `supabase` import, `uploadFiles` inline, toda lógica dentro de `handleSubmit` (representante lookup + insert + notify).

**Substituir por**:
- `useCreateTicketCliente()` mutation
- `handleSubmit` chama `createMutation.mutateAsync(...)` com validação Zod antes
- `loading` vem de `createMutation.isPending`

## Etapa 7: EquipeChamados.tsx (892 linhas)

**Remover**: `supabase` import, `useQueryClient`, `fetchTickets`, `fetchAgents`, `fetchAreas`, `assignAgent` inline, `useState` para tickets/agents/areas/areaMap/loading.

**Substituir por**:
- `useTicketsList({ assignedTo: user?.id, filterAssigned: !canAssignTickets })` → tickets + loading
- `useTicketAgents()` → agents (condicionado a canAssignTickets)
- `useAllActiveAreas()` → areas (já criado em useEstruturaAreas.ts)
- `useAssignTicket()` → assignAgent mutation
- `areaMap` derivado com `useMemo` de areas data

## Etapa 8: EquipeDetalhesChamado.tsx (637 linhas)

**Remover**: `supabase` import, `fetchTicketDetails`, `fetchMessages`, `fetchAttachments`, `downloadFile`, `isImageFile`, `uploadFiles`, `handleSendMessage`, `handleStatusChange` inline, `useState` para ticket/messages/attachments/loading/areaName.

**Substituir por**:
- `useTicketDetail(id)` → ticket data (inclui profiles e areaName)
- `useTicketMessages(id)` → messages (sem enriquecimento — equipe view)
- `useTicketAttachments(id)` → attachments
- `useSendTicketMessage()` → handleSendMessage (isAdmin: true)
- `useUpdateTicketStatus()` → handleStatusChange
- `useUploadTicketAttachments()` → uploadFiles
- `downloadTicketFile` + `isImageFile` de `@/lib/ticketUtils`
- Access check: `useEffect` redireciona se `ticket.assigned_to !== user.id`

## Ordem de execução
5 → 6 → 7 → 8 (sem dependências entre eles, mas menor risco primeiro)

## Resultado
- 4 componentes com zero `supabase.from()`
- ~200 linhas de lógica inline removidas
- 0 hooks novos (todos já existem das etapas 1-3)
- 0 alterações de banco/RLS/rotas
