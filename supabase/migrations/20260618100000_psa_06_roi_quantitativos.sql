-- PSA Consultores MAPA — Rodada ROI / Quantitativos
-- Depende de: 20260617100000 (base) + 20260617200000 (etapas AS-IS)
-- Cobre:
--   1. UPDATE processes           — 17 linhas (custo, horas, automação, ROI)
--   2. UPDATE process_improvements — 21 linhas (campos ROI)
--   3. INSERT sistemas_processo   — 12 sistemas "Automação MAPA — X"
--   4. INSERT sistema_clusters    — 12 vínculos ao cluster PSA
--   5. UPDATE process_stages AS-IS — time_current, rework_rate
--   6. INSERT process_stages TO-BE — row espelho (mesmo id, scenario='TO-BE')
--   7. UPDATE etapa_responsaveis AS-IS — horas
--   8. INSERT etapa_responsaveis TO-BE — novos rows para stages TO-BE
--   9. INSERT etapa_sistemas TO-BE     — vínculo à automação no cenário ficou

BEGIN;

CREATE OR REPLACE FUNCTION public.psa_mapa_uuid(slug text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT md5('mapa-psa-inplace:' || slug)::uuid
$$;

-- ============================================================
-- 1. UPDATE processes — campos quantitativos / ROI
-- ============================================================
UPDATE public.processes SET
  people_involved = s.people_involved,
  time_spent_hours = s.time_spent_hours,
  time_spent_frequency = s.time_spent_frequency,
  cost_monthly = s.cost_monthly,
  automation_potential = s.automation_potential,
  evaluation_period_days = s.evaluation_period_days,
  financial_impact = s.financial_impact,
  last_cost_saved_monthly = s.last_cost_saved_monthly,
  last_roi_percentage = s.last_roi_percentage,
  last_time_saved_hours = s.last_time_saved_hours,
  updated_at = NOW()
FROM (VALUES
  ('550a8060-9f23-43e6-a78e-edcf8b258015'::uuid, 3, 10.12, 'Semanal', 2543.09, 45.0, 360, 10236.0, 853.0, 284.33, 19.74),
  ('ca800dfa-c14e-4b4e-89d9-10d6dd1da235'::uuid, 2.5, 24.87, 'Mensal', 1452.52, 30.0, 360, 1752.0, 146.0, 48.67, 7.46),
  ('ec58feca-8367-409f-8cd6-b880644896b6'::uuid, 1, 16.0, 'Mensal', 880.0, 85.0, 360, 8976.0, 748.0, NULL, 13.6),
  ('ad8a6b69-2579-4a16-b708-6319555a87f9'::uuid, 2, 0.86, 'Diária', 822.05, 50.0, 360, 1404.0, 117.0, 39.0, 8.98),
  ('fc0233c3-08b5-4428-be6f-332634cc9c24'::uuid, 1, 0.32, 'Diária', 238.33, 80.0, 360, 2288.0, 190.67, NULL, 5.45),
  ('94ec5922-354d-4fff-a828-a40978698866'::uuid, 1, 92.34, 'Mensal', 5060.58, 85.0, 360, 49392.0, 4116.0, 1829.33, 78.49),
  ('4d6476ae-93fe-46ec-843a-02824e6d4800'::uuid, 3, 146.76, 'Mensal', 9490.18, 50.0, 360, 58872.0, 4906.0, 1635.33, 73.38),
  ('16a7c7f1-2d7a-4097-a05a-76d0d28183f2'::uuid, 2, 19.33, 'Mensal', 1120.89, 39.0, 360, 1752.0, 146.0, 48.67, 7.54),
  ('fd3d188d-1582-4d1d-96a2-7a73fd04de3d'::uuid, 3, 23.29, 'Semanal', 3676.43, 55.0, 360, 21324.0, 1777.0, 592.33, 55.51),
  ('5c2c1c02-e51e-4790-b251-15f2306ca545'::uuid, 1, 1.45, 'Semanal', 220.0, 30.0, 360, 792.0, 66.0, NULL, 1.89),
  ('bda94caf-9811-4177-b1c0-088b253c0243'::uuid, 4, 76.88, 'Mensal', 8579.77, 55.0, 360, 55080.0, 4590.0, 1530.0, 42.29),
  ('d3c7e6f6-bc08-40b0-9d4a-e31e47a0c821'::uuid, 2, 88.17, 'Mensal', 5231.23, 45.0, 180, 27336.0, 2278.0, 2278.0, 39.68),
  ('48d2e792-3fd2-41c1-a357-582a553d38d9'::uuid, 3, 0.09, 'Diária', 220.0, 30.0, 360, 792.0, 66.0, NULL, 0.57),
  ('c7db1b56-22cc-4c8d-b36a-b280f8944172'::uuid, 3, 0.43, 'Diária', 625.0, 55.0, 360, 4125.0, 343.75, NULL, 5.0),
  ('bfd4a06a-de80-4fbe-9955-a877a551a3dc'::uuid, 4, 127.42, 'Mensal', 5608.21, 45.0, 360, 27588.0, 2299.0, 766.33, 57.34),
  ('3d896cea-f554-42f4-a7b9-8ec61195c71d'::uuid, 6, 3.53, 'Diária', 7523.81, 35.0, 360, 32160.0, 2680.0, 893.33, 25.98),
  ('c1012dd1-2296-4464-bcec-be7e9bfbed77'::uuid, 5, 8.73, 'Semanal', 4690.55, 25.0, 360, 12828.0, 1069.0, 356.33, 9.46)
) AS s(id, people_involved, time_spent_hours, time_spent_frequency, cost_monthly,
        automation_potential, evaluation_period_days, financial_impact,
        last_cost_saved_monthly, last_roi_percentage, last_time_saved_hours)
WHERE processes.id = s.id;

-- ============================================================
-- 2. UPDATE process_improvements — campos ROI
-- ============================================================
UPDATE public.process_improvements SET
  baseline_time_hours = s.baseline_time_hours,
  baseline_cost_monthly = s.baseline_cost_monthly,
  improved_time_hours = s.improved_time_hours,
  improved_cost_monthly = s.improved_cost_monthly,
  time_saved_hours = s.time_saved_hours,
  time_saved_percent = s.time_saved_percent,
  cost_saved_monthly = s.cost_saved_monthly,
  cost_saved_percent = s.cost_saved_percent,
  one_time_external_cost = s.one_time_external_cost,
  updated_at = NOW()
FROM (VALUES
  ('Consulta de XMLs em lote (NF-e/CT-e)',          43.86, 2522.22, 24.13, 1669.22, 19.74, 45.0,  853.0,  33.82, NULL),
  ('Consulta SPED centralizada (EFD, EFD ICMS, ECD, ECF)', 50.47, 1766.36, 22.71, 877.86, 27.76, 55.0, 888.5, 50.3, NULL),
  ('Quebra automática de arquivos SPED/XML',         53.61, 1876.36, 24.91, 954.86, 28.7,  42.5,  921.5,  49.11, NULL),
  ('Correções de SPED assistidas',                   36.69, 2018.0,  18.35, 791.5,  18.35, 50.0,  1226.5, 60.78, NULL),
  ('Apuração automatizada de PIS/COFINS',            36.69, 2018.0,  18.35, 791.5,  18.35, 50.0,  1226.5, 60.78, NULL),
  ('Hub de Levantamento de Crédito PIS/COFINS',      36.69, 2018.0,  18.35, 791.5,  18.35, 50.0,  1226.5, 60.78, NULL),
  ('Mapa NCM PIS/COFINS centralizado',               24.87, 1430.0,  17.41, 1284.0, 7.46,  30.0,  146.0,  10.21, NULL),
  ('Processo DIFAL digitalizado',                    30.78, 1569.8,  4.62,  197.8,  26.16, 85.0,  1372.0, 87.4,  NULL),
  ('Análise de ICMS de Saídas automatizada',         30.78, 1569.8,  4.62,  197.8,  26.16, 85.0,  1372.0, 87.4,  NULL),
  ('Hub de Análise ICMS',                            30.78, 1569.8,  4.62,  197.8,  26.16, 85.0,  1372.0, 87.4,  NULL),
  ('Controle de PERDCOMP com dashboard',             9.66,  538.46,  5.9,   465.46, 3.77,  39.0,  73.0,   13.56, NULL),
  ('Controle de Balancetes',                         3.14,  110.0,   2.2,   77.0,   0.94,  30.0,  33.0,   30.0,  NULL),
  ('Auditoria cruzada de documentos',                36.69, 2018.0,  18.35, 791.5,  18.35, 50.0,  1226.5, 60.78, NULL),
  ('Portal de chamados do cliente (self-service)',   67.21, 3945.71, 39.44, 2286.05,27.77, 40.0,  1659.67,42.06, NULL),
  ('Biblioteca de modelos e documentos padronizados',44.09, 2590.0,  24.25, 1451.0, 19.84, 45.0,  1139.0, 43.98, NULL),
  ('Geração automatizada de documentos',             86.56, 4383.33, 47.61, 2478.0, 38.95, 45.0,  1905.33,43.47, NULL),
  ('Dashboard de controle de PERDCOMP para o cliente',34.4, 2690.84, 21.98, 1724.51,12.43, 37.0,  966.33, 35.91, NULL),
  ('Dashboard de controle de uso e envio de documentos',43.42,1903.33,24.02,1104.0, 19.4,  37.5,  799.33, 42.0,  NULL),
  ('Dashboard de clientes, OS e projetos',           63.52, 6298.38, 45.12, 4303.05,18.4,  30.0,  1995.33,31.68, NULL),
  ('Consulta de CNPJ em lote (SN/CNAE)',             24.77, 1046.33, 10.34, 738.67, 14.43, 65.0,  307.67, 29.4,  1589),
  ('Automação do Planejamento Tributário',           9.09,  625.0,   4.09,  281.25, 5.0,   55.0,  343.75, 55.0,  NULL)
) AS s(name, baseline_time_hours, baseline_cost_monthly, improved_time_hours, improved_cost_monthly,
        time_saved_hours, time_saved_percent, cost_saved_monthly, cost_saved_percent, one_time_external_cost)
WHERE process_improvements.improvement_description = s.name
  AND process_improvements.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;

-- ============================================================
-- 3. INSERT sistemas_processo — 12 automações internas
-- ============================================================
INSERT INTO public.sistemas_processo (id, nome, cluster_id, tipo_custo, custo_variavel_por_uso, updated_at)
VALUES
  (public.psa_mapa_uuid('sistema:Automação MAPA — Download do arquivo XML NF-e'),
   'Automação MAPA — Download do arquivo XML NF-e',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Consultas de NCM - PIS e COFINS'),
   'Automação MAPA — Consultas de NCM - PIS e COFINS',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Consulta de CNPJ (SN)'),
   'Automação MAPA — Consulta de CNPJ (SN)',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Apuração do DIFAL'),
   'Automação MAPA — Apuração do DIFAL',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 225.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Levantamento de Crédito PIS/COFINS'),
   'Automação MAPA — Levantamento de Crédito PIS/COFINS',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Controle de Saldos PIS/COFINS/IPI'),
   'Automação MAPA — Controle de Saldos PIS/COFINS/IPI',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Quebra de Obrigações Acessórias (SPEDs)'),
   'Automação MAPA — Quebra de Obrigações Acessórias (SPEDs)',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Revisão de Tributos (IRPF, PIS/COFINS, IRPJ/CSLL, LCDPR)'),
   'Automação MAPA — Revisão de Tributos (IRPF, PIS/COFINS, IRPJ/CSLL, LCDPR)',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Elaboração de Papéis de Trabalho Contábeis e Fiscais'),
   'Automação MAPA — Elaboração de Papéis de Trabalho Contábeis e Fiscais',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 100.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Onboarding de Novos Clientes e Solicitação de Documentos'),
   'Automação MAPA — Onboarding de Novos Clientes e Solicitação de Documentos',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Controle e Acompanhamento de Projetos Tributários'),
   'Automação MAPA — Controle e Acompanhamento de Projetos Tributários',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW()),
  (public.psa_mapa_uuid('sistema:Automação MAPA — Distribuição de Carga de Trabalho e Performance da Equipe'),
   'Automação MAPA — Distribuição de Carga de Trabalho e Performance da Equipe',
   'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid, 'recorrente_mensal', 300.0, NOW())
ON CONFLICT (id) DO UPDATE SET
  custo_variavel_por_uso = EXCLUDED.custo_variavel_por_uso,
  updated_at = NOW();

-- ============================================================
-- 4. sistema_clusters — vincular ao cluster PSA
--    (se a tabela existir; ignorar se já tiver registro)
-- ============================================================
INSERT INTO public.sistema_clusters (sistema_id, cluster_id)
SELECT s.id, 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
FROM public.sistemas_processo s
WHERE s.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  AND s.nome LIKE 'Automação MAPA — %'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. UPDATE process_stages AS-IS — time_current, rework_rate
-- ============================================================
UPDATE public.process_stages SET
  time_current = s.time_current,
  rework_rate   = s.rework_rate,
  updated_at    = NOW()
FROM (VALUES
  ('Relação das chaves das notas',                                                          10.12, 0.83),
  ('Consultas de NCM do PIS e COFINS',                                                     24.87, 1.57),
  ('Consultas de NCM do ICMS',                                                             16.0,  NULL),
  ('Consulta CNPJ (Simples Nacional)',                                                      0.86,  1.74),
  ('Consulta de CNAE',                                                                      0.32,  NULL),
  ('Quebra de documentos',                                                                  18.47, 7.46),
  ('Consulta do NCM das notas fiscais do cliente para calculo de Difal (diferencial de alíquota)', 18.47, 7.46),
  ('Preenchimento do WP prado para analise do ICMS',                                       18.47, 7.46),
  ('Analise do ICMS das saídas do cliente',                                                18.47, 7.46),
  ('Entrega do relatório para o cliente',                                                  18.47, 7.46),
  ('Coleta de documentos',                                                                  16.31, 17.57),
  ('Quebra de Arquivos',                                                                    16.31, 17.57),
  ('Apuração Cliente',                                                                      16.31, 17.57),
  ('Apuração Prado',                                                                        16.31, 17.57),
  ('Apuração de tributações Deb/Cred',                                                     16.31, 17.57),
  ('EFD Contribuições - Parte 1',                                                           32.61, 17.57),
  ('EFD Contribuições - Parte 2',                                                           32.61, 17.57),
  ('Composição dos saldos passíveis de ressarcimento',                                     5.52,  4.08),
  ('Controle dos saldos solicitados o ressarcimento',                                      5.52,  4.08),
  ('Pedido de Ressarcimento ou Restituição (PER)',                                         5.52,  4.08),
  ('Fazer upload da planilha no pasta do cliente',                                         2.76,  4.08),
  ('Quebra dos Documentos SPEDs',                                                          23.29, 4.07),
  ('Quebra de Balancete',                                                                   1.45,  NULL),
  ('Consolidação da Revisão de Tributos e Parecer',                                        76.88, 6.28),
  ('Cabeçalho WP',                                                                         11.02, 0.99),
  ('Exportação da Cópia de Segurança IRPF e Carga no WP DIRPF',                           11.02, 0.99),
  ('Papel Padrao PIS COFINS_VF',                                                           11.02, 0.99),
  ('Papel Padrão WP - IRPJ/CSLL',                                                         11.02, 0.99),
  ('WP Calcenter - Levantamento_ME',                                                       11.02, 0.99),
  ('Apuração do LCDPR',                                                                    11.02, 0.99),
  ('WP DIFAL',                                                                             11.02, 0.99),
  ('WP_ICMS_SAIDAS',                                                                       11.02, 0.99),
  ('Identificação dos serviços contratados por cliente',                                   0.01,  NULL),
  ('Definição dos prazos de entrega por serviço',                                          0.01,  NULL),
  ('Verificação da disponibilidade de documentos necessários',                             0.01,  NULL),
  ('Distribuição e atribuição formal das tarefas',                                         0.01,  NULL),
  ('Execução do trabalho técnico',                                                          0.01,  NULL),
  ('Registro do status de andamento',                                                      0.01,  NULL),
  ('Revisão técnica e controle de qualidade',                                              0.02,  NULL),
  ('Entrega ao cliente e registro de conclusão',                                           0.01,  NULL),
  ('Medição de tempo gasto e controle de produtividade',                                   0.01,  NULL),
  ('Acompanhamento de prazos e alertas de vencimento',                                     0.01,  NULL),
  ('Receber Documentos e Converter PDF',                                                   0.11,  NULL),
  ('Consulta do CNAE e Apuração das Despesas/Receitas',                                   0.11,  NULL),
  ('Geração do Resumo LCDPR, Projeção da DRE e análise dos Cenários',                    0.11,  NULL),
  ('Análise do Planejamento Tributário Realizado e Elaboração da Apresentação',           0.11,  NULL),
  ('Recebimento da demanda de novo cliente',                                               14.16, 4.24),
  ('Definição dos documentos necessários',                                                 14.16, 4.24),
  ('Preparação e envio da solicitação ao cliente',                                         14.16, 4.24),
  ('Registro do pedido em planilha de controle',                                           14.16, 4.24),
  ('Acompanhamento diário do status de envio',                                             14.16, 4.24),
  ('Cobrança manual ao cliente em caso de atraso',                                        14.16, 4.24),
  ('Recebimento e salvamento dos documentos no SharePoint',                               14.16, 4.24),
  ('Validação da documentação pelo analista',                                              14.16, 4.24),
  ('Conclusão do onboarding e início dos trabalhos',                                      14.16, 4.24),
  ('Entrada do projeto e cadastro inicial',                                                0.35,  16.52),
  ('Solicitação de documentos ao cliente',                                                 0.71,  16.52),
  ('Atribuição de responsáveis e priorização',                                             0.35,  16.52),
  ('Acompanhamento de status e alertas de prazo',                                         0.35,  16.52),
  ('Registro de horas trabalhadas (timesheet)',                                            0.35,  16.52),
  ('Revisão técnica e gestão de bloqueios',                                               1.06,  16.52),
  ('Entrega ao cliente e encerramento',                                                    0.35,  16.52),
  ('Atribuição Informal e Definição de Prioridades',                                      2.91,  16.22),
  ('Monitoramento Reativo',                                                                5.82,  16.22)
) AS s(name, time_current, rework_rate)
WHERE process_stages.name = s.name
  AND process_stages.scenario = 'AS-IS'
  AND process_stages.process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  );

-- ============================================================
-- 6. INSERT process_stages TO-BE (row espelho, mesmo id)
-- PK composta (id, scenario) — usa upsert para ser idempotente
-- ============================================================
INSERT INTO public.process_stages (
  id, process_id, stage_order, name, description, scenario,
  stage_as_is_id, time_current, time_target, rework_rate, updated_at
)
SELECT
  ps.id,
  ps.process_id,
  ps.stage_order,
  ps.name,
  ps.description,
  'TO-BE',
  ps.id,
  s.time_tobe,
  s.time_tobe,
  s.rework_tobe,
  NOW()
FROM public.process_stages ps
JOIN (VALUES
  ('Relação das chaves das notas',                                                          5.57,  0.21),
  ('Consultas de NCM do PIS e COFINS',                                                     17.41, 0.55),
  ('Consultas de NCM do ICMS',                                                             2.4,   NULL),
  ('Consulta CNPJ (Simples Nacional)',                                                      0.43,  0.26),
  ('Consulta de CNAE',                                                                      0.06,  NULL),
  ('Quebra de documentos',                                                                  2.77,  1.86),
  ('Consulta do NCM das notas fiscais do cliente para calculo de Difal (diferencial de alíquota)', 2.77, 1.86),
  ('Preenchimento do WP prado para analise do ICMS',                                       2.77,  1.86),
  ('Analise do ICMS das saídas do cliente',                                                2.77,  1.86),
  ('Entrega do relatório para o cliente',                                                  2.77,  1.86),
  ('Coleta de documentos',                                                                  8.15,  6.15),
  ('Quebra de Arquivos',                                                                    8.15,  6.15),
  ('Apuração Cliente',                                                                      8.15,  6.15),
  ('Apuração Prado',                                                                        8.15,  6.15),
  ('Apuração de tributações Deb/Cred',                                                     8.15,  6.15),
  ('EFD Contribuições - Parte 1',                                                           16.31, 6.15),
  ('EFD Contribuições - Parte 2',                                                           16.31, 6.15),
  ('Composição dos saldos passíveis de ressarcimento',                                     3.37,  2.74),
  ('Controle dos saldos solicitados o ressarcimento',                                      3.37,  2.74),
  ('Pedido de Ressarcimento ou Restituição (PER)',                                         3.37,  2.74),
  ('Fazer upload da planilha no pasta do cliente',                                         1.68,  2.74),
  ('Quebra dos Documentos SPEDs',                                                          10.48, 0.61),
  ('Quebra de Balancete',                                                                   1.02,  NULL),
  ('Consolidação da Revisão de Tributos e Parecer',                                        34.6,  1.57),
  ('Cabeçalho WP',                                                                         6.06,  0.15),
  ('Exportação da Cópia de Segurança IRPF e Carga no WP DIRPF',                           6.06,  0.15),
  ('Papel Padrao PIS COFINS_VF',                                                           6.06,  0.15),
  ('Papel Padrão WP - IRPJ/CSLL',                                                         6.06,  0.15),
  ('WP Calcenter - Levantamento_ME',                                                       6.06,  0.15),
  ('Apuração do LCDPR',                                                                    6.06,  0.15),
  ('WP DIFAL',                                                                             6.06,  0.15),
  ('WP_ICMS_SAIDAS',                                                                       6.06,  0.15),
  ('Identificação dos serviços contratados por cliente',                                   0.01,  NULL),
  ('Definição dos prazos de entrega por serviço',                                          0.01,  NULL),
  ('Verificação da disponibilidade de documentos necessários',                             0.01,  NULL),
  ('Distribuição e atribuição formal das tarefas',                                         0.01,  NULL),
  ('Execução do trabalho técnico',                                                          0.01,  NULL),
  ('Registro do status de andamento',                                                      0.01,  NULL),
  ('Revisão técnica e controle de qualidade',                                              0.01,  NULL),
  ('Entrega ao cliente e registro de conclusão',                                           0.01,  NULL),
  ('Medição de tempo gasto e controle de produtividade',                                   0.01,  NULL),
  ('Acompanhamento de prazos e alertas de vencimento',                                     0.01,  NULL),
  ('Receber Documentos e Converter PDF',                                                   0.05,  NULL),
  ('Consulta do CNAE e Apuração das Despesas/Receitas',                                   0.05,  NULL),
  ('Geração do Resumo LCDPR, Projeção da DRE e análise dos Cenários',                    0.05,  NULL),
  ('Análise do Planejamento Tributário Realizado e Elaboração da Apresentação',           0.05,  NULL),
  ('Recebimento da demanda de novo cliente',                                               7.79,  1.7),
  ('Definição dos documentos necessários',                                                 7.79,  1.7),
  ('Preparação e envio da solicitação ao cliente',                                         7.79,  1.7),
  ('Registro do pedido em planilha de controle',                                           7.79,  1.7),
  ('Acompanhamento diário do status de envio',                                             7.79,  1.7),
  ('Cobrança manual ao cliente em caso de atraso',                                        7.79,  1.7),
  ('Recebimento e salvamento dos documentos no SharePoint',                               7.79,  1.7),
  ('Validação da documentação pelo analista',                                              7.79,  1.7),
  ('Conclusão do onboarding e início dos trabalhos',                                      7.79,  1.7),
  ('Entrada do projeto e cadastro inicial',                                                0.23,  8.26),
  ('Solicitação de documentos ao cliente',                                                 0.46,  8.26),
  ('Atribuição de responsáveis e priorização',                                             0.23,  8.26),
  ('Acompanhamento de status e alertas de prazo',                                         0.23,  8.26),
  ('Registro de horas trabalhadas (timesheet)',                                            0.23,  8.26),
  ('Revisão técnica e gestão de bloqueios',                                               0.69,  8.26),
  ('Entrega ao cliente e encerramento',                                                    0.23,  8.26),
  ('Atribuição Informal e Definição de Prioridades',                                      2.18,  9.73),
  ('Monitoramento Reativo',                                                                4.37,  9.73)
) AS s(name, time_tobe, rework_tobe) ON ps.name = s.name
WHERE ps.scenario = 'AS-IS'
  AND ps.process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  )
ON CONFLICT (id, scenario) DO UPDATE SET
  time_current = EXCLUDED.time_current,
  time_target  = EXCLUDED.time_target,
  rework_rate  = EXCLUDED.rework_rate,
  updated_at   = NOW();

-- ============================================================
-- 7. UPDATE etapa_responsaveis AS-IS — horas
-- ============================================================
UPDATE public.etapa_responsaveis er SET
  horas = s.horas,
  updated_at = NOW()
FROM (VALUES
  ('Relação das chaves das notas',          'Consultor Tributário Jr',     'executor',  5.061315),
  ('Relação das chaves das notas',          'Consultor Tributário Pleno',  'executor',  5.061315),
  ('Consultas de NCM do PIS e COFINS',      'Consultor Tributário Jr',     'executor', 12.434783),
  ('Consultas de NCM do PIS e COFINS',      'Consultor Tributário Pleno',  'executor', 12.434783),
  ('Consultas de NCM do ICMS',              'Analista Fiscal Pleno',       'executor', 16.0),
  ('Consulta CNPJ (Simples Nacional)',       'Consultor Tributário Jr',     'executor',  0.855026),
  ('Consulta de CNAE',                      'Analista Fiscal Jr',          'executor',  0.324263),
  ('Quebra de documentos',                  'Analista Fiscal Jr',          'executor', 18.468281),
  ('Consulta do NCM das notas fiscais do cliente para calculo de Difal (diferencial de alíquota)', 'Analista Fiscal Pleno', 'executor', 18.468281),
  ('Preenchimento do WP prado para analise do ICMS',  'Analista Fiscal Pleno',  'executor', 18.468281),
  ('Analise do ICMS das saídas do cliente', 'Analista Fiscal Pleno',       'executor', 18.468281),
  ('Entrega do relatório para o cliente',   'Analista Fiscal Pleno',       'executor', 18.468281),
  ('Coleta de documentos',                  'Analista Fiscal Jr',          'executor', 16.307071),
  ('Quebra de Arquivos',                    'Analista Fiscal Jr',          'executor', 16.307071),
  ('Apuração Cliente',                      'Analista Fiscal Pleno',       'executor', 16.307071),
  ('Apuração Prado',                        'Consultor Tributário Pleno',  'executor', 16.307071),
  ('Apuração de tributações Deb/Cred',      'Consultor Tributário Pleno',  'executor', 16.307071),
  ('EFD Contribuições - Parte 1',           'Consultor Tributário Jr',     'executor', 16.307071),
  ('EFD Contribuições - Parte 1',           'Consultor Tributário Pleno',  'executor', 16.307071),
  ('EFD Contribuições - Parte 2',           'Consultor Tributário Jr',     'executor', 16.307071),
  ('EFD Contribuições - Parte 2',           'Consultor Tributário Pleno',  'executor', 16.307071),
  ('Composição dos saldos passíveis de ressarcimento', 'Consultor Tributário Jr',    'executor',  2.761341),
  ('Composição dos saldos passíveis de ressarcimento', 'Consultor Tributário Pleno', 'executor',  2.761341),
  ('Controle dos saldos solicitados o ressarcimento',  'Consultor Tributário Jr',    'executor',  2.761341),
  ('Controle dos saldos solicitados o ressarcimento',  'Consultor Tributário Pleno', 'executor',  2.761341),
  ('Pedido de Ressarcimento ou Restituição (PER)',     'Consultor Tributário Jr',    'executor',  2.761341),
  ('Pedido de Ressarcimento ou Restituição (PER)',     'Consultor Tributário Pleno', 'executor',  2.761341),
  ('Fazer upload da planilha no pasta do cliente',     'Consultor Tributário Jr',    'executor',  2.761341),
  ('Quebra dos Documentos SPEDs',           'Analista Fiscal Jr',          'executor', 23.292707),
  ('Quebra de Balancete',                   'Analista Fiscal Jr',          'executor',  1.450549),
  ('Consolidação da Revisão de Tributos e Parecer', 'Consultor Tributário Sr', 'revisor',   38.441558),
  ('Consolidação da Revisão de Tributos e Parecer', 'Coordenador',            'aprovador', 38.441558),
  ('Cabeçalho WP',                          'Analista Contábil Pleno',     'executor', 11.021277),
  ('Exportação da Cópia de Segurança IRPF e Carga no WP DIRPF', 'Consultor Tributário Pleno', 'executor', 11.021277),
  ('Papel Padrao PIS COFINS_VF',            'Analista Fiscal Pleno',       'executor', 11.021277),
  ('Papel Padrão WP - IRPJ/CSLL',          'Analista Contábil Pleno',     'executor', 11.021277),
  ('WP Calcenter - Levantamento_ME',        'Analista Contábil Pleno',     'executor', 11.021277),
  ('Apuração do LCDPR',                     'Consultor Tributário Pleno',  'executor', 11.021277),
  ('WP DIFAL',                              'Analista Fiscal Pleno',       'executor', 11.021277),
  ('WP_ICMS_SAIDAS',                        'Analista Fiscal Pleno',       'executor', 11.021277),
  ('Identificação dos serviços contratados por cliente', 'Gerente',          'executor',  0.008185),
  ('Definição dos prazos de entrega por serviço',        'Gerente',          'executor',  0.008185),
  ('Verificação da disponibilidade de documentos necessários', 'Consultor Tributário Pleno', 'executor', 0.008185),
  ('Distribuição e atribuição formal das tarefas',       'Gerente',          'executor',  0.008185),
  ('Execução do trabalho técnico',                       'Consultor Tributário Pleno', 'executor', 0.008185),
  ('Registro do status de andamento',                    'Consultor Tributário Pleno', 'executor', 0.008185),
  ('Revisão técnica e controle de qualidade',            'Consultor Tributário Sr', 'revisor',  0.008185),
  ('Revisão técnica e controle de qualidade',            'Gerente',          'aprovador', 0.008185),
  ('Entrega ao cliente e registro de conclusão',         'Consultor Tributário Pleno', 'executor', 0.008185),
  ('Medição de tempo gasto e controle de produtividade', 'Gerente',          'executor',  0.008185),
  ('Acompanhamento de prazos e alertas de vencimento',   'Gerente',          'executor',  0.008185),
  ('Receber Documentos e Converter PDF',    'Analista Fiscal Jr',           'executor',  0.108225),
  ('Consulta do CNAE e Apuração das Despesas/Receitas', 'Consultor Tributário Pleno', 'executor', 0.108225),
  ('Geração do Resumo LCDPR, Projeção da DRE e análise dos Cenários', 'Consultor Tributário Pleno', 'executor', 0.108225),
  ('Análise do Planejamento Tributário Realizado e Elaboração da Apresentação', 'Consultor Tributário Sr', 'executor', 0.108225),
  ('Recebimento da demanda de novo cliente', 'Coordenador',                 'executor', 14.157895),
  ('Definição dos documentos necessários',   'Analista Fiscal Jr',          'executor', 14.157895),
  ('Preparação e envio da solicitação ao cliente', 'Assistente Administrativo', 'executor', 14.157895),
  ('Registro do pedido em planilha de controle', 'Assistente Administrativo', 'executor', 14.157895),
  ('Acompanhamento diário do status de envio', 'Assistente Administrativo', 'executor', 14.157895),
  ('Cobrança manual ao cliente em caso de atraso', 'Assistente Administrativo', 'executor', 14.157895),
  ('Recebimento e salvamento dos documentos no SharePoint', 'Assistente Administrativo', 'executor', 14.157895),
  ('Validação da documentação pelo analista', 'Analista Fiscal Pleno',     'executor', 14.157895),
  ('Conclusão do onboarding e início dos trabalhos', 'Analista Fiscal Pleno', 'executor', 14.157895),
  ('Entrada do projeto e cadastro inicial',  'Coordenador',                 'executor',  0.353429),
  ('Solicitação de documentos ao cliente',   'Consultor Tributário Jr',     'executor',  0.353429),
  ('Solicitação de documentos ao cliente',   'Estagiário',                  'executor',  0.353429),
  ('Atribuição de responsáveis e priorização', 'Coordenador',               'executor',  0.353429),
  ('Acompanhamento de status e alertas de prazo', 'Coordenador',            'executor',  0.353429),
  ('Registro de horas trabalhadas (timesheet)', 'Consultor Tributário Pleno', 'executor', 0.353429),
  ('Revisão técnica e gestão de bloqueios',  'Consultor Tributário Sr',     'revisor',   0.353429),
  ('Revisão técnica e gestão de bloqueios',  'Coordenador',                 'aprovador', 0.353429),
  ('Revisão técnica e gestão de bloqueios',  'Especialista Tributário',     'revisor',   0.353429),
  ('Entrega ao cliente e encerramento',      'Consultor Tributário Pleno',  'executor',  0.353429),
  ('Atribuição Informal e Definição de Prioridades', 'Coordenador',         'executor',  2.910577),
  ('Monitoramento Reativo',                  'Coordenador',                 'executor',  2.910577),
  ('Monitoramento Reativo',                  'Consultor Tributário Sr',     'revisor',   2.910577)
) AS s(stage_name, responsavel_name, papel, horas)
WHERE er.etapa_id = (
    SELECT ps.id FROM public.process_stages ps
    WHERE ps.name = s.stage_name
      AND ps.scenario = 'AS-IS'
      AND ps.process_id IN (
        SELECT id FROM public.processes
        WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
      )
    LIMIT 1
  )
  AND er.responsavel_id = (
    SELECT r.id FROM public.responsaveis r WHERE r.nome = s.responsavel_name LIMIT 1
  )
  AND er.papel = s.papel;

-- ============================================================
-- 8. INSERT etapa_responsaveis TO-BE
-- ============================================================
INSERT INTO public.etapa_responsaveis (id, etapa_id, responsavel_id, papel, horas, updated_at)
SELECT
  gen_random_uuid(),
  ps_tobe.id,
  r.id,
  s.papel,
  s.horas,
  NOW()
FROM (VALUES
  ('Relação das chaves das notas',          'Consultor Tributário Jr',     'executor',  2.783724),
  ('Relação das chaves das notas',          'Consultor Tributário Pleno',  'executor',  2.783724),
  ('Consultas de NCM do PIS e COFINS',      'Consultor Tributário Jr',     'executor',  8.704348),
  ('Consultas de NCM do PIS e COFINS',      'Consultor Tributário Pleno',  'executor',  8.704348),
  ('Consultas de NCM do ICMS',              'Analista Fiscal Pleno',       'executor',  2.4),
  ('Consulta CNPJ (Simples Nacional)',       'Consultor Tributário Jr',     'executor',  0.427513),
  ('Consulta de CNAE',                      'Analista Fiscal Jr',          'executor',  0.064853),
  ('Quebra de documentos',                  'Analista Fiscal Jr',          'executor',  2.770242),
  ('Consulta do NCM das notas fiscais do cliente para calculo de Difal (diferencial de alíquota)', 'Analista Fiscal Pleno', 'executor', 2.770242),
  ('Preenchimento do WP prado para analise do ICMS',  'Analista Fiscal Pleno',  'executor', 2.770242),
  ('Analise do ICMS das saídas do cliente', 'Analista Fiscal Pleno',       'executor',  2.770242),
  ('Entrega do relatório para o cliente',   'Analista Fiscal Pleno',       'executor',  2.770242),
  ('Coleta de documentos',                  'Analista Fiscal Jr',          'executor',  8.153535),
  ('Quebra de Arquivos',                    'Analista Fiscal Jr',          'executor',  8.153535),
  ('Apuração Cliente',                      'Analista Fiscal Pleno',       'executor',  8.153535),
  ('Apuração Prado',                        'Consultor Tributário Pleno',  'executor',  8.153535),
  ('Apuração de tributações Deb/Cred',      'Consultor Tributário Pleno',  'executor',  8.153535),
  ('EFD Contribuições - Parte 1',           'Consultor Tributário Jr',     'executor',  8.153535),
  ('EFD Contribuições - Parte 1',           'Consultor Tributário Pleno',  'executor',  8.153535),
  ('EFD Contribuições - Parte 2',           'Consultor Tributário Jr',     'executor',  8.153535),
  ('EFD Contribuições - Parte 2',           'Consultor Tributário Pleno',  'executor',  8.153535),
  ('Composição dos saldos passíveis de ressarcimento', 'Consultor Tributário Jr',    'executor', 1.684418),
  ('Composição dos saldos passíveis de ressarcimento', 'Consultor Tributário Pleno', 'executor', 1.684418),
  ('Controle dos saldos solicitados o ressarcimento',  'Consultor Tributário Jr',    'executor', 1.684418),
  ('Controle dos saldos solicitados o ressarcimento',  'Consultor Tributário Pleno', 'executor', 1.684418),
  ('Pedido de Ressarcimento ou Restituição (PER)',     'Consultor Tributário Jr',    'executor', 1.684418),
  ('Pedido de Ressarcimento ou Restituição (PER)',     'Consultor Tributário Pleno', 'executor', 1.684418),
  ('Fazer upload da planilha no pasta do cliente',     'Consultor Tributário Jr',    'executor', 1.684418),
  ('Quebra dos Documentos SPEDs',           'Analista Fiscal Jr',          'executor', 10.481718),
  ('Quebra de Balancete',                   'Analista Fiscal Jr',          'executor',  1.015385),
  ('Consolidação da Revisão de Tributos e Parecer', 'Consultor Tributário Sr', 'revisor',   17.298701),
  ('Consolidação da Revisão de Tributos e Parecer', 'Coordenador',            'aprovador', 17.298701),
  ('Cabeçalho WP',                          'Analista Contábil Pleno',     'executor',  6.061702),
  ('Exportação da Cópia de Segurança IRPF e Carga no WP DIRPF', 'Consultor Tributário Pleno', 'executor', 6.061702),
  ('Papel Padrao PIS COFINS_VF',            'Analista Fiscal Pleno',       'executor',  6.061702),
  ('Papel Padrão WP - IRPJ/CSLL',          'Analista Contábil Pleno',     'executor',  6.061702),
  ('WP Calcenter - Levantamento_ME',        'Analista Contábil Pleno',     'executor',  6.061702),
  ('Apuração do LCDPR',                     'Consultor Tributário Pleno',  'executor',  6.061702),
  ('WP DIFAL',                              'Analista Fiscal Pleno',       'executor',  6.061702),
  ('WP_ICMS_SAIDAS',                        'Analista Fiscal Pleno',       'executor',  6.061702),
  ('Identificação dos serviços contratados por cliente', 'Gerente',          'executor',  0.005729),
  ('Definição dos prazos de entrega por serviço',        'Gerente',          'executor',  0.005729),
  ('Verificação da disponibilidade de documentos necessários', 'Consultor Tributário Pleno', 'executor', 0.005729),
  ('Distribuição e atribuição formal das tarefas',       'Gerente',          'executor',  0.005729),
  ('Execução do trabalho técnico',                       'Consultor Tributário Pleno', 'executor', 0.005729),
  ('Registro do status de andamento',                    'Consultor Tributário Pleno', 'executor', 0.005729),
  ('Revisão técnica e controle de qualidade',            'Consultor Tributário Sr', 'revisor',  0.005729),
  ('Revisão técnica e controle de qualidade',            'Gerente',          'aprovador', 0.005729),
  ('Entrega ao cliente e registro de conclusão',         'Consultor Tributário Pleno', 'executor', 0.005729),
  ('Medição de tempo gasto e controle de produtividade', 'Gerente',          'executor',  0.005729),
  ('Acompanhamento de prazos e alertas de vencimento',   'Gerente',          'executor',  0.005729),
  ('Receber Documentos e Converter PDF',    'Analista Fiscal Jr',           'executor',  0.048701),
  ('Consulta do CNAE e Apuração das Despesas/Receitas', 'Consultor Tributário Pleno', 'executor', 0.048701),
  ('Geração do Resumo LCDPR, Projeção da DRE e análise dos Cenários', 'Consultor Tributário Pleno', 'executor', 0.048701),
  ('Análise do Planejamento Tributário Realizado e Elaboração da Apresentação', 'Consultor Tributário Sr', 'executor', 0.048701),
  ('Recebimento da demanda de novo cliente', 'Coordenador',                 'executor',  7.786842),
  ('Definição dos documentos necessários',   'Analista Fiscal Jr',          'executor',  7.786842),
  ('Preparação e envio da solicitação ao cliente', 'Assistente Administrativo', 'executor', 7.786842),
  ('Registro do pedido em planilha de controle', 'Assistente Administrativo', 'executor', 7.786842),
  ('Acompanhamento diário do status de envio', 'Assistente Administrativo', 'executor', 7.786842),
  ('Cobrança manual ao cliente em caso de atraso', 'Assistente Administrativo', 'executor', 7.786842),
  ('Recebimento e salvamento dos documentos no SharePoint', 'Assistente Administrativo', 'executor', 7.786842),
  ('Validação da documentação pelo analista', 'Analista Fiscal Pleno',     'executor',  7.786842),
  ('Conclusão do onboarding e início dos trabalhos', 'Analista Fiscal Pleno', 'executor', 7.786842),
  ('Entrada do projeto e cadastro inicial',  'Coordenador',                 'executor',  0.229729),
  ('Solicitação de documentos ao cliente',   'Consultor Tributário Jr',     'executor',  0.229729),
  ('Solicitação de documentos ao cliente',   'Estagiário',                  'executor',  0.229729),
  ('Atribuição de responsáveis e priorização', 'Coordenador',               'executor',  0.229729),
  ('Acompanhamento de status e alertas de prazo', 'Coordenador',            'executor',  0.229729),
  ('Registro de horas trabalhadas (timesheet)', 'Consultor Tributário Pleno', 'executor', 0.229729),
  ('Revisão técnica e gestão de bloqueios',  'Consultor Tributário Sr',     'revisor',   0.229729),
  ('Revisão técnica e gestão de bloqueios',  'Coordenador',                 'aprovador', 0.229729),
  ('Revisão técnica e gestão de bloqueios',  'Especialista Tributário',     'revisor',   0.229729),
  ('Entrega ao cliente e encerramento',      'Consultor Tributário Pleno',  'executor',  0.229729),
  ('Atribuição Informal e Definição de Prioridades', 'Coordenador',         'executor',  2.182933),
  ('Monitoramento Reativo',                  'Coordenador',                 'executor',  2.182933),
  ('Monitoramento Reativo',                  'Consultor Tributário Sr',     'revisor',   2.182933)
) AS s(stage_name, responsavel_name, papel, horas)
JOIN public.process_stages ps_tobe
  ON ps_tobe.name = s.stage_name
  AND ps_tobe.scenario = 'TO-BE'
  AND ps_tobe.process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  )
JOIN public.responsaveis r ON r.nome = s.responsavel_name
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. INSERT etapa_sistemas TO-BE — 12 automações
-- ============================================================
INSERT INTO public.etapa_sistemas (id, etapa_id, sistema_id, rateio, updated_at)
SELECT
  gen_random_uuid(),
  ps.id,
  sis.id,
  NULL,
  NOW()
FROM (VALUES
  ('Relação das chaves das notas',                                  'Automação MAPA — Download do arquivo XML NF-e'),
  ('Consultas de NCM do PIS e COFINS',                              'Automação MAPA — Consultas de NCM - PIS e COFINS'),
  ('Consulta CNPJ (Simples Nacional)',                               'Automação MAPA — Consulta de CNPJ (SN)'),
  ('Quebra de documentos',                                          'Automação MAPA — Apuração do DIFAL'),
  ('Coleta de documentos',                                          'Automação MAPA — Levantamento de Crédito PIS/COFINS'),
  ('Composição dos saldos passíveis de ressarcimento',              'Automação MAPA — Controle de Saldos PIS/COFINS/IPI'),
  ('Quebra dos Documentos SPEDs',                                   'Automação MAPA — Quebra de Obrigações Acessórias (SPEDs)'),
  ('Consolidação da Revisão de Tributos e Parecer',                 'Automação MAPA — Revisão de Tributos (IRPF, PIS/COFINS, IRPJ/CSLL, LCDPR)'),
  ('Cabeçalho WP',                                                  'Automação MAPA — Elaboração de Papéis de Trabalho Contábeis e Fiscais'),
  ('Recebimento da demanda de novo cliente',                        'Automação MAPA — Onboarding de Novos Clientes e Solicitação de Documentos'),
  ('Entrada do projeto e cadastro inicial',                         'Automação MAPA — Controle e Acompanhamento de Projetos Tributários'),
  ('Atribuição Informal e Definição de Prioridades',                'Automação MAPA — Distribuição de Carga de Trabalho e Performance da Equipe')
) AS s(stage_name, sistema_nome)
JOIN public.process_stages ps
  ON ps.name = s.stage_name
  AND ps.scenario = 'TO-BE'
  AND ps.process_id IN (
    SELECT id FROM public.processes
    WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
  )
JOIN public.sistemas_processo sis ON sis.nome = s.sistema_nome
ON CONFLICT DO NOTHING;

-- ============================================================
-- Validação
-- ============================================================
DO $$
DECLARE v integer;
BEGIN
  SELECT count(*) INTO v FROM public.processes
  WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
    AND cost_monthly IS NOT NULL AND cost_monthly > 0;
  IF v < 15 THEN RAISE EXCEPTION 'processes com custo: esperado >=15, encontrado %', v; END IF;

  SELECT count(*) INTO v FROM public.process_stages
  WHERE scenario = 'TO-BE'
    AND process_id IN (SELECT id FROM public.processes WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid);
  IF v < 60 THEN RAISE EXCEPTION 'stages TO-BE: esperado >=60, encontrado %', v; END IF;

  SELECT count(*) INTO v FROM public.sistemas_processo
  WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
    AND nome LIKE 'Automação MAPA — %';
  IF v <> 12 THEN RAISE EXCEPTION 'sistemas Automação MAPA: esperado 12, encontrado %', v; END IF;

  SELECT count(*) INTO v FROM public.etapa_responsaveis er
  JOIN public.process_stages ps ON ps.id = er.etapa_id AND ps.scenario = 'TO-BE'
  WHERE ps.process_id IN (SELECT id FROM public.processes WHERE cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid);
  IF v < 70 THEN RAISE EXCEPTION 'etapa_responsaveis TO-BE: esperado >=70, encontrado %', v; END IF;
END $$;

COMMIT;
