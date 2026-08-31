-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260826203045, nome `dev_itcd_dados_exemplo` tal como registrado la.
-- Aplicada no banco por fora do repositorio (Lovable) e trazida para ca para o
-- diretorio e o ledger voltarem a bater, mesmo procedimento da reconciliacao de
-- 26/08/2026 descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

do $$
declare
  v_cliente   uuid;
  v_cart_nm   uuid;
  v_cart_sjrc uuid;
  v_holding   uuid;
  v_agro      uuid;
  v_cristiano uuid;
  v_fabiane   uuid;
  v_gabriel   uuid;
  v_rafael    uuid;
  v_vitelio   uuid;
  v_bem       uuid;
  r           record;
begin
  if exists (select 1 from public.cliente
             where nome = 'Fazenda Santa Terezinha (exemplo ITCD)') then
    raise notice 'Santa Terezinha de exemplo já existe; nada a fazer.';
    return;
  end if;
  insert into public.cliente (nome, ambiente)
    values ('Fazenda Santa Terezinha (exemplo ITCD)', 'dev')
    returning id into v_cliente;
  insert into public.cliente_clusters (cliente_id, cluster_id)
    select v_cliente, id from public.estrutura_clusters where name = 'OSG';
  insert into public.cartorio (nome_completo, comarca, uf)
    values ('1º Serviço Registral de Nova Mutum', 'Nova Mutum', 'MT')
    returning id into v_cart_nm;
  insert into public.cartorio (nome_completo, comarca, uf)
    values ('1º Ofício de Registro de Imóveis, Títulos e Documentos',
            'São José do Rio Claro', 'MT')
    returning id into v_cart_sjrc;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'CRISTIANO COSTA BEBER', '571.584.441-04',
            '1973-03-13', 'Cruz Alta', 'RS', 'Casado(a)', 'Comunhão Parcial',
            'Vitelio Costa Beber', 'Nailde Teresinha Costa Beber',
            'Agricultor', true)
    returning id into v_cristiano;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'FABIANE SARTORI COSTA BEBER', '883.873.801-72',
            '1979-09-29', 'Viadutos', 'RS', 'Casado(a)', 'Comunhão Parcial',
            'Darcy Waldemar Sartori', 'Sueli Terezinha Sartori',
            'Agricultora', true)
    returning id into v_fabiane;
  update public.pessoa set conjuge_id = v_fabiane   where id = v_cristiano;
  update public.pessoa set conjuge_id = v_cristiano where id = v_fabiane;
  insert into public.pessoa (cliente_id, tipo_pessoa, denominacao, is_fundador)
    values (v_cliente, 'PF', 'GABRIEL SARTORI COSTA BEBER', false)
    returning id into v_gabriel;
  insert into public.pessoa (cliente_id, tipo_pessoa, denominacao, is_fundador)
    values (v_cliente, 'PF', 'RAFAEL SARTORI COSTA BEBER', false)
    returning id into v_rafael;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, profissao, is_fundador)
    values (v_cliente, 'PF', 'VITÉLIO COSTA BEBER', '047.835.490-87',
            'Agricultor', false)
    returning id into v_vitelio;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, tipo_empresa, denominacao, cpf_cnpj, nire,
     objeto_social)
    values (v_cliente, 'PJ', 'PR', 'GCB PARTICIPAÇÕES LTDA',
            '66.050.589/0001-40', '51203135018',
            'Participação em outras sociedades preponderantemente não '
            'financeiras, na condição de acionista ou quotista')
    returning id into v_holding;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, tipo_empresa, denominacao, cpf_cnpj, nire,
     objeto_social)
    values (v_cliente, 'PJ', 'PR', 'GCB AGRO LTDA',
            '64.197.658/0001-18', '51203052503',
            'Cultivo de soja, milho, arroz, feijão e algodão')
    returning id into v_agro;
  insert into public.parentesco (pessoa_id, parente_pessoa_id, tipo, natureza) values
    (v_gabriel,   v_cristiano, 'Filho(a)', 'Consanguíneo'),
    (v_gabriel,   v_fabiane,   'Filho(a)', 'Consanguíneo'),
    (v_rafael,    v_cristiano, 'Filho(a)', 'Consanguíneo'),
    (v_rafael,    v_fabiane,   'Filho(a)', 'Consanguíneo'),
    (v_cristiano, v_vitelio,   'Filho(a)', 'Consanguíneo');
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_holding, v_cristiano, 4509384, 4509384.00),
    (v_holding, v_fabiane,   3532818, 3532818.00);
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_agro, v_holding, 8040202, 8040202.00);
  for r in
    select * from (values
      ('Fazenda São Domingos',              '17190', 244.4318, 'ha', 'Nova Mutum',   'NM',   196278.73, 7162722.78, 23098805.10, 'IR', 'BS 01', true),
      ('Fazenda Santa Terezinha II',        '17191', 505.6530, 'ha', 'Nova Mutum',   'NM',   479912.64,       null, 47784208.50, 'IR', 'BS 02', true),
      ('Fazenda Reserva São Domingos II',   '17192', 158.8420, 'ha', 'Nova Mutum',   'NM',    64013.52,       null, 15010569.00, 'IR', 'BS 03', true),
      ('Fazenda Santa Terezinha',           '26060', 797.5807, 'ha', 'Nova Mutum',   'NM',   134122.53, 6304520.00, 75371376.15, 'IR', 'BS 04', true),
      ('Lote 20 - Quadra 49 (desmembrado)', '26560', 800.0000, 'ha', 'Nova Mutum',   'NM',   199124.80,  533960.89,   533960.89, 'IR', 'BS 05', true),
      ('Fazenda Água Boa II',               '12353', 701.1294, 'ha', 'Nova Maringá', 'SJRC',  50000.00, 4752655.40, 66256728.30, 'IR', 'BS 06', true),
      ('Fazenda Santa Terezinha (matrícula 26.910)',
                                            '26910', 799.3133, 'ha', 'Nova Mutum',   'NM',  5058241.46,       null, 47185078.50, 'IR', 'BS 07', true),
      ('Fazenda São Bento (Estância Dona Lea)',
                                            '8127',  232.6570, 'ha', 'Nova Mutum',   'NM',  1670000.00, 1833039.19,        null, 'IR', 'BS 08', true),
      ('Lote de terras dos lotes 157A, 157B, 171A e 171B',
                                            '968',   500.0000, 'ha', 'Nova Mutum',   'NM',   188500.94, 3830166.00, 45917550.00, 'IR', 'BS 09', true),
      ('Imóvel Urbano - Lote 12, Quadra 17', '970',  1000.0000, 'm2', 'Nova Mutum',   'NM',   138600.00,  132720.80,  1000000.00, 'IB', 'BU 01', false),
      ('Imóvel Urbano - Lote 13, Quadra 17', '971',  1000.0000, 'm2', 'Nova Mutum',   'NM',   138600.00,  132720.80,   800000.00, 'IB', 'BU 02', false)
    ) as t(denominacao, numero, area, unidade, municipio, cart, contabil, itr, mercado, tipo, ref, integralizado)
  loop
    insert into public.bem
      (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao)
      values (v_cliente, r.ref, r.tipo, r.denominacao, r.integralizado)
      returning id into v_bem;
    insert into public.matricula
      (bem_id, cliente_id, numero, cartorio_id, municipio_imovel, uf_imovel,
       area_documento, area_unidade, vlr_contabil, vlr_mercado,
       vlr_imposto_anual, imposto_anual_exercicio)
      values
      (v_bem, v_cliente, r.numero,
       case r.cart when 'SJRC' then v_cart_sjrc else v_cart_nm end,
       r.municipio, 'MT', r.area, r.unidade, r.contabil, r.mercado,
       r.itr, case when r.itr is null then null else 2025 end);
  end loop;
  insert into public.bem
    (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao,
     vlr_contabil)
    values
    (v_cliente, 'BO 01', 'OU', 'Moeda corrente integralizada no capital', true, 7.38);
  raise notice 'Santa Terezinha de exemplo criado: cliente %', v_cliente;
end $$;

do $$
declare
  v_cliente    uuid;
  v_holding    uuid;
  v_agro       uuid;
  v_saobento   uuid;
  v_cart_pdg   uuid;
  v_cart_apc   uuid;
  v_cart_snp   uuid;
  v_avelino    uuid;
  v_iracema    uuid;
  v_cristina   uuid;
  v_regina     uuid;
  v_luis       uuid;
  v_bem        uuid;
  r            record;
begin
  if exists (select 1 from public.cliente
             where nome = 'Agro Aliança - Família Bocolli (exemplo ITCD)') then
    raise notice 'Agro Aliança de exemplo já existe; nada a fazer.';
    return;
  end if;
  insert into public.cliente (nome, ambiente)
    values ('Agro Aliança - Família Bocolli (exemplo ITCD)', 'dev')
    returning id into v_cliente;
  insert into public.cliente_clusters (cliente_id, cluster_id)
    select v_cliente, id from public.estrutura_clusters where name = 'OSG';
  insert into public.cartorio (nome_completo, comarca, uf)
    values ('1º Ofício de Registro de Imóveis', 'Porto dos Gaúchos', 'MT')
    returning id into v_cart_pdg;
  insert into public.cartorio (nome_completo, comarca, uf)
    values ('1º Serviço Notarial e Registral - Registro de Imóveis', 'Apiacás', 'MT')
    returning id into v_cart_apc;
  insert into public.cartorio (nome_completo, comarca, uf)
    values ('1º Ofício de Registro de Imóveis, Títulos e Documentos de Sinop',
            'Sinop', 'MT')
    returning id into v_cart_snp;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'AVELINO NERI BOCOLLI', '197.665.139-53',
            '1954-12-05', 'Marmeleiro', 'PR', 'Casado(a)', 'Comunhão Parcial',
            'Anastácio Pedro Bocolli', 'Stefania Valdameri Bocolli',
            'Agricultor', true)
    returning id into v_avelino;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'IRACEMA KIELBA BOCOLLI', '018.217.401-81',
            '1958-05-14', 'Beltrão', 'PR', 'Casado(a)', 'Comunhão Parcial',
            'Antonio Kielba', 'Alzerina Kielba', 'Agricultora', true)
    returning id into v_iracema;
  update public.pessoa set conjuge_id = v_iracema where id = v_avelino;
  update public.pessoa set conjuge_id = v_avelino where id = v_iracema;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'CRISTINA KIELBA BOCOLLI BORDIGNON',
            '023.015.211-25', '1987-04-28', 'Sorriso', 'MT', 'Casado(a)',
            'Comunhão Parcial', 'Avelino Neri Bocolli', 'Iracema Kielba Bocolli',
            'Agricultora', false)
    returning id into v_cristina;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'REGINA KIELBA BOCOLLI VILA',
            '038.815.171-46', '1990-03-26', 'Sorriso', 'MT', 'Casado(a)',
            'Comunhão Parcial', 'Avelino Neri Bocolli', 'Iracema Kielba Bocolli',
            'Agricultora', false)
    returning id into v_regina;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, data_nascimento,
     naturalidade_municipio, naturalidade_uf, estado_civil, regime_bens,
     filiacao_pai, filiacao_mae, profissao, is_fundador)
    values (v_cliente, 'PF', 'LUIS HENRIQUE DE OLIVEIRA FONSECA VILA',
            '003.592.841-75', '1987-12-27', 'Cuiabá', 'MT', 'Casado(a)',
            'Comunhão Parcial', 'Jose Raul Vilá Neto',
            'Eliane de Oliveira Fonseca Vilá', 'Empresário', false)
    returning id into v_luis;
  update public.pessoa set conjuge_id = v_luis   where id = v_regina;
  update public.pessoa set conjuge_id = v_regina where id = v_luis;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, tipo_empresa, denominacao, cpf_cnpj, nire,
     objeto_social)
    values (v_cliente, 'PJ', 'PR', 'ALIANÇA PARTICIPAÇÕES LTDA',
            '64.896.887/0001-20', '51203070897',
            'Participação em outras sociedades')
    returning id into v_holding;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, tipo_empresa, denominacao, cpf_cnpj, nire,
     objeto_social)
    values (v_cliente, 'PJ', 'PR', 'AGRO ALIANÇA LTDA', '39.474.438/0001-47',
            '51201751595',
            'Cultivo de soja, arroz, milho, milheto, feijão, criação de bovinos '
            'para corte e criação de peixes em água doce. Extração de madeira em '
            'florestas nativas')
    returning id into v_agro;
  insert into public.pessoa
    (cliente_id, tipo_pessoa, tipo_empresa, denominacao, cpf_cnpj, nire,
     objeto_social)
    values (v_cliente, 'PJ', 'PR', 'SÃO BENTO AGRO LTDA', '50.767.510/0001-67',
            '51202298061',
            'Cultivo de soja, arroz, milho, milheto, feijão, criação de bovinos '
            'para corte e criação de peixes em água doce. Extração de madeira em '
            'florestas nativas. Transporte rodoviário de carga')
    returning id into v_saobento;
  insert into public.parentesco (pessoa_id, parente_pessoa_id, tipo, natureza) values
    (v_cristina, v_avelino, 'Filho(a)', 'Consanguíneo'),
    (v_cristina, v_iracema, 'Filho(a)', 'Consanguíneo'),
    (v_regina,   v_avelino, 'Filho(a)', 'Consanguíneo'),
    (v_regina,   v_iracema, 'Filho(a)', 'Consanguíneo');
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_holding, v_avelino,  4448500, 4448500.00),
    (v_holding, v_cristina, 1483000, 1483000.00),
    (v_holding, v_regina,   3626444, 3626444.00);
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_agro,     v_holding, 5930000, 5930000.00),
    (v_saobento, v_holding, 3625944, 3625944.00);
  for r in
    select * from (values
      ('Fazenda Aliança 01',           '64.514',  507.2349, 'ha',    'Santa Carmem',      'SNP', 1200000.00, 13945347.75, 41030108.60, 'AGRO', 'BS 01'),
      ('Fazenda Aliança 03',           '64.516',  503.4100, 'ha',    'Santa Carmem',      'SNP', 1200000.00,        null,        null, 'AGRO', 'BS 02'),
      ('Fazenda Aliança 02',           '64.515',  504.4094, 'ha',    'Santa Carmem',      'SNP', 1200000.00,        null,        null, 'AGRO', 'BS 03'),
      ('Fazenda Aliança',              '2.531',   350.0000, 'ha',    'Apiacás',           'APC',  150000.00,   945735.00,   945735.00, 'AGRO', 'BS 04'),
      ('Fazenda Aliança',              '2.530',   362.0000, 'ha',    'Apiacás',           'APC',  181018.00,   978160.20,   978160.20, 'AGRO', 'BS 05'),
      ('Fazenda Aliança IV - Parte A', '30.173',  416.6933, 'ha',    'Santa Carmem',      'SNP', 1000000.00,  2448420.69,  2448420.69, 'AGRO', 'BS 06'),
      ('Agroaliança Porto II',         '13.180',  387.6829, 'ha_m2', 'Porto dos Gaúchos', 'PDG',  254775.35, 14927715.99, 14927715.99, 'AGRO', 'BS 07'),
      ('Agroaliança Porto II',         '13.447', 1118.7661, 'ha_m2', 'Porto dos Gaúchos', 'PDG',  735224.65,        null,        null, 'AGRO', 'BS 08'),
      ('Fazenda São Bento II',         '68.579',  179.3042, 'ha',    'Santa Carmem',      'SNP',  992800.00,  1053772.99,  1053772.99, 'SB',   'BS 09'),
      ('Fazenda São Bento III',        '68.580',  179.3043, 'ha',    'Santa Carmem',      'SNP',  876571.20,  1053772.99,  1053772.99, 'SB',   'BS 10'),
      ('Fazenda São Bento',            '67.876',  191.8035, 'ha',    'Santa Carmem',      'SNP',  876571.20,  1127237.37,  1127237.37, 'SB',   'BS 11'),
      ('Fazenda São Bento I',          '68.581',  179.3042, 'ha',    'Santa Carmem',      'SNP',  850000.00,  1053772.99,  1053772.99, 'SB',   'BS 12')
    ) as t(denominacao, numero, area, unidade, municipio, cart, contabil, itr, mercado, empresa, ref)
  loop
    insert into public.bem
      (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao,
       empresa_destino_pessoa_id)
      values (v_cliente, r.ref, 'IR', r.denominacao, true,
              case r.empresa when 'SB' then v_saobento else v_agro end)
      returning id into v_bem;
    insert into public.matricula
      (bem_id, cliente_id, numero, cartorio_id, municipio_imovel, uf_imovel,
       area_documento, area_unidade, vlr_contabil, vlr_mercado,
       vlr_imposto_anual, imposto_anual_exercicio)
      values
      (v_bem, v_cliente, r.numero,
       case r.cart when 'PDG' then v_cart_pdg
                   when 'APC' then v_cart_apc
                   else v_cart_snp end,
       r.municipio, 'MT', r.area, r.unidade, r.contabil, r.mercado,
       r.itr, case when r.itr is null then null else 2025 end);
  end loop;
  insert into public.bem
    (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao,
     vlr_contabil, vlr_mercado)
    values
    (v_cliente, 'BO 01', 'OU', 'Moeda corrente integralizada no capital', true,
     40983.60, 40983.60);
  raise notice 'Agro Aliança de exemplo criado: cliente %', v_cliente;
end $$;
