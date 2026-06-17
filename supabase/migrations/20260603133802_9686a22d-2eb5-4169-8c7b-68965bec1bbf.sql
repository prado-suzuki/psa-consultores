-- conteúdo de 20260603100000_mapa_rename_pt_to_en.sql
ALTER TABLE public.projects RENAME COLUMN projetos_por_ano TO projects_per_year;

ALTER TABLE public.processes DROP CONSTRAINT IF EXISTS processes_projeto_id_fk;
DROP INDEX IF EXISTS public.idx_processes_projeto_id;
ALTER TABLE public.processes DROP COLUMN IF EXISTS projeto_id;
ALTER TABLE public.processes RENAME COLUMN ordem              TO order_index;
ALTER TABLE public.processes RENAME COLUMN entregavel         TO deliverable;
ALTER TABLE public.processes RENAME COLUMN status_avaliacao   TO evaluation_status;
ALTER TABLE public.processes RENAME COLUMN horas_treinamento  TO training_hours;
ALTER TABLE public.processes RENAME COLUMN mapeado_em         TO mapped_at;

ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_processo_id_fk;
DROP INDEX IF EXISTS public.idx_process_stages_processo_id;
ALTER TABLE public.process_stages DROP COLUMN IF EXISTS processo_id;

ALTER TABLE public.etapa_responsaveis     DROP CONSTRAINT IF EXISTS etapa_responsaveis_etapa_fk;
ALTER TABLE public.etapa_sistemas         DROP CONSTRAINT IF EXISTS etapa_sistemas_etapa_fk;
ALTER TABLE public.etapa_documentos       DROP CONSTRAINT IF EXISTS etapa_documentos_etapa_fk;
ALTER TABLE public.cascata_evento_etapas  DROP CONSTRAINT IF EXISTS casc_evt_etp_etapa_fk;

ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_etapa_as_is_fk;
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_id_cenario_key;
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_cenario_check;

DROP INDEX IF EXISTS public.idx_process_stages_cenario;
DROP INDEX IF EXISTS public.idx_process_stages_etapa_as_is_id;

ALTER TABLE public.process_stages RENAME COLUMN cenario              TO scenario;
ALTER TABLE public.process_stages RENAME COLUMN etapa_as_is_id       TO stage_as_is_id;
ALTER TABLE public.process_stages RENAME COLUMN execucao             TO execution;
ALTER TABLE public.process_stages RENAME COLUMN lead_time_dias       TO lead_time_days;
ALTER TABLE public.process_stages RENAME COLUMN volume_por_processo  TO volume_per_process;
ALTER TABLE public.process_stages RENAME COLUMN taxa_erros           TO error_rate;
ALTER TABLE public.process_stages RENAME COLUMN taxa_retrabalho      TO rework_rate;
ALTER TABLE public.process_stages RENAME COLUMN custo_erro           TO error_cost;
ALTER TABLE public.process_stages RENAME COLUMN volume_erros         TO error_volume;

ALTER TABLE public.etapa_responsaveis     RENAME COLUMN cenario TO scenario;
ALTER TABLE public.etapa_sistemas         RENAME COLUMN cenario TO scenario;
ALTER TABLE public.etapa_documentos       RENAME COLUMN cenario TO scenario;
ALTER TABLE public.cascata_evento_etapas  RENAME COLUMN cenario TO scenario;

ALTER TABLE public.process_stages
  ADD CONSTRAINT process_stages_scenario_check CHECK (scenario IN ('AS-IS','TO-BE')),
  ADD CONSTRAINT process_stages_id_scenario_key UNIQUE (id, scenario),
  ADD CONSTRAINT process_stages_stage_as_is_fk
    FOREIGN KEY (stage_as_is_id) REFERENCES public.process_stages(id) ON DELETE CASCADE;

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

CREATE INDEX IF NOT EXISTS idx_process_stages_scenario       ON public.process_stages (scenario);
CREATE INDEX IF NOT EXISTS idx_process_stages_stage_as_is_id ON public.process_stages (stage_as_is_id);

DROP INDEX IF EXISTS public.idx_etapa_resp_etapa_id;
DROP INDEX IF EXISTS public.idx_etapa_sis_etapa_id;
DROP INDEX IF EXISTS public.idx_etapa_doc_etapa_id;
CREATE INDEX IF NOT EXISTS idx_etapa_resp_etapa_id ON public.etapa_responsaveis (etapa_id, scenario);
CREATE INDEX IF NOT EXISTS idx_etapa_sis_etapa_id  ON public.etapa_sistemas     (etapa_id, scenario);
CREATE INDEX IF NOT EXISTS idx_etapa_doc_etapa_id  ON public.etapa_documentos   (etapa_id, scenario);

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

CREATE OR REPLACE FUNCTION public.process_stages_cascade_as_is_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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

ALTER TABLE public.process_improvements RENAME COLUMN status_melhoria     TO improvement_status;
ALTER TABLE public.process_improvements RENAME COLUMN horas_treinamento   TO training_hours;
ALTER TABLE public.process_improvements RENAME COLUMN custo_externo_unico TO one_time_external_cost;

ALTER TABLE public.job_roles DROP COLUMN IF EXISTS categoria;
ALTER TABLE public.job_roles RENAME COLUMN tipo TO type;

ALTER TABLE public.process_scenarios DROP CONSTRAINT IF EXISTS process_scenarios_processo_id_fk;
DROP INDEX IF EXISTS public.idx_process_scenarios_proc_em;
ALTER TABLE public.process_scenarios DROP COLUMN IF EXISTS processo_id;
ALTER TABLE public.process_scenarios DROP COLUMN IF EXISTS criado_por;

ALTER TABLE public.process_scenarios RENAME COLUMN snapshot_em     TO snapshot_at;
ALTER TABLE public.process_scenarios RENAME COLUMN custo_anual     TO annual_cost;
ALTER TABLE public.process_scenarios RENAME COLUMN horas_anual     TO annual_hours;
ALTER TABLE public.process_scenarios RENAME COLUMN economia_anual  TO annual_savings;
ALTER TABLE public.process_scenarios RENAME COLUMN roi_percentual  TO roi_percent;
ALTER TABLE public.process_scenarios RENAME COLUMN payback_meses   TO payback_months;
ALTER TABLE public.process_scenarios RENAME COLUMN horas_liberadas TO hours_freed;
ALTER TABLE public.process_scenarios RENAME COLUMN investimento    TO investment;

CREATE INDEX IF NOT EXISTS idx_process_scenarios_process_snapshot
  ON public.process_scenarios (process_id, snapshot_at DESC);