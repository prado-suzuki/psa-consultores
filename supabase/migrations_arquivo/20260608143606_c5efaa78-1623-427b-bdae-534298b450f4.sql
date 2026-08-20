-- ============================================================================
-- OSG v5 Fix Enums — Normaliza campos enum/select carregados com valores
-- fora do conjunto aceito pelo app TypeScript. Escopo limitado ao cluster OSG.
-- ============================================================================

BEGIN;

DO $patch$
DECLARE
  v_cluster  uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';
  n          integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.estrutura_clusters WHERE id = v_cluster) THEN
    RAISE EXCEPTION 'Cluster OSG (id=%) não encontrado — abortando patch.', v_cluster;
  END IF;

  -- 1) processes.frequency → NULL
  UPDATE public.processes
  SET frequency = NULL
  WHERE cluster_id = v_cluster
    AND frequency IS NOT NULL
    AND frequency NOT IN ('Diária','Semanal','Quinzenal','Mensal','Trimestral','Anual');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'processes.frequency normalizada para NULL: % linhas', n;

  -- 2) process_stages.execution → 'manual'
  UPDATE public.process_stages
  SET execution = 'manual'
  WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster)
    AND (execution IS NULL OR execution NOT IN ('manual','semi_automatica','automatica'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'process_stages.execution normalizada para ''manual'': % linhas', n;

  -- 3) projects.status → 'Mapeamento'
  UPDATE public.projects
  SET status = 'Mapeamento'
  WHERE cluster_id = v_cluster
    AND (status IS NULL OR status NOT IN ('Mapeamento','Diagnóstico','Melhorias','ROI'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'projects.status normalizada para ''Mapeamento'': % linhas', n;

  -- 4) documentos_processo.origem → enum {Interno, Cliente}
  UPDATE public.documentos_processo
  SET origem = CASE
    WHEN origem IN ('PSA','Junta Comercial','Cartório') THEN 'Interno'
    WHEN origem = 'Órgão Público'                       THEN 'Cliente'
    ELSE origem
  END
  WHERE cluster_id = v_cluster
    AND origem IS NOT NULL
    AND origem NOT IN ('Interno','Cliente');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'documentos_processo.origem normalizada: % linhas', n;

  -- 5) gargalos.origem → enum {Processo, Sistema, Pessoas, Cliente, Externo}
  UPDATE public.gargalos
  SET origem = CASE
    WHEN origem = 'Interno'       THEN 'Processo'
    WHEN origem = 'Órgão externo' THEN 'Externo'
    ELSE origem
  END
  WHERE cluster_id = v_cluster
    AND origem IS NOT NULL
    AND origem NOT IN ('Processo','Sistema','Pessoas','Cliente','Externo');
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'gargalos.origem normalizada: % linhas', n;

  -- 6) process_improvements.improvement_status → 'Não iniciado'
  UPDATE public.process_improvements
  SET improvement_status = 'Não iniciado'
  WHERE cluster_id = v_cluster
    AND (improvement_status IS NULL
         OR improvement_status NOT IN ('Não iniciado','Em progresso','Concluído','Backlog'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'process_improvements.improvement_status normalizada para ''Não iniciado'': % linhas', n;
END
$patch$;

COMMIT;