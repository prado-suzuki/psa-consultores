

# Notificacao de Atribuicao para o Cliente

## Diagnostico Atual

Analisando os logs e o codigo da edge function `notify-ticket`:

1. **Edge function**: O codigo ja inclui o cliente como destinatario no evento `ticket_assigned` (linhas 142-154). Ele busca o email do cliente, monta a URL do portal do cliente, e envia com `role: "cliente"`.

2. **Problema identificado nos logs**: O ultimo log de `ticket_assigned` mostra apenas o responsavel como destinatario:
   ```
   Event: ticket_assigned, Recipients: alexandre.silva@psaconsultores.com.br(responsavel)
   ```
   Isso indica que `getEmailForUser(supabase, ticket.user_id)` retornou `null` — o perfil do cliente provavelmente nao tem email cadastrado na tabela `profiles`.

3. **Payload enviado ao n8n**: Ja inclui `assigned_to_name` e `recipient_role`, mas o n8n precisa tratar o `event_type: "ticket_assigned"` com template diferenciado para o papel `cliente`.

---

## Alteracoes necessarias

### No projeto Lovable (eu farei)

Nenhuma alteracao no codigo e necessaria. A edge function ja:
- Envia o evento `ticket_assigned` para o cliente (quando o email existe no perfil)
- Inclui `assigned_to_name` (nome do profissional designado) no `ticket_data`
- Inclui `recipient_role: "cliente"` para o n8n saber diferenciar o template

A unica acao necessaria e garantir que os perfis dos clientes tenham o campo `email` preenchido na tabela `profiles`. Posso verificar isso no banco de dados se desejar.

### No workflow n8n (voce fara)

O workflow precisa tratar o cenario `event_type === "ticket_assigned"` com `recipient_role === "cliente"` gerando um e-mail personalizado. Segue o que implementar:

1. **Adicionar um node IF/Switch** apos receber o webhook, verificando:
   - `event_type` === `"ticket_assigned"`
   - `ticket_data.recipient_role` === `"cliente"`

2. **Criar template de e-mail para o cliente** com conteudo como:
   - **Assunto**: `Seu chamado #[titulo] esta em andamento`
   - **Corpo**:
     - Saudacao com o nome do cliente (`ticket_data.cliente_nome`)
     - Informar que um profissional foi designado: `O profissional **[ticket_data.assigned_to_name]** foi designado para atender seu chamado.`
     - Indicar que o chamado ja esta em andamento
     - Departamento: `ticket_data.department`
     - Link para acompanhar: `ticket_data.link_chamado`

3. **Campos disponiveis no payload** que o n8n recebe:

```text
{
  "event_type": "ticket_assigned",
  "recipient_email": "cliente@email.com",
  "ticket_data": {
    "id": "uuid",
    "title": "Titulo do chamado",
    "department": "ICMS/IPI",
    "priority": "Normal",
    "description": "Descricao do chamado",
    "cliente_nome": "Joao Silva",
    "link_chamado": "https://psa-consultores.lovable.app/cliente/chamados/UUID",
    "actor_name": "Nome do Gestor",
    "assigned_to_name": "Nome do Profissional Designado",
    "recipient_role": "cliente"
  }
}
```

---

## Resumo

| Onde | O que fazer |
|------|-------------|
| Lovable | Nenhuma alteracao de codigo. Verificar se perfis de clientes tem email preenchido |
| n8n | Adicionar branch para `ticket_assigned` + `recipient_role: cliente` com template personalizado informando o profissional designado |

