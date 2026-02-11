

# Agente de Notificacao de Chamados

## Estrategia

O workflow n8n ja esta criado e ativo (`PSA - Teste Notificacao Chamado`) com webhook em `https://digitalpsa26.app.n8n.cloud/webhook/psa-ticket-notify`. O workflow recebe um POST com dados do chamado e dispara e-mail via Gmail.

A estrategia e criar uma **Edge Function** (`notify-ticket`) que centraliza a logica de quem notificar e envia o payload para o webhook do n8n. O frontend chama essa Edge Function apos criar ou responder a um chamado. Isso e mais robusto que triggers de banco porque permite controlar exatamente o payload e os destinatarios.

### Fluxo

```text
[Cliente abre chamado] --> Frontend chama Edge Function notify-ticket
                              |
                              +--> Busca gestores (admin/gestao) no banco
                              +--> Envia POST para webhook n8n com dados
                              +--> n8n dispara e-mail via Gmail

[Equipe responde chamado] --> Frontend chama Edge Function notify-ticket
                              |
                              +--> Busca e-mail do cliente (user_id do ticket)
                              +--> Envia POST para webhook n8n com dados
                              +--> n8n dispara e-mail via Gmail
```

### Fase de testes

Para testes iniciais, os e-mails serao enviados APENAS para:
- `alexandre.silva@psaconsultores.com.br`
- `alexandre.g.s.silva04@gmail.com`

Isso sera controlado por uma lista fixa na Edge Function, facilmente removivel quando for para producao.

## Alteracoes necessarias

### 1. Criar Edge Function `supabase/functions/notify-ticket/index.ts`

A funcao recebe via POST:
- `event_type`: `"ticket_created"` ou `"ticket_replied"`
- `ticket_id`: UUID do chamado
- `actor_name`: nome de quem realizou a acao
- `message_preview`: trecho da mensagem (opcional, para respostas)

Logica interna:
1. Busca dados do ticket (titulo, departamento, user_id)
2. Determina destinatarios com base no `event_type`:
   - `ticket_created`: notifica gestores (hardcoded para teste)
   - `ticket_replied`: busca e-mail do cliente (user_id) ou do agente (assigned_to) conforme quem respondeu
3. **Filtro de teste**: so envia se o e-mail do destinatario estiver na lista de teste
4. Envia POST para o webhook n8n com o payload esperado:

```json
{
  "event_type": "ticket_created",
  "recipient_email": "alexandre.silva@psaconsultores.com.br",
  "ticket_title": "Titulo do chamado",
  "ticket_department": "ICMS/IPI",
  "actor_name": "Joao Silva",
  "message_preview": "",
  "ticket_url": "https://psa-consultores.lovable.app/gestao/chamados/UUID"
}
```

### 2. Adicionar configuracao em `supabase/config.toml`

```toml
[functions.notify-ticket]
verify_jwt = false
```

### 3. Adicionar secret `N8N_WEBHOOK_URL`

Valor: `https://digitalpsa26.app.n8n.cloud/webhook/psa-ticket-notify`

### 4. Alterar `src/pages/cliente/NovoChamado.tsx`

Apos o insert do ticket com sucesso (linha 101), chamar a Edge Function:

```ts
// Disparar notificacao (fire-and-forget)
supabase.functions.invoke('notify-ticket', {
  body: {
    event_type: 'ticket_created',
    ticket_id: ticketData.id,
    actor_name: user?.user_metadata?.first_name || 'Cliente',
  }
}).catch(console.error);
```

### 5. Alterar `src/components/gestao/CreateTicketDialog.tsx`

Apos criar o ticket com sucesso (apos upload de anexos), chamar a Edge Function da mesma forma.

### 6. Alterar `src/pages/gestao/GestaoDetalhesChamado.tsx`

Apos enviar mensagem com sucesso (linha 218), chamar a Edge Function:

```ts
// Notificar cliente sobre resposta
supabase.functions.invoke('notify-ticket', {
  body: {
    event_type: 'ticket_replied',
    ticket_id: id,
    actor_name: 'Equipe PSA',
    message_preview: newMessage.trim().substring(0, 200),
  }
}).catch(console.error);
```

### 7. Alterar `src/pages/cliente/DetalhesChamado.tsx`

Apos enviar mensagem com sucesso (linha 207), chamar a Edge Function:

```ts
// Notificar agente sobre resposta do cliente
supabase.functions.invoke('notify-ticket', {
  body: {
    event_type: 'ticket_replied',
    ticket_id: id,
    actor_name: 'Cliente',
    message_preview: newMessage.trim().substring(0, 200),
  }
}).catch(console.error);
```

### 8. Criar arquivo de documentacao `docs/notificacoes-chamados.md`

Contem a estrategia, o JSON do workflow n8n (ja existente), e instrucoes para remover o filtro de teste quando for para producao.

## Resumo das alteracoes

| Arquivo | Acao |
|---|---|
| `supabase/functions/notify-ticket/index.ts` | Criar (novo) |
| `supabase/config.toml` | Adicionar config da funcao |
| `src/pages/cliente/NovoChamado.tsx` | Adicionar chamada fire-and-forget |
| `src/components/gestao/CreateTicketDialog.tsx` | Adicionar chamada fire-and-forget |
| `src/pages/gestao/GestaoDetalhesChamado.tsx` | Adicionar chamada fire-and-forget |
| `src/pages/cliente/DetalhesChamado.tsx` | Adicionar chamada fire-and-forget |
| `docs/notificacoes-chamados.md` | Criar documentacao |
| Secret `N8N_WEBHOOK_URL` | Adicionar via ferramenta de secrets |

