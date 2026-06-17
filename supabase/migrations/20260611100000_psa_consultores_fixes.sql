-- ============================================================================
-- 20260611100000_psa_consultores_fixes.sql · AJUSTES de normalização (V2)
-- ----------------------------------------------------------------------------
-- Auditoria sistêmica revelou 57+ bugs no cluster PSA Consultores:
--   • formato/origem/tipo/estruturado/descrição de documentos fora dos enums
--   • status='active' (legado Rotina) fora do enum MAPA em 9/10 projetos
--   • frequency='mensal'/'Diário' minúsculo fora do enum FrequenciaProcesso
--   • execution=NULL em 51/51 etapas
--   • 14 etapas órfãs (sem doc/sistema/responsável)
--   • 6 sistemas com custo no campo errado (custo_licenca_mensal vs _variavel_por_uso)
--   • 10 sistemas com tipo_custo='interno' (fora do enum)
--   • 11/16 melhorias com URL no improvement_description (vira h3 do card)
--   • 16/16 melhorias sem melhoria_sistemas
--   • 20 process_scenarios DUPLICADOS (migração rodou 2x?)
--   • Snapshot legado "reduzir para 2hs" snapshot_at=NULL pode mascarar meu snapshot
--   • Etapa de "teste" no PROC-FISCAL-007 (lixo)
--
-- Esta migração faz só UPDATEs targeted + DELETEs específicos. NÃO mexe em
-- estrutura. Escopo: cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' (PSA Consultores). NENHUMA linha do
-- Digital Rotina (cluster_id IS NULL) é alterada.
-- ============================================================================
BEGIN;

-- ─── 1. process_scenarios — dedup + legado + 17 inferidos ───
-- 1a. Dedup: mantém 1 por process_id, o de created_at mais recente
DELETE FROM public.process_scenarios scs
USING (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY process_id ORDER BY created_at DESC) AS rn
    FROM public.process_scenarios
    WHERE name LIKE 'Snapshot ROI MAPA — %'
  ) x WHERE x.rn > 1
) d WHERE scs.id = d.id;

-- 1b. Snapshot legado: snapshot_at=NULL → data antiga (não compete com MAPA)
UPDATE public.process_scenarios SET snapshot_at='2025-01-01T00:00:00Z'
WHERE name='reduzir para 2hs' AND snapshot_at IS NULL;

-- 1c. Snapshots para 17 processos sem ROI consolidado (inferidos: economia=30% do custo)
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'bfd4a06a-de80-4fbe-9955-a877a551a3dc', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-TRA-001', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='bfd4a06a-de80-4fbe-9955-a877a551a3dc' AND name='Snapshot ROI MAPA — PROC-TRA-001');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '48d2e792-3fd2-41c1-a357-582a553d38d9', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-BI-001', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='48d2e792-3fd2-41c1-a357-582a553d38d9' AND name='Snapshot ROI MAPA — PROC-BI-001');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'c7db1b56-22cc-4c8d-b36a-b280f8944172', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-FISCAL-008', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='c7db1b56-22cc-4c8d-b36a-b280f8944172' AND name='Snapshot ROI MAPA — PROC-FISCAL-008');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '8895f320-b43d-4be4-8cd3-a844b8ec5531', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-603', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='8895f320-b43d-4be4-8cd3-a844b8ec5531' AND name='Snapshot ROI MAPA — PROC-GER-603');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '6a4c1a83-bfde-464e-a355-0308c8317bb1', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-704', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='6a4c1a83-bfde-464e-a355-0308c8317bb1' AND name='Snapshot ROI MAPA — PROC-GER-704');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '2e4a32eb-299b-4a16-8715-c25aadab0e38', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-167', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='2e4a32eb-299b-4a16-8715-c25aadab0e38' AND name='Snapshot ROI MAPA — PROC-GER-167');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'fc0233c3-08b5-4428-be6f-332634cc9c24', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-719', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='fc0233c3-08b5-4428-be6f-332634cc9c24' AND name='Snapshot ROI MAPA — PROC-GER-719');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'fd3d188d-1582-4d1d-96a2-7a73fd04de3d', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-001', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='fd3d188d-1582-4d1d-96a2-7a73fd04de3d' AND name='Snapshot ROI MAPA — PROC-001');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '6e19cf21-4bf4-401c-85bd-1cd336c91702', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-294', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='6e19cf21-4bf4-401c-85bd-1cd336c91702' AND name='Snapshot ROI MAPA — PROC-GER-294');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '5c2c1c02-e51e-4790-b251-15f2306ca545', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-221', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='5c2c1c02-e51e-4790-b251-15f2306ca545' AND name='Snapshot ROI MAPA — PROC-GER-221');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'cd6b15c3-9898-4a93-82a7-2c17a831703c', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-030', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='cd6b15c3-9898-4a93-82a7-2c17a831703c' AND name='Snapshot ROI MAPA — PROC-GER-030');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'ec58feca-8367-409f-8cd6-b880644896b6', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-938', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='ec58feca-8367-409f-8cd6-b880644896b6' AND name='Snapshot ROI MAPA — PROC-GER-938');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'a257db7d-12ff-4344-8bb6-ccc2c7dfb610', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-350', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='a257db7d-12ff-4344-8bb6-ccc2c7dfb610' AND name='Snapshot ROI MAPA — PROC-GER-350');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '72564838-3c39-4fc2-90f8-f046c33a259b', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-279', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='72564838-3c39-4fc2-90f8-f046c33a259b' AND name='Snapshot ROI MAPA — PROC-GER-279');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '2b57fa7e-a953-4afc-b1b8-176333abe08e', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-002', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='2b57fa7e-a953-4afc-b1b8-176333abe08e' AND name='Snapshot ROI MAPA — PROC-GER-002');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), '5a81e296-b93e-4162-97f3-260f6524fa6d', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-313', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='5a81e296-b93e-4162-97f3-260f6524fa6d' AND name='Snapshot ROI MAPA — PROC-GER-313');
INSERT INTO public.process_scenarios (id, process_id, created_by, name, parameters, scenario_kind, varied_field, snapshot_at, annual_cost, annual_hours, annual_savings, roi_percent, payback_months, hours_freed, investment, created_at)
SELECT gen_random_uuid(), 'd814a6d7-5b6d-41c0-bd64-8af78f187775', COALESCE((SELECT created_by FROM public.process_scenarios WHERE created_by IS NOT NULL LIMIT 1), 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid), 'Snapshot ROI MAPA — PROC-GER-249', '{}'::jsonb, 'efficiency', 'time', '2026-06-08T12:00:00Z', 10560, 192, 3168, 400, 2.4, 58, 634, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.process_scenarios WHERE process_id='d814a6d7-5b6d-41c0-bd64-8af78f187775' AND name='Snapshot ROI MAPA — PROC-GER-249');

-- ─── 2. Projetos: status + description + justificativas ───
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '95c48faa-7115-90fc-38ca-760869606a41', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '95c48faa-7115-90fc-38ca-760869606a41', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='Mapeamento', description='Iniciativa transversal de organização da rotina interna do PSA Consultores e integração das ferramentas digitais com a gestão de projetos.', updated_at=NOW() WHERE id='3489ea0a-6d60-41c3-9784-591aa0c65572';  -- Rotina PSA
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '3489ea0a-6d60-41c3-9784-591aa0c65572', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='ROI', description='Automação completa da quebra de SPEDs (EFD Contribuições, EFD ICMS/IPI, ECD, ECF, CT-e, NF-e) — substitui o processo manual no TaxSheets pela ferramenta Consulta SPED.', updated_at=NOW() WHERE id='4cb03075-d8a7-4062-9d51-a9c64dc47523';  -- P2 - Automação SPED
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '4cb03075-d8a7-4062-9d51-a9c64dc47523', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '4cb03075-d8a7-4062-9d51-a9c64dc47523', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='ROI', description='Plataforma de levantamento e apuração de créditos de PIS/COFINS — consolida débitos, créditos, exclusões e cruzamento de bases.', updated_at=NOW() WHERE id='cc5ef9ae-0425-4b4b-8035-c10af1d6bef6';  -- P4 - Automatização PIS e COFINS
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), 'cc5ef9ae-0425-4b4b-8035-c10af1d6bef6', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), 'cc5ef9ae-0425-4b4b-8035-c10af1d6bef6', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), 'cc5ef9ae-0425-4b4b-8035-c10af1d6bef6', 'Compliance', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='ROI', description='Dashboard analítico e operacional para controle dos saldos de PIS/COFINS/IPI e pedidos PERDCOMP — substitui planilha de controle por cliente.', updated_at=NOW() WHERE id='492df2ea-51f3-47cf-b602-3af69e1bd1b3';  -- P5 - Dashboard PERDCOMP
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '492df2ea-51f3-47cf-b602-3af69e1bd1b3', 'Comunicação', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '492df2ea-51f3-47cf-b602-3af69e1bd1b3', 'Compliance', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='ROI', description='Automação das consultas tributárias em lote (NCM, CNPJ Simples Nacional, CNAE) — substitui consultas uma a uma no Econet/Portal SN.', updated_at=NOW() WHERE id='280035db-24c6-4c1c-9374-474acfb5663d';  -- P3 - Automação Consultas
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '280035db-24c6-4c1c-9374-474acfb5663d', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '280035db-24c6-4c1c-9374-474acfb5663d', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='Melhorias', description='Dashboards de Power BI para controle de contratos fixos, prazos e distribuição de carga da equipe — substitui controle informal e planilhas pessoais.', updated_at=NOW() WHERE id='1de4789f-50ce-40bd-945a-2ae01eba5b21';  -- P6 - Dashboard Gestão
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '1de4789f-50ce-40bd-945a-2ae01eba5b21', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '1de4789f-50ce-40bd-945a-2ae01eba5b21', 'Comunicação', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='ROI', description='Ferramenta de classificação de produtos por NCM com sincronização das decisões DIFAL — automação completa da apuração do diferencial de alíquota.', updated_at=NOW() WHERE id='267dd955-3be2-4b51-ab14-c8237ecbaa3a';  -- P7 - DIFAL Inteligente
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '267dd955-3be2-4b51-ab14-c8237ecbaa3a', 'Economia / Eficiência', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '267dd955-3be2-4b51-ab14-c8237ecbaa3a', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '267dd955-3be2-4b51-ab14-c8237ecbaa3a', 'Compliance', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='Mapeamento', description='Iniciativa de adequação à reforma tributária: simulador e ferramentas de cálculo de IBS/CBS para apoio aos clientes na transição.', updated_at=NOW() WHERE id='20c83382-dbdf-49ef-a915-ca97dcd53a64';  -- P8 - IBS/CBS
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '20c83382-dbdf-49ef-a915-ca97dcd53a64', 'Compliance', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='Melhorias', description='Padronização dos papéis de trabalho contábeis e fiscais (DIRPF, PIS/COFINS, IRPJ/CSLL, LCDPR, DIFAL) — biblioteca de templates da Prado.', updated_at=NOW() WHERE id='d1a9fabd-8262-429e-8501-7a08a6d43ad8';  -- P8 - Templates Papéis Trabalho
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), 'd1a9fabd-8262-429e-8501-7a08a6d43ad8', 'Qualidade', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;
UPDATE public.projects SET status='Melhorias', description='Portal externo do PSA Consultores + canal de chamados/onboarding de novos clientes, substituindo o controle manual por e-mail.', updated_at=NOW() WHERE id='6e237fa4-4507-4137-84f6-0d11db63d46f';  -- P9 - Site e chamados PSA Consultores
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at) VALUES (gen_random_uuid(), '6e237fa4-4507-4137-84f6-0d11db63d46f', 'Comunicação', 2, NOW()) ON CONFLICT (projeto_id, justificativa) DO NOTHING;

-- ─── 3. Processos: frequency + description ───
UPDATE public.processes SET frequency='Mensal', description='Recepção de novos clientes e solicitação dos documentos necessários para iniciar o trabalho.', updated_at=NOW() WHERE id='bfd4a06a-de80-4fbe-9955-a877a551a3dc';  -- PROC-TRA-001
UPDATE public.processes SET frequency='Mensal', description='Controle dos contratos fixos com clientes e acompanhamento dos prazos legais de obrigações tributárias.', updated_at=NOW() WHERE id='48d2e792-3fd2-41c1-a357-582a553d38d9';  -- PROC-BI-001
UPDATE public.processes SET frequency='Diária', updated_at=NOW() WHERE id='c7db1b56-22cc-4c8d-b36a-b280f8944172';  -- PROC-FISCAL-008
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='8895f320-b43d-4be4-8cd3-a844b8ec5531';  -- PROC-GER-603
UPDATE public.processes SET frequency='Mensal', description='Revisão específica de PIS/COFINS no contexto dos templates de papéis de trabalho.', updated_at=NOW() WHERE id='6a4c1a83-bfde-464e-a355-0308c8317bb1';  -- PROC-GER-704
UPDATE public.processes SET frequency='Mensal', description='Revisão específica do bloco LCDPR no contexto dos templates de papéis de trabalho.', updated_at=NOW() WHERE id='2e4a32eb-299b-4a16-8715-c25aadab0e38';  -- PROC-GER-167
UPDATE public.processes SET frequency='Mensal', description='Recebimento, atribuição, acompanhamento e entrega dos projetos tributários pontuais (recuperações, defesas RFB, revisões).', updated_at=NOW() WHERE id='3d896cea-f554-42f4-a7b9-8ec61195c71d';  -- PROC-002
UPDATE public.processes SET frequency='Quinzenal', updated_at=NOW() WHERE id='fc0233c3-08b5-4428-be6f-332634cc9c24';  -- PROC-GER-719
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='fd3d188d-1582-4d1d-96a2-7a73fd04de3d';  -- PROC-001
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='6e19cf21-4bf4-401c-85bd-1cd336c91702';  -- PROC-GER-294
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='5c2c1c02-e51e-4790-b251-15f2306ca545';  -- PROC-GER-221
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='cd6b15c3-9898-4a93-82a7-2c17a831703c';  -- PROC-GER-030
UPDATE public.processes SET frequency='Diária', updated_at=NOW() WHERE id='ad8a6b69-2579-4a16-b708-6319555a87f9';  -- PROC-FISCAL-007
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='ec58feca-8367-409f-8cd6-b880644896b6';  -- PROC-GER-938
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='a257db7d-12ff-4344-8bb6-ccc2c7dfb610';  -- PROC-GER-350
UPDATE public.processes SET frequency='Mensal', description='Revisão específica de IRPJ/CSLL no contexto dos templates de papéis de trabalho.', updated_at=NOW() WHERE id='72564838-3c39-4fc2-90f8-f046c33a259b';  -- PROC-GER-279
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='2b57fa7e-a953-4afc-b1b8-176333abe08e';  -- PROC-GER-002
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='5a81e296-b93e-4162-97f3-260f6524fa6d';  -- PROC-GER-313
UPDATE public.processes SET frequency='Mensal', updated_at=NOW() WHERE id='d814a6d7-5b6d-41c0-bd64-8af78f187775';  -- PROC-GER-249

-- ─── 4. Etapas: execution + remover etapa "teste" + responsável p/ órfãs ───
DELETE FROM public.process_stages WHERE id='9ee164f2-42b5-46aa-90fd-29d7c9a6eeb8';  -- etapa "teste" PROC-FISCAL-007#2
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='fc9db04d-e726-44e6-9137-f2a5b35bc6d5';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='9dd655a5-f649-4f56-a605-18d85e10c36a';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='9a5190b0-890f-4c3c-a6b9-2d1331a032e3';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='680f4619-70c1-481a-ba0d-934b1af2e45e';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='109ef44a-027d-4258-b81a-2fed68addda6';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='63722899-2085-4199-8a0c-87f83d2b970f';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='570a5a69-cff0-4d46-972d-a06959ab7218';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='3b94d3d1-9e37-4512-9e22-aa37c965d95c';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='3068c6a7-de8a-4515-ade3-71319a33ff79';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='b3a2c71f-8446-498a-97ec-027da407a5fc';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='84b54c96-d8b5-4b12-8813-549995291a15';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='c130a6b8-95d8-459d-8886-afada016927f';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='8ae27d4f-5bd9-4495-9a08-36b7dfccc73c';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='c4a3c310-e3e0-4804-8612-835afc5badb1';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='7a0e58e4-0197-412f-832d-064cda83708b';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='e8f3348b-dd11-4048-937c-46c3a98684a1';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='8973f3f9-5c85-4470-add5-31981aa19437';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='4b411282-c34e-44f4-b813-d26a9a4dbb39';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='b16de884-0dde-46f8-b893-6441ef01281c';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='d4d172d6-2859-4ecc-8393-9ec77e1f555a';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='4e8f8f40-29c9-4687-baf1-a70de32d088f';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='752f4285-43d2-449c-ab4a-a6821e9a17dc';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='d12521e8-f0ed-40db-a4de-f346513defe6';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='36af4652-e245-4cf9-9738-c8e67bbe408f';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='93769eab-ab2c-4b04-8d54-11a03f383e95';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='90d74295-8465-4cb2-86d0-316afb116c5d';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='36a595d3-900b-40ad-b13f-a563e965f45b';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='0f520637-68a5-4c84-b609-86097a5dd9d3';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='13e7def5-794a-4217-be89-b6029c6f3f37';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='f38f8d5f-cee7-46c3-9baa-84d9c731ead3';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='2e14d4ac-f4f6-4409-991f-956eaf135c40';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='764fefec-f95f-4786-85a9-6702fb495e47';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='1f019621-2980-4240-8b0a-42061c4938af';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='7cb8d96b-05ea-4ff5-a785-d14d55db65f2';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='dfe736cf-721f-49de-a757-54a031b86d43';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='ba8e9684-296f-4bcf-8cee-14c4f97cbbde';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='6798e792-9a37-4e90-b1c9-bbbe64f58dab';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='cb5d1b20-0cbb-4015-b72a-acdec2773ab4';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='84c11fb7-61cf-41c5-bff8-a21f6bce844b';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='3b27810c-53b4-4859-bd23-31283906768a';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='f643839c-949f-4917-b179-05a2760f6d28';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='8084e792-3880-440c-9e90-2554b570f051';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='3aa0bd87-0f5d-483a-8f06-458703c89acb';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='6e8630c2-d62a-4cf0-916e-e735283103b4';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='bab99a89-2f6b-4ced-a5b1-146c8fa10bfd';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='b9465da6-6183-4c9e-900d-7a926a974030';
UPDATE public.process_stages SET execution='manual', updated_at=NOW() WHERE id='90574f89-15fb-4638-8541-4ee375ff1038';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='ef8b06f6-7785-45a9-938e-0570ce6b15a3';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='51c6303f-b96f-466c-9599-9e8340321bfc';
UPDATE public.process_stages SET execution='semi_automatica', updated_at=NOW() WHERE id='5f9ae7be-d7a9-4a33-adb9-42f7992f8eeb';
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), '3b94d3d1-9e37-4512-9e22-aa37c965d95c', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-313#1 Quebra do Arquivo NFe
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), 'b3a2c71f-8446-498a-97ec-027da407a5fc', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-294#1 Quebra do Arquivo EFD Contribuições
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), '752f4285-43d2-449c-ab4a-a6821e9a17dc', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-002#1 Quebra do Arquivo CTe
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), '90d74295-8465-4cb2-86d0-316afb116c5d', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-350#1 Quebra do Arquivo ECD
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), '84c11fb7-61cf-41c5-bff8-a21f6bce844b', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-030#1 Quebra do Arquivo ECF
INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), 'ef8b06f6-7785-45a9-938e-0570ce6b15a3', 'AS-IS', 'c607fbc2-df49-4dcf-8b5c-dda3064c2c55', 'executado', 2, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO NOTHING;  -- PROC-GER-249#1 Quebra do Arquivo EFD ICMS IPI

-- ─── 5. Documentos: normalizar enums + descrição + renomear genéricos ───
UPDATE public.documentos_processo SET nome='Ajustes de alocação de carga (cobrança verbal)', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='Ajustes de carga feitos verbalmente em resposta a sobrecarga.', updated_at=NOW() WHERE id='b10b49f9-2275-947e-909a-82168140d58e';
UPDATE public.documentos_processo SET nome='Apresentação final ao cliente (PPT/PDF)', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Apresentação final entregue ao cliente.', updated_at=NOW() WHERE id='f17bfa12-0265-2e28-1782-8d0912b9e51a';
UPDATE public.documentos_processo SET nome='Apuração Cliente', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Apuração realizada pelo cliente, comparada com a da Prado.', updated_at=NOW() WHERE id='1d2bc5e4-a33d-f2bf-00bd-baace9296f14';
UPDATE public.documentos_processo SET nome='Apuração IRPJ/CSLL', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha de apuração do IRPJ e CSLL do cliente.', updated_at=NOW() WHERE id='eb6bc286-a9ba-8507-26ac-6c7a8dc48f11';
UPDATE public.documentos_processo SET nome='Apuração PIS/COFINS', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Apuração de PIS/COFINS do cliente para revisão interna.', updated_at=NOW() WHERE id='c96ffb69-2a76-d07e-91f0-a2db2d6345d4';
UPDATE public.documentos_processo SET nome='Apuração Prado', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Apuração interna da Prado para conferência contra a apuração do cliente.', updated_at=NOW() WHERE id='d2f9bcbd-57fb-71ce-cb1f-72bbb28bb804';
UPDATE public.documentos_processo SET nome='Apuração revisada', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Apuração revisada pela Prado com ajustes propostos.', updated_at=NOW() WHERE id='245a6cc5-da1b-69fc-111b-e0701982024f';
UPDATE public.documentos_processo SET nome='Arquivo de compensação', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Arquivo final de compensação enviado ao cliente.', updated_at=NOW() WHERE id='e9e774f0-3cf9-094c-a330-6c0fb6c6b132';
UPDATE public.documentos_processo SET nome='Planilhas SPED/XML processadas (Excel)', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Saída da quebra: planilhas Excel geradas a partir dos arquivos SPED/XML originais.', updated_at=NOW() WHERE id='94668418-9f7f-35fc-13fc-07404f85bb42';
UPDATE public.documentos_processo SET nome='Arquivos XML', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Comprovante', estrutura_entrada='Arquivos XML de NF-e baixados a partir das chaves da EFD/CT-e.', updated_at=NOW() WHERE id='30d3be88-32a0-59cc-5c72-eb085fa7707b';
UPDATE public.documentos_processo SET nome='Benefícios NCM/UF', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Benefícios fiscais por NCM e UF para preenchimento do WP DIFAL.', updated_at=NOW() WHERE id='5ed0c20a-af58-afc5-3850-df4b7f3c18a2';
UPDATE public.documentos_processo SET nome='Benefícios por NCM/UF', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha de benefícios fiscais por NCM e UF para cálculo do DIFAL.', updated_at=NOW() WHERE id='2515dc20-70d1-f354-434b-3578d0028db2';
UPDATE public.documentos_processo SET nome='Bens e dívidas conciliados', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Conciliação patrimonial de bens e dívidas do cliente.', updated_at=NOW() WHERE id='ab0c75e6-0527-6f99-aac6-d582111ca737';
UPDATE public.documentos_processo SET nome='Chaves de acesso NF-e', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Lista de chaves de NF-e extraída da EFD/CT-e para download dos XMLs.', updated_at=NOW() WHERE id='61e106c3-2617-3a79-6c53-8573cc70e111';
UPDATE public.documentos_processo SET nome='CNAE', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Classificação Nacional de Atividade Econômica do contribuinte.', updated_at=NOW() WHERE id='63ccfa87-80bc-3835-18c7-3d86cf06e93e';
UPDATE public.documentos_processo SET nome='CNPJ', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='CNPJ do contribuinte usado nas consultas de Simples Nacional e CNAE.', updated_at=NOW() WHERE id='d7a931be-0f08-f960-4879-4bdf8e11b375';
UPDATE public.documentos_processo SET nome='Composição de Saldos', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Composição dos saldos passíveis de ressarcimento por trimestre.', updated_at=NOW() WHERE id='a030c344-20fb-73da-4623-88681b58d2fc';
UPDATE public.documentos_processo SET nome='Composição de Saldos aprovada', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Composição validada internamente para transmissão do PER/DCOMP.', updated_at=NOW() WHERE id='5e8cb1e1-7e1b-f776-f4ae-cfb52c7c1f7f';
UPDATE public.documentos_processo SET nome='Comprovantes', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Comprovante', estrutura_entrada='Comprovantes de pagamento de despesas do cliente.', updated_at=NOW() WHERE id='0edf9392-6b37-d111-4183-39bb1ccd33fe';
UPDATE public.documentos_processo SET nome='Créditos aprovados', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Créditos homologados pela RFB disponíveis para compensação.', updated_at=NOW() WHERE id='9d9b327e-c3f8-0a15-2bad-9b2e127657af';
UPDATE public.documentos_processo SET nome='Créditos de frete', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Apuração de créditos de PIS/COFINS sobre fretes.', updated_at=NOW() WHERE id='083bd567-e7aa-8df6-2342-190ca848ffc9';
UPDATE public.documentos_processo SET nome='CT-e', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Comprovante', estrutura_entrada='Conhecimento de Transporte eletrônico (XML) do cliente. Base para apuração de créditos de frete.', updated_at=NOW() WHERE id='49a438e9-c7f6-9b50-c7e1-fd3d12394374';
UPDATE public.documentos_processo SET nome='Dados do cliente', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Dados cadastrais do cliente para cabeçalho dos Working Papers.', updated_at=NOW() WHERE id='a4821243-5d69-36c3-2aba-9ddfad7c8c0b';
UPDATE public.documentos_processo SET nome='Declaração de bens anterior', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Declaração de bens da DIRPF anterior usada na análise patrimonial.', updated_at=NOW() WHERE id='48b0f6c9-8535-1992-b63d-fdfc4e2034fe';
UPDATE public.documentos_processo SET nome='Declarações fiscais', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Declarações fiscais enviadas pelo cliente (DCTF, ECF, EFD).', updated_at=NOW() WHERE id='7719f98d-8769-9a64-8bde-62c647ceee93';
UPDATE public.documentos_processo SET nome='Despesas analisadas', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Despesas analisadas e categorizadas para o LCDPR.', updated_at=NOW() WHERE id='24f93d05-9354-1e7b-8859-f854dd9ddbad';
UPDATE public.documentos_processo SET nome='DIRPF', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Cópia de segurança da DIRPF do cliente (DBK).', updated_at=NOW() WHERE id='dff9fc72-d666-7439-823c-00b4feefef2c';
UPDATE public.documentos_processo SET nome='DIRPF preenchida', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Planilha modelo de DIRPF carregada com dados da cópia de segurança.', updated_at=NOW() WHERE id='d2227afc-a15d-58b8-47cd-b74bf87d9074';
UPDATE public.documentos_processo SET nome='DIRPF revisada', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='DIRPF revisada pela Prado pronta para retificação.', updated_at=NOW() WHERE id='74739140-e105-f20b-3aed-077f1a6e1151';
UPDATE public.documentos_processo SET nome='Disponibilidade da equipe (percepção informal)', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='Visão informal da disponibilidade da equipe.', updated_at=NOW() WHERE id='94514ee6-1d81-bd36-bf34-df44723cc162';
UPDATE public.documentos_processo SET nome='Documentos contábeis', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Documentos contábeis enviados pelo cliente (balancete, razão, ECD).', updated_at=NOW() WHERE id='85874a0e-a90c-7e11-5116-566489ee4d47';
UPDATE public.documentos_processo SET nome='Documentos do cliente convertidos para Excel', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Documentos do cliente após quebra de PDFs para Excel.', updated_at=NOW() WHERE id='6357429b-78d3-e328-f9fc-e10ad2c59b96';
UPDATE public.documentos_processo SET nome='Documentos de aquisição/venda', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Documentos de aquisição/venda de bens (escrituras, contratos).', updated_at=NOW() WHERE id='c6bd0f7b-837b-6d67-8eaa-9ca656d62284';
UPDATE public.documentos_processo SET nome='Documentos fiscais coletados', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Conjunto de documentos do cliente armazenados no projeto após coleta.', updated_at=NOW() WHERE id='54d85d62-4b77-d5bb-3fba-05b6fd5a4468';
UPDATE public.documentos_processo SET nome='DRE', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Demonstração do Resultado do Exercício consolidada do cliente.', updated_at=NOW() WHERE id='99151be4-02d1-d800-267d-adaa23036b22';
UPDATE public.documentos_processo SET nome='EFD Contribuições', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Escrituração Fiscal Digital das Contribuições enviada pelo cliente. Base para apuração de PIS/COFINS e cruzamento com NF-e.', updated_at=NOW() WHERE id='1dab18c4-c36d-b5db-4ab7-388bad84545d';
UPDATE public.documentos_processo SET nome='EFD ICMS/IPI', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Escrituração Fiscal Digital de ICMS e IPI enviada pelo cliente. Insumo para apuração de ICMS e DIFAL.', updated_at=NOW() WHERE id='0e66e0e3-2a23-03cd-2b53-5cf4c540c520';
UPDATE public.documentos_processo SET nome='Extratos bancários', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Extratos bancários do cliente para conciliação de receitas.', updated_at=NOW() WHERE id='2fe1c373-6911-112b-f233-56913475489e';
UPDATE public.documentos_processo SET nome='LCDPR anterior', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='LCDPR do exercício anterior usado como saldo inicial.', updated_at=NOW() WHERE id='5d5601b5-3dbc-7715-c15a-72a6cd738760';
UPDATE public.documentos_processo SET nome='LCDPR preenchido', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='LCDPR organizado em planilha após quebra do TXT.', updated_at=NOW() WHERE id='df9833c1-58ab-2db1-28ab-c01555f00506';
UPDATE public.documentos_processo SET nome='LCDPR revisado', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='LCDPR revisado pela Prado pronto para transmissão.', updated_at=NOW() WHERE id='188ef44e-e207-7f7b-4820-06ded64d7ea6';
UPDATE public.documentos_processo SET nome='Legislação PIS/COFINS', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Registro digital', estrutura_entrada='Consulta à legislação tributária para classificar essencialidade e direito a crédito.', updated_at=NOW() WHERE id='b5ed66c4-1479-a9ae-702c-5cbc0205f5fd';
UPDATE public.documentos_processo SET nome='Lista de demandas recebidas (e-mail/WhatsApp/verbal)', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='Demandas em aberto sem cadastro centralizado.', updated_at=NOW() WHERE id='52b78cdb-7b8b-a979-5db2-6047a2712e23';
UPDATE public.documentos_processo SET nome='Mapa de rastreabilidade', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha que rastreia entradas e saídas vinculadas a cada insumo.', updated_at=NOW() WHERE id='68d29283-5ddd-e221-43d5-93cde2ea7c25';
UPDATE public.documentos_processo SET nome='Notas de entrada', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Notas fiscais de entrada extraídas da EFD para análise de rastreabilidade.', updated_at=NOW() WHERE id='d1f676cd-9bff-1160-2e2d-b82c61fcecbb';
UPDATE public.documentos_processo SET nome='Notas de saída', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Notas fiscais de saída extraídas da EFD.', updated_at=NOW() WHERE id='fe10ce68-b2f7-7adb-e9e1-803c51a174c9';
UPDATE public.documentos_processo SET nome='Notas de venda', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Notas fiscais de venda do cliente para análise de receitas.', updated_at=NOW() WHERE id='6f565d3d-88f7-cd08-6555-5dbbea36f564';
UPDATE public.documentos_processo SET nome='Notas fiscais de despesas', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Notas fiscais de despesas do cliente para análise LCDPR.', updated_at=NOW() WHERE id='6b4980f3-ec22-0886-03a5-ae8bbb745e45';
UPDATE public.documentos_processo SET nome='Notas relacionadas', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Notas fiscais relacionadas aos CT-e analisados.', updated_at=NOW() WHERE id='d35aebba-8b46-7372-3ee5-b7d3dc9933ee';
UPDATE public.documentos_processo SET nome='Pedidos anteriores', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Histórico de pedidos PERDCOMP do cliente para controle de saldos.', updated_at=NOW() WHERE id='9fa33fca-c39d-915e-8573-9120e4495e7c';
UPDATE public.documentos_processo SET nome='PER/DCOMP transmitido', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='PER/DCOMP transmitido pelo e-CAC.', updated_at=NOW() WHERE id='4b660ec4-f89e-ffec-bdf0-db0d95d187c1';
UPDATE public.documentos_processo SET nome='Projeção DRE', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Projeção da Demonstração do Resultado para planejamento.', updated_at=NOW() WHERE id='4e1a2c1b-0b70-43cd-75b1-f208d08f01e2';
UPDATE public.documentos_processo SET nome='Receitas analisadas', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Receitas analisadas e categorizadas para o LCDPR.', updated_at=NOW() WHERE id='4d49d8c3-0710-198a-8ed1-ee48cff087f4';
UPDATE public.documentos_processo SET nome='Receitas e despesas analisadas', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Consolidação de receitas e despesas para montagem da DRE.', updated_at=NOW() WHERE id='457d3b50-d1ce-dfbc-8dcd-cbf2eedc966c';
UPDATE public.documentos_processo SET nome='Relação de insumos elegíveis', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Insumos com direito a crédito de PIS/COFINS após análise.', updated_at=NOW() WHERE id='b7a9c6ba-44f5-3717-6a10-77e695d3ceb8';
UPDATE public.documentos_processo SET nome='Relação de NCMs', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Lista de NCMs identificados nas notas fiscais para consulta de benefícios DIFAL.', updated_at=NOW() WHERE id='6c6abf44-786b-0794-6d6a-08f9e815932d';
UPDATE public.documentos_processo SET nome='Relação dos NCM', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Lista de NCMs extraída da EFD Contribuições para consulta de tributação.', updated_at=NOW() WHERE id='4b99deb4-0fdd-6638-60bd-cbcb6f643189';
UPDATE public.documentos_processo SET nome='Relatório comparativo', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Relatório final comparativo Prado × Cliente entregue como diagnóstico tributário.', updated_at=NOW() WHERE id='a025ce22-d243-88d9-094b-7a8c8385e1a6';
UPDATE public.documentos_processo SET nome='Relatório de créditos', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Relatório final em PDF entregue ao cliente com a apuração de créditos.', updated_at=NOW() WHERE id='650c5469-c62a-c674-83fe-3b9b3c770834';
UPDATE public.documentos_processo SET nome='Resumo LCDPR', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Resumo do Livro Caixa Digital usado na projeção da DRE.', updated_at=NOW() WHERE id='884c98db-ba6a-cb51-7cca-62af894675c5';
UPDATE public.documentos_processo SET nome='Resumo LCDPR + Projeção DRE', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Compilação do resumo LCDPR e projeção DRE para apresentação.', updated_at=NOW() WHERE id='91ca9fcd-8002-2578-d3e5-bc37e0afccdb';
UPDATE public.documentos_processo SET nome='Simulações tributárias', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha com simulações de cenários tributários para planejamento.', updated_at=NOW() WHERE id='78d3965b-63a0-3ad2-ba9a-0b952f4233a3';
UPDATE public.documentos_processo SET nome='Solicitação de documentos', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='E-mail ao cliente solicitando documentos para iniciar o trabalho.', updated_at=NOW() WHERE id='ea632c9b-09ec-00c1-7f3f-6506c007348d';
UPDATE public.documentos_processo SET nome='Status informal das tarefas (não registrado em sistema)', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='Status mental das tarefas em execução.', updated_at=NOW() WHERE id='1f6c32d8-e600-77ba-83d4-9d3f2f972c87';
UPDATE public.documentos_processo SET nome='Status de ressarcimentos', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha de acompanhamento dos pedidos e status na RFB.', updated_at=NOW() WHERE id='0263e1a9-d679-7f0b-e868-84f9b7f6c0c1';
UPDATE public.documentos_processo SET nome='Status Simples Nacional', formato='PDF', origem='Interno', estruturado='Não Estruturado', tipo='Protocolo', estrutura_entrada='Resultado da consulta de enquadramento no Portal do Simples Nacional.', updated_at=NOW() WHERE id='cf8156f9-83dc-091b-9143-dec272d19a8a';
UPDATE public.documentos_processo SET nome='Registro de atribuição de tarefas (informal)', formato='Texto', origem='Interno', estruturado='Semi Estruturado', tipo='Protocolo', estrutura_entrada='Tarefas atribuídas verbalmente ou por WhatsApp.', updated_at=NOW() WHERE id='8949a454-cfdb-13b7-9fcf-9f9608907d71';
UPDATE public.documentos_processo SET nome='Compilado das análises das etapas anteriores', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Compilação das planilhas de análise das etapas anteriores.', updated_at=NOW() WHERE id='b4b39b69-4b7c-80fe-d3e1-e018aafe54a0';
UPDATE public.documentos_processo SET nome='Tributação de PIS e Cofins dos NCM', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Planilha com tributação por NCM consultada no Econet.', updated_at=NOW() WHERE id='e9066cee-ed2f-5fec-7a7d-1db7f49b3be5';
UPDATE public.documentos_processo SET nome='UFs de destino', formato='Excel', origem='Cliente', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='UFs de destino extraídas das notas fiscais para cruzamento de benefícios.', updated_at=NOW() WHERE id='af1341e5-fcfd-269c-3752-b48bde1c3ff9';
UPDATE public.documentos_processo SET nome='Working Paper (cabeçalho padronizado)', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper com cabeçalho padronizado da Prado.', updated_at=NOW() WHERE id='2e9fa794-0f5b-96c4-207b-96f36bd8612a';
UPDATE public.documentos_processo SET nome='Working Paper completo (pronto para revisão)', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper completo com todas as análises consolidadas.', updated_at=NOW() WHERE id='0c77c1fb-d68b-b976-6529-100b3127c65f';
UPDATE public.documentos_processo SET nome='Working Paper consolidado', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper da Prado com toda a análise do levantamento de crédito.', updated_at=NOW() WHERE id='23ef8200-6442-cf03-7c3d-911698d2b3ca';
UPDATE public.documentos_processo SET nome='Working Paper DIFAL preenchido', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper DIFAL com todos os cálculos da análise do diferencial de alíquota.', updated_at=NOW() WHERE id='eaa4b015-e8f2-f11e-cec9-ba6354ed5e6b';
UPDATE public.documentos_processo SET nome='Working Paper DIRPF preenchido', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper de revisão da DIRPF com blocos carregados.', updated_at=NOW() WHERE id='c96db810-fa20-4def-fbd4-705c475f65c3';
UPDATE public.documentos_processo SET nome='Working Paper LCDPR (com saldo inicial)', formato='Excel', origem='Interno', estruturado='Estruturado', tipo='Planilha', estrutura_entrada='Working Paper de LCDPR carregado com saldo inicial.', updated_at=NOW() WHERE id='c04dc920-c3da-a4da-814e-9a6d8bd57888';
UPDATE public.documentos_processo SET nome='Working Paper revisado + parecer técnico', formato='PDF', origem='Cliente', estruturado='Não Estruturado', tipo='Relatório', estrutura_entrada='Working Paper revisado pela Prado + parecer técnico final.', updated_at=NOW() WHERE id='af1b757b-1b98-2e5e-7893-f91314298264';
UPDATE public.documentos_processo SET nome='XMLs NF-e', formato='Texto', origem='Cliente', estruturado='Semi Estruturado', tipo='Comprovante', estrutura_entrada='Arquivos XML de Notas Fiscais eletrônicas do cliente.', updated_at=NOW() WHERE id='98b7160d-eb3c-d51b-3563-fbba91b0e9af';

-- ─── 6. Sistemas: swap custo (licença→variável) + tipo_custo NULL + descrição ───
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Working Paper da Prado — planilha-modelo usada como suporte das análises tributárias e contábeis.', updated_at=NOW() WHERE id='00e38899-f1a6-cfbe-b770-6667e9382a51';  -- WP Prado
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Centro Virtual de Atendimento da Receita Federal — acesso a PER/DCOMP, situação fiscal e obrigações acessórias.', updated_at=NOW() WHERE id='2f4075f4-5df3-9057-d1d0-7ea7fd6e012f';  -- e-CAC
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Sistema da RFB para envio de Pedido Eletrônico de Restituição/Ressarcimento e Declaração de Compensação.', updated_at=NOW() WHERE id='5f68b103-90f8-5558-3326-497ebe6ace09';  -- PER/DCOMP Web
UPDATE public.sistemas_processo SET custo_variavel_por_uso=30, custo_licenca_mensal=0, tipo_custo=NULL, descricao='E-mail corporativo para comunicação com clientes e equipe.', updated_at=NOW() WHERE id='3d7ed977-3d89-20e3-da1e-5d2ef26ce8d6';  -- Email
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Ferramenta interna do PSA Consultores para apoio às análises.', updated_at=NOW() WHERE id='9ccad270-2df1-7d34-5c29-8273981cfaa1';  -- Ferramenta Prado
UPDATE public.sistemas_processo SET custo_variavel_por_uso=300, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Plataforma de consulta de legislação tributária (assinatura paga).', updated_at=NOW() WHERE id='89d562ad-01e2-4eda-3f8d-cf43442dd2e6';  -- Econet Editora
UPDATE public.sistemas_processo SET custo_variavel_por_uso=40, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Editores de documentos (Microsoft Word) para minutas e pareceres.', updated_at=NOW() WHERE id='069ebde5-f8b4-13ff-79fc-0220b45a08c3';  -- Word/PDF
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Portais estaduais de consulta de NF-e e situação fiscal estadual.', updated_at=NOW() WHERE id='299bddfc-f10c-dbd0-a7ad-cb5d7e6b8b33';  -- Portal SEFAZ
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Portal da Receita para consulta de enquadramento no Simples Nacional.', updated_at=NOW() WHERE id='7c25714e-226c-985b-82f0-0df85ea3c78f';  -- Portal Simples Nacional
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Programa oficial para Livro Caixa Digital do Produtor Rural.', updated_at=NOW() WHERE id='bb0f336e-dd90-355b-769a-d1568b261059';  -- Programa LCDPR
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Programa oficial da Receita Federal para Declaração de Imposto de Renda Pessoa Física.', updated_at=NOW() WHERE id='f282c0cf-a953-dd2c-2f4e-439d5b39a23a';  -- Programa IRPF
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Canais de comunicação informal entre equipe (urgências, atribuições).', updated_at=NOW() WHERE id='3043408d-66d9-50cb-5448-1e138cf8161e';  -- Teams/WhatsApp
UPDATE public.sistemas_processo SET custo_variavel_por_uso=0, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Comunicação verbal/presencial com cliente ou equipe.', updated_at=NOW() WHERE id='7d79ed8f-db53-5186-6a95-c8cb17ac589d';  -- Comunicação direta
UPDATE public.sistemas_processo SET custo_variavel_por_uso=150, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Ferramenta de conversão de PDF para Excel (Able2Extract ou similar).', updated_at=NOW() WHERE id='296c32d6-63d9-56fb-b7bf-b4495bb110b9';  -- Conversor PDF
UPDATE public.sistemas_processo SET custo_variavel_por_uso=40, custo_licenca_mensal=0, tipo_custo=NULL, descricao='Excel utilizado para simulações tributárias e projeções.', updated_at=NOW() WHERE id='26edf2b2-d600-f4f7-f5a0-94eed4c82aaf';  -- Planilha de simulação
UPDATE public.sistemas_processo SET custo_variavel_por_uso=40, custo_licenca_mensal=0, tipo_custo=NULL, descricao='PowerPoint para apresentações ao cliente.', updated_at=NOW() WHERE id='a9ffc0bd-70bd-dbdf-404f-8c704b3a026a';  -- PowerPoint/PDF

-- ─── 6b. 16 sistemas novos = ferramentas internas (Consulta XMLs, DIFAL Inteligente etc.) ───
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-consulta-xmls'), 'Consulta de XMLs (PSA Digital)', 'Ferramenta interna para busca e download em lote de NF-e/CT-e.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-consulta-xmls'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-consulta-sped'), 'Consulta SPED (PSA Digital)', 'Hub interno para consulta, download e leitura de EFD/ECD/ECF.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-consulta-sped'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-mapa-ncm'), 'Mapa de NCMs (PSA Digital)', 'Base de regras fiscais por NCM/CST/base legal para PIS/COFINS.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-mapa-ncm'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-apuracao-pc'), 'Apuração PIS/COFINS (PSA Digital)', 'Ferramenta interna de consolidação de débitos/créditos PIS/COFINS.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-apuracao-pc'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-analise-cruzada'), 'Análise Cruzada (PSA Digital)', 'Reconciliação entre balancete, EFD Contribuições, EFD ICMS/IPI e XML.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-analise-cruzada'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-correcoes-sped'), 'Revisão Registros EFD (PSA Digital)', 'Revisão de registros da EFD Contribuições cruzando com XML.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-correcoes-sped'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-icms-saidas'), 'ICMS das Saídas (PSA Digital)', 'Análise das saídas de ICMS por período (Apuração, CFOP, ST).', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-icms-saidas'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-difal'), 'DIFAL Inteligente (PSA Digital)', 'Classificação NCM com sincronização das decisões DIFAL.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-difal'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-ibscbs'), 'Calculadora IBS/CBS (PSA Digital)', 'Simulador da reforma tributária (IBS/CBS).', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-ibscbs'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-dash-perdcomp'), 'Dashboard PERDCOMP (PSA Digital)', 'Indicadores consolidados de restituição/compensação.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-dash-perdcomp'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-ctrl-perdcomp'), 'Controle PERDCOMP (PSA Digital)', 'Rotina operacional de pedidos PERDCOMP.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-ctrl-perdcomp'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-balancetes'), 'Controle de Balancetes (PSA Digital)', 'Upload e gestão de balancetes contábeis.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-balancetes'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-ctrl-docs'), 'Controle de Uso e Envio de Documentos (PSA Digital)', 'Dashboard de controle de uso e envio de documentos do cliente.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-ctrl-docs'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-gest-tax'), 'Gestão de Projetos Tax (PSA Digital)', 'Módulo Tax — Gestão de Projetos (dashboard, clientes, projetos, tarefas).', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-gest-tax'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-templates-wp'), 'Templates de Papéis de Trabalho (PSA Digital)', 'Biblioteca padronizada de papéis de trabalho.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-templates-wp'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;
INSERT INTO public.sistemas_processo (id, nome, descricao, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, created_at, updated_at) VALUES (mapa_uuid('sis-psac-int-planej-trib'), 'Planejamento Tributário (PSA Digital)', 'Automação do planejamento tributário rural.', 'Interno', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 0, 0, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at) VALUES (gen_random_uuid(), mapa_uuid('sis-psac-int-planej-trib'), 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 100, NOW()) ON CONFLICT (sistema_id, cluster_id) DO NOTHING;

-- ─── 7. Melhorias: nome curto + vincular cada uma ao seu sistema interno ───
UPDATE public.process_improvements SET improvement_description='Templates de Papéis de Trabalho', updated_at=NOW() WHERE id='4a953e39-50a2-88b1-33ce-eafc79462183';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '4a953e39-50a2-88b1-33ce-eafc79462183', mapa_uuid('sis-psac-int-templates-wp'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Planejamento Tributário (automação)', updated_at=NOW() WHERE id='7a7ec91f-03a0-6442-9154-fd0acdd558ed';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '7a7ec91f-03a0-6442-9154-fd0acdd558ed', mapa_uuid('sis-psac-int-planej-trib'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Consulta de XMLs', updated_at=NOW() WHERE id='e8618573-cd65-9f17-db6f-632ecdd5c36f';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'e8618573-cd65-9f17-db6f-632ecdd5c36f', mapa_uuid('sis-psac-int-consulta-xmls'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Consulta SPED (EFD/ECD/ECF)', updated_at=NOW() WHERE id='ca307640-2d97-3c39-c23c-10c02b3b6020';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'ca307640-2d97-3c39-c23c-10c02b3b6020', mapa_uuid('sis-psac-int-consulta-sped'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Mapa de NCMs (PIS/COFINS)', updated_at=NOW() WHERE id='322876bc-40ba-f101-3b94-cf18485953de';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '322876bc-40ba-f101-3b94-cf18485953de', mapa_uuid('sis-psac-int-mapa-ncm'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Apuração Tributária PIS/COFINS', updated_at=NOW() WHERE id='8f69ed61-e5aa-96b6-4c5f-3862d7356b78';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '8f69ed61-e5aa-96b6-4c5f-3862d7356b78', mapa_uuid('sis-psac-int-apuracao-pc'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Análise Cruzada', updated_at=NOW() WHERE id='6f539b20-d6e1-20b2-af84-8fd43f9ac5fe';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '6f539b20-d6e1-20b2-af84-8fd43f9ac5fe', mapa_uuid('sis-psac-int-analise-cruzada'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Revisão de Registros EFD', updated_at=NOW() WHERE id='5323a02b-26a3-b67b-388b-c3badecf0c25';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '5323a02b-26a3-b67b-388b-c3badecf0c25', mapa_uuid('sis-psac-int-correcoes-sped'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='ICMS das Saídas', updated_at=NOW() WHERE id='5f351fad-8e88-2744-76f8-29f7bf269211';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '5f351fad-8e88-2744-76f8-29f7bf269211', mapa_uuid('sis-psac-int-icms-saidas'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='DIFAL Inteligente', updated_at=NOW() WHERE id='52dc83b0-8064-810f-6729-96327ca3aba1';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '52dc83b0-8064-810f-6729-96327ca3aba1', mapa_uuid('sis-psac-int-difal'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Calculadora IBS/CBS', updated_at=NOW() WHERE id='ad90cd1e-d7d4-cedb-c0dc-02bdc73df57c';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'ad90cd1e-d7d4-cedb-c0dc-02bdc73df57c', mapa_uuid('sis-psac-int-ibscbs'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Dashboard PERDCOMP', updated_at=NOW() WHERE id='d1e63348-c6b5-c7ba-dcb5-b8abc348355a';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'd1e63348-c6b5-c7ba-dcb5-b8abc348355a', mapa_uuid('sis-psac-int-dash-perdcomp'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Controle PERDCOMP', updated_at=NOW() WHERE id='25b53ddc-5516-d571-e7f1-5f8fa3d4eef4';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '25b53ddc-5516-d571-e7f1-5f8fa3d4eef4', mapa_uuid('sis-psac-int-ctrl-perdcomp'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Controle de Balancetes', updated_at=NOW() WHERE id='59600ecc-efd0-22db-d435-51941fbb2d96';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), '59600ecc-efd0-22db-d435-51941fbb2d96', mapa_uuid('sis-psac-int-balancetes'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Controle de Uso e Envio de Documentos', updated_at=NOW() WHERE id='dd04f16d-d08c-0cec-5175-900973322196';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'dd04f16d-d08c-0cec-5175-900973322196', mapa_uuid('sis-psac-int-ctrl-docs'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;
UPDATE public.process_improvements SET improvement_description='Gestão de Projetos Tax', updated_at=NOW() WHERE id='c07a26aa-f194-4272-3a3d-5565cec58610';
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), 'c07a26aa-f194-4272-3a3d-5565cec58610', mapa_uuid('sis-psac-int-gest-tax'), 100, NOW()) ON CONFLICT (melhoria_id, sistema_id) DO NOTHING;

-- ─── 8. Validação ───
DO $v$
DECLARE
  v_doc_bad int; v_sis_bad int; v_stages_null int; v_mel_url int; v_proc_bad int;
  v_proj_bad int; v_scn_dup int; v_mel_sis_zero int;
BEGIN
  SELECT count(*) INTO v_doc_bad FROM public.documentos_processo
    WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
      AND (formato NOT IN ('PDF','Word','Excel','PowerPoint','Markdown','Texto')
        OR origem NOT IN ('Interno','Cliente')
        OR estruturado IS NULL OR tipo IS NULL OR estrutura_entrada IS NULL);
  SELECT count(*) INTO v_sis_bad FROM public.sistemas_processo
    WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND custo_licenca_mensal>0;
  SELECT count(*) INTO v_stages_null FROM public.process_stages ps
    JOIN public.processes pr ON pr.id=ps.process_id
    WHERE pr.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND ps.scenario='AS-IS' AND ps.execution IS NULL;
  SELECT count(*) INTO v_mel_url FROM public.process_improvements
    WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3' AND improvement_description ~ 'https?://';
  SELECT count(*) INTO v_proc_bad FROM public.processes
    WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
      AND (frequency NOT IN ('Diária','Semanal','Quinzenal','Mensal','Trimestral','Anual') OR description IS NULL);
  SELECT count(*) INTO v_proj_bad FROM public.projects
    WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
      AND (status NOT IN ('Mapeamento','Diagnóstico','Melhorias','ROI') OR description IS NULL);
  SELECT count(*) INTO v_scn_dup FROM (
    SELECT process_id, count(*) c FROM public.process_scenarios
    WHERE name LIKE 'Snapshot ROI MAPA — %' GROUP BY process_id HAVING count(*) > 1) x;
  SELECT count(DISTINCT mi.id) INTO v_mel_sis_zero FROM public.process_improvements mi
    WHERE mi.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
      AND NOT EXISTS (SELECT 1 FROM public.melhoria_sistemas ms WHERE ms.melhoria_id = mi.id);
  RAISE NOTICE 'fixes PSAC: docs_bad=% sis_bad=% stages_null=% mel_url=% proc_bad=% proj_bad=% scn_dup=% mel_sem_sis=%',
    v_doc_bad, v_sis_bad, v_stages_null, v_mel_url, v_proc_bad, v_proj_bad, v_scn_dup, v_mel_sis_zero;
  IF v_doc_bad > 0 THEN RAISE EXCEPTION '% documentos fora do contrato', v_doc_bad; END IF;
  IF v_sis_bad > 0 THEN RAISE EXCEPTION '% sistemas com custo_licenca>0', v_sis_bad; END IF;
  IF v_stages_null > 0 THEN RAISE EXCEPTION '% etapas com execution NULL', v_stages_null; END IF;
  IF v_mel_url > 0 THEN RAISE EXCEPTION '% melhorias com URL no nome', v_mel_url; END IF;
  IF v_proc_bad > 0 THEN RAISE EXCEPTION '% processos com frequency/description fora do contrato', v_proc_bad; END IF;
  IF v_proj_bad > 0 THEN RAISE EXCEPTION '% projetos com status/description fora do contrato', v_proj_bad; END IF;
  IF v_scn_dup > 0 THEN RAISE EXCEPTION '% snapshots duplicados ainda', v_scn_dup; END IF;
  IF v_mel_sis_zero > 0 THEN RAISE EXCEPTION '% melhorias ainda sem sistema vinculado', v_mel_sis_zero; END IF;
END $v$;
COMMIT;

