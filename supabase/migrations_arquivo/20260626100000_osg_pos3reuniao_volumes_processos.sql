-- ============================================================================
-- OSG — Validação da 3ª reunião (24/06/2026): volumes, renomeações, novos
-- processos, projeto P7 e remoção do Termo de Encerramento de Safra.
-- Modelo de VOLUME: roiCalculator.execucoesAnuais() usa processes.volume_executions
-- (frequency = fallback legado, NÃO tocado). Base = 15 clientes/ano.
-- Onde o volume passou a contar OCORRÊNCIAS (>1 por cliente) e as horas estavam no
-- grão de PROJETO (lote), as horas AS-IS são divididas por ocorrências/cliente
-- (= volume/15) para não duplicar no ROI (AC÷3, Acompanhamento÷2, Solicitações÷2).
-- Escopo: SOMENTE cluster OSG. Estado lido via PostgREST antes de escrever.
-- ============================================================================
BEGIN;

DO $$ DECLARE v_osg uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80'; n int;
BEGIN
  SELECT count(*) INTO n FROM public.processes WHERE cluster_id = v_osg;
  IF n <> 34 THEN RAISE EXCEPTION 'esperados 34 processos OSG, há %', n; END IF;
  PERFORM 1 FROM public.processes WHERE id = 'd9421c10-4c8b-8837-425b-90da8d88ce25';
  IF NOT FOUND THEN RAISE EXCEPTION 'Termo de Encerramento de Safra (d9421c10) não encontrado — migração já aplicada?'; END IF;
  PERFORM 1 FROM public.projects WHERE name = 'P7 - Diagnóstico Societário';
  IF FOUND THEN RAISE EXCEPTION 'Projeto P7 - Diagnóstico Societário já existe — migração já aplicada?'; END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1) VOLUME ANUAL (volume_executions) — substitui o 20 uniforme pelos validados
-- ----------------------------------------------------------------------------
UPDATE public.processes SET volume_executions = 30 WHERE id IN (
  'd5c9a838-22e9-94a9-d8e1-e9cce98ae842',  -- Solicitações Preliminares (2×/cliente)
  'ce3214e0-ddc1-66f9-3f2b-f54add0fe183'); -- Acompanhamento (2×/cliente)

UPDATE public.processes SET volume_executions = 20 WHERE id IN (
  'eaa649b0-1c14-5f92-9ce3-d6fbf6919ad6',  -- Apresentação do Projeto
  '9048c799-f34b-78ad-e3ce-823eea3178c5',  -- Formalização do Projeto
  'ae36a9b8-960e-0655-e4e8-a15185d078ce',  -- Atualização do DP
  '2638b807-9cfd-5175-bef9-701e19e78974',  -- Constituição da Agro
  '0ace5fff-c744-5296-c35c-d0c2d873c269',  -- Holdings Individuais
  '868e75d7-af99-ece7-c557-f1027c424588',  -- Contrato de Parceria Rural
  'e298976c-5034-77c6-3a1d-f73cf79fdc66'); -- Contrato de Composse

UPDATE public.processes SET volume_executions = 15 WHERE id IN (
  '20d5e1d0-e5da-07aa-f503-8f0f022c9982',  -- Kickoff / Entrevista Preliminar
  'a07ef932-aee8-2c5c-2fca-85aa68b9d9f8',  -- Finalização do Projeto
  '6e6ee166-8b5d-0168-9462-5f31b1074b20',  -- DP Inicial
  '588f3ee5-da46-489f-e45f-e43ca1d55259',  -- Qualificação dos Sócios
  '2b7d33b1-90f3-405a-1353-5c941f1581d1',  -- Digitação de Matrícula
  '0c5ca100-0000-4000-8000-000000000035',  -- Planilha de Capital Social
  'b8cd587a-4ec9-6e74-f8f9-73ce231954ce',  -- Constituição da Participações
  '322b69fc-32ac-b2c1-7084-94f55ea0c439',  -- Planejamento Tributário Rural
  '9a83e7fc-2564-319a-9424-9046aaed30a7',  -- AC Imóvel Adicional (2º momento)
  '5a9dffed-914c-4da8-f660-85a70e31175a',  -- AC por Exigência Cartorial
  '4e29ae3f-af94-952a-0743-0dd762b72d27',  -- Planejamento Tributário ITCMD
  '0a17e100-0000-4000-8000-000000000036',  -- Apresentação Inicial (renomeada em §2)
  '95414b3b-b22b-3a46-dd02-53b7b8baca73'); -- Apresentação Final de Sucessão

UPDATE public.processes SET volume_executions = 10 WHERE id IN (
  '162627eb-3e4c-d982-608c-f01e2cadd92b',  -- Doação + AC Reflexo (unificado)
  'a5196eb0-bc12-d263-ef4d-bba7962ac49c',  -- Diagnóstico de Governança
  'c4130ee1-1d65-3092-6864-b0380b4b349f',  -- Acordo de Quotistas
  '2dde0a31-4f27-cf33-bb19-74667aab05e3',  -- Protocolo de Remuneração
  '5ee7da99-1d24-c022-ba62-a106c2f2fee6',  -- Matriz de Alçadas
  '590758aa-1e88-1f03-f7a7-087e76440d18',  -- Regimento Interno do Conselho
  '47cffb99-05c0-6389-2721-f393d4850d07'); -- AC Reflexo da Governança (Participações)

UPDATE public.processes SET volume_executions = 5 WHERE id IN (
  '11cc4b04-6a48-307a-c623-884bb918c0ab',  -- Distrato de Arrendamento Pré-existente
  '86ecb6b9-885d-ae64-07b4-4a09ea141c9f'); -- Testamento (alternativa à doação)

UPDATE public.processes SET volume_executions = 45 WHERE id = '60b9baad-5b1e-149c-14e4-ec42ba931f11'; -- AC de Integralização (3×/cliente)
UPDATE public.processes SET volume_executions = 3  WHERE id = '0d87379e-97cd-b793-4521-a76d232b412c'; -- Reorganização (P6)

-- ----------------------------------------------------------------------------
-- 2) RENOMEAÇÕES (mesmo id)
-- ----------------------------------------------------------------------------
UPDATE public.processes SET name = 'AC de Integralização, Concentração de Cotas e Ata nas controladas'
  WHERE id = '60b9baad-5b1e-149c-14e4-ec42ba931f11';
UPDATE public.processes SET name = 'Apresentação Inicial Tributário e Societário'
  WHERE id = '0a17e100-0000-4000-8000-000000000036';

-- ----------------------------------------------------------------------------
-- 3) AJUSTE LOTE -> OCORRÊNCIA nas HORAS (scenario AS-IS)
-- ----------------------------------------------------------------------------
-- AC de Integralização: 45 = 3×/cliente -> horas ÷ 3
UPDATE public.etapa_responsaveis SET horas = ROUND((horas / 3.0)::numeric, 2)
 WHERE scenario = 'AS-IS' AND etapa_id IN (
  '74530542-ae76-bf00-da11-fa77d51c1acc','07de0298-c758-2119-d9ff-5b39ddf5d26a',
  '09d230dc-2196-7adf-1c13-6c0c7fa4d1bc','3c7b402f-9a3a-47da-a689-06fdce33d3f4',
  '49ad70e0-1cc1-1f68-9a8c-66d914743b32','a0cbb457-9bf8-eb3e-e6bf-e69d9d4b72b8');

-- Acompanhamento: 30 = 2×/cliente -> horas ÷ 2
UPDATE public.etapa_responsaveis SET horas = ROUND((horas / 2.0)::numeric, 2)
 WHERE scenario = 'AS-IS' AND etapa_id IN (
  '08a4fba8-858c-7045-abba-b227493cf337','6decf1a9-8726-f4ca-cfba-f765395ead2b',
  '88a9bffa-a635-4764-34aa-6253d5f0b1ec','7210eaec-d610-375c-1617-690b98df017d');

-- Solicitações Preliminares: 30 = 2×/cliente -> horas ÷ 2
UPDATE public.etapa_responsaveis SET horas = ROUND((horas / 2.0)::numeric, 2)
 WHERE scenario = 'AS-IS' AND etapa_id IN (
  'ec50e16d-f17c-14f7-eeb5-3a8b75fb7529','7d614937-bbb5-82f8-f899-5cb2dffe2d3b',
  'fb03f16a-4730-6afd-14ce-4a212199a212');

-- ----------------------------------------------------------------------------
-- 4) REORDENAÇÃO (P1 e P2) para a ordem validada — bump temporário p/ evitar colisão
-- ----------------------------------------------------------------------------
UPDATE public.processes SET order_index = order_index + 1000
  WHERE project_id IN ('a406e6bc-9a51-a0f7-daf7-eede537dd4b9','70c8b198-ff14-400a-a78f-659c41897a17');

-- P1 - Gestão (slots 1 e 2 ficam p/ os novos do §5)
UPDATE public.processes SET order_index = 0 WHERE id = 'd5c9a838-22e9-94a9-d8e1-e9cce98ae842';
UPDATE public.processes SET order_index = 3 WHERE id = '20d5e1d0-e5da-07aa-f503-8f0f022c9982';
UPDATE public.processes SET order_index = 4 WHERE id = 'eaa649b0-1c14-5f92-9ce3-d6fbf6919ad6';
UPDATE public.processes SET order_index = 5 WHERE id = '9048c799-f34b-78ad-e3ce-823eea3178c5';
UPDATE public.processes SET order_index = 6 WHERE id = 'ce3214e0-ddc1-66f9-3f2b-f54add0fe183';
UPDATE public.processes SET order_index = 7 WHERE id = 'a07ef932-aee8-2c5c-2fca-85aa68b9d9f8';

-- P2 - Contratos (slots 2,10,15 ficam p/ os novos do §5)
UPDATE public.processes SET order_index = 0  WHERE id = '6e6ee166-8b5d-0168-9462-5f31b1074b20';
UPDATE public.processes SET order_index = 1  WHERE id = '588f3ee5-da46-489f-e45f-e43ca1d55259';
UPDATE public.processes SET order_index = 3  WHERE id = '2b7d33b1-90f3-405a-1353-5c941f1581d1';
UPDATE public.processes SET order_index = 4  WHERE id = '0c5ca100-0000-4000-8000-000000000035';
UPDATE public.processes SET order_index = 5  WHERE id = 'ae36a9b8-960e-0655-e4e8-a15185d078ce';
UPDATE public.processes SET order_index = 6  WHERE id = '2638b807-9cfd-5175-bef9-701e19e78974';
UPDATE public.processes SET order_index = 7  WHERE id = '11cc4b04-6a48-307a-c623-884bb918c0ab';
UPDATE public.processes SET order_index = 8  WHERE id = 'e298976c-5034-77c6-3a1d-f73cf79fdc66';
UPDATE public.processes SET order_index = 9  WHERE id = '868e75d7-af99-ece7-c557-f1027c424588';
UPDATE public.processes SET order_index = 11 WHERE id = 'b8cd587a-4ec9-6e74-f8f9-73ce231954ce';
UPDATE public.processes SET order_index = 12 WHERE id = '0ace5fff-c744-5296-c35c-d0c2d873c269';
UPDATE public.processes SET order_index = 13 WHERE id = '322b69fc-32ac-b2c1-7084-94f55ea0c439';
UPDATE public.processes SET order_index = 14 WHERE id = '9a83e7fc-2564-319a-9424-9046aaed30a7';
UPDATE public.processes SET order_index = 16 WHERE id = '60b9baad-5b1e-149c-14e4-ec42ba931f11';
UPDATE public.processes SET order_index = 17 WHERE id = '5a9dffed-914c-4da8-f660-85a70e31175a';
-- (Termo de Encerramento de Safra é removido no §7 — sem order_index)

-- ----------------------------------------------------------------------------
-- 5) NOVOS PROCESSOS (criados na reunião; ainda SEM etapas/documentos)
-- ----------------------------------------------------------------------------
INSERT INTO public.processes (id, code, name, project_id, cluster_id, stage, priority, frequency, volume_executions, evaluation_period_days, order_index) VALUES
  (gen_random_uuid(), 'PROC-GERAL-037', 'Relatório de documentos pendentes',          'a406e6bc-9a51-a0f7-daf7-eede537dd4b9', '0523512c-f980-4236-8a7c-53e06c9c7a80', 'discovery', 'medium', 'Quinzenal', 15, 30, 1),
  (gen_random_uuid(), 'PROC-GERAL-038', 'Documentos complementares',                   'a406e6bc-9a51-a0f7-daf7-eede537dd4b9', '0523512c-f980-4236-8a7c-53e06c9c7a80', 'discovery', 'medium', 'Quinzenal', 15, 30, 2),
  (gen_random_uuid(), 'PROC-GERAL-039', 'Regularização da situação Matrimonial',       '70c8b198-ff14-400a-a78f-659c41897a17', '0523512c-f980-4236-8a7c-53e06c9c7a80', 'discovery', 'medium', 'Quinzenal', 15, 30, 2),
  (gen_random_uuid(), 'PROC-GERAL-040', 'Estruturação de Cisão, incorporação e fusão', '70c8b198-ff14-400a-a78f-659c41897a17', '0523512c-f980-4236-8a7c-53e06c9c7a80', 'discovery', 'medium', 'Trimestral', 5, 30, 10),
  (gen_random_uuid(), 'PROC-GERAL-041', 'Revisão da Parceria e da Composse',           '70c8b198-ff14-400a-a78f-659c41897a17', '0523512c-f980-4236-8a7c-53e06c9c7a80', 'discovery', 'medium', 'Quinzenal', 20, 30, 15);

-- ----------------------------------------------------------------------------
-- 6) NOVO PROJETO P7 - Diagnóstico Societário (incompleto: sem processos ainda)
-- ----------------------------------------------------------------------------
INSERT INTO public.projects (id, name, area, status, cluster_id)
VALUES (gen_random_uuid(), 'P7 - Diagnóstico Societário', 'OSG', 'Mapeamento', '0523512c-f980-4236-8a7c-53e06c9c7a80');

-- ----------------------------------------------------------------------------
-- 7) REMOÇÃO do Termo de Encerramento de Safra (sai do P2 — a PSA só envia o modelo;
--    a contabilidade do cliente é quem executa). Apaga filhos antes do processo.
-- ----------------------------------------------------------------------------
DELETE FROM public.etapa_responsaveis WHERE etapa_id IN (SELECT id FROM public.process_stages WHERE process_id = 'd9421c10-4c8b-8837-425b-90da8d88ce25');
DELETE FROM public.etapa_documentos   WHERE etapa_id IN (SELECT id FROM public.process_stages WHERE process_id = 'd9421c10-4c8b-8837-425b-90da8d88ce25');
DELETE FROM public.process_stages WHERE process_id = 'd9421c10-4c8b-8837-425b-90da8d88ce25';
DELETE FROM public.processes      WHERE id = 'd9421c10-4c8b-8837-425b-90da8d88ce25';

COMMIT;
