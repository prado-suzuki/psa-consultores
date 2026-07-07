## RLS-09 — Ownership no módulo de Desempenho

Escopo estrito: só o SELECT de 6 tabelas (`metas`, `kpis_meta`, `atualizacoes_meta`, `itens_acao_1a1`, `ppr_regras_ciclo`, `ciclos_avaliacao`). Não toca escrita, não toca `performance_preferencias`, não toca as 4 "já OK".

### Baseline (PASSO 1 ✅ — já capturado)
- Contagens: **0 linhas** em todas as 6 tabelas (preventivo).
- SELECT atual das 6 alvo: 1 policy cada, todas `rls_<tabela>_select` com `USING has_role_or_higher('team_member')`.
- Escrita atual das 6: `lider_manage_*` (`FOR ALL`) ou `rls_ppr_regras_ciclo_modify` — **não serão tocadas**.
- "Já OK" preservadas: `feedbacks`, `comentarios_avaliacao`, `reunioes_1a1`, `analises_semestrais` já têm SELECT ownership-based.

### PASSO 2 — Migration (transação única, via `supabase--migration`)

```sql
-- Drop SÓ dos SELECT das 6 alvo (não toca FOR ALL/escrita)
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['metas','kpis_meta','atualizacoes_meta','itens_acao_1a1','ppr_regras_ciclo','ciclos_avaliacao']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_metas_select ON public.metas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR responsavel_id = auth.uid()
      OR public.has_role_or_higher(auth.uid(),'lider'::app_role));

CREATE POLICY rls_kpis_meta_select ON public.kpis_meta
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metas m WHERE m.id = kpis_meta.meta_id));

CREATE POLICY rls_atualizacoes_meta_select ON public.atualizacoes_meta
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metas m WHERE m.id = atualizacoes_meta.meta_id));

CREATE POLICY rls_itens_acao_1a1_select ON public.itens_acao_1a1
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reunioes_1a1 r
                 WHERE r.id = itens_acao_1a1.reuniao_id
                   AND (r.lider_id = auth.uid()
                        OR r.membro_id = auth.uid()
                        OR public.has_role_or_higher(auth.uid(),'lider'::app_role))));

CREATE POLICY rls_ppr_regras_ciclo_select ON public.ppr_regras_ciclo
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'lider'::app_role));

CREATE POLICY rls_ciclos_avaliacao_select ON public.ciclos_avaliacao
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'lider'::app_role));
```

### PASSO 3 — GATE de verificação
- `SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND tablename IN (…6…);`
- Exigido: 1 policy SELECT por tabela, com o `USING` esperado por tabela.
- Conferir que as 4 "já OK" continuam idênticas ao baseline.
- Conferir que as policies `lider_manage_*` / `rls_ppr_regras_ciclo_modify` (FOR ALL) continuam intactas.

### PASSO 4 — Relatório
Baseline (contagens + policies) + resultado do GATE (esperado vs obtido). Nenhuma alteração de código frontend.

### Rollback (se GATE falhar)
Drop dos 6 novos SELECT e recriação do estado anterior (`has_role_or_higher('team_member')` em cada uma).

### Avisos
- RLS é global (dev+prod). Tabelas vazias → sem risco de dado exposto/perdido; validação é estrutural.
- Não toca frontend, hooks, escrita, nem `performance_preferencias`.

Confirmar para eu aplicar?
