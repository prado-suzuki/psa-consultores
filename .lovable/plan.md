
## Remover SLA de inatividade e usar o campo `deadline` para acionar notificações de vencimento

### Situação atual

Existem dois mecanismos de prazo independentes e conflitantes:

1. **Campo `deadline`** (tabela `tickets`): data definida manualmente pela gestora na listagem de chamados, com opções de 1 a 15 dias. Exibido visualmente com cores na UI.
2. **Cron job `check-ticket-deadlines-daily`** (roda 11:00 UTC): filtra tickets com `updated_at >= 5 dias atrás` e dispara `ticket_overdue` para o gestor — **não lê o campo `deadline`**.

O objetivo é eliminar a lógica de inatividade e usar exclusivamente o campo `deadline` para disparar o webhook.

---

### O que muda

#### 1. Edge Function `check-ticket-deadlines` (reescrita)

A lógica de filtragem muda de:
```
now - updated_at >= 5 dias
```
para:
```
deadline <= hoje  AND  status NOT IN ('resolvido', 'fechado')
```

- Buscar tickets com `deadline` preenchido, vencido ou igual a hoje, e status ainda aberto
- Para cada ticket, calcular `dias_atraso = hoje - deadline` (pode ser 0 se vence hoje)
- Chamar `notify-ticket` com `event_type: "ticket_overdue"` e `dias_atraso` correto
- Tickets **sem `deadline`** definido são ignorados (sem prazo = sem alerta automático)

Nova query Supabase dentro da edge function:
```typescript
const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

const { data: tickets } = await supabase
  .from("tickets")
  .select("id, title, deadline, user_id, assigned_to")
  .not("status", "in", '("resolvido","fechado")')
  .not("deadline", "is", null)
  .lte("deadline", today)
  .order("deadline", { ascending: true });
```

O `dias_atraso` passa a ser calculado com base na diferença entre `hoje` e `ticket.deadline` (em vez de `today - updated_at`).

#### 2. Cron job (sem mudança de horário ou frequência)

O job `check-ticket-deadlines-daily` continua rodando às **11:00 UTC todos os dias**. Nenhuma alteração no agendamento — só a edge function muda.

#### 3. `notify-ticket` (sem alteração)

A edge function `notify-ticket` já recebe `dias_atraso` e já trata `ticket_overdue` enviando apenas para o gestor. Nenhuma mudança necessária.

---

### O que NÃO muda

| Item | Status |
|---|---|
| Campo `deadline` no banco | Já existe, sem alteração |
| UI de definição de prazo em `GestaoChamados.tsx` | Sem alteração |
| Indicadores visuais de cor na listagem | Sem alteração |
| `notify-ticket` edge function | Sem alteração |
| Cron job schedule (11:00 UTC diário) | Sem alteração |
| Comportamento para tickets sem `deadline` | Ignorados (correto — sem prazo, sem alerta) |

---

### Arquivo a editar

| Arquivo | Ação |
|---|---|
| `supabase/functions/check-ticket-deadlines/index.ts` | Reescrever lógica de filtragem para usar `deadline <= hoje` |

---

### Comportamento resultante

- Ticket com `deadline = 2026-02-20` → notificado no dia 20/02 às 11:00 UTC (vence hoje, `dias_atraso = 0`)
- Ticket com `deadline = 2026-02-18` → notificado às 11:00 UTC a partir do dia 18 em diante (`dias_atraso >= 1`)
- Ticket sem `deadline` → nunca notificado pelo cron
- Ticket `resolvido` ou `fechado` → nunca notificado
