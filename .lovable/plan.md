## Checklist de validação — `20260619100000_psa_08_reestrutura_projetos_osg.sql`

1. ✅ **Reagrupa 33 processos OSG em 3 projetos (19/6/8, sem órfão).**
   - Pré-condição (linhas 53-56): aborta se `count(processes WHERE cluster_id = OSG) <> 33`.
   - VALUES da linha 117-164 lista exatamente 33 códigos `PROC-GERAL-*` — 19 → Contratos, 6 → Gestão, 8 → Planejamento.
   - Pós-validação 6.1 (linhas 178-182) aborta se a distribuição final não for 19/6/8.
   - Pós-validação 6.2 (linhas 185-191) aborta se sobrar qualquer processo OSG fora dos 3 projetos.

2. ✅ **"Contratos" reaproveita projeto existente, não cria outro.**
   - `v_contratos := '70c8b198-…'` (ex "P10 - Contratos", já criado pela coordenadora com `cluster_id = NULL`).
   - Há apenas `UPDATE public.projects … WHERE id = v_contratos` (linhas 78-94). Nenhum `INSERT INTO public.projects` em toda a migração.

3. ✅ **Em `processes` só mudam `project_id` e `order_index`.**
   - `UPDATE public.processes SET project_id = m.proj, order_index = m.ord` (linhas 113-115). Nenhum outro campo no SET.
   - Cláusula `WHERE p.code = m.code AND p.cluster_id = v_osg` garante a trava por cluster.

4. ✅ **Nenhuma etapa é tocada.**
   - Não há `INSERT/UPDATE/DELETE` em `process_stages`, `etapa_documentos`, `etapa_sistemas`, `etapa_responsaveis` ou `gargalo_etapas`.
   - Snapshot antes (0.3, linhas 59-62) e depois (6.3, linhas 194-200) com `RAISE EXCEPTION` se a contagem divergir.
   - Como nenhum `process.id` muda nem nenhum processo é deletado, as FKs `process_stages.process_id` permanecem válidas.

5. ✅ **Nada fora do cluster OSG é lido, alterado ou deletado.**
   - Todos os SELECTs/UPDATEs em `processes` filtram por `cluster_id = v_osg` ou por `id` específico.
   - Os 3 `UPDATE public.projects` usam `WHERE id = <uuid fixo>` (Contratos/Gestão/Planejamento).
   - O `DELETE FROM public.projects WHERE id = ANY(v_del)` (linha 171) usa os 4 UUIDs fixos dos ex-P2/P3/P4/P5.
   - `DELETE FROM public.projeto_justificativas WHERE projeto_id = v_planejamento` é escopado por id.

6. ✅ **Os 4 projetos deletados não têm referência em sprints/dailies/tasks.**
   - Bloco 0.4 (linhas 65-74) soma referências em `sprints`, `process_improvements`, `process_scenarios`, `org_tasks` e `client_visible_projects` para `project_id = ANY(v_del)` e aborta se `> 0`.
   - Observação: `daily_standups` referencia `process_id`, não `project_id` — como nenhum processo é deletado, dailies ficam intactas por construção.
   - Pós-validação 6.4 (linhas 203-205) confirma que os 4 projetos foram efetivamente removidos.

**Toda a migração roda em `BEGIN; … COMMIT;` com `RAISE EXCEPTION` em cada checkpoint — qualquer divergência aborta a transação inteira.**

Aguardando aprovação para aplicar via `supabase--migration`.