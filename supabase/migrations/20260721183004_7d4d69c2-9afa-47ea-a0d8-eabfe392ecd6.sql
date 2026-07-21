
BEGIN;

-- ===== CAD-01: criar 54 clientes OSG (ambiente=prod) + tag PSA OSG =====
DO $$
DECLARE
  v_id uuid;
  r record;
  v_osg uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Agro Aliança', true, NULL),
    ('Antonius Cornelius (Agromina)', true, NULL),
    ('Anversa', true, NULL),
    ('Carminati', true, NULL),
    ('Ciaseeds', true, NULL),
    ('Cortezia', true, NULL),
    ('DH Agropecuária', true, NULL),
    ('Di Domenico Agronegócios', true, NULL),
    ('Família Braga', true, NULL),
    ('Fazenda Santa Rita', true, NULL),
    ('Fazendas Reunidas', true, NULL),
    ('GMS', true, NULL),
    ('Grupo Franciosi', true, NULL),
    ('Hervalense', true, NULL),
    ('Horigens', true, NULL),
    ('Horita', true, NULL),
    ('Ilmo da Cunha', true, NULL),
    ('Imasa', true, NULL),
    ('Irmãos Walker - Sucessão', true, NULL),
    ('Jacobowski', true, NULL),
    ('José Eduardo (MMS)', true, NULL),
    ('Leonardo Mano', true, NULL),
    ('LG Agro', true, NULL),
    ('Mattei', true, NULL),
    ('Milton Terada', true, NULL),
    ('Mizote', true, NULL),
    ('Morena Agro', true, NULL),
    ('Novafertil (Particulares)', true, NULL),
    ('Pet Mania', true, NULL),
    ('Pradella', true, NULL),
    ('Priore', true, NULL),
    ('Santa Terezinha', true, NULL),
    ('Sebben', true, NULL),
    ('Stracci', true, NULL),
    ('Três Coqueiros', true, NULL),
    ('Uemura', true, NULL),
    ('J3', true, NULL),
    ('Agrobela', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 2193).'),
    ('Bigolin', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1261).'),
    ('Catelan - Núcleo Dario', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1469).'),
    ('Fazenda Bela Vista', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1985).'),
    ('Hiperhauss', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1485).'),
    ('Novafertil', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 2016).'),
    ('Piaia', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1217).'),
    ('Produtécnica', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1036).'),
    ('Trebeschi', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 2271).'),
    ('Zuttion', false, 'Projeto Finalizado conforme planilha Relação de Projetos OSG (cód. 1299).'),
    ('Agrícola Zamo', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 1596).'),
    ('Agronorte', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 2294).'),
    ('Akrus (Safra Sul)', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 1832).'),
    ('GB Agro', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG.'),
    ('Introvini', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 1958).'),
    ('Poltronieri', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 1630).'),
    ('Soyagro', false, 'Projeto Hibernando conforme planilha Relação de Projetos OSG (cód. 1866).')
  ) AS t(nome, ativo, obs) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.cliente
      WHERE lower(btrim(nome)) = lower(btrim(r.nome))
        AND ambiente = 'prod'
        AND excluido = false
    ) THEN
      INSERT INTO public.cliente (nome, ativo, observacoes, ambiente)
      VALUES (btrim(r.nome), r.ativo, r.obs, 'prod')
      RETURNING id INTO v_id;

      INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
      VALUES (v_id, v_osg);
    END IF;
  END LOOP;
END $$;

-- ===== CAD-02a: remover tag PSA OSG de 59 clientes que NAO sao OSG oficial =====
DELETE FROM public.cliente_clusters cc
WHERE cc.cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
  AND cc.cliente_id IN (
    '27ced689-581e-4f0c-a873-3e50c6622e79',
    '3f42f241-4fff-4e2e-9b9b-cc1776ec74bf',
    '6091e6db-1b89-4930-9a7a-b7c21c8d424e',
    '63563d2c-d709-4ed4-9d6b-5b5ad84d1673',
    'a6a2e331-68fa-4536-bbd2-21943e831c59',
    '5440ee27-4fa6-4620-b23a-609e89ec7bfe',
    'dab60768-ec57-48b6-ba76-12ea5c7463e4',
    '1025347e-e44b-4924-b77a-0acfff289f1d',
    '68ca7b03-3083-4144-be54-4c3078ac2130',
    '285eeffb-e21f-41e3-8bfd-75eb35e85576',
    '05804d3c-f054-4482-b399-a659a5c18d55',
    '91b41eb5-bbd7-4fb3-8cc8-8e7c29bd6d2a',
    'e8368df4-5cc4-49d7-93a2-2ca0f5cc5d24',
    '38cadcf8-f88f-4ac2-894f-6d6b657a59bd',
    '7ce8cfdf-d515-418f-a1dc-ac748a66f9f1',
    'bf53d5b8-8358-41d8-9e52-5e51834a8aa3',
    'ddd45fb7-a2d3-443d-9656-ea4b44b5732e',
    '80c9bebc-385a-49da-b7f5-858883e411fd',
    '2eb5fe79-6021-486b-a5b8-e42bc85524e7',
    '1143d61a-b96f-4256-a698-d2a56e478bbc',
    '2eb88a37-5385-49a3-883c-a5dcab3cd926',
    'a8bab137-0f66-45e4-8b11-e173c1dcc341',
    'b714d28a-9b77-462f-9e69-7acdd88f9fd2',
    'c66373eb-fff3-41b4-9f2e-31717e4fb9de',
    '4d023d23-2f52-4b74-b23f-e5d36050adf5',
    'cd614f09-ab51-4233-9a3e-0989970a84fd',
    '5013e841-c1a8-4925-89b5-8b9434c3fad9',
    'da836937-9f74-4a09-9313-4dce1207bfe6',
    '1c08b8ec-2eb0-4f9b-a051-8e149d2561df',
    '0c363319-81b3-4baa-92bc-ce32fa0969a4',
    '08338c04-1feb-4fd3-b0e4-bb0541f639bc',
    '50c9d579-8279-4739-a66e-63b425b98cfb',
    '46273d83-c0cc-40cd-8f3e-f525ebd4d229',
    '3a2f3f6e-db75-4b45-8415-d8dc6f2ccdef',
    '3f6c1fdf-a048-408d-8453-70ec535154d8',
    '52c54a7a-2576-4844-a532-bc911259325d',
    'de202952-beac-40a0-96dd-024b689dbb48',
    '747e44ae-602e-4fe5-9481-3b9c14901c2c',
    '88509a63-5147-4d17-8a23-2254c592ae11',
    'c4216213-d951-4160-97b2-91daa1a43e28',
    '196a4427-71e1-480c-83e6-39c2092a36fb',
    '2f61fd7a-7b8c-4714-a751-f3a88742369c',
    'ac95e96b-6dd6-447c-bf0a-b2391132f2f0',
    '3f82aced-6a19-4a63-83a5-b7237a4b826a',
    '35419187-0d64-437b-b61e-a59a20855d26',
    'fb34156f-5924-4dd5-86d8-528423bb29b5',
    'b2e8f406-b31e-4378-a6c5-bd9e0caad3db',
    '19773ce1-8d3d-4fd5-b787-d3f609ea3705',
    '06aa4de5-f6b0-448e-89c9-8142db62ddcf',
    '73104653-43e4-49c8-84b0-ee6ad3b11faf',
    '1a0b03b6-5610-42d7-aa9c-2a5fb5756bfa',
    '41a36642-bf8a-4751-9421-9dcd63e00e2d',
    '7509042c-658e-4b67-a1d2-4798a6caf856',
    '34631890-fc2a-4f18-a5c7-250d839b0512',
    '334db5af-ad3f-467b-97d9-9d2777830d61',
    '4982c6de-6576-41e1-b4df-a91fd0cfc1ed',
    '24ce05ab-63cc-4ff6-9195-c56675f8db24',
    '2395d7ac-4627-4a58-80d9-729f7b9a5cfc',
    '8091ec78-277d-4f66-a144-1d0c174a4984'
  )
  AND EXISTS (
    SELECT 1 FROM public.cliente_clusters x
    WHERE x.cliente_id = cc.cliente_id
      AND x.cluster_id <> '0523512c-f980-4236-8a7c-53e06c9c7a80'
  );

-- ===== CAD-02b: remover tag PSA Consultores dos 3 clientes so-OSG (Protenun) =====
DELETE FROM public.cliente_clusters cc
WHERE cc.cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  AND cc.cliente_id IN (
    'f6b2400d-893c-4fd5-a05f-c622216b6ee9',
    '5da5f294-d324-41f6-bc7b-0f5ec0680112',
    'a115b538-b189-4bd2-9cee-0468e144d654'
  )
  AND EXISTS (
    SELECT 1 FROM public.cliente_clusters x
    WHERE x.cliente_id = cc.cliente_id
      AND x.cluster_id <> 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
  );

COMMIT;
