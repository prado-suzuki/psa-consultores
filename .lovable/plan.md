## Objetivo

Na edge function `notify-ticket`, os e-mails que hoje vão para o "gestor" estão sendo enviados para o **líder** das equipes da Área Fiscal (`estrutura_equipes.gestor_id`). O correto é enviar para o **gestor de chamados da área** (`estrutura_areas.gestor_chamados_id`).

## Payload enviado hoje (sem alteração)

A função continua disparando **um único POST** para `N8N_WEBHOOK_URL` com a mesma estrutura:

- `event_type`
- `ticket_data`: `id`, `title`, `department`, `priority`, `description`, `cliente_nome`, `cliente_email`, `user_id`, `actor_name`, `replier_role`, `message_preview`, `assigned_to_name`, `dias_atraso`
- `recipients[]`: `{ email, ticket_url, role }` com `role` ∈ `cliente | responsavel | gestor`

Nada disso muda — só **quem** recebe na role `gestor`.

## Mudança técnica

Em `supabase/functions/notify-ticket/index.ts`, refatorar `getGestorRecipients` para:

1. Buscar em `estrutura_areas` onde `name = 'Área Fiscal'` AND `is_active = true` AND `gestor_chamados_id IS NOT NULL`.
2. Coletar os `gestor_chamados_id` distintos.
3. Buscar `email` em `profiles` para esses IDs.
4. Montar `recipients` com `role: "gestor"` e `ticket_url = {PUBLISHED_URL}/gestao/chamados/{ticket_id}`.

Remove o passo intermediário que ia para `estrutura_equipes.gestor_id`.

## Eventos afetados

Todos os que hoje incluem gestor: `ticket_created`, `ticket_replied`, `ticket_overdue`, `ticket_resolved`. (`ticket_assigned` não envia para gestor — segue igual.)

## Documentação

Atualizar `docs/notificacoes-chamados.md` na seção "Resolução dinâmica de gestores" e na tabela "Dependências no banco" para refletir que a fonte agora é `estrutura_areas.gestor_chamados_id`.

## Fora de escopo

- Estrutura do payload (mantida).
- Roles, URLs e demais destinatários (cliente/responsavel) — sem mudança.
- Outras áreas além de "Área Fiscal" — sem mudança.
