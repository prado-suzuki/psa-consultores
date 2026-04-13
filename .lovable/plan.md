

## Correção: Equipe não consegue enviar arquivos em chamados

### Causa raiz

A tabela `ticket_attachments` possui apenas duas políticas de INSERT:
1. **Admins** → `has_role(admin)`
2. **Clientes** → `uploaded_by = auth.uid() AND ticket.user_id = auth.uid()`

Membros da equipe com roles `team_member`, `lider` ou `sublider` **não têm permissão de INSERT** na tabela `ticket_attachments`. O upload do arquivo ao storage funciona (há policy genérica), mas a inserção do registro na tabela falha com erro de RLS, causando o "Erro ao enviar arquivos".

### Solução

Criar uma migração SQL adicionando duas políticas de INSERT:

```sql
-- Team members (team_member) podem inserir anexos em qualquer chamado
CREATE POLICY "team_member_insert_ticket_attachments"
ON public.ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    has_role(auth.uid(), 'team_member'::app_role)
    OR has_role(auth.uid(), 'lider'::app_role)
    OR has_role(auth.uid(), 'sublider'::app_role)
  )
);
```

Isso permite que qualquer membro da equipe (team_member, lider, sublider) insira anexos, desde que `uploaded_by` seja seu próprio `auth.uid()`.

Nenhuma alteração de código nos componentes — o problema é exclusivamente de RLS.

