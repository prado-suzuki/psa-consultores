## Objetivo
Liberar leitura pública das novidades ativas em `/novidades`, `/novidades/:slug` e destaque no login — hoje bloqueada pela policy `rls_novidades_select_active`.

## Estado atual (verificado em produção)
Policies em `public.novidades`:
- `rls_novidades_select_active` — SELECT/authenticated — `ativo=true AND has_role_or_higher('team_member')` ← **remover**
- `Admins podem ver todas novidades` — SELECT/authenticated — `has_role('admin')` ← **manter intacta**
- `rls_novidades_insert` / `update` / `delete` — restritos a admin ← **manter intactos**
- GRANT SELECT em `anon` e `authenticated` já concedidos ← não mexer

Tabela tem 5 registros, todos `ativo=true`.

## Migration (apenas 2 comandos, escopo em `public.novidades`)

```sql
-- 1) Remover a SELECT restritiva (causa do bloqueio)
DROP POLICY IF EXISTS rls_novidades_select_active ON public.novidades;

-- 2) Leitura pública das ativas (anon + authenticated)
CREATE POLICY "novidades_select_publico"
  ON public.novidades
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
```

Não altera: `Admins podem ver todas novidades`, INSERT/UPDATE/DELETE, GRANTs, outras tabelas ou funções.

## GATE (validar após aplicar)
1. `curl` anônimo (só apikey anon, sem token) a `novidades?select=id&ativo=eq.true` → 5 linhas (antes: 0).
2. Login como cliente (sem papel interno) → mesmas 5 ativas.
3. Login como admin → todas as linhas, incluindo eventuais `ativo=false` (via policy admin mantida).
4. INSERT/UPDATE/DELETE por não-admin em transação com ROLLBACK → bloqueado.
5. `pg_policies` de novidades exibe exatamente: `novidades_select_publico`, `Admins podem ver todas novidades`, `rls_novidades_insert`, `rls_novidades_update`, `rls_novidades_delete`.
