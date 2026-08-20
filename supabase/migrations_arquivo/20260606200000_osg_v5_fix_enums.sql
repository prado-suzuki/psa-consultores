-- ============================================================================
-- 20260606200000_osg_v5_fix_enums.sql
-- ----------------------------------------------------------------------------
-- Patch da v5 OSG: normaliza TODOS os campos enum/select que a migração v5
-- carregou com valores fora do conjunto aceito pelo app TypeScript.
--
-- Mapeamentos aplicados (apenas no cluster OSG):
--
--   processes.frequency
--     Aceito:  'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral' | 'Anual'
--     Inserido: strings descritivas ('1x por projeto', '0-N por projeto', etc.)
--     Patch:   → NULL (operador define ritmo manualmente)
--
--   process_stages.execution
--     Aceito:  'manual' | 'semi_automatica' | 'automatica'
--     Inserido: descrições de meio ('Manual em Word', 'Reunião', 'gov.br' etc.)
--     Patch:   → 'manual' (reflete realidade atual; ajustar etapa-a-etapa depois)
--
--   projects.status
--     Aceito:  'Mapeamento' | 'Diagnóstico' | 'Melhorias' | 'ROI'
--     Inserido: 'active'
--     Patch:   → 'Mapeamento' (estado inicial do projeto)
--
--   documentos_processo.origem
--     Aceito:  'Interno' | 'Cliente'
--     Inserido: 'PSA', 'Junta Comercial', 'Cartório', 'Órgão Público', 'Cliente'
--     Patch:
--       'PSA'              → 'Interno'
--       'Junta Comercial'  → 'Interno' (PSA gerencia o registro)
--       'Cartório'         → 'Interno' (PSA gerencia o registro)
--       'Órgão Público'    → 'Cliente' (chega via cliente)
--       'Cliente'          → mantém
--
--   gargalos.origem
--     Aceito:  'Processo' | 'Sistema' | 'Pessoas' | 'Cliente' | 'Externo'
--     Inserido: 'Interno', 'Cliente', 'Órgão externo'
--     Patch:
--       'Interno'        → 'Processo' (maioria dos gargalos internos do OSG)
--       'Órgão externo'  → 'Externo'
--       'Cliente'        → mantém
--
--   process_improvements.improvement_status
--     Aceito:  'Não iniciado' | 'Em progresso' | 'Concluído' | 'Backlog'
--     Inserido: 'proposed'
--     Patch:   → 'Não iniciado'
--
-- Escopo absolutamente limitado ao cluster OSG.
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
