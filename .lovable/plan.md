## Rodar `20260728140000_org_comments_ajustes_pos_edu13.sql`

Auditei o banco: só o bucket já existe; os outros cinco ajustes estão pendentes. A migration é idempotente (CREATE OR REPLACE, ON CONFLICT, DROP POLICY IF EXISTS, REVOKE), então pode rodar como está.

### Estado atual x o que a migration faz

| # | Ajuste | Estado hoje | Após a migration |
|---|---|---|---|
| 1 | Bucket `comment-attachments` | já existe | no-op (ON CONFLICT) |
| 2 | `org_comments_feed` expõe `excluido` e para de filtrar | não expõe `excluido` | passa a expor; front filtra |
| 3 | `criar_org_comment` sem o bug de `COALESCE(_id,…)` repetido em menções/anexos | ainda com o bug latente (só não estoura porque o front sempre manda `_id`) | menções e anexos usam o mesmo `v_id` |
| 4 | SELECT em `org_comment_attachments` delegando à RLS de `org_comments` | reimplementa a regra e esquece o admin | admin não-membro passa a ver os anexos que já vê no comentário |
| 5 | `org_comments_guard_update` sem `#- '{}'::text[]` | ainda com o operador problemático | lista de imutáveis explícita |
| 6 | REVOKE DELETE em `org_comments` para `authenticated` | grant ainda existe (RLS já negava, mas o grant contradiz o desenho) | grant removido; cascade continua via SECURITY DEFINER |

### Riscos

- **Nenhum breaking para o front:** `org_comments_feed` só ganha coluna no fim (compatível com `SELECT *`); a RPC mantém a mesma assinatura; a policy de SELECT dos anexos só amplia (inclui admin), não restringe.
- **DELETE direto na tabela** deixa de funcionar para clientes autenticados — mas o desenho já é soft delete (`UPDATE ... SET excluido = true`), então não deve haver consumidor legítimo.

### Passos

1. Executar a migration `20260728140000_org_comments_ajustes_pos_edu13.sql` via `supabase--migration`.
2. Reconferir com uma query os 5 itens pendentes para confirmar que ficaram como o esperado.

Sem mudanças de código no front nesta etapa.
