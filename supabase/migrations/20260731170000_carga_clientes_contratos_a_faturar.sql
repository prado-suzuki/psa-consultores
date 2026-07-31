-- Carga de clientes da relação de contratos a faturar — ETAPA 1 de 2
--
-- Cria 40 clientes em ambiente 'prod' e 43 vínculos de cluster.
-- NÃO cria contribuinte. A carga de contribuintes é uma migration à parte, que
-- depende destes clientes já existirem.
--
-- Fonte: Alimentar_clientes/Carga de Clientes e Contribuintes.xlsx, aba "1. Clientes".
-- A planilha saiu do cruzamento de três fontes: a relação de contratos a faturar,
-- a base pública da Receita e a própria base do portal.
--
-- Como os nomes foram decididos:
--   o cliente leva o NOME FANTASIA da matriz registrado na Receita; sem fantasia,
--   a razão social. O contribuinte, na etapa 2, leva a razão social.
--
-- Como os clusters foram decididos:
--   coluna "Prestadora Serviço" da planilha de faturamento; onde ela está vazia,
--   vale a "Empresa Faturada", que nos 16 casos em que as duas estão preenchidas
--   sempre coincide. Barra significa mais de um cluster.
--   PSA Consultoria e Protenun são OSG; PSA Consultores é TAX; tudo com ADV é
--   Prado Advogados.
--
-- Quem NÃO está aqui: os 26 clientes da planilha que já existem no portal e os
-- 4 cujo contribuinte vai ser pendurado em cliente já existente (Grupo Piccini,
-- Sch Agrícola, Alessio Sansão e São Francisco Agronegócios). O cruzamento é por
-- CPF/CNPJ, tolerando o zero à esquerda que falta em 31 registros da base.
--
-- Distribuição por cluster:
--   17  PSA AUDITORES
--   14  Prado Advogados
--    3  TAX
--    3  OSG
--    3  PROFITTO
--    2  PSA NORTE
--    1  Familly Business
--
-- 10 destes nasceram marcados na aba Grupos da planilha por parecerem
-- com cliente já cadastrado, sem prova de vínculo. Entram separados, de propósito:
--   Agropecuaria Crestani  (parecido com "Grupo Crestani")
--   Amanda Carolina Diavan Martelli E Outras  (parecido com "São Francisco Agronegócios Ltda")
--   Araguaia S.A.  (parecido com "Araguaia")
--   Clodoveu Franciosi E Outros  (parecido com "Grupo Franciosi")
--   Dimas Poltronieri E Outro- Fazenda Guanandi Ii  (parecido com "Poltronieri")
--   Elizabeth Amelia Goncalves Simoes Serio  (parecido com "Grupo Serio")
--   Espolio De Ilton Walker  (parecido com "Irmãos Walker - Sucessão")
--   Gerson Mattei  (parecido com "Mattei")
--   Gustavo Augusto Boscoli  (parecido com "Grupo Boscoli")
--   Rdm Transportes E Logistica  (parecido com "Mafro Transportes")
--
-- REVERSÃO (nesta ordem, senão o trigger do último cluster barra):
--   BEGIN;
--   UPDATE public.cliente SET excluido = true WHERE id IN (<ids do SELECT final>);
--   DELETE FROM public.cliente_clusters WHERE cliente_id IN (<ids>);
--   DELETE FROM public.cliente WHERE id IN (<ids>);
--   COMMIT;

BEGIN;

CREATE TEMP TABLE carga_cliente (
  nome      text NOT NULL,
  telefone  text,
  municipio text,
  uf        text
);

INSERT INTO carga_cliente (nome, telefone, municipio, uf) VALUES
    ('Agro Investimentos Sachetti', '6634392700', 'ITIQUIRA', 'MT'),
    ('Agro-Semear', '6634971486', 'PRIMAVERA DO LESTE', 'MT'),
    ('Agropecuaria Crestani', '6533392900', 'TANGARA DA SERRA', 'MT'),
    ('Amanda Carolina Diavan Martelli E Outras', '6599559707', 'BRASNORTE', 'MT'),
    ('Araguaia S.A.', '6233108131', 'ANAPOLIS', 'GO'),
    ('Bussolaro Administradora De Bens', '6635441910', 'SORRISO', 'MT'),
    ('Carlos Ivan Missel Biancon', NULL, 'LUCAS DO RIO VERDE', 'MT'),
    ('Cirineu Pedro Aguiar E Outros', NULL, NULL, NULL),
    ('Cirlei Ana Favaretto Smaniotto E Outros', NULL, 'SORRISO', 'MT'),
    ('Clodoveu Franciosi E Outros', NULL, 'NOVA MARILANDIA', 'MT'),
    ('Coabra', '6521283500', 'CUIABA', 'MT'),
    ('Coabra Participacoes Sa', '6521283500', 'CUIABA', 'MT'),
    ('Coacen', '6639076400', 'SORRISO', 'MT'),
    ('Construtora Guaxe', '6536483300', 'TANGARA DA SERRA', 'MT'),
    ('Cooami', '6635447080', 'SORRISO', 'MT'),
    ('Cooazul - Cooperativa Agroindustrial Vale Do Azul', '6696819174', 'SANTA CARMEM', 'MT'),
    ('Cooperativa Agropecuaria Primavera Coap', '6635455500', 'SORRISO', 'MT'),
    ('Dimas Poltronieri E Outro- Fazenda Guanandi Ii', NULL, NULL, NULL),
    ('Elizabeth Amelia Goncalves Simoes Serio', '65999871441', 'Nossa Senhora do Livramento', 'MT'),
    ('Espolio De Ilton Walker', NULL, NULL, NULL),
    ('Eswalter Zanetti Junior E Outros', '6634191186', 'CAMPO VERDE', 'MT'),
    ('Florindo Agropastagem Ltda', '6533611304', 'BARRA DO BUGRES', 'MT'),
    ('Gerson Mattei', '66999019000', 'ITIQUIRA', 'MT'),
    ('Graciane Da Cruz', NULL, 'TANGARA DA SERRA', 'MT'),
    ('Greici Mara Da Cruz', NULL, 'TANGARA DA SERRA', 'MT'),
    ('Gustavo Augusto Boscoli', '65996889012', 'LUCAS DO RIO VERDE', 'MT'),
    ('Jaguari Agropecuaria Ltda', '1130250800', 'BELA VISTA', 'MS'),
    ('Luis Henrique Americano De Araujo', NULL, NULL, NULL),
    ('Marcia Maria Nunes Nery De Souza', NULL, 'CACERES', 'MT'),
    ('Morro Da Mesa Concessionaria S/A.', '6635000130', 'PRIMAVERA DO LESTE', 'MT'),
    ('Petro Amazon', '9282524444', 'MANAUS', 'AM'),
    ('Plantar Comercio E Representacoes', '6535491512', 'LUCAS DO RIO VERDE', 'MT'),
    ('Plantivo Industria E Comercio De Produtos Quimicos Ltda', '6530232731', 'CAMPO VERDE', 'MT'),
    ('Rb Locação De Imóveis', NULL, NULL, NULL),
    ('Rdm Transportes E Logistica', '6634236777', 'RONDONOPOLIS', 'MT'),
    ('Romeu Jose Ciochetta E Outros', NULL, 'CAMPO NOVO DO PARECIS', 'MT'),
    ('Sementes Petrovina', '6621014000', 'PEDRA PRETA', 'MT'),
    ('Stapl Participacoes', '6634981158', 'PRIMAVERA DO LESTE', 'MT'),
    ('Superar Imoveis E Participacoes Ltda.', '5130289290', 'SINOP', 'MT'),
    ('Tattos', '6699758681', 'SORRISO', 'MT');

CREATE TEMP TABLE carga_cliente_cluster (
  nome       text NOT NULL,
  cluster_id uuid NOT NULL
);

INSERT INTO carga_cliente_cluster (nome, cluster_id) VALUES
    ('Agro Investimentos Sachetti', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Agro-Semear', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Agropecuaria Crestani', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Amanda Carolina Diavan Martelli E Outras', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Araguaia S.A.', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Bussolaro Administradora De Bens', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Carlos Ivan Missel Biancon', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Cirineu Pedro Aguiar E Outros', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('Cirlei Ana Favaretto Smaniotto E Outros', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Clodoveu Franciosi E Outros', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('Clodoveu Franciosi E Outros', '2dbd46f8-25fe-4fe3-aca0-89f4b1197e85'),
    ('Clodoveu Franciosi E Outros', '4e53c13d-d4aa-47a1-9c0b-683cbb2121e3'),
    ('Coabra', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Coabra Participacoes Sa', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Coacen', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Construtora Guaxe', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooami', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooazul - Cooperativa Agroindustrial Vale Do Azul', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooperativa Agropecuaria Primavera Coap', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Dimas Poltronieri E Outro- Fazenda Guanandi Ii', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Elizabeth Amelia Goncalves Simoes Serio', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Espolio De Ilton Walker', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Eswalter Zanetti Junior E Outros', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Florindo Agropastagem Ltda', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Gerson Mattei', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Graciane Da Cruz', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Greici Mara Da Cruz', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Gustavo Augusto Boscoli', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Jaguari Agropecuaria Ltda', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Luis Henrique Americano De Araujo', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Marcia Maria Nunes Nery De Souza', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Morro Da Mesa Concessionaria S/A.', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Petro Amazon', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Plantar Comercio E Representacoes', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Plantivo Industria E Comercio De Produtos Quimicos Ltda', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Rb Locação De Imóveis', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Rdm Transportes E Logistica', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Romeu Jose Ciochetta E Outros', '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('Romeu Jose Ciochetta E Outros', '2dbd46f8-25fe-4fe3-aca0-89f4b1197e85'),
    ('Sementes Petrovina', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Stapl Participacoes', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Superar Imoveis E Participacoes Ltda.', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Tattos', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d');

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
    SELECT 1 FROM carga_cliente_cluster cc WHERE cc.nome = e.nome
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

  SELECT string_agg(cc.nome, ', ') INTO v_msg
  FROM carga_cliente_cluster cc
  WHERE NOT EXISTS (
    SELECT 1 FROM carga_cliente e WHERE e.nome = cc.nome
  );
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: vínculo de cluster apontando para cliente que não está na carga: %', v_msg;
  END IF;
END $$;

-- ── A carga. Cliente e vínculo na mesma transação, que é o que o trigger
--    trg_cliente_tem_cluster (DEFERRABLE INITIALLY DEFERRED) exige.
--    O RETURNING devolve o nome exatamente como foi gravado, então o JOIN
--    com a carga é por igualdade simples. ────────────────────────────────────
WITH inseridos AS (
  INSERT INTO public.cliente (nome, telefone, municipio, uf, ativo, excluido, ambiente)
  SELECT e.nome, e.telefone, e.municipio, e.uf, true, false, 'prod'
  FROM carga_cliente e
  RETURNING id, nome
)
INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
SELECT i.id, cc.cluster_id
FROM inseridos i
JOIN carga_cliente_cluster cc ON cc.nome = i.nome;

-- ── Conferência antes de fechar. Se algo não bater, aborta. ────────────────
DO $$
DECLARE
  v_clientes int;
  v_vinculos int;
  v_sem_cluster int;
BEGIN
  SELECT count(*) INTO v_clientes
  FROM public.cliente c
  JOIN carga_cliente e ON upper(btrim(c.nome)) = upper(btrim(e.nome))
  WHERE c.ambiente = 'prod' AND c.excluido = false;
  IF v_clientes <> 40 THEN
    RAISE EXCEPTION 'Abortado: deveriam existir 40 clientes da carga e existem %.', v_clientes;
  END IF;

  SELECT count(*) INTO v_vinculos
  FROM public.cliente c
  JOIN carga_cliente e ON upper(btrim(c.nome)) = upper(btrim(e.nome))
  JOIN public.cliente_clusters cc ON cc.cliente_id = c.id
  WHERE c.ambiente = 'prod' AND c.excluido = false;
  IF v_vinculos <> 43 THEN
    RAISE EXCEPTION 'Abortado: deveriam existir 43 vínculos de cluster e existem %.', v_vinculos;
  END IF;

  SELECT count(*) INTO v_sem_cluster
  FROM public.cliente c
  JOIN carga_cliente e ON upper(btrim(c.nome)) = upper(btrim(e.nome))
  WHERE c.ambiente = 'prod' AND c.excluido = false
    AND NOT EXISTS (SELECT 1 FROM public.cliente_clusters cc WHERE cc.cliente_id = c.id);
  IF v_sem_cluster > 0 THEN
    RAISE EXCEPTION 'Abortado: % cliente(s) da carga ficaram sem cluster.', v_sem_cluster;
  END IF;
END $$;

DROP TABLE carga_cliente_cluster;
DROP TABLE carga_cliente;

COMMIT;

-- ── Resultado. Estes ids são o insumo da etapa 2, a carga de contribuintes. ─
SELECT c.id, c.nome, c.municipio, c.uf,
       string_agg(ec.name, ' + ' ORDER BY ec.name) AS clusters
FROM public.cliente c
JOIN public.cliente_clusters cc ON cc.cliente_id = c.id
JOIN public.estrutura_clusters ec ON ec.id = cc.cluster_id
WHERE c.ambiente = 'prod' AND c.excluido = false
  AND c.nome IN (
    'Agro Investimentos Sachetti',
    'Agro-Semear',
    'Agropecuaria Crestani',
    'Amanda Carolina Diavan Martelli E Outras',
    'Araguaia S.A.',
    'Bussolaro Administradora De Bens',
    'Carlos Ivan Missel Biancon',
    'Cirineu Pedro Aguiar E Outros',
    'Cirlei Ana Favaretto Smaniotto E Outros',
    'Clodoveu Franciosi E Outros',
    'Coabra',
    'Coabra Participacoes Sa',
    'Coacen',
    'Construtora Guaxe',
    'Cooami',
    'Cooazul - Cooperativa Agroindustrial Vale Do Azul',
    'Cooperativa Agropecuaria Primavera Coap',
    'Dimas Poltronieri E Outro- Fazenda Guanandi Ii',
    'Elizabeth Amelia Goncalves Simoes Serio',
    'Espolio De Ilton Walker',
    'Eswalter Zanetti Junior E Outros',
    'Florindo Agropastagem Ltda',
    'Gerson Mattei',
    'Graciane Da Cruz',
    'Greici Mara Da Cruz',
    'Gustavo Augusto Boscoli',
    'Jaguari Agropecuaria Ltda',
    'Luis Henrique Americano De Araujo',
    'Marcia Maria Nunes Nery De Souza',
    'Morro Da Mesa Concessionaria S/A.',
    'Petro Amazon',
    'Plantar Comercio E Representacoes',
    'Plantivo Industria E Comercio De Produtos Quimicos Ltda',
    'Rb Locação De Imóveis',
    'Rdm Transportes E Logistica',
    'Romeu Jose Ciochetta E Outros',
    'Sementes Petrovina',
    'Stapl Participacoes',
    'Superar Imoveis E Participacoes Ltda.',
    'Tattos'
  )
GROUP BY c.id, c.nome, c.municipio, c.uf
ORDER BY c.nome;
