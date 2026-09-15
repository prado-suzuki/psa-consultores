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

import { MECANISMOS } from '@/lib/acordoQuotistasPadrao';

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
  opcoes?: readonly { valor: string; rotulo: string; descricao?: string }[];
  ajuda?: string;
  /** Também vira cláusula no contrato social. */
  desceAoContrato?: boolean;
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

const OBJETOS = [
  { valor: 'quotas', rotulo: 'Quotas' },
  { valor: 'imoveis', rotulo: 'Imóveis' },
  { valor: 'maquinas', rotulo: 'Máquinas' },
  { valor: 'equipamentos', rotulo: 'Equipamentos' },
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
        rotulo: 'Assinado em',
        tipo: 'data',
        ajuda:
          'Deixe em branco enquanto for minuta. O documento gerado usa esta data para '
          + 'escrever o fecho; sem ela, ele deixa a lacuna para assinar à mão.',
      },
      {
        campo: 'vigencia_anos',
        rotulo: 'Vigência, em anos',
        tipo: 'numero',
        ajuda:
          'Por quantos anos o acordo vale. No acordo da Utida: "permanecerá em vigor por '
          + 'um período de 10 (dez) anos".',
      },
      {
        campo: 'prazo_sigilo_anos',
        rotulo: 'Prazo de sigilo, em anos',
        tipo: 'numero',
        ajuda: 'Por quantos anos o conteúdo do acordo não pode ser divulgado.',
      },
    ],
  },
  {
    chave: 'alcance',
    titulo: 'Alcance do acordo',
    resumo: 'Sobre quais empresas o acordo vale, e como a família se divide em ramos',
    campos: [
      {
        campo: 'sociedades',
        rotulo: 'Sociedades relacionadas abrangidas',
        tipo: 'especial',
        ajuda:
          'AS OUTRAS EMPRESAS DO GRUPO, e não os sócios. O acordo estende quase toda '
          + 'regra a elas: a preferência na venda, a não concorrência e o dever de levar '
          + 'oportunidade à administração valem para a holding e para cada operacional '
          + 'listada aqui. Incluir ou tirar uma empresa muda o alcance do documento '
          + 'inteiro.',
      },
      {
        campo: 'ramos',
        rotulo: 'Ramos familiares',
        tipo: 'especial',
        ajuda:
          'Cada ramo é um sócio fundador MAIS os descendentes dele em linha reta, e leva '
          + 'o nome desse fundador. No acordo da AgroAliança: "DESCENDENTES DE CRISTINA, '
          + 'formado por CRISTINA e seus descendentes em linha vertical; e DESCENDENTES DE '
          + 'REGINA". Serve para dividir direitos entre os lados da família, como a ordem '
          + 'da preferência. Nunca escreva "núcleo familiar": o termo exclui o cônjuge, e '
          + 'cônjuge não integra ramo nem entra no quadro societário.',
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
          + 'não "conforme decidam três quartos dos presentes em relação à alteração do '
          + 'contrato social". A frase inteira o sistema monta, e você a vê pronta embaixo '
          + 'de cada linha. Sete vêm preenchidos; acrescente linha só se este cliente tiver '
          + 'uma matéria a mais, como o Perci, que exige 75% para emprestar a quotista.',
      },
    ],
  },
  {
    chave: 'reuniao_previa',
    titulo: 'Reunião prévia e voto em bloco',
    resumo: 'Se os sócios se reúnem antes para fechar o voto, e com que quórum',
    campos: [
      {
        campo: 'reuniao_previa_obrigatoria',
        rotulo: 'Reunião prévia obrigatória',
        tipo: 'booleano',
        ajuda:
          'É uma reunião só entre os sócios, ANTES da reunião oficial. Nela eles discutem e '
          + 'decidem entre si qual vai ser o voto; depois, na reunião de sócios, todos votam '
          + 'igual ao que combinaram, mesmo quem foi voto vencido. É isso que "votar em '
          + 'bloco" quer dizer: a sociedade vê um voto só, e a divergência fica em casa.',
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
          valor: m.chave, rotulo: m.rotulo, descricao: m.explicacao,
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
        ajuda: 'Onde a proibição vale. No modelo é uma definição: "ÁREA DE ATUAÇÃO: em todos '
          + 'os estados do Brasil, incluindo Mato Grosso e Pernambuco, e/ou regiões de '
          + 'atuação da sociedade". Sai do objeto social do contrato.' },
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
        dependeDe: 'opcao_compra_prevista' },
      { campo: 'opcao_compra_preco', rotulo: 'Preço na opção de compra', tipo: 'texto',
        dependeDe: 'opcao_compra_prevista' },
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
        opcoes: [
          { valor: 'arbitragem', rotulo: 'Arbitragem' },
          { valor: 'judicial', rotulo: 'Judicial' },
        ] },
      /*
       * NÃO EXISTE "PRAZO PARA INDICAÇÃO DE ÁRBITROS", e o campo saiu daqui.
       *
       * Ele veio do levantamento, e rastreei nos sete acordos: nenhum traz prazo.
       * Seis dos sete trazem outra coisa, com a mesma redação, "o número de
       * árbitros será de 03 (três), sendo um nomeado pelo reclamante, o outro
       * pela parte reclamada e o terceiro eleito por aqueles dois".
       *
       * E esse número também não vira campo: 3 em 6 de 6 é texto fixo do modelo,
       * pela mesma regra que tirou os quatro números da apuração de haveres.
       *
       * A CÂMARA FICA, porque essa varia de verdade: cinco acordos usam a Câmara
       * de Comércio Brasil Canadá e a Utida usa a Câmara FGV de Conciliação e
       * Arbitragem.
       *
       * A coluna `prazo_indicacao_arbitros_dias` continua no banco, vazia, junto
       * das quatro da apuração. Derrubar as cinco é uma migration de limpeza.
       */
      { campo: 'camara_arbitral', rotulo: 'Câmara arbitral', tipo: 'texto',
        ajuda: 'Qual câmara julga a briga. Cinco dos sete acordos usam a Câmara de Comércio '
          + 'Brasil Canadá, a CAM-CCBC, e a Utida usa a Câmara FGV de Conciliação e '
          + 'Arbitragem. Quantos árbitros são não se digita: o modelo fixa três em todos.' },
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
          'O limite de aval e fiança que o card previa não entrou: procurei nos sete acordos '
          + 'e nos oito contratos e não existe número nenhum. A cláusula diz quem pode '
          + 'garantir quem, não quanto.',
      },
    ],
  },
];

/** Quantos campos deste grupo já têm valor, para o cartão da lista. */
export function preenchidosNoGrupo(
  grupo: GrupoDoAcordo,
  valores: Record<string, unknown>,
): { preenchidos: number; total: number } {
  const visiveis = grupo.campos.filter(
    (c) => !c.dependeDe || valores[c.dependeDe] === true,
  );
  const temValor = (c: CampoDoAcordo) => {
    const v = valores[c.campo];
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    // Booleano desligado conta como respondido: "não tem" é uma resposta.
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
