BEGIN;

CREATE TEMP TABLE carga_cliente (
  id        uuid NOT NULL,
  nome      text NOT NULL,
  telefone  text,
  municipio text,
  uf        text
);

INSERT INTO carga_cliente (id, nome, telefone, municipio, uf) VALUES
    ('92d48042-2e01-5dfb-8d46-f74e9fb31af9', 'Agro Investimentos Sachetti', '6634392700', 'ITIQUIRA', 'MT'),
    ('1cb5748d-65f9-5abf-bc6f-47782c063c49', 'Agro-Semear', '6634971486', 'PRIMAVERA DO LESTE', 'MT'),
    ('280ee933-f6bc-5572-86d3-2dcc4a118349', 'Agropecuaria Crestani', '6533392900', 'TANGARA DA SERRA', 'MT'),
    ('af33c72b-199a-5079-a876-202e04e29f9e', 'Amanda Carolina Diavan Martelli E Outras', '6599559707', 'BRASNORTE', 'MT'),
    ('7e957b82-0956-5145-9f9b-f1ab309351d3', 'Araguaia S.A.', '6233108131', 'ANAPOLIS', 'GO'),
    ('03fb01bd-0aab-5ad7-8cc8-10dbe7cc6251', 'Bussolaro Administradora De Bens', '6635441910', 'SORRISO', 'MT'),
    ('03ee96ae-0233-5c80-bc97-89249d77f0bc', 'Carlos Ivan Missel Biancon', NULL, 'LUCAS DO RIO VERDE', 'MT'),
    ('10b16f5e-cb5b-5c4a-977c-695c7e073b7e', 'Cirineu Pedro Aguiar E Outros', NULL, NULL, NULL),
    ('7c635f5b-d23b-5f2a-a56e-d55e5d574008', 'Cirlei Ana Favaretto Smaniotto E Outros', NULL, 'SORRISO', 'MT'),
    ('267b7f00-0f90-5e34-9012-46e6e5f17485', 'Clodoveu Franciosi E Outros', NULL, 'NOVA MARILANDIA', 'MT'),
    ('12cda94e-a9b5-5b67-9eb0-ff8d60b78c6b', 'Coabra', '6521283500', 'CUIABA', 'MT'),
    ('1c41e99d-551c-59fc-8b29-ed7b3d72076b', 'Coabra Participacoes Sa', '6521283500', 'CUIABA', 'MT'),
    ('5ecab204-beb6-59cc-a53e-2894fdb10f13', 'Coacen', '6639076400', 'SORRISO', 'MT'),
    ('6a80da84-d17c-55ef-b45d-a92e239a2cd9', 'Construtora Guaxe', '6536483300', 'TANGARA DA SERRA', 'MT'),
    ('762c9044-9140-5eba-9b3c-8fcd5f36e589', 'Cooami', '6635447080', 'SORRISO', 'MT'),
    ('01296272-f0cf-5cce-96bd-b31cab7897fc', 'Cooazul - Cooperativa Agroindustrial Vale Do Azul', '6696819174', 'SANTA CARMEM', 'MT'),
    ('cc49d1e0-2822-5fc8-bd15-f440971d85f1', 'Cooperativa Agropecuaria Primavera Coap', '6635455500', 'SORRISO', 'MT'),
    ('497c1ae8-203f-5ae1-934f-d074e8899142', 'Dimas Poltronieri E Outro- Fazenda Guanandi Ii', NULL, NULL, NULL),
    ('8f6d5026-08ce-5506-b9bc-eec68946ceff', 'Elizabeth Amelia Goncalves Simoes Serio', '65999871441', 'Nossa Senhora do Livramento', 'MT'),
    ('3564bdda-3459-5ebd-8d23-81b8fe014b64', 'Espolio De Ilton Walker', NULL, NULL, NULL),
    ('86515e2b-499c-567d-9edb-ca622eb02796', 'Eswalter Zanetti Junior E Outros', '6634191186', 'CAMPO VERDE', 'MT'),
    ('d70b13ad-1e30-5379-8e31-f75da7f729d6', 'Florindo Agropastagem Ltda', '6533611304', 'BARRA DO BUGRES', 'MT'),
    ('5eb1d556-1a95-5642-9fca-9ef894e63b3e', 'Gerson Mattei', '66999019000', 'ITIQUIRA', 'MT'),
    ('27aa4540-6500-5bc3-9c5c-63be8232fd6b', 'Graciane Da Cruz', NULL, 'TANGARA DA SERRA', 'MT'),
    ('11a42af1-df45-5c69-9b61-013e0870e96e', 'Greici Mara Da Cruz', NULL, 'TANGARA DA SERRA', 'MT'),
    ('f7dda35d-7acf-5f5f-b324-240398b97b82', 'Gustavo Augusto Boscoli', '65996889012', 'LUCAS DO RIO VERDE', 'MT'),
    ('678a3639-832a-5dc5-a3d0-7ee60c04f4e5', 'Jaguari Agropecuaria Ltda', '1130250800', 'BELA VISTA', 'MS'),
    ('0c5a0cc5-8e03-5566-b354-56119c3865ef', 'Luis Henrique Americano De Araujo', NULL, NULL, NULL),
    ('0be1b087-1268-5ffc-817a-f17bc2e67add', 'Marcia Maria Nunes Nery De Souza', NULL, 'CACERES', 'MT'),
    ('01fe755a-1249-5b7e-9e08-fe4504dd6de8', 'Morro Da Mesa Concessionaria S/A.', '6635000130', 'PRIMAVERA DO LESTE', 'MT'),
    ('bf9d2fad-b79e-55fc-9513-6bb67aecfc1d', 'Petro Amazon', '9282524444', 'MANAUS', 'AM'),
    ('ed6d2389-b2dc-511b-9831-eada3c94e643', 'Plantar Comercio E Representacoes', '6535491512', 'LUCAS DO RIO VERDE', 'MT'),
    ('219e9a33-767d-55de-8b39-bab3c7aeb3ac', 'Plantivo Industria E Comercio De Produtos Quimicos Ltda', '6530232731', 'CAMPO VERDE', 'MT'),
    ('62144ede-6dd9-5939-b146-9acf30d74cca', 'Rb Locação De Imóveis', NULL, NULL, NULL),
    ('4afca016-c3ad-5721-8fb4-086be6fa6e1d', 'Rdm Transportes E Logistica', '6634236777', 'RONDONOPOLIS', 'MT'),
    ('2ca2d795-fec7-5120-bccd-9e13fe26e12b', 'Romeu Jose Ciochetta E Outros', NULL, 'CAMPO NOVO DO PARECIS', 'MT'),
    ('48465ca1-45e6-5137-a30b-d038041bad70', 'Sementes Petrovina', '6621014000', 'PEDRA PRETA', 'MT'),
    ('a60100a2-619c-568e-9391-4f9fe3d22b90', 'Stapl Participacoes', '6634981158', 'PRIMAVERA DO LESTE', 'MT'),
    ('48e33786-5518-59a3-ae20-9d38baca001b', 'Superar Imoveis E Participacoes Ltda.', '5130289290', 'SINOP', 'MT'),
    ('cf257ce4-78fa-58ce-9bf5-78e69ffc176b', 'Tattos', '6699758681', 'SORRISO', 'MT');

CREATE TEMP TABLE carga_cliente_cluster (
  cliente_id uuid NOT NULL,
  cluster_id uuid NOT NULL
);

INSERT INTO carga_cliente_cluster (cliente_id, cluster_id) VALUES
    ('92d48042-2e01-5dfb-8d46-f74e9fb31af9', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('1cb5748d-65f9-5abf-bc6f-47782c063c49', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('280ee933-f6bc-5572-86d3-2dcc4a118349', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('af33c72b-199a-5079-a876-202e04e29f9e', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('7e957b82-0956-5145-9f9b-f1ab309351d3', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('03fb01bd-0aab-5ad7-8cc8-10dbe7cc6251', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('03ee96ae-0233-5c80-bc97-89249d77f0bc', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('10b16f5e-cb5b-5c4a-977c-695c7e073b7e', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('7c635f5b-d23b-5f2a-a56e-d55e5d574008', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('267b7f00-0f90-5e34-9012-46e6e5f17485', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('267b7f00-0f90-5e34-9012-46e6e5f17485', '2dbd46f8-25fe-4fe3-aca0-89f4b1197e85'),
    ('267b7f00-0f90-5e34-9012-46e6e5f17485', '4e53c13d-d4aa-47a1-9c0b-683cbb2121e3'),
    ('12cda94e-a9b5-5b67-9eb0-ff8d60b78c6b', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('1c41e99d-551c-59fc-8b29-ed7b3d72076b', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('5ecab204-beb6-59cc-a53e-2894fdb10f13', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('6a80da84-d17c-55ef-b45d-a92e239a2cd9', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('762c9044-9140-5eba-9b3c-8fcd5f36e589', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('01296272-f0cf-5cce-96bd-b31cab7897fc', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('cc49d1e0-2822-5fc8-bd15-f440971d85f1', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('497c1ae8-203f-5ae1-934f-d074e8899142', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('8f6d5026-08ce-5506-b9bc-eec68946ceff', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('3564bdda-3459-5ebd-8d23-81b8fe014b64', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('86515e2b-499c-567d-9edb-ca622eb02796', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('d70b13ad-1e30-5379-8e31-f75da7f729d6', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('5eb1d556-1a95-5642-9fca-9ef894e63b3e', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('27aa4540-6500-5bc3-9c5c-63be8232fd6b', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('11a42af1-df45-5c69-9b61-013e0870e96e', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('f7dda35d-7acf-5f5f-b324-240398b97b82', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('678a3639-832a-5dc5-a3d0-7ee60c04f4e5', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('0c5a0cc5-8e03-5566-b354-56119c3865ef', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('0be1b087-1268-5ffc-817a-f17bc2e67add', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('01fe755a-1249-5b7e-9e08-fe4504dd6de8', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('bf9d2fad-b79e-55fc-9513-6bb67aecfc1d', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('ed6d2389-b2dc-511b-9831-eada3c94e643', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('219e9a33-767d-55de-8b39-bab3c7aeb3ac', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('62144ede-6dd9-5939-b146-9acf30d74cca', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('4afca016-c3ad-5721-8fb4-086be6fa6e1d', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('2ca2d795-fec7-5120-bccd-9e13fe26e12b', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('2ca2d795-fec7-5120-bccd-9e13fe26e12b', '2dbd46f8-25fe-4fe3-aca0-89f4b1197e85'),
    ('48465ca1-45e6-5137-a30b-d038041bad70', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('a60100a2-619c-568e-9391-4f9fe3d22b90', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('48e33786-5518-59a3-ae20-9d38baca001b', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('cf257ce4-78fa-58ce-9bf5-78e69ffc176b', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d');

-- ── Travas. Qualquer uma que dispare aborta tudo e nada é gravado. ─────────
DO $$
DECLARE
  v_msg   text;
  v_qtd   bigint;
BEGIN
  SELECT count(*) INTO v_qtd FROM carga_cliente;
  IF v_qtd <> 40 THEN
    RAISE EXCEPTION 'Abortado: a carga deveria ter 40 clientes e tem %.', v_qtd;
  END IF;

  SELECT count(*) INTO v_qtd FROM carga_cliente_cluster;
  IF v_qtd <> 43 THEN
    RAISE EXCEPTION 'Abortado: a carga deveria ter 43 vínculos de cluster e tem %.', v_qtd;
  END IF;

  SELECT string_agg(nomes, ', ') INTO v_msg
  FROM (
    SELECT string_agg(nome, ' / ') AS nomes
    FROM carga_cliente
    GROUP BY upper(btrim(nome))
    HAVING count(*) > 1
  ) x;
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: nome repetido dentro da própria carga: %', v_msg;
  END IF;

  SELECT string_agg(c.nome, ', ') INTO v_msg
  FROM public.cliente c
  JOIN carga_cliente e ON upper(btrim(c.nome)) = upper(btrim(e.nome))
  WHERE c.excluido = false AND c.ambiente = 'prod';
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: já existe cliente com estes nomes em prod: %', v_msg;
  END IF;

  SELECT string_agg(e.nome, ', ') INTO v_msg
  FROM carga_cliente e
  WHERE NOT EXISTS (
    SELECT 1 FROM carga_cliente_cluster cc WHERE cc.cliente_id = e.id
  );
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: cliente sem nenhum cluster na carga: %', v_msg;
  END IF;

  SELECT string_agg(DISTINCT cc.cluster_id::text, ', ') INTO v_msg
  FROM carga_cliente_cluster cc
  WHERE NOT EXISTS (
    SELECT 1 FROM public.estrutura_clusters ec WHERE ec.id = cc.cluster_id
  );
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: cluster inexistente no banco: %', v_msg;
  END IF;

  SELECT string_agg(DISTINCT cc.cliente_id::text, ', ') INTO v_msg
  FROM carga_cliente_cluster cc
  WHERE NOT EXISTS (
    SELECT 1 FROM carga_cliente e WHERE e.id = cc.cliente_id
  );
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: vínculo de cluster apontando para cliente que não está na carga: %', v_msg;
  END IF;

  SELECT string_agg(c.nome, ', ') INTO v_msg
  FROM public.cliente c
  JOIN carga_cliente e ON e.id = c.id;
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: já existe cliente com os ids desta carga: %', v_msg;
  END IF;
END $$;

-- ── A carga. Cliente e vínculo na mesma transação, que é o que o trigger
--    trg_cliente_tem_cluster (DEFERRABLE INITIALLY DEFERRED) exige.
--    O id vem da carga, não do banco: o trigger normalize_name_title_case
--    reescreve o nome no INSERT, então nada aqui pode depender dele. ─────────
INSERT INTO public.cliente (id, nome, telefone, municipio, uf, ativo, excluido, ambiente)
SELECT e.id, e.nome, e.telefone, e.municipio, e.uf, true, false, 'prod'
FROM carga_cliente e;

INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
SELECT cc.cliente_id, cc.cluster_id
FROM carga_cliente_cluster cc;

-- ── Conferência antes de fechar. Se algo não bater, aborta. ────────────────
DO $$
DECLARE
  v_clientes int;
  v_vinculos int;
  v_sem_cluster int;
BEGIN
  SELECT count(*) INTO v_clientes
  FROM public.cliente c
  JOIN carga_cliente e ON e.id = c.id
  WHERE c.ambiente = 'prod' AND c.excluido = false AND c.ativo = true;
  IF v_clientes <> 40 THEN
    RAISE EXCEPTION 'Abortado: deveriam existir 40 clientes da carga e existem %.', v_clientes;
  END IF;

  SELECT count(*) INTO v_vinculos
  FROM public.cliente_clusters cc
  JOIN carga_cliente e ON e.id = cc.cliente_id;
  IF v_vinculos <> 43 THEN
    RAISE EXCEPTION 'Abortado: deveriam existir 43 vínculos de cluster e existem %.', v_vinculos;
  END IF;

  SELECT count(*) INTO v_sem_cluster
  FROM carga_cliente e
  WHERE NOT EXISTS (SELECT 1 FROM public.cliente_clusters cc WHERE cc.cliente_id = e.id);
  IF v_sem_cluster > 0 THEN
    RAISE EXCEPTION 'Abortado: % cliente(s) da carga ficaram sem cluster.', v_sem_cluster;
  END IF;
END $$;

DROP TABLE carga_cliente_cluster;
DROP TABLE carga_cliente;

COMMIT;