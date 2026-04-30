## Causa do erro

A tabela `public.cliente_clusters` tem 5 RLS policies, mas só **duas** permitem escrita (INSERT/UPDATE/DELETE):

| Policy | Comando | Quem permite |
|---|---|---|
| `admin_full_access_cliente_clusters` | ALL | role `admin` |
| `lider_manage_cliente_clusters` | ALL | role `lider` |
| `sublider_select_cliente_clusters` | **SELECT** | role `sublider` |
| `team_member_select_cliente_clusters` | **SELECT** | `team_member`+ |
| `Clients can read their cliente_clusters` | **SELECT** | client dono |

A usuária com role `sublider` consegue **ler** os vínculos cliente↔cluster, mas qualquer `INSERT` é bloqueado — exatamente o erro `new row violates row-level security policy for table "cliente_clusters"`.

## Por que a outra alteração salvou

Os outros campos do bloco "Dados do Cliente/Grupo" (nome, categoria, status, fixo, área, região) gravam apenas na tabela `cliente`, que tem policy permitindo escrita para `sublider`. O campo **Clusters** é o único que escreve em `cliente_clusters`. Quando ela alterou só os outros campos, o save concluiu; ao mexer no cluster, o `INSERT` em `cliente_clusters` falhou.

Isso bate com nosso padrão de hierarquia: `sublider` deve poder operar estrutura organizacional, mas a policy nunca foi criada para escrita nessa tabela.

## Correção proposta

Migration adicionando policy de escrita para `sublider+` em `cliente_clusters`, alinhada com `has_role_or_higher` (mesmo padrão usado em outras tabelas de estrutura).

```sql
-- Permite sublíder e acima gerenciarem vínculos cliente↔cluster
CREATE POLICY "sublider_or_higher_manage_cliente_clusters"
ON public.cliente_clusters
FOR ALL
TO authenticated
USING (public.has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::app_role));

-- Remove a policy antiga só de SELECT (substituída pela nova ALL)
DROP POLICY IF EXISTS sublider_select_cliente_clusters ON public.cliente_clusters;
```

As policies de SELECT para `team_member` e `client` permanecem intactas — `team_member` puro continua só lendo, e cliente continua vendo apenas os próprios clusters.

## Verificação pós-deploy

1. Logar como a sublíder afetada → editar Transoeste → trocar/adicionar cluster → salvar deve concluir sem erro.
2. Logar como `team_member` puro → tentar a mesma operação continua bloqueado (esperado).
3. `useAuditLog` continua registrando o save do cliente normalmente.

## Arquivos afetados

- 1 migration nova em `supabase/migrations/` (apenas DDL de RLS).
- Nenhuma mudança em hooks/componentes — o fluxo de save em `ClienteTab.tsx` já está correto, faltava só a permissão no banco.