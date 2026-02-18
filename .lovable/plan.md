

# Plano cumulativo: Melhorias no sistema de notificacoes + Upload de anexos

Este plano consolida TODAS as tarefas, mostrando o que ja foi implementado e o que resta.

---

## Tarefa 1 - Corrigir link do analista na notificacao de atribuicao -- CONCLUIDA

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Ja implementado: no evento `ticket_assigned` (linhas 148-155), o link do agente e forcado para `/equipe/chamados/${ticket.id}` diretamente, sem usar `getTicketUrlForUser`.

---

## Tarefa 2 - Adicionar cliente como destinatario na notificacao de atribuicao -- CONCLUIDA

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Ja implementado: no evento `ticket_assigned` (linhas 143-146), o e-mail do cliente e buscado e adicionado como destinatario com role "cliente".

---

## Tarefa 3 - Disparar notificacao ao atribuir chamado no EquipeChamados -- CONCLUIDA

**Arquivo**: `src/pages/equipe/EquipeChamados.tsx`

Ja implementado: apos atribuicao (linhas 264-273), a chamada fire-and-forget a `notify-ticket` com `event_type: 'ticket_assigned'` ja esta presente.

---

## Tarefa 4 - Notificar ao adicionar anexos (area da equipe) -- CONCLUIDA

**Arquivo**: `src/pages/equipe/EquipeDetalhesChamado.tsx`

Ja implementado: apos upload de anexos (linhas 237-245), a notificacao com `actor_name: 'Responsavel'` e `message_preview` contendo a quantidade de arquivos ja esta presente.

---

## Tarefa 5 - Adicionar upload de anexos na pagina do cliente -- CONCLUIDA

**Arquivo**: `src/pages/cliente/DetalhesChamado.tsx`

Ja implementado: funcionalidade completa de upload com `handleFileSelect`, `removeFile`, `uploadFiles`, UI com input oculto, botao de selecao, lista de arquivos e notificacao fire-and-forget (linhas 168-210).

---

## Tarefa 6 - Novo evento ticket_overdue para alerta de prazo vencido -- CONCLUIDA

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Ja implementado: bloco condicional para `ticket_overdue` (linhas 176-178) que notifica apenas o gestor.

---

## Tarefa 7 - Criar edge function check-ticket-deadlines -- CONCLUIDA

**Arquivo**: `supabase/functions/check-ticket-deadlines/index.ts`

Ja implementado: busca tickets abertos com `updated_at + 5 dias < agora`, calcula `dias_atraso` e chama `notify-ticket` com `event_type: 'ticket_overdue'`.

---

## Tarefa 8 - Consolidar webhooks em chamada unica + adicionar cliente_email -- PENDENTE

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Esta e a unica tarefa pendente. Duas mudancas combinadas:

### 8a. Adicionar `cliente_email` ao payload

Atualmente o `ticket_data` contem `cliente_nome` e `user_id`, mas nao o e-mail do cliente. Quando o destinatario e o responsavel, o n8n nao tem como saber o e-mail do cliente para enviar copia.

### 8b. Consolidar multiplos fetch em um unico POST

Atualmente a function faz um `Promise.allSettled` com N chamadas `fetch` ao webhook (uma por destinatario). Isso consome N execucoes no n8n. A mudanca envia um unico POST contendo o array completo de destinatarios.

### Detalhes tecnicos

Substituir o bloco de envio (linhas 198-234) por:

```typescript
// Buscar nome e email do cliente uma unica vez
const [clientName, clientEmail] = await Promise.all([
  getNameForUser(supabase, ticket.user_id),
  getEmailForUser(supabase, ticket.user_id),
]);

const ticketData = {
  id: ticket.id,
  title: ticket.title,
  department: ticketDepartment,
  priority: ticket.priority
    ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
    : "Normal",
  description: ticket.description || "",
  cliente_nome: clientName,
  cliente_email: clientEmail || "",
  user_id: ticket.user_id,
  actor_name: actor_name || "Sistema",
  message_preview: message_preview || "",
  assigned_to_name: assignedName,
  dias_atraso: dias_atraso || 0,
};

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type,
    ticket_data: ticketData,
    recipients: uniqueRecipients,
  }),
});

const success = response.ok;
```

Ajustar o retorno para refletir envio unico (1 fetch, nao N).

### Novo formato do payload recebido pelo n8n

```json
{
  "event_type": "ticket_assigned",
  "ticket_data": {
    "id": "uuid",
    "title": "Titulo do chamado",
    "department": "ICMS/IPI",
    "priority": "Normal",
    "cliente_nome": "Joao Silva",
    "cliente_email": "joao@empresa.com",
    "assigned_to_name": "Ana Santos",
    "actor_name": "Sistema",
    "message_preview": "",
    "dias_atraso": 0
  },
  "recipients": [
    {
      "email": "joao@empresa.com",
      "role": "cliente",
      "ticket_url": "https://psa-consultores.lovable.app/cliente/chamados/uuid"
    },
    {
      "email": "ana@psa.com",
      "role": "responsavel",
      "ticket_url": "https://psa-consultores.lovable.app/equipe/chamados/uuid"
    }
  ]
}
```

### Ajuste necessario no n8n (a cargo do usuario)

O workflow precisa ser ajustado para:
1. Receber `recipients` (array) em vez de `recipient_email` (string)
2. Usar um no "Loop Over Items" para iterar sobre os destinatarios
3. Para cada item, usar `recipients[i].email` como destinatario e `recipients[i].ticket_url` como link
4. O campo `ticket_data.cliente_email` esta disponivel para referenciar o e-mail do cliente em qualquer template

---

## Tarefa 9 - Atualizar documentacao -- PENDENTE

**Arquivo**: `docs/notificacoes-chamados.md`

Atualizar o exemplo de payload para refletir o novo formato com `recipients` (array) e `cliente_email` no `ticket_data`. Remover referencia ao antigo `recipient_email`.

---

## Resumo de status

| # | Tarefa | Status |
|---|--------|--------|
| 1 | Link do analista forcado para /equipe/ | Concluida |
| 2 | Cliente como destinatario na atribuicao | Concluida |
| 3 | Notificacao no assignAgent | Concluida |
| 4 | Notificacao ao anexar (equipe) | Concluida |
| 5 | Upload de anexos pelo cliente | Concluida |
| 6 | Evento ticket_overdue no notify-ticket | Concluida |
| 7 | Edge function check-ticket-deadlines | Concluida |
| 8 | Consolidar webhooks + cliente_email | **Pendente** |
| 9 | Atualizar documentacao | **Pendente** |

