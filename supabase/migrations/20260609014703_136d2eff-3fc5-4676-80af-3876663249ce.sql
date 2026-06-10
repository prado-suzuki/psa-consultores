INSERT INTO public.projects (id, name, description, cluster_id, status, area, created_at, updated_at)
VALUES (mapa_uuid('prj-psac-planejamento'), 'P11 - Planejamento Tributário', 'Automação do planejamento tributário rural (LCDPR/IRPF, DRE projetada, cenários e apresentação).', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', 'Mapeamento', 'Tax', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE public.projects SET cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
WHERE cluster_id IS NULL AND name IN ('Rotina PSA', 'P2 - Automação SPED', 'P4 - Automatização PIS e COFINS', 'P5 - Dashboard PERDCOMP', 'P3 - Automação Consultas', 'P6 - Dashboard Gestão', 'P7 - DIFAL Inteligente', 'P8 - IBS/CBS', 'P8 - Templates Papéis Trabalho', 'P9 - Site e chamados PSA Consultores');

UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='6e237fa4-4507-4137-84f6-0d11db63d46f' WHERE id='bfd4a06a-de80-4fbe-9955-a877a551a3dc' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='1de4789f-50ce-40bd-945a-2ae01eba5b21' WHERE id='48d2e792-3fd2-41c1-a357-582a553d38d9' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='492df2ea-51f3-47cf-b602-3af69e1bd1b3' WHERE id='16a7c7f1-2d7a-4097-a05a-76d0d28183f2' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id=mapa_uuid('prj-psac-planejamento') WHERE id='c7db1b56-22cc-4c8d-b36a-b280f8944172' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='cc5ef9ae-0425-4b4b-8035-c10af1d6bef6' WHERE id='4d6476ae-93fe-46ec-843a-02824e6d4800' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='8895f320-b43d-4be4-8cd3-a844b8ec5531' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='6a4c1a83-bfde-464e-a355-0308c8317bb1' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='2e4a32eb-299b-4a16-8715-c25aadab0e38' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='d3c7e6f6-bc08-40b0-9d4a-e31e47a0c821' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='1de4789f-50ce-40bd-945a-2ae01eba5b21' WHERE id='3d896cea-f554-42f4-a7b9-8ec61195c71d' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='267dd955-3be2-4b51-ab14-c8237ecbaa3a' WHERE id='94ec5922-354d-4fff-a828-a40978698866' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='bda94caf-9811-4177-b1c0-088b253c0243' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='1de4789f-50ce-40bd-945a-2ae01eba5b21' WHERE id='c1012dd1-2296-4464-bcec-be7e9bfbed77' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='280035db-24c6-4c1c-9374-474acfb5663d' WHERE id='fc0233c3-08b5-4428-be6f-332634cc9c24' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='fd3d188d-1582-4d1d-96a2-7a73fd04de3d' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='a257db7d-12ff-4344-8bb6-ccc2c7dfb610' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='6e19cf21-4bf4-401c-85bd-1cd336c91702' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='550a8060-9f23-43e6-a78e-edcf8b258015' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='5c2c1c02-e51e-4790-b251-15f2306ca545' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='cd6b15c3-9898-4a93-82a7-2c17a831703c' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='d1a9fabd-8262-429e-8501-7a08a6d43ad8' WHERE id='72564838-3c39-4fc2-90f8-f046c33a259b' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='2b57fa7e-a953-4afc-b1b8-176333abe08e' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='5a81e296-b93e-4162-97f3-260f6524fa6d' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='280035db-24c6-4c1c-9374-474acfb5663d' WHERE id='ad8a6b69-2579-4a16-b708-6319555a87f9' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='280035db-24c6-4c1c-9374-474acfb5663d' WHERE id='ca800dfa-c14e-4b4e-89d9-10d6dd1da235' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='4cb03075-d8a7-4062-9d51-a9c64dc47523' WHERE id='d814a6d7-5b6d-41c0-bd64-8af78f187775' AND cluster_id IS NULL;
UPDATE public.processes SET cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3', project_id='280035db-24c6-4c1c-9374-474acfb5663d' WHERE id='ec58feca-8367-409f-8cd6-b880644896b6' AND cluster_id IS NULL;

INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at)
SELECT gen_random_uuid(), p.id, 'Automação', 1, NOW() FROM public.projects p
WHERE p.cluster_id='b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
ON CONFLICT (projeto_id, justificativa) DO NOTHING;