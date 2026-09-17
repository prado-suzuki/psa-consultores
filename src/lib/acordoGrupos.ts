/**
 * Os grupos do cadastro do Acordo de Quotistas, e o que mora em cada um.
 *
 * O AGRUPAMENTO É O DA VALIDAÇÃO DE 11/09, feita contra o modelo do escritório, e
 * não uma organização inventada agora. Os nomes são os do vocabulário jurídico
 * porque é o vocabulário de quem preenche: o consultor pensa em "saída de sócio"
 * e "solução de conflitos", que são as palavras das cláusulas.
 *
 * O card manda "agrupar os campos por assunto do acordo", e é isto.
 *
 * `desceAoContrato` marca os sete campos que também viram cláusula no contrato
 * social. Cinco deles são apuração de haveres, que está nos oito contratos do
 * acervo, e dois são o usufruto. A tela avisa, porque mexer neles reabre a
 * conversa sobre o contrato e não só sobre o acordo.
 */

import { MECANISMOS, type EspelhoDoMecanismo } from '@/lib/acordoQuotistasPadrao';

export type TipoCampoAcordo =
  | 'texto'
  | 'textoLongo'
  | 'numero'
  | 'booleano'
  | 'data'
  | 'escolha'
  | 'multi'
  /** Tem controle próprio: quóruns, ramos, ordem, pessoas, usufruto. */
  | 'especial';

export interface CampoDoAcordo {
  /** A coluna em `acordo_quotistas`, ou a chave do controle próprio. */
  campo: string;
  rotulo: string;
  tipo: TipoCampoAcordo;
  /**
    * `descricao` aparece SOB o rótulo, dentro da caixa de marcar, e não numa
    * tooltip. Vale para lista cujo nome não se explica sozinho: ninguém precisa
    * de ajuda para "Imóveis", mas "Drag along" só diz o que é depois de lido.
    */
  opcoes?: readonly {
    valor: string;
    rotulo: string;
    descricao?: string;
    /** Opção que só reflete um interruptor de outro bloco; ver `EspelhoDoMecanismo`. */
    espelha?: EspelhoDoMecanismo;
  }[];
  ajuda?: string;
  /** Também vira cláusula no contrato social. */
  desceAoContrato?: boolean;
  /** Divide a linha com o campo vizinho, em vez de ocupar a largura toda. */
  meiaLinha?: boolean;
  /** Só aparece quando este outro campo está ligado. */
  dependeDe?: string;
  /**
   * O bloco dentro do grupo. Existe por causa do "Saída de sócio e preferência",
   * que sozinho tem 15 campos e cobre três assuntos: a quem se oferece a quota,
   * quanto ela vale, e o que o sócio não pode fazer depois. Sem a divisão, o
   * modal daquele grupo vira a mesma parede de campos que a crítica ao mockup
   * apontou. Grupo sem seção nenhuma desenha os campos direto.
   */
  secao?: string;
}

export interface GrupoDoAcordo {
  chave: string;
  titulo: string;
  /** Uma linha dizendo o que se decide ali, para o cartão da lista. */
  resumo: string;
  campos: readonly CampoDoAcordo[];
}

const METODOS = [
  { valor: 'patrimonio_liquido', rotulo: 'Patrimônio líquido' },
  { valor: 'fluxo_de_caixa_descontado', rotulo: 'Fluxo de caixa descontado' },
  { valor: 'dupla_avaliacao', rotulo: 'Dupla avaliação' },
] as const;

/*
 * OS QUATRO QUE O DOCUMENTO ESCREVE.
 *
 * Cada um acende um trecho real: as quotas são a Cláusula Quinta, as
 * participações e os imóveis são a Décima, as oportunidades são a Décima
 * Primeira. Máquinas e Equipamentos saíram em 17/09: o modelo não os escreve em
 * bloco nenhum, e marcá-los não mudava o documento. Eram vocabulário do
 * AgroAliança, que é um acordo do acervo, não o padrão da casa.
 *
 * Se um dia a casa redigir a cláusula que os alcance, os dois voltam com o
 * bloco junto, e não antes.
 */
const OBJETOS = [
  { valor: 'quotas', rotulo: 'Quotas' },
  { valor: 'imoveis', rotulo: 'Imóveis' },
  { valor: 'oportunidades', rotulo: 'Oportunidades de negócio' },
  { valor: 'participacoes', rotulo: 'Participações' },
] as const;

export const GRUPOS_DO_ACORDO: readonly GrupoDoAcordo[] = [
  {
    chave: 'identificacao',
    titulo: 'Identificação e vigência',
    resumo: 'Se já foi assinado, por quanto tempo vale e por quanto tempo é sigiloso',
    campos: [
      {
        campo: 'assinado_em',
        /*
         * NÃO É A LINHA DE ASSINATURA, e o rótulo "Assinado em" deixava isso no
         * ar. A linha que se preenche à mão é outra coisa: é `dataAssinatura`,
         * campo manual da tela Gerar, que vazio vira a lacuna assinalável.
         *
         * Esta data é o FATO que o contrato social cita, e a ajuda de antes
         * descrevia justamente a outra, o que propagava a confusão.
         */
        // Sem "(citada no contrato social)": a pill "também no contrato" ao lado
        // diz a mesma coisa, e as duas juntas viram redundância na mesma linha.
        rotulo: 'Data em que o acordo foi assinado',
        tipo: 'data',
        desceAoContrato: true,
        ajuda:
          'É a data que o CONTRATO SOCIAL cita, e não a linha que se assina à mão no fim do '
          + 'acordo. No Perci: "o acordo celebrado entre as partes, em 29 de Janeiro de 2.021, '
          + 'e disponível na sede da sociedade". Deixe em branco enquanto o acordo for minuta: '
          + 'aí o contrato sai na outra redação, com a lacuna, como no Bela Vista, "firmaram '
          + 'em __ de ____ de 2.025, acordo de quotistas com vigência pelo período de 20 '
          + '(vinte) anos". ATENÇÃO: preenchida, ela CONGELA esta versão, porque o cadastro '
          + 'passa a ter de bater com o papel assinado.',
      },
      {
        campo: 'vigencia_anos',
        rotulo: 'Vigência, em anos',
        tipo: 'numero',
        desceAoContrato: true,
        ajuda:
          'Por quantos anos o acordo vale. No acordo da Utida: "permanecerá em vigor por '
          + 'um período de 10 (dez) anos". TAMBÉM DESCE AO CONTRATO SOCIAL, na redação que '
          + 'nomeia um acordo concreto: o Bela Vista e o modelo da casa escrevem "acordo de '
          + 'quotistas com vigência pelo período de 20 (vinte) anos a partir da sua '
          + 'assinatura"; os outros cinco só dizem "eventual Acordo de Quotistas".',
      },
      /*
       * NÃO EXISTE CLÁUSULA DE SIGILO, e o campo saiu daqui.
       *
       * Ele veio do levantamento de 11/09. Contado nos SETE acordos do acervo:
       * zero ocorrências de "sigilo" ou "confidencialidade" como cláusula. Não é
       * o modelo que não tem, é nenhum deles.
       *
       * As duas mencões que aparecem numa busca solta são outra coisa: a
       * definição de ÍNDICE DE ATUALIZAÇÃO e um trecho sobre "informações
       * confidenciais" dentro da regra de outros negócios dos quotistas.
       *
       * Mesma situação do limite de aval e fiança, derrubado em 15/09 pelo mesmo
       * critério: campo sem frase em documento nenhum é campo que não devia
       * existir. A coluna cai na migration de limpeza.
       */
    ],
  },
  {
    chave: 'alcance',
    titulo: 'Alcance do acordo',
    resumo: 'Sobre quais empresas o acordo vale, e como a família se divide em ramos',
    campos: [
      {
        campo: 'ramos',
        rotulo: 'Ramos familiares',
        tipo: 'especial',
        /*
         * A ajuda tinha nove linhas e contava a história toda: a herança, o voto
         * em bloco, a proibição de "núcleo familiar". Tooltip não é lugar de
         * doutrina — ela diz o que o campo faz e como a linha sai. O resto está
         * no documento de referência dos campos.
         */
        ajuda:
          'Divide a família em grupos, um por fundador. Digite só o nome dele; a frase o '
          + 'sistema monta. Com "Cristina" sai: "DESCENDENTES DE CRISTINA, formado por '
          + 'CRISTINA e seus descendentes em linha vertical".',
      },
    ],
  },
  {
    chave: 'quorum',
    titulo: 'Quórum e deliberação',
    resumo: 'Quanto de voto é preciso para cada decisão valer',
    campos: [
      {
        campo: 'quoruns',
        rotulo: 'Os quóruns do acordo',
        tipo: 'especial',
        ajuda:
          'ESCREVA SÓ O ASSUNTO, e não a frase da cláusula: "Alterar o contrato social", e '
          + 'não "conforme decidam 75% (setenta e cinco por cento) dos presentes em relação '
          + 'à alteração do '
          + 'contrato social". A frase inteira o sistema monta, e você a vê pronta embaixo '
          + 'de cada linha. Sete vêm preenchidos; acrescente linha só se este cliente tiver '
          + 'uma matéria a mais, como o Perci, que exige 75% para emprestar a quotista. '
          + 'CADA LINHA ESCREVE NUM LUGAR DIFERENTE, e não numa lista só: quatro viram '
          + 'alíneas da escada do voto na Cláusula Nona, o aumento de capital sai na Quarta '
          + 'e a reunião prévia na Vigésima Quarta. A primeira, "para a reunião de sócios '
          + 'poder começar", NÃO sai no Acordo: ela é a cláusula de instalação do CONTRATO '
          + 'SOCIAL. E linha que você acrescentar fica só no cadastro, porque não há frase '
          + 'no modelo esperando por ela.',
      },
    ],
  },
  {
    chave: 'reuniao_previa',
    titulo: 'Reunião prévia e voto em bloco',
    resumo: 'Se os sócios fecham o voto entre si antes, e chegam combinados à reunião oficial',
    campos: [
      {
        campo: 'reuniao_previa_obrigatoria',
        // "Reunião prévia obrigatória" deixava no ar se era obrigação da lei ou
        // deste acordo. É deste acordo: existe no modelo, no Perci, no Horita e
        // na AgroAliança, e NÃO existe na Utida.
        rotulo: 'Este acordo exige reunião prévia',
        tipo: 'booleano',
        ajuda:
          'Ligado em 4 dos 7 acordos do acervo; a Utida não tem. Não é exigência de lei, é '
          + 'escolha deste acordo. '
          + 'É uma reunião só entre os sócios, ANTES da reunião oficial, em que eles votam entre '
          + 'si e registram o resultado em ata. Essa ata "constitui Acordo de Voto, de forma a '
          + 'definir e vincular o voto dos QUOTISTAS a serem proferidos, sempre em bloco e de '
          + 'modo uniforme, nas REUNIÕES DE SÓCIOS": na reunião oficial todos repetem o que se '
          + 'decidiu lá, inclusive quem foi voto vencido. A sociedade vê um voto só e a '
          + 'divergência fica em casa. No modelo o bloco é o conjunto dos quotistas; na '
          + 'AgroAliança cada ramo é um bloco, e os dois podem divergir entre si.',
      },
    ],
  },
  {
    chave: 'saida',
    titulo: 'Saída de sócio e preferência',
    resumo: 'A quem se oferece a quota, quanto ela vale e o que o sócio não pode fazer depois',
    campos: [
      { campo: 'signatarios', rotulo: 'Quotistas signatários originais', tipo: 'especial',
        secao: 'A quem se oferece a quota',
        ajuda: 'Quem assinou a primeira versão. Congela neles: o acordo fala em '
          + '"descendentes dos signatários", e esse recorte não muda quando o quadro '
          + 'societário muda.' },
      { campo: 'ordemPreferencia', rotulo: 'Ordem do direito de preferência', tipo: 'especial',
        secao: 'A quem se oferece a quota',
        ajuda: 'A fila de quem tem direito de comprar antes de a quota poder ir a terceiro. '
          + 'A Via Fértil oferece primeiro à holding; o modelo oferece primeiro aos '
          + 'descendentes dos signatários, e é o que vale por decisão de 14/09.' },
      { campo: 'objetos_preferencia', rotulo: 'Objetos sujeitos à preferência',
        tipo: 'multi', opcoes: OBJETOS, secao: 'A quem se oferece a quota',
        ajuda: 'O que não pode ir a terceiro sem passar pelos sócios antes. A Cláusula '
          + 'Quinta trata das quotas e a Décima estende a sociedades relacionadas, imóveis '
          + 'e oportunidades de negócio.' },
      { campo: 'mecanismos', rotulo: 'Quais destas regras este acordo tem', tipo: 'multi',
        // Cada opção leva a própria explicação, porque "drag along" e "lock-up"
        // não dizem nada a quem não convive com eles. "Mecanismos" era título
        // interno meu, e na tela não ajudava ninguém.
        opcoes: MECANISMOS.map((m) => ({
          valor: m.chave, rotulo: m.rotulo, descricao: m.explicacao, espelha: m.espelha,
        })),
        secao: 'A quem se oferece a quota',
        ajuda: 'Marque as que existem neste acordo. Cada marcação liga uma cláusula '
          + 'inteira do documento gerado; desmarcada, a cláusula não aparece. Sete das dez '
          + 'não existem em contrato social nenhum, e são o que o acordo acrescenta.' },

      /*
       * A APURAÇÃO DE HAVERES TEM DOIS CAMPOS, E NÃO SEIS.
       *
       * A primeira versão desta tela publicava prazo do balanço, horizonte do
       * fluxo, taxa mínima e regra de combinação, e isso contrariava uma medição
       * que eu mesmo tinha feito em 14/09 e deixado escrita no motor
       * (`vocabulario.ts`, entidade `acordoQuotistas`). Nos contratos do acervo
       * nenhum dos quatro varia: 60 dias em 7 de 7 que têm a cláusula, 05 anos em
       * 3 de 3, IPCA nos dois que citam índice, e "maior valor" em todos que
       * combinam métodos.
       *
       * Campo que não varia é texto fixo do modelo, e publicá-lo convida alguém a
       * responder uma pergunta que não existe, além de abrir a chance de digitar
       * um número diferente do que o escritório usa.
       *
       * O que VARIA é se a apuração usa o fluxo de caixa descontado além do
       * patrimônio líquido: Bela Vista, Horita e Agro Ferragens usam os dois;
       * Perci, Mattei e Zamo usam só o patrimônio líquido. É uma escolha, e ela
       * já cabe em `metodos_avaliacao`. Os números vão fixos dentro do bloco que
       * a escolha acende.
       */
      { campo: 'metodos_avaliacao', rotulo: 'Como se apura quanto vale a quota',
        tipo: 'multi', opcoes: METODOS, desceAoContrato: true,
        secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Marque os métodos que este acordo usa. Os números de cada um são fixos no '
          + 'modelo e não se digitam: balanço de no máximo 60 (sessenta) dias, fluxo '
          + 'projetado para 05 (cinco) anos, crescimento pelo IPCA, e prevalece o maior '
          + 'valor quando há mais de um. Medido nos contratos do acervo, nenhum desses '
          + 'quatro varia; o que varia é quais métodos entram.' },
      { campo: 'consolida_composse', rotulo: 'Consolida composse na avaliação',
        tipo: 'booleano', secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Se o que o sócio explora junto com a sociedade entra na conta dos haveres. '
          + 'No modelo: "inclusive através de parceria rural, condomínio ou composse, serão '
          + 'descontados ou acrescidos dos haveres devidos".' },

      { campo: 'nao_concorrencia', rotulo: 'Cláusula de não concorrência', tipo: 'booleano',
        secao: 'O que o sócio não pode fazer depois',
        ajuda: 'Se o acordo proíbe o sócio de montar negócio igual. Está em 6 dos 7 acordos '
          + 'do acervo.' },
      { campo: 'nao_concorrencia_prazo_anos', rotulo: 'Prazo da não concorrência, em anos',
        tipo: 'numero', dependeDe: 'nao_concorrencia',
        secao: 'O que o sócio não pode fazer depois',
        ajuda: 'Por quanto tempo a proibição vale depois que o sócio sai. No modelo: '
          + '"qualquer ATIVIDADE CONCORRENTE na ÁREA DE ATUAÇÃO em um período de 03 (três) '
          + 'anos".' },
      { campo: 'nao_concorrencia_area', rotulo: 'Área protegida', tipo: 'texto',
        dependeDe: 'nao_concorrencia', secao: 'O que o sócio não pode fazer depois',
        ajuda: 'Onde a proibição vale. O que você escrever aqui vira a definição de ÁREA DE '
          + 'ATUAÇÃO na Cláusula Primeira, e o resto da frase é fixo: escrevendo "Estado do '
          + 'Paraná", sai "ÁREA DE ATUAÇÃO: Estado do Paraná e/ou regiões de atuação da '
          + 'empresa que estão sujeitas a CLÁUSULA DE NÃO CONCORRÊNCIA, incluindo ainda, os '
          + 'municípios descritos no contrato social". Sai do objeto social do contrato.' },
      { campo: 'nao_concorrencia_multa', rotulo: 'Multa por descumprimento',
        tipo: 'texto', dependeDe: 'nao_concorrencia',
        secao: 'O que o sócio não pode fazer depois',
        ajuda: 'Quanto se paga por quebrar a proibição. No modelo: "multa meramente punitiva '
          + 'de R$ 1.000.000,00 (um milhão de reais), cujo valor será atualizado pelo ÍNDICE '
          + 'DE ATUALIZAÇÃO". É texto e não moeda porque o índice anda junto do valor.' },
      { campo: 'nao_concorrencia_alcanca_parentes', rotulo: 'Alcança parentes e sócios',
        tipo: 'booleano', dependeDe: 'nao_concorrencia',
        secao: 'O que o sócio não pode fazer depois',
        ajuda: 'Se a proibição pega também cônjuge, companheiro e parte relacionada. No '
          + 'modelo: "poderá ser exigida de qualquer QUOTISTA caso alguma PARTE RELACIONADA, '
          + 'seu cônjuge ou companheiro(a) descumpra".' },
    ],
  },
  {
    chave: 'opcoes',
    titulo: 'Opções de compra e venda',
    resumo: 'Quando um sócio pode ser obrigado a vender, ou exigir que comprem a parte dele',
    campos: [
      { campo: 'opcao_compra_prevista', rotulo: 'Opção de compra prevista', tipo: 'booleano',
        ajuda: 'O direito de exigir que outro lhe venda a participação.' },
      { campo: 'opcao_compra_quem', rotulo: 'Quem detém a opção de compra', tipo: 'texto',
        dependeDe: 'opcao_compra_prevista',
        ajuda: 'Quem pode exigir que o outro venda. ESCREVA SEM O ARTIGO e em minúscula no '
          + 'começo, porque a frase já traz o "aos": "Igualmente será assegurado aos ___ '
          + 'exercerem uma OPÇÃO DE COMPRA". Escrevendo "Os demais quotistas", sai '
          + '"assegurado a Os demais quotistas". Medido nos '
          + 'acordos, três redações em quatro documentos: "QUOTISTAS que sejam titulares da '
          + 'maioria das QUOTAS" no modelo e no AgroAliança, "demais QUOTISTAS" no Perci, e '
          + '"QUOTISTAS e/ou seus curadores" no Horita.' },
      { campo: 'opcao_venda_prevista', rotulo: 'Opção de venda prevista', tipo: 'booleano',
        ajuda: 'O direito de exigir que os outros comprem a sua parte.' },
      { campo: 'juros_valor_subscrito', rotulo: 'Juros sobre o valor subscrito', tipo: 'texto',
        ajuda: 'Quanto rende o valor que o sócio pôs no aumento de capital. No modelo: '
          + '"acrescido de juros de 1% (um por cento) ao mês e atualização monetária pelo '
          + 'ÍNDICE DE ATUALIZAÇÃO".' },
    ],
  },
  /*
   * NÃO EXISTE GRUPO DE USUFRUTO AQUI, e a ausência custou duas correções.
   *
   * Primeiro eu criei duas colunas em `quadro_societario` para marcá-lo, e elas
   * duplicavam `onus_quotas`, que existe desde 10/09 e guarda melhor: vários
   * usufrutuários, a quantidade de quotas gravadas e a data de extinção.
   *
   * Depois transformei o grupo num ponteiro para o Quadro Societário. Também
   * sobra: a tela do Quadro já tem o card `UsufrutoEVoto`, que lê os ônus e monta
   * a tabela de quem vota sobre o saldo de hoje, que é o mesmo objeto que a
   * consolidação reimprime. O bloco no Acordo não pedia nada ao analista e não
   * mostrava nada que o Quadro não mostrasse melhor.
   *
   * O usufruto continua indo para o acordo gerado: o motor lê `onus_quotas` na
   * hora de escrever a cláusula de quem vota. Cadastro é no Quadro, uso é aqui.
   */
  {
    chave: 'conflitos',
    titulo: 'Solução de conflitos',
    resumo: 'Para onde vai a briga que os sócios não resolverem entre si',
    campos: [
      { campo: 'solucao_litigios', rotulo: 'Solução de litígios', tipo: 'escolha',
        ajuda: 'Para onde vai a briga que os sócios não resolverem. ARBITRAGEM é um juiz '
          + 'particular: em vez de irem ao fórum, contratam uma câmara privada, e a decisão '
          + 'vale como sentença, sem recurso. JUDICIAL é o fórum comum. Os 7 acordos do acervo '
          + 'escolhem arbitragem, e nenhum dos 8 contratos sociais a tem. Marcando judicial, os '
          + 'dois campos abaixo (câmara e árbitros) deixam de ter uso.',
        opcoes: [
          { valor: 'arbitragem', rotulo: 'Arbitragem' },
          { valor: 'judicial', rotulo: 'Judicial' },
        ] },
      { campo: 'camara_arbitral', rotulo: 'Câmara arbitral', tipo: 'texto',
        ajuda: 'Qual câmara julga a briga. Cinco dos sete acordos usam a Câmara de Comércio '
          + 'Brasil Canadá, a CAM-CCBC, e a Utida usa a Câmara FGV de Conciliação e '
          + 'Arbitragem. Quantos árbitros são não se digita: o modelo fixa três em todos.' },

      /*
       * O QUE VARIA É QUEM ESCOLHE OS ÁRBITROS, e não o prazo.
       *
       * Este lugar já teve um campo de "prazo para indicação de árbitros", e ele
       * saiu duas vezes, a segunda pelo motivo certo. Da primeira eu escrevi que
       * o prazo "não existe em documento nenhum", o que é falso: o AgroAliança,
       * cláusula 26.3, traz "no prazo de 15 (quinze) dias". Da segunda, porque
       * temos UMA observação desse valor e nenhuma de um valor diferente. Pela
       * mesma regra que tirou os 60 dias do balanço, é linha fixa da cláusula, e
       * perguntar convida a inventar variação que nunca existiu.
       *
       * Relendo a cláusula inteira em vez de caçar a palavra "prazo", o que
       * varia apareceu: são dois regimes de nomeação, medidos nos sete acordos.
       * O modelo da casa usa o primeiro.
       *
       * O QUANTOS são não é campo: "03 (três)" em 6 de 6 que dizem.
       */
      { campo: 'regime_nomeacao_arbitros', rotulo: 'Quem escolhe os árbitros',
        tipo: 'escolha',
        opcoes: [
          { valor: 'partes', rotulo: 'Cada lado escolhe o seu, e os dois escolhem o terceiro' },
          { valor: 'camara', rotulo: 'A câmara escolhe os três, pelo regulamento dela' },
        ],
        ajuda: 'São sempre três árbitros, e o que muda é quem os indica. Em 5 dos 7 acordos, '
          + 'incluindo o modelo da casa: "sendo um nomeado pelo reclamante, o outro pela '
          + 'parte reclamada e o terceiro eleito por aqueles dois outros árbitros". Nos '
          + 'outros dois, Horita e Via Fértil: "os quais serão nomeados conforme o '
          + 'regulamento da CAM-CCBCC". Quantos são não se digita: o modelo fixa três em '
          + 'todos.' },

      /*
       * O FORO ELEITO fica aqui porque é a mesma cláusula: a 26.6 ressalva que,
       * só para medida liminar, os quotistas vão ao judiciário desta comarca.
       * E é a mesma cidade da arbitragem em 5 dos 5 acordos que trazem as duas.
       */
      { campo: 'foro_eleito_comarca', rotulo: 'Foro eleito — cidade', tipo: 'texto',
        meiaLinha: true,
        ajuda: 'Em que comarca. Sai duas vezes: "elegem o foro da cidade de Cuiabá, estado de '
          + 'Mato Grosso, por mais privilegiado outro o seja" e, na cláusula da arbitragem, '
          + '"o local de arbitragem será a cidade de Cuiabá". No acervo variam Cuiabá, Lucas '
          + 'do Rio Verde, Tangará da Serra e Campo Novo do Parecis, e não é a cidade da '
          + 'sede: o AgroAliança senta em Sorriso e elege Cuiabá.' },
      { campo: 'foro_eleito_estado', rotulo: 'Foro eleito — estado', tipo: 'texto',
        meiaLinha: true,
        ajuda: 'O estado POR EXTENSO, como o documento escreve: "Mato Grosso", e não "MT".' },
    ],
  },
  {
    chave: 'representacao',
    titulo: 'Garantias e representação',
    resumo: 'Quem os quotistas elegem para falar por eles perante a sociedade',
    campos: [
      {
        campo: 'representante_pessoa_id',
        rotulo: 'Representante dos quotistas',
        tipo: 'especial',
        ajuda:
          'Quem fala pelos sócios perante a sociedade, nos termos do §10 do art. 118 da Lei '
          + 'das S/A. Sai "os QUOTISTAS elegem o Sr. LUIZ MARCELO como representante dos '
          + 'QUOTISTAS", e o Sr. ou Sra. concorda com o gênero da pessoa escolhida. O limite '
          + 'de aval e fiança que o card previa não é campo: procurei nos sete acordos e nos '
          + 'oito contratos e não existe número nenhum, a cláusula diz quem pode garantir '
          + 'quem, não quanto.',
      },
    ],
  },
];

/** Quantos campos deste grupo já têm valor, para o cartão da lista. */
export function preenchidosNoGrupo(
  grupo: GrupoDoAcordo,
  valores: Record<string, unknown>,
  /** O bloco já foi aberto e salvo por alguém? Ver o porquê abaixo. */
  conferido = false,
): { preenchidos: number; total: number } {
  const visiveis = grupo.campos.filter(
    (c) => !c.dependeDe || valores[c.dependeDe] === true,
  );
  const temValor = (c: CampoDoAcordo) => {
    const v = valores[c.campo];
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    /*
     * BOOLEANO SÓ CONTA DEPOIS DE CONFERIDO, e é a mesma correção do selo
     * "Pronto" que saiu desta tela em 15/09.
     *
     * As colunas booleanas são `NOT NULL DEFAULT false`, então `false` não
     * distingue "o cliente não tem" de "ninguém abriu isto ainda". Contando
     * sempre, uma versão recém-criada anunciava "2 de 3 respondidos" sem
     * ninguém ter respondido nada, que é o convite a pular o bloco.
     *
     * Depois que o bloco foi aberto e salvo, o `false` passa a ser resposta de
     * verdade: alguém olhou e deixou desligado. Daí o parâmetro, em vez de
     * nunca contar booleano, o que apagaria a resposta legítima de quem disse
     * "não tem".
     */
    if (typeof v === 'boolean') return conferido;
    return true;
  };
  return { preenchidos: visiveis.filter(temValor).length, total: visiveis.length };
}

/** O grupo de uma chave. */
export function grupoDoAcordo(chave: string): GrupoDoAcordo | undefined {
  return GRUPOS_DO_ACORDO.find((g) => g.chave === chave);
}

/** Todos os campos que descem ao contrato social, de todos os grupos. */
export function camposQueDescem(): CampoDoAcordo[] {
  return GRUPOS_DO_ACORDO.flatMap((g) => g.campos).filter((c) => c.desceAoContrato);
}
