## Causa

A chamada `POST /functions/v1/notify-ticket` falha com `Failed to fetch` quando o chamado é criado pelo preview do Lovable (`https://*.lovableproject.com`). O log da edge function mostra apenas `booted` — a função nunca é executada, porque o navegador bloqueia o preflight CORS.

O helper `supabase/functions/_shared/cors.ts` (`ORIGIN_PATTERNS`) só autoriza `lovable.app`, `lovable.dev`, `psaconsultores.com.br` e localhost. O domínio `lovableproject.com` (usado pelo iframe de preview do editor) não está na whitelist, então `Access-Control-Allow-Origin` não é emitido e o request é abortado antes de chegar ao n8n.

Em produção (`psaconsultores.com.br`) o webhook funciona — o problema só aparece em preview.

## Correção

Adicionar o padrão de `lovableproject.com` em `ORIGIN_PATTERNS` no `supabase/functions/_shared/cors.ts`:

```ts
/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
```

Isso desbloqueia todas as Edge Functions (notify-ticket, check-ticket-deadlines, etc.) quando chamadas pelo preview, sem afetar produção.

## Validação

1. Após deploy, criar um novo chamado pelo preview.
2. Conferir nos logs da `notify-ticket` que ela foi invocada (não só `booted`).
3. Verificar no n8n que o webhook chegou com `event_type: "ticket_created"` e `recipients` contendo o gestor da área Tax.

## Detalhes técnicos

- Arquivo único alterado: `supabase/functions/_shared/cors.ts` (1 linha adicionada na lista `ORIGIN_PATTERNS`).
- Sem mudanças em `notify-ticket/index.ts` — a lógica de gestor já está correta após a última correção.
- Sem migrações de DB.
