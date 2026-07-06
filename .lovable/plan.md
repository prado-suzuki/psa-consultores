## RLS-04 — Fechar policies abertas de `documento_horas_historico`

### PASSO 1 — Baseline (já capturado, read-only) ✅
- `count(*) = 0` — tabela vazia.
- `relrowsecurity = true` — RLS já habilitada.
- 4 policies atuais, todas abertas para `authenticated`:

| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| documento_horas_historico_auth_select | SELECT | {authenticated} | `true` | — |
| documento_horas_historico_auth_insert | INSERT | {authenticated} | — | `true` |
| documento_horas_historico_auth_update | UPDATE | {authenticated} | `true` | `true` |
| documento_horas_historico_auth_delete | DELETE | {authenticated} | `true` | — |

GATE PASSO 1 ✅: pelo menos uma policy com `qual='true'` confirmada (todas, na verdade).

### PASSO 2 — Migration (transação única, via `supabase--migration`)

```sql
ALTER TABLE public.documento_horas_historico ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='documento_horas_historico'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.documento_horas_historico', p.policyname);
  END LOOP;
END $$;

CREATE POLICY dhh_select ON public.documento_horas_historico
  FOR SELECT TO authenticated
  USING (alterado_por = auth.uid()
         OR public.has_role_or_higher(auth.uid(), 'lider'::app_role));

CREATE POLICY dhh_insert ON public.documento_horas_historico
  FOR INSERT TO authenticated
  WITH CHECK (alterado_por = auth.uid()
              AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY dhh_update ON public.documento_horas_historico
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY dhh_delete ON public.documento_horas_historico
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

Regra: SELECT = autor OU lider+; INSERT = em nome próprio + team_member+; UPDATE/DELETE = admin.

### PASSO 3 — Verificação (via `supabase--read_query`)
- `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='documento_horas_historico' ORDER BY cmd;`
- GATE:
  - Exatamente 4 policies: `dhh_select | dhh_insert | dhh_update | dhh_delete`.
  - Nenhuma com `qual='true'` ou `with_check='true'`.
  - `relrowsecurity = true`.
- Se falhar → rollback imediato (abaixo).

### PASSO 4 — Relatório
Devolvo: baseline do P1 (tabela acima + count 0) + lista final do P3. Sem tocar em nada além.

### Rollback (se GATE falhar)
Migration única recriando exatamente o baseline:
```sql
DROP POLICY IF EXISTS dhh_select ON public.documento_horas_historico;
DROP POLICY IF EXISTS dhh_insert ON public.documento_horas_historico;
DROP POLICY IF EXISTS dhh_update ON public.documento_horas_historico;
DROP POLICY IF EXISTS dhh_delete ON public.documento_horas_historico;

CREATE POLICY documento_horas_historico_auth_select ON public.documento_horas_historico
  FOR SELECT TO authenticated USING (true);
CREATE POLICY documento_horas_historico_auth_insert ON public.documento_horas_historico
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY documento_horas_historico_auth_update ON public.documento_horas_historico
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY documento_horas_historico_auth_delete ON public.documento_horas_historico
  FOR DELETE TO authenticated USING (true);
```

### Avisos
- RLS é global (dev+prod compartilham); segurança da manobra vem da tabela estar vazia e sem uso no front.
- Validação é estrutural (não há linhas para testar).
- Nenhum código frontend/hook é tocado nesta rodada.

### Confirmação
Ciente do impacto global e OK com a regra proposta (autor+lider / team_member+ / admin-only)?
