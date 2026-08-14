-- PSA Consultores MAPA — Fix rework_rate: valores foram inseridos em % (0-100)
-- mas o banco espera fração (0-1). Divide por 100 em todos os stages PSA.

BEGIN;

UPDATE public.process_stages
SET
  rework_rate = rework_rate / 100.0,
  updated_at  = NOW()
WHERE rework_rate IS NOT NULL
  AND rework_rate > 1.0   -- só corrige quem claramente está em %
  AND process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  );

-- Validação
DO $$
DECLARE v numeric;
BEGIN
  SELECT max(rework_rate) INTO v
  FROM public.process_stages
  WHERE process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  );
  IF v IS NOT NULL AND v > 1.0 THEN
    RAISE EXCEPTION 'rework_rate ainda acima de 1 após fix: max = %', v;
  END IF;
END $$;

COMMIT;
