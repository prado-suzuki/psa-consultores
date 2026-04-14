

# Correções de Prazo/Deadline na Área de Chamados

## Resumo
3 arquivos editados, zero mudança de banco. Unificar lógica de prazo para usar o campo `deadline` real do banco com fallback para 5 dias hardcoded.

---

## 1. `GestaoChamados.tsx` — L187

Adicionar `deadline` ao `.select()`:

```ts
.select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status, deadline, estrutura_area_id')
```

---

## 2. `useTicketNotifications.ts`

**a)** Adicionar `deadline, created_at` ao `.select()` da query (L66-75).

**b)** Alterar `calcularPrazoNotification` para aceitar `deadline: string | null` e `createdAt: string`:
- Se `deadline` existir → calcular dias restantes como `deadline - hoje` (dias corridos)
- Se `deadline` for null → fallback: `created_at + 5 dias úteis - hoje` (lógica atual)

**c)** Atualizar a chamada no `.map()` para passar `ticket.deadline` e `ticket.created_at`.

---

## 3. `EquipeChamados.tsx`

**a)** Adicionar `deadline` à interface `Ticket`:
```ts
deadline: string | null;
```

**b)** Adicionar `deadline` ao `.select()` da `fetchTickets` (L216).

**c)** Incluir `deadline` no mapeamento `enrichedTickets` (L250-265).

**d)** Alterar `calcularPrazoResposta` para aceitar `deadline: string | null` como 5º parâmetro:
- Se `deadline` existir → calcular prazo a partir dele (dias corridos até deadline)
- Se null → manter lógica atual (5 dias a partir de `dataReferencia`)

**e)** Atualizar todas as 16 chamadas de `calcularPrazoResposta` para passar `ticket.deadline` como 5º argumento (4 locais distintos: L395, L411-412, L778).

---

## Nota
Segue a regra do AI_CONTEXT de exceções toleradas para queries inline — refatoração para hooks será feita em etapa posterior.

