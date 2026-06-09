-- ============================================================================
-- 20260613110000_psa_consultores_snapshot_recalc.sql · Recalcular 17 snapshots
-- ----------------------------------------------------------------------------
-- Os 17 processos PSA sem ROI consolidado original tiveram snapshots inferidos
-- com proxy fixo (16h × R$55 × 12 = R$10.560/ano) na migração 20260611. Esse
-- proxy ficou inflado pra processos que têm 1-2h/exec (PROC-GER-* quebras).
-- Aqui recalculamos com base nas horas reais das etapas + responsável real +
-- frequency. Os 10 do ROI consolidado (do PDF IAplicada) NÃO são tocados.
-- ============================================================================
BEGIN;

UPDATE public.process_scenarios SET annual_cost=10560, annual_hours=192, annual_savings=8976, hours_freed=163.2, investment=2692.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='ec58feca-8367-409f-8cd6-b880644896b6' AND name='Snapshot ROI MAPA — PROC-GER-938';
UPDATE public.process_scenarios SET annual_cost=7500, annual_hours=96, annual_savings=4125, hours_freed=52.8, investment=1237.5, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='c7db1b56-22cc-4c8d-b36a-b280f8944172' AND name='Snapshot ROI MAPA — PROC-FISCAL-008';
UPDATE public.process_scenarios SET annual_cost=2860, annual_hours=52, annual_savings=2288, hours_freed=41.6, investment=686.4, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='fc0233c3-08b5-4428-be6f-332634cc9c24' AND name='Snapshot ROI MAPA — PROC-GER-719';
UPDATE public.process_scenarios SET annual_cost=2640, annual_hours=48, annual_savings=792, hours_freed=14.4, investment=237.6, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='bfd4a06a-de80-4fbe-9955-a877a551a3dc' AND name='Snapshot ROI MAPA — PROC-TRA-001';
UPDATE public.process_scenarios SET annual_cost=2640, annual_hours=48, annual_savings=792, hours_freed=14.4, investment=237.6, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='48d2e792-3fd2-41c1-a357-582a553d38d9' AND name='Snapshot ROI MAPA — PROC-BI-001';
UPDATE public.process_scenarios SET annual_cost=2640, annual_hours=48, annual_savings=792, hours_freed=14.4, investment=237.6, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='fd3d188d-1582-4d1d-96a2-7a73fd04de3d' AND name='Snapshot ROI MAPA — PROC-001';
UPDATE public.process_scenarios SET annual_cost=2640, annual_hours=48, annual_savings=792, hours_freed=14.4, investment=237.6, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='5c2c1c02-e51e-4790-b251-15f2306ca545' AND name='Snapshot ROI MAPA — PROC-GER-221';
UPDATE public.process_scenarios SET annual_cost=2400, annual_hours=24, annual_savings=1320, hours_freed=13.2, investment=396, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='6a4c1a83-bfde-464e-a355-0308c8317bb1' AND name='Snapshot ROI MAPA — PROC-GER-704';
UPDATE public.process_scenarios SET annual_cost=2400, annual_hours=24, annual_savings=1320, hours_freed=13.2, investment=396, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='72564838-3c39-4fc2-90f8-f046c33a259b' AND name='Snapshot ROI MAPA — PROC-GER-279';
UPDATE public.process_scenarios SET annual_cost=1680, annual_hours=24, annual_savings=924, hours_freed=13.2, investment=277.2, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='8895f320-b43d-4be4-8cd3-a844b8ec5531' AND name='Snapshot ROI MAPA — PROC-GER-603';
UPDATE public.process_scenarios SET annual_cost=1680, annual_hours=24, annual_savings=924, hours_freed=13.2, investment=277.2, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='2e4a32eb-299b-4a16-8715-c25aadab0e38' AND name='Snapshot ROI MAPA — PROC-GER-167';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='6e19cf21-4bf4-401c-85bd-1cd336c91702' AND name='Snapshot ROI MAPA — PROC-GER-294';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='cd6b15c3-9898-4a93-82a7-2c17a831703c' AND name='Snapshot ROI MAPA — PROC-GER-030';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='a257db7d-12ff-4344-8bb6-ccc2c7dfb610' AND name='Snapshot ROI MAPA — PROC-GER-350';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='d814a6d7-5b6d-41c0-bd64-8af78f187775' AND name='Snapshot ROI MAPA — PROC-GER-249';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='2b57fa7e-a953-4afc-b1b8-176333abe08e' AND name='Snapshot ROI MAPA — PROC-GER-002';
UPDATE public.process_scenarios SET annual_cost=1320, annual_hours=24, annual_savings=1056, hours_freed=19.2, investment=316.8, roi_percent=233.33, payback_months=3.6, updated_at=NOW() WHERE process_id='5a81e296-b93e-4162-97f3-260f6524fa6d' AND name='Snapshot ROI MAPA — PROC-GER-313';

-- Validação
DO $v$
DECLARE v_total numeric;
BEGIN
  SELECT sum(annual_cost) INTO v_total FROM public.process_scenarios
    WHERE name LIKE 'Snapshot ROI MAPA — %' AND process_id IN (
      SELECT id FROM public.processes WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3');
  RAISE NOTICE 'PSA Consultores snapshot total annual_cost: R$ %', v_total;
END $v$;
COMMIT;
