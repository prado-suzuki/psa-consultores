-- ============================================================================
-- 20260607100000_gargalo_etapas.sql
-- ----------------------------------------------------------------------------
-- Refatora a área de Cascata para ser derivada a partir de gargalos vinculados
-- a etapas-origem (onde o gargalo se manifesta).
--
-- Modelo:
--   gargalos
--     └── gargalo_etapas (NOVA M:N, FK composta etapa_id+scenario)
--            ↓
--          BFS jusante em tempo real:
--          etapa-origem → docs_saida → etapas que consomem → docs_saida → ...
--
-- Por que etapa (e não documento):
--   • A pergunta natural ao cadastrar gargalo é "ONDE ele acontece?" — resposta
--     é uma etapa específica (P1.02 etapa 1: "Receber matrícula nova"), não
--     um documento solto entre 78.
--   • Cascata derivada é mais precisa: a etapa já conhece docsSaida no
--     mapeamento existente.
--   • Combo hierárquico Projeto→Processo→Etapa = 3 cliques, viável.
--
-- Operações:
--   1. DROP cascata_evento_etapas + cascata_eventos (entidades antigas, manuais)
--   2. CREATE gargalo_etapas (M:N com FK composta) + índices + RLS
--
-- Tudo em uma transação. gargalo_documentos_afetados NÃO existe no banco
-- ainda (essa migração foi planejada anteriormente mas não aplicada) — por
-- isso aqui não há DROP dela.
-- ============================================================================

BEGIN;

-- ─── 1. DROP das tabelas legadas de cascata ─────────────────────────────
-- A ordem importa: a M:N depende da entidade pai via FK composta.
DROP TABLE IF EXISTS public.cascata_evento_etapas CASCADE;
DROP TABLE IF EXISTS public.cascata_eventos       CASCADE;


-- ─── 2. CREATE gargalo_etapas ───────────────────────────────────────────
-- M:N gargalo × (etapa, scenario). A FK composta espelha o padrão das
-- outras junções de etapa (etapa_responsaveis, etapa_documentos,
-- etapa_sistemas) que apontam para process_stages(id, scenario).
CREATE TABLE IF NOT EXISTS public.gargalo_etapas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id  uuid NOT NULL REFERENCES public.gargalos(id) ON DELETE CASCADE,
  etapa_id    uuid NOT NULL,
  scenario    text NOT NULL DEFAULT 'AS-IS' CHECK (scenario IN ('AS-IS','TO-BE')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gargalo_etapas_uniq UNIQUE (gargalo_id, etapa_id, scenario),
  CONSTRAINT gargalo_etapas_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gargalo_etapas_gargalo_id ON public.gargalo_etapas (gargalo_id);
CREATE INDEX IF NOT EXISTS idx_gargalo_etapas_etapa_id   ON public.gargalo_etapas (etapa_id, scenario);


-- ─── 3. RLS (mesmo padrão das outras junções MAPA) ─────────────────────
ALTER TABLE public.gargalo_etapas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_etapas'
      AND policyname = 'Team members can read gargalo_etapas'
  ) THEN
    CREATE POLICY "Team members can read gargalo_etapas"
      ON public.gargalo_etapas
      FOR SELECT
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_etapas'
      AND policyname = 'Team members can write gargalo_etapas'
  ) THEN
    CREATE POLICY "Team members can write gargalo_etapas"
      ON public.gargalo_etapas
      FOR ALL
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

COMMIT;
