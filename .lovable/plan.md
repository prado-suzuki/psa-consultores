## Diagnóstico

A migration `20260615100000_psa_consultores_snapshot_zerar_sinteticos.sql` **não foi aplicada** ao banco. Evidências consultadas agora:

- `supabase_migrations.schema_migrations`: o último registro é `20260609192218` — não há nenhuma entrada `20260615100000`.
- O arquivo `supabase/migrations/20260609192219_5540d98c-….sql` (criado pela última chamada do migration tool) está **vazio (0 linhas)** — placeholder que ficou em disco sem SQL.
- Os 14 snapshots-alvo continuam intactos no banco:
  - `roi_percent = 233.33` em todos os 14 (GER-279/704/603/167, GER-030/350/249/294/002/313/221, GER-938/719, BI-001)
  - `annual_savings` ainda nos valores sintéticos antigos (792 a 8.976)
  - `notes IS NULL` em todos
  - `updated_at = 2026-06-09 13:30:44` (timestamp da migration anterior `…_snapshot_recalc.sql`), não da execução de ontem

Conclusão: o relatório anterior de "14 registros afetados" foi **incorreto** — a transação não chegou a commitar (provável recusa/cancelamento na etapa de aprovação do migration tool, com o arquivo placeholder permanecendo em disco). O arquivo `20260615100000…` existe completo no repo, mas nunca foi enviado ao banco.

## Plano de re-execução

1. Reabrir o migration tool com o **mesmo conteúdo** de `supabase/migrations/20260615100000_psa_consultores_snapshot_zerar_sinteticos.sql` (115 linhas, três blocos `UPDATE` + bloco `DO` de validação `4+7+3=14`).
2. O migration tool gerará um novo arquivo com timestamp atual (`20260609xxxxxx_…`). Não há conflito: o arquivo `20260615100000…` em disco pode permanecer como referência documental (ou ser removido após sucesso — opcional, sem efeito no banco).
3. Aprovar a execução. Como existe o `DO $$ … RAISE EXCEPTION …` ao final, se algum grupo não bater 4/7/3, a transação aborta inteira — sem risco de aplicação parcial.
4. **Validação pós-execução** (read_query):
   - `SELECT code, annual_savings, roi_percent, notes, updated_at FROM process_scenarios ps JOIN processes p ON p.id=ps.process_id WHERE p.code IN (…14 códigos…)` — esperado: todos com `annual_savings=0`, `roi_percent=0`, `notes` preenchido e `updated_at` recente.
   - Conferir consolidado do dashboard: economia anual deve cair de ~R$ 327.485 para ~R$ 300.890 (alinhado ao PDF).
5. Limpar o placeholder vazio `supabase/migrations/20260609192219_5540d98c-….sql` (0 linhas) para não poluir histórico.

## Escopo

- Apenas `UPDATE` em `process_scenarios` filtrando por `p.code IN (…)` e `ps.name LIKE 'Snapshot ROI MAPA — %'`.
- Nenhum DDL, nenhuma alteração em `processes`, `process_stages`, `documents`, `sistemas_processo` ou RLS.
- Sem impacto em outras áreas (fiscal, tickets, board).
