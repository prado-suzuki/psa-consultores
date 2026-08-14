BEGIN;

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

DELETE FROM public.gargalos
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.process_improvements
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.process_scenarios sc
USING public.processes p
WHERE sc.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND sc.name LIKE 'Snapshot ROI MAPA — %';

DELETE FROM public.process_stages ps
USING public.processes p
WHERE ps.process_id = p.id
  AND p.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND ps.scenario = 'TO-BE';

DELETE FROM public.documentos_processo
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.sistemas_processo
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.sistema_clusters
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.projeto_justificativas pj
USING public.projects pr
WHERE pj.projeto_id = pr.id
  AND pr.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

UPDATE public.processes SET frequency = 'mensal',    updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Mensal';
UPDATE public.processes SET frequency = 'semanal',   updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Semanal';
UPDATE public.processes SET frequency = 'diário',    updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Diária';
UPDATE public.processes SET frequency = 'quinzenal', updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND frequency = 'Quinzenal';

UPDATE public.projects SET status = 'completed', updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND status NOT IN ('active', 'completed', 'blocked', 'archived');

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

INSERT INTO public.process_stages (id, process_id, stage_order, name, scenario)
SELECT '9ee164f2-42b5-46aa-90fd-29d7c9a6eeb8',
       'ad8a6b69-2579-4a16-b708-6319555a87f9', 2, 'teste', 'AS-IS'
WHERE NOT EXISTS (
  SELECT 1 FROM public.process_stages WHERE id = '9ee164f2-42b5-46aa-90fd-29d7c9a6eeb8'
);

UPDATE public.process_scenarios SET snapshot_at = NULL
WHERE name = 'reduzir para 2hs'
  AND snapshot_at = '2025-01-01T00:00:00Z';

UPDATE public.processes SET cluster_id = NULL, updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

DELETE FROM public.projects
WHERE id = '95c48faa-7115-90fc-38ca-760869606a41';

UPDATE public.projects SET cluster_id = NULL, updated_at = NOW()
WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';

COMMIT;