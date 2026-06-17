-- Seed: blocos + documento montado "Contrato Social — Sociedade Limitada (Agro)".
-- Extraído do modelo "VF_Modelo de Contrato Social_Agro.doc". Texto jurídico
-- reproduzido fielmente (limpando apenas artefatos de controle de alterações).
--
-- Placeholders namespaced que LIGAM ao cadastro (seletor por entidade na tela Gerar):
--   socio.* / socio2.* / administrador.* / conjuge.*  -> pessoa (com concordância de gênero)
--   imovel.*                                          -> matrícula (bem+cartório achatados)
-- Placeholders SEM ponto = texto livre (a sociedade está sendo constituída e o
--   capital/quotas ainda não é modelado): razaoSocial, sede*, objetoSocial,
--   capital*, totalQuotas*, quadroSocietario, regimeCasamento, foro*, dataAssinatura.

-- Guarda anti-duplicação.
do $$
begin
  if exists (select 1 from tmpl_documento where nome = 'Contrato Social — Sociedade Limitada (Agro)') then
    raise exception 'Documento "Contrato Social — Sociedade Limitada (Agro)" já existe — seed abortado.';
  end if;
end $$;

create temporary table _doc as select gen_random_uuid() as id;

create temporary table _blocos (
  ordem int, codigo text, nome text, categoria text, obrigatorio boolean, conteudo text
);

insert into _blocos (ordem, codigo, nome, categoria, obrigatorio, conteudo) values
(1, 'cabecalho', 'Cabeçalho e razão social', 'contrato-social', true,
$blk$INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA

{{ razaoSocial }}
$blk$),

(2, 'preambulo', 'Preâmbulo — qualificação dos sócios', 'contrato-social', true,
$blk${{ socio.nome }}, {{ socio.brasileiro }}, {{ socio.casado }}, {{ socio.profissao }}, {{ socio.portador }} da Cédula de Identidade RG nº {{ socio.rg }} - {{ socio.orgaoExpedidor }}, {{ socio.inscrito }} no CPF/MF sob o nº {{ socio.cpfCnpj }}, {{ socio.residente }} no endereço {{ socio.endereco }}; e {{ socio2.nome }}, {{ socio2.brasileiro }}, {{ socio2.casado }}, {{ socio2.profissao }}, {{ socio2.portador }} da Cédula de Identidade RG nº {{ socio2.rg }} - {{ socio2.orgaoExpedidor }}, {{ socio2.inscrito }} no CPF/MF sob o nº {{ socio2.cpfCnpj }}, {{ socio2.residente }} no endereço {{ socio2.endereco }}.

Contrataram, entre si, a constituição de uma sociedade limitada que se regerá pela Lei nº. 10.406, de 10 de janeiro de 2002 e supletivamente pela Lei nº 6.404, de 15 de dezembro de 1976; sendo que, nos casos omissos, desde que não sejam conflitantes com as legislações retro, será aplicado o que estiver disposto em eventual Acordo de Quotistas, conforme cláusulas e condições doravante expostas:$blk$),

(3, 'cap1-denominacao', 'Capítulo I — Denominação (Cláusula 1ª)', 'contrato-social', true,
$blk$CAPÍTULO I
Denominação, Sede e Prazo de Duração

CLÁUSULA PRIMEIRA: A sociedade girará sob o nome {{ razaoSocial }}, regendo-se por este contrato social, pela Lei nº 10.406, de 10 de janeiro de 2.002, supletivamente pela Lei nº 6.404, de 15 de dezembro de 1.976 e, quando for o caso e nos limites do que for pactuado, por eventuais Acordos de Quotistas.$blk$),

(4, 'cap1-sede', 'Capítulo I — Sede (Cláusula 2ª)', 'contrato-social', true,
$blk$CLÁUSULA SEGUNDA: A sociedade terá sede estabelecida na {{ sedeEndereco }}, no município de {{ sedeMunicipio }}, no Estado de {{ sedeUf }}, CEP {{ sedeCep }}.
Parágrafo Único: Poderão ser abertas filiais e outros estabelecimentos em qualquer parte do território nacional e no exterior mediante a respectiva alteração do contrato social.$blk$),

(5, 'cap1-prazo', 'Capítulo I — Prazo de duração (Cláusula 3ª)', 'contrato-social', true,
$blk$CLÁUSULA TERCEIRA: O prazo de duração desta sociedade é indeterminado, iniciando suas atividades na data de registro do contrato social na Junta Comercial, findando-se na forma da lei.$blk$),

(6, 'cap2-objeto', 'Capítulo II — Objeto social (Cláusula 4ª)', 'contrato-social', true,
$blk$CAPÍTULO II
Objeto Social

CLÁUSULA QUARTA: A sociedade terá por objeto as seguintes atividades:
{{ objetoSocial }}
Parágrafo Único: As atividades agropecuárias descritas acima poderão ser exercidas isoladamente pela sociedade e/ou em parceria com terceiros ou até mesmo sócios da sociedade, em áreas próprias e/ou de terceiros; e os produtos decorrentes das atividades econômicas descritas acima poderão ser alienados no Brasil ou no exterior.$blk$),

(7, 'cap3-capital', 'Capítulo III — Capital social (Cláusula 5ª)', 'contrato-social', true,
$blk$CAPÍTULO III
Capital Social

CLÁUSULA QUINTA: O capital social da empresa será de R$ {{ capitalValor }} ({{ capitalExtenso }}), dividido em {{ totalQuotas }} ({{ totalQuotasExtenso }}) quotas, no valor nominal de R$ 1,00 (um real) cada uma, estando o capital social totalmente subscrito e integralizado pelos sócios, distribuído da seguinte forma:
{{ quadroSocietario }}
Parágrafo Primeiro: A responsabilidade de cada sócio é restrita ao valor de suas quotas, mas todos respondem solidariamente pela integralização do capital social.$blk$),

(8, 'cap3-integralizacao-bem', 'Capítulo III — Integralização de imóvel (Cláusula 5ª, §2º)', 'contrato-social', true,
$blk$Parágrafo Segundo: Os bens abaixo relacionados são integralizados neste ato pelo sócio {{ socio.nome }}, já qualificado, junto ao capital social da sociedade, com a devida outorga conjugal de {{ conjuge.nome }}, {{ conjuge.brasileiro }}, {{ conjuge.profissao }}, {{ conjuge.portador }} da Cédula de Identidade RG nº {{ conjuge.rg }} - {{ conjuge.orgaoExpedidor }}, {{ conjuge.inscrito }} no CPF/MF sob o nº {{ conjuge.cpfCnpj }}, em razão do casamento sob o regime de {{ regimeCasamento }}:
    a) Um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado {{ imovel.denominacao }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, objeto da matrícula nº {{ imovel.numero }} do {{ imovel.cartorio }}, da comarca de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, inscrito no CCIR/SNCR sob o nº {{ imovel.ccir }}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}.$blk$),

(9, 'cap4-administracao', 'Capítulo IV — Administração (Cláusula 6ª)', 'contrato-social', true,
$blk$CAPÍTULO IV
Administração

CLÁUSULA SEXTA: A sociedade será administrada isoladamente por {{ administrador.nome }}, {{ administrador.brasileiro }}, {{ administrador.casado }}, {{ administrador.profissao }}, {{ administrador.portador }} da Cédula de Identidade RG nº {{ administrador.rg }} - {{ administrador.orgaoExpedidor }}, {{ administrador.inscrito }} no CPF/MF sob o nº {{ administrador.cpfCnpj }}, {{ administrador.residente }} no endereço {{ administrador.endereco }}, a quem competirá representar a sociedade ativa e passivamente, em juízo ou fora dele, inclusive perante o sistema financeiro nacional, entidades oficiais, repartições públicas, autarquias e sociedades de economia mista, repartições federais, estaduais e municipais, observando sempre os eventuais limites e condições impostas pelo presente Contrato Social, podendo, para tanto:
    a) Celebrar instrumentos e negócios jurídicos relacionados a operações financeiras, empréstimos, financiamentos e respectivos instrumentos de constituição de garantias;
    b) Comprar, adquirir, emprestar e permutar bens móveis de toda e qualquer natureza, incluindo fertilizantes, defensivos, sementes, mudas, insumos, peças, implementos, equipamentos, máquinas, suplementos etc.;
    c) Celebrar contratos de "leasing", aluguel e contratar serviços de terceiros;
    d) Alienar bens móveis da sociedade e produtos decorrentes da exploração das atividades econômicas exercidas pela sociedade;
    e) Realizar investimentos, construções, edificações e realização de benfeitorias, contratando, comprando e adquirindo bens em nome da sociedade;
    f) Celebrar contratos, instrumentos jurídicos e negócios de qualquer natureza não elencados anteriormente e que obriguem e/ou onerem a sociedade e seu patrimônio;
    g) Abrir, encerrar, movimentar contas bancárias, assinar cheques, recibos e depósitos bancários;
    h) Autorizar a sociedade a iniciar e firmar acordos em processos judiciais;
    i) Convocar Reunião de Sócios, ressalvadas as demais hipóteses previstas neste contrato social e em lei;
    j) Elaborar o balanço patrimonial e as demonstrações financeiras e contábeis a serem submetidas à Reunião de Sócios para aprovação;
    k) Encaminhar à Reunião de Sócios proposta de compra, alienação e/ou oneração de bens imóveis a favor da sociedade ou de propriedade dela;
    l) Aprovar o uso de qualquer marca, nome ou símbolo que represente o nome, denominação social, razão social ou nome fantasia da sociedade por terceiros.
Parágrafo Primeiro: É vedado ao(s) administrador(es) empregar(em) o nome da sociedade em operações ou negócios estranhos ao objeto social.
Parágrafo Segundo: O(s) administrador(es) qualificado(s) no caput declara(m) sob as penas da lei que não está(ão) impedido(s) de exercer(em) a administração da sociedade, por lei especial, ou em virtude de condenação criminal, ou por se encontrar(em) sob os efeitos dela, a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, ou contra a economia popular, contra o sistema financeiro nacional, contra normas de defesa da concorrência, contra as relações de consumo, fé pública ou a propriedade (art. 1.011, § 1º, CC/2002).

CLÁUSULA SÉTIMA: Ao(s) administrador(es) é vedado fazer(em)-se substituir no exercício de suas funções, decorrente do caráter personalíssimo da atividade; dessa forma, a empresa poderá nomear procuradores, através de seus administradores, nos limites de seus poderes, devendo as procurações serem outorgadas com a menção expressa dos poderes conferidos, e deverão, com exceção daquelas para fins judiciais, ter prazo determinado de validade de no máximo 01 (um) ano (art. 1.018, CC/2002).
Parágrafo Único: É vedada a outorga de poderes para a aquisição de imóveis, à alienação ou oneração destes bens de propriedade da sociedade, a prestação de avais, fianças e garantias de qualquer natureza, ainda que no instrumento de mandato sejam outorgados poderes específicos para a prática de tais atos.$blk$),

(10, 'cap5-eventos-socio', 'Capítulo V — Falecimento, impedimento e demais eventos (Cláusula 8ª)', 'contrato-social', true,
$blk$CAPÍTULO V
Falecimento, Impedimento, Interdição, Separação, Falência ou Insolvência do Sócio

CLÁUSULA OITAVA: O falecimento, impedimento, interdição, falência ou insolvência de qualquer um dos sócios não importará em dissolução da sociedade.
Parágrafo Primeiro: Ocorrendo o falecimento, será facultada aos herdeiros, sucessores e cônjuge meeiro, caso já não sejam sócios da sociedade, ingressarem através das quotas que competem aos mesmos por direito, desde que não haja oposição de sócios que representem mais de ¼ (um quarto) do capital social da sociedade, observado ainda o disposto em eventual Acordo de Quotistas.
Parágrafo Segundo: Não sendo possível ou inexistindo interesse dos herdeiros, sucessores, do cônjuge meeiro e/ou não sendo aprovado o ingresso pelos sócios remanescentes, o valor de seus haveres será apurado e liquidado com base na determinação contida no Parágrafo Terceiro desta Cláusula, em 10 (dez) parcelas anuais e consecutivas, vencendo a primeira parcela em 01 (um) ano contado do evento, atualizadas monetariamente pela variação do INPC - Índice Nacional de Preços ao Consumidor, salvo se os sócios, em Reunião, deliberarem pelo pagamento em prazo inferior àquele.
Parágrafo Terceiro: O valor dos haveres a serem pagos por força do disposto no parágrafo anterior, bem como nas demais hipóteses em que este parágrafo for utilizado como referência no presente contrato social, deverá corresponder obrigatoriamente à avaliação apurada pelas metodologias descritas nas alíneas a seguir, dividido pelo número de quotas objeto de alienação e/ou de pagamento, sendo eleita a avaliação que maior valor atribuir a cada quota, a saber:
    a) Fluxo de caixa projetado para um período de 05 (cinco) anos (fluxo de caixa descontado) calculado sobre o valor apurado no ano em que ocorrer o evento, calculado no máximo 60 (sessenta) dias antes do evento, acrescido de perpetuidade e descontado a valores presentes;
    b) Pelo valor do patrimônio líquido apurado em balanço, levantado no máximo 60 (sessenta) dias antes do evento, especificamente para este fim, de acordo com as normas técnicas contábeis vigentes à época, acrescido pela diferença entre os valores de mercado dos bens imóveis e demais ativos permanentes de propriedade da sociedade.
Parágrafo Quarto: Nos casos em que ocorrer a separação, divórcio ou dissolução de união estável de qualquer um dos sócios e for assegurado ao cônjuge ou companheiro direito às quotas, o ingresso deste cônjuge no quadro societário deverá obedecer os mesmos critérios estabelecidos na presente cláusula, incluindo o quórum para aprovação de seu ingresso em Reunião de Sócios.
Parágrafo Quinto: Em todos os demais casos em que ocorrer a resolução da sociedade em relação a um de seus sócios, os valores devidos serão determinados através da metodologia descrita no Parágrafo Terceiro e o prazo e forma de pagamento serão aqueles descritos no Parágrafo Segundo, ambos desta cláusula.
Parágrafo Sexto: As avaliações da sociedade eventualmente necessárias para cumprir o disposto neste contrato serão realizadas por empresa especializada, cujo nome será aprovado pelos sócios que representem a maioria das quotas presentes na Reunião de Sócios que deliberar sobre o assunto.$blk$),

(11, 'cap6-alienacao-quotas', 'Capítulo VI — Alienação de quotas (Cláusulas 9ª a 11ª)', 'contrato-social', true,
$blk$CAPÍTULO VI
Alienação de Quotas e Ingresso de Terceiros

CLÁUSULA NONA: O sócio que desejar alienar e/ou ceder gratuitamente as suas quotas a outros sócios ou a terceiros estranhos ao quadro societário deverá obedecer às seguintes regras e condições, além daquelas dispostas em eventuais acordos de quotistas arquivados na forma da lei, tudo sob pena de nulidade do ato/negócio realizado em inobservância a estas normas:
    a) Primeiramente, o sócio alienante/cedente deverá ofertar as suas quotas aos demais sócios, na proporção exata da participação societária de cada um, para que, querendo, exerçam o seu direito de preferência, em igualdade de condições e preço;
    b) Não exercido o direito de preferência por um ou mais sócios, o sócio alienante/cedente deverá ofertar as quotas remanescentes aos demais sócios que exerceram seu direito de preferência, em rateios sucessivos, até que nenhum dos sócios exerça o direito de preferência e/ou todas as quotas tenham sido adquiridas;
    c) Não exercido o direito de preferência pelos sócios, e/ou sendo ele exercido parcialmente, a transferência parcial ou total das quotas a terceiros estranhos ao quadro societário dependerá, ainda, da não oposição de sócios que representem ¼ (um quarto) do capital social, deliberação tomada em Reunião de Sócios convocada especialmente para este fim.
Parágrafo Primeiro: O disposto nesta cláusula deverá ser observado ainda que a alienação e/ou cessão de quotas seja gratuita e/ou de apenas parte das quotas.
Parágrafo Segundo: O direito de preferência deverá ser exercido em até 30 (trinta) dias da ciência de cada oferta, encaminhada ao endereço do sócio descrito no preâmbulo deste contrato social e comunicada ao administrador da sociedade.
Parágrafo Terceiro: A notificação de oferta deverá conter a quantidade e o preço de cada quota ofertada, a forma e prazo de pagamento, o nome do interessado e cópia do instrumento de interesse de compra e venda com cláusula de irretratabilidade e irrevogabilidade.
Parágrafo Quarto: O prazo de 30 (trinta) dias será assegurado para cada oferta.
Parágrafo Quinto: Não aprovada a alienação/cessão para terceiros estranhos ao quadro societário, o sócio alienante/cedente poderá retirar-se da sociedade, aplicando-se o disposto na Cláusula Oitava quanto a valores, prazos e forma de pagamento.
Parágrafo Sexto: Caso os sócios não optem pela aquisição das quotas por força de eventual penhora em razão de dívida particular de um dos sócios, as quotas do sócio devedor serão liquidadas e pagas em 10 (dez) parcelas anuais e consecutivas, atualizadas pela variação do INPC.

CLÁUSULA DÉCIMA: Nos casos de penhora judicial de quotas de algum dos sócios, poderão os demais sócios exigir para si as quotas penhoradas, sendo que: a) o valor a ser pago por cada quota será o maior valor apurado nos termos da Cláusula Oitava, Parágrafo Terceiro; b) o pagamento será realizado em 10 (dez) parcelas anuais e consecutivas, corrigidas apenas pelo INPC; c) os quotistas e/ou a sociedade não estarão obrigados a liquidar e/ou adquirir tais quotas; d) a aquisição poderá ser total ou parcial e obedecerá os direitos de preferência estabelecidos neste contrato social.

CLÁUSULA DÉCIMA PRIMEIRA: É expressamente vedada, para cumprimento das exigências deste capítulo, a utilização de procurador, independentemente de ser sócio ou não.$blk$),

(12, 'cap7-exclusao', 'Capítulo VII — Exclusão de sócios (Cláusulas 12ª e 13ª)', 'contrato-social', true,
$blk$CAPÍTULO VII
Exclusão dos Sócios

CLÁUSULA DÉCIMA SEGUNDA: No caso de exclusão do sócio ou pedido de retirada do quadro societário, os pagamentos dos haveres devidos serão realizados após apuração e liquidação no molde descrito no Parágrafo Terceiro da Cláusula Oitava, sendo pago o valor devido no prazo e na forma estipulados no Parágrafo Segundo daquela mesma cláusula.
Parágrafo Único: O sócio que for excluído da sociedade por justa causa receberá seus haveres com base no caput, subtraindo-se do valor que seria pago a ele eventual dano material ou moral que tenha causado à sociedade.

CLÁUSULA DÉCIMA TERCEIRA: A sociedade poderá, a qualquer tempo, através de alteração contratual precedida de deliberação em Reunião de Sócios, excluir por justa causa o(s) sócio(s) que:
    a) Deixar(em) de integralizar suas quotas de capital na sociedade;
    b) Praticar(em) grave violação de seus deveres na qualidade de sócio ou administrador, de inegável gravidade reconhecida em Reunião de Sócios;
    c) Tiver(em) identificada incapacidade civil superveniente;
    d) Colocar(em) em risco a continuidade da sociedade.
Parágrafo Primeiro: Também ocorrerá a exclusão do sócio por justa causa caso ocorra o desaparecimento da "affectio societatis".
Parágrafo Segundo: Será assegurada ao sócio sujeito à exclusão por justa causa a liberdade de apresentar defesa na Reunião de Sócios que deliberar sua exclusão, devendo ser intimado com antecedência mínima de 30 (trinta) dias da data da realização do ato.$blk$),

(13, 'cap8-lucros', 'Capítulo VIII — Exercício social e lucros (Cláusula 14ª)', 'contrato-social', true,
$blk$CAPÍTULO VIII
Exercício Social e Distribuição de Lucros

CLÁUSULA DÉCIMA QUARTA: O exercício social corresponde ao ano civil (01 de janeiro a 31 de dezembro) e a apuração de lucros, sua distribuição e os eventuais valores pagos aos administradores a título de pró-labore obedecerão os seguintes princípios:
    a) Até o quarto mês subsequente ao término de cada exercício social, o(s) administrador(es) reunir-se-á(ão) com os sócios, em Reunião de Sócios, para prestar contas justificadas da administração, procedendo à elaboração do inventário, do balanço patrimonial e do balanço de resultado econômico, cabendo aos sócios, na proporção de suas quotas, deliberar sobre a distribuição dos lucros;
    b) O(s) administrador(es) disponibilizará(ão) aos sócios, na sede da sociedade, os documentos de que trata a alínea "a" com antecedência mínima de 30 (trinta) dias da realização da reunião (art. 1.078, § 1º, CC);
    c) Ao(s) administrador(es) será(ão) assegurada(s) retirada(s) mensal(is) a título de pró-labore, fixadas na Reunião de Sócios descrita na alínea "a";
    d) Todos os sócios terão direito a uma retirada anual, após o levantamento do balanço, a título de distribuição de lucros.
Parágrafo Primeiro: Os valores e condições para efetivação das retiradas das alíneas "c" e "d" dependerão da aprovação dos sócios titulares de mais da metade do capital social.
Parágrafo Segundo: Fica a sociedade autorizada a distribuir antecipadamente lucros do exercício, com base em levantamento de balanço intermediário, observada a reposição de lucros quando a distribuição afetar o capital social (art. 1.059 da Lei 10.406/2002), bem como a distribuí-los desproporcionalmente à participação societária, desde que assim deliberem por unanimidade dos presentes (arts. 1.007 e 1.008 do CC).$blk$),

(14, 'cap9-reuniao', 'Capítulo IX — Reunião de Sócios (Cláusulas 15ª a 17ª)', 'contrato-social', true,
$blk$CAPÍTULO IX
Reunião de Sócios

CLÁUSULA DÉCIMA QUINTA: As decisões sociais e soluções dos casos omissos serão tomadas em Reunião de Sócios por decisão dos sócios que representem mais da metade do capital social presentes na ocasião, valendo cada quota um voto, respeitadas as regras de eventuais Acordos de Quotistas e as prescrições da legislação vigente, ressalvados os casos em que este contrato, ou a lei, exigir maior quórum (art. 1.076 da Lei 10.406/2002).
Parágrafo Primeiro: A convocação será realizada em jornal de grande circulação no município da sede e publicada por três vezes, ao menos, observado o prazo mínimo de oito dias para a primeira convocação e de cinco dias para as posteriores.
Parágrafo Segundo: A publicação deverá constar local, data, hora e ordem do dia, bem como demais requisitos em lei.
Parágrafo Terceiro: Dispensam-se as formalidades de convocação quando todos os sócios comparecerem, ou se declararem por escrito cientes do local, data, hora e ordem do dia, ou forem notificados de tais informações.
Parágrafo Quarto: Será dispensada a própria Reunião de Sócios quando todos decidirem por escrito sobre a matéria, vedada nesta hipótese a utilização de procuração.
Parágrafo Quinto: A Reunião poderá ser convocada por sócio quando o(s) administrador(es) retardar(em) a convocação por mais de sessenta dias, ou por titulares de mais de 1/5 (um quinto) do capital social.
Parágrafo Sexto: As deliberações tomadas em conformidade com a lei e com o presente contrato vinculam todos os sócios, ainda que ausentes ou dissidentes.

CLÁUSULA DÉCIMA SEXTA: A Reunião de Sócios instala-se com a presença, em primeira convocação, de titulares de no mínimo três quartos do capital social e, em segunda, com qualquer número.
Parágrafo Primeiro: A Reunião será presidida e secretariada por sócios escolhidos entre os presentes.
Parágrafo Segundo: Dos trabalhos e deliberações será lavrada, no livro de atas, ata assinada pelos membros da mesa e pelos sócios participantes.
Parágrafo Terceiro: Cópia da ata, autenticada pela mesa, poderá, nos vinte dias subsequentes à reunião, ser apresentada ao Registro Público de Empresas Mercantis para arquivamento e averbação, caso os sócios desejem torná-la pública e oponível a terceiros.

CLÁUSULA DÉCIMA SÉTIMA: Além das matérias previstas em lei e neste Contrato Social, compete também à Reunião de Sócios, por deliberação dos sócios que representem a maioria das quotas presentes, salvo se maior quórum for exigido:
    a) Aprovar as contas da Sociedade referentes ao exercício findo;
    b) Autorizar a realização de quaisquer atos ou negócios jurídicos que impliquem aquisição, alienação, promessa de alienação e/ou oneração de bens imóveis da sociedade, incluindo a cessão de imóveis para arrendamento e/ou parcerias;
    c) A distribuição dos lucros da Sociedade;
    d) Aprovar a participação da Sociedade no capital de outras empresas e a celebração de parcerias, joint ventures e sociedades;
    e) Eleger, destituir e fixar a remuneração do administrador da sociedade;
    f) Aprovar a celebração de contratos entre a sociedade e sócios ou entre aquela e outras sociedades nas quais qualquer um dos sócios possua participação;
    g) Autorizar a prestação de aval, fiança e outras garantias a favor de terceiros e/ou dos sócios.$blk$),

(15, 'cap10-acordo-quotistas', 'Capítulo X — Acordo de Quotistas (Cláusula 18ª)', 'contrato-social', true,
$blk$CAPÍTULO X
Do Acordo de Quotistas

CLÁUSULA DÉCIMA OITAVA: Os sócios poderão firmar acordos de quotistas, os quais serão arquivados na sede da sociedade e registrados na Junta Comercial da sede, e, por conseguinte, serão oponíveis à sociedade, seus administradores, sócios e terceiros.
Parágrafo Primeiro: A Reunião de Sócios e/ou a administração devem obedecer o disposto nos acordos de quotistas registrados, devendo: (i) abster-se de computar votos proferidos em sentido contrário ao estabelecido naqueles acordos; (ii) autorizar que qualquer sócio vote com as quotas do sócio ausente ou omisso, conforme o caso; e (iii) coibir registros contrários ao disposto naqueles acordos.
Parágrafo Segundo: O(s) administrador(es) deverá(ão) comunicar aos sócios, no prazo máximo de 30 (trinta) dias, os eventuais acordos de quotistas registrados em sua sede ou de que tenha ciência.$blk$),

(16, 'cap11-dissolucao', 'Capítulo XI — Dissolução (Cláusula 19ª)', 'contrato-social', true,
$blk$CAPÍTULO XI
Da Dissolução da Sociedade

CLÁUSULA DÉCIMA NONA: A sociedade será dissolvida nas seguintes hipóteses:
    a) Por deliberação dos sócios que representem a maioria absoluta do capital social;
    b) Se o objeto social exaurir-se ou mostrar-se inexequível; e
    c) Por determinação judicial, assim incluída a decretação de falência.
Parágrafo Primeiro: No caso de dissolução, será procedida a devida liquidação, com a investidura do liquidante no prazo de 30 (trinta) dias, restringindo a gestão do patrimônio aos negócios inadiáveis, vedadas novas operações.
Parágrafo Segundo: O Liquidante, sócio ou não sócio, será eleito em Reunião de Sócios pelos sócios que representem mais da metade do capital social, podendo ser desconstituído a qualquer tempo pelo mesmo quórum.
Parágrafo Terceiro: Após a liquidação, o patrimônio resultante será dividido entre os sócios de forma proporcional às quotas de capital, salvo deliberação diversa em Reunião de Sócios.$blk$),

(17, 'cap12-unipessoal', 'Capítulo XII — Condição unipessoal (Cláusulas 20ª e 21ª)', 'contrato-social', true,
$blk$CAPÍTULO XII
Da Condição Unipessoal

CLÁUSULA VIGÉSIMA: Sendo constituída unipessoalmente, ou restando a sociedade de forma unipessoal, nos termos do art. 1.052, § 2º, do Código Civil de 2002, estarão destituídas de quaisquer efeitos as disposições constantes nas Cláusulas Nona, Décima Primeira, Décima Segunda, Décima Terceira, Décima Sexta e Décima Oitava do presente Contrato Social.

CLÁUSULA VIGÉSIMA PRIMEIRA: As atribuições da Reunião de Sócios previstas nas Cláusulas Décima Quarta, Décima Quinta e Décima Sétima incumbirão ao Sócio Único e serão firmadas por escrito em instrumento particular ou público, devidamente subscrito pelo Sócio Único ou por seu procurador com poderes específicos, dispensadas quaisquer outras formalidades.
Parágrafo Único: Na hipótese de unipessoalidade, não se impõem à outorga de mandato as restrições e formalidades previstas no § 1º do art. 1.074 do Código Civil.$blk$),

(18, 'cap13-foro', 'Capítulo XIII — Foro (Cláusula 22ª)', 'contrato-social', true,
$blk$CAPÍTULO XIII
Questões Diversas

CLÁUSULA VIGÉSIMA SEGUNDA: Para questões resultantes deste contrato e das relações societárias, entre os sócios e destes em relação à sociedade, fica eleito o foro da comarca de {{ foroComarca }}, Estado de {{ foroUf }}, havendo renúncia expressa por parte dos sócios por qualquer outro, por mais privilegiado que seja.$blk$),

(19, 'fecho', 'Fecho e assinaturas', 'contrato-social', true,
$blk$E, por estarem assim justos, certos e contratados, declaram de inteiro acordo, conforme cláusulas e condições prescritas, e assinam o presente instrumento na presença das testemunhas abaixo nomeadas.

{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.


_______________________________________
{{ socio.nome }}

_______________________________________
{{ socio2.nome }}


Visto do Advogado

Testemunhas:
1. _______________________________  Nome:                         RG:                  CPF/MF:
2. _______________________________  Nome:                         RG:                  CPF/MF:$blk$);

-- Gera um id por bloco.
alter table _blocos add column id uuid;
update _blocos set id = gen_random_uuid();

-- Blocos.
insert into tmpl_bloco (id, nome, categoria, ativo)
  select id, nome, categoria, true from _blocos;

-- Versão atual de cada bloco (conteúdo).
insert into tmpl_bloco_versao (id, bloco_id, numero_versao, atual, conteudo)
  select gen_random_uuid(), id, 1, true, conteudo from _blocos;

-- Documento.
insert into tmpl_documento (id, nome, descricao, ativo, tipo)
  select id,
         'Contrato Social — Sociedade Limitada (Agro)',
         'Modelo de constituição de sociedade limitada (perfil agro), montado a partir do modelo da Patrícia. Sócios/administrador/cônjuge ligam a pessoa e o imóvel integralizado liga à matrícula; capital/quotas e dados da sociedade ficam como texto livre.',
         true,
         'societario'
  from _doc;

-- Sequência ordenada de blocos no documento.
insert into tmpl_documento_bloco (id, documento_id, bloco_id, ordem, obrigatorio)
  select gen_random_uuid(), (select id from _doc), b.id, b.ordem, b.obrigatorio
  from _blocos b;

drop table _blocos;
drop table _doc;
