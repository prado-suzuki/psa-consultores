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
  uf        text,
  clusters  text NOT NULL
);

INSERT INTO carga_cliente (nome, telefone, municipio, uf, clusters) VALUES
    ('Agro Investimentos Sachetti', '6634392700', 'ITIQUIRA', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Agro-Semear', '6634971486', 'PRIMAVERA DO LESTE', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Agropecuaria Crestani', '6533392900', 'TANGARA DA SERRA', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Amanda Carolina Diavan Martelli E Outras', '6599559707', 'BRASNORTE', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Araguaia S.A.', '6233108131', 'ANAPOLIS', 'GO', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Bussolaro Administradora De Bens', '6635441910', 'SORRISO', 'MT', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Carlos Ivan Missel Biancon', NULL, 'LUCAS DO RIO VERDE', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Cirineu Pedro Aguiar E Outros', NULL, NULL, NULL, '0523512c-f980-4236-8a7c-53e06c9c7a80'),
    ('Cirlei Ana Favaretto Smaniotto E Outros', NULL, 'SORRISO', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Clodoveu Franciosi E Outros', NULL, 'NOVA MARILANDIA', 'MT', '0523512c-f980-4236-8a7c-53e06c9c7a80,2dbd46f8-25fe-4fe3-aca0-89f4b1197e85,4e53c13d-d4aa-47a1-9c0b-683cbb2121e3'),
    ('Coabra', '6521283500', 'CUIABA', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Coabra Participacoes Sa', '6521283500', 'CUIABA', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Coacen', '6639076400', 'SORRISO', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Construtora Guaxe', '6536483300', 'TANGARA DA SERRA', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooami', '6635447080', 'SORRISO', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooazul - Cooperativa Agroindustrial Vale Do Azul', '6696819174', 'SANTA CARMEM', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Cooperativa Agropecuaria Primavera Coap', '6635455500', 'SORRISO', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Dimas Poltronieri E Outro- Fazenda Guanandi Ii', NULL, NULL, NULL, '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Elizabeth Amelia Goncalves Simoes Serio', '65999871441', 'Nossa Senhora do Livramento', 'MT', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Espolio De Ilton Walker', NULL, NULL, NULL, '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Eswalter Zanetti Junior E Outros', '6634191186', 'CAMPO VERDE', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Florindo Agropastagem Ltda', '6533611304', 'BARRA DO BUGRES', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Gerson Mattei', '66999019000', 'ITIQUIRA', 'MT', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Graciane Da Cruz', NULL, 'TANGARA DA SERRA', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Greici Mara Da Cruz', NULL, 'TANGARA DA SERRA', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Gustavo Augusto Boscoli', '65996889012', 'LUCAS DO RIO VERDE', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Jaguari Agropecuaria Ltda', '1130250800', 'BELA VISTA', 'MS', '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Luis Henrique Americano De Araujo', NULL, NULL, NULL, '00f188e3-6d1d-4748-973f-1e91aa6f3f88'),
    ('Marcia Maria Nunes Nery De Souza', NULL, 'CACERES', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Morro Da Mesa Concessionaria S/A.', '6635000130', 'PRIMAVERA DO LESTE', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Petro Amazon', '9282524444', 'MANAUS', 'AM', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Plantar Comercio E Representacoes', '6535491512', 'LUCAS DO RIO VERDE', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Plantivo Industria E Comercio De Produtos Quimicos Ltda', '6530232731', 'CAMPO VERDE', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Rb Locação De Imóveis', NULL, NULL, NULL, 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Rdm Transportes E Logistica', '6634236777', 'RONDONOPOLIS', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Romeu Jose Ciochetta E Outros', NULL, 'CAMPO NOVO DO PARECIS', 'MT', '0523512c-f980-4236-8a7c-53e06c9c7a80,2dbd46f8-25fe-4fe3-aca0-89f4b1197e85'),
    ('Sementes Petrovina', '6621014000', 'PEDRA PRETA', 'MT', '39e30aff-fc2a-405a-b9d6-305497477da6'),
    ('Stapl Participacoes', '6634981158', 'PRIMAVERA DO LESTE', 'MT', 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'),
    ('Superar Imoveis E Participacoes Ltda.', '5130289290', 'SINOP', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d'),
    ('Tattos', '6699758681', 'SORRISO', 'MT', 'ce7f2633-eceb-4341-a97b-51279f5a6e7d');

-- ── Travas. Qualquer uma que dispare aborta tudo e nada é gravado. ─────────
DO $$
DECLARE
  v_msg text;
BEGIN
  IF (SELECT count(*) FROM carga_cliente) <> 40 THEN
    RAISE EXCEPTION 'Abortado: a carga deveria ter 40 clientes e tem %.',
      (SELECT count(*) FROM carga_cliente);
  END IF;

  SELECT string_agg(nome, ', ') INTO v_msg
  FROM (SELECT nome FROM carga_cliente GROUP BY upper(btrim(nome)) HAVING count(*) > 1) x;
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

  SELECT string_agg(DISTINCT cl, ', ') INTO v_msg
  FROM carga_cliente e, unnest(string_to_array(e.clusters, ',')) AS cl
  WHERE NOT EXISTS (SELECT 1 FROM public.estrutura_clusters ec WHERE ec.id = cl::uuid);
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: cluster inexistente no banco: %', v_msg;
  END IF;
END $$;

-- ── A carga. Cliente e vínculo na mesma transação, que é o que o trigger
--    trg_cliente_tem_cluster (DEFERRABLE INITIALLY DEFERRED) exige. ─────────
WITH inseridos AS (
  INSERT INTO public.cliente (nome, telefone, municipio, uf, ativo, excluido, ambiente)
  SELECT e.nome, e.telefone, e.municipio, e.uf, true, false, 'prod'
  FROM carga_cliente e
  RETURNING id, nome
)
INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
SELECT i.id, cl::uuid
FROM inseridos i
JOIN carga_cliente e ON upper(btrim(e.nome)) = upper(btrim(i.nome))
CROSS JOIN LATERAL unnest(string_to_array(e.clusters, ',')) AS cl;

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
