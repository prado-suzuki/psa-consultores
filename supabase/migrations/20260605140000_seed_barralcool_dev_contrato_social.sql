-- =========================================================================
-- SEED (dev): Cliente Barralcool — Contrato Social Barralcool Empreendimentos
-- Fonte: VF_Sugestão de Contrato Social_ Barralcool Empreendimentos Ltda.docx
--
-- Cadastra:
--   - 3 PJs: Barralcool Empreendimentos (CN), Barralcool Agrícola (PR),
--     Agropecuária Bom Pastor (SC)
--   - 41 PFs sócias (38 vivas + 3 espólios) + Judith Abi Rached Cruz
--     (inventariante, não sócia) + 2 cônjuges fictícias dos fundadores
--   - Fundadores: Antonio Sansão e Aléssio Sansão (maiores quotas PF),
--     irmãos (filiação fictícia: Ângelo Sansão / Carmela Bottura Sansão)
--   - quadro_societario da Empreendimentos (42 sócios, capital R$ 185.757)
--     + participação da Empreendimentos na Agrícola (pós-integralização)
--   - bem (PS: quotas da Barralcool Agrícola) + capital_integralizacao
--   - administracao da Bom Pastor (Wilson Galera e Dante Petroni)
--   - parentesco entre os fundadores
--
-- Observações de fidelidade ao documento (minuta com lacunas):
--   - Sede da Empreendimentos sem logradouro; datas em branco no doc.
--   - "Separado(a) judicialmente" mapeado para 'Divorciado(a)' (vocabulário
--     do front). Espólios cadastrados como PF (schema não tem tipo próprio).
-- =========================================================================

-- Cliente Barralcool (ambiente dev)
-- id: e1c0df8e-5206-45e1-af4b-de3e5aacc48c

-- =========================
-- 1) PESSOAS JURÍDICAS
-- =========================
INSERT INTO public.pessoa (
  id, cliente_id, tipo_pessoa, denominacao, cpf_cnpj, tipo_empresa,
  nire, junta_comercial_uf, objeto_social, status_constituicao,
  endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
  endereco_municipio, endereco_uf, endereco_cep
) VALUES
  ('ba44a1c0-0000-4000-a000-000000000001', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PJ',
   'Barralcool Empreendimentos Ltda.', NULL, 'CN',
   NULL, 'MT',
   'Participação em outras sociedades preponderantemente não financeiras, na condição de acionista ou quotista, independente de possuir, ou não, controle do capital social.',
   'Em constituição',
   NULL, NULL, NULL, NULL, 'Barra do Bugres', 'MT', '78390-000'),

  ('ba44a1c0-0000-4000-a000-000000000002', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PJ',
   'Barralcool Agrícola Ltda', '15.009.061/0001-97', 'PR',
   '51.200.044.879', 'MT', NULL, 'Ativa',
   'Rodovia MT 246, Km 0,5', 's/n', NULL, 'Distrito Industrial',
   'Barra do Bugres', 'MT', NULL),

  ('ba44a1c0-0000-4000-a000-000000000003', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PJ',
   'Agropecuária Bom Pastor Ltda.', '07.013.633/0001-83', 'SC',
   '51200912501', 'MT', NULL, 'Ativa',
   'Rodovia MT 343, Km 10', 's/n', 'Lado direito, zona rural', NULL,
   'Barra do Bugres', 'MT', '78393-970')
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 2) PESSOAS FÍSICAS
-- =========================
INSERT INTO public.pessoa (
  id, cliente_id, tipo_pessoa, denominacao, cpf_cnpj, genero, nacionalidade,
  estado_civil, regime_bens, data_nascimento, profissao,
  documento_identidade_tipo, documento_identidade_numero,
  documento_identidade_orgao, documento_identidade_uf,
  endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro,
  endereco_municipio, endereco_uf, endereco_cep,
  filiacao_pai, filiacao_mae, is_fundador
) VALUES
  -- ---- FUNDADORES (maiores quotas PF) + cônjuges fictícias ----
  ('ba44a1c0-0000-4000-a000-000000000004', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Antonio Sansão', '021.721.511-49', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '307.642', 'SSP', 'MT',
   'Rodovia MT 343, Km 17', 's/n', 'Fazenda Vale dos Sonhos, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   'Ângelo Sansão', 'Carmela Bottura Sansão', true),

  ('ba44a1c0-0000-4000-a000-000000000005', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Aléssio Sansão', '021.721.601-30', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e industrial',
   'rg', '307.669-5', 'SSP', 'MT',
   'Rodovia MT 343, Km 14', 's/n', 'Fazenda Vale dos Sonhos, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   'Ângelo Sansão', 'Carmela Bottura Sansão', true),

  -- Cônjuges fictícias (seed dev; não constam no contrato)
  ('ba44a1c0-0000-4000-a000-000000000006', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Helena Marchetti Sansão', NULL, 'F', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   NULL, NULL, NULL, NULL,
   'Rodovia MT 343, Km 17', 's/n', 'Fazenda Vale dos Sonhos, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000007', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Lúcia Ferrari Sansão', NULL, 'F', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   NULL, NULL, NULL, NULL,
   'Rodovia MT 343, Km 14', 's/n', 'Fazenda Vale dos Sonhos, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  -- ---- DEMAIS SÓCIOS ----
  ('ba44a1c0-0000-4000-a000-000000000008', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Espólio de Rene Barbour', '021.719.371-49', 'M', 'Brasileira',
   'Solteiro(a)', NULL, NULL, 'Agropecuarista',
   'rg', '217.243', 'SSP', 'MT',
   'Rodovia Barra do Bugres a Porto Estrela, Km 14', 's/n', 'Fazenda Jauquara, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000009', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Agostinho Sansão', '007.292.801-87', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e industrial',
   'rg', '159.553-9', 'SSP', 'MT',
   'Avenida Hitler Sansão', '956', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000a', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Vitor Sansão', '021.741.971-20', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '179.971', 'SSP', 'MT',
   'Rua Israel Ovídio Nogueira Junior', '190', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000b', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Edvaldo Sansão', '021.741.891-00', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '657.914', 'SSP', 'MT',
   'Rua Ricardo Guedes da Silva', '425', NULL, 'São Raimundo',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000c', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'José Sansão', '007.321.411-68', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '1.468.610-4', 'SSP', 'MT',
   'Rua Belo Horizonte', '111', NULL, 'Jardim Elite',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000d', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Maria Aparecida Junqueira Franco', '671.833.288-72', 'F', 'Brasileira',
   'Solteiro(a)', NULL, '1936-11-27', 'Agropecuarista',
   'rg', '2105005-3', 'SSP', 'SP',
   'Rodovia Barra do Bugres a Porto Estrela, Km 14', 's/n', 'Fazenda Jauquara, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000e', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Moacir Sansão', '021.721.431-20', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e industrial',
   'rg', '307.647-4', 'SSP', 'MT',
   'Rua São Sebastião', 's/n', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000000f', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Marta Boiago Sansão', '406.174.831-91', 'F', 'Brasileira',
   'Viúvo(a)', NULL, NULL, 'Do lar',
   'rg', '307.727-6', 'SSP', 'MT',
   'Praça Eliazário Arantes', '453', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000010', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Carlos Eduardo Assad Caran', '363.805.808-59', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '953.883-6', 'SSP', 'MT',
   'Rodovia MT 343, Km 20', 's/n', 'Fazenda Ouro Fino, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000011', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Cipriano Francisco Caran', '329.295.958-68', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '4.834.282', 'SSP', 'SP',
   'Rodovia MT 343, Km 20', 's/n', 'Fazenda Ouro Fino, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000012', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Afranio Antonio Delgado', '071.486.408-06', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Engenheiro agrônomo e agropecuarista',
   'rg', '2.583.676-6', 'SSP', 'SP',
   'Rodovia Barra do Bugres a Lambari do Oeste, Km 12', 's/n', 'Fazenda Barreiro Rico, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000013', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Espólio de Carlos Alberto Cruz', '864.681.708-34', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e industrial',
   'rg', '6.405.858', 'SSP', 'SP',
   NULL, NULL, NULL, NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  -- Inventariante do espólio de Carlos Alberto Cruz (não é sócia)
  ('ba44a1c0-0000-4000-a000-000000000014', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Judith Abi Rached Cruz', '033.259.688-56', 'F', 'Brasileira',
   NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL,
   'Avenida José Antônio de Farias', '132', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000015', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Vanilda Maria Cassol Cervo', '206.177.391-53', 'F', 'Brasileira',
   'Viúvo(a)', NULL, NULL, 'Agropecuarista',
   'rg', '1264923-6', 'SSP', 'MT',
   'Avenida Hitler Sansão', '728', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000016', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Moacir Sansão Junior', '615.958.291-72', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Parcial', NULL, 'Agropecuarista',
   'rg', '0948533-3', 'SSP', 'MT',
   'Rua São Sebastião', 's/n', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000017', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Adalberto Sansão', '352.484.401-49', 'M', 'Brasileira',
   'Divorciado(a)', NULL, NULL, 'Agropecuarista',
   'rg', '488827', 'SSP', 'MT',
   'Rua São Sebastião', 's/n', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000018', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Cidimar Luiz Sansão', '481.845.781-72', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e administrador de empresas',
   'rg', '566.513', 'SSP', 'MT',
   'Praça Eliazário Arantes', '453', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000019', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Ivo Liberali', '206.526.661-91', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '099.044-2', 'SSP', 'MT',
   'Avenida Brasília', 's/n', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001a', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Dante Petroni Neto', '253.064.051-34', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '012.993', 'SSP', 'MT',
   'Avenida Cuiabá', '647', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001b', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'João Nicolau Petroni', '136.534.668-49', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista e comerciante',
   'rg', '101.436-6', 'SSP', 'MT',
   'Rodovia MT 343, Km 10', 's/n', 'Lado direito, Fazenda Agropecuária Bom Pastor, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001c', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Ivone Aparecida Sansão Pereira', '298.697.651-49', 'F', 'Brasileira',
   'Viúvo(a)', NULL, NULL, 'Agropecuarista e comerciante',
   'rg', '372.713-0', 'SSP', 'MT',
   'Avenida José Antônio de Farias', '226', NULL, 'Jardim Elite',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001d', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Marcelo Cervo', '535.171.801-49', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Odontologista e agropecuarista',
   'rg', '464.344', 'SSP', 'MT',
   'Avenida Hitler Sansão', '728', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001e', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Sadi Pedro Cervo Junior', '378.482.831-00', 'M', 'Brasileira',
   'Solteiro(a)', NULL, '1970-03-14', 'Agropecuarista',
   'rg', '517.322', 'SSP', 'MT',
   'Avenida Hitler Sansão', '728', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000001f', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Maria Luiza Sansão', '452.895.221-15', 'F', 'Brasileira',
   'Solteiro(a)', NULL, '1969-06-04', 'Administradora de empresas',
   'rg', '622.505', 'SSP', 'MT',
   'Praça Eliazário Arantes', '453', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000020', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Espólio de Wagner Hitler Sansão', '572.037.841-34', 'M', 'Brasileira',
   'Solteiro(a)', NULL, '1978-07-15', NULL,
   'rg', '999.757', 'SSP', 'MT',
   NULL, NULL, NULL, NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000021', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Vania Maria Ferreira Caran', '514.044.351-15', 'F', 'Brasileira',
   'Viúvo(a)', NULL, NULL, NULL,
   'rg', '1836508-6', 'SSP', 'MT',
   'Avenida Presidente Marques', '761', 'Apartamento 71', NULL,
   'Cuiabá', 'MT', '78045-175',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000022', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Rene Junqueira Barbour', '568.620.671-68', 'M', 'Brasileira',
   'Casado(a)', 'Separação Total', NULL, 'Agropecuarista',
   'rg', '718.460', 'SSP', 'MT',
   'Rodovia Barra do Bugres a Porto Estrela, Km 14', 's/n', 'Fazenda Jauquara, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000023', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Mariana Silva Caran', '220.323.658-20', 'F', 'Brasileira',
   'Casado(a)', 'Separação Total', NULL, 'Agropecuarista',
   'rg', '1291313-8', 'SSP', 'MT',
   'Rua Mario Palma', '268', NULL, 'Jardim Mariana',
   'Cuiabá', 'MT', '78040-640',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000024', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Eduardo Assad Caran', '820.857.571-20', 'M', 'Brasileira',
   'Casado(a)', 'Separação Total', NULL, 'Agropecuarista',
   'rg', '11.497.521', 'SSP', 'MT',
   'Avenida Deputado Emanoel Pinheiro', '340', NULL, 'São Raimundo',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000025', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Jorge Assaid Caran Neto', '001.150.181-23', 'M', 'Brasileira',
   'Solteiro(a)', NULL, '1983-01-20', 'Agropecuarista',
   'rg', '1158398-3', 'SSP', 'MT',
   'Rua Santa Cruz', '320', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000026', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Vivian Silva Caran', '707.343.721-91', 'F', 'Brasileira',
   'Solteiro(a)', NULL, '1980-08-21', 'Agropecuarista',
   'rg', '1158394-0', 'SSP', 'MT',
   'Rua Basílio Alberto Zandonaide', 's/n', NULL, 'Jardim Terra Nova',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000027', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Altair Nodari', '205.916.911-91', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '0251.595-4', 'SSP', 'MT',
   'Avenida Deputado Hitler Sansão', '207', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000028', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Walter Antonio Nodari', '345.173.751-53', 'M', 'Brasileira',
   'Solteiro(a)', NULL, '1964-11-08', 'Agropecuarista',
   'rg', '468.648-9', 'SSP', 'MT',
   'Rodovia BR 164', 's/n', NULL, 'Raizama',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-000000000029', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Luiz Antonio Nodari', '303.562.291-49', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Agropecuarista',
   'rg', '251.393', 'SSP', 'MT',
   'Rua Doutor João Batista de Oliveira', '60', NULL, 'São Raimundo',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002a', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Wilson Antonio Nodari', '352.502.321-91', 'M', 'Brasileira',
   'Solteiro(a)', NULL, '1963-09-08', 'Agropecuarista',
   'rg', '0477682-8', 'SSP', 'MT',
   'Avenida Marechal Cândido Rondon', 's/n', 'Distrito do Assarí', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002b', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Wisis Laurindo Silva Junior', '314.129.121-72', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Parcial', NULL, 'Agropecuarista',
   'rg', '290.359', 'SSP', 'MT',
   'Rua Brigadeiro Eduardo Gomes', '19', 'Apartamento 102', 'Goiabeiras',
   'Cuiabá', 'MT', '78032-030',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002c', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Wanderley Antonio Nodari', '318.526.961-68', 'M', 'Brasileira',
   'Divorciado(a)', NULL, NULL, 'Agropecuarista',
   'rg', '478.506', 'SSP', 'MT',
   'Avenida Brasília', '78', 'Distrito de Assarí', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002d', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Euda Dias de Oliveira', '488.807.951-04', 'F', 'Brasileira',
   'Divorciado(a)', NULL, NULL, 'Agropecuarista',
   'rg', '761.020', 'SSP', 'MT',
   'Rodovia MT 343, Km 28', 's/n', 'Fazenda Macuco, zona rural', NULL,
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002e', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Wilson Carlos Galera', '803.465.108-72', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Engenheiro civil',
   'rg', '498924-0', 'SSP', 'SP',
   'Rua Professor Estevão Correa', '119', NULL, NULL,
   'Cuiabá', 'MT', '78000-000',
   NULL, NULL, false),

  ('ba44a1c0-0000-4000-a000-00000000002f', 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c', 'PF',
   'Silvio Cezar Pereira Rangel', '363.130.251-72', 'M', 'Brasileira',
   'Casado(a)', 'Comunhão Universal', NULL, 'Contador',
   'rg', '597.783', 'SSP', 'MT',
   'Rua Minas Gerais', '305', NULL, 'Centro',
   'Barra do Bugres', 'MT', '78390-000',
   NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 3) CÔNJUGES (FKs cruzadas após o insert)
-- =========================
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000006'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000004';  -- Antonio -> Helena
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000004'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000006';  -- Helena -> Antonio
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000007'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000005';  -- Aléssio -> Lúcia
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000005'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000007';  -- Lúcia -> Aléssio

-- =========================
-- 4) PARENTESCO (fundadores são irmãos — fictício)
-- =========================
INSERT INTO public.parentesco (id, pessoa_id, parente_pessoa_id, tipo, natureza) VALUES
  ('ba44a1c0-0002-4000-a000-000000000001',
   'ba44a1c0-0000-4000-a000-000000000004',  -- Antonio Sansão
   'ba44a1c0-0000-4000-a000-000000000005',  -- Aléssio Sansão
   'Irmão(ã)', 'Consanguíneo')
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 5) ADMINISTRAÇÃO (Agropecuária Bom Pastor, representada em conjunto)
-- =========================
INSERT INTO public.administracao (id, pj_pessoa_id, administrador_pessoa_id, cargo, pode_isoladamente) VALUES
  ('ba44a1c0-0004-4000-a000-000000000001',
   'ba44a1c0-0000-4000-a000-000000000003',   -- Agropecuária Bom Pastor
   'ba44a1c0-0000-4000-a000-00000000002e',   -- Wilson Carlos Galera
   'Sócio-Administrador', false),
  ('ba44a1c0-0004-4000-a000-000000000002',
   'ba44a1c0-0000-4000-a000-000000000003',   -- Agropecuária Bom Pastor
   'ba44a1c0-0000-4000-a000-00000000001a',   -- Dante Petroni Neto
   'Sócio-Administrador', false)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 6) QUADRO SOCIETÁRIO + CAPITAL (Cláusula Quinta)
--    Capital: R$ 185.757,00 = 185.757 quotas de R$ 1,00
-- =========================
CREATE TEMP TABLE seed_quotas (
  socio_pessoa_id uuid,
  quotas integer,
  vlr numeric,
  pct numeric
) ON COMMIT DROP;

INSERT INTO seed_quotas (socio_pessoa_id, quotas, vlr, pct) VALUES
  ('ba44a1c0-0000-4000-a000-000000000003', 44395, 44395.00, 23.900),  -- Agropecuária Bom Pastor
  ('ba44a1c0-0000-4000-a000-000000000008', 15901, 15901.00,  8.560),  -- Espólio de Rene Barbour
  ('ba44a1c0-0000-4000-a000-000000000004', 11826, 11826.00,  6.366),  -- Antonio Sansão
  ('ba44a1c0-0000-4000-a000-000000000005', 11826, 11826.00,  6.366),  -- Aléssio Sansão
  ('ba44a1c0-0000-4000-a000-000000000009', 11130, 11130.00,  5.992),  -- Agostinho Sansão
  ('ba44a1c0-0000-4000-a000-00000000000a', 10572, 10572.00,  5.692),  -- Vitor Sansão
  ('ba44a1c0-0000-4000-a000-00000000000b', 10497, 10497.00,  5.651),  -- Edvaldo Sansão
  ('ba44a1c0-0000-4000-a000-00000000000c', 10497, 10497.00,  5.651),  -- José Sansão
  ('ba44a1c0-0000-4000-a000-00000000000d',  9063,  9063.00,  4.879),  -- Maria Aparecida Junqueira Franco
  ('ba44a1c0-0000-4000-a000-00000000000e',  8328,  8328.00,  4.483),  -- Moacir Sansão
  ('ba44a1c0-0000-4000-a000-00000000000f',  6702,  6702.00,  3.608),  -- Marta Boiago Sansão
  ('ba44a1c0-0000-4000-a000-000000000010',  4666,  4666.00,  2.512),  -- Carlos Eduardo Assad Caran
  ('ba44a1c0-0000-4000-a000-000000000011',  4666,  4666.00,  2.512),  -- Cipriano Francisco Caran
  ('ba44a1c0-0000-4000-a000-000000000012',  3398,  3398.00,  1.829),  -- Afranio Antonio Delgado
  ('ba44a1c0-0000-4000-a000-000000000013',  2568,  2568.00,  1.382),  -- Espólio de Carlos Alberto Cruz
  ('ba44a1c0-0000-4000-a000-000000000015',  2001,  2001.00,  1.077),  -- Vanilda Maria Cassol Cervo
  ('ba44a1c0-0000-4000-a000-000000000016',  1749,  1749.00,  0.942),  -- Moacir Sansão Junior
  ('ba44a1c0-0000-4000-a000-000000000017',  1749,  1749.00,  0.942),  -- Adalberto Sansão
  ('ba44a1c0-0000-4000-a000-000000000018',  1661,  1661.00,  0.894),  -- Cidimar Luiz Sansão
  ('ba44a1c0-0000-4000-a000-000000000019',  1390,  1390.00,  0.748),  -- Ivo Liberali
  ('ba44a1c0-0000-4000-a000-00000000001a',  1389,  1389.00,  0.748),  -- Dante Petroni Neto
  ('ba44a1c0-0000-4000-a000-00000000001b',  1189,  1189.00,  0.640),  -- João Nicolau Petroni
  ('ba44a1c0-0000-4000-a000-00000000001c',  1057,  1057.00,  0.569),  -- Ivone Aparecida Sansão Pereira
  ('ba44a1c0-0000-4000-a000-00000000001d',  1001,  1001.00,  0.539),  -- Marcelo Cervo
  ('ba44a1c0-0000-4000-a000-00000000001e',  1001,  1001.00,  0.539),  -- Sadi Pedro Cervo Junior
  ('ba44a1c0-0000-4000-a000-00000000001f',   906,   906.00,  0.488),  -- Maria Luiza Sansão
  ('ba44a1c0-0000-4000-a000-000000000020',   906,   906.00,  0.488),  -- Espólio de Wagner Hitler Sansão
  ('ba44a1c0-0000-4000-a000-000000000021',   604,   604.00,  0.325),  -- Vania Maria Ferreira Caran
  ('ba44a1c0-0000-4000-a000-000000000022',   477,   477.00,  0.257),  -- Rene Junqueira Barbour
  ('ba44a1c0-0000-4000-a000-000000000023',   310,   310.00,  0.167),  -- Mariana Silva Caran
  ('ba44a1c0-0000-4000-a000-000000000024',   310,   310.00,  0.167),  -- Eduardo Assad Caran
  ('ba44a1c0-0000-4000-a000-000000000025',   310,   310.00,  0.167),  -- Jorge Assaid Caran Neto
  ('ba44a1c0-0000-4000-a000-000000000026',   310,   310.00,  0.167),  -- Vivian Silva Caran
  ('ba44a1c0-0000-4000-a000-000000000027',   239,   239.00,  0.128),  -- Altair Nodari
  ('ba44a1c0-0000-4000-a000-000000000028',   227,   227.00,  0.122),  -- Walter Antonio Nodari
  ('ba44a1c0-0000-4000-a000-000000000029',   227,   227.00,  0.122),  -- Luiz Antonio Nodari
  ('ba44a1c0-0000-4000-a000-00000000002a',   227,   227.00,  0.122),  -- Wilson Antonio Nodari
  ('ba44a1c0-0000-4000-a000-00000000002b',   130,   130.00,  0.070),  -- Wisis Laurindo Silva Junior
  ('ba44a1c0-0000-4000-a000-00000000002c',   114,   114.00,  0.061),  -- Wanderley Antonio Nodari
  ('ba44a1c0-0000-4000-a000-00000000002d',   114,   114.00,  0.061),  -- Euda Dias de Oliveira
  ('ba44a1c0-0000-4000-a000-00000000002e',    62,    62.00,  0.034),  -- Wilson Carlos Galera
  ('ba44a1c0-0000-4000-a000-00000000002f',    62,    62.00,  0.034);  -- Silvio Cezar Pereira Rangel

-- Quadro societário da Barralcool Empreendimentos
INSERT INTO public.quadro_societario (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total, percentual)
SELECT 'ba44a1c0-0000-4000-a000-000000000001', sq.socio_pessoa_id, sq.quotas, sq.vlr, sq.pct
FROM seed_quotas sq
WHERE NOT EXISTS (
  SELECT 1 FROM public.quadro_societario q
  WHERE q.empresa_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000001'
    AND q.socio_pessoa_id = sq.socio_pessoa_id
);

-- Participação da Empreendimentos na Agrícola (pós-integralização das quotas)
INSERT INTO public.quadro_societario (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total, percentual)
SELECT 'ba44a1c0-0000-4000-a000-000000000002',  -- Barralcool Agrícola
       'ba44a1c0-0000-4000-a000-000000000001',  -- Barralcool Empreendimentos
       185757, 185757.00, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.quadro_societario q
  WHERE q.empresa_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000002'
    AND q.socio_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000001'
);

-- =========================
-- 7) BEM (quotas da Barralcool Agrícola) + CAPITAL_INTEGRALIZACAO
--    (Cláusula Quinta, Parágrafo Segundo)
-- =========================
INSERT INTO public.bem (
  id, cliente_id, referencia_dp, tipo_bem, denominacao,
  participa_estruturacao, status_integralizacao, empresa_destino_pessoa_id,
  vlr_contabil, observacao
) VALUES (
  'ba44a1c0-0001-4000-a000-000000000001',
  'e1c0df8e-5206-45e1-af4b-de3e5aacc48c',
  'PS-BARR-01', 'PS', 'Quotas da Barralcool Agrícola Ltda (CNPJ 15.009.061/0001-97)',
  true, 'Integralizado', 'ba44a1c0-0000-4000-a000-000000000001',
  185757.00,
  'Quotas integralizadas ao capital social da Barralcool Empreendimentos Ltda. — valor nominal de R$ 1,00 cada (contrato social, Cláusula Quinta, Parágrafo Segundo).'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.capital_integralizacao (
  cliente_id, bem_id, empresa_destino_pessoa_id, socio_pessoa_id,
  vlr_contabil, vlr_capital_arredondado, pct_capital
)
SELECT 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c',
       'ba44a1c0-0001-4000-a000-000000000001',
       'ba44a1c0-0000-4000-a000-000000000001',
       sq.socio_pessoa_id, sq.vlr, sq.vlr, sq.pct
FROM seed_quotas sq
WHERE NOT EXISTS (
  SELECT 1 FROM public.capital_integralizacao ci
  WHERE ci.bem_id = 'ba44a1c0-0001-4000-a000-000000000001'
    AND ci.socio_pessoa_id = sq.socio_pessoa_id
);

DROP TABLE seed_quotas;
