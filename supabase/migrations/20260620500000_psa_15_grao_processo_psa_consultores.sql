-- ============================================================================
-- PSA 15 — Grão PROCESSO de gargalos — backfill cluster PSA Consultores
-- ============================================================================
-- Cluster PSA Consultores = b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3.
-- Estado verificado no banco (token, 2026): a migração 20260617100000 JÁ FOI
-- aplicada — o cluster PSA tem 17 processos, 68 gargalo_etapas, 29 melhoria_processos,
-- mas gargalo_processos = 0. Como o app MAPA passou a ler o grão no PROCESSO,
-- os gargalos do PSA precisam de gargalo_processos.
--   • melhoria_processos: já tem 29 (vínculo DIRETO ao processo) — nada a fazer.
--   • gargalo_processos: VAZIO → backfill de gargalo_etapas→processo (Parte A).
-- Modelo SEM gargalo_melhorias: a relação gargalo↔melhoria é só por associação ao
-- processo (ambos no mesmo processo). Por isso NÃO derivamos melhoria_processos de
-- gargalo_melhorias — melhoria↔processo é vínculo direto.
-- As tabelas já existem (20260602190000_mapa_integration) — sem CREATE TABLE.
-- Idempotente (ON CONFLICT DO NOTHING). Só INSERT, nunca apaga. Escopo: só PSA.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: gargalo_etapas do PSA já existem (20260617100000 aplicada)
DO $$ BEGIN
  IF (SELECT count(*) FROM public.gargalo_etapas ge
        JOIN public.gargalos gg ON gg.id = ge.gargalo_id
       WHERE gg.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid) = 0 THEN
    RAISE EXCEPTION 'Pré-condição falhou: nenhum gargalo_etapas no cluster PSA Consultores.';
  END IF;
END $$;

-- Parte A — gargalo_processos ← gargalo_etapas (rollup distinct gargalo→processo)
INSERT INTO public.gargalo_processos (gargalo_id, processo_id)
SELECT DISTINCT ge.gargalo_id, ps.process_id
FROM public.gargalo_etapas ge
JOIN public.process_stages ps ON ps.id = ge.etapa_id
JOIN public.gargalos gg ON gg.id = ge.gargalo_id
WHERE gg.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  AND ps.process_id IS NOT NULL
ON CONFLICT (gargalo_id, processo_id) DO NOTHING;

-- (sem Parte B: melhoria↔processo é vínculo direto; não derivamos de gargalo_melhorias)

-- Verificação
DO $$ DECLARE v_g int; v_gt int; v_m int; v_mt int; BEGIN
  SELECT count(*) INTO v_gt FROM public.gargalos WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;
  SELECT count(DISTINCT gp.gargalo_id) INTO v_g
    FROM public.gargalo_processos gp
    JOIN public.gargalos gg ON gg.id=gp.gargalo_id AND gg.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;
  SELECT count(*) INTO v_mt FROM public.process_improvements WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;
  SELECT count(DISTINCT mp.melhoria_id) INTO v_m
    FROM public.melhoria_processos mp
    JOIN public.process_improvements mi ON mi.id=mp.melhoria_id AND mi.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;
  RAISE NOTICE 'PSA Consultores grão-processo — gargalos c/ processo: %/% | melhorias c/ processo: %/%.', v_g, v_gt, v_m, v_mt;
  IF v_g = 0 THEN RAISE EXCEPTION 'gargalo_processos PSA: backfill não populou nenhum gargalo.'; END IF;
END $$;

COMMIT;
