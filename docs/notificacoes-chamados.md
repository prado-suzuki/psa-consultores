# Notificações de Chamados

## Visão Geral

O sistema de notificações de chamados envia e-mails transacionais quando:
1. **Novo chamado é criado** → notifica gestores/admins
2. **Chamado é atribuído** → notifica o cliente e o responsável
3. **Equipe responde** → notifica o cliente e admins
4. **Cliente responde** → notifica o agente atribuído e admins
5. **Prazo vencido** → notifica gestores/admins
6. **Chamado resolvido** → notifica o cliente e admins

## Arquitetura

```
Frontend → Edge Function (notify-ticket) → Webhook n8n (único POST) → Gmail
```

### Edge Function: `notify-ticket`

Recebe via POST:
- `event_type`: `"ticket_created"`, `"ticket_assigned"`, `"ticket_replied"`, `"ticket_overdue"` ou `"ticket_resolved"`
- `ticket_id`: UUID do chamado
- `actor_name`: nome de quem realizou a ação
- `message_preview`: trecho da mensagem (opcional)
- `dias_atraso`: dias de atraso (usado em `ticket_overdue`)

Lógica:
1. Busca dados do ticket no banco
2. Determina destinatários com base no evento
3. Busca nome e e-mail do cliente (uma única vez)
4. Envia **um único POST** ao webhook n8n com todos os destinatários

### Workflow n8n

- **Nome**: `PSA - Teste Notificacao Chamado`
- **Webhook**: configurado via secret `N8N_WEBHOOK_URL`
- **Ação**: recebe payload consolidado e itera sobre `recipients` para disparar e-mails via Gmail

### Payload enviado ao n8n

```json
{
  "event_type": "ticket_assigned",
  "ticket_data": {
    "id": "uuid",
    "title": "Título do chamado",
    "department": "ICMS/IPI",
    "priority": "Normal",
    "description": "Descrição do chamado",
    "cliente_nome": "João Silva",
    "cliente_email": "joao@empresa.com",
    "assigned_to_name": "Ana Santos",
    "actor_name": "Sistema",
    "message_preview": "",
    "user_id": "uuid",
    "dias_atraso": 0
  },
  "recipients": [
    {
      "email": "joao@empresa.com",
      "role": "cliente",
      "ticket_url": "https://psa-consultores.lovable.app/cliente/chamados/UUID"
    },
    {
      "email": "ana@psa.com",
      "role": "responsavel",
      "ticket_url": "https://psa-consultores.lovable.app/equipe/chamados/UUID"
    }
  ]
}
```

### Campos importantes

| Campo | Descrição |
|---|---|
| `ticket_data.cliente_email` | E-mail do cliente que abriu o chamado (disponível em todos os eventos) |
| `ticket_data.cliente_nome` | Nome do cliente |
| `recipients[].email` | E-mail do destinatário |
| `recipients[].role` | Papel: `"cliente"`, `"responsavel"` ou `"gestor"` |
| `recipients[].ticket_url` | Link específico para o portal do destinatário |

## Configuração no n8n

O workflow deve:
1. Receber `recipients` (array) no webhook
2. Usar um nó "Loop Over Items" para iterar sobre os destinatários
3. Para cada item, usar `recipients[i].email` como destinatário e `recipients[i].ticket_url` como link
4. Usar `recipients[i].role` para escolher o template adequado
5. O campo `ticket_data.cliente_email` está disponível para referenciar o e-mail do cliente em qualquer template

## Secrets necessários

| Secret | Descrição |
|---|---|
| `N8N_WEBHOOK_URL` | URL do webhook n8n para disparo de e-mails |
