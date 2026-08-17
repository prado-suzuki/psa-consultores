-- ============================================================================
-- PSA 13 — Documentos OSG: limpeza + saídas faltantes + doc-chain (entradas)
-- Rodar DEPOIS da fusão (psa_12). Idempotente (guards NOT EXISTS). scenario='AS-IS'.
-- 1 DELETE (órfão 'Laudo de avaliação') · 5 docs novos · 5 saídas · 61 entradas.
-- Regra do chain: a etapa consumidora (checklist/revisão/aprovação/registro/assinatura/
--   refino de minuta) herda o ARTEFATO em produção da etapa anterior (sem propagar por
--   DP/cálculo/etapas-fonte). Não cria entrada em etapa que já tenha entrada.
-- ============================================================================
BEGIN;

-- 1) Remover documento órfão 'Laudo de avaliação' (duplicata, 0 vínculos)
DELETE FROM public.documentos_processo WHERE id='36c807a6-0d7e-6861-2d57-10602dfcdda5' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80'
  AND NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE documento_id='36c807a6-0d7e-6861-2d57-10602dfcdda5');

-- 2) Criar 5 documentos novos (saídas que faltavam no catálogo)
INSERT INTO public.documentos_processo (id, nome, formato, estruturado, tipo, origem, cluster_id)
  SELECT '77a5d15d-7dde-4a8c-a88d-53f7e6828e19','Projeto de Sucessão Empresarial','Word','Semi Estruturado','Relatório','Interno','0523512c-f980-4236-8a7c-53e06c9c7a80'
  WHERE NOT EXISTS (SELECT 1 FROM public.documentos_processo WHERE nome='Projeto de Sucessão Empresarial' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');
INSERT INTO public.documentos_processo (id, nome, formato, estruturado, tipo, origem, cluster_id)
  SELECT '28348863-b244-4413-a56f-01fd5e5cd8c2','AC por Exigência Cartorial registrada','PDF','Não Estruturado','Registro digital','Interno','0523512c-f980-4236-8a7c-53e06c9c7a80'
  WHERE NOT EXISTS (SELECT 1 FROM public.documentos_processo WHERE nome='AC por Exigência Cartorial registrada' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');
INSERT INTO public.documentos_processo (id, nome, formato, estruturado, tipo, origem, cluster_id)
  SELECT '62ee1513-f579-4550-99e3-aa26e8d432c0','Termo de Encerramento de Safra registrado','PDF','Não Estruturado','Registro digital','Interno','0523512c-f980-4236-8a7c-53e06c9c7a80'
  WHERE NOT EXISTS (SELECT 1 FROM public.documentos_processo WHERE nome='Termo de Encerramento de Safra registrado' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');
INSERT INTO public.documentos_processo (id, nome, formato, estruturado, tipo, origem, cluster_id)
  SELECT 'd4a4efe9-1a35-4854-862f-0e9e6cb2ccdf','AC Reorganização registrada','PDF','Não Estruturado','Registro digital','Interno','0523512c-f980-4236-8a7c-53e06c9c7a80'
  WHERE NOT EXISTS (SELECT 1 FROM public.documentos_processo WHERE nome='AC Reorganização registrada' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');
INSERT INTO public.documentos_processo (id, nome, formato, estruturado, tipo, origem, cluster_id)
  SELECT '55c81c63-c52f-465d-b353-f8472d4edc64','Minuta AC Reorganização','Word','Semi Estruturado','Registro digital','Interno','0523512c-f980-4236-8a7c-53e06c9c7a80'
  WHERE NOT EXISTS (SELECT 1 FROM public.documentos_processo WHERE nome='Minuta AC Reorganização' AND cluster_id='0523512c-f980-4236-8a7c-53e06c9c7a80');

-- 3) Vincular as 5 saídas novas às etapas produtoras
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'b35376fd-04be-053f-5963-4531cc57a2e3','AS-IS','55c81c63-c52f-465d-b353-f8472d4edc64','saida',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='b35376fd-04be-053f-5963-4531cc57a2e3' AND documento_id='55c81c63-c52f-465d-b353-f8472d4edc64' AND sentido='saida' AND scenario='AS-IS');  -- Reorganização Societária (Cisão · Fusão · Incorporação) · AC das sociedades envolvidas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'8d113903-f0fd-65ed-77f6-c4070736a97b','AS-IS','d4a4efe9-1a35-4854-862f-0e9e6cb2ccdf','saida',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='8d113903-f0fd-65ed-77f6-c4070736a97b' AND documento_id='d4a4efe9-1a35-4854-862f-0e9e6cb2ccdf' AND sentido='saida' AND scenario='AS-IS');  -- Reorganização Societária (Cisão · Fusão · Incorporação) · Registro Junta Comercial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'f09476f1-5ab2-2833-e894-137f1e6a4010','AS-IS','28348863-b244-4413-a56f-01fd5e5cd8c2','saida',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='f09476f1-5ab2-2833-e894-137f1e6a4010' AND documento_id='28348863-b244-4413-a56f-01fd5e5cd8c2' AND sentido='saida' AND scenario='AS-IS');  -- AC por Exigência Cartorial · Registro Junta Comercial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'7b181537-fc3c-4e66-b778-e8e63bf2fa0c','AS-IS','62ee1513-f579-4550-99e3-aa26e8d432c0','saida',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='7b181537-fc3c-4e66-b778-e8e63bf2fa0c' AND documento_id='62ee1513-f579-4550-99e3-aa26e8d432c0' AND sentido='saida' AND scenario='AS-IS');  -- Termo de Encerramento de Safra · Registro em cartório
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'47827ae2-a3d8-4d8f-9222-d4c85508e72b','AS-IS','77a5d15d-7dde-4a8c-a88d-53f7e6828e19','saida',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='47827ae2-a3d8-4d8f-9222-d4c85508e72b' AND documento_id='77a5d15d-7dde-4a8c-a88d-53f7e6828e19' AND sentido='saida' AND scenario='AS-IS');  -- Formalização do Projeto · Elaborar projeto de sucessão empresarial

-- 4) Entradas do doc-chain (artefato em produção -> etapa consumidora)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'76bf8154-19b3-6970-0c7a-4c79c0f776c8','AS-IS','f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='76bf8154-19b3-6970-0c7a-4c79c0f776c8' AND documento_id='f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Agro · Revisão sênior (líder do projeto) <- Minuta Contrato Social Agro
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'491c755e-f472-5392-1040-69cd367027d8','AS-IS','f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='491c755e-f472-5392-1040-69cd367027d8' AND documento_id='f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Agro · Aprovação do cliente <- Minuta Contrato Social Agro
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'03e868cc-4011-6caa-d09e-080d9f0a39cf','AS-IS','f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='03e868cc-4011-6caa-d09e-080d9f0a39cf' AND documento_id='f03f0f4e-a9aa-f7c7-d008-8cd9326dfcb0' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Agro · Registro Junta Comercial <- Minuta Contrato Social Agro
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'4452e0ce-607c-9985-a910-4bdcc32d1149','AS-IS','b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='4452e0ce-607c-9985-a910-4bdcc32d1149' AND documento_id='b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Participações · Checklist do revisor <- Minuta Contrato Social Participações
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'b0dc7a1f-3f31-5a4c-09f0-5bb6c95393cf','AS-IS','b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='b0dc7a1f-3f31-5a4c-09f0-5bb6c95393cf' AND documento_id='b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Participações · Revisão sênior <- Minuta Contrato Social Participações
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'d6262d39-513d-e859-062f-170304c071f0','AS-IS','b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='d6262d39-513d-e859-062f-170304c071f0' AND documento_id='b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Participações · Aprovação do cliente <- Minuta Contrato Social Participações
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'53e18b1b-60d6-811e-f570-0a2af08d3011','AS-IS','b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='53e18b1b-60d6-811e-f570-0a2af08d3011' AND documento_id='b6ca10c8-8a04-a5bb-d11a-4e19764fc8c9' AND sentido='entrada' AND scenario='AS-IS');  -- Constituição da Participações · Registro Junta Comercial <- Minuta Contrato Social Participações
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'024cd15f-04aa-8b99-15ee-7c4f5e44e9ca','AS-IS','66c7f6af-c09a-c1dd-b716-13d6aa3f7f15','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='024cd15f-04aa-8b99-15ee-7c4f5e44e9ca' AND documento_id='66c7f6af-c09a-c1dd-b716-13d6aa3f7f15' AND sentido='entrada' AND scenario='AS-IS');  -- Qualificação dos Sócios · Revisão sênior <- Planilha de Capital Social
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'96f77883-a9f4-5190-002c-9e3d5ee6d3ec','AS-IS','bbacaa06-38d2-55f1-b685-43987107db37','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='96f77883-a9f4-5190-002c-9e3d5ee6d3ec' AND documento_id='bbacaa06-38d2-55f1-b685-43987107db37' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Parceria Rural · Checklist do revisor <- Minuta Contrato de Parceria Rural + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'9b1945be-ad43-06b9-a44d-adc7be0bf053','AS-IS','bbacaa06-38d2-55f1-b685-43987107db37','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='9b1945be-ad43-06b9-a44d-adc7be0bf053' AND documento_id='bbacaa06-38d2-55f1-b685-43987107db37' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Parceria Rural · Revisão sênior <- Minuta Contrato de Parceria Rural + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'73669fc1-251d-96c9-c25d-031b6ab0dcf2','AS-IS','bbacaa06-38d2-55f1-b685-43987107db37','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='73669fc1-251d-96c9-c25d-031b6ab0dcf2' AND documento_id='bbacaa06-38d2-55f1-b685-43987107db37' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Parceria Rural · Assinatura <- Minuta Contrato de Parceria Rural + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'d76a60f1-0d38-aee1-0a88-957c153ff79b','AS-IS','bbacaa06-38d2-55f1-b685-43987107db37','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='d76a60f1-0d38-aee1-0a88-957c153ff79b' AND documento_id='bbacaa06-38d2-55f1-b685-43987107db37' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Parceria Rural · Registro em cartório <- Minuta Contrato de Parceria Rural + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'302d97ab-4304-854f-d94d-ec3e17a5da1a','AS-IS','0ef05392-c5f9-3039-0dfc-84581e15fb8b','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='302d97ab-4304-854f-d94d-ec3e17a5da1a' AND documento_id='0ef05392-c5f9-3039-0dfc-84581e15fb8b' AND sentido='entrada' AND scenario='AS-IS');  -- AC por Exigência Cartorial · Checklist do revisor <- Minuta AC por Exigência Cartorial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'4c538593-d48a-bb90-ef79-20d149921d18','AS-IS','0ef05392-c5f9-3039-0dfc-84581e15fb8b','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='4c538593-d48a-bb90-ef79-20d149921d18' AND documento_id='0ef05392-c5f9-3039-0dfc-84581e15fb8b' AND sentido='entrada' AND scenario='AS-IS');  -- AC por Exigência Cartorial · Revisão sênior <- Minuta AC por Exigência Cartorial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'f09476f1-5ab2-2833-e894-137f1e6a4010','AS-IS','0ef05392-c5f9-3039-0dfc-84581e15fb8b','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='f09476f1-5ab2-2833-e894-137f1e6a4010' AND documento_id='0ef05392-c5f9-3039-0dfc-84581e15fb8b' AND sentido='entrada' AND scenario='AS-IS');  -- AC por Exigência Cartorial · Registro Junta Comercial <- Minuta AC por Exigência Cartorial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'fd053753-81d4-58bf-3f3f-36a081f19908','AS-IS','f1600a2c-5d15-62c4-7658-1fd51ef03f44','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='fd053753-81d4-58bf-3f3f-36a081f19908' AND documento_id='f1600a2c-5d15-62c4-7658-1fd51ef03f44' AND sentido='entrada' AND scenario='AS-IS');  -- Holdings Individuais · Checklist do revisor <- Minuta Contrato Social Holding Individual
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'3275baeb-54cf-19ff-6d3c-546a3ae7270c','AS-IS','f1600a2c-5d15-62c4-7658-1fd51ef03f44','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='3275baeb-54cf-19ff-6d3c-546a3ae7270c' AND documento_id='f1600a2c-5d15-62c4-7658-1fd51ef03f44' AND sentido='entrada' AND scenario='AS-IS');  -- Holdings Individuais · Revisão sênior <- Minuta Contrato Social Holding Individual
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'53e8a7bf-a581-432e-d3a8-d8c693ca1cd3','AS-IS','f1600a2c-5d15-62c4-7658-1fd51ef03f44','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='53e8a7bf-a581-432e-d3a8-d8c693ca1cd3' AND documento_id='f1600a2c-5d15-62c4-7658-1fd51ef03f44' AND sentido='entrada' AND scenario='AS-IS');  -- Holdings Individuais · Aprovação do cliente <- Minuta Contrato Social Holding Individual
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'d29056c3-2def-9394-c911-2d5608e6b5e1','AS-IS','f1600a2c-5d15-62c4-7658-1fd51ef03f44','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='d29056c3-2def-9394-c911-2d5608e6b5e1' AND documento_id='f1600a2c-5d15-62c4-7658-1fd51ef03f44' AND sentido='entrada' AND scenario='AS-IS');  -- Holdings Individuais · Registro Junta Comercial <- Minuta Contrato Social Holding Individual
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'09d230dc-2196-7adf-1c13-6c0c7fa4d1bc','AS-IS','d0110c24-b19a-5dd7-5310-3e0462c42eab','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='09d230dc-2196-7adf-1c13-6c0c7fa4d1bc' AND documento_id='d0110c24-b19a-5dd7-5310-3e0462c42eab' AND sentido='entrada' AND scenario='AS-IS');  -- AC Integralização Agro (cláusula 5ª) · Checklist do revisor <- Minuta AC Agro - Integralização (cl. 5ª)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'3c7b402f-9a3a-47da-a689-06fdce33d3f4','AS-IS','d0110c24-b19a-5dd7-5310-3e0462c42eab','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='3c7b402f-9a3a-47da-a689-06fdce33d3f4' AND documento_id='d0110c24-b19a-5dd7-5310-3e0462c42eab' AND sentido='entrada' AND scenario='AS-IS');  -- AC Integralização Agro (cláusula 5ª) · Revisão sênior <- Minuta AC Agro - Integralização (cl. 5ª)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'49ad70e0-1cc1-1f68-9a8c-66d914743b32','AS-IS','d0110c24-b19a-5dd7-5310-3e0462c42eab','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='49ad70e0-1cc1-1f68-9a8c-66d914743b32' AND documento_id='d0110c24-b19a-5dd7-5310-3e0462c42eab' AND sentido='entrada' AND scenario='AS-IS');  -- AC Integralização Agro (cláusula 5ª) · Registro Junta Comercial <- Minuta AC Agro - Integralização (cl. 5ª)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'a0cbb457-9bf8-eb3e-e6bf-e69d9d4b72b8','AS-IS','79d9c6c3-a08c-ce0e-2a85-ef6544b86a69','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='a0cbb457-9bf8-eb3e-e6bf-e69d9d4b72b8' AND documento_id='79d9c6c3-a08c-ce0e-2a85-ef6544b86a69' AND sentido='entrada' AND scenario='AS-IS');  -- AC Integralização Agro (cláusula 5ª) · Cliente atualiza matrículas no cartório <- AC Agro - Integralização registrada
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'e9ebb0e6-469e-f1a2-d466-a97eb75fbab2','AS-IS','3024d66f-061a-9655-b20b-c9b12b41df13','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='e9ebb0e6-469e-f1a2-d466-a97eb75fbab2' AND documento_id='3024d66f-061a-9655-b20b-c9b12b41df13' AND sentido='entrada' AND scenario='AS-IS');  -- AC Imóvel Adicional (2º momento) · Checklist do revisor <- Minuta AC Agro - Imóvel Adicional (2º momento)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'ca55b565-c0b6-b610-b83e-69d846a481f3','AS-IS','3024d66f-061a-9655-b20b-c9b12b41df13','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='ca55b565-c0b6-b610-b83e-69d846a481f3' AND documento_id='3024d66f-061a-9655-b20b-c9b12b41df13' AND sentido='entrada' AND scenario='AS-IS');  -- AC Imóvel Adicional (2º momento) · Revisão sênior <- Minuta AC Agro - Imóvel Adicional (2º momento)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'66251651-98e4-7e6f-7969-d8f2e605765e','AS-IS','3024d66f-061a-9655-b20b-c9b12b41df13','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='66251651-98e4-7e6f-7969-d8f2e605765e' AND documento_id='3024d66f-061a-9655-b20b-c9b12b41df13' AND sentido='entrada' AND scenario='AS-IS');  -- AC Imóvel Adicional (2º momento) · Registro Junta Comercial <- Minuta AC Agro - Imóvel Adicional (2º momento)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'0fceded8-7d78-a1d5-0dca-0d1819b12bcf','AS-IS','55c81c63-c52f-465d-b353-f8472d4edc64','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='0fceded8-7d78-a1d5-0dca-0d1819b12bcf' AND documento_id='55c81c63-c52f-465d-b353-f8472d4edc64' AND sentido='entrada' AND scenario='AS-IS');  -- Reorganização Societária (Cisão · Fusão · Incorporação) · Checklist do revisor <- Minuta AC Reorganização
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'326ef6d4-dd4a-5b82-035b-b8aaf515b164','AS-IS','55c81c63-c52f-465d-b353-f8472d4edc64','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='326ef6d4-dd4a-5b82-035b-b8aaf515b164' AND documento_id='55c81c63-c52f-465d-b353-f8472d4edc64' AND sentido='entrada' AND scenario='AS-IS');  -- Reorganização Societária (Cisão · Fusão · Incorporação) · Revisão sênior <- Minuta AC Reorganização
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'8d113903-f0fd-65ed-77f6-c4070736a97b','AS-IS','55c81c63-c52f-465d-b353-f8472d4edc64','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='8d113903-f0fd-65ed-77f6-c4070736a97b' AND documento_id='55c81c63-c52f-465d-b353-f8472d4edc64' AND sentido='entrada' AND scenario='AS-IS');  -- Reorganização Societária (Cisão · Fusão · Incorporação) · Registro Junta Comercial <- Minuta AC Reorganização
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'b9bd4586-2b0b-56d1-2ce2-433f35663b7c','AS-IS','14015dbd-bdda-95a5-6e4c-825f0fa28965','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='b9bd4586-2b0b-56d1-2ce2-433f35663b7c' AND documento_id='14015dbd-bdda-95a5-6e4c-825f0fa28965' AND sentido='entrada' AND scenario='AS-IS');  -- Distrato de Arrendamento Pré-existente · Checklist do revisor <- Minuta de Distrato de Arrendamento
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'6e120d01-5e00-fe53-04d9-52683003c299','AS-IS','14015dbd-bdda-95a5-6e4c-825f0fa28965','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='6e120d01-5e00-fe53-04d9-52683003c299' AND documento_id='14015dbd-bdda-95a5-6e4c-825f0fa28965' AND sentido='entrada' AND scenario='AS-IS');  -- Distrato de Arrendamento Pré-existente · Revisão sênior <- Minuta de Distrato de Arrendamento
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'474e2172-57da-1c31-dec8-d4ec2229dad6','AS-IS','14015dbd-bdda-95a5-6e4c-825f0fa28965','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='474e2172-57da-1c31-dec8-d4ec2229dad6' AND documento_id='14015dbd-bdda-95a5-6e4c-825f0fa28965' AND sentido='entrada' AND scenario='AS-IS');  -- Distrato de Arrendamento Pré-existente · Registro em cartório <- Minuta de Distrato de Arrendamento
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'2579f112-bd71-ee39-7438-f67d7029c33a','AS-IS','87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='2579f112-bd71-ee39-7438-f67d7029c33a' AND documento_id='87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Composse · Checklist do revisor <- Minuta Contrato de Composse + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'bbed57e9-51ca-6564-61ce-3b490d1701cf','AS-IS','87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='bbed57e9-51ca-6564-61ce-3b490d1701cf' AND documento_id='87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Composse · Revisão sênior <- Minuta Contrato de Composse + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'f63ff5db-45d8-717a-2493-6d6b37effbf3','AS-IS','87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='f63ff5db-45d8-717a-2493-6d6b37effbf3' AND documento_id='87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Composse · Assinatura <- Minuta Contrato de Composse + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'165df8fa-052d-bf2a-7450-4964d801cc74','AS-IS','87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='165df8fa-052d-bf2a-7450-4964d801cc74' AND documento_id='87ea7a0a-4c41-e0a3-4f1a-6d69a3a29b3a' AND sentido='entrada' AND scenario='AS-IS');  -- Contrato de Composse · Registro em cartório <- Minuta Contrato de Composse + Anexo
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'7e14a966-518a-9d38-a1af-21dd21ec955e','AS-IS','62f462ad-17dc-5bc2-4e3c-35931d7db7e7','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='7e14a966-518a-9d38-a1af-21dd21ec955e' AND documento_id='62f462ad-17dc-5bc2-4e3c-35931d7db7e7' AND sentido='entrada' AND scenario='AS-IS');  -- Termo de Encerramento de Safra · Checklist do revisor <- Termo de Encerramento de Safra
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'7b181537-fc3c-4e66-b778-e8e63bf2fa0c','AS-IS','62f462ad-17dc-5bc2-4e3c-35931d7db7e7','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='7b181537-fc3c-4e66-b778-e8e63bf2fa0c' AND documento_id='62f462ad-17dc-5bc2-4e3c-35931d7db7e7' AND sentido='entrada' AND scenario='AS-IS');  -- Termo de Encerramento de Safra · Registro em cartório <- Termo de Encerramento de Safra
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'56b2ea93-1eaa-2824-06c7-097a3b6c68b3','AS-IS','0ed165ce-aa06-3fcd-5e8d-331a27b9f934','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='56b2ea93-1eaa-2824-06c7-097a3b6c68b3' AND documento_id='0ed165ce-aa06-3fcd-5e8d-331a27b9f934' AND sentido='entrada' AND scenario='AS-IS');  -- Apresentação Final de Sucessão · Apresentar ao cliente <- Apresentação Final de Sucessão (3 cenários ITCMD)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'22f74a37-792c-316d-c66a-d33dc4311fa7','AS-IS','0ed165ce-aa06-3fcd-5e8d-331a27b9f934','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='22f74a37-792c-316d-c66a-d33dc4311fa7' AND documento_id='0ed165ce-aa06-3fcd-5e8d-331a27b9f934' AND sentido='entrada' AND scenario='AS-IS');  -- Apresentação Final de Sucessão · Cliente escolhe cenário <- Apresentação Final de Sucessão (3 cenários ITCMD)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'e55ecb70-1317-61ca-29f6-428a0c2bd3f9','AS-IS','290ebe12-60be-ee09-dcec-4f36041ead14','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='e55ecb70-1317-61ca-29f6-428a0c2bd3f9' AND documento_id='290ebe12-60be-ee09-dcec-4f36041ead14' AND sentido='entrada' AND scenario='AS-IS');  -- Doação + AC Reflexo (unificado) · Definir reserva de usufruto <- Minuta Instrumento de Doação de Cotas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'11c86abd-0c39-21dc-371c-73017963effa','AS-IS','290ebe12-60be-ee09-dcec-4f36041ead14','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='11c86abd-0c39-21dc-371c-73017963effa' AND documento_id='290ebe12-60be-ee09-dcec-4f36041ead14' AND sentido='entrada' AND scenario='AS-IS');  -- Doação + AC Reflexo (unificado) · Inserir cláusulas restritivas <- Minuta Instrumento de Doação de Cotas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'fd49cbf5-e8ce-bc92-492a-e392966e7b8f','AS-IS','3a773117-3449-a4c8-13df-8b906cf87dd3','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='fd49cbf5-e8ce-bc92-492a-e392966e7b8f' AND documento_id='3a773117-3449-a4c8-13df-8b906cf87dd3' AND sentido='entrada' AND scenario='AS-IS');  -- Doação + AC Reflexo (unificado) · Checklist do revisor <- Minuta AC Participações - Reflexo da Doação
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'0a73a59b-0bc0-86e5-a797-6df1e06b2dc4','AS-IS','3a773117-3449-a4c8-13df-8b906cf87dd3','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='0a73a59b-0bc0-86e5-a797-6df1e06b2dc4' AND documento_id='3a773117-3449-a4c8-13df-8b906cf87dd3' AND sentido='entrada' AND scenario='AS-IS');  -- Doação + AC Reflexo (unificado) · Revisão sênior <- Minuta AC Participações - Reflexo da Doação
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'4b300d00-a8d9-cbde-a70a-ea919b08220c','AS-IS','c00e922c-8deb-d17c-039e-22876b2b69e9','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='4b300d00-a8d9-cbde-a70a-ea919b08220c' AND documento_id='c00e922c-8deb-d17c-039e-22876b2b69e9' AND sentido='entrada' AND scenario='AS-IS');  -- Doação + AC Reflexo (unificado) · Averbação simultânea na Junta (doação + AC) <- Instrumento de Doação assinado
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'570552f2-d873-0637-5920-94bf61268a35','AS-IS','b6ca10c5-56ec-17be-10a6-da8d25d1e9de','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='570552f2-d873-0637-5920-94bf61268a35' AND documento_id='b6ca10c5-56ec-17be-10a6-da8d25d1e9de' AND sentido='entrada' AND scenario='AS-IS');  -- Testamento (alternativa à doação) · Lavratura em cartório de notas <- Minuta de Testamento
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'97f321d7-3eff-844b-b1cb-909fb66bc03d','AS-IS','b6ca10c5-56ec-17be-10a6-da8d25d1e9de','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='97f321d7-3eff-844b-b1cb-909fb66bc03d' AND documento_id='b6ca10c5-56ec-17be-10a6-da8d25d1e9de' AND sentido='entrada' AND scenario='AS-IS');  -- Testamento (alternativa à doação) · Registro na central de testamentos <- Minuta de Testamento
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'b5e2427d-71cb-5367-b3af-8413c68d90b9','AS-IS','b118f13a-ec33-3bee-aebe-bb1dcd3b1e79','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='b5e2427d-71cb-5367-b3af-8413c68d90b9' AND documento_id='b118f13a-ec33-3bee-aebe-bb1dcd3b1e79' AND sentido='entrada' AND scenario='AS-IS');  -- Acordo de Quotistas · Checklist do revisor <- Minuta Acordo de Quotistas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'c84b25c0-778e-19e0-e9c4-728bc07d69f2','AS-IS','b118f13a-ec33-3bee-aebe-bb1dcd3b1e79','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='c84b25c0-778e-19e0-e9c4-728bc07d69f2' AND documento_id='b118f13a-ec33-3bee-aebe-bb1dcd3b1e79' AND sentido='entrada' AND scenario='AS-IS');  -- Acordo de Quotistas · Revisão sênior <- Minuta Acordo de Quotistas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'d4a171eb-c987-d807-45b3-9a53588797c4','AS-IS','b118f13a-ec33-3bee-aebe-bb1dcd3b1e79','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='d4a171eb-c987-d807-45b3-9a53588797c4' AND documento_id='b118f13a-ec33-3bee-aebe-bb1dcd3b1e79' AND sentido='entrada' AND scenario='AS-IS');  -- Acordo de Quotistas · Reunião com cliente para discutir cláusulas <- Minuta Acordo de Quotistas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'49fd03ae-0d59-cb5d-d55a-de09e09f8627','AS-IS','b118f13a-ec33-3bee-aebe-bb1dcd3b1e79','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='49fd03ae-0d59-cb5d-d55a-de09e09f8627' AND documento_id='b118f13a-ec33-3bee-aebe-bb1dcd3b1e79' AND sentido='entrada' AND scenario='AS-IS');  -- Acordo de Quotistas · Assinatura <- Minuta Acordo de Quotistas
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'3d74ead5-8c38-8aef-789e-61a1a694ecf8','AS-IS','f5456c11-cb90-38ae-df5b-d78a2de20fa3','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='3d74ead5-8c38-8aef-789e-61a1a694ecf8' AND documento_id='f5456c11-cb90-38ae-df5b-d78a2de20fa3' AND sentido='entrada' AND scenario='AS-IS');  -- Protocolo de Remuneração · Aprovação do cliente <- Protocolo de Remuneração (final)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'b0075581-b737-3cc1-24dd-9908c76a875a','AS-IS','c9b5e0f7-bf5f-64fa-c2b8-6931a0c62a5f','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='b0075581-b737-3cc1-24dd-9908c76a875a' AND documento_id='c9b5e0f7-bf5f-64fa-c2b8-6931a0c62a5f' AND sentido='entrada' AND scenario='AS-IS');  -- Matriz de Alçadas · Aprovação do cliente <- DAC - Descrição e Análise de Cargo dos Diretores
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'8046acda-f9a3-c295-a4be-946469c22b0d','AS-IS','8f98b54e-a202-e3a7-8789-182418a80ae7','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='8046acda-f9a3-c295-a4be-946469c22b0d' AND documento_id='8f98b54e-a202-e3a7-8789-182418a80ae7' AND sentido='entrada' AND scenario='AS-IS');  -- Regimento Interno do Conselho · Aprovação do conselho <- Regimento Interno do Conselho
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'7dff44d9-baa3-28cf-7960-222d33533eb0','AS-IS','63cec0a8-c702-db9a-268c-f5b35a5f4d62','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='7dff44d9-baa3-28cf-7960-222d33533eb0' AND documento_id='63cec0a8-c702-db9a-268c-f5b35a5f4d62' AND sentido='entrada' AND scenario='AS-IS');  -- AC Reflexo da Governança (Participações) · Checklist do revisor <- Minuta AC Participações - Reflexo Governança
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'96f1e680-5e63-83b0-29d6-d0905cc15900','AS-IS','63cec0a8-c702-db9a-268c-f5b35a5f4d62','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='96f1e680-5e63-83b0-29d6-d0905cc15900' AND documento_id='63cec0a8-c702-db9a-268c-f5b35a5f4d62' AND sentido='entrada' AND scenario='AS-IS');  -- AC Reflexo da Governança (Participações) · Revisão sênior <- Minuta AC Participações - Reflexo Governança
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'f5f59ff0-c0a4-af92-7a75-af71f16eaa3a','AS-IS','63cec0a8-c702-db9a-268c-f5b35a5f4d62','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='f5f59ff0-c0a4-af92-7a75-af71f16eaa3a' AND documento_id='63cec0a8-c702-db9a-268c-f5b35a5f4d62' AND sentido='entrada' AND scenario='AS-IS');  -- AC Reflexo da Governança (Participações) · Registro Junta Comercial <- Minuta AC Participações - Reflexo Governança
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'e800a7fd-cda5-9948-5ec7-131a1809ce22','AS-IS','faf6391e-60b1-b6e9-3c0d-45fed002e195','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='e800a7fd-cda5-9948-5ec7-131a1809ce22' AND documento_id='faf6391e-60b1-b6e9-3c0d-45fed002e195' AND sentido='entrada' AND scenario='AS-IS');  -- Finalização do Projeto · Apresentar/entregar relatório ao cliente <- Relatório final do projeto
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'a8677f27-b1f8-4f09-5b7f-4055182cbc58','AS-IS','76f00f50-e52d-4f65-679b-e39cb441b168','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='a8677f27-b1f8-4f09-5b7f-4055182cbc58' AND documento_id='76f00f50-e52d-4f65-679b-e39cb441b168' AND sentido='entrada' AND scenario='AS-IS');  -- Apresentação do Projeto · Cliente aprova estrutura <- Apresentação do Projeto (PPT)
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'8b4479dd-f8bc-990a-910c-cbc94262a8f1','AS-IS','77a5d15d-7dde-4a8c-a88d-53f7e6828e19','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='8b4479dd-f8bc-990a-910c-cbc94262a8f1' AND documento_id='77a5d15d-7dde-4a8c-a88d-53f7e6828e19' AND sentido='entrada' AND scenario='AS-IS');  -- Formalização do Projeto · Submeter à aprovação do cliente <- Projeto de Sucessão Empresarial
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume)
  SELECT gen_random_uuid(),'8230cb5f-64c1-ae41-f683-27ea17edcda3','AS-IS','77a5d15d-7dde-4a8c-a88d-53f7e6828e19','entrada',1
  WHERE NOT EXISTS (SELECT 1 FROM public.etapa_documentos WHERE etapa_id='8230cb5f-64c1-ae41-f683-27ea17edcda3' AND documento_id='77a5d15d-7dde-4a8c-a88d-53f7e6828e19' AND sentido='entrada' AND scenario='AS-IS');  -- Formalização do Projeto · Assinar contrato PSA × cliente <- Projeto de Sucessão Empresarial

COMMIT;
