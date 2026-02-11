

## Plano: Atualizar Webhook URL e Disparar Teste

### 1. Atualizar o secret `N8N_WEBHOOK_URL`

O secret ja existe. Sera atualizado para o novo valor:
`https://digitalpsa26.app.n8n.cloud/webhook/psa-ticket-notify`

### 2. Disparar teste de notificacao

Apos atualizar o secret, chamar a Edge Function `notify-ticket` com um ticket real para validar o fluxo completo (Edge Function -> n8n -> Gmail).

Payload de teste:
```text
event_type: "ticket_created"
ticket_id: "f9db6d18-5767-4e1c-9f32-954ee29fc37e"
actor_name: "Teste Lovable"
```

### 3. Verificar logs

Conferir os logs da Edge Function para confirmar que o envio foi bem-sucedido (status 200, sent > 0).

---

Nenhuma alteracao de codigo e necessaria. Apenas atualizacao de secret e disparo de teste.

