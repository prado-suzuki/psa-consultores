-- =====================================================================
-- supabase_integration_migration.sql
-- Migração MAPA → PSA Consultores (Supabase / PostgreSQL).
-- Versão 7.0 — 2026-06-02
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1.1 projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cluster_id        uuid     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS projetos_por_ano  integer  DEFAULT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_cluster_id_fk') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_cluster_id ON public.projects (cluster_id);

-- 1.2 processes
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS projeto_id           uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cluster_id           uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ordem                integer       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entregavel           text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_avaliacao     text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS horas_treinamento    numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mapeado_em           timestamptz   DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='processes_projeto_id_fk') THEN
    ALTER TABLE public.processes
      ADD CONSTRAINT processes_projeto_id_fk
      FOREIGN KEY (projeto_id) REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='processes_cluster_id_fk') THEN
    ALTER TABLE public.processes
      ADD CONSTRAINT processes_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_processes_projeto_id ON public.processes (projeto_id);
CREATE INDEX IF NOT EXISTS idx_processes_cluster_id ON public.processes (cluster_id);

-- 1.3 process_stages
ALTER TABLE public.process_stages
  ADD COLUMN IF NOT EXISTS processo_id           uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cenario               text          NOT NULL DEFAULT 'AS-IS',
  ADD COLUMN IF NOT EXISTS etapa_as_is_id        uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS execucao              text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_time_dias        numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS volume_por_processo   numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS taxa_erros            numeric(7,4)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS taxa_retrabalho       numeric(7,4)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custo_erro            numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS volume_erros          numeric(12,2) DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_stages_cenario_check') THEN
    ALTER TABLE public.process_stages
      ADD CONSTRAINT process_stages_cenario_check CHECK (cenario IN ('AS-IS','TO-BE'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_stages_id_cenario_key') THEN
    ALTER TABLE public.process_stages
      ADD CONSTRAINT process_stages_id_cenario_key UNIQUE (id, cenario);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_stages_etapa_as_is_fk') THEN
    ALTER TABLE public.process_stages
      ADD CONSTRAINT process_stages_etapa_as_is_fk
      FOREIGN KEY (etapa_as_is_id) REFERENCES public.process_stages(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_stages_processo_id_fk') THEN
    ALTER TABLE public.process_stages
      ADD CONSTRAINT process_stages_processo_id_fk
      FOREIGN KEY (processo_id) REFERENCES public.processes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_process_stages_cenario        ON public.process_stages (cenario);
CREATE INDEX IF NOT EXISTS idx_process_stages_etapa_as_is_id ON public.process_stages (etapa_as_is_id);
CREATE INDEX IF NOT EXISTS idx_process_stages_processo_id    ON public.process_stages (processo_id);

-- 1.4 process_improvements
ALTER TABLE public.process_improvements
  ADD COLUMN IF NOT EXISTS cluster_id           uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_melhoria      text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS horas_treinamento    numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custo_externo_unico  numeric(12,2) DEFAULT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_improvements_cluster_id_fk') THEN
    ALTER TABLE public.process_improvements
      ADD CONSTRAINT process_improvements_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_process_improvements_cluster_id ON public.process_improvements (cluster_id);

-- 1.5 job_roles
ALTER TABLE public.job_roles
  ADD COLUMN IF NOT EXISTS cluster_id  uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS categoria   text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo        text DEFAULT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='job_roles_cluster_id_fk') THEN
    ALTER TABLE public.job_roles
      ADD CONSTRAINT job_roles_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_roles_cluster_id ON public.job_roles (cluster_id);

-- 1.6 process_scenarios
ALTER TABLE public.process_scenarios
  ADD COLUMN IF NOT EXISTS processo_id      uuid          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS snapshot_em      timestamptz   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custo_anual      numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_anual      numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS economia_anual   numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roi_percentual   numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payback_meses    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_liberadas  numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investimento     numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criado_por       uuid          DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='process_scenarios_processo_id_fk') THEN
    ALTER TABLE public.process_scenarios
      ADD CONSTRAINT process_scenarios_processo_id_fk
      FOREIGN KEY (processo_id) REFERENCES public.processes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_process_scenarios_proc_em
  ON public.process_scenarios (processo_id, snapshot_em DESC);

-- 2. CREATEs
CREATE TABLE IF NOT EXISTS public.projeto_justificativas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  justificativa  text NOT NULL CHECK (justificativa IN (
    'Economia / Eficiência','Automação','Qualidade','Comunicação','Compliance'
  )),
  ordem          integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, justificativa)
);
CREATE INDEX IF NOT EXISTS idx_proj_just_projeto_id ON public.projeto_justificativas (projeto_id);

CREATE TABLE IF NOT EXISTS public.documentos_processo (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text NOT NULL,
  tipo               text,
  categoria          text,
  formato            text,
  origem             text,
  tempo_minutos      numeric(10,2),
  estrutura_entrada  text,
  estruturado        text,
  canonico_id        uuid REFERENCES public.documentos_processo(id) ON DELETE SET NULL,
  cluster_id         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docproc_canonico_id ON public.documentos_processo (canonico_id);
CREATE INDEX IF NOT EXISTS idx_docproc_cluster_id  ON public.documentos_processo (cluster_id);

CREATE TABLE IF NOT EXISTS public.sistemas_processo (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                     text NOT NULL,
  descricao                text,
  tipo                     text,
  origem                   text,
  cluster_id               uuid,
  custo_licenca_mensal     numeric(12,2) DEFAULT 0,
  custo_variavel_por_uso   numeric(12,2) DEFAULT 0,
  custo_por_operacao       numeric(12,2) DEFAULT 0,
  custo_setup              numeric(12,2) DEFAULT 0,
  tipo_custo               text,
  obs_licenca              text,
  obs_variavel             text,
  obs_custo_por_operacao   text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sistemas_processo_cluster_id ON public.sistemas_processo (cluster_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sistemas_processo_cluster_id_fk') THEN
    ALTER TABLE public.sistemas_processo
      ADD CONSTRAINT sistemas_processo_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.etapa_responsaveis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id        uuid NOT NULL,
  cenario         text NOT NULL DEFAULT 'AS-IS' CHECK (cenario IN ('AS-IS','TO-BE')),
  responsavel_id  uuid NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
  papel           text NOT NULL CHECK (papel IN ('executado','aprovado')),
  horas           numeric(10,2) DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT etapa_responsaveis_uniq UNIQUE (etapa_id, cenario, responsavel_id, papel),
  CONSTRAINT etapa_responsaveis_etapa_fk
    FOREIGN KEY (etapa_id, cenario)
    REFERENCES public.process_stages(id, cenario) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_etapa_resp_etapa_id       ON public.etapa_responsaveis (etapa_id, cenario);
CREATE INDEX IF NOT EXISTS idx_etapa_resp_responsavel_id ON public.etapa_responsaveis (responsavel_id);

CREATE TABLE IF NOT EXISTS public.etapa_sistemas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id    uuid NOT NULL,
  cenario     text NOT NULL DEFAULT 'AS-IS' CHECK (cenario IN ('AS-IS','TO-BE')),
  sistema_id  uuid NOT NULL REFERENCES public.sistemas_processo(id) ON DELETE CASCADE,
  rateio      numeric(7,2) DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT etapa_sistemas_uniq UNIQUE (etapa_id, cenario, sistema_id),
  CONSTRAINT etapa_sistemas_etapa_fk
    FOREIGN KEY (etapa_id, cenario)
    REFERENCES public.process_stages(id, cenario) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_etapa_sis_etapa_id   ON public.etapa_sistemas (etapa_id, cenario);
CREATE INDEX IF NOT EXISTS idx_etapa_sis_sistema_id ON public.etapa_sistemas (sistema_id);

CREATE TABLE IF NOT EXISTS public.etapa_documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id      uuid NOT NULL,
  cenario       text NOT NULL DEFAULT 'AS-IS' CHECK (cenario IN ('AS-IS','TO-BE')),
  documento_id  uuid NOT NULL REFERENCES public.documentos_processo(id) ON DELETE CASCADE,
  sentido       text NOT NULL CHECK (sentido IN ('entrada','saida')),
  volume        numeric(12,2) DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT etapa_documentos_uniq UNIQUE (etapa_id, cenario, documento_id, sentido),
  CONSTRAINT etapa_documentos_etapa_fk
    FOREIGN KEY (etapa_id, cenario)
    REFERENCES public.process_stages(id, cenario) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_etapa_doc_etapa_id     ON public.etapa_documentos (etapa_id, cenario);
CREATE INDEX IF NOT EXISTS idx_etapa_doc_documento_id ON public.etapa_documentos (documento_id);

CREATE TABLE IF NOT EXISTS public.gargalos (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                          text NOT NULL,
  descricao                     text,
  origem                        text,
  cluster_id                    uuid,
  melhoria_id                   uuid REFERENCES public.process_improvements(id) ON DELETE SET NULL,
  horas_gastas                  numeric(12,2) DEFAULT 0,
  horas_implementacao           numeric(12,2) DEFAULT 0,
  taxa_ocorrencia               numeric(7,4)  DEFAULT 0,
  taxa_captura_apos_melhoria    numeric(7,4)  DEFAULT 0,
  custo_externo_unico           numeric(12,2) DEFAULT 0,
  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gargalos_melhoria_id ON public.gargalos (melhoria_id);
CREATE INDEX IF NOT EXISTS idx_gargalos_cluster_id  ON public.gargalos (cluster_id);

CREATE TABLE IF NOT EXISTS public.gargalo_processos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id  uuid NOT NULL REFERENCES public.gargalos(id)   ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES public.processes(id)  ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gargalo_id, processo_id)
);
CREATE INDEX IF NOT EXISTS idx_garg_proc_processo_id ON public.gargalo_processos (processo_id);

CREATE TABLE IF NOT EXISTS public.gargalo_responsaveis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id      uuid NOT NULL REFERENCES public.gargalos(id)  ON DELETE CASCADE,
  responsavel_id  uuid NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
  horas           numeric(10,2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gargalo_id, responsavel_id)
);

CREATE TABLE IF NOT EXISTS public.documento_horas_historico (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  documento_id    uuid NOT NULL REFERENCES public.documentos_processo(id) ON DELETE CASCADE,
  horas_antes     numeric(10,2),
  horas_depois    numeric(10,2),
  alterado_por    uuid,
  registrado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dochist_documento_id ON public.documento_horas_historico (documento_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS public.cascata_eventos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                text NOT NULL,
  descricao           text,
  processo_raiz_id    uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  cluster_id          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cascata_eventos_processo_raiz_id ON public.cascata_eventos (processo_raiz_id);
CREATE INDEX IF NOT EXISTS idx_cascata_eventos_cluster_id       ON public.cascata_eventos (cluster_id);

CREATE TABLE IF NOT EXISTS public.cascata_evento_etapas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   uuid NOT NULL REFERENCES public.cascata_eventos(id) ON DELETE CASCADE,
  etapa_id    uuid NOT NULL,
  cenario     text NOT NULL DEFAULT 'AS-IS' CHECK (cenario IN ('AS-IS','TO-BE')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT casc_evt_etp_uniq UNIQUE (evento_id, etapa_id, cenario),
  CONSTRAINT casc_evt_etp_etapa_fk
    FOREIGN KEY (etapa_id, cenario)
    REFERENCES public.process_stages(id, cenario) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_casc_evt_etp_evento_id ON public.cascata_evento_etapas (evento_id);

CREATE TABLE IF NOT EXISTS public.sistema_clusters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id  uuid NOT NULL REFERENCES public.sistemas_processo(id) ON DELETE CASCADE,
  cluster_id  uuid NOT NULL,
  rateio      numeric(7,2) DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sistema_id, cluster_id)
);
CREATE INDEX IF NOT EXISTS idx_sistema_clusters_cluster_id ON public.sistema_clusters (cluster_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint
                      WHERE conname='sistema_clusters_cluster_id_fk') THEN
    ALTER TABLE public.sistema_clusters
      ADD CONSTRAINT sistema_clusters_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sistema_responsaveis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id      uuid NOT NULL REFERENCES public.sistemas_processo(id) ON DELETE CASCADE,
  responsavel_id  uuid NOT NULL REFERENCES public.job_roles(id)         ON DELETE CASCADE,
  horas           numeric(10,2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sistema_id, responsavel_id)
);

CREATE TABLE IF NOT EXISTS public.melhoria_processos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  melhoria_id     uuid NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  processo_id     uuid NOT NULL REFERENCES public.processes(id)             ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (melhoria_id, processo_id)
);
CREATE INDEX IF NOT EXISTS idx_mel_proc_processo_id ON public.melhoria_processos (processo_id);

CREATE TABLE IF NOT EXISTS public.melhoria_sistemas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  melhoria_id     uuid NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  sistema_id      uuid NOT NULL REFERENCES public.sistemas_processo(id)    ON DELETE CASCADE,
  rateio          numeric(7,2) DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (melhoria_id, sistema_id)
);

CREATE TABLE IF NOT EXISTS public.melhoria_responsaveis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  melhoria_id     uuid NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  responsavel_id  uuid NOT NULL REFERENCES public.job_roles(id)            ON DELETE CASCADE,
  papel           text NOT NULL DEFAULT 'executor' CHECK (papel IN ('executor','treinando')),
  horas           numeric(10,2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (melhoria_id, responsavel_id, papel)
);
CREATE INDEX IF NOT EXISTS idx_mel_resp_responsavel_id ON public.melhoria_responsaveis (responsavel_id);

CREATE TABLE IF NOT EXISTS public.melhoria_acoes_td (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  melhoria_id     uuid NOT NULL REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  acao_td         text NOT NULL CHECK (acao_td IN (
    'Mapear AS-IS','Padronizar','Documentar','Automatizar','Redesenhar TO-BE','Treinar'
  )),
  ordem           integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (melhoria_id, acao_td)
);
CREATE INDEX IF NOT EXISTS idx_mel_acao_melhoria_id ON public.melhoria_acoes_td (melhoria_id);

-- 3. TRIGGERS
CREATE OR REPLACE FUNCTION public.process_stages_cascade_as_is_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cenario = 'AS-IS' THEN
    DELETE FROM public.process_stages
     WHERE cenario = 'TO-BE'
       AND etapa_as_is_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_stages_as_is_cascade ON public.process_stages;
CREATE TRIGGER trg_process_stages_as_is_cascade
AFTER DELETE ON public.process_stages
FOR EACH ROW
EXECUTE FUNCTION public.process_stages_cascade_as_is_delete();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'documentos_processo',
      'sistemas_processo',
      'gargalos',
      'cascata_eventos'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
       CREATE TRIGGER trg_%1$s_updated_at
       BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t
    );
  END LOOP;
END $$;

COMMIT;