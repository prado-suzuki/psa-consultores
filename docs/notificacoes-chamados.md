# Notificações de Chamados

## Visão Geral

O sistema de notificações de chamados envia e-mails transacionais quando:
1. **Novo chamado é criado** → notifica gestores/admins
2. **Equipe responde** → notifica o cliente que abriu o chamado
3. **Cliente responde** → notifica o agente atribuído e admins

## Arquitetura

```
Frontend → Edge Function (notify-ticket) → Webhook n8n → Gmail
```

### Edge Function: `notify-ticket`

Recebe via POST:
- `event_type`: `"ticket_created"` ou `"ticket_replied"`
- `ticket_id`: UUID do chamado
- `actor_name`: nome de quem realizou a ação
- `message_preview`: trecho da mensagem (opcional)

Lógica:
1. Busca dados do ticket no banco
2. Determina destinatários com base no evento
3. Filtra por lista de teste (fase de testes)
4. Envia POST para webhook n8n

### Workflow n8n

- **Nome**: `PSA - Teste Notificacao Chamado`
- **Webhook**: configurado via secret `N8N_WEBHOOK_URL`
- **Ação**: recebe payload e dispara e-mail via Gmail

### Payload enviado ao n8n

```json
{
  "event_type": "ticket_created",
  "recipient_email": "email@exemplo.com",
  "ticket_title": "Título do chamado",
  "ticket_department": "ICMS/IPI",
  "actor_name": "João Silva",
  "message_preview": "",
  "ticket_url": "https://psa-consultores.lovable.app/gestao/chamados/UUID"
}
```

## Fase de Testes

Atualmente, apenas estes e-mails recebem notificações:
- `alexandre.silva@psaconsultores.com.br`
- `alexandre.g.s.silva04@gmail.com`

### Como ir para produção

No arquivo `supabase/functions/notify-ticket/index.ts`:

1. Remova a constante `TEST_EMAILS`
2. Remova o filtro `filteredEmails` e use `recipientEmails` diretamente
3. Deploy automático pelo Lovable

## Secrets necessários

| Secret | Descrição |
|---|---|
| `N8N_WEBHOOK_URL` | URL do webhook n8n para disparo de e-mails |
