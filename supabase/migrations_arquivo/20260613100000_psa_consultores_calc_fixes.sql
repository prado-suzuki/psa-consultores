-- ============================================================================
-- 20260613100000_psa_consultores_calc_fixes.sql · Fix de cálculo ROI inflado
-- ----------------------------------------------------------------------------
-- Investigação revelou DOIS bugs no calcularRoi do Dashboard (custo de pessoas
-- inflado em ~7x):
--
-- 1. PROC-BI-002 etapa "Monitoramento e Ajuste de Carga": etapa_responsaveis.horas
--    populado como 120h por execução (com Coordenador R$110/h, frequency=Semanal
--    → 120 × 52 = 6266h/ano = R$ 689.260/ano só nessa etapa).
--    Causa: meu parseHoras na migração 20260610100000 interpretou
--    `time_current = "15 minutos/dia"` como "15 unidades × 8h (dia)" = 120h.
--    Bug do regex: /dia/ matchou antes de /min/, multiplicou por 8.
--    Valor correto: 15 minutos = 0.25h por execução.
--
-- 2. PROC-FISCAL-008 (Planejamento Tributário): frequency='Diária' (importado do
--    JSON original do Digital Rotina). Planejamento Tributário é por projeto/cliente,
--    não diário. Com Diária × 8h/exec × 252 = 2.016h/ano. Correto: Mensal.
--
-- Impacto: AS-IS PSA passa de R$ 962k → ~R$ 122k pessoas/ano no cálculo ao vivo.
-- O snapshot consolidado (R$ 752k) escala o breakdown coerentemente.
-- ============================================================================

BEGIN;

-- 1a. Corrigir horas AS-IS da etapa Monitoramento do PROC-BI-002
UPDATE public.etapa_responsaveis
SET horas = 0.25
WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af'
  AND scenario = 'AS-IS'
  AND horas = 120;  -- guard p/ não tocar se já corrigido manualmente

-- 1b. Corrigir horas TO-BE da mesma etapa (era 60h por 50% reduction do 120)
UPDATE public.etapa_responsaveis
SET horas = 0.125
WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af'
  AND scenario = 'TO-BE'
  AND horas = 60;

-- 2. Corrigir frequency do PROC-FISCAL-008
UPDATE public.processes
SET frequency = 'Mensal', updated_at = NOW()
WHERE id = 'c7db1b56-22cc-4c8d-b36a-b280f8944172'
  AND frequency = 'Diária';

-- Validação
DO $v$
DECLARE
  v_bi int;
  v_fisc int;
BEGIN
  SELECT count(*) INTO v_bi FROM public.etapa_responsaveis
    WHERE etapa_id = '1f019621-2980-4240-8b0a-42061c4938af' AND horas >= 10;
  SELECT count(*) INTO v_fisc FROM public.processes
    WHERE id = 'c7db1b56-22cc-4c8d-b36a-b280f8944172' AND frequency = 'Diária';
  RAISE NOTICE 'Fix calc ROI: BI-002 horas inchadas=% (esperado 0), FISCAL-008 ainda Diária=% (esperado 0)', v_bi, v_fisc;
  IF v_bi > 0 THEN RAISE EXCEPTION 'BI-002 Monitoramento ainda com %h em etapa_responsaveis', v_bi; END IF;
  IF v_fisc > 0 THEN RAISE EXCEPTION 'FISCAL-008 ainda como Diária'; END IF;
END $v$;

COMMIT;
