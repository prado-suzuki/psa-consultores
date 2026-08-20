-- ============================================================================
-- PSA 12 — Fusão P2.04 (AC Integralização Agro) + P2.05 (AC Cessão de Cotas)
-- A equipe confirmou: é UMA única alteração contratual que faz as duas coisas
-- (integraliza na Agro + concentra as quotas na Participações). Logo, vira 1 processo.
-- Sobrevivente: P2.04 (60b9baad-...). Excluído: P2.05 (7dd2233e-...).
-- Cluster OSG: 33 -> 32 processos. ROI já aplicado; horas da cessão (2h) são
-- absorvidas na etapa de elaboração do sobrevivente (4h -> 5h). order_index renumerado.
-- DESTRUTIVO (DELETE), porém em transação única (tudo-ou-nada) + verificação.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: ambos os processos existem no cluster OSG
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE id='60b9baad-5b1e-149c-14e4-ec42ba931f11' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80')
   OR NOT EXISTS (SELECT 1 FROM public.processes WHERE id='7dd2233e-34fa-6355-9fd8-927dde0ee74e' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80') THEN
    RAISE EXCEPTION 'Pré-condição falhou: P2.04 e/ou P2.05 não encontrados no cluster OSG.';
  END IF;
END $$;

-- 1) Renomear o processo sobrevivente (P2.04) e a etapa de elaboração
UPDATE public.processes
   SET name='AC de Integralização e Concentração de Cotas', updated_at=now()
 WHERE id='60b9baad-5b1e-149c-14e4-ec42ba931f11' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80';

UPDATE public.process_stages
   SET name='Elaborar minuta AC (cláusula 5ª integralização + cláusula 7ª cessão)', updated_at=now()
 WHERE id='07de0298-c758-2119-d9ff-5b39ddf5d26a' AND scenario='AS-IS';

-- Absorver a hora da cessão (P2.05 E2 = 2h) na elaboração do sobrevivente: 4h -> 5h
UPDATE public.etapa_responsaveis
   SET horas=5
 WHERE etapa_id='07de0298-c758-2119-d9ff-5b39ddf5d26a' AND scenario='AS-IS';

-- 2) Excluir a P2.05 e TODOS os dependentes (ordem FK-safe: filhos -> etapas -> processo)
--    Etapas da P2.05: 7e2f1d4a, fc724ba8, 10cf1332, b251e89b, 1b3cfd9a
DELETE FROM public.melhoria_processos  WHERE processo_id='7dd2233e-34fa-6355-9fd8-927dde0ee74e';
DELETE FROM public.etapa_responsaveis  WHERE etapa_id IN ('7e2f1d4a-c3e9-0f86-7251-e2763fcf061e','fc724ba8-1e0f-58de-10e5-67f6bbc05920','10cf1332-7996-1391-4fc7-33e5b64d29fe','b251e89b-519a-5998-caa3-df54406332cd','1b3cfd9a-eff8-0038-b370-b09c7a459c39');
DELETE FROM public.etapa_documentos    WHERE etapa_id IN ('7e2f1d4a-c3e9-0f86-7251-e2763fcf061e','fc724ba8-1e0f-58de-10e5-67f6bbc05920','10cf1332-7996-1391-4fc7-33e5b64d29fe','b251e89b-519a-5998-caa3-df54406332cd','1b3cfd9a-eff8-0038-b370-b09c7a459c39');
DELETE FROM public.etapa_sistemas      WHERE etapa_id IN ('7e2f1d4a-c3e9-0f86-7251-e2763fcf061e','fc724ba8-1e0f-58de-10e5-67f6bbc05920','10cf1332-7996-1391-4fc7-33e5b64d29fe','b251e89b-519a-5998-caa3-df54406332cd','1b3cfd9a-eff8-0038-b370-b09c7a459c39');
DELETE FROM public.gargalo_etapas      WHERE etapa_id IN ('7e2f1d4a-c3e9-0f86-7251-e2763fcf061e','fc724ba8-1e0f-58de-10e5-67f6bbc05920','10cf1332-7996-1391-4fc7-33e5b64d29fe','b251e89b-519a-5998-caa3-df54406332cd','1b3cfd9a-eff8-0038-b370-b09c7a459c39');
DELETE FROM public.process_improvements WHERE process_id='7dd2233e-34fa-6355-9fd8-927dde0ee74e';
DELETE FROM public.process_stages      WHERE process_id='7dd2233e-34fa-6355-9fd8-927dde0ee74e';
DELETE FROM public.processes           WHERE id='7dd2233e-34fa-6355-9fd8-927dde0ee74e' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80';

-- 2.1) Renumerar order_index do projeto P1 - Contratos (fecha o buraco deixado pela P2.05, order_index=6)
UPDATE public.processes
   SET order_index = order_index - 1, updated_at=now()
 WHERE cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80'
   AND project_id='70c8b198-ff14-400a-a78f-659c41897a17'
   AND order_index > 6;

-- 3) Verificação pós-fusão
DO $$ DECLARE v_proc int; v_etp int; BEGIN
  SELECT count(*) INTO v_proc FROM public.processes WHERE cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80';
  SELECT count(*) INTO v_etp  FROM public.process_stages WHERE process_id='7dd2233e-34fa-6355-9fd8-927dde0ee74e';
  IF v_etp <> 0 THEN RAISE EXCEPTION 'Falha: etapas da P2.05 ainda existem (%).', v_etp; END IF;
  IF v_proc <> 32 THEN RAISE EXCEPTION 'Falha: esperado 32 processos OSG, encontrado %.', v_proc; END IF;
  RAISE NOTICE 'Fusão P2.04+P2.05 OK — cluster OSG agora com % processos.', v_proc;
END $$;

COMMIT;
