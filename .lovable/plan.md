

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

## Tarefa 8 - Consolidar webhooks em chamada unica + adicionar cliente_email -- CONCLUIDA

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Implementado: substituido o `Promise.allSettled` com N chamadas `fetch` por um unico POST ao webhook contendo o array `recipients`. Adicionado campo `cliente_email` ao `ticket_data`.

---

## Tarefa 9 - Atualizar documentacao -- CONCLUIDA

**Arquivo**: `docs/notificacoes-chamados.md`

Implementado: documentacao atualizada com novo formato de payload (array `recipients`, campo `cliente_email`), todos os eventos suportados e instrucoes para configuracao do n8n.

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
| 8 | Consolidar webhooks + cliente_email | Concluida |
| 9 | Atualizar documentacao | Concluida |
