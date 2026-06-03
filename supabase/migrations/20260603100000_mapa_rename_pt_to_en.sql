-- =====================================================================
-- 20260603100000_mapa_rename_pt_to_en.sql
-- Padroniza as colunas que a integração MAPA (migration 20260602190000)
-- adicionou em PORTUGUÊS nas tabelas reaproveitadas — agora em INGLÊS,
-- alinhado ao schema original do Digital Rotina.
--
-- Tabelas afetadas:
--   1. projects                — 1 RENAME
--   2. processes               — 1 DROP (conflito vazio) + 5 RENAMEs
--   3. process_stages          — 1 DROP (conflito vazio) + 9 RENAMEs + recria UNIQUE/CHECK/FKs/indexes
--   4. process_improvements    — 3 RENAMEs
--   5. job_roles               — 1 DROP (conflito vazio) + 1 RENAME
--   6. process_scenarios       — 2 DROPs (conflitos vazios) + 8 RENAMEs
--
-- Tabelas filhas que carregam coluna `cenario` (precisa virar `scenario`
-- para preservar as FKs compostas → process_stages):
--   - etapa_responsaveis
--   - etapa_sistemas
--   - etapa_documentos
--   - cascata_evento_etapas
--
-- Conflitos foram resolvidos com DROP porque as colunas PT estavam vazias
-- em produção (validado via REST API antes desta migration):
--   processes.projeto_id           (0/28)  → DROP, manter EN project_id
--   process_stages.processo_id     (0/56)  → DROP, manter EN process_id
--   process_scenarios.processo_id  (0/1)   → DROP, manter EN process_id
--   process_scenarios.criado_por   (0/1)   → DROP, manter EN created_by
--   job_roles.categoria            (0/19)  → DROP, manter EN category
--
-- As tabelas inteiramente NOVAS do MAPA (documentos_processo, sistemas_processo,
-- etapa_responsaveis, gargalos, melhoria_*, cascata_*, etc.) mantêm seu schema
-- em PT — convenção válida porque não convivem com schema EN herdado.
--
-- Idempotente. Envelopado em BEGIN/COMMIT.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------
ALTER TABLE public.projects
  RENAME COLUMN projetos_por_ano TO projects_per_year;


-- ---------------------------------------------------------------------
-- 2. processes
-- ---------------------------------------------------------------------
-- 2.1 Drop coluna PT em conflito (já existe project_id EN, vazia)
ALTER TABLE public.processes DROP CONSTRAINT IF EXISTS processes_projeto_id_fk;
DROP INDEX IF EXISTS public.idx_processes_projeto_id;
ALTER TABLE public.processes DROP COLUMN IF EXISTS projeto_id;

-- 2.2 Renames sem conflito
ALTER TABLE public.processes RENAME COLUMN ordem              TO order_index;
ALTER TABLE public.processes RENAME COLUMN entregavel         TO deliverable;
ALTER TABLE public.processes RENAME COLUMN status_avaliacao   TO evaluation_status;
ALTER TABLE public.processes RENAME COLUMN horas_treinamento  TO training_hours;
ALTER TABLE public.processes RENAME COLUMN mapeado_em         TO mapped_at;


-- ---------------------------------------------------------------------
-- 3. process_stages — mais complexo: UNIQUE composta, CHECK, FKs
-- ---------------------------------------------------------------------
-- 3.1 Drop coluna processo_id em conflito (já existe process_id EN, vazia)
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_processo_id_fk;
DROP INDEX IF EXISTS public.idx_process_stages_processo_id;
ALTER TABLE public.process_stages DROP COLUMN IF EXISTS processo_id;

-- 3.2 Drop FKs/UNIQUE/CHECK/indexes que dependem de `cenario` e `etapa_as_is_id`
ALTER TABLE public.etapa_responsaveis     DROP CONSTRAINT IF EXISTS etapa_responsaveis_etapa_fk;
ALTER TABLE public.etapa_sistemas         DROP CONSTRAINT IF EXISTS etapa_sistemas_etapa_fk;
ALTER TABLE public.etapa_documentos       DROP CONSTRAINT IF EXISTS etapa_documentos_etapa_fk;
ALTER TABLE public.cascata_evento_etapas  DROP CONSTRAINT IF EXISTS casc_evt_etp_etapa_fk;

ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_etapa_as_is_fk;
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_id_cenario_key;
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_cenario_check;

DROP INDEX IF EXISTS public.idx_process_stages_cenario;
DROP INDEX IF EXISTS public.idx_process_stages_etapa_as_is_id;

-- 3.3 RENAMEs em process_stages
ALTER TABLE public.process_stages RENAME COLUMN cenario              TO scenario;
ALTER TABLE public.process_stages RENAME COLUMN etapa_as_is_id       TO stage_as_is_id;
ALTER TABLE public.process_stages RENAME COLUMN execucao             TO execution;
ALTER TABLE public.process_stages RENAME COLUMN lead_time_dias       TO lead_time_days;
ALTER TABLE public.process_stages RENAME COLUMN volume_por_processo  TO volume_per_process;
ALTER TABLE public.process_stages RENAME COLUMN taxa_erros           TO error_rate;
ALTER TABLE public.process_stages RENAME COLUMN taxa_retrabalho      TO rework_rate;
ALTER TABLE public.process_stages RENAME COLUMN custo_erro           TO error_cost;
ALTER TABLE public.process_stages RENAME COLUMN volume_erros         TO error_volume;

-- 3.4 RENAMEs em filhas que carregam `cenario`
ALTER TABLE public.etapa_responsaveis     RENAME COLUMN cenario TO scenario;
ALTER TABLE public.etapa_sistemas         RENAME COLUMN cenario TO scenario;
ALTER TABLE public.etapa_documentos       RENAME COLUMN cenario TO scenario;
ALTER TABLE public.cascata_evento_etapas  RENAME COLUMN cenario TO scenario;

-- 3.5 Recriar constraints com nomes novos
ALTER TABLE public.process_stages
  ADD CONSTRAINT process_stages_scenario_check CHECK (scenario IN ('AS-IS','TO-BE')),
  ADD CONSTRAINT process_stages_id_scenario_key UNIQUE (id, scenario),
  ADD CONSTRAINT process_stages_stage_as_is_fk
    FOREIGN KEY (stage_as_is_id) REFERENCES public.process_stages(id) ON DELETE CASCADE;

-- 3.6 Recriar FKs compostas das filhas
ALTER TABLE public.etapa_responsaveis
  ADD CONSTRAINT etapa_responsaveis_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;

ALTER TABLE public.etapa_sistemas
  ADD CONSTRAINT etapa_sistemas_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;

ALTER TABLE public.etapa_documentos
  ADD CONSTRAINT etapa_documentos_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;

ALTER TABLE public.cascata_evento_etapas
  ADD CONSTRAINT casc_evt_etp_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;

-- 3.7 Recriar indexes
CREATE INDEX IF NOT EXISTS idx_process_stages_scenario       ON public.process_stages (scenario);
CREATE INDEX IF NOT EXISTS idx_process_stages_stage_as_is_id ON public.process_stages (stage_as_is_id);

-- Filhas: os indexes antigos eram em `(etapa_id, cenario)` — após o rename
-- o postgres reescreve internamente; mas para garantir consistência:
DROP INDEX IF EXISTS public.idx_etapa_resp_etapa_id;
DROP INDEX IF EXISTS public.idx_etapa_sis_etapa_id;
DROP INDEX IF EXISTS public.idx_etapa_doc_etapa_id;
CREATE INDEX IF NOT EXISTS idx_etapa_resp_etapa_id ON public.etapa_responsaveis (etapa_id, scenario);
CREATE INDEX IF NOT EXISTS idx_etapa_sis_etapa_id  ON public.etapa_sistemas     (etapa_id, scenario);
CREATE INDEX IF NOT EXISTS idx_etapa_doc_etapa_id  ON public.etapa_documentos   (etapa_id, scenario);

-- 3.8 Atualizar UNIQUE compostas das filhas (carregam o nome da coluna)
ALTER TABLE public.etapa_responsaveis    DROP CONSTRAINT IF EXISTS etapa_responsaveis_uniq;
ALTER TABLE public.etapa_sistemas        DROP CONSTRAINT IF EXISTS etapa_sistemas_uniq;
ALTER TABLE public.etapa_documentos      DROP CONSTRAINT IF EXISTS etapa_documentos_uniq;
ALTER TABLE public.cascata_evento_etapas DROP CONSTRAINT IF EXISTS casc_evt_etp_uniq;

ALTER TABLE public.etapa_responsaveis
  ADD CONSTRAINT etapa_responsaveis_uniq UNIQUE (etapa_id, scenario, responsavel_id, papel);
ALTER TABLE public.etapa_sistemas
  ADD CONSTRAINT etapa_sistemas_uniq UNIQUE (etapa_id, scenario, sistema_id);
ALTER TABLE public.etapa_documentos
  ADD CONSTRAINT etapa_documentos_uniq UNIQUE (etapa_id, scenario, documento_id, sentido);
ALTER TABLE public.cascata_evento_etapas
  ADD CONSTRAINT casc_evt_etp_uniq UNIQUE (evento_id, etapa_id, scenario);

-- 3.9 Atualizar o trigger AS-IS cascade para usar `scenario` em vez de `cenario`
CREATE OR REPLACE FUNCTION public.process_stages_cascade_as_is_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.scenario = 'AS-IS' THEN
    DELETE FROM public.process_stages
     WHERE scenario = 'TO-BE'
       AND stage_as_is_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;


-- ---------------------------------------------------------------------
-- 4. process_improvements
-- ---------------------------------------------------------------------
ALTER TABLE public.process_improvements
  RENAME COLUMN status_melhoria TO improvement_status;
ALTER TABLE public.process_improvements
  RENAME COLUMN horas_treinamento TO training_hours;
ALTER TABLE public.process_improvements
  RENAME COLUMN custo_externo_unico TO one_time_external_cost;


-- ---------------------------------------------------------------------
-- 5. job_roles
-- ---------------------------------------------------------------------
-- 5.1 Drop coluna PT em conflito (já existe category EN, vazia)
ALTER TABLE public.job_roles DROP COLUMN IF EXISTS categoria;

-- 5.2 RENAME sem conflito
ALTER TABLE public.job_roles RENAME COLUMN tipo TO type;


-- ---------------------------------------------------------------------
-- 6. process_scenarios
-- ---------------------------------------------------------------------
-- 6.1 Drop colunas PT em conflito (vazias)
ALTER TABLE public.process_scenarios DROP CONSTRAINT IF EXISTS process_scenarios_processo_id_fk;
DROP INDEX IF EXISTS public.idx_process_scenarios_proc_em;
ALTER TABLE public.process_scenarios DROP COLUMN IF EXISTS processo_id;
ALTER TABLE public.process_scenarios DROP COLUMN IF EXISTS criado_por;

-- 6.2 RENAMEs sem conflito
ALTER TABLE public.process_scenarios RENAME COLUMN snapshot_em       TO snapshot_at;
ALTER TABLE public.process_scenarios RENAME COLUMN custo_anual       TO annual_cost;
ALTER TABLE public.process_scenarios RENAME COLUMN horas_anual       TO annual_hours;
ALTER TABLE public.process_scenarios RENAME COLUMN economia_anual    TO annual_savings;
ALTER TABLE public.process_scenarios RENAME COLUMN roi_percentual    TO roi_percent;
ALTER TABLE public.process_scenarios RENAME COLUMN payback_meses     TO payback_months;
ALTER TABLE public.process_scenarios RENAME COLUMN horas_liberadas   TO hours_freed;
ALTER TABLE public.process_scenarios RENAME COLUMN investimento      TO investment;

-- 6.3 Recriar index pelo process_id (EN) original — substitui o que dependia de processo_id+snapshot_em
CREATE INDEX IF NOT EXISTS idx_process_scenarios_process_snapshot
  ON public.process_scenarios (process_id, snapshot_at DESC);


COMMIT;

-- =====================================================================
-- FIM DA MIGRAÇÃO
-- =====================================================================
