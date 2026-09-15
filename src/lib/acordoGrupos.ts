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
    chave: 'alcance',
    titulo: 'Alcance do acordo',
    resumo: 'Quais empresas do grupo o acordo abrange, e como a família se divide em ramos',
    campos: [
      {
        campo: 'sociedades',
        rotulo: 'Sociedades relacionadas abrangidas',
        tipo: 'especial',
        ajuda:
          'O modelo estende quase toda regra às sociedades relacionadas, então esta lista '
          + 'muda o alcance do documento inteiro.',
      },
      {
        campo: 'ramos',
        rotulo: 'Ramos familiares',
        tipo: 'especial',
        ajuda:
          'Os rótulos aceitos são "RAMO [nome]" e "DESCENDENTES DE [nome]". Nunca "núcleo '
          + 'familiar", porque o termo exclui o cônjuge, e cônjuge não integra ramo.',
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
          'Sete no modelo. Cada um diz quanto precisa e sobre o que conta: os presentes na '
          + 'reunião ou o capital todo. Numa segunda convocação, que instala com qualquer '
          + 'número, um sócio de 40% é 100% dos presentes e 40% do capital.',
      },
    ],
  },
  {
    chave: 'reuniao_previa',
    titulo: 'Reunião prévia e voto em bloco',
    resumo: 'Se os sócios combinam antes como vão votar depois',
    campos: [
      {
        campo: 'reuniao_previa_obrigatoria',
        rotulo: 'Reunião prévia obrigatória',
        tipo: 'booleano',
        ajuda:
          'Quando obrigatória, os quotistas deliberam antes e votam em bloco na reunião de '
          + 'sócios, conforme o que combinaram.',
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

      { campo: 'metodos_avaliacao', rotulo: 'Métodos de avaliação da quota',
        tipo: 'multi', opcoes: METODOS, desceAoContrato: true,
        secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Como se calcula quanto se paga a quem sai. No modelo são dois: o patrimônio '
          + 'líquido apurado em balanço, e o fluxo de caixa descontado.' },
      { campo: 'regra_combinacao', rotulo: 'Regra de combinação dos métodos',
        tipo: 'texto', desceAoContrato: true, secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Quando há mais de um método, qual vale. No modelo: "correspondente ao MAIOR '
          + 'VALOR apurado através das seguintes metodologias".' },
      { campo: 'prazo_balanco_dias', rotulo: 'Prazo máximo do balanço, em dias',
        tipo: 'numero', desceAoContrato: true, secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Quão velho o balanço pode ser. No modelo: "o valor do patrimônio líquido '
          + 'apurado em balanço, levantado, no máximo, 60 (sessenta) dias antes do evento". '
          + 'Responda 60 se o cliente segue o padrão.' },
      { campo: 'horizonte_fluxo_anos', rotulo: 'Horizonte do fluxo de caixa, em anos',
        tipo: 'numero', desceAoContrato: true, secao: 'Quanto vale a quota de quem sai',
        ajuda: 'Por quantos anos o fluxo é projetado. No modelo: "fluxo de caixa projetado '
          + 'para um período de 05 (cinco) anos". Responda 5 se o cliente segue o padrão.' },
      { campo: 'taxa_minima_crescimento', rotulo: 'Taxa mínima de crescimento',
        tipo: 'texto', desceAoContrato: true, secao: 'Quanto vale a quota de quem sai',
        ajuda: 'O piso de crescimento usado na projeção. No modelo: "a taxa de crescimento '
          + 'da perpetuidade será o índice projetado pelo IPCA". Responda IPCA se for o padrão.' },
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
  {
    chave: 'usufruto',
    titulo: 'Usufruto e voto',
    resumo: 'Quotas em que o dono e quem vota são pessoas diferentes',
    campos: [
      {
        campo: 'usufruto',
        rotulo: 'Quotas gravadas com usufruto',
        tipo: 'especial',
        desceAoContrato: true,
        ajuda:
          'Marca quota a quota no quadro societário. Quem detém a quota não é '
          + 'necessariamente quem vota, e qualquer conta de quórum que ignore isso erra.',
      },
    ],
  },
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
      { campo: 'camara_arbitral', rotulo: 'Câmara arbitral', tipo: 'texto',
        ajuda: 'Qual câmara julga. No modelo: "de acordo com as Regras de Arbitragem da '
          + 'Câmara de Comércio Brasil Canadá".' },
      { campo: 'prazo_indicacao_arbitros_dias', rotulo: 'Prazo para indicação de árbitros, em dias',
        tipo: 'numero',
        ajuda: 'ATENÇÃO: o modelo não traz prazo nenhum aqui. Ele diz quantos árbitros são e '
          + 'quem escolhe cada um, "o número de árbitros será de 03 (três), sendo um nomeado '
          + 'pelo reclamante, o outro pela parte reclamada e o terceiro eleito por aqueles '
          + 'dois". O campo veio do levantamento e pode estar com o nome trocado.' },
    ],
  },
  {
    chave: 'representacao',
    titulo: 'Garantias e representação',
    resumo: 'Quem assina e fala em nome dos quotistas perante a sociedade',
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
