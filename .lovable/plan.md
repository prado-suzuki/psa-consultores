## RLS-01 — Isolamento por cluster no cadastro OSG (7 tabelas)

### Aviso importante (ler antes de aprovar)
O projeto usa **um único banco Postgres** para dev e prod (segregação lógica via coluna `ambiente`). **RLS não distingue ambiente** — as policies criadas aqui valem para dev E prod imediatamente. Não há como "aplicar só em dev" no nível do RLS. Se quiser mesmo assim seguir, o plano abaixo executa; caso contrário, me avise para adiar.

O mesmo vale para o seed do PASSO 4 (`cliente_clusters`): vínculos passam a valer em qualquer ambiente que consulte esses clientes.

### Baseline já verificado (PASSO 1 ✅)
- Contagens como admin: `pessoa=78, bem=12, capital_integralizacao=42, matricula=10, parentesco=15, quadro_societario=48, titularidade=19` — **bate 100% com o esperado**.
- Cada uma das 7 tabelas tem **exatamente 1 policy SELECT** hoje — GATE do PASSO 1 passa.

### O que a migration vai fazer (PASSO 2)
Uma migration única, em transação:

1. Criar 4 funções `SECURITY DEFINER` (search_path=public):
   - `cliente_visivel_para(uuid)` → admin OU cluster do usuário ∈ clusters do cliente (via `cliente_clusters` + `resolve_user_cluster_ids`).
   - `cliente_id_de_pessoa(uuid)`, `cliente_id_de_bem(uuid)`, `cliente_id_de_matricula(uuid)` → resolvem `cliente_id` a partir da FK indireta.
   - `GRANT EXECUTE ... TO authenticated` nas 4.
2. **DROP** de TODA policy `SELECT` existente nas 7 tabelas (bloco `DO $$`), pra evitar duas policies permissivas em OR anulando o isolamento.
3. **CREATE** de 1 policy SELECT por tabela, `TO authenticated`:
   - Diretas (usam `cliente_id` da própria linha): `pessoa`, `bem`, `capital_integralizacao`.
   - Indiretas: `matricula` (via `bem`), `parentesco` (via `pessoa`), `quadro_societario` (via `empresa_pessoa_id → pessoa`), `titularidade` (via `COALESCE(bem, matricula→bem)`).
4. INSERT/UPDATE/DELETE das 7 tabelas **não são tocados** nesta rodada.

SQL exato conforme você enviou (copiado literal na migration).

### PASSO 3 — Verificação pós-migration
- `SELECT tablename, count(*) FROM pg_policies ... GROUP BY tablename` → esperado **1 por tabela**, todas com nome `osg_cluster_select_*`.
- Confirmar existência das 4 funções em `pg_proc`.
- Se qualquer tabela vier com 2 policies, **rollback** e reportar (não seguir para o PASSO 4).

### PASSO 4 — Seed idempotente em `cliente_clusters`
4 pares (Barralcool, Agro Amazônia, Bom Pastor → PSA OSG; Alessio Sansão → Prado Advogados), com `WHERE NOT EXISTS`. Executado via ferramenta de insert (não é DDL). ⚠️ Vale para prod também (single DB).

### PASSO 5 — Testes de impersonação
Rodados via `supabase--read_query` em blocos `BEGIN … ROLLBACK` com `SET LOCAL role authenticated` + `set_config('request.jwt.claims', …)`.

- **Teste A** — user `automacao` (líder, cluster PSA OSG, não-admin): esperado `pessoa=56`, `bem=6`, `capital=42`, `alessio=0`.
- **Teste B** — user `Eduardo` (admin): esperado `pessoa=78`, `bem=12`.

Se o runner rejeitar `SET LOCAL role`/`set_config` (pode acontecer via PgBouncer/pooler), reporto isso no PASSO 6 pra você validar logando no app.

### PASSO 6 — Relatório
Devolvo em uma única mensagem: baseline (P1) ✅, contagem de policies (P3), e resultados A/B em formato "esperado vs obtido". **Sem** qualquer promoção — nada mais é tocado sem seu OK explícito.

### Rollback (se qualquer GATE falhar)
Migration única de rollback: `DROP POLICY IF EXISTS osg_cluster_select_*` nas 7 tabelas + recriar as policies originais `FOR SELECT TO authenticated USING (has_role_or_higher(auth.uid(),'team_member'::app_role))` + `DELETE` dos 4 pares do seed.

### Detalhes técnicos
- Migration DDL (funções + policies) via `supabase--migration` — 1 chamada, transação implícita da ferramenta.
- Seed do PASSO 4 via `supabase--insert` (é DML, não DDL).
- Testes do PASSO 5 via `supabase--read_query` — cada teste é um bloco `BEGIN…ROLLBACK` para não deixar sessão suja.
- Nenhuma alteração de código frontend/hook nesta rodada. `useQuadroSocietario`, `useGestaoClientes`, etc. continuam usando as mesmas queries; a filtragem passa a acontecer no RLS.

### Confirmação que preciso antes de executar
1. Ciente de que RLS é global (dev+prod compartilham policies) e mesmo assim quer prosseguir? (S/N)
2. Ciente de que o seed do PASSO 4 grava vínculos definitivos em `cliente_clusters` (também global)? (S/N)
