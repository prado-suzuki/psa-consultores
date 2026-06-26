## Objetivo
Adicionar guarda em `notify-ticket` para não disparar webhook n8n quando cliente responde em chamado sem responsável atribuído.

## Alteração
Arquivo: `supabase/functions/notify-ticket/index.ts`

Inserir bloco logo após o `if (ticketError || !ticket) { ... }` e antes de `const ticketDepartment = ...`:

```ts
// Guard: cliente respondendo em ticket sem responsável atribuído.
// Nesse caso, o cliente normalmente está complementando o chamado recém-aberto;
// não há a quem notificar (workflow n8n quebraria buscando "responsavel" no payload).
if (
  event_type === "ticket_replied" &&
  actor_name === "Cliente" &&
  !ticket.assigned_to
) {
  console.log(
    `[notify-ticket] Skipped: client reply on unassigned ticket ${ticket.id}`
  );
  return new Response(
    JSON.stringify({ success: true, skipped: true, reason: "client_reply_on_unassigned_ticket" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

Observação: corrigi o trecho truncado `corsHeadeion/json"` para `...corsHeaders, "Content-Type": "application/json"`, coerente com os demais returns da função.

## Escopo / Não-escopo
- Afeta apenas `event_type === "ticket_replied"` com `actor_name === "Cliente"` e `assigned_to` nulo.
- Demais eventos (`ticket_created`, `ticket_assigned`, `ticket_replied` por equipe, `ticket_overdue`, `ticket_resolved`) seguem inalterados.

## Deploy
Após a edição, deploy automático da edge function (Lovable Cloud) — sem ação manual.

## Validação
- Verificar no log da function que requisições `ticket_replied` + `Cliente` + ticket sem responsável retornam `{ skipped: true }` sem chamar `fetch(webhookUrl, ...)`.
