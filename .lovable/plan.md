

# Templates de E-mail Diferenciados por Evento e Destinatario

## Problema Atual

Todos os e-mails usam o mesmo template generico ("Nova Resposta no Chamado"), independente do evento ou de quem recebe. Isso confunde o destinatario.

## Solucao

Gerar o **assunto** e o **corpo HTML** do e-mail diretamente na Edge Function, diferenciando por combinacao de evento + perfil do destinatario. O payload enviado ao n8n passara a incluir dois novos campos: `email_subject` e `email_body_html`. O workflow n8n so precisa usar esses campos no no do Gmail.

---

## Matriz de Templates (8 combinacoes)

| Evento | Destinatario | Assunto | Titulo do E-mail | Descricao |
|--------|-------------|---------|-------------------|-----------|
| `ticket_created` | Gestor | [PSA] Novo Chamado: {titulo} | Novo Chamado Aberto | Um cliente abriu um novo chamado que precisa da sua atencao. |
| `ticket_assigned` | Cliente | [PSA] Chamado Atribuido: {titulo} | Chamado Atribuido | Seu chamado foi atribuido a um responsavel da nossa equipe. |
| `ticket_assigned` | Responsavel | [PSA] Novo Chamado para Voce: {titulo} | Novo Chamado Atribuido | Voce recebeu um novo chamado para atendimento. |
| `ticket_replied` (equipe) | Cliente | [PSA] Resposta no Chamado: {titulo} | Nova Resposta da Equipe | A equipe PSA enviou uma nova mensagem no seu chamado. |
| `ticket_replied` (cliente) | Responsavel | [PSA] Mensagem do Cliente: {titulo} | Nova Mensagem do Cliente | O cliente enviou uma nova mensagem no chamado. |
| `ticket_replied` (cliente) | Gestor | [PSA] Mensagem do Cliente: {titulo} | Nova Mensagem do Cliente | O cliente enviou uma nova mensagem em um chamado. |
| `ticket_resolved` | Cliente | [PSA] Chamado Resolvido: {titulo} | Chamado Resolvido | Seu chamado foi marcado como resolvido pela equipe PSA. |
| `ticket_resolved` | Gestor | [PSA] Chamado Resolvido: {titulo} | Chamado Finalizado | Um chamado foi marcado como resolvido. |

---

## Template HTML Base

Todos os e-mails seguirao o layout visual ja existente (header verde PSA, tabela de dados, botao CTA), mas com conteudo diferenciado:

- **Header**: icone + titulo do evento (ex: "Novo Chamado Aberto" vs "Chamado Resolvido")
- **Descricao**: texto contextual diferente por evento/destinatario
- **Tabela de dados**: campos variam por evento
  - Abertura: Titulo, Departamento, Prioridade
  - Atribuicao: Titulo, Departamento, Responsavel atribuido
  - Resposta: Titulo, Departamento, Respondido por, Mensagem (preview)
  - Resolucao: Titulo, Departamento
- **Botao CTA**: texto diferente ("Ver Chamado", "Responder", "Ver Detalhes")
- **Cor do header**: verde PSA para todos (manter identidade visual)

---

## Alteracoes Necessarias

### 1. Edge Function `notify-ticket/index.ts`

Adicionar:
- Interface `Recipient` expandida com campo `role` (gestor/responsavel/cliente)
- Funcao `generateEmailContent(event_type, recipient_role, ticketData)` que retorna `{ subject, body_html }`
- Funcao `generateEmailHtml(...)` com o template HTML inline
- Passar `email_subject` e `email_body_html` no payload do webhook

O payload enviado ao n8n ficara:

```text
{
  event_type,
  recipient_email,
  ticket_title,
  ticket_department,
  actor_name,
  message_preview,
  ticket_url,
  email_subject,      // NOVO
  email_body_html      // NOVO
}
```

### 2. Workflow n8n

O no Gmail precisa ser ajustado para usar:
- **Assunto**: `{{ $json.body.email_subject }}`
- **Corpo**: `{{ $json.body.email_body_html }}`

Isso substitui o template fixo atual. Essa alteracao e feita manualmente no n8n pelo usuario.

---

## Detalhes Tecnicos

### Estrutura do HTML gerado

```text
<div style="max-width:600px; margin:auto; font-family:Arial,sans-serif;">
  <!-- Header verde com icone e titulo -->
  <div style="background:#0d9488; color:white; padding:24px; border-radius:8px 8px 0 0;">
    {emoji} {titulo_evento}
  </div>
  
  <!-- Corpo -->
  <div style="padding:24px; background:#fff;">
    <p>{descricao_contextual}</p>
    
    <!-- Tabela de dados -->
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="color:#666;">TITULO</td><td>{ticket.title}</td></tr>
      <tr><td style="color:#666;">DEPARTAMENTO</td><td>{departamento}</td></tr>
      <!-- campos adicionais variam por evento -->
    </table>
    
    <!-- Botao CTA -->
    <a href="{ticket_url}" style="display:inline-block; background:#0d9488; color:white; padding:12px 24px; border-radius:6px; text-decoration:none;">
      {texto_botao} →
    </a>
  </div>
  
  <!-- Footer -->
  <div style="padding:16px; text-align:center; color:#999; font-size:12px;">
    PSA Consultores - Este e-mail foi enviado automaticamente.
  </div>
</div>
```

### Arquivo modificado

| Arquivo | Alteracao |
|---------|----------|
| `supabase/functions/notify-ticket/index.ts` | Adicionar funcoes de geracao de HTML e assunto diferenciado por evento/role |

### Acao manual do usuario

| Plataforma | Alteracao |
|-----------|----------|
| n8n | Ajustar no Gmail para usar `$json.body.email_subject` e `$json.body.email_body_html` |

