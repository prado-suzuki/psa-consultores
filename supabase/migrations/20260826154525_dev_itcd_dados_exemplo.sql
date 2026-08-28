-- ============================================================================
-- EXCLUSIVA DO SANDBOX — dados de exemplo para a Calculadora de ITCD.
-- Não altera schema. Não aplicar em produção.
-- ============================================================================
--
-- POR QUE EXISTE
--   No sandbox o valor de mercado está vazio em 26 de 26 matrículas e o de ITR em
--   tudo. Sem os três, a calculadora mostra um cenário funcionando e dois em
--   branco, e não há como validar a comparação — que é a razão de existir da
--   ferramenta.
--
-- A ESTRUTURA REAL, RECONCILIADA AO CENTAVO
--
--   Cristiano + Fabiane
--         │  doam as quotas aos filhos (4 instrumentos, um por par)
--         ▼
--   GCB PARTICIPAÇÕES  capital 8.042.202   ← é ISTO que se doa
--         │  detém 100%
--         ▼
--   GCB AGRO           capital 8.040.202
--         │  detém
--         ▼
--   9 imóveis + moeda corrente
--
--   Contrato social da GCB Agro:      1.123.456,00  (6 imóveis + R$ 3,78)
--   1ª Alteração, aumento:            6.916.746,00  (26.910, 8.127, 968 + R$ 3,60)
--   Capital da GCB Agro:              8.040.202,00
--   + capital inicial da holding:         2.000,00
--   Capital da GCB Participações:     8.042.202,00  →  4.021.101 por donatário
--
--   Cristiano  1.000 + 4.508.384 = 4.509.384  ← o instrumento de doação
--   Fabiane    1.000 + 3.531.818 = 3.532.818  ← o instrumento de doação
--
-- QUEM GANHA QUANDO AS FONTES DIVERGEM
--   O WP PREENCHE A GRADE; OS DOCUMENTOS SÓ CORRIGEM ONDE FALAM.
--
--   O WP é o Papel de Trabalho da OSG, e é o único artefato com a grade completa:
--   um valor por imóvel nos três cenários. Começar por ele é o que faz os três
--   cenários existirem. Onde um documento fala do mesmo dado, ele substitui — e
--   substituir é uma destas três coisas, nunca refazer a grade:
--
--     TROCAR VALOR    capital da holding 9.557.944 e não 9.557.946 (1ª Alteração
--                     da Aliança Participações); moeda 7,38 e não 2.005,38 no
--                     Santa Terezinha; município Santa Carmem e não Sinop
--     MUDAR STATUS    o que já estava na grade mas não foi integralizado, como as
--                     matrículas 970 e 971, entra com participa_estruturacao=false
--     INSERIR         o que entrou depois do WP, como a matrícula 8.127, que a 1ª
--                     Alteração da GCB Agro integralizou e o WP não lista
--
--   Precedência quando dois documentos discordam:
--     1. GIA-ITCD          o que a SEFAZ efetivamente apurou
--     2. Instrumentos      contrato social, alterações, instrumentos de doação
--     3. Declaração do ITR para o valor da terra nua
--     4. Certidão de matrícula  para área, cartório e denominação
--     5. WP                a grade, e o valor onde nenhum dos acima diz nada
--
--   O valor de MERCADO só existe no WP — não há laudo de avaliação nas pastas dos
--   dois clientes. É o caso mais puro do item 5.
--
--   ONDE A GRADE TEM BRANCO, O WP TAMBÉM TINHA, e isso não atrapalha a apuração:
--   o WP calcula "valor da quota" dividindo o TOTAL pelas quotas, e a base de cada
--   donatário sai de percentual × total. Nunca de valor por imóvel. É a mesma
--   formulação do motor. Os brancos afetam só o aviso de completude na tela.
--
-- DE ONDE VEM CADA DADO
--   Estrutura, quotas e valores de integralização: contrato social e 1ª Alteração
--   da GCB Agro; 1ª Alteração e 2ª Alteração da GCB Participações; os quatro
--   Instrumentos Particulares de Doação. Todos em `Documentos Psa\Documentos
--   Definitivos\Documentos Societários` e `...\Documentos Sucessórios`.
--   Cartório, município e área: certidões de matrícula.
--   Valor de ITR: DIAT da Declaração do ITR 2025 de cada imóvel, linha "valor da
--   terra nua" — NÃO a linha "valor da terra nua tributável", que desconta reserva
--   legal e preservação permanente e só serve para apurar o próprio ITR.
--   Valor de mercado: QUADRO 2 do WP, na falta de laudo.
--   NADA aqui é inventado.
--
-- POR QUE O WP DÁ 6.649.400 E NÃO 8.040.202
--   A diferença de R$ 1.390.802,00 fecha exata:
--     − 1.670.000,00  matrícula 8.127, que o WP não lista
--     + 277.200,00    matrículas 970 e 971, que o WP lista mas que NÃO foram
--                     integralizadas (a cliente optou por não integralizar, por
--                     intenção de venda futura — WhatsApp de 06/04/2026)
--     +   1.998,00    o WP lança R$ 2.005,38 de moeda corrente; o real é R$ 7,38
--   O WP é a versão de rascunho da mesma estrutura, feita antes de o capital
--   fechar. Não é uma estrutura diferente.
--
-- O QUE ESTE SEED NÃO PREENCHE, E POR QUÊ
--   a) `capital_integralizacao`. Ela exige o valor por sócio E por imóvel. A 1ª
--      Alteração dá isso item a item, mas o contrato social original só declara o
--      total por sócio (R$ 561.728,00 cada, em condomínio sobre os seis imóveis)
--      sem abrir por imóvel. Preencher só metade deixaria a soma errada. Falta
--      ler os parágrafos terceiro e quarto da cláusula quinta do contrato social.
--   b) Valor de mercado da 8.127. É lacuna real do dado, e dá para PROVAR que é:
--      o slide 12 da apresentação do Santa Terezinha ("Resumo dos tributos") publica
--      os totais dos três cenários, e os dois que dependem de valor por imóvel
--      fecham ao centavo SEM a 8.127 — em ambos a diferença contra a soma das dez
--      matrículas do WP é exatamente R$ 2.005,38, que é a moeda corrente que o WP
--      lançava:
--        mercado  322.960.281,82 = 10 matrículas (322.958.276,44) + 2.005,38
--        ITR       29.155.992,05 = 10 matrículas (29.153.986,67)  + 2.005,38
--      A 8.127 não está em nenhum dos dois porque entrou no capital só na 1ª
--      Alteração, depois do WP e da apresentação — é a mesma razão pela qual o
--      contábil daquele slide é 6.649.400,00 e não 8.040.202,00. O valor de ITR dela
--      existe aqui porque veio da declaração dela própria (CIB 0536377-2); o de
--      mercado não existe em artefato nenhum, e a pasta de laudos está vazia. Só um
--      laudo ou a OSG resolve.
--      (O ITR das matrículas 17.191 e 17.192, que antes constava aqui, NÃO é
--      lacuna: as duas dividem o CIB 8852069-2 com a 17.190 — ver ressalva (j).)
--   c) RESOLVIDO. As duas operacionais do Agro Aliança entravam sem CNPJ, NIRE nem
--      quadro próprio. Os slides 10 e 11 da apresentação deram o QSA das três
--      etapas, e a 4ª Alteração da Agro Aliança e a 1ª Alteração da R&L Transportes
--      confirmaram tudo: CNPJ, NIRE, objeto social e capital de cada uma. As duas
--      agora têm quadro societário com a Aliança Participações a 100%. Ver "A CADEIA
--      DE CAPITAL" no bloco 2.
--
-- DIVERGÊNCIAS REGISTRADAS, NENHUMA CORRIGIDA
--   d) A matrícula 26.910 é condomínio de 799,3133 ha: Luciana Mariz Gelatti
--      Linassi 400 ha, Rafaela Gelatti Costa Beber 300 ha, Cristiano 99,3133 ha
--      (certidão de 04/03/2024). A GCB Agro integralizou três frações dela, e em
--      30/03/2026 a Luciana doou 100 ha ao Cristiano por escritura pública. Aqui
--      ela entra como UM bem, com o contábil somado das três integralizações.
--   e) A matrícula 26.910 se chama "Fazenda Santa Terezinha" na certidão — mesmo
--      nome da 26.060. Duas matrículas, uma denominação.
--   f) A matrícula 8.127 é "Fazenda Estância Dona Lea" na 1ª Alteração e "Fazenda
--      São Bento" na declaração do ITR. Mesma área, 232,6 ha. Fica o nome do ITR,
--      que é o documento mais recente.
--   g) A matrícula 968 tem 500,00 ha na certidão e proprietário VITÉLIO COSTA
--      BEBER, pai do Cristiano; o WP registra 485,9 ha. Fica o da certidão.
--   h) Agro Aliança, parte disponível: o instrumento dá 2.183.847 quotas à
--      Cristina e 40.403 à Regina; a apresentação dá 2.183.848 e 40.402. A
--      GIA-ITCD 337978 resolve: ela declara PERCENTUAL, 74,09% e 25,91%, e a base
--      sai de percentual × total. Ver "A GIA APURA POR PERCENTUAL" abaixo.
--   i) O cadastro do sandbox tem, nas matrículas que já existiam, o valor da terra
--      nua TRIBUTÁVEL e não o valor da terra nua. São duas linhas da mesma
--      declaração do ITR, e a tributável desconta reserva legal e preservação
--      permanente: matr. 13.180/13.447 tem VTN 14.927.715,99 e tributável
--      5.112.742,72 (razão 2,92 = 1.506,4 ha ÷ 516,0 ha), e a 68.579 tem
--      1.053.772,99 e 527.097,24 (razão 2,00 = 179,3 ÷ 89,7). Para o ITCD vale o
--      VTN: a redução da tributável é regra do próprio ITR e nada tem a ver com o
--      valor de transmissão. Este seed grava o VTN. As linhas antigas do cadastro
--      ficam como estão — corrigi-las é decisão da OSG, não deste seed.
--   j) O VTN é declarado por CIB, não por matrícula, e um CIB pode cobrir várias:
--      o CIB 3049863-5 cobre as matrículas 64.514, 64.515 e 64.516 (1.515,0 ha
--      juntas) e o 4886323-8 cobre a 13.180 e a 13.447 (1.506,4 ha). Aqui o valor
--      inteiro do CIB fica na PRIMEIRA matrícula do grupo e as outras ficam nulas,
--      que é como o WP também faz. Somar as três daria o triplo.
--   k) O valor de mercado é igual ao VTN em 8 das 12 matrículas do Agro Aliança.
--      Não é erro de cópia: a pasta `Outros Documentos\Laudos de Avaliação` está
--      VAZIA, então onde não houve laudo a OSG usou o VTN como valor de mercado. A
--      única exceção é o CIB 3049863-5, com mercado de 41.030.108,60 contra VTN de
--      13.945.347,75. O cenário de mercado deste cliente é, portanto, um piso —
--      não uma avaliação.
--
--   l) Santa Terezinha, ITR de 6.304.520,00 na 26.060 E na 26.910. NÃO é
--      duplicação, e o WP está certo: existem DUAS declarações de ITR 2025
--      distintas, de 800,0 ha cada, as duas chamadas "Fazenda Santa Terezinha", com
--      valor da terra nua idêntico de R$ 6.304.520,00 —
--        CIB 5026384-6, contribuinte CRISTIANO COSTA BEBER
--        CIB 8979463-0, contribuinte ADRIANO COSTA BEBER
--      Dois imóveis, dois códigos, mesmo VTN. O "Total Valor ITR" do slide 12
--      (R$ 29.155.992,05) fecha ao centavo com os dois contados, o que confirma.
--      Fica registrado porque parece erro e não é: quem for auditar vai tropeçar no
--      mesmo número aparecendo duas vezes.
--   m) Santa Terezinha, ITR da 12.353 (Água Boa II). Na pasta há só o RECIBO, que
--      publica o VTN tributável (R$ 1.096.913,09) e não o VTN. Fica o valor do WP,
--      4.752.655,40, sem conferência documental. A declaração completa resolveria.
--      A área também divergiu: o recibo diz 732,0 ha e a certidão 701,1294.
--
--   n) Agro Aliança, capital da holding: R$ 2,00 de diferença entre fontes. O WP e
--      o slide 11 dão total 9.557.946 com Regina em 3.626.446; a 1ª Alteração da
--      Aliança Participações dá 9.557.944 com Regina em 3.626.444, e a 1ª Alteração
--      da São Bento Agro dá capital de 3.625.944 (o slide 10 dá 3.625.946). Os
--      instrumentos são internamente consistentes entre si e com o acervo, então
--      valem eles. Não muda nada na apuração: o que se doa são as 4.448.500 quotas
--      do Avelino, idênticas nas duas versões, e a GIA-ITCD 337978 confirma.
--   o) O município das quatro São Bento é SANTA CARMEM, não Sinop. Dizem isso a 1ª
--      Alteração da São Bento Agro ("situado no município de Santa Carmem") e as
--      declarações do ITR. Sinop é a comarca do REGISTRO: as quatro estão no
--      Cartório 1º Ofício de Registro de Imóveis, Títulos e Documentos de Sinop.
--      Município do imóvel e comarca do cartório são coisas diferentes, e o WP
--      tratou como se fossem a mesma.
--   p) A cláusula quinta consolidada da 1ª Alteração da Aliança Participações
--      escreve, na prosa, capital de "R$ 9.527.944,00" — mas a tabela logo abaixo
--      soma 9.557.944, e é a tabela que fecha com as suas próprias linhas e com o
--      acervo. Erro de digitação no instrumento; fica o 9.557.944.
--   q) O slide 8, "Estrutura societária definida", lista quatro sócios da holding
--      (Avelino, Iracema, Regina e Cristina). O instrumento lista TRÊS, e o total de
--      9.557.944 não deixa espaço para uma quarta. A Iracema é administradora não
--      sócia (cláusula sexta) e dá outorga conjugal — na GIA-ITCD 337978 ela não
--      aparece como doadora. Ficam os três.
--
-- ACUMULAÇÃO DE DOAÇÕES SUCESSIVAS — A CHAVE É UM TRIO
--   Lei 10.488/2016, arts. 3º e 5º: desde 01/04/2017 acumulam-se, para fins de
--   progressividade, todas as doações do MESMO DOADOR ao MESMO BENEFICIÁRIO no
--   MESMO ANO CIVIL. O simulador oficial da SEFAZ/MT declara a regra e cita os
--   artigos, e a OSG confirmou.
--
--   Consequência direta para o Agro Aliança: a doação entre irmãs e a doação dos
--   pais NÃO se acumulam, porque o doador é outro. São apurações separadas.
--
--   Consequência ainda aberta: com dois doadores no mesmo ato — marido e mulher
--   doando juntos, como no Santa Terezinha — cada par doador × donatário é uma
--   apuração, e não uma base combinada. Fica registrado; a mudança no motor depende
--   de a OSG confrontar o método atual com o simulador.
--
-- A GIA APURA POR PERCENTUAL, E ISSO IMPORTA PARA A CALCULADORA
--   As três GIAs lidas declaram o percentual atribuído a cada donatário e tiram a
--   base de `percentual × total`, não da contagem de quotas:
--
--     Santa Terezinha, GIA A 213388:  6,6667% × 2.827.500,00 = 188.500,94
--     Agro Aliança,    GIA 337978:   25,9100% × 4.448.500,00 = 1.152.606,35
--                                    74,0900% × 4.448.500,00 = 3.295.893,65
--
--   E o percentual vem ARREDONDADO no formulário: a 337978 usa duas casas, a
--   A 213388 usa quatro. Pelas quotas do instrumento o percentual exato da
--   Cristina seria 74,091773%, e a base 3.295.972,00 — R$ 78,35 acima da que a
--   SEFAZ tributou. A diferença de imposto é de R$ 1,57 no total.
--   Consequência de projeto: o percentual é DADO DE ENTRADA da apuração, não algo
--   derivado das quotas. Quem reproduz a guia é quem apura sobre o percentual
--   declarado. Decisão pendente para a tela (SUC-01C), não resolvida aqui.

-- ── 1. Fazenda Santa Terezinha / GCB ────────────────────────────────────────
do $$
declare
  v_cliente   uuid;
  v_cart_nm   uuid;
  v_cart_sjrc uuid;
  v_holding   uuid;   -- GCB Participações, cujas quotas são doadas
  v_agro      uuid;   -- GCB Agro, que detém os imóveis
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

  -- Obrigatório: a trigger `trg_cliente_tem_cluster` é uma constraint DEFERIDA e
  -- recusa no commit qualquer cliente sem vínculo em `cliente_clusters`. Por isso o
  -- vínculo pode vir depois do insert, mas tem que vir. Cliente de sucessão = OSG.
  -- Resolvido por nome de propósito: o id do cluster difere entre sandbox e produção.
  insert into public.cliente_clusters (cliente_id, cluster_id)
    select v_cliente, id from public.estrutura_clusters where name = 'OSG';

  -- Do cabeçalho das certidões. A comarca de São José do Rio Claro registra
  -- imóvel situado em Nova Maringá: comarca e município do imóvel são coisas
  -- diferentes, e o schema já as separa.
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

  -- Proprietário original da matrícula 968 e pai do Cristiano (certidão de 968 e
  -- filiação declarada nos contratos sociais).
  insert into public.pessoa
    (cliente_id, tipo_pessoa, denominacao, cpf_cnpj, profissao, is_fundador)
    values (v_cliente, 'PF', 'VITÉLIO COSTA BEBER', '047.835.490-87',
            'Agricultor', false)
    returning id into v_vitelio;

  -- As duas PJ. A holding é a que se doa; a operacional é a que detém o acervo.
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

  -- Parentesco na direção que o banco usa: filho em `pessoa_id`, pai em
  -- `parente_pessoa_id`. Conferido nas 8 linhas que já existem na base.
  insert into public.parentesco (pessoa_id, parente_pessoa_id, tipo, natureza) values
    (v_gabriel,   v_cristiano, 'Filho(a)', 'Consanguíneo'),
    (v_gabriel,   v_fabiane,   'Filho(a)', 'Consanguíneo'),
    (v_rafael,    v_cristiano, 'Filho(a)', 'Consanguíneo'),
    (v_rafael,    v_fabiane,   'Filho(a)', 'Consanguíneo'),
    (v_cristiano, v_vitelio,   'Filho(a)', 'Consanguíneo');

  -- Quadro da HOLDING, estado ANTES da doação. É a base do ITCD: 8.042.202
  -- quotas, e cada filho recebe 4.021.101, exatos 50%.
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_holding, v_cristiano, 4509384, 4509384.00),
    (v_holding, v_fabiane,   3532818, 3532818.00);

  -- Quadro da OPERACIONAL: unipessoal, 100% da holding, após os sócios cederem
  -- a totalidade das quotas a ela (1ª Alteração, cláusulas sexta a oitava).
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_agro, v_holding, 8040202, 8040202.00);

  -- O acervo da GCB Agro. Os nove primeiros compõem o capital de 8.040.202,00;
  -- os dois últimos existem no cadastro e NÃO foram integralizados.
  --
  -- ITR conferido nas declarações de 2025 da pasta do cliente. Como no Agro
  -- Aliança, o VTN é por CIB e um CIB pode cobrir várias matrículas — o valor
  -- inteiro fica na primeira do grupo e as outras ficam nulas (ressalva j).
  --
  --   matrículas          CIB        valor da terra nua   situação
  --   17.190/191/192      8852069-2        7.162.722,78   confere com o WP; o CIB
  --                                                       tem 908,9 ha = a soma
  --                                                       das três matrículas
  --   26.060              5026384-6        6.304.520,00   atribuição em aberto,
  --                                                       ressalva (l)
  --   8.127               0536377-2        1.833.039,19   confere
  --   12.353              6154215-6        4.752.655,40   só o recibo na pasta,
  --                                                       ressalva (m)
  --   26.560                      —          533.960,89   valor do WP
  --   968                         —        3.830.166,00   valor do WP
  --   970 / 971                   —          132.720,80   valor do WP, urbanos
  --
  -- A 26.910 fica NULA: era a segunda cópia dos 6.304.520,00 (ressalva l).
  for r in
    select * from (values
      -- denominação, matrícula, área, unidade, município, cartório, contábil, ITR, mercado, tipo, ref, integralizado
      ('Fazenda São Domingos',              '17190', 244.4318, 'ha', 'Nova Mutum',   'NM',   196278.73, 7162722.78, 23098805.10, 'IR', 'BS 01', true),
      ('Fazenda Santa Terezinha II',        '17191', 505.6530, 'ha', 'Nova Mutum',   'NM',   479912.64,       null, 47784208.50, 'IR', 'BS 02', true),
      ('Fazenda Reserva São Domingos II',   '17192', 158.8420, 'ha', 'Nova Mutum',   'NM',    64013.52,       null, 15010569.00, 'IR', 'BS 03', true),
      ('Fazenda Santa Terezinha',           '26060', 797.5807, 'ha', 'Nova Mutum',   'NM',   134122.53, 6304520.00, 75371376.15, 'IR', 'BS 04', true),
      ('Lote 20 - Quadra 49 (desmembrado)', '26560', 800.0000, 'ha', 'Nova Mutum',   'NM',   199124.80,  533960.89,   533960.89, 'IR', 'BS 05', true),
      ('Fazenda Água Boa II',               '12353', 701.1294, 'ha', 'Nova Maringá', 'SJRC',  50000.00, 4752655.40, 66256728.30, 'IR', 'BS 06', true),
      -- Três frações integralizadas: 1.500.000 x2 + 635.088,23 x2 + 788.065,00.
      -- O ITR repete os 6.304.520,00 da 26.060 e está CORRETO: são dois imóveis
      -- distintos de 800,0 ha com VTN idêntico. Ver ressalva (l).
      ('Fazenda Santa Terezinha (matrícula 26.910)',
                                            '26910', 799.3133, 'ha', 'Nova Mutum',   'NM',  5058241.46, 6304520.00, 47185078.50, 'IR', 'BS 07', true),
      -- ITR do DIAT 2025: valor da terra nua R$ 1.833.039,19, construções zero.
      ('Fazenda São Bento (Estância Dona Lea)',
                                            '8127',  232.6570, 'ha', 'Nova Mutum',   'NM',  1670000.00, 1833039.19,        null, 'IR', 'BS 08', true),
      ('Lote de terras dos lotes 157A, 157B, 171A e 171B',
                                            '968',   500.0000, 'ha', 'Nova Mutum',   'NM',   188500.94, 3830166.00, 45917550.00, 'IR', 'BS 09', true),
      -- NÃO integralizados, por decisão da cliente (WhatsApp de 06/04/2026).
      ('Imóvel Urbano - Lote 12, Quadra 17', '970',  1000.0000, 'm2', 'Nova Mutum',   'NM',   138600.00,  132720.80,  1000000.00, 'IB', 'BU 01', false),
      ('Imóvel Urbano - Lote 13, Quadra 17', '971',  1000.0000, 'm2', 'Nova Mutum',   'NM',   138600.00,  132720.80,   800000.00, 'IB', 'BU 02', false)
    ) as t(denominacao, numero, area, unidade, municipio, cart, contabil, itr, mercado, tipo, ref, integralizado)
  loop
    -- Os três valores vivem na MATRÍCULA, que é a regra do front para imóvel
    -- (`valoresDoBem.ts`: bem com matrícula soma as matrículas). O de ITR vai em
    -- `vlr_imposto_anual`: o nome diz imposto, mas o campo guarda o valor
    -- DECLARADO no ITR — é o campo que o Diagnóstico Patrimonial usa, rotulado
    -- "ITR anual" no formulário da matrícula, e é o que a OSG preenche.
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

  -- Moeda corrente integralizada: R$ 3,78 no contrato social e R$ 3,60 na 1ª
  -- Alteração. É o que fecha o capital em 8.040.202,00 — os nove imóveis somam
  -- 8.040.194,62. Sem matrícula, então o valor fica no próprio bem.
  -- A moeda entra nos TRÊS cenários com o mesmo valor: dinheiro não tem valor de
  -- ITR nem de mercado diferente do nominal. É o que o WP faz (linha 33 do QUADRO
  -- 2, os três iguais) e sem isso o cenário de ITR fica menor que o do WP.
  -- O valor é R$ 7,38 e não os R$ 2.005,38 do WP: a 1ª Alteração da GCB Agro dá
  -- R$ 3,60 e o contrato social R$ 3,78, e o capital só fecha com 7,38.
  insert into public.bem
    (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao,
     vlr_contabil, vlr_mercado, vlr_imposto_anual)
    values
    (v_cliente, 'BO 01', 'OU', 'Moeda corrente integralizada no capital', true,
     7.38, 7.38, 7.38);

  raise notice 'Santa Terezinha de exemplo criado: cliente %', v_cliente;
end $$;

-- ── 2. Agro Aliança / Família Bocolli ──────────────────────────────────────
--
-- Mesma cascata de três níveis do Santa Terezinha, com DUAS operacionais:
--
--   Avelino (doador único, com anuência da Iracema)
--         │  2 instrumentos de doação, um por filha — GIA-ITCD 337978
--         ▼
--   ALIANÇA PARTICIPAÇÕES  capital 9.557.944   ← é ISTO que se doa
--         │  detém 100% de cada uma
--         ├── AGRO ALIANÇA LTDA      8 imóveis   capital 5.930.000
--         └── SÃO BENTO AGRO LTDA    4 imóveis   capital 3.625.944
--
-- A CADEIA DE CAPITAL, RECONCILIADA AO CENTAVO PELOS INSTRUMENTOS
--   Os slides 10 e 11 da apresentação dão o QSA das três etapas, e cada etapa tem
--   o seu instrumento. Onde os dois divergem, vale o instrumento:
--
--   4ª Alteração da AGRO ALIANÇA LTDA
--     Avelino 4.447.500 + Cristina 1.482.500 = capital R$ 5.930.000,00
--     ambos cedem a totalidade à Aliança Participações, que fica com 100%
--     dos quais 8 imóveis    5.921.018,00  e moeda/outros  8.982,00
--
--   1ª Alteração da R&L TRANSPORTES, que passa a se chamar SÃO BENTO AGRO LTDA
--     capital inicial R$ 30.000,00 (Luis Henrique e Regina, 15.000 cada)
--     + aumento R$ 3.595.944,00 = capital R$ 3.625.944,00
--       4 imóveis  3.595.942,40  +  moeda R$ 1,60 (cláusula décima, item "e")
--     Luis Henrique cede tudo à Regina, que cede tudo à Aliança Participações
--
--   1ª Alteração da ALIANÇA PARTICIPAÇÕES LTDA — cláusulas quarta e quinta
--     Avelino    1.000 + 4.447.500 (Agro Aliança)   = 4.448.500
--     Cristina     500 + 1.482.500 (Agro Aliança)   = 1.483.000
--     Regina       500 + 3.625.944 (São Bento Agro) = 3.626.444
--     TOTAL      2.000 + 9.555.944                 = 9.557.944
--
--   E o acervo fecha com ele:
--     12 imóveis                                     9.516.960,40
--     moeda: 2.000,00 + 8.982,00 + 30.000,00 + 1,60     40.983,60
--     TOTAL                                          9.557.944,00
--
--   ATENÇÃO: o WP e a apresentação dão 9.557.946,00, com Regina em 3.626.446. Os
--   instrumentos dão 9.557.944,00 e Regina em 3.626.444. A diferença de R$ 2,00
--   está do lado da Regina e vem da São Bento Agro (3.625.944 no instrumento,
--   3.625.946 no slide 10). Aqui vale o instrumento. Ver ressalva (n).
--
-- Área e cartório de cada matrícula conferidos um a um nos doze formulários de
-- Diagnóstico Patrimonial do cliente. As doze áreas do WP se confirmam neles, e as
-- quatro São Bento se confirmam também na 1ª Alteração da São Bento Agro.
do $$
declare
  v_cliente    uuid;
  v_holding    uuid;   -- Aliança Participações, cujas quotas são doadas
  v_agro       uuid;   -- Agro Aliança Ltda
  v_saobento   uuid;   -- São Bento Agro Ltda
  v_cart_pdg   uuid;
  v_cart_apc   uuid;
  v_cart_snp   uuid;
  v_avelino    uuid;
  v_iracema    uuid;
  v_cristina   uuid;
  v_regina     uuid;
  v_luis       uuid;   -- cônjuge da Regina, sócio original da R&L Transportes
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

  -- Mesma obrigação do bloco 1: sem vínculo de cluster o commit é recusado.
  insert into public.cliente_clusters (cliente_id, cluster_id)
    select v_cliente, id from public.estrutura_clusters where name = 'OSG';

  -- Três cartórios, dos formulários de DP. O 1º Ofício de Sinop registra tanto os
  -- imóveis de Sinop quanto os da comarca de Santa Carmem.
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

  -- Qualificação completa da 4ª Alteração da Agro Aliança e da 1ª Alteração da
  -- Aliança Participações. O CPF se confirma em três lugares independentes: os dois
  -- instrumentos, a GIA-ITCD 337978 (onde ele é o doador) e as declarações do ITR
  -- (onde ele é o representante legal da Agro Aliança).
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

  -- Cônjuge da Regina. Entra porque é ele quem detinha metade da R&L Transportes e
  -- integralizou 50% da matrícula 68.579 com outorga conjugal dela — sem ele a
  -- cadeia da São Bento Agro não se explica. Qualificação da 1ª Alteração.
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

  -- As duas operacionais, qualificadas pela 4ª Alteração da Agro Aliança e pela 1ª
  -- Alteração da R&L Transportes. A São Bento Agro NÃO é empresa nova: é a R&L
  -- Transportes Ltda renomeada, com objeto social trocado para atividade rural
  -- (cláusulas segunda e terceira daquele instrumento) — por isso ela já tinha
  -- capital de R$ 30.000,00 antes de receber os imóveis.
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

  -- Quadro da HOLDING, estado ANTES da doação. O instrumento é explícito: o sócio
  -- AVELINO doa "a totalidade de suas quotas, ou seja, 4.448.500", com a devida
  -- ANUÊNCIA da cônjuge Iracema — ela NÃO é sócia e por isso não entra aqui.
  --
  -- Importa para a legítima: com um doador, teto(4.448.500/2/2) = 1.112.125,
  -- exatamente o que o instrumento dá a cada filha. Com dois doadores de
  -- 2.224.250 daria 1.112.126 — uma quota a mais. A GIA-ITCD 337978 confirma o
  -- doador único: consta AVELINO NERI BOCOLLI, CPF 197.665.139-53, doando as
  -- 4.448.500 quotas, e a Iracema não aparece.
  --
  -- A doação real IGUALOU as duas filhas, que é o uso da disponível descrito na
  -- apresentação. Pela 337978, Cristina fica com 74,09% e Regina com 25,91%:
  --     Cristina  1.483.000 + 3.295.893,65 = 4.778.893,65
  --     Regina    3.626.444 + 1.152.606,35 = 4.779.050,35
  -- Metade do capital é 4.778.972,00 — as duas caem a R$ 78,35 dela, que é o
  -- arredondamento do percentual a duas casas. Este quadro é o ANTES; a
  -- calculadora é que produz o depois.
  --
  -- Usufruto, para o registro: a 337978 é "DOAÇÃO COM RESERVA DE USUFRUTO" e
  -- apura sobre 100% da base, com encerramento da tributação (art. 28, § 3º, III,
  -- do Decreto 2.125/2003) — nada mais é devido na extinção. Já a GIA 338021, em
  -- que a Regina institui usufruto de 13,44% do capital em favor do Avelino, apura
  -- sobre 70%: 1.284.747,00 × 70% = 899.322,90. Os dois números do usufruto (100%
  -- e 70%) são de operações DIFERENTES, não parcelas da mesma.
  --
  -- O total de 9.557.944 é idêntico ao contábil do acervo abaixo.
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_holding, v_avelino,  4448500, 4448500.00),
    (v_holding, v_cristina, 1483000, 1483000.00),
    (v_holding, v_regina,   3626444, 3626444.00);

  -- Quadro das DUAS OPERACIONAIS, estado atual. Nas duas a Aliança Participações
  -- ficou com 100% depois das cessões, e é por isso que doar quota da holding move
  -- o acervo inteiro. O sistema puxa só o que está integralizado, então este quadro
  -- é o que sustenta a cascata da calculadora.
  insert into public.quadro_societario
    (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total) values
    (v_agro,     v_holding, 5930000, 5930000.00),
    (v_saobento, v_holding, 3625944, 3625944.00);

  -- O acervo: doze imóveis. Contábil e vínculo com a operacional das colunas H a O
  -- do WP; ITR conferido nas nove declarações do ITR 2025 da pasta do cliente,
  -- linha "valor da terra nua"; mercado do WP, na falta de laudo (ressalva k).
  --
  -- O ITR é nulo onde a matrícula divide CIB com outra: o valor inteiro do CIB fica
  -- na primeira do grupo (ressalva j). Assim o CIB 3049863-5 lança 13.945.347,75 na
  -- 64.514 e deixa a 64.515 e a 64.516 nulas, e o 4886323-8 lança 14.927.715,99 na
  -- 13.180 e deixa a 13.447 nula.
  --
  -- CONFERÊNCIA: as nove declarações do ITR 2025 cobrem as doze matrículas, e os
  -- doze valores do WP conferem ao centavo. Nenhuma divergência.
  --
  --   matrículas          CIB        valor da terra nua   tributável
  --   64.514/515/516      3049863-5       13.945.347,75    9.376.851,82
  --   13.180 / 13.447     4886323-8       14.927.715,99    5.112.742,72
  --   2.530               8760837-5          978.160,20            0,00
  --   2.531               8764165-8          945.735,00            0,00
  --   30.173              7495035-5        2.448.420,69            0,00
  --   67.876              2488041-8        1.127.237,37      558.320,66
  --   68.579              8806924-9        1.053.772,99      527.097,24
  --   68.580              8806927-3        1.053.772,99      527.097,24
  --   68.581              2488040-0        1.053.772,99      527.097,24
  --
  -- As três São Bento repetem 1.053.772,99 em CIBs diferentes porque são três lotes
  -- idênticos de 179,3 ha — não é cópia. E é a coluna da direita que está no
  -- cadastro antigo do sandbox: é dela que vêm as "divergências" da ressalva (i).
  for r in
    select * from (values
      -- denominação, matrícula, área, unidade, município, cartório, contábil, ITR, mercado, empresa, ref
      ('Fazenda Aliança 01',           '64.514',  507.2349, 'ha',    'Santa Carmem',      'SNP', 1200000.00, 13945347.75, 41030108.60, 'AGRO', 'BS 01'),
      ('Fazenda Aliança 03',           '64.516',  503.4100, 'ha',    'Santa Carmem',      'SNP', 1200000.00,        null,        null, 'AGRO', 'BS 02'),
      ('Fazenda Aliança 02',           '64.515',  504.4094, 'ha',    'Santa Carmem',      'SNP', 1200000.00,        null,        null, 'AGRO', 'BS 03'),
      ('Fazenda Aliança',              '2.531',   350.0000, 'ha',    'Apiacás',           'APC',  150000.00,   945735.00,   945735.00, 'AGRO', 'BS 04'),
      ('Fazenda Aliança',              '2.530',   362.0000, 'ha',    'Apiacás',           'APC',  181018.00,   978160.20,   978160.20, 'AGRO', 'BS 05'),
      ('Fazenda Aliança IV - Parte A', '30.173',  416.6933, 'ha',    'Santa Carmem',      'SNP', 1000000.00,  2448420.69,  2448420.69, 'AGRO', 'BS 06'),
      ('Agroaliança Porto II',         '13.180',  387.6829, 'ha_m2', 'Porto dos Gaúchos', 'PDG',  254775.35, 14927715.99, 14927715.99, 'AGRO', 'BS 07'),
      ('Agroaliança Porto II',         '13.447', 1118.7661, 'ha_m2', 'Porto dos Gaúchos', 'PDG',  735224.65,        null,        null, 'AGRO', 'BS 08'),
      ('Fazenda São Bento II',         '68.579',  179.3042, 'ha',    'Santa Carmem',             'SNP',  992800.00,  1053772.99,  1053772.99, 'SB',   'BS 09'),
      ('Fazenda São Bento III',        '68.580',  179.3043, 'ha',    'Santa Carmem',             'SNP',  876571.20,  1053772.99,  1053772.99, 'SB',   'BS 10'),
      ('Fazenda São Bento',            '67.876',  191.8035, 'ha',    'Santa Carmem',             'SNP',  876571.20,  1127237.37,  1127237.37, 'SB',   'BS 11'),
      ('Fazenda São Bento I',          '68.581',  179.3042, 'ha',    'Santa Carmem',             'SNP',  850000.00,  1053772.99,  1053772.99, 'SB',   'BS 12')
    ) as t(denominacao, numero, area, unidade, municipio, cart, contabil, itr, mercado, empresa, ref)
  loop
    -- `empresa_destino_pessoa_id` registra em qual operacional o imóvel foi
    -- integralizado, que é a coluna "Empresa Integralizada" do WP.
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

  -- Moeda corrente: fecha o capital em 9.557.944,00 — os doze imóveis somam
  -- 9.516.960,40. Não é um resíduo: os quatro pedaços estão nos instrumentos.
  --     R$  2.000,00  capital inicial da Aliança Participações
  --     R$  8.982,00  na Agro Aliança Ltda (5.930.000,00 − 5.921.018,00)
  --     R$ 30.000,00  capital inicial da R&L Transportes / São Bento Agro
  --     R$      1,60  cláusula décima, item "e", da 1ª Alteração da São Bento Agro
  -- Nos três cenários com o mesmo valor, como o WP faz na linha 17 da aba
  -- principal (L17 = M17 = N17 = 40.983,60).
  insert into public.bem
    (cliente_id, referencia_dp, tipo_bem, denominacao, participa_estruturacao,
     vlr_contabil, vlr_mercado, vlr_imposto_anual)
    values
    (v_cliente, 'BO 01', 'OU', 'Moeda corrente integralizada no capital', true,
     40983.60, 40983.60, 40983.60);

  raise notice 'Agro Aliança de exemplo criado: cliente %', v_cliente;
end $$;
