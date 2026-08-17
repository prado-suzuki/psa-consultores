-- Vincular processos a estrutura_equipes (Equipe Fiscal, Equipe Fixos, Equipe Pontuais, etc.)
-- catalog_clients continua existindo como fallback/legado.

ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS equipe_id uuid REFERENCES public.estrutura_equipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processes_equipe ON public.processes(equipe_id);

-- ============================================================
-- Backfill: deduzir equipe pelo nome do catalog_client
-- Regras (case-insensitive, com unaccent quando disponível):
--   - se nome do catalog_client é igual ao da equipe, casa
--   - se nome do catalog_client está contido no nome da equipe (ex: "Fiscal" ⊂ "Equipe Fiscal"), casa
--   - prefere a equipe is_active=true
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  WITH match AS (
    SELECT
      p.id AS process_id,
      eq.id AS equipe_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.id
        ORDER BY
          CASE WHEN lower(cc.name) = lower(eq.name) THEN 0 ELSE 1 END,
          eq.is_active DESC,
          eq.created_at
      ) AS rk
    FROM public.processes p
    JOIN public.catalog_clients cc ON cc.id = p.client_id
    JOIN public.estrutura_equipes eq ON
      lower(eq.name) = lower(cc.name)
      OR lower(eq.name) LIKE '%' || lower(cc.name) || '%'
    WHERE p.equipe_id IS NULL
  )
  UPDATE public.processes p
     SET equipe_id = m.equipe_id
    FROM match m
   WHERE p.id = m.process_id
     AND m.rk = 1;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfill processes.equipe_id: % linhas atualizadas', v_count;
END $$;

COMMENT ON COLUMN public.processes.equipe_id IS 'FK opcional para estrutura_equipes. Quando preenchido, prevalece sobre catalog_clients para exibição e agrupamento no mapeamento.';
