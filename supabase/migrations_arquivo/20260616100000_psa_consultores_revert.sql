-- ════════════════════════════════════════════════════════════════════════════
-- REVERSÃO DO CLUSTER PSA CONSULTORES NO MAPA
-- Desfaz as migrações 20260610100000 / 20260611100000 / 20260612100000 /
-- 20260613* / 20260614* / 20260615* no escopo do cluster PSA Consultores
-- (b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3), devolvendo o Digital Rotina ao
-- estado original. Idempotente — pode rodar mais de uma vez.
--
-- Política de campos sobrescritos sem registro do valor original:
--   • Inputs de LISTA no front da Rotina → restaurados para valor válido:
--       - processes.frequency  (Select lowercase: mensal/semanal/diário/quinzenal)
--       - projects.status      (Select EN: active/completed/blocked/archived →
--                               'completed', valor original confirmado pelo usuário)
--   • Inputs de TEXTO/NÚMERO livres → mantidos como estão:
--       - processes.description, projects.description
--       - volume_month, volume_executions, people_involved, time_spent_hours
--         (colunas NATIVAS; o backfill usou COALESCE, então não dá para separar
--         o que era NULL do que era valor nativo — manter é o seguro)
--   • processes.project_id é NATIVO (criação da tabela, Dez/2025) e o valor
--     atual coincide com o vínculo nativo project_processes → mantido.
--     A exceção (PROC-FISCAL-008 → P11) volta a NULL via ON DELETE SET NULL
--     quando o P11 é removido.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 0. Constante do cluster ────────────────────────────────────────────────
-- (usada inline; nenhuma linha de outro cluster é tocada)

-- ─── 1. Junções de etapa (linhas 100% inseridas pelo MAPA) ─────────────────
-- A Rotina nunca usou essas tabelas para os processos PSA: o vínculo nativo
-- de responsável/sistemas vive em process_stages.responsible/systems (TEXT/JSONB).

DELETE FROM public.etapa_documentos ed
USING public.documentos_processo d
WHERE ed.documento_id = d.id
  AND d.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.etapa_sistemas es
USING public.sistemas_processo s
WHERE es.sistema_id = s.id
  AND s.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.etapa_responsaveis er
USING public.process_stages ps, public.processes p
WHERE er.etapa_id = ps.id
  AND ps.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- ─── 2. Junções de gargalo e melhoria ───────────────────────────────────────
DELETE FROM public.gargalo_etapas ge
USING public.gargalos g
WHERE ge.gargalo_id = g.id
  AND g.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.gargalo_processos gp
USING public.gargalos g
WHERE gp.gargalo_id = g.id
  AND g.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.gargalo_melhorias gm
USING public.gargalos g
WHERE gm.gargalo_id = g.id
  AND g.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.melhoria_processos mp
USING public.process_improvements m
WHERE mp.melhoria_id = m.id
  AND m.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.melhoria_responsaveis mr
USING public.process_improvements m
WHERE mr.melhoria_id = m.id
  AND m.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.melhoria_sistemas ms
USING public.process_improvements m
WHERE ms.melhoria_id = m.id
  AND m.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.melhoria_acoes_td ma
USING public.process_improvements m
WHERE ma.melhoria_id = m.id
  AND m.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- ─── 3. Entidades MAPA do cluster ───────────────────────────────────────────
DELETE FROM public.gargalos
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.process_improvements
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- Snapshots de ROI criados pelo MAPA (o cenário nativo "reduzir para 2hs" é preservado)
DELETE FROM public.process_scenarios sc
USING public.processes p
WHERE sc.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND sc.name LIKE 'Snapshot ROI MAPA — %';

-- Etapas TO-BE (inseridas pela 20260612; as AS-IS de Jan–Mar/2026 são nativas)
DELETE FROM public.process_stages ps
USING public.processes p
WHERE ps.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND ps.scenario = 'TO-BE';

-- Catálogos do cluster
DELETE FROM public.documentos_processo
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.sistemas_processo
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.sistema_clusters
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- Justificativas inseridas para os projetos do cluster (tabela é do MAPA)
DELETE FROM public.projeto_justificativas pj
USING public.projects pr
WHERE pj.projeto_id = pr.id
  AND pr.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- ─── 4. Restaurar colunas de LISTA sobrescritas nas linhas nativas ─────────
-- frequency: o Select da Rotina (CreateProcessModal.FREQUENCIES) só aceita
-- 'diário','semanal','quinzenal','mensal','trimestral','anual' (lowercase).
UPDATE public.processes SET frequency = 'mensal',    updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Mensal';
UPDATE public.processes SET frequency = 'semanal',   updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Semanal';
UPDATE public.processes SET frequency = 'diário',    updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Diária';
UPDATE public.processes SET frequency = 'quinzenal', updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Quinzenal';

-- status: o Select da Rotina (EquipeProjetos) só aceita
-- 'active','completed','blocked','archived'. Valor original confirmado pelo
-- usuário (12/06/2026): os projetos estavam 'completed' (Concluído).
UPDATE public.projects SET status = 'completed', updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND status NOT IN ('active', 'completed', 'blocked', 'archived');

-- ─── 5. Anular colunas MAPA das etapas AS-IS nativas ────────────────────────
-- execution/rework_rate/error_rate/lead_time_days/volume_per_process foram
-- adicionadas em Jun/2026 e estavam todas NULL antes do backfill → revert exato.
UPDATE public.process_stages ps SET
  execution          = NULL,
  rework_rate        = NULL,
  error_rate         = NULL,
  lead_time_days     = NULL,
  volume_per_process = NULL,
  updated_at         = NOW()
FROM public.processes p
WHERE ps.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND ps.scenario = 'AS-IS';

-- ─── 6. Recriar a etapa "teste" deletada pela 20260611 ──────────────────────
-- Linha nativa do PROC-FISCAL-007 (Consulta de CNPJ SN), posição 2. Demais
-- campos não foram registrados antes do DELETE — recriada mínima, com o id original.
INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario)
SELECT '9ee164f2-42b5-46aa-90fd-29d7c9a6eeb8',
       'ad8a6b69-2579-4a16-b708-6319555a87f9', 2, 'teste', 'AS-IS'
WHERE NOT EXISTS (
  SELECT 1 FROM public.process_stages WHERE id = '9ee164f2-42b5-46aa-90fd-29d7c9a6eeb8'
);

-- ─── 7. Cenário nativo "reduzir para 2hs": desfazer snapshot_at ─────────────
-- (a 20260611 setou '2025-01-01' onde era NULL)
UPDATE public.process_scenarios SET snapshot_at = NULL
WHERE name = 'reduzir para 2hs'
  AND snapshot_at = '2025-01-01T00:00:00Z';

-- ─── 8. Desvincular do cluster e remover o projeto P11 ──────────────────────
-- cluster_id é coluna MAPA (Jun/2026): NULL = estado pré-backfill.
-- processes.project_id (nativo) é mantido — coincide com project_processes;
-- o do PROC-FISCAL-008 (→P11) volta a NULL pelo ON DELETE SET NULL do FK nativo.
UPDATE public.processes SET cluster_id = NULL, updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

-- P11 - Planejamento Tributário: único projeto INSERIDO pelo MAPA (09/06/2026)
DELETE FROM public.projects
WHERE id = '95c48faa-7115-90fc-38ca-760869606a41';

UPDATE public.projects SET cluster_id = NULL, updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- PERDAS ACEITAS (originais não registrados; decisão de 12/06/2026):
--   • descriptions de 6 processos e 7 projetos (texto livre — mantidas);
--   • frequency: grafia original desconhecida; restaurada para o equivalente
--     lowercase válido no Select da Rotina (PROC-FISCAL-008 fica 'mensal');
--   • status dos 10 projetos: restaurado para 'completed' (confirmado pelo usuário);
--   • etapa "teste": recriada só com id/nome/ordem/processo.
-- NÃO tocado: project_processes (nativo), job_roles (global), volume_month /
-- volume_executions / people_involved / time_spent_hours (nativos, COALESCE).
-- ════════════════════════════════════════════════════════════════════════════
