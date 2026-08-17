-- ============================================================
-- PSA Consultores — Recalc de snapshots com base em PDFs
-- ============================================================
--
-- Contexto: A migration 20260613110000_psa_consultores_snapshot_recalc.sql
-- inferiu snapshots sintéticos (ROI 233,33% uniforme) para 17 processos sem
-- PDF detalhado. Dois desses processos (PROC-001 Quebra SPEDs e PROC-TRA-001
-- Onboarding) ganharam PDF individual depois — então o snapshot sintético
-- agora destoa do dashboard PSA Consultores no Lovable.
--
-- Esta migration corrige APENAS os snapshots que o MAPA criou
-- (name LIKE 'Snapshot ROI MAPA — %'). Não toca em dados Digital Rotina.
--
-- Fontes:
--   PDF 1.7 — psa_01_07_quebra_obrigacoes_acessorias_speds_excel_proc_001_roi.pdf
--   PDF 3.1 — psa_03_01_onboarding_novos_clientes_documentos_proc_tra_001_roi.pdf
-- ============================================================

-- PROC-001 — Quebra de Obrigações Acessórias (SPEDs) em Excel
-- PDF 1.7: ROI 592%, payback 3.0m, economia líquida R$ 1.776/mês
--   3 FTEs × 35h = 105h/mês → 1.260h/ano
--   Mão obra liberada R$ 1.943/mês (55% redução) + Erros R$ 134/mês (85%)
--   Licença R$ 300/mês × 12 = TCO R$ 3.600
--   Custo atual estimado: pessoas R$ 42.387/ano + erros R$ 1.890/ano = R$ 44.277
--   Economia anual = R$ 21.312 (1.776 × 12)
--   Horas liberadas = 693 (55% × 1.260)
UPDATE process_scenarios ps
SET annual_cost     = 44277,
    annual_hours    = 1260,
    annual_savings  = 21312,
    investment      = 3600,
    roi_percent     = 592,
    payback_months  = 3.0,
    hours_freed     = 693,
    snapshot_at     = NOW(),
    updated_at      = NOW()
FROM processes p
WHERE ps.process_id = p.id
  AND p.code = 'PROC-001'
  AND ps.name = 'Snapshot ROI MAPA — PROC-001';

-- PROC-TRA-001 — Onboarding de Novos Clientes e Solicitação de Documentos
-- PDF 3.1: ROI 766%, payback 2.0m, economia líquida R$ 2.299/mês
--   4 FTEs × 40h = 160h/mês → 1.920h/ano
--   Mão obra liberada R$ 2.421/mês (45% redução) + Erros R$ 178/mês (60%)
--   Licença R$ 300/mês × 12 = TCO R$ 3.600
--   Custo atual estimado: pessoas R$ 64.560/ano + erros R$ 3.560/ano = R$ 68.120
--   Economia anual = R$ 27.588 (2.299 × 12)
--   Horas liberadas = 864 (45% × 1.920)
UPDATE process_scenarios ps
SET annual_cost     = 68120,
    annual_hours    = 1920,
    annual_savings  = 27588,
    investment      = 3600,
    roi_percent     = 766,
    payback_months  = 2.0,
    hours_freed     = 864,
    snapshot_at     = NOW(),
    updated_at      = NOW()
FROM processes p
WHERE ps.process_id = p.id
  AND p.code = 'PROC-TRA-001'
  AND ps.name = 'Snapshot ROI MAPA — PROC-TRA-001';

-- Validação: confirma que ambos os UPDATE pegaram exatamente 1 linha cada.
DO $$
DECLARE
  n_proc001 int;
  n_proctra int;
BEGIN
  SELECT COUNT(*) INTO n_proc001
  FROM process_scenarios ps
  JOIN processes p ON p.id = ps.process_id
  WHERE p.code = 'PROC-001'
    AND ps.name = 'Snapshot ROI MAPA — PROC-001'
    AND ps.roi_percent = 592;
  SELECT COUNT(*) INTO n_proctra
  FROM process_scenarios ps
  JOIN processes p ON p.id = ps.process_id
  WHERE p.code = 'PROC-TRA-001'
    AND ps.name = 'Snapshot ROI MAPA — PROC-TRA-001'
    AND ps.roi_percent = 766;
  IF n_proc001 <> 1 THEN
    RAISE EXCEPTION 'PROC-001 esperava 1 snapshot atualizado, obteve %', n_proc001;
  END IF;
  IF n_proctra <> 1 THEN
    RAISE EXCEPTION 'PROC-TRA-001 esperava 1 snapshot atualizado, obteve %', n_proctra;
  END IF;
END$$;
