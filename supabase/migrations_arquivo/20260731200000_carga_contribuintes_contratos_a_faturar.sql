-- Carga de contribuintes da relação de contratos a faturar — ETAPA 2 de 2
--
-- Cria 39 contribuintes em ambiente 'prod': 25 PJ e 14 PF.
--
-- Depende da ETAPA 1 (20260731170000_carga_clientes_contratos_a_faturar.sql),
-- já aplicada em produção, que criou os 40 clientes com id fixo escrito no
-- próprio arquivo. 35 destes contribuintes vão para aqueles clientes; os
-- outros 4 vão para cliente que já existia antes da carga:
--   34.273.538/0001-91  Agricola Sao Luiz Ltda                   -> São Francisco Agronegócios Ltda
--   894.720.631-87      Eduardo Piccini                          -> Grupo Piccini
--   12.507.990/0001-38  Jaqueline Cavagnollo Sansao & Cia Ltda   -> Alessio Sansão
--   787.025.699-49      Silvio Cesar Schantz                     -> Sch Agrícola
--
-- Esses 4 foram aprovados por prova de vínculo (sócio em comum ou mesmo
-- endereço, conferido no quadro societário da Receita), não por sobrenome.
--
-- Fonte: Alimentar_clientes/Carga de Clientes e Contribuintes.xlsx, aba
-- "2. Contribuintes", cruzada com a base pública da Receita.
--
-- O QUE ESTÁ PREENCHIDO, E DE ONDE VEIO
--   Só entra dado de fonte oficial. O que não temos fica NULL, de propósito.
--   cpf_cnpj            obrigatório, só dígitos, com o zero da frente
--   nome_razao_social   razão social da Receita
--   nome_fantasia       nome fantasia da Receita (20 têm; PF não tem)
--   telefone            Receita, só dígitos; a planilha entra de reserva (32 têm)
--   endereço            planilha, que traz o logradouro completo ("Rua", "Avenida"),
--                       enquanto a Receita devolve o tipo em campo separado.
--                       A Receita cobre quem a planilha não cobre.
--   SEMPRE NULL         inscricao_estadual, situacao_inscricao_estadual, cod_cnae,
--                       setor, simples_nacional, setor_cliente_id. Nenhuma dessas
--                       informações existe nas fontes desta carga.
--   contribuinte_faturamento = false, que é o estado neutro e o de 274 dos 305
--                       contribuintes já cadastrados.
--
--   Planilha e Receita foram comparadas campo a campo nos 25 PJ: CEP, número,
--   bairro, município, UF e razão social batem em 100%. Endereço não normalizado:
--   a base está metade em maiúsculo e metade em title case, sem convenção a seguir.
--
-- CONFERIDO NA BASE AO VIVO EM 31/07/2026, ANTES DE ESCREVER ESTE ARQUIVO
--   nenhum dos 39 documentos existe em contribuinte, nem em prod nem em dev,
--   comparando com o zero à esquerda reposto (31 registros da base o perderam);
--   nenhum documento repetido dentro da própria carga;
--   os 39 cliente_id existem, estão em prod, ativos e não excluídos;
--   os 35 ids da etapa 1 conferem com os escritos naquele arquivo.
--   Base no momento: 305 contribuintes (189 em prod não excluídos), 166 clientes em prod.
--
-- O id de cada contribuinte está escrito aqui, não é gerado pelo banco. É o
-- mesmo motivo da etapa 1: o trigger normalize_name_title_case roda initcap()
-- em nome_razao_social e nome_fantasia durante o INSERT, então casar por nome
-- depois de gravar não é confiável. UUID v5 sobre o documento: regerar o
-- arquivo devolve exatamente os mesmos ids.
--
-- RESTRIÇÕES DA TABELA, CONFERIDAS NA DDL ANTES DE ESCREVER
--   cliente_id NOT NULL, FK para cliente(id) ON DELETE CASCADE
--   tipo_pessoa NOT NULL CHECK IN ('PF','PJ')
--   nome_razao_social NOT NULL
--   cpf_cnpj é text simples: sem NOT NULL e SEM UNIQUE. A base tem 87
--     documentos repetidos, quase todos par dev/prod. A trava abaixo é a única
--     defesa contra duplicata, e por isso ela é escopada em prod não excluído.
--   excluido NOT NULL DEFAULT false, ambiente NOT NULL DEFAULT 'prod'
--   setor_cliente_id é uuid, FK para setor_cliente(id)
--
-- REVERSÃO (registros recém-criados, sem dependente, então basta apagar):
--   BEGIN;
--   DELETE FROM public.contribuinte WHERE id IN (<a lista de ids do SELECT final>);
--   COMMIT;

BEGIN;

CREATE TEMP TABLE carga_contribuinte (
  id                uuid NOT NULL,
  cliente_id        uuid NOT NULL,
  tipo_pessoa       text NOT NULL,
  cpf_cnpj          text NOT NULL,
  nome_razao_social text NOT NULL,
  nome_fantasia     text,
  telefone          text,
  cep               text,
  logradouro        text,
  numero            text,
  complemento       text,
  bairro            text,
  municipio         text,
  uf                text
);

INSERT INTO carga_contribuinte (
  id, cliente_id, tipo_pessoa, cpf_cnpj, nome_razao_social, nome_fantasia,
  telefone, cep, logradouro, numero, complemento, bairro, municipio, uf
) VALUES
    ('17d36e5d-cb77-5cb9-920a-b851c35f0157', 'c66373eb-fff3-41b4-9f2e-31717e4fb9de', 'PJ', '34273538000191', 'Agricola Sao Luiz Ltda', 'ASL', '6699867502', '78045190', 'RUA JOAO BENTO', '302', 'SALA 601-B', 'QUILOMBO', 'CUIABA', 'MT'),
    ('7a011570-ce91-555c-a586-b330f51967f9', '92d48042-2e01-5dfb-8d46-f74e9fb31af9', 'PJ', '37279829000185', 'Agro Investimentos Sachetti Ltda', 'AGRO INVESTIMENTOS SACHETTI', '6634392700', '78790000', 'RODOVIA BR 163 KM 14+34', 'S/N', NULL, 'ZONA RURAL', 'ITIQUIRA', 'MT'),
    ('c0c398b3-9b92-57e9-ad18-20d0b18dc9da', '1cb5748d-65f9-5abf-bc6f-47782c063c49', 'PJ', '18679492000159', 'Agro-Semear Comercio De Produtos Agricolas Ltda', 'AGRO-SEMEAR', '6634971486', '78850000', 'RUA VI - SEIS', '630', 'QUADRA009 LOTE 0006', 'CHACARAS FONTANA', 'PRIMAVERA DO LESTE', 'MT'),
    ('dbccf5ef-e43b-536a-b824-78d90e90b3d7', '280ee933-f6bc-5572-86d3-2dcc4a118349', 'PJ', '03262185000109', 'Agropecuaria Crestani Ltda', 'AGROPECUARIA CRESTANI', '6533392900', '78307899', 'AREA RODOVIA BR 364 KM 418', 'S/N', NULL, 'AREA RURAL DE TANGARA DA SERRA', 'TANGARA DA SERRA', 'MT'),
    ('bbe904bb-35cd-554d-a896-00813ce801d8', 'af33c72b-199a-5079-a876-202e04e29f9e', 'PF', '00218874111', 'Amanda Carolina Diavan Martelli', NULL, '6599559707', '78350000', 'RODOVIA MT 170,KM 85 A DIREITA + 55 KM', NULL, NULL, 'ZONA RURAL', 'BRASNORTE', 'MT'),
    ('d116785c-118d-5853-aafe-b355af03b9b5', '7e957b82-0956-5145-9f9b-f1ab309351d3', 'PJ', '03306578000169', 'ARAGUAIA S.A.', 'ARAGUAIA', '6233108131', '75132150', 'R2', 'SN', NULL, 'DAIA', 'ANAPOLIS', 'GO'),
    ('87dba1f3-a0fb-5f72-a733-c2733cc58e1f', '03fb01bd-0aab-5ad7-8cc8-10dbe7cc6251', 'PJ', '41227813000104', 'Bussolaro Administradora De Bens Proprios Ltda', 'BUSSOLARO ADMINISTRADORA DE BENS', '6635441910', '78898899', 'PERIMETRAL SUDESTE', '8245', NULL, 'SAO CRISTOVAO', 'SORRISO', 'MT'),
    ('9e836b8e-044d-57c3-bf29-272035ec089c', '03ee96ae-0233-5c80-bc97-89249d77f0bc', 'PF', '14709953015', 'Carlos Ivan Missel Biancon', NULL, NULL, '78455000', 'RUA TAPERA 429 E', NULL, NULL, 'CENTRO', 'LUCAS DO RIO VERDE', 'MT'),
    ('d4e8b63b-5bed-55bb-a347-132e59f6887a', '7c635f5b-d23b-5f2a-a56e-d55e5d574008', 'PF', '42360480944', 'Cirlei Ana Favaretto Smaniotto', NULL, NULL, '78890000', 'GLEBA VALE DO VERDE, BR 163', NULL, NULL, NULL, 'SORRISO', 'MT'),
    ('4143e960-b8d2-50e6-978b-0e424e6b82ee', '267b7f00-0f90-5e34-9012-46e6e5f17485', 'PF', '47541644900', 'Clodoveu Franciosi', NULL, NULL, '78415000', 'BR 364, KM 348', NULL, NULL, 'ZONA RURAL', 'NOVA MARILANDIA', 'MT'),
    ('b5257996-4734-5185-9725-b2914b690a76', '12cda94e-a9b5-5b67-9eb0-ff8d60b78c6b', 'PJ', '03739175000103', 'Coabra Cooperativa Agro Industrial Do Centro Oeste Do Brasil', 'COABRA', '6521283500', '78050000', 'AVENIDA HISTORIADOR RUBENS DE MENDONCA', '2254', 'LOJA 02 EDIF AMERICAN BUSINESS CE', 'BOSQUE DA SAUDE', 'CUIABA', 'MT'),
    ('aebaf540-7db4-59c8-80a8-f04f76c9ed3b', '1c41e99d-551c-59fc-8b29-ed7b3d72076b', 'PJ', '13461093000101', 'Coabra Participacoes Sa', 'COABRA PARTICIPACOES SA', '6521283500', '78050000', 'AVENIDA HISTORIADOR RUBENS DE MENDONCA', '2254', 'LOJA 02 EDIF AMERICAN BUSINESS CE', 'BOSQUE DA SAUDE', 'CUIABA', 'MT'),
    ('e1ad5341-fe7c-53dc-bf38-1ef3abaf201f', '01296272-f0cf-5cce-96bd-b31cab7897fc', 'PJ', '21567370000185', 'Cooperativa Agroindustrial Vale Do Azul - Cooazul', 'COOAZUL - COOPERATIVA AGROINDUSTRIAL VALE DO AZUL', '6696819174', '78545000', 'RODOVIA JOAO ADAO SCHEEREN', 'S/N', 'KM: 38;', 'ZONA RURAL', 'SANTA CARMEM', 'MT'),
    ('97ed82db-286a-5ba6-a671-a9b99b96651c', '5ecab204-beb6-59cc-a53e-2894fdb10f13', 'PJ', '07572351000116', 'Cooperativa Agropecuaria E Industrial Celeiro Do Norte - Coacen', 'COACEN', '6639076400', '78895360', 'RODOVIA BR-242 MT', '840', 'MARGEM DIREITA', 'LOTEAMENTO VALO', 'SORRISO', 'MT'),
    ('3507c703-3f06-5536-9af7-32ceed5c0410', 'cc49d1e0-2822-5fc8-bd15-f440971d85f1', 'PJ', '37433314000198', 'Cooperativa Agropecuaria Primavera Coap', 'COOPERATIVA AGROPECUARIA PRIMAVERA COAP', '6635455500', '78898899', 'RODOVIA FEDERAL BR 163', 'S/N', 'KM 744', 'AREA EXPANSAO URBANA', 'SORRISO', 'MT'),
    ('69ea1f34-deee-5cac-9623-f1e3a3fd4dfc', '762c9044-9140-5eba-9b3c-8fcd5f36e589', 'PJ', '05112520000100', 'Cooperativa Mercantil E Industrial Dos Produtores De Sorriso', 'COOAMI', '6635447080', '78890174', 'RUA ALTA FLORESTA', '50', NULL, 'CENTRO-NORTE', 'SORRISO', 'MT'),
    ('f3c71a08-f141-58a4-8b94-db59241dff94', '73104653-43e4-49c8-84b0-ee6ad3b11faf', 'PF', '89472063187', 'Eduardo Piccini', NULL, '6532124162', '78467899', 'FAZENDA BRANCA, SETOR 1 LOTE 8', NULL, NULL, 'Área Rural de Lucas do Rio Verde', 'LUCAS DO RIO VERDE', 'MT'),
    ('23603f1d-278d-5d3f-8091-4771bc9988bf', '8f6d5026-08ce-5506-b9bc-eec68946ceff', 'PF', '57240825191', 'Elizabeth Amelia Goncalves Simoes Serio', NULL, '65999871441', '78170000', 'GLEBA TARUMA', NULL, NULL, 'ZONA RURAL', 'Nossa Senhora do Livramento', 'MT'),
    ('6c3a097a-5ab8-5f3f-9d30-7bbdcfdd31c5', '86515e2b-499c-567d-9edb-ca622eb02796', 'PF', '38439808100', 'Eswalter Zanetti Junior', NULL, '6634191186', '78840000', 'RODOVIA BR 070 KM 350', NULL, NULL, 'ZONA RURAL', 'CAMPO VERDE', 'MT'),
    ('1570226b-445b-5916-9a6f-7e9cd95b9c03', 'd70b13ad-1e30-5379-8e31-f75da7f729d6', 'PJ', '26482825000183', 'Florindo Agropastagem Ltda', NULL, '6533611304', '78390000', 'AVENIDA DEPUTADO HITLER SANSAO', '345', 'ANEXO I', 'VILA SAO SEBASTIAO', 'BARRA DO BUGRES', 'MT'),
    ('6fc66f4a-8678-58ef-99ac-eeff7cc41cd3', '5eb1d556-1a95-5642-9fca-9ef894e63b3e', 'PF', '58098887049', 'Gerson Mattei', NULL, '66999019000', '78790000', 'BR 163', NULL, NULL, 'ZONA RURAL', 'ITIQUIRA', 'MT'),
    ('5a8fb91e-1a40-52fb-9bda-c5ed57410c47', '27aa4540-6500-5bc3-9c5c-63be8232fd6b', 'PF', '88040240115', 'Graciane Da Cruz', NULL, NULL, '78304900', 'DOS MANACAS', NULL, NULL, 'Jardim Morada do Sol', 'TANGARA DA SERRA', 'MT'),
    ('5a7e18da-6828-5761-92b2-8a0cd7580faf', '11a42af1-df45-5c69-9b61-013e0870e96e', 'PF', '61594750106', 'Greici Mara Da Cruz', NULL, NULL, '78304900', 'DOS MANACAS', NULL, NULL, 'Jardim Morada do Sol', 'TANGARA DA SERRA', 'MT'),
    ('e6994a33-0571-5e65-a4f6-a757b0ee438c', '6a80da84-d17c-55ef-b45d-a92e239a2cd9', 'PJ', '02837996000110', 'Guaxe Construtora Ltda', 'CONSTRUTORA GUAXE', '6536483300', '78305510', 'ANEL VIARIO MANOEL FERREIRA DE ANDRADE', '3140', 'W', 'PARQUE DA SERRA', 'TANGARA DA SERRA', 'MT'),
    ('b241cfe8-a5cc-5ca7-9812-0280b2083759', 'f7dda35d-7acf-5f5f-b324-240398b97b82', 'PF', '04417189145', 'Gustavo Augusto Boscoli', NULL, '65996889012', '78460065', 'AVENIDA PARANA', NULL, NULL, 'PIONEIRO', 'LUCAS DO RIO VERDE', 'MT'),
    ('4a354136-0d08-5eeb-a95c-5aae778ec219', '678a3639-832a-5dc5-a3d0-7ee60c04f4e5', 'PJ', '43394507000260', 'Jaguari Agropecuaria Ltda', NULL, '1130250800', '79260000', 'BELA VISTA DAMA CUE', 'S/N', NULL, 'FAZENDA SANTANNA APA', 'BELA VISTA', 'MS'),
    ('c8ebd324-772e-510c-9f5e-833f0e54f213', '0c363319-81b3-4baa-92bc-ce32fa0969a4', 'PJ', '12507990000138', 'Jaqueline Cavagnollo Sansao & Cia Ltda', 'MASTER', '6599874211', '78043415', 'AVENIDA PRESIDENTE GETULIO VARGAS', '1300', 'SALA A', 'QUILOMBO', 'CUIABA', 'MT'),
    ('a0e25a2d-2269-58ef-95a6-fec83cfcf7f6', '0be1b087-1268-5ffc-817a-f17bc2e67add', 'PF', '17535085172', 'Marcia Maria Nunes Nery De Souza', NULL, NULL, '78200000', 'SEIS DE OUTUBRO', NULL, NULL, 'CENTRO', 'CACERES', 'MT'),
    ('bd3a7059-e1e2-56f5-9e57-88eb07c635f0', '01fe755a-1249-5b7e-9e08-fe4504dd6de8', 'PJ', '13858125000107', 'Morro Da Mesa Concessionaria S/A.', NULL, '6635000130', '78850000', 'AVENIDA SAO PAULO', '770', NULL, 'DISTRITO INDUSTRIAL', 'PRIMAVERA DO LESTE', 'MT'),
    ('1d84cba8-33b0-5862-a144-83d256ffb8c6', 'ed6d2389-b2dc-511b-9831-eada3c94e643', 'PJ', '00485901000110', 'Nava & Simon Ltda', 'PLANTAR COMERCIO E REPRESENTACOES', '6535491512', '78460004', 'AVENIDA RIO GRANDE DO SUL', '204S', NULL, 'CENTRO', 'LUCAS DO RIO VERDE', 'MT'),
    ('79566937-373f-5e1b-984c-8d6448a42d48', 'bf9d2fad-b79e-55fc-9513-6bb67aecfc1d', 'PJ', '84634682000184', 'Petro Amazon Petroleo Da Amazonia Ltda', 'PETRO AMAZON', '9282524444', '69065011', 'CASTELO BRANCO', '1573', NULL, 'CACHOEIRINHA', 'MANAUS', 'AM'),
    ('798bfa67-54bc-5951-94dc-96a7949c2a5b', '48465ca1-45e6-5137-a30b-d038041bad70', 'PJ', '05489028000158', 'Petrovina Sementes Ltda', 'SEMENTES PETROVINA', '6621014000', '78795000', 'RODOVIA BR 364, KM 119', 'S/N', 'SERRA DA PETROVINA', 'ZONA RURAL', 'PEDRA PRETA', 'MT'),
    ('25bd4c4a-259e-5a50-a394-c0fff772f702', '219e9a33-767d-55de-8b39-bab3c7aeb3ac', 'PJ', '53158006000158', 'Plantivo Industria E Comercio De Produtos Quimicos Ltda', NULL, '6530232731', '78840970', 'AVENIDA LOURIVAL LOPES', '691', NULL, 'DISTRITO INDUSTRIAL II', 'CAMPO VERDE', 'MT'),
    ('eb793dcf-3378-5fc2-8dd1-b61f71a7358b', '4afca016-c3ad-5721-8fb4-086be6fa6e1d', 'PJ', '08867797000130', 'Rdm Transportes E Logistica Ltda', 'RDM TRANSPORTES E LOGISTICA', '6634236777', '78746740', 'AVENIDA RENATO VETORASSO', '1032', NULL, 'PARQUE INDUSTRIAL FABRICIO VETORASSO MENDES', 'RONDONOPOLIS', 'MT'),
    ('ab2f4038-97ab-5444-90c4-1945b95a4c16', '2ca2d795-fec7-5120-bccd-9e13fe26e12b', 'PF', '43521118991', 'Romeu Jose Ciochetta', NULL, NULL, '78360000', 'RODOVIA MT 235 KM32 + 10KM A DIREITA', NULL, NULL, 'ZONA RURAL', 'CAMPO NOVO DO PARECIS', 'MT'),
    ('019a1f6b-9c1c-51b3-aa39-b0236e9d6b42', 'cb8e3c55-ef93-4b8a-b4f2-8511316b69fe', 'PF', '78702569949', 'Silvio Cesar Schantz', NULL, '6535491336', '78455000', 'MT 338 - FAZENDA DIVISAO', NULL, NULL, 'ZONA RURAL', 'LUCAS DO RIO VERDE', 'MT'),
    ('b36e0253-ac62-5833-9a14-0fbca618f5f5', 'a60100a2-619c-568e-9391-4f9fe3d22b90', 'PJ', '18961332000106', 'Stapl Participacoes Ltda', 'STAPL PARTICIPACOES', '6634981158', '78850000', 'AVENIDA SAO JOAO', '305', 'SALA 1C', 'CIDADE PRIMAVERA I', 'PRIMAVERA DO LESTE', 'MT'),
    ('c2bec026-f4d7-5003-8f65-de1452b973e0', '48e33786-5518-59a3-ae20-9d38baca001b', 'PJ', '40022198000129', 'Superar Imoveis E Participacoes Ltda.', NULL, '5130289290', '78556236', 'AVENIDA DOS INGAS', '1277', 'APT 03', 'JARDIM MARINGA', 'SINOP', 'MT'),
    ('84fc020f-c75a-5a42-b61a-b41fa329206c', 'cf257ce4-78fa-58ce-9bf5-78e69ffc176b', 'PJ', '58423156000165', 'Tattos Com. Agroindustrial Ltda', 'TATTOS', '6699758681', '78890134', 'Avenida Natalino João Brescansin', '2942', 'SALA 106', 'CENTRO-NORTE', 'SORRISO', 'MT');

-- ── Travas. Qualquer uma que dispare aborta tudo e nada é gravado. ─────────
DO $$
DECLARE
  v_msg text;
  v_qtd bigint;
BEGIN
  SELECT count(*) INTO v_qtd FROM carga_contribuinte;
  IF v_qtd <> 39 THEN
    RAISE EXCEPTION 'Abortado: a carga deveria ter 39 contribuintes e tem %.', v_qtd;
  END IF;

  -- documento vazio ou com tamanho que não é CPF nem CNPJ
  SELECT string_agg(nome_razao_social || ' (' || cpf_cnpj || ')', ', ') INTO v_msg
  FROM carga_contribuinte
  WHERE cpf_cnpj !~ '^[0-9]+$' OR length(cpf_cnpj) NOT IN (11, 14);
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: documento que não é CPF de 11 nem CNPJ de 14 dígitos: %', v_msg;
  END IF;

  -- tipo_pessoa incoerente com o tamanho do documento
  SELECT string_agg(nome_razao_social, ', ') INTO v_msg
  FROM carga_contribuinte
  WHERE (length(cpf_cnpj) = 11) <> (tipo_pessoa = 'PF');
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: tipo_pessoa não bate com o tamanho do documento: %', v_msg;
  END IF;

  -- documento repetido dentro da própria carga
  SELECT string_agg(doc, ', ') INTO v_msg
  FROM (
    SELECT cpf_cnpj AS doc
    FROM carga_contribuinte
    GROUP BY cpf_cnpj
    HAVING count(*) > 1
  ) x;
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: documento repetido dentro da própria carga: %', v_msg;
  END IF;

  -- documento que já existe em contribuinte, tolerando o zero à esquerda que
  -- falta em 31 registros da base: 9-11 dígitos é CPF, 12-14 é CNPJ.
  SELECT string_agg(c.nome_razao_social || ' = ' || e.nome_razao_social, ', ') INTO v_msg
  FROM public.contribuinte c
  JOIN carga_contribuinte e
    ON lpad(regexp_replace(c.cpf_cnpj, '[^0-9]', '', 'g'),
            CASE WHEN length(regexp_replace(c.cpf_cnpj, '[^0-9]', '', 'g')) <= 11 THEN 11 ELSE 14 END,
            '0') = e.cpf_cnpj
  WHERE c.excluido = false AND c.ambiente = 'prod';
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: estes documentos já existem em contribuinte: %', v_msg;
  END IF;

  -- cliente de destino tem que existir, estar em prod e não estar excluído
  SELECT string_agg(e.nome_razao_social || ' -> ' || e.cliente_id::text, ', ') INTO v_msg
  FROM carga_contribuinte e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cliente c
    WHERE c.id = e.cliente_id AND c.excluido = false AND c.ambiente = 'prod'
  );
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: cliente de destino não existe, está excluído ou não é de prod: %', v_msg;
  END IF;

  -- id da carga que já exista na tabela
  SELECT string_agg(c.nome_razao_social, ', ') INTO v_msg
  FROM public.contribuinte c
  JOIN carga_contribuinte e ON e.id = c.id;
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'Abortado: já existe contribuinte com os ids desta carga: %', v_msg;
  END IF;
END $$;

-- ── A carga.
--    Os NULL são escritos de propósito, não são esquecimento: não temos essa
--    informação de fonte oficial. Vão com o tipo explícito porque a coluna
--    simples_nacional tem DEFAULT FALSE, e omiti-la gravaria "false", que é
--    afirmar que a empresa não é do Simples sem saber.
--    Só created_at e updated_at ficam por conta do default (now()).
INSERT INTO public.contribuinte (
  id, cliente_id, tipo_pessoa, cpf_cnpj, nome_razao_social, nome_fantasia,
  telefone, cep, logradouro, numero, complemento, bairro, municipio, uf,
  inscricao_estadual, situacao_inscricao_estadual, cod_cnae, setor,
  simples_nacional, setor_cliente_id, contribuinte_faturamento, excluido, ambiente
)
SELECT e.id, e.cliente_id, e.tipo_pessoa, e.cpf_cnpj, e.nome_razao_social, e.nome_fantasia,
       e.telefone, e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.municipio, e.uf,
       NULL::text, NULL::text, NULL::text, NULL::text,
       NULL::boolean, NULL::uuid, false, false, 'prod'
FROM carga_contribuinte e;

-- ── Conferência antes de fechar. Se algo não bater, aborta. ────────────────
DO $$
DECLARE
  v_qtd  int;
  v_orfa int;
BEGIN
  SELECT count(*) INTO v_qtd
  FROM public.contribuinte c
  JOIN carga_contribuinte e ON e.id = c.id
  WHERE c.ambiente = 'prod' AND c.excluido = false;
  IF v_qtd <> 39 THEN
    RAISE EXCEPTION 'Abortado: deveriam existir 39 contribuintes da carga e existem %.', v_qtd;
  END IF;

  SELECT count(*) INTO v_qtd
  FROM public.contribuinte c
  JOIN carga_contribuinte e ON e.id = c.id
  WHERE c.cpf_cnpj IS NULL OR c.cpf_cnpj = '';
  IF v_qtd > 0 THEN
    RAISE EXCEPTION 'Abortado: % contribuinte(s) da carga ficaram sem documento.', v_qtd;
  END IF;

  SELECT count(*) INTO v_orfa
  FROM public.contribuinte c
  JOIN carga_contribuinte e ON e.id = c.id
  WHERE NOT EXISTS (SELECT 1 FROM public.cliente cl WHERE cl.id = c.cliente_id);
  IF v_orfa > 0 THEN
    RAISE EXCEPTION 'Abortado: % contribuinte(s) da carga ficaram sem cliente.', v_orfa;
  END IF;
END $$;

DROP TABLE carga_contribuinte;

COMMIT;

-- ── Resultado. Os ids já são conhecidos (estão acima); isto é conferência. ──
SELECT c.id, c.cpf_cnpj, c.nome_razao_social, c.municipio, c.uf, cl.nome AS cliente
FROM public.contribuinte c
JOIN public.cliente cl ON cl.id = c.cliente_id
WHERE c.id IN (
    '17d36e5d-cb77-5cb9-920a-b851c35f0157',
    '7a011570-ce91-555c-a586-b330f51967f9',
    'c0c398b3-9b92-57e9-ad18-20d0b18dc9da',
    'dbccf5ef-e43b-536a-b824-78d90e90b3d7',
    'bbe904bb-35cd-554d-a896-00813ce801d8',
    'd116785c-118d-5853-aafe-b355af03b9b5',
    '87dba1f3-a0fb-5f72-a733-c2733cc58e1f',
    '9e836b8e-044d-57c3-bf29-272035ec089c',
    'd4e8b63b-5bed-55bb-a347-132e59f6887a',
    '4143e960-b8d2-50e6-978b-0e424e6b82ee',
    'b5257996-4734-5185-9725-b2914b690a76',
    'aebaf540-7db4-59c8-80a8-f04f76c9ed3b',
    'e1ad5341-fe7c-53dc-bf38-1ef3abaf201f',
    '97ed82db-286a-5ba6-a671-a9b99b96651c',
    '3507c703-3f06-5536-9af7-32ceed5c0410',
    '69ea1f34-deee-5cac-9623-f1e3a3fd4dfc',
    'f3c71a08-f141-58a4-8b94-db59241dff94',
    '23603f1d-278d-5d3f-8091-4771bc9988bf',
    '6c3a097a-5ab8-5f3f-9d30-7bbdcfdd31c5',
    '1570226b-445b-5916-9a6f-7e9cd95b9c03',
    '6fc66f4a-8678-58ef-99ac-eeff7cc41cd3',
    '5a8fb91e-1a40-52fb-9bda-c5ed57410c47',
    '5a7e18da-6828-5761-92b2-8a0cd7580faf',
    'e6994a33-0571-5e65-a4f6-a757b0ee438c',
    'b241cfe8-a5cc-5ca7-9812-0280b2083759',
    '4a354136-0d08-5eeb-a95c-5aae778ec219',
    'c8ebd324-772e-510c-9f5e-833f0e54f213',
    'a0e25a2d-2269-58ef-95a6-fec83cfcf7f6',
    'bd3a7059-e1e2-56f5-9e57-88eb07c635f0',
    '1d84cba8-33b0-5862-a144-83d256ffb8c6',
    '79566937-373f-5e1b-984c-8d6448a42d48',
    '798bfa67-54bc-5951-94dc-96a7949c2a5b',
    '25bd4c4a-259e-5a50-a394-c0fff772f702',
    'eb793dcf-3378-5fc2-8dd1-b61f71a7358b',
    'ab2f4038-97ab-5444-90c4-1945b95a4c16',
    '019a1f6b-9c1c-51b3-aa39-b0236e9d6b42',
    'b36e0253-ac62-5833-9a14-0fbca618f5f5',
    'c2bec026-f4d7-5003-8f65-de1452b973e0',
    '84fc020f-c75a-5a42-b61a-b41fa329206c'
  )
ORDER BY c.nome_razao_social;
