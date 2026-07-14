
# Levar `excluido` para o RLS (mantendo `ambiente` client-side)

## Objetivo

Impedir que registros com `excluido = true` sejam retornados pela Data API (PostgREST) para usuários autenticados via anon key, mesmo quando o client esquecer o `.eq('excluido', false)`. O filtro de `ambiente` permanece no client como está hoje (custo de mudança desproporcional ao benefício).

## Escopo

**7 tabelas afetadas** (todas que têm coluna `excluido`):

- `cliente`
- `contribuinte`
- `representante`
- `ordem_servico`
- `documento_arquivo`
- `correcoes_icms`
- `distribuicao_receita`

**Não afetadas:** edge functions (todas usam `service_role`, que bypassa RLS — confirmado em análise prévia). Frontend continua funcionando; queries que já filtram `excluido = false` ficam redundantes mas corretas.

## Estratégia

Para cada tabela, adicionar `AND excluido = false` nas policies de **SELECT / UPDATE / DELETE**. O INSERT não muda (linha nova nasce com `excluido = false` pelo default).

Padrão de reescrita, exemplo em `cliente`:

```sql
-- Antes
CREATE POLICY cliente_select_scoped ON public.cliente FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND cliente_visivel_para(id))
  OR (resolve_user_cliente_id(auth.uid()) = id)
);

-- Depois
CREATE POLICY cliente_select_scoped ON public.cliente FOR SELECT
USING (
  excluido = false
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role_or_higher(auth.uid(), 'team_member'::app_role) AND cliente_visivel_para(id))
    OR (resolve_user_cliente_id(auth.uid()) = id)
  )
);
```

Aplicar o mesmo padrão em UPDATE (tanto em `USING` quanto em `WITH CHECK`) e DELETE.

### Caso especial: o próprio soft-delete

O soft-delete é implementado como `UPDATE ... SET excluido = true`. Se a policy de UPDATE bloquear linhas com `excluido = true` no `WITH CHECK`, o próprio ato de excluir falharia. Solução: manter `excluido = false` no `USING` do UPDATE (só permite atualizar linhas ativas) e **não** repetir no `WITH CHECK` (permite gravar `excluido = true`). Padrão:

```sql
CREATE POLICY rls_cliente_update ON public.cliente FOR UPDATE
USING (excluido = false AND has_role_or_higher(auth.uid(), 'sublider'::app_role))
WITH CHECK (has_role_or_higher(auth.uid(), 'sublider'::app_role));
```

Restauração de registro excluído (raro, hoje não existe UI, mas ficaria bloqueada) fica exclusivamente via edge function com service_role.

### Sequência de migrations

Uma única migration com todas as ~21 policies (7 tabelas × 3 comandos: SELECT/UPDATE/DELETE), agrupada por tabela e comentada. Cada bloco: `DROP POLICY IF EXISTS ... ; CREATE POLICY ...`.

## Validação

**1. Antes de aplicar** — checar se existe alguma UI que dependa de ler registros excluídos com anon key. Busca no código por padrões `excluido: true`, `.eq('excluido', true)`, telas de "lixeira", "restaurar". Se existir, migrar essas leituras para edge function com service_role antes.

**2. Após aplicar** — smoke tests manuais:

- Listar clientes (`/equipe/clientes`) → mesma quantidade que antes.
- Editar cliente → salva.
- Excluir cliente → soft-delete funciona e some da lista.
- Listar OS, contribuintes, representantes, correções ICMS → contagens conferem.
- Rodar edge functions `sync-cadastros`, `dw-query`, `check-ticket-deadlines` → sem regressão (usam service_role).

**3. Query de auditoria** pós-migration, para confirmar que toda policy relevante tem o filtro:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (7 tabelas)
  AND cmd IN ('SELECT','UPDATE','DELETE')
  AND qual NOT LIKE '%excluido%';
-- deve retornar 0 linhas
```

## Fora de escopo (decisões conscientes)

- **`ambiente` no RLS** — mantido como está. Custo alto (exige Auth Hook ou `SET LOCAL` via proxy) para benefício menor: os dois ambientes já têm URLs/anon keys diferentes, então o risco de vazamento cross-ambiente via DevTools é limitado ao usuário que tenha login válido nos dois. Aceito e documentado.
- **Limpeza das ~16 policies `USING(true)` P1** — dívida separada (RLS Eduardo), não é este PR.
- **Backups `_bkp_psa_unify_*`** — dívida P3 separada.

## Entregáveis

1. Uma migration SQL cobrindo as 7 tabelas.
2. Atualização do `docs/rls/Divida_Tecnica_RLS_Eduardo.md`: marcar o item "DEC-01: `excluido` no RLS" como resolvido; deixar registrado que `ambiente` permanece client-side por decisão explícita.
3. Nota opcional em `docs/rls/` explicando o padrão (soft-delete + RLS) para futuras tabelas que nascerem com `excluido`.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Alguma tela lê excluídos via anon key e quebra | Grep pré-migration; migrar para edge function se achar |
| Soft-delete deixa de funcionar por causa do `WITH CHECK` | Padrão de manter `WITH CHECK` sem filtro de `excluido` (documentado acima) |
| Regressão silenciosa em fluxo raro | Query de auditoria pós-migration + smoke tests manuais dos 7 domínios |
| Perda de acesso a excluídos por operadores admin | Admins continuam vendo tudo se necessário via edge function com service_role; se surgir demanda de UI, cria-se rota dedicada depois |
