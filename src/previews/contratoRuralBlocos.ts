import type { Bloco, Template } from '@/lib/templates/types';

// Os dois contratos como blocos reais do motor (`src/lib/templates/`), transcritos
// de `docs/osg/contratos_exploracao/05-modelo-parceria-rural.md` e
// `06-modelo-composse-rural.md` — mesma redação, mesma fonte (template oficial da
// banca, conferido contra `[BV-PAR]`/`[BV-COM]`/`[ROS-COM]`), só que em `{{ }}`/
// `{{# }}` de verdade em vez da marcação `[[BLOCO]]`/`[[REPETIR]]` inventada pra
// leitura humana. É o rascunho dos dados que a Oficina de Contratos vai pedir
// quando registrar esta família em `tmpl_bloco`/`tmpl_documento`.
//
// Nenhum bloco usa `repeteColecao`: nenhuma repetição daqui precisa de numeração
// própria por item (não é "um parágrafo por sócio que integraliza" do Contrato
// Social) — toda lista é uma seção `{{#lista}}…{{/lista}}` comum, dentro de um
// único bloco. Todo bloco é `obrigatorio: true`; o que é condicional (prorrogação,
// penhor, pecuária, administração) fica embrulhado num `{{#flag}}…{{/flag}}`
// dentro do próprio conteúdo — se a flag for falsa, o bloco renderiza em branco e
// o motor o descarta sozinho (`descarte.ts`), sem precisar de `flagsRequeridas`.

/** Sentença de qualificação PJ, com o prefixo do escopo (ex.: "outorgante", "origem.outorgante"). */
function qualificacaoPJ(p: string): string {
  return (
    `{{ ${p}.razaoSocial }}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o n.º {{ ${p}.cnpj }}` +
    `{{#${p}.nire}}, registrada na Junta Comercial do Estado de {{ ${p}.juntaUf }} sob o NIRE {{ ${p}.nire }}{{/${p}.nire}}` +
    `{{#${p}.capitalValor}}, com capital social totalmente subscrito e integralizado no valor de {{ ${p}.capitalValor }}{{/${p}.capitalValor}}` +
    `, com sede {{ ${p}.sede }}{{#${p}.administradores}}, neste ato representada por {{ ${p}.administradores }}{{/${p}.administradores}}`
  );
}

/** Sentença de qualificação PF, com o prefixo do escopo (ex.: "outorgante", "explorador"). */
function qualificacaoPF(p: string): string {
  return (
    `{{ ${p}.nome }}, {{ ${p}.brasileiro }}{{#${p}.temNaturalidade}}, natural de {{ ${p}.naturalidadeMunicipio }}/{{ ${p}.naturalidadeUf }}{{/${p}.temNaturalidade}}, ` +
    `{{ ${p}.nascido }} em {{ ${p}.dataNascimento }}{{#${p}.temFiliacao}}, filho(a) de {{ ${p}.filiacaoPai }} e {{ ${p}.filiacaoMae }}{{/${p}.temFiliacao}}, ` +
    `{{ ${p}.profissao }}, {{ ${p}.casado }}{{#${p}.regimeBens}} sob o regime de {{ ${p}.regimeBens }}{{/${p}.regimeBens}}, ` +
    `{{ ${p}.portador }} do RG nº {{ ${p}.rg }} {{ ${p}.orgaoExpedidor }}, {{ ${p}.inscrito }} no CPF/MF sob o nº {{ ${p}.cpfCnpj }}, ` +
    `{{ ${p}.residente }} {{ ${p}.endereco }}`
  );
}

/** `{{#p.sePJ}}…{{/p.sePJ}}{{#p.sePF}}…{{/p.sePF}}` — os dois ramos de qualificação, um escopo só. */
function qualificacaoPessoa(p: string): string {
  return `{{#${p}.sePJ}}${qualificacaoPJ(p)}{{/${p}.sePJ}}{{#${p}.sePF}}${qualificacaoPF(p)}{{/${p}.sePF}}`;
}

// "CPF/MF:" (não "CPF:") — confirmado no .docx oficial da Composse e numa das duas
// versões da Parceria (Documentos Agrários/, achado 20/08/2026).
const FECHO_TESTEMUNHAS =
  'Testemunhas:\n{{#testemunhas}}{{ testemunha.nome }} — CPF/MF: {{ testemunha.cpf }} — RG: {{ testemunha.rg }}\n{{/testemunhas}}';

// =============================================================================
// PARCERIA — docs/osg/contratos_exploracao/05-modelo-parceria-rural.md
// =============================================================================

export const BLOCOS_PARCERIA: Bloco[] = [
  { id: 'par-titulo', tipo: 'livre', obrigatorio: true, conteudo: 'INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO {{ naturezaExploracao }}\n' },
  {
    id: 'par-preambulo', tipo: 'livre', obrigatorio: true,
    conteudo:
      `**PARCEIRA OUTORGANTE:** ${qualificacaoPessoa('outorgante')}.\n\n` +
      `**PARCEIROS OUTORGADOS:** {{#exploradores}}${qualificacaoPF('explorador')}\n{{/exploradores}}` +
      '— doravante denominados **PARCEIROS OUTORGADOS**.\n\n' +
      'As partes acima identificadas têm, entre si, justas e contratadas, o presente Instrumento Particular de Parceria ' +
      'para Fins de Exploração Agropecuária, que se regerá pelas cláusulas e condições descritas no presente.',
  },
  { id: 'par-titulo-areas', tipo: 'livre', obrigatorio: true, conteudo: 'DAS ÁREAS CEDIDAS EM PARCERIA' },
  {
    id: 'par-c1', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'As partes, por este instrumento contratual, constituem parceria rural para exploração agropecuária em áreas de ' +
      'terras rurais, nos termos do art. 96 da Lei 4.504/64, cedendo a PARCEIRA OUTORGANTE em favor dos PARCEIROS ' +
      'OUTORGADOS os imóveis de sua posse e/ou propriedade, descritos nas alíneas a seguir, com seus limites e ' +
      'confrontações dispostos no ANEXO ÚNICO deste instrumento:\n\n' +
      '{{#imoveis}}- {{ imovel.ref }}) {{ imovel.areaExplorada }} ha de um imóvel com área de {{ imovel.areaTotal }} ha, ' +
      'denominado {{ imovel.nomeImovel }}, matrícula nº {{ imovel.matricula }}, município de {{ imovel.municipio }}/{{ imovel.uf }};\n{{/imoveis}}\n' +
      'Todos os imóveis são de propriedade de {{ proprietarioComum }}, registrados no Cartório do Registro de ' +
      'Imóveis e Hipotecas de {{ cartorioComarcaComum }}/{{ cartorioUfComum }}.',
  },
  { id: 'par-titulo-vigencia', tipo: 'livre', obrigatorio: true, conteudo: 'DA VIGÊNCIA' },
  {
    id: 'par-c2', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'A presente parceria rural para fins de exploração {{ naturezaExploracao }} tem vigência a contar da data da ' +
      'assinatura deste instrumento e findará em {{ dataEncerramento }}.',
  },
  {
    id: 'par-c2-p1', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Não havendo renovação nos termos da Cláusula Nona, ao término da vigência, os PARCEIROS OUTORGADOS deverão ' +
      'devolver à PARCEIRA OUTORGANTE, independentemente de notificação ou interpelação judicial ou extrajudicial, os ' +
      'imóveis rurais objetos desta parceria.',
  },
  {
    id: 'par-c2-p2', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#vigenciaProrrogavel}}Ultrapassando o contrato a data prevista no caput desta cláusula, o contrato passará a ' +
      'ser por tempo indeterminado, podendo a PARCEIRA OUTORGANTE rescindi-lo a qualquer tempo. Neste caso, deverá ' +
      'notificar por escrito os PARCEIROS OUTORGADOS, os quais deverão sair dos imóveis objetos desta parceria dentro ' +
      'do prazo de 30 (trinta) dias a contar do recebimento da referida notificação se inexistir produto pendente de ' +
      'colheita; ou, se pendente a colheita, 30 (trinta) dias após a sua realização.{{/vigenciaProrrogavel}}',
  },
  { id: 'par-titulo-atividades', tipo: 'livre', obrigatorio: true, conteudo: 'DAS ATIVIDADES {{ naturezaExploracaoPlural }}' },
  {
    id: 'par-c3', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Os PARCEIROS OUTORGADOS poderão explorar nas áreas objeto deste instrumento de parceria lavouras de {{ culturas }} ' +
      'ou outra cultura legalmente permitida que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso ' +
      'da terra quantas vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou despesa ' +
      'adicional. Em se tratando da exploração pecuária ou de animais, poderão fazer uso das terras para cria, recria e ' +
      'engorda de bovinos, suínos, ovinos, equinos e aves; ou outros animais, da maneira que lhes convier, obedecendo ' +
      'os limites deste contrato.',
  },
  { id: 'par-titulo-despesas', tipo: 'livre', obrigatorio: true, conteudo: 'DAS DESPESAS' },
  {
    id: 'par-c4', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Competem aos PARCEIROS OUTORGADOS todas as despesas de preparo, plantio, cultivo, colheita, extração, limpeza e ' +
      'beneficiamento dos produtos, mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, ' +
      'equipamentos, combustíveis, bem como as despesas de aquisição de gado, vermífugos, ração, vacina, sais minerais ' +
      'e tudo mais que se fizer necessário para a subsistência, manutenção e desenvolvimento dos animais — ressalvadas ' +
      'as despesas expressamente assumidas pela PARCEIRA OUTORGANTE neste instrumento, incluindo o disposto na ' +
      'Cláusula Sétima, bem como as despesas do imóvel em si (ITR, CAR, Georreferenciamento, CCIR), que permanecem ' +
      'com a PARCEIRA OUTORGANTE.',
  },
  { id: 'par-titulo-frutos', tipo: 'livre', obrigatorio: true, conteudo: 'DA PARTICIPAÇÃO DE CADA PARCEIRO NOS FRUTOS DA PARCERIA' },
  {
    id: 'par-c5', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Caberá à PARCEIRA OUTORGANTE {{ percentualOutorgante }} de todos os frutos produzidos nas áreas objeto da ' +
      'parceria, e aos PARCEIROS OUTORGADOS os outros {{ percentualExplorador }}, em conformidade com o art. 96, VI, ' +
      '"a", da Lei 4.504/64. Os PARCEIROS OUTORGADOS armazenam os frutos em depósito indicado pela PARCEIRA ' +
      'OUTORGANTE, arcando com o transporte.',
  },
  {
    id: 'par-c5-cria', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#temPecuariaCriaOuEngorda}}Considerar-se-á como "frutos" da pecuária, no caso de cria, os bezerros nascidos ' +
      'do rebanho de fêmeas, sendo a parcela da PARCEIRA OUTORGANTE entregue através da cessão de animais em ' +
      'quantidade proporcional aos frutos.{{/temPecuariaCriaOuEngorda}}',
  },
  {
    id: 'par-c5-recria', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#temPecuariaCriaOuEngorda}}Considerar-se-á como "frutos" da pecuária, no caso de recria e engorda, o ganho de ' +
      'peso (kg) dos animais, apurado pela diferença entre o peso de aquisição e o peso na alienação; animais já ' +
      'existentes nas áreas são pesados em até 30 (trinta) dias da assinatura, valendo esse como "peso inicial". A ' +
      'parcela da PARCEIRA OUTORGANTE é entregue via cessão de animais com peso proporcional.{{/temPecuariaCriaOuEngorda}}',
  },
  {
    id: 'par-c5-periodo', tipo: 'paragrafo', obrigatorio: true,
    conteudo: 'Os frutos da pecuária poderão ser calculados e distribuídos por exercício fiscal ou por período inferior, desde que as partes decidam em conjunto.',
  },
  {
    // Achado ao conferir contra o .docx oficial (Documentos Agrários/) em 20/08/2026:
    // parágrafo inteiro ausente da transcrição — sem variável, texto fixo.
    id: 'par-c5-limpeza', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Os PARCEIROS OUTORGADOS se responsabilizam pela limpeza, beneficiamento e demais operações necessárias à ' +
      'padronização dos frutos a serem pagos à PARCEIRA OUTORGANTE, como também os custos relacionados ao transporte ' +
      'destes produtos até o depósito, armazém, cerealista ou compradora indicada pela PARCEIRA OUTORGANTE. Ademais, ' +
      'não sendo possível o rateio dos frutos, eventual diferença será compensada à PARCEIRA OUTORGANTE em uma das ' +
      'próximas safras, e, se apurada essa diferença na última safra, a diferença será paga em pecúnia pelos ' +
      'PARCEIROS OUTORGADOS à PARCEIRA OUTORGANTE ou compensada em outros frutos, a critério da PARCEIRA OUTORGANTE.',
  },
  {
    id: 'par-c5-mora', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Inadimplemento na entrega dos frutos gera mora automática, com atualização pelo INPC, multa de 10% e juros de 1% ' +
      // IMEA é texto fixo do template oficial, não campo do cadastro (05-modelo-parceria-rural.md:
      // "o [BV-PAR] assinado usa IAGRO — varia por praça, não é campo") — por isso é literal aqui, sem
      // {{placeholder}}: um valor sempre-igual não é variável, e virar {{}} fazia o preview marcá-lo
      // em amarelo como se viesse de um campo do cadastro que não existe (achado, 20/08/2026).
      'ao mês, considerando-se como "valor" os preços apurados pelo IMEA – Instituto Mato-grossense de Economia e ' +
      'Agropecuária na praça do foro deste contrato.',
  },
  {
    id: 'par-c6', tipo: 'clausula', obrigatorio: true,
    conteudo: 'Os parceiros podem dispor dos frutos antes da partilha, comercializando independentemente, respondendo cada um por si perante terceiros se os frutos pactuados excederem o resultado que lhe cabe.',
  },
  {
    id: 'par-c7', tipo: 'clausula', obrigatorio: true,
    conteudo: 'Caso fortuito ou força maior que destrua parcialmente a produção tem a perda suportada pelas partes, conforme art. 96, §1º, I, da Lei 4.504/64.',
  },
  {
    id: 'par-c8', tipo: 'clausula', obrigatorio: true,
    conteudo: 'Obrigações trabalhistas, sociais, tributárias, fiscais, ambientais e previdenciárias relativas à mão de obra rural são exclusivamente dos PARCEIROS OUTORGADOS.',
  },
  { id: 'par-titulo-preferencia', tipo: 'livre', obrigatorio: true, conteudo: 'DO DIREITO DE PREFERÊNCIA NOS CASOS DE ALIENAÇÃO E/OU RENOVAÇÃO' },
  {
    id: 'par-c9', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Nos termos do art. 95, IV, c/c art. 96, VII, da Lei 4.504/64, os PARCEIROS OUTORGADOS têm preferência à ' +
      'renovação, em igualdade de condições com terceiros — a PARCEIRA OUTORGANTE deve notificá-los até 6 meses antes ' +
      'do vencimento, com cópia de eventual proposta recebida.',
  },
  { id: 'par-c9-p1', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Esse direito não prevalece se a PARCEIRA OUTORGANTE notificar, com a mesma antecedência de 6 meses, que deseja retomar os imóveis para exploração direta.' },
  { id: 'par-c9-p2', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Em caso de venda das áreas, a PARCEIRA OUTORGANTE deve avisar os PARCEIROS OUTORGADOS, que têm 30 dias para exercer preferência.' },
  { id: 'par-c9-p3', tipo: 'paragrafo', obrigatorio: true, conteudo: 'A alienação ou ainda a imposição de ônus reais sobre os imóveis objetos de exploração da presente parceria não interromperá a vigência deste instrumento.' },
  { id: 'par-titulo-devolucao', tipo: 'livre', obrigatorio: true, conteudo: 'DA FUNÇÃO SOCIAL E DA DEVOLUÇÃO DOS BENS' },
  { id: 'par-c10', tipo: 'clausula', obrigatorio: true, conteudo: 'Os bens serão devolvidos como entregues, salvo deterioração de uso normal.' },
  { id: 'par-c10-p1', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Competem aos PARCEIROS OUTORGADOS as despesas decorrentes da manutenção das benfeitorias existentes nesta data edificadas sobre os imóveis até a efetiva devolução dos imóveis à PARCEIRA OUTORGANTE.' },
  {
    id: 'par-c10-p2', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Todas as benfeitorias realizadas pelos PARCEIROS OUTORGADOS, sejam elas úteis ou voluptuárias, serão ' +
      'incorporadas aos imóveis, não incidindo sobre elas qualquer tipo de indenização, salvo se as partes pactuarem em ' +
      'instrumento apartado condição diferente desta.',
  },
  { id: 'par-c10-p3', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Os PARCEIROS OUTORGADOS se obrigam a cumprir, na posse da terra, a sua função social e o bem-estar coletivo de acordo com os direitos e deveres estabelecidos em lei e nos limites estabelecidos no presente instrumento.' },
  { id: 'par-titulo-solo', tipo: 'livre', obrigatorio: true, conteudo: 'DO USO DO SOLO E MÃO DE OBRA' },
  {
    id: 'par-c11', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Manejo do solo conforme recomendações agronômicas; atividades pecuárias conforme normas veterinárias e ' +
      'zootécnicas; proibido uso de defensivos não autorizados pelo Ministério da Agricultura. Respeito, fiscalização ' +
      'e atendimento às leis, normas e diretrizes do país para a preservação de reservas florestais, mananciais, ' +
      'animais, meio ambiente, trabalho escravo, utilização/produção de trabalho ilegal, invasões de terra e ' +
      'queimadas irregulares, dentre outros.',
  },
  {
    id: 'par-c11-p', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Qualquer penalidade ou ação civil, criminal, trabalhista, tributária e/ou indenização pleiteada, por ente ' +
      'público ou particular, contra os PARCEIROS OUTORGADOS por motivo exclusivo de erro, falta, desobediência, ' +
      'negligência ou imprudência deste, é de sua inteira responsabilidade; devendo ressarcir à PARCEIRA OUTORGANTE ' +
      'os prejuízos que ela for obrigada a suportar por força de atos culposos ou dolosos dos PARCEIROS OUTORGADOS.',
  },
  { id: 'par-titulo-extincao', tipo: 'livre', obrigatorio: true, conteudo: 'DA EXTINÇÃO DO CONTRATO' },
  { id: 'par-c12', tipo: 'clausula', obrigatorio: true, conteudo: 'Inadimplemento de qualquer cláusula permite rescisão mediante simples notificação, assegurada a colheita da safra em curso antes da devolução dos imóveis e partilha dos frutos daquela safra.' },
  { id: 'par-c13', tipo: 'clausula', obrigatorio: true, conteudo: 'Rescisão também pode ocorrer por mútuo acordo a qualquer tempo, respeitado o término da safra em curso.' },
  { id: 'par-titulo-anuencia', tipo: 'livre', obrigatorio: true, conteudo: '{{#permitePenhor}}DA ANUÊNCIA{{/permitePenhor}}' },
  {
    id: 'par-c14', tipo: 'clausula', obrigatorio: true,
    conteudo:
      '{{#permitePenhor}}A PARCEIRA OUTORGANTE autoriza os PARCEIROS OUTORGADOS a oferecer em garantia de ' +
      'financiamentos bancários, durante toda a vigência (e a safra seguinte), a totalidade da produção, além de ' +
      'materiais agrários, benfeitorias e semoventes de sua propriedade.{{/permitePenhor}}',
  },
  { id: 'par-c14-p1', tipo: 'paragrafo', obrigatorio: true, conteudo: '{{#permitePenhor}}O penhor de cada safra vale por todo o período de vigência da parceria, conforme art. 1.439 do Código Civil.{{/permitePenhor}}' },
  {
    id: 'par-c14-p2', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#permitePenhor}}A PARCEIRA OUTORGANTE autoriza os PARCEIROS OUTORGADOS a destinar, prioritariamente, sob ' +
      'renúncia plena de todos os direitos, os frutos oriundos da exploração desta parceria para liquidação dos ' +
      'débitos contraídos por eles e que tenham relação direta com os imóveis, as culturas e/ou os animais ' +
      'explorados.{{/permitePenhor}}',
  },
  {
    id: 'par-c14-p3', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#permitePenhor}}A PARCEIRA OUTORGANTE declara ciência do direito das instituições privadas — bancárias, ' +
      'comerciais, industriais e financeiras — de fiscalizar os imóveis cedidos, e concorda que os bens vinculados ali ' +
      'permaneçam até a liquidação final das dívidas, mesmo em caso de alienação do imóvel.{{/permitePenhor}}',
  },
  { id: 'par-titulo-gerais', tipo: 'livre', obrigatorio: true, conteudo: 'DISPOSIÇÕES GERAIS' },
  { id: 'par-c15', tipo: 'clausula', obrigatorio: true, conteudo: 'Acordo irrevogável e irretratável, obrigando sucessores; alteração só por escrito, assinada por todos.' },
  { id: 'par-c16', tipo: 'clausula', obrigatorio: true, conteudo: 'Vedada a cessão do contrato pelos PARCEIROS OUTORGADOS sem consentimento expresso da outra parte.' },
  { id: 'par-c17', tipo: 'clausula', obrigatorio: true, conteudo: 'Os PARCEIROS OUTORGADOS se eximem de ônus sobre os imóveis decorrentes de dívidas exclusivas da PARCEIRA OUTORGANTE alheias à exploração rural objeto do contrato.' },
  {
    id: 'par-c18', tipo: 'clausula', obrigatorio: true,
    conteudo: 'A relação não se rege pela CLT, e sim pelo Estatuto da Terra e pelo Decreto 59.566/1966, já que os PARCEIROS OUTORGADOS não estão subordinados à PARCEIRA OUTORGANTE, podendo estipular seus próprios horários de trabalho.',
  },
  { id: 'par-c19', tipo: 'clausula', obrigatorio: true, conteudo: 'A relação estabelecida pelo presente contrato autoriza a abertura das respectivas inscrições estaduais pelas partes.' },
  { id: 'par-titulo-foro', tipo: 'livre', obrigatorio: true, conteudo: 'DO FORO' },
  {
    id: 'par-c20', tipo: 'clausula', obrigatorio: true,
    conteudo: 'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de {{ foroComarca }}, Estado de {{ foroUf }}, renunciando expressamente a qualquer outro, por mais privilegiado que seja.',
  },
  {
    id: 'par-fecho', tipo: 'livre', obrigatorio: true,
    conteudo:
      'Por estarem assim justos e contratados, firmam o presente instrumento em {{ numeroVias }} vias de igual teor e ' +
      'forma, juntamente com 2 (duas) testemunhas.\n\n' +
      '{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.\n\n' +
      '{{#outorgante.sePJ}}{{ outorgante.razaoSocial }}{{/outorgante.sePJ}}{{#outorgante.sePF}}{{ outorgante.nome }}{{/outorgante.sePF}} — Parceira Outorgante\n\n' +
      '{{#exploradores}}{{ explorador.nome }}\n{{/exploradores}}— Parceiros Outorgados\n\n' +
      FECHO_TESTEMUNHAS,
  },
  {
    // Achado ao conferir contra o .docx oficial (`VF_Modelo Anexo Único_Parceria.docx`,
    // Drive) em 20/08/2026: a Cláusula Primeira já promete "...dispostos no ANEXO ÚNICO
    // deste instrumento" e existe um arquivo oficial próprio pro anexo da Parceria — mas
    // esta transcrição nunca tinha um bloco pra ele, só a Composse tinha. Corrigido.
    id: 'par-anexo', tipo: 'livre', obrigatorio: true,
    conteudo:
      'ANEXO ÚNICO\n\n' +
      'Descrição das áreas objeto do Instrumento Particular de Parceria para fins de Exploração {{ naturezaExploracao }}, ' +
      'pactuado entre {{#outorgante.sePJ}}{{ outorgante.razaoSocial }}{{/outorgante.sePJ}}{{#outorgante.sePF}}{{ outorgante.nome }}{{/outorgante.sePF}} e ' +
      '{{#exploradores sep=", " fim=" e "}}{{ explorador.nome }}{{/exploradores}}, em {{ dataAssinatura }}, sendo:\n\n' +
      '| Item | Área cedida | Área total do imóvel | Nome do imóvel | Matrícula | Município/UF | Proprietário |\n' +
      '|---|---|---|---|---|---|---|\n' +
      '{{#imoveis}}| {{ imovel.ref }} | {{ imovel.areaExplorada }} ha | {{ imovel.areaTotal }} ha | {{ imovel.nomeImovel }} | {{ imovel.matricula }} | {{ imovel.municipio }}/{{ imovel.uf }} | {{ imovel.proprietario }} |\n{{/imoveis}}',
  },
];

// =============================================================================
// COMPOSSE — docs/osg/contratos_exploracao/06-modelo-composse-rural.md
// =============================================================================

export const BLOCOS_COMPOSSE: Bloco[] = [
  { id: 'com-titulo', tipo: 'livre', obrigatorio: true, conteudo: 'INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO\n' },
  {
    id: 'com-preambulo-partes', tipo: 'livre', obrigatorio: true,
    conteudo: `{{#compossuidores}}${qualificacaoPF('compossuidor')}\n{{/compossuidores}}` +
      'neste ato doravante denominados **COMPOSSUIDORES RURAIS** ou simplesmente **COMPOSSUIDORES**.',
  },
  { id: 'com-preambulo-titulo', tipo: 'livre', obrigatorio: true, conteudo: 'PREÂMBULO' },
  {
    id: 'com-preambulo-i-iv', tipo: 'livre', obrigatorio: true,
    conteudo:
      'I) CONSIDERANDO que os COMPOSSUIDORES RURAIS têm interesse em se associarem para exploração de atividade ' +
      'agropecuária, vez que possuem, no conjunto, conhecimento técnico especializado, capital, máquinas e ' +
      'equipamentos, e ainda, são legítimos possuidores dos imóveis rurais descritos {{ imoveisAlineasRange }}, ' +
      'do Anexo Único deste instrumento.\n\n' +
      'II) CONSIDERANDO que os COMPOSSUIDORES desejam associar-se através de composse pro indiviso para utilização de ' +
      'imóvel rural, alicerçados nos artigos 1.196, 1.197, 1.199, 1.204, 1.314, 1.323 e 1.326 da Lei 10.406/2002.\n\n' +
      'III) CONSIDERANDO que o artigo 14 da Lei 4.504/1.964 (Estatuto da Terra) determina que o poder público facilite ' +
      'e prestigie a criação e a expansão de associações de pessoas físicas e jurídicas.\n\n' +
      'IV) CONSIDERANDO que os COMPOSSUIDORES RURAIS buscam oportunidades para investimentos e exploração conjunta de ' +
      'negócios agrícolas, elegendo a tributação na pessoa física, na forma do artigo 13 do Decreto 9.580/2.018.',
  },
  {
    id: 'com-preambulo-v', tipo: 'livre', obrigatorio: true,
    conteudo:
      'V) CONSIDERANDO que a posse dos imóveis rurais descritos no Anexo único deste instrumento advém dos seguintes instrumentos:\n\n' +
      '{{#origensDistintas}}{{ origem.letra }}) Item(ns) "{{ origem.itens }}" advém de {{ origem.tipoInstrumentoOrigem }}, ' +
      '{{#origem.ehExploracaoPropria}}sendo o imóvel já explorado diretamente pelos próprios COMPOSSUIDORES RURAIS, sem ' +
      'instrumento de cessão de terceiro por trás{{/origem.ehExploracaoPropria}}' +
      `{{#origem.vemDeOutroInstrumento}}firmado em {{ origem.dataAssinatura }}, no qual figuram como Parceiros ` +
      `Outorgados os COMPOSSUIDORES RURAIS e como Parceira Outorgante ${qualificacaoPJ('origem.outorgante')}{{/origem.vemDeOutroInstrumento}},\n{{/origensDistintas}}`,
  },
  {
    id: 'com-preambulo-fecho', tipo: 'livre', obrigatorio: true,
    conteudo:
      'As partes acima identificadas resolvem, em comum acordo, entabular o presente INSTRUMENTO PARTICULAR DE ' +
      'CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO, para estabelecer compromissos com relação à administração dos ' +
      'negócios rurais originários do exercício comum da posse de imóvel rural (bens e know-how).',
  },
  { id: 'com-cap1', tipo: 'capitulo', obrigatorio: true, conteudo: 'DO OBJETO' },
  {
    id: 'com-c1', tipo: 'clausula', obrigatorio: true,
    conteudo:
      // Achado ao conferir contra o .docx oficial (Documentos Agrários/) em 20/08/2026: a
      // autorização de pecuária (cria/recria/engorda) some inteira na transcrição anterior —
      // texto fixo, sem variável, incondicional no modelo oficial (igual à Cláusula Terceira
      // da Parceria, que também não condiciona essa frase a nenhuma flag).
      'Fica constituída uma COMPOSSE RURAL em que são COMPOSSUIDORES RURAIS as partes qualificadas no preâmbulo, com o ' +
      'objetivo de explorarem, sob o regime disposto neste instrumento, incluindo, mas não se limitando, ao de {{ culturas }}, ' +
      'ou outra cultura legalmente permitida que pretenderem explorar, bem como cria, recria e engorda de bovinos, ' +
      'suínos, ovinos e aves, ou outros animais de qualquer espécie, da maneira que lhes convier, nas áreas rurais ' +
      'descritas no anexo único deste instrumento.',
  },
  {
    id: 'com-c2', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Os COMPOSSUIDORES RURAIS se obrigam na COMPOSSE RURAL objeto deste instrumento e gozarão dos frutos dela na ' +
      'proporção de suas partes, quais sejam: {{#compossuidores}}{{ compossuidor.fracao }} para {{ compossuidor.nome }}; {{/compossuidores}}',
  },
  { id: 'com-c2-p1', tipo: 'paragrafo', obrigatorio: true, conteudo: 'A COMPOSSE girará, quando assim exigida em lei e/ou por força de eventuais solicitações de terceiros, sob o nome de {{ nomeComposse }}.' },
  {
    id: 'com-c2-p2', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Caberá a cada COMPOSSUIDOR tão somente a participação estipulada no caput desta cláusula, restando ainda ' +
      'acordado que caso haja a dissolução da composse, por qualquer motivo, seja em relação ao compossuidor ' +
      'retirante, seu cônjuge ou companheiro(a), herdeiro(a), sucessor(a) e/ou terceiro, a liquidação dos haveres ' +
      'observará: a) não sendo possível ou não sendo aprovado o ingresso destes por qualquer um dos compossuidores ' +
      'remanescentes, o valor dos haveres será apurado e liquidado com base no patrimônio líquido em balanço ' +
      'específico, levantado no máximo 60 dias antes do evento, de acordo com as normas técnicas contábeis vigentes ' +
      'à época; b) pagamento em moeda corrente nacional, através de depósito em conta bancária do beneficiário, em ' +
      '{{#liquidacaoMensal}}{{ liquidacaoNumeroParcelas }} parcelas iguais e mensais, atualizadas pela variação do ' +
      'INPC – Índice Nacional de Preços ao Consumidor, ou outro índice que vier a substituí-lo, vencendo a primeira ' +
      'em 30 dias após o evento que deu origem à liquidação{{/liquidacaoMensal}}{{#liquidacaoAnual}}{{ ' +
      'liquidacaoNumeroParcelas }} parcelas anuais e consecutivas, atualizadas pela variação do INPC – Índice ' +
      'Nacional de Preços ao Consumidor, ou outro índice que vier a substituí-lo, vencendo a primeira em 1 ano do ' +
      'evento que deu origem à liquidação{{/liquidacaoAnual}}; c) avaliação por empresa especializada, nomeada ' +
      'pelos compossuidores que possuírem a maioria da participação; d) em todos os demais casos de resolução da ' +
      'composse em relação a um ou mais compossuidores, ainda que não previstos expressamente neste instrumento, ' +
      'os valores devidos serão determinados pela metodologia das alíneas anteriores, incluindo forma de ' +
      'avaliação, prazo e forma de pagamento.',
  },
  { id: 'com-c3', tipo: 'clausula', obrigatorio: true, conteudo: 'Os COMPOSSUIDORES RURAIS se obrigam aos termos aqui avençados, por si, herdeiros e sucessores, concorrendo para as despesas e suportando os ônus na proporção da parte ideal que possuem.' },
  {
    id: 'com-c4', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Os COMPOSSUIDORES RURAIS determinam que seja deixada indivisa a coisa comum pelo prazo de {{ prazoIndivisao }}' +
      '{{#indivisaoProrrogavel}}, podendo ainda ser prorrogado por igual interstício se não houver, por escrito, {{ indivisaoAvisoPrazo }} antes do vencimento, ' +
      'o requerimento de divisão da coisa comum por qualquer um dos COMPOSSUIDORES RURAIS; renovando-se o prazo ' +
      'sucessivamente, até que formalmente uma das partes notifique a outra desejando a divisão{{/indivisaoProrrogavel}}.',
  },
  {
    id: 'com-c4-p', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Os imóveis rurais que deixarem de ser objeto de posse dos seus respectivos COMPOSSUIDORES em virtude de ' +
      'encerramento de contratos de parcerias de áreas rurais, deixarão espontaneamente de fazer parte do presente ' +
      'contrato, mantendo-se vigente e inalterado com relação as demais áreas subsistentes, não sendo motivo para ' +
      'rescisão ou elaboração de aditivos contratuais.',
  },
  {
    id: 'com-c5', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Fica vedado aos COMPOSSUIDORES RURAIS modificar a destinação da presente composse pro indiviso, bem como ' +
      'transferir, dar posse, uso ou gozo, de quaisquer dos bens ou direitos comuns a terceiros, exceto se ' +
      'COMPOSSUIDORES RURAIS que representem a maioria dos percentuais descritos na Cláusula Segunda anuírem.',
  },
  { id: 'com-cap2', tipo: 'capitulo', obrigatorio: true, conteudo: 'DO RESULTADO DA COMPOSSE RURAL' },
  {
    id: 'com-c6', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'A apuração dos resultados da COMPOSSE será realizada por ano/safra, cujo resultado positivo e líquido será ' +
      'distribuído, sempre no dia 31 de outubro de cada ano, proporcional à participação de cada compossuidor descrita ' +
      'na Cláusula Segunda, salvo deliberação em contrário na qual todos concordem.',
  },
  { id: 'com-c6-p1', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Os resultados serão auferidos levando-se em consideração todas as receitas e despesas, apurados mediante livro caixa sob o regime de caixa, nos termos das normativas do CFC.' },
  { id: 'com-c6-p2', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Havendo prejuízo, estes serão suportados proporcionalmente por cada um dos COMPOSSUIDORES, observada a proporção descrita no caput da Cláusula Segunda e o disposto na Cláusula Sétima.' },
  { id: 'com-c7', tipo: 'clausula', obrigatorio: true, conteudo: 'As responsabilidades decorrentes da contratação de trabalhadores rurais, obrigações trabalhistas, sociais, passivos tributários, fiscais, ambientais, cíveis, bancários, contratuais e negociais serão suportados pela COMPOSSE.' },
  {
    id: 'com-c7-p', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      'Além dos custos elencados no caput, também compõem o resultado (ou o cálculo de apuração de haveres) da ' +
      'COMPOSSE todos os demais custos de manutenção das benfeitorias e bens próprios e/ou cedidos sob regime de ' +
      'parceria ou outra forma de cessão, apurados na exploração das atividades deste contrato, bem como os custos ' +
      'operacionais, despesas administrativas, financeiras e comerciais, máquinas e equipamentos adquiridos e ' +
      'benfeitorias edificadas, desde que devidamente contabilizados na forma do Parágrafo Primeiro da Cláusula Sexta.',
  },
  { id: 'com-c8', tipo: 'clausula', obrigatorio: true, conteudo: 'A COMPOSSE deverá abrir inscrição estadual para a exploração de suas atividades, observado o nome designado para a COMPOSSE previsto no parágrafo primeiro da Cláusula Segunda.' },
  { id: 'com-c9', tipo: 'clausula', obrigatorio: true, conteudo: 'Caberá aos COMPOSSUIDORES financiarem, com recursos próprios ou de terceiros, as necessidades de capital de giro, insumos e demais itens necessários à exploração do objeto deste contrato.' },
  {
    id: 'com-c9-p1', tipo: 'paragrafo', obrigatorio: true,
    conteudo: '{{#permitePenhor}}Fica possibilitada, ainda, a contratação de financiamentos rurais pelos COMPOSSUIDORES, observados os limites descritos na Cláusula Décima Primeira, desde que o financiamento se destine à exploração econômica da composse, podendo ceder frutos da atividade comum como garantia, mediante a emissão de Cédula de Produto Rural ou outro instrumento jurídico com o mesmo fim.{{/permitePenhor}}',
  },
  {
    // Gated pela mesma flag do parágrafo anterior: o texto real cita "referido no parágrafo
    // anterior" — sem permitePenhor, o com-c9-p1 desaparece e essa remissão ficaria solta.
    id: 'com-c9-p2', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#permitePenhor}}O custo dos financiamentos obtidos de terceiros, referidos no parágrafo anterior e usados só ' +
      'no custeio das atividades desta composse, integra a apuração do resultado de cada safra, assim como todas as ' +
      'receitas auferidas — venda de produtos, incentivos fiscais e governamentais, descontos financeiros, ' +
      'devoluções de compras, resultado positivo de variação monetária e/ou cambial e prestações de ' +
      'serviços.{{/permitePenhor}}',
  },
  { id: 'com-c10', tipo: 'clausula', obrigatorio: true, conteudo: 'Os lucros obtidos pela atividade rural resultante da composse serão repassados aos COMPOSSUIDORES RURAIS na forma estabelecida na Cláusula Segunda.' },
  { id: 'com-cap3', tipo: 'capitulo', obrigatorio: true, conteudo: 'ADMINISTRAÇÃO' },
  {
    // Achado ao conferir contra o .docx oficial em 20/08/2026: a lista de órgãos e 3 das 9
    // alíneas (firmar correspondência, receber citação/intimação, fornecer fianças/avais)
    // tinham sido condensadas fora da transcrição anterior — texto fixo, sem variável.
    id: 'com-c11', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'A COMPOSSE será administrada isoladamente por seus COMPOSSUIDORES, que representarão a composse ativa e ' +
      'passivamente, em juízo ou fora dela, perante qualquer repartição pública e/ou empresa privada, inclusive, mas ' +
      'não se limitando apenas a estes, face a Caixa Econômica Federal, Banco do Brasil S/A, instituições ' +
      'financeiras de qualquer natureza, Previdência Social, Receita Federal do Brasil, Procuradoria da Fazenda ' +
      'Nacional, MAPA – Ministério da Agricultura, Pecuária e Abastecimento, Secretarias de Meio Ambiente Estaduais ' +
      'ou Municipais, IBAMA, INCRA, Secretarias de Fazenda Estaduais, sindicatos rurais e CONAB, dentre outras, ' +
      'podendo: celebrar instrumentos e negócios jurídicos, operações financeiras, empréstimos, financiamentos, ' +
      'contratos de compra e venda, constituição de garantias; comprar, adquirir, emprestar e permutar bens móveis; ' +
      'assinar, comprometer e endossar títulos, cédulas de crédito, notas promissórias, letras de câmbio e ' +
      'certificados de custódia; abrir, encerrar e movimentar contas bancárias, assinar cheques, recibos e depósitos ' +
      'bancários; firmar correspondência, guias para recolhimento de impostos e contribuições, requerimentos e ' +
      'petições dirigidas a repartições e autarquias públicas federais, estaduais e municipais, bancos e ' +
      'instituições; admitir e demitir funcionários, vendedores, representantes e agentes comerciais; receber ' +
      'citação ou intimação referente a processos, procedimentos e autuações, administrativos ou judiciais; ' +
      'fornecer fianças, avais e outras garantias, inclusive entre si, exceto para terceiros; e outorgar procurações ' +
      '(inclusive ad judicia) para defesa de interesses da COMPOSSE.',
  },
  {
    id: 'com-c11-p1', tipo: 'paragrafo', obrigatorio: true,
    conteudo:
      '{{#regraMaioria}}Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir garantias a favor de ' +
      'terceiros (não compossuidores), só podem ser feitos em conjunto por COMPOSSUIDORES que representem a maioria ' +
      'dos percentuais da Cláusula Segunda, sob pena de nulidade.{{/regraMaioria}}' +
      '{{#regraNomeados}}Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir garantias a favor ' +
      'de terceiros (não compossuidores), só podem ser feitos em conjunto por {{#administradoresNomeados}}{{ admin.nome }}; {{/administradoresNomeados}}' +
      'sob pena de nulidade.{{/regraNomeados}}',
  },
  { id: 'com-c11-p2', tipo: 'paragrafo', obrigatorio: true, conteudo: 'Havendo incapacidade civil superveniente de qualquer administrador, a administração passará a ser desempenhada isoladamente pelo administrador remanescente em pleno gozo da capacidade civil.' },
  { id: 'com-c12', tipo: 'clausula', obrigatorio: true, conteudo: 'É facultado aos COMPOSSUIDORES RURAIS o acesso aos livros exclusivos da composse, registros, contratos financeiros e comerciais, e documentos de suporte à contabilidade.' },
  { id: 'com-c13', tipo: 'clausula', obrigatorio: true, conteudo: 'São expressamente vedados, sendo nulos e inoperantes com relação aos COMPOSSUIDORES RURAIS, os atos de qualquer administrador ou procurador que os envolverem em obrigações relativas a negócios estranhos à COMPOSSE.' },
  { id: 'com-cap4', tipo: 'capitulo', obrigatorio: true, conteudo: '{{#permitePenhor}}DO PENHOR{{/permitePenhor}}' },
  {
    id: 'com-c14', tipo: 'clausula', obrigatorio: true,
    conteudo:
      '{{#permitePenhor}}Os COMPOSSUIDORES autorizam, desde já, que sejam oferecidos em garantia de financiamentos a ' +
      'serem concedidos por Instituições Financeiras, durante toda a vigência deste instrumento, a totalidade da ' +
      'produção a ser auferida nos imóveis rurais objetos desta COMPOSSE, bem como os materiais agrários, benfeitorias ' +
      'e semoventes de sua posse ou propriedade ali localizados.{{/permitePenhor}}',
  },
  { id: 'com-c15', tipo: 'clausula', obrigatorio: true, conteudo: '{{#permitePenhor}}Os COMPOSSUIDORES declaram ter plena ciência de que o penhor dos produtos dados em garantia em cada safra valerá pelo prazo da respectiva obrigação garantida, em conformidade com o artigo 1.439 do Código Civil.{{/permitePenhor}}' },
  { id: 'com-c16', tipo: 'clausula', obrigatorio: true, conteudo: '{{#permitePenhor}}Os COMPOSSUIDORES autorizam ainda que sejam destinados prioritariamente o produto oriundo da venda da produção financiada e/ou de bens vinculados, à liquidação dos respectivos débitos contraídos, antes mesmo do pagamento e/ou repartição dos frutos desta COMPOSSE.{{/permitePenhor}}' },
  { id: 'com-c17', tipo: 'clausula', obrigatorio: true, conteudo: '{{#permitePenhor}}Os COMPOSSUIDORES declaram ter plena ciência do direito que assiste às Instituições Financeiras de fiscalizar os empreendimentos financiados e vistoriar os bens vinculados.{{/permitePenhor}}' },
  { id: 'com-cap5', tipo: 'capitulo', obrigatorio: true, conteudo: 'DISPOSIÇÕES GERAIS' },
  { id: 'com-c18', tipo: 'clausula', obrigatorio: true, conteudo: 'Nenhuma das partes poderá ceder ou transferir direitos e obrigações decorrentes deste INSTRUMENTO, salvo mediante prévio e expresso consentimento por escrito dos demais signatários.' },
  { id: 'com-c19', tipo: 'clausula', obrigatorio: true, conteudo: 'Obrigam-se as partes à preservação dos recursos naturais existentes nas áreas ocupadas pela COMPOSSE na forma da lei.' },
  {
    id: 'com-c20', tipo: 'clausula', obrigatorio: true,
    conteudo:
      'Este instrumento constitui acordo irrevogável e irretratável entre as PARTES, obrigando seus respectivos ' +
      'herdeiros e sucessores, podendo ser rescindido mediante distrato em comum acordo, elegendo as partes o foro da ' +
      'Comarca de {{ foroComarca }}, Estado de {{ foroUf }}, para dirimir quaisquer conflitos.',
  },
  {
    id: 'com-fecho', tipo: 'livre', obrigatorio: true,
    conteudo:
      'E assim, por estarem justos e contratados, os COMPOSSUIDORES RURAIS assinam este INSTRUMENTO em {{ numeroVias }} ' +
      'vias de igual teor e forma, perante as 02 (duas) testemunhas abaixo.\n\n' +
      '{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.\n\n' +
      '{{#compossuidores}}{{ compossuidor.nome }} — Compossuidor Rural\n{{/compossuidores}}\n' +
      FECHO_TESTEMUNHAS,
  },
  {
    id: 'com-anexo', tipo: 'livre', obrigatorio: true,
    conteudo:
      'ANEXO ÚNICO\n\n' +
      'Descrição das áreas objeto do Instrumento Particular de Constituição de Composse Rural Pro Indiviso firmado por ' +
      '{{#compossuidores sep=", " fim=" e "}}{{ compossuidor.nome }}{{/compossuidores}}, em {{ dataAssinatura }}, sendo:\n\n' +
      '| Item | Área cedida | Área total do imóvel | Nome do imóvel | Matrícula | Município/UF | Proprietário |\n' +
      '|---|---|---|---|---|---|---|\n' +
      '{{#imoveis}}| {{ imovel.ref }} | {{ imovel.areaExplorada }} ha | {{ imovel.areaTotal }} ha | {{ imovel.nomeImovel }} | {{ imovel.matricula }} | {{ imovel.municipio }}/{{ imovel.uf }} | {{ imovel.proprietario }} |\n{{/imoveis}}',
  },
];

export const TEMPLATE_PARCERIA: Template = { id: 'rural-parceria', nome: 'Instrumento Particular de Parceria Rural', blocos: BLOCOS_PARCERIA };
export const TEMPLATE_COMPOSSE: Template = { id: 'rural-composse', nome: 'Instrumento Particular de Composse Rural Pro Indiviso', blocos: BLOCOS_COMPOSSE };
