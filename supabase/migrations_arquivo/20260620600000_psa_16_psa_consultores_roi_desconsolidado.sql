-- PSA Consultores MAPA — psa_16 (ex-"Parte 8"): ROI desconsolidado (só campos NATIVOS do MAPA)
-- RENOMEADA: o timestamp antigo (20260619100000) colidia com psa_08_reestrutura_projetos_osg
-- (JÁ APLICADA) → o runner pularia esta sem rodar. Novo timestamp 20260620600000; roda DEPOIS
-- da psa_15 (grão-processo). GRÃO NOVO (gargalo/melhoria = PROCESSO): o investimento é atribuído
-- ao processo SÓ via melhoria_processos (vínculo direto) — não existe mais gargalo_melhorias.
-- Por isso toda melhoria com one_time>0 precisa de ≥1 melhoria_processos (guard na validação).
-- Objetivo: reproduzir os totais do MAPA no Dashboard ROI nativo (calcularRoi),
-- preenchendo apenas campos que os formulários do MAPA expõem. NÃO altera campos
-- legado do Digital Rotina (financial_impact, cost_monthly, last_*, baseline_*,
-- improved_*, cost_saved_*, roi_percentage, lead_time_days, error_cost, error_volume)
-- e NÃO toca no roiCalculator (outros clusters seguem calculando normalmente).
--
-- Alvos (verificados): economia 12m = R$ 316.697 | investimento total = R$ 45.844.
-- Derivação em Mapeamento/roi/output/fill_*.csv (a partir dos 12 dashboards v2 + 5 derivados).
-- Formatos validados no frontend: execution ∈ (manual|semi_automatica|automatica);
-- rework_rate/error_rate = fração 0–1 (input em %, ÷100, clamp ≤1); volume_per_process ≥0;
-- horas numérico ≥0; one_time_external_cost = R$ (numeric).

BEGIN;

-- ============================================================
-- 1. etapa_responsaveis.horas — AS-IS e TO-BE (por id; sem updated_at na tabela)
--    horas_unit = (custo-alvo do processo ÷ taxa job_role ÷ volume); ficou = era×(1−redução)
-- ============================================================
UPDATE public.etapa_responsaveis er SET horas = v.horas
FROM (VALUES
  ('fad690a5-4536-5f22-4e13-4f1981547db0'::uuid,3.693405),
  ('fd2231e6-2716-4a91-afc3-522d00725961'::uuid,0.554011),
  ('abab4f68-d3dd-d9c9-614e-f249dc97cda0'::uuid,3.693405),
  ('5813ea0b-e8a0-471a-95a0-6448a54939ac'::uuid,0.554011),
  ('9224634a-b29b-774a-beaf-39a93784dc00'::uuid,3.693405),
  ('496de4e8-3f63-4fbf-a3d9-5fc95ec778f7'::uuid,0.554011),
  ('26a138ae-f43b-50a1-2ad7-51a3008b0afd'::uuid,3.693405),
  ('abfa3476-68c7-4c9d-849a-983e4d42b39a'::uuid,0.554011),
  ('b8c7495e-aa7c-205c-13d8-b57c84642612'::uuid,3.693405),
  ('75918c63-4fad-4da7-84a6-0e6c27c8bd9e'::uuid,0.554011),
  ('1a54af86-8267-5afd-e55e-4b309780120f'::uuid,1.011347),
  ('e7f67444-2c0b-4dcf-874a-2047277f6195'::uuid,0.556241),
  ('db26c8f0-7154-7e4d-e459-7e46f0c1e548'::uuid,1.011347),
  ('ed337593-f44b-4697-b30b-c5d83620db33'::uuid,0.556241),
  ('dcfbd3c6-0fa6-8826-3429-5c68d2f02cda'::uuid,1.011347),
  ('028141fa-d29e-4321-a361-b5fdca01d64b'::uuid,0.556241),
  ('f2e9fd9d-8385-6baf-8647-0830e8f84c58'::uuid,1.011347),
  ('eceb1f15-6085-4021-8890-41648023af9b'::uuid,0.556241),
  ('99db7aee-7d8b-8587-d378-9953c8c648d7'::uuid,1.011347),
  ('8c97ada1-dc90-4c35-a40a-c31696c2598f'::uuid,0.556241),
  ('7ff03e1a-e142-7c5a-7441-907770afde5a'::uuid,1.011347),
  ('70b7dc5e-810e-45e8-a19d-60f96adf93a1'::uuid,0.556241),
  ('21dc5fec-d689-5ecd-9988-d05f5c2d656a'::uuid,1.011347),
  ('b0564f2c-1753-42f6-9002-ad003a945694'::uuid,0.556241),
  ('44057c39-b5ea-b1c8-61a2-1bfd762dd69a'::uuid,1.011347),
  ('5231cd56-b4eb-4daa-966a-8e0bb996b66e'::uuid,0.556241),
  ('8406d709-26e8-b5e9-0be5-6f0fde207cf4'::uuid,1.011347),
  ('1364cda9-8338-4515-aff6-856e46344340'::uuid,0.556241),
  ('6b3c71bb-bd1b-c16b-d742-d39bfcccc1e9'::uuid,0.016874),
  ('30767caa-a754-453f-8a1d-be3ab8775250'::uuid,0.009281),
  ('e345c106-1992-ab3d-7a2c-554366b98eab'::uuid,0.016874),
  ('6c9b83ac-e7d4-4c40-99f6-eed5144c0d88'::uuid,0.009281),
  ('94c7a01c-6801-5508-5097-d90250d2b05c'::uuid,2.562771),
  ('96930bfe-27c0-47d7-b58c-732177aaf561'::uuid,1.153247),
  ('fa8579aa-f0ba-0df5-cbd7-0700f3c5dd3b'::uuid,2.562771),
  ('157640dd-59a6-43dd-89f7-44c051049895'::uuid,1.153247),
  ('3fa6f83c-5379-7323-373b-e3d91226d140'::uuid,0.137995),
  ('b637560d-5fb3-4701-9385-3892109121cc'::uuid,0.084177),
  ('2a71b9d1-d1f4-7779-8188-77630fb923af'::uuid,0.137995),
  ('75bac635-c368-47e5-a0db-1472af55c200'::uuid,0.084177),
  ('16af3a42-9faa-6f60-573b-0c94915a8b13'::uuid,0.137995),
  ('9c375ff9-f816-4a37-a3f0-2bd318589f14'::uuid,0.084177),
  ('ba54f829-d2b4-7a69-c9f2-374f72d07713'::uuid,0.137995),
  ('ff2c6bd8-a3ba-408a-bcfa-8b98e80d2d9d'::uuid,0.084177),
  ('b3977fc9-3fba-13d6-4fa7-3d08fc0779e9'::uuid,0.137995),
  ('6530a7bf-5cbd-4a82-8179-9f8b5ce7d2f6'::uuid,0.084177),
  ('9e7f9453-e667-e6bb-3aa8-62fcf361b44f'::uuid,0.137995),
  ('b2b93a63-9463-475e-8c36-6aa6074693eb'::uuid,0.084177),
  ('e9684047-45cf-6617-4eec-135eb868b092'::uuid,0.137995),
  ('85a51dd2-4a34-40f0-a848-c4da621e9584'::uuid,0.084177),
  ('16b3a197-b9d9-9110-8ad3-d516cd9292af'::uuid,0.004271),
  ('7894829c-5e2b-4398-a583-e3015f3eb2c2'::uuid,0.002135),
  ('6f659837-f853-b764-6a33-9e884ca04213'::uuid,0.062885),
  ('cdc272ab-3463-4dab-a419-a81fd3776903'::uuid,0.044019),
  ('84304f6f-eb92-7d00-e1f9-6acd38ec8584'::uuid,0.062885),
  ('d90e9bc3-a530-4733-bc75-f0506a56ffea'::uuid,0.044019),
  ('55b81ce4-aa92-bed1-a094-08c20763306e'::uuid,0.005891),
  ('9954e387-9615-44ce-9706-73ee3d9a52b7'::uuid,0.003829),
  ('13b2856c-412c-e9d7-4a30-a703f0307e9b'::uuid,0.005891),
  ('744b6225-bd32-48d8-b8ca-5794add33939'::uuid,0.003829),
  ('3c8b3a9e-c51a-2128-4fbb-ebf7af344e63'::uuid,0.005891),
  ('df02449f-9c54-4947-a670-d2facd728c5d'::uuid,0.003829),
  ('3166545d-19e4-7588-0084-dd1824db6ee9'::uuid,0.005891),
  ('cf9f5ec1-e24f-4839-945f-43385574ed63'::uuid,0.003829),
  ('5cd835df-be4f-5ff9-a51c-47d2726d709c'::uuid,0.005891),
  ('df850384-32af-48b1-bc9e-7927d6db52ff'::uuid,0.003829),
  ('d08eab03-6698-37c6-506f-d6905fd7f34e'::uuid,0.005891),
  ('14be6bd7-7770-4e54-906b-d8845a979943'::uuid,0.003829),
  ('63bc3de9-ebb2-4d8c-9fc1-22047bb04b99'::uuid,0.005891),
  ('e6863861-ee9b-46a1-8fa8-d049e5caa2a5'::uuid,0.003829),
  ('55cb6914-e5cd-9baa-fd75-4cbfb416d104'::uuid,0.005891),
  ('46a697bb-a320-45d2-9120-93e18b9a00f0'::uuid,0.003829),
  ('9110fa1e-7f12-9815-a9bc-b4b20723148c'::uuid,0.005891),
  ('e5a5a737-fc04-409c-8ab5-e555f55396b8'::uuid,0.003829),
  ('9b212289-199a-d399-b694-1be0155a0490'::uuid,0.005891),
  ('5a401fac-d561-41de-8e4d-b43854c07a67'::uuid,0.003829),
  ('704014cb-7fd5-a0f4-51f5-d26ab0802d0d'::uuid,0.815427),
  ('b5eeb5e8-2bc9-4390-b7f4-6cc0b7fefa0c'::uuid,0.407714),
  ('f16c594d-b735-c545-df42-88cc32d04ec6'::uuid,0.815427),
  ('e25c04c6-a568-46e2-8c3b-6bb16885812b'::uuid,0.407714),
  ('f550956c-8648-2416-b920-963e76839a22'::uuid,0.815427),
  ('f9bff0c8-9b88-4ce2-9459-cd7f066b6c57'::uuid,0.407714),
  ('0f1f8411-da24-8f48-e81f-5bd3b5f38d1b'::uuid,0.815427),
  ('992946c2-75d8-46f5-909b-013e3d749422'::uuid,0.407714),
  ('6fc9417a-b4fa-c97e-07b6-0fa88759f01c'::uuid,0.815427),
  ('417c985f-0365-4de9-91e2-4aeb1da3bb32'::uuid,0.407714),
  ('3f0a7f7a-2a0d-2cc1-f549-f3f5ed103d03'::uuid,0.815427),
  ('f7a7482f-44aa-461c-8bbb-cb3e5cad7953'::uuid,0.407714),
  ('5878c42f-6cfd-1e79-f421-e6120f8dedc6'::uuid,0.815427),
  ('b9b68b21-2721-4c3a-ae88-471d0935ec0f'::uuid,0.407714),
  ('eb744afd-d777-61f6-7a4b-4d0af0efbfc0'::uuid,0.815427),
  ('7605bf9f-a31d-4e46-9a2f-6ca0ba6bccc0'::uuid,0.407714),
  ('42deaf4f-8652-c588-49c3-19c42e4939d2'::uuid,0.815427),
  ('9f6e1958-c679-4db8-b015-ac7beb1a0a1c'::uuid,0.407714),
  ('6b8994a3-7672-0f0e-2358-b046345dabfb'::uuid,0.036264),
  ('ed0bad7a-463b-4dfc-a374-10f4e2c6492b'::uuid,0.025385),
  ('0d614a56-43ab-4d93-bedd-4b05538ec5f9'::uuid,0.064685),
  ('01c55b8a-83fd-4d80-843d-b5e65dd33336'::uuid,0.048514),
  ('6e12f795-829f-4bcd-24b8-0fd49c31a1b5'::uuid,0.064685),
  ('8afc703a-f43e-4e6e-aab7-bddbb1ceb90b'::uuid,0.048514),
  ('8d64794b-afbb-4ac4-6cc6-dcc13ba79c96'::uuid,0.064685),
  ('461161e3-c6e4-406a-bf11-de9f3afc44d1'::uuid,0.048514),
  ('7c384ecb-9cba-90d8-7b25-adcc93772898'::uuid,0.465734),
  ('8ac67e38-efd5-438f-9699-98788abc374d'::uuid,0.20958),
  ('cd4e32a3-2f12-4c05-2fd7-82d06368fc79'::uuid,0.08),
  ('f55b2020-1a91-460e-acdb-42876e0b94a0'::uuid,0.012),
  ('b68fc966-c6e0-9d35-c461-17fe8ca739b5'::uuid,0.001621),
  ('4c89bb64-bf60-4eb7-bed8-0ef044606101'::uuid,0.000324),
  ('0f435026-728d-b191-f64a-6418dbe998eb'::uuid,0.734752),
  ('f5ee2604-5384-4d87-b52f-9404a51eafb2'::uuid,0.404114),
  ('23c43f6b-80c1-7326-d509-5b2ab42f1689'::uuid,0.734752),
  ('655d578b-ebdc-409c-aaa6-91b506ff50de'::uuid,0.404114),
  ('442fcc66-f44b-eb43-4f38-9f8bfe7322d9'::uuid,0.734752),
  ('8f53f7e4-30ac-4c6a-971e-a0a97e504dc4'::uuid,0.404114),
  ('b742a740-932d-7835-a67e-6dba4fadad3b'::uuid,0.734752),
  ('7f7249a1-07c2-445e-b5d9-4fc8db3afd52'::uuid,0.404114),
  ('2c770648-98c1-ed2b-3163-22ff67b7c7c5'::uuid,0.734752),
  ('3fda28dc-1a3f-4cfd-9cc7-29be493138db'::uuid,0.404114),
  ('c23e427c-8847-ba43-3a8d-f6ff0fed5c45'::uuid,0.734752),
  ('0959bf2a-19a8-44de-ad61-e7ae2649a0c3'::uuid,0.404114),
  ('fe86e6b6-a053-6cd8-18ba-c11249e934ad'::uuid,0.734752),
  ('14a7b34a-f2bd-4a09-9d96-28b8bb52e3eb'::uuid,0.404114),
  ('652a3445-cfe5-c5df-00ca-27db80f5fef9'::uuid,0.734752),
  ('69fb42e5-5f6a-4f47-af20-111bf3292d98'::uuid,0.404114),
  ('48216f96-5e28-a414-d291-70d457e5e978'::uuid,0.000164),
  ('f3c94aa2-cfaf-4e27-a6ee-1768f8682fe3'::uuid,0.000115),
  ('0ff3f601-fd7d-a5c0-9acf-97c18346cfa8'::uuid,0.000164),
  ('3ad0e35f-9f6f-434e-b84c-8e59a2ab2898'::uuid,0.000115),
  ('21807740-71ef-dfe6-38cb-b6a8a47248a4'::uuid,0.000164),
  ('ac8e4db1-8d4f-4df2-9c15-5de132b66324'::uuid,0.000115),
  ('f85e4744-08c2-8177-cf14-f1b2f75838d2'::uuid,0.000164),
  ('66f23006-651f-48cf-b8b6-4a158e9739ec'::uuid,0.000115),
  ('6c1c1240-03fb-b521-b6bd-26e8fc8eb71a'::uuid,0.000164),
  ('e2f0a0c9-e8b1-4b89-85a6-b66f21626779'::uuid,0.000115),
  ('87d51d6a-943d-fa2c-42a8-292f9014e24c'::uuid,0.000164),
  ('1fde40a6-e67d-409e-80d3-6afec581ea50'::uuid,0.000115),
  ('c2d4d7c8-e9b8-7f58-86a3-ee7d9e6755c9'::uuid,0.000164),
  ('bfdeabe7-fe70-462a-aa25-480b2bd05bba'::uuid,0.000115),
  ('cfca9388-0194-1c5e-9149-b27772cf0d2b'::uuid,0.000164),
  ('130508bc-5279-44a5-879d-923bc22ffb1b'::uuid,0.000115),
  ('27d6e56e-c8cb-7bea-ba71-daa73be148e2'::uuid,0.000164),
  ('aaf6deed-0ffb-4c20-9943-5c3c2df5ad5d'::uuid,0.000115),
  ('c932df5d-12bd-b30a-c090-7258fad8a1a7'::uuid,0.000164),
  ('c8fcad06-37d4-4ba2-82ca-8a228d303b93'::uuid,0.000115),
  ('38e08cb2-1abf-35e7-946d-c850c8c4a3d0'::uuid,0.000164),
  ('b1b5f5d8-9f2c-483b-9483-b3f21dc2c329'::uuid,0.000115),
  ('d4ea37ed-3b54-7034-7d9d-4ec46f33bada'::uuid,0.013528),
  ('0f64b825-b164-4206-8618-2abf94ba335d'::uuid,0.006088),
  ('f0946d55-1060-7a66-5489-0c275220363d'::uuid,0.013528),
  ('9c8f6c3d-6b69-4ceb-91ac-d8be7debeb19'::uuid,0.006088),
  ('e724948a-3865-0ed4-2a97-037caccf7a0c'::uuid,0.013528),
  ('e78c6b64-85fe-4b16-a898-57d2a196625f'::uuid,0.006088),
  ('dae734d3-b447-e2d7-364f-a6387e7b8691'::uuid,0.013528),
  ('38257449-3ca5-430c-9afa-0cb9551d7ae2'::uuid,0.006088)
) AS v(id, horas)
WHERE er.id = v.id;

-- ============================================================
-- 2. process_stages — volume_per_process, rework_rate, error_rate (AS-IS+TO-BE)
--    + execution no cenário TO-BE = 'automatica'. AS-IS mantém a execução atual.
-- ============================================================
UPDATE public.process_stages ps SET
  volume_per_process = v.vol,
  rework_rate        = v.rw,
  error_rate         = v.err,
  execution          = COALESCE(v.exec, ps.execution),
  updated_at         = NOW()
FROM (VALUES
  ('cf0a667b-72ff-95c3-8474-cd4676ed8e95'::uuid,'AS-IS',5,0.0746,0.0746,NULL::text),
  ('cf0a667b-72ff-95c3-8474-cd4676ed8e95'::uuid,'TO-BE',5,0.0187,0.0187,'automatica'::text),
  ('f4ca35c8-a57f-9ab5-c492-3a49a392272d'::uuid,'AS-IS',5,0.0746,0.0746,NULL::text),
  ('f4ca35c8-a57f-9ab5-c492-3a49a392272d'::uuid,'TO-BE',5,0.0187,0.0187,'automatica'::text),
  ('48334175-fba9-57ff-59d8-a3e8270931bb'::uuid,'AS-IS',5,0.0746,0.0746,NULL::text),
  ('48334175-fba9-57ff-59d8-a3e8270931bb'::uuid,'TO-BE',5,0.0187,0.0187,'automatica'::text),
  ('4c89d66e-5fee-1bf7-53bb-197f745ee0ec'::uuid,'AS-IS',5,0.0746,0.0746,NULL::text),
  ('4c89d66e-5fee-1bf7-53bb-197f745ee0ec'::uuid,'TO-BE',5,0.0187,0.0187,'automatica'::text),
  ('3a7a268f-955e-7ce0-56d6-6a4a23801f77'::uuid,'AS-IS',5,0.0746,0.0746,NULL::text),
  ('3a7a268f-955e-7ce0-56d6-6a4a23801f77'::uuid,'TO-BE',5,0.0187,0.0187,'automatica'::text),
  ('e77390b5-3027-efa9-ec7d-4372bbe539ee'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('e77390b5-3027-efa9-ec7d-4372bbe539ee'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('49835daa-e9da-9dbb-cc57-e7f8c8d4fd1a'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('49835daa-e9da-9dbb-cc57-e7f8c8d4fd1a'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('62bd778c-9c66-a254-c32f-feea6d50a445'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('62bd778c-9c66-a254-c32f-feea6d50a445'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('14fc0e9b-7443-3a25-04f7-f90b598ead2d'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('14fc0e9b-7443-3a25-04f7-f90b598ead2d'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('49ea19ca-ff1d-e387-eba9-ea0d3326f221'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('49ea19ca-ff1d-e387-eba9-ea0d3326f221'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('0dabbccb-5115-5df8-eca8-51434561fc49'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('0dabbccb-5115-5df8-eca8-51434561fc49'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('d9d8afbf-0072-ea8a-25d9-5a02caf91e8d'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('d9d8afbf-0072-ea8a-25d9-5a02caf91e8d'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('9869d1c6-3ba7-cefc-e3f6-45e0030333ad'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('9869d1c6-3ba7-cefc-e3f6-45e0030333ad'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('ccc6298f-77e2-215e-3d85-75a1a66cf728'::uuid,'AS-IS',14,0.0424,0.0424,NULL::text),
  ('ccc6298f-77e2-215e-3d85-75a1a66cf728'::uuid,'TO-BE',14,0.017,0.017,'automatica'::text),
  ('80b4dd4e-fb4c-a872-45bd-8cb6aba5cce3'::uuid,'AS-IS',300,0.0082,0.0082,NULL::text),
  ('80b4dd4e-fb4c-a872-45bd-8cb6aba5cce3'::uuid,'TO-BE',300,0.002,0.002,'automatica'::text),
  ('3d73f19a-737c-c7ac-61b9-37f0ee415f7c'::uuid,'AS-IS',15,0.0628,0.0628,NULL::text),
  ('3d73f19a-737c-c7ac-61b9-37f0ee415f7c'::uuid,'TO-BE',15,0.0157,0.0157,'automatica'::text),
  ('3636ff93-ca84-c338-93cb-50cda2ffcc49'::uuid,'AS-IS',20,0.0412,0.0412,NULL::text),
  ('3636ff93-ca84-c338-93cb-50cda2ffcc49'::uuid,'TO-BE',20,0.0276,0.0276,'automatica'::text),
  ('3d7351a0-2ae7-2c9b-d8e5-ad02481c553f'::uuid,'AS-IS',20,0.0412,0.0412,NULL::text),
  ('3d7351a0-2ae7-2c9b-d8e5-ad02481c553f'::uuid,'TO-BE',20,0.0276,0.0276,'automatica'::text),
  ('53909b9e-dc19-ccbf-99e8-fa500f8ef894'::uuid,'AS-IS',20,0.0412,0.0412,NULL::text),
  ('53909b9e-dc19-ccbf-99e8-fa500f8ef894'::uuid,'TO-BE',20,0.0276,0.0276,'automatica'::text),
  ('676c61ac-f05e-d4ec-2707-033e415539de'::uuid,'AS-IS',20,0.0412,0.0412,NULL::text),
  ('676c61ac-f05e-d4ec-2707-033e415539de'::uuid,'TO-BE',20,0.0276,0.0276,'automatica'::text),
  ('b7197823-db61-48f4-825b-abba0867f7ef'::uuid,'AS-IS',200,0.0179,0.0179,NULL::text),
  ('b7197823-db61-48f4-825b-abba0867f7ef'::uuid,'TO-BE',200,0.0027,0.0027,'automatica'::text),
  ('31f891c8-adc3-90aa-595e-92440170f734'::uuid,'AS-IS',200,0.0111,0.0111,NULL::text),
  ('31f891c8-adc3-90aa-595e-92440170f734'::uuid,'TO-BE',200,0.0039,0.0039,'automatica'::text),
  ('d3df4783-e998-d6bc-a6b5-f263f98bcc86'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('d3df4783-e998-d6bc-a6b5-f263f98bcc86'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('11601123-f625-acbc-9456-424d44911710'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('11601123-f625-acbc-9456-424d44911710'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('d3da7a9d-dac4-d3fd-2462-854c71c811ca'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('d3da7a9d-dac4-d3fd-2462-854c71c811ca'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('49d3bc1f-d65d-60a7-c1c3-fa3080e03132'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('49d3bc1f-d65d-60a7-c1c3-fa3080e03132'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('8a4982c6-ebf8-6a54-75d5-d00622520304'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('8a4982c6-ebf8-6a54-75d5-d00622520304'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('d996663f-2f14-6f6a-ec22-575a556b9b32'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('d996663f-2f14-6f6a-ec22-575a556b9b32'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('87e523ee-ef32-110b-41df-7686f7fae798'::uuid,'AS-IS',60,0.1651,0.1651,NULL::text),
  ('87e523ee-ef32-110b-41df-7686f7fae798'::uuid,'TO-BE',60,0.0825,0.0825,'automatica'::text),
  ('3e25ba19-f461-7411-a1d3-b1872a88e181'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('3e25ba19-f461-7411-a1d3-b1872a88e181'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('3989269c-8d9f-698f-d54d-043de7f2903c'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('3989269c-8d9f-698f-d54d-043de7f2903c'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('74c8e6b7-d0dd-3906-c959-3e7cfd841dc1'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('74c8e6b7-d0dd-3906-c959-3e7cfd841dc1'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('3163e467-7365-3c28-29a6-d10710a66eb4'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('3163e467-7365-3c28-29a6-d10710a66eb4'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('aa6cce9b-b8fe-2bc1-dffe-51266b2429ca'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('aa6cce9b-b8fe-2bc1-dffe-51266b2429ca'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('18ee344e-0be1-776a-5dd6-a79e6af16f59'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('18ee344e-0be1-776a-5dd6-a79e6af16f59'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('e88f77d8-09d1-c11c-740d-8a351702f031'::uuid,'AS-IS',20,0.1756,0.1756,NULL::text),
  ('e88f77d8-09d1-c11c-740d-8a351702f031'::uuid,'TO-BE',20,0.0615,0.0615,'automatica'::text),
  ('1fa392b5-5f1b-8e68-d79e-294e083bcf7a'::uuid,'AS-IS',40,0,0,NULL::text),
  ('1fa392b5-5f1b-8e68-d79e-294e083bcf7a'::uuid,'TO-BE',40,0,0,'automatica'::text),
  ('69396d5d-d32a-2a13-5fe6-51b4f582329e'::uuid,'AS-IS',45,0.1621,0.1621,NULL::text),
  ('69396d5d-d32a-2a13-5fe6-51b4f582329e'::uuid,'TO-BE',45,0.0973,0.0973,'automatica'::text),
  ('48c7abc6-f13c-914d-38f3-8d6d00ddadf0'::uuid,'AS-IS',45,0.1621,0.1621,NULL::text),
  ('48c7abc6-f13c-914d-38f3-8d6d00ddadf0'::uuid,'TO-BE',45,0.0973,0.0973,'automatica'::text),
  ('fcd39f08-1b45-8e1b-ea86-1384450c55d5'::uuid,'AS-IS',50,0.0408,0.0408,NULL::text),
  ('fcd39f08-1b45-8e1b-ea86-1384450c55d5'::uuid,'TO-BE',50,0.0061,0.0061,'automatica'::text),
  ('3c96247d-5c19-c331-122f-83b9e3be0a18'::uuid,'AS-IS',200,0,0,NULL::text),
  ('3c96247d-5c19-c331-122f-83b9e3be0a18'::uuid,'TO-BE',200,0,0,'automatica'::text),
  ('74ada7a4-404a-d8a3-b6b5-19e98192fbbe'::uuid,'AS-IS',200,0,0,NULL::text),
  ('74ada7a4-404a-d8a3-b6b5-19e98192fbbe'::uuid,'TO-BE',200,0,0,'automatica'::text),
  ('a04a655a-d9f1-f7c2-0d1a-be75dc659bb2'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('a04a655a-d9f1-f7c2-0d1a-be75dc659bb2'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('b96f615c-594d-267a-ee9b-8aeb706d5210'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('b96f615c-594d-267a-ee9b-8aeb706d5210'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('387ad76a-ed05-5636-fcc7-3714091caf30'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('387ad76a-ed05-5636-fcc7-3714091caf30'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('32bbd803-eb27-4797-e7e5-e282b39acee7'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('32bbd803-eb27-4797-e7e5-e282b39acee7'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('2e913d6d-a8a1-e32d-18ca-324479f44b06'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('2e913d6d-a8a1-e32d-18ca-324479f44b06'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('b9024cde-5b4c-aae8-842e-6c5faa68b181'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('b9024cde-5b4c-aae8-842e-6c5faa68b181'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('3accaf0f-aa0e-1a37-3f86-60cb0a3f0ceb'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('3accaf0f-aa0e-1a37-3f86-60cb0a3f0ceb'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('c030446f-06a6-80c3-a0e0-8c26bfaa9eb6'::uuid,'AS-IS',15,0.0099,0.0099,NULL::text),
  ('c030446f-06a6-80c3-a0e0-8c26bfaa9eb6'::uuid,'TO-BE',15,0.0015,0.0015,'automatica'::text),
  ('c16a0440-45c5-19a5-56a0-a514fabe1d09'::uuid,'AS-IS',50,0,0,NULL::text),
  ('c16a0440-45c5-19a5-56a0-a514fabe1d09'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('7868da21-656f-8df9-153b-1188f3103412'::uuid,'AS-IS',50,0,0,NULL::text),
  ('7868da21-656f-8df9-153b-1188f3103412'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('0b44d41d-08ae-c12f-30f4-0a93835e579e'::uuid,'AS-IS',50,0,0,NULL::text),
  ('0b44d41d-08ae-c12f-30f4-0a93835e579e'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('2ac65df0-9ac6-914e-ff6e-a6be7e62c340'::uuid,'AS-IS',50,0,0,NULL::text),
  ('2ac65df0-9ac6-914e-ff6e-a6be7e62c340'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('f3bd792e-a3cf-6e10-424f-0646d64706d7'::uuid,'AS-IS',50,0,0,NULL::text),
  ('f3bd792e-a3cf-6e10-424f-0646d64706d7'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('72ccb9ad-94c0-5020-a7d4-a36dcc5c6776'::uuid,'AS-IS',50,0,0,NULL::text),
  ('72ccb9ad-94c0-5020-a7d4-a36dcc5c6776'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('59b4c625-aef0-3d97-ba02-e4570be9615f'::uuid,'AS-IS',50,0,0,NULL::text),
  ('59b4c625-aef0-3d97-ba02-e4570be9615f'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('4504d56a-444a-64a4-758d-097f63e22e59'::uuid,'AS-IS',50,0,0,NULL::text),
  ('4504d56a-444a-64a4-758d-097f63e22e59'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('dd953db5-742f-c599-a719-c0b8575db9bb'::uuid,'AS-IS',50,0,0,NULL::text),
  ('dd953db5-742f-c599-a719-c0b8575db9bb'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('773a2d1d-ac0b-b411-e089-28a0b4d95b33'::uuid,'AS-IS',50,0,0,NULL::text),
  ('773a2d1d-ac0b-b411-e089-28a0b4d95b33'::uuid,'TO-BE',50,0,0,'automatica'::text),
  ('30c20e5e-b51a-4027-57e0-e16987914039'::uuid,'AS-IS',8,0,0,NULL::text),
  ('30c20e5e-b51a-4027-57e0-e16987914039'::uuid,'TO-BE',8,0,0,'automatica'::text),
  ('ec0e9098-6c68-6ea8-7c1c-b384968d9ece'::uuid,'AS-IS',8,0,0,NULL::text),
  ('ec0e9098-6c68-6ea8-7c1c-b384968d9ece'::uuid,'TO-BE',8,0,0,'automatica'::text),
  ('7cae8748-9b7a-c1f4-3072-65098790536b'::uuid,'AS-IS',8,0,0,NULL::text),
  ('7cae8748-9b7a-c1f4-3072-65098790536b'::uuid,'TO-BE',8,0,0,'automatica'::text),
  ('664e3d3a-df53-d9e4-9d3d-b249fded07f1'::uuid,'AS-IS',8,0,0,NULL::text),
  ('664e3d3a-df53-d9e4-9d3d-b249fded07f1'::uuid,'TO-BE',8,0,0,'automatica'::text)
) AS v(id, scenario, vol, rw, err, exec)
WHERE ps.id = v.id AND ps.scenario = v.scenario;

-- ============================================================
-- 3. melhoria_processos — vincular "Auditoria cruzada de documentos" à
--    "Revisão de Tributos" (processo umbrella, antes sem melhoria → investimento
--    não era atribuído). Vínculo nativo (igual ao seletor "Processos atendidos").
-- ============================================================
INSERT INTO public.melhoria_processos (id, melhoria_id, processo_id)
SELECT gen_random_uuid(), 'e197c2cf-09a1-a07f-f0ad-719a41aaa52b'::uuid, 'bda94caf-9811-4177-b1c0-088b253c0243'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.melhoria_processos
  WHERE melhoria_id = 'e197c2cf-09a1-a07f-f0ad-719a41aaa52b'::uuid AND processo_id = 'bda94caf-9811-4177-b1c0-088b253c0243'::uuid
);

-- ============================================================
-- 4. process_improvements.one_time_external_cost — investimento fixo por melhoria
--    (desconsolidação do TCO+one-time; Σ = R$ 45.844). Demais campos de investimento
--    ficam como estão; calcularRoi soma one_time × rateio(1/abrangência) → total exato.
-- ============================================================
UPDATE public.process_improvements pi SET
  one_time_external_cost = v.cost,
  updated_at             = NOW()
FROM (VALUES
  ('2904df50-a819-ec5c-a6ad-bc65bbfa21e7'::uuid,3600.0),
  ('d8b738a2-7cac-ef5a-1b30-d821310bc3df'::uuid,1800.0),
  ('6bd5b895-5ce5-4b5c-7d06-880699d00c5b'::uuid,1800.0),
  ('06943298-c4d4-8090-f233-214cfab8e6ad'::uuid,900.0),
  ('e14d930a-4494-61dc-e007-3e270d631815'::uuid,900.0),
  ('535f4b02-22e3-6963-5e3e-b8d2b8d63ed6'::uuid,900.0),
  ('4424b61a-78c0-268c-9a74-a6ef6802f8c7'::uuid,3600.0),
  ('15944da2-42e5-86b0-a38e-4a88b01813a9'::uuid,900.0),
  ('5e7391b4-a64c-ebf2-b072-1491cc1e7fbd'::uuid,900.0),
  ('625b7ec5-8385-99f8-5745-4e4da9d08872'::uuid,900.0),
  ('97cd131d-9ce5-3946-ae16-2f9f7745397e'::uuid,1800.0),
  ('45974ae7-80bb-628e-f49b-48814843cbf5'::uuid,0),
  ('e197c2cf-09a1-a07f-f0ad-719a41aaa52b'::uuid,9455.0),
  ('e46882ca-167e-b9ba-88a5-57746c7ad30f'::uuid,2400.0),
  ('1fe9f7ae-513a-c4a8-5736-d5438a28796b'::uuid,300.0),
  ('f095773e-122e-bc89-f067-3e125afc783a'::uuid,1500.0),
  ('f851469c-0b0f-b5a3-c0c1-4efb2f428983'::uuid,3000.0),
  ('e4b92b3c-4d6d-ba27-123c-7af88005b459'::uuid,1200.0),
  ('8d7cec96-445a-c6cf-7ab6-8699c735d15f'::uuid,4800.0),
  ('a6b10ac5-b741-20be-e1c0-3adb7daa088f'::uuid,5189.0),
  ('c6ca9917-5efa-4503-fffd-2c3271b95606'::uuid,0)
) AS v(id, cost)
WHERE pi.id = v.id;

-- ============================================================
-- Validação
-- ============================================================
DO $$
DECLARE v numeric;
BEGIN
  -- nenhuma taxa fora de 0–1
  SELECT max(GREATEST(COALESCE(rework_rate,0),COALESCE(error_rate,0))) INTO v
  FROM public.process_stages
  WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid);
  IF v > 1.0 THEN RAISE EXCEPTION 'rework/error fora de 0-1: max=%', v; END IF;

  -- execução TO-BE válida
  SELECT count(*) INTO v FROM public.process_stages
  WHERE scenario='TO-BE' AND execution IS NOT NULL
    AND execution NOT IN ('manual','semi_automatica','automatica')
    AND process_id IN (SELECT id FROM public.processes WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid);
  IF v > 0 THEN RAISE EXCEPTION 'execution TO-BE inválida em % linhas', v; END IF;

  -- investimento total = 45.844 (±1)
  SELECT COALESCE(sum(one_time_external_cost),0) INTO v FROM public.process_improvements
  WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid;
  IF abs(v - 45844) > 1 THEN RAISE EXCEPTION 'investimento total != 45.844 (=%)', v; END IF;

  -- volume preenchido em todas as etapas do cluster
  SELECT count(*) INTO v FROM public.process_stages
  WHERE volume_per_process IS NULL
    AND process_id IN (SELECT id FROM public.processes WHERE cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid);
  IF v > 0 THEN RAISE EXCEPTION 'volume_per_process NULL em % etapas', v; END IF;

  -- GRÃO NOVO: investimento é atribuído ao processo só via melhoria_processos.
  -- Toda melhoria com one_time>0 precisa de ≥1 vínculo, senão o custo dela não
  -- entra no total do dashboard (calcularRoi soma one_time × 1/abrangência).
  SELECT count(*) INTO v FROM public.process_improvements pi
  WHERE pi.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'::uuid
    AND COALESCE(pi.one_time_external_cost,0) > 0
    AND NOT EXISTS (SELECT 1 FROM public.melhoria_processos mp WHERE mp.melhoria_id = pi.id);
  IF v > 0 THEN RAISE EXCEPTION 'GRÃO: % melhoria(s) com investimento e SEM melhoria_processos — investimento não atribuído no dashboard. Adicione os vínculos antes.', v; END IF;
END $$;

COMMIT;
