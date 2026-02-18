

# Plano completo: Melhorias no sistema de notificacoes + Upload de anexos pelo cliente

Este plano consolida TODAS as tarefas pendentes: as correcoes de notificacao do plano anterior e a nova funcionalidade de upload de anexos na area do cliente.

---

## Tarefa 1 - Corrigir link do analista na notificacao de atribuicao

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

No evento `ticket_assigned`, o link do agente usa `getTicketUrlForUser` que pode retornar `/gestao/chamados/` se o usuario tambem tem role admin. Corrigir para forcar `/equipe/chamados/{id}` diretamente.

**Alteracao** (~linha 148-153): Substituir chamada a `getTicketUrlForUser` por URL fixa `/equipe/chamados/${ticket.id}` para o agente.

---

## Tarefa 2 - Adicionar cliente como destinatario na notificacao de atribuicao

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

No bloco `ticket_assigned`, o cliente ja recebe notificacao (linhas 142-146). Verificar que esta funcionando corretamente. O cliente recebe link `/cliente/chamados/{id}` com role "cliente" -- isso ja esta implementado. Nenhuma alteracao necessaria neste ponto.

---

## Tarefa 3 - Disparar notificacao ao atribuir chamado no EquipeChamados

**Arquivo**: `src/pages/equipe/EquipeChamados.tsx`

A funcao `assignAgent` (~linha 263-267) nao dispara notificacao. Adicionar chamada fire-and-forget a `notify-ticket` com `event_type: 'ticket_assigned'` apos a atribuicao bem-sucedida.

**Alteracao**: Apos a linha 262 (toast de sucesso), antes do `queryClient.invalidateQueries`, inserir:

```typescript
if (agentId) {
  supabase.functions.invoke('notify-ticket', {
    body: {
      event_type: 'ticket_assigned',
      ticket_id: ticketId,
      actor_name: `${agent?.first_name} ${agent?.last_name}`,
    }
  }).catch(console.error);
}
```

---

## Tarefa 4 - Notificar ao adicionar anexos (area da equipe)

**Arquivo**: `src/pages/equipe/EquipeDetalhesChamado.tsx`

Na funcao `uploadFiles` (~linha 232-235), apos o toast de sucesso, adicionar chamada fire-and-forget a `notify-ticket`:

```typescript
supabase.functions.invoke('notify-ticket', {
  body: {
    event_type: 'ticket_replied',
    ticket_id: id,
    actor_name: 'Responsavel',
    message_preview: `${selectedFiles.length} arquivo(s) anexado(s)`,
  }
}).catch(console.error);
```

---

## Tarefa 5 - Adicionar upload de anexos na pagina do cliente

**Arquivo**: `src/pages/cliente/DetalhesChamado.tsx`

Replicar a funcionalidade de upload de `EquipeDetalhesChamado.tsx` para a pagina do cliente:

1. **Imports**: Adicionar `useRef` ao import do React, e `Upload`, `X`, `Loader2` ao import do lucide-react.

2. **Estado**: Adicionar:
   - `selectedFiles` (File[])
   - `uploading` (boolean)
   - `fileInputRef` (useRef)
   - Constantes `ALLOWED_FILE_TYPES` e `MAX_FILE_SIZE` (mesmos valores)

3. **Funcoes**: Copiar `handleFileSelect`, `removeFile` e `uploadFiles` do EquipeDetalhesChamado, adaptando para o contexto do cliente.

4. **Notificacao no upload do cliente**: Na funcao `uploadFiles`, apos sucesso, disparar:
   ```typescript
   supabase.functions.invoke('notify-ticket', {
     body: {
       event_type: 'ticket_replied',
       ticket_id: id,
       actor_name: 'Cliente',
       message_preview: `${selectedFiles.length} arquivo(s) anexado(s)`,
     }
   }).catch(console.error);
   ```

5. **UI**: Adicionar secao "Adicionar Anexos" apos a listagem de anexos existentes, com input oculto, botao de selecao, lista de arquivos selecionados com remocao, e botao de envio. Mesmo layout do EquipeDetalhesChamado (linhas 475-549).

**RLS**: Ja verificado -- a tabela `ticket_attachments` e o bucket `ticket-attachments` permitem INSERT por usuarios autenticados donos do ticket. Nenhuma migracao necessaria.

---

## Tarefa 6 - Novo evento ticket_overdue para alerta de prazo vencido

**Arquivo**: `supabase/functions/notify-ticket/index.ts`

Adicionar novo bloco condicional para `event_type === "ticket_overdue"`:
- Apenas o gestor (TEST_ADMIN_EMAIL) recebe o alerta
- O payload `ticket_data` incluira campo `dias_atraso`

---

## Tarefa 7 - Criar edge function check-ticket-deadlines

**Novo arquivo**: `supabase/functions/check-ticket-deadlines/index.ts`

Logica:
1. Buscar tickets com status != 'resolvido'/'fechado' e `activity_status` = 'aguardando_resposta'
2. Calcular prazo: `updated_at + 5 dias < agora`
3. Para cada ticket vencido, chamar `notify-ticket` com `event_type: 'ticket_overdue'` e `dias_atraso`

Configurar em `supabase/config.toml` com `verify_jwt = false`.

**Agendamento**: Criar um cron job via `pg_cron` para executar diariamente (08:00 UTC) chamando esta edge function. Alternativa: o usuario pode agendar via n8n.

---

## Alteracoes necessarias no n8n (a cargo do usuario)

1. **Novo evento `ticket_overdue`**: Criar handler no workflow n8n com template de alerta contendo: titulo do chamado, cliente, dias de atraso, link. Assunto sugerido: "ALERTA: Chamado com prazo vencido". O campo `dias_atraso` estara em `ticket_data`.

2. **Notificacao de anexo**: Ja usa `event_type: 'ticket_replied'` com `message_preview` contendo "X arquivo(s) anexado(s)". O template atual deve funcionar sem alteracao.

---

## Resumo de arquivos

| # | Arquivo | Tipo | Alteracao |
|---|---------|------|-----------|
| 1 | `supabase/functions/notify-ticket/index.ts` | Editar | Forcar link `/equipe/chamados/` para agente + novo evento `ticket_overdue` |
| 2 | `src/pages/equipe/EquipeChamados.tsx` | Editar | Adicionar `notify-ticket` no `assignAgent` |
| 3 | `src/pages/equipe/EquipeDetalhesChamado.tsx` | Editar | Notificar ao fazer upload de anexos |
| 4 | `src/pages/cliente/DetalhesChamado.tsx` | Editar | Adicionar upload de anexos + notificacao |
| 5 | `supabase/functions/check-ticket-deadlines/index.ts` | Novo | Verificar prazos vencidos |
| 6 | `supabase/config.toml` | Auto | Adicionar config da nova function |

