

# Corrigir inserção de logs de auditoria por membros da equipe

## Problema

Você é admin e consegue ver os logs de auditoria, porém só aparecem os seus próprios registros. Isso acontece porque a tabela `audit_logs` só tem política de INSERT para admins. Quando outros usuários (team_member, lider) criam ou editam projetos/tarefas, a inserção do log é bloqueada silenciosamente pelo RLS.

## Causa raiz

A tabela `audit_logs` possui apenas:
- **ALL para admins** -- permite tudo
- **SELECT para members** -- permite apenas leitura

Falta uma política de **INSERT** para `team_member` e `lider`.

## Solução

Criar uma única política RLS de INSERT:

```text
CREATE POLICY "Members can insert audit_logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    performed_by = auth.uid()
    AND (
      has_role(auth.uid(), 'team_member'::app_role)
      OR has_role(auth.uid(), 'lider'::app_role)
    )
  );
```

A restrição `performed_by = auth.uid()` garante que ninguém pode criar logs em nome de outro usuário.

## Impacto

- Uma única migração SQL no banco de dados
- Nenhuma alteração de código frontend (o hook `useAuditLog` já funciona corretamente)
- A partir da aplicação da política, todas as ações de membros da equipe passarão a ser registradas na auditoria

