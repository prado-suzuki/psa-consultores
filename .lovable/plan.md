

# Producao do Sistema de Notificacoes - Plano Atualizado

## Resumo das Mudancas Solicitadas

1. **Notificar a cada mensagem/comentario**: cliente e responsavel recebem e-mail bidirecional a cada interacao
2. **Fase de teste invertida**: em vez de filtrar por `TEST_EMAILS`, enviar apenas para `alexandre.silva@psaconsultores.com.br` como unico destinatario admin (ate sair de teste)
3. **Novos eventos**: `ticket_assigned` e `ticket_resolved`
4. **Links dinamicos por perfil** no corpo do e-mail

---

## Fluxo Completo de Notificacoes

| Evento | Quem dispara | Quem recebe e-mail | Link no e-mail |
|--------|-------------|-------------------|----------------|
| Cliente cria chamado | Cliente | alexandre.silva (admin teste) | `/gestao/chamados/{id}` |
| Gestor cria chamado pelo cliente | Gestor | Nenhum (ele mesmo criou) | -- |
| Gestor atribui responsavel | Gestor | Cliente + Responsavel | Cliente: `/cliente/chamados/{id}`, Responsavel: `/equipe/chamados/{id}` |
| Responsavel envia mensagem | Responsavel | Cliente + alexandre.silva (admin) | Cliente: `/cliente/chamados/{id}`, Admin: `/gestao/chamados/{id}` |
| Cliente envia mensagem | Cliente | Responsavel + alexandre.silva (admin) | Responsavel: `/equipe/chamados/{id}`, Admin: `/gestao/chamados/{id}` |
| Gestor envia mensagem | Gestor | Cliente | `/cliente/chamados/{id}` |
| Status muda para "resolvido" | Gestor ou Responsavel | Cliente + alexandre.silva (admin) | Cliente: `/cliente/chamados/{id}`, Admin: `/gestao/chamados/{id}` |

---

## Alteracoes Necessarias

### 1. Edge Function `notify-ticket/index.ts` (reescrever)

Mudancas principais:

- **Remover `TEST_EMAILS` e filtro `filteredEmails`**
- **Substituir logica de "todos os admins"** por envio fixo para `alexandre.silva@psaconsultores.com.br` (fase de teste)
- **Adicionar evento `ticket_assigned`**: busca cliente (por `ticket.user_id`) e responsavel (por `ticket.assigned_to`), envia e-mail para ambos
- **Adicionar evento `ticket_resolved`**: busca cliente e envia para cliente + admin de teste
- **Gerar `ticket_url` dinamico por destinatario**: verificar role do destinatario em `user_roles` para definir prefixo (`/gestao/`, `/equipe/` ou `/cliente/`)
- **Evento `ticket_replied`**: agora sempre notifica a outra parte + admin de teste
  - Se `actor_name === "Equipe PSA"` ou `is_admin === true` -> notifica cliente
  - Se `actor_name === "Cliente"` -> notifica responsavel (`assigned_to`) + admin de teste

### 2. Frontend: `EquipeDetalhesChamado.tsx` (adicionar notificacao)

Atualmente o responsavel pode responder mas **nao dispara `notify-ticket`**. Adicionar chamada fire-and-forget na funcao `handleSendMessage` (linha ~300-336), identico ao padrao do `GestaoDetalhesChamado.tsx`.

### 3. Frontend: `GestaoChamados.tsx` - funcao `assignAgent` (linha 311-339)

Adicionar chamada fire-and-forget para `notify-ticket` com `event_type: 'ticket_assigned'` apos o update bem-sucedido.

### 4. Frontend: `GestaoDetalhesChamado.tsx` e `EquipeDetalhesChamado.tsx` - funcao `handleStatusChange`

Quando o novo status for `"resolvido"`, disparar `notify-ticket` com `event_type: 'ticket_resolved'`.

### 5. Nenhuma alteracao no workflow n8n

O campo `ticket_url` ja e dinamico no payload. O n8n usa `$json.body.ticket_url` no corpo do e-mail, entao funciona automaticamente com URLs diferentes por destinatario.

---

## Detalhes Tecnicos da Edge Function

A logica de URLs por perfil:

```text
Para cada destinatario:
  1. Buscar role em user_roles
  2. Se role = admin     -> /gestao/chamados/{id}
  3. Se role = team_member -> /equipe/chamados/{id}
  4. Senao (client)       -> /cliente/chamados/{id}
  5. Montar URL completa: PUBLISHED_URL + path
```

Logica de admin de teste (temporaria):

```text
Onde antes buscava "todos os admins":
  -> Agora usa fixo: alexandre.silva@psaconsultores.com.br
  -> Com ticket_url: /gestao/chamados/{id}
```

Para ir para producao no futuro, basta voltar a buscar todos os admins na tabela `user_roles` + `profiles`.

---

## Arquivos Modificados

| Arquivo | Tipo de alteracao |
|---------|------------------|
| `supabase/functions/notify-ticket/index.ts` | Reescrever com novos eventos e logica de URLs |
| `src/pages/equipe/EquipeDetalhesChamado.tsx` | Adicionar notify-ticket no handleSendMessage |
| `src/pages/gestao/GestaoChamados.tsx` | Adicionar notify-ticket no assignAgent |
| `src/pages/gestao/GestaoDetalhesChamado.tsx` | Adicionar notify-ticket no handleStatusChange (resolvido) |
| `src/pages/equipe/EquipeDetalhesChamado.tsx` | Adicionar notify-ticket no handleStatusChange (resolvido) |

