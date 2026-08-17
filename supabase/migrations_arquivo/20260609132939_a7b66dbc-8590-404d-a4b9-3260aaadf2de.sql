BEGIN;

UPDATE public.etapa_responsaveis
SET horas = 0.25
WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af'
  AND scenario = 'AS-IS'
  AND horas = 120;

UPDATE public.etapa_responsaveis
SET horas = 0.125
WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af'
  AND scenario = 'TO-BE'
  AND horas = 60;

UPDATE public.processes
SET frequency = 'Mensal', updated_at = NOW()
WHERE id = 'c7db1b56-22cc-4c8d-b36a-b280f8944172'
  AND frequency = 'Diária';

DO $v$
DECLARE
  v_bi int;
  v_fisc int;
BEGIN
  SELECT count(*) INTO v_bi FROM public.etapa_responsaveis
    WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af' AND horas >= 10;
  SELECT count(*) INTO v_fisc FROM public.processes
    WHERE id = 'c7db1b56-22cc-4c8d-b36a-b280f8944172' AND frequency = 'Diária';
  IF v_bi > 0 THEN RAISE EXCEPTION 'BI-002 Monitoramento ainda com %h em etapa_responsaveis', v_bi; END IF;
  IF v_fisc > 0 THEN RAISE EXCEPTION 'FISCAL-008 ainda como Diária'; END IF;
END $v$;

COMMIT;