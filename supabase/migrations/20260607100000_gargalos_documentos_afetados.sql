-- ============================================================================
-- 20260607100000_gargalos_documentos_afetados.sql
-- ----------------------------------------------------------------------------
-- Refatora a área de Cascata para ser derivada de gargalos em vez de ser
-- cadastrada manualmente. Modelo novo:
--
--   gargalos
--     └── gargalo_documentos_afetados (M:N, nova)
--            ↓ (cascata derivada em tempo real, sem persistência)
--          etapa_documentos.sentido='entrada' → process_stages →
--             etapa_documentos.sentido='saida' → ... (BFS jusante)
--
-- Operações:
--   1. DROP cascata_evento_etapas (M:N legado)
--   2. DROP cascata_eventos (entidade legada)
--   3. CREATE gargalo_documentos_afetados (M:N nova)
--
-- Tudo em uma transação. Compatível com o estado atual: as tabelas
-- cascata_* foram populadas pela migração v5 (5 eventos OSG) mas não são
-- mais utilizadas; ao dropar, perde-se o conteúdo (cascatas serão
-- derivadas em tempo real a partir dos novos vínculos gargalo↔documento).
-- ============================================================================

BEGIN;

-- ─── 1. DROP das tabelas legadas ─────────────────────────────────────────
-- A ordem importa: a M:N depende da entidade pai via FK composta.
DROP TABLE IF EXISTS public.cascata_evento_etapas CASCADE;
DROP TABLE IF EXISTS public.cascata_eventos       CASCADE;


-- ─── 2. CREATE gargalo_documentos_afetados ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.gargalo_documentos_afetados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id    uuid NOT NULL REFERENCES public.gargalos(id) ON DELETE CASCADE,
  documento_id  uuid NOT NULL REFERENCES public.documentos_processo(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gargalo_documentos_afetados_uniq UNIQUE (gargalo_id, documento_id)
);

CREATE INDEX IF NOT EXISTS idx_gda_gargalo_id   ON public.gargalo_documentos_afetados (gargalo_id);
CREATE INDEX IF NOT EXISTS idx_gda_documento_id ON public.gargalo_documentos_afetados (documento_id);


-- ─── 3. RLS (segue padrão das outras junções MAPA) ──────────────────────
ALTER TABLE public.gargalo_documentos_afetados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_documentos_afetados'
      AND policyname = 'Team members can read gargalo_documentos_afetados'
  ) THEN
    CREATE POLICY "Team members can read gargalo_documentos_afetados"
      ON public.gargalo_documentos_afetados
      FOR SELECT
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_documentos_afetados'
      AND policyname = 'Team members can write gargalo_documentos_afetados'
  ) THEN
    CREATE POLICY "Team members can write gargalo_documentos_afetados"
      ON public.gargalo_documentos_afetados
      FOR ALL
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

COMMIT;
