## RLS-12 — Fechar catálogos abertos ao role `client`

Escopo estrito: SELECT de 7 tabelas passa de `qualquer autenticado` → `team_member+`. INSERT/UPDATE/DELETE intactos.

### PASSO 1 — Baseline (capturado ✅)

**Contagens (`n_live_tup`):**
- codigo_receita=975, grupo_tributo=23, produto_segmento=19, produto_servico=136, setor_cliente=9, page_permissions=66, rls_precheck_allowed_tables=54.

**Policies SELECT atuais (todas com `qual=true`, cmd=SELECT — serão substituídas):**
- codigo_receita: `Authenticated can read codigo_receita`
- grupo_tributo: `Authenticated can read grupo_tributo`
- produto_segmento: `Authenticated can read produto_segmento`
- produto_servico: `Authenticated users can view produto_servico`
- setor_cliente: `Authenticated can read setor_cliente`
- page_permissions: `rls_page_permissions_select`
- rls_precheck_allowed_tables: `rls_precheck_allowed_tables_read_authenticated`

**GATE 1 ✅:** nenhuma das aberturas vem de `FOR ALL qual=true`. Todas as policies "abertas" estão em `cmd='SELECT'`. Seguro prosseguir.

**Policies de escrita (NÃO serão tocadas):**
- codigo_receita/grupo_tributo/produto_servico/page_permissions: `FOR ALL` restrito a `has_role('admin')`.
- produto_segmento: `FOR ALL` restrito a `has_role_or_higher('team_member')`.
- setor_cliente: INSERT/UPDATE/DELETE separados restritos a `sublider+`.
- rls_precheck_allowed_tables: sem policies de escrita (permanece assim).

### PASSO 2 — Migration (transação única via `supabase--migration`)

```sql
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['codigo_receita','grupo_tributo','produto_segmento',
                           'produto_servico','setor_cliente','page_permissions',
                           'rls_precheck_allowed_tables']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_codigo_receita_select              ON public.codigo_receita
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_grupo_tributo_select               ON public.grupo_tributo
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_produto_segmento_select            ON public.produto_segmento
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_produto_servico_select             ON public.produto_servico
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_setor_cliente_select               ON public.setor_cliente
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_page_permissions_select            ON public.page_permissions
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_precheck_allowed_tables_select     ON public.rls_precheck_allowed_tables
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
```

### PASSO 3 — GATES
- 3a: 1 policy SELECT por tabela, `qual = has_role_or_higher(auth.uid(),'team_member')`; nenhuma SELECT com `qual=true` remanescente.
- 3b: INSERT/UPDATE/DELETE das 7 idênticos ao baseline.

### PASSO 4 — Relatório
Contagens (1a) + policies antigas (1b) + esperado vs obtido (3a/3b).

### Rollback (se GATE falhar)
Dropar os 7 `rls_*_select` novos e recriar as 7 SELECTs do baseline com `USING (true)` e os mesmos nomes originais.

### ⚠️ Impacto
- Usuários com role `client` deixam de ler esses catálogos. Nenhuma tela do portal do cliente os consome — verificado.
- Sem mudanças de frontend.

Confirmar para eu aplicar?
