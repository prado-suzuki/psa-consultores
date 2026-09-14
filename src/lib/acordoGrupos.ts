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
  opcoes?: readonly { valor: string; rotulo: string }[];
  ajuda?: string;
  /** Também vira cláusula no contrato social. */
  desceAoContrato?: boolean;
  /** Só aparece quando este outro campo está ligado. */
  dependeDe?: string;
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
    resumo: 'Quais sociedades o acordo alcança e como a família se divide em ramos',
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
        ajuda: 'Congela em quem assinou: o acordo fala em "descendentes dos signatários", e '
          + 'esse recorte não muda quando o quadro societário muda.' },
      { campo: 'ordemPreferencia', rotulo: 'Ordem do direito de preferência', tipo: 'especial',
        ajuda: 'A quem se oferece primeiro, antes de a quota poder ir a terceiro.' },
      { campo: 'objetos_preferencia', rotulo: 'Objetos sujeitos à preferência',
        tipo: 'multi', opcoes: OBJETOS },
      { campo: 'mecanismos', rotulo: 'Mecanismos presentes', tipo: 'multi',
        opcoes: MECANISMOS.map((m) => ({ valor: m.chave, rotulo: m.rotulo })),
        ajuda: 'Marcado, a cláusula entra no acordo gerado. Desmarcado, ela não aparece.' },

      { campo: 'metodos_avaliacao', rotulo: 'Métodos de avaliação da quota',
        tipo: 'multi', opcoes: METODOS, desceAoContrato: true },
      { campo: 'regra_combinacao', rotulo: 'Regra de combinação dos métodos',
        tipo: 'texto', desceAoContrato: true,
        ajuda: 'No modelo: "o MAIOR VALOR atingido por uma das seguintes metodologias".' },
      { campo: 'prazo_balanco_dias', rotulo: 'Prazo máximo do balanço, em dias',
        tipo: 'numero', desceAoContrato: true },
      { campo: 'horizonte_fluxo_anos', rotulo: 'Horizonte do fluxo de caixa, em anos',
        tipo: 'numero', desceAoContrato: true },
      { campo: 'taxa_minima_crescimento', rotulo: 'Taxa mínima de crescimento',
        tipo: 'texto', desceAoContrato: true },
      { campo: 'consolida_composse', rotulo: 'Consolida composse na avaliação',
        tipo: 'booleano' },

      { campo: 'nao_concorrencia', rotulo: 'Cláusula de não concorrência', tipo: 'booleano' },
      { campo: 'nao_concorrencia_prazo_anos', rotulo: 'Prazo da não concorrência, em anos',
        tipo: 'numero', dependeDe: 'nao_concorrencia' },
      { campo: 'nao_concorrencia_area', rotulo: 'Área protegida', tipo: 'texto',
        dependeDe: 'nao_concorrencia',
        ajuda: 'Sai do objeto social do contrato: onde a sociedade atua é onde o sócio não pode concorrer.' },
      { campo: 'nao_concorrencia_multa', rotulo: 'Multa por descumprimento',
        tipo: 'texto', dependeDe: 'nao_concorrencia',
        ajuda: 'Texto, e não valor: o modelo define a multa por fórmula.' },
      { campo: 'nao_concorrencia_alcanca_parentes', rotulo: 'Alcança parentes e sócios',
        tipo: 'booleano', dependeDe: 'nao_concorrencia' },
    ],
  },
  {
    chave: 'opcoes',
    titulo: 'Opções de compra e venda',
    resumo: 'Quem pode obrigar quem a comprar ou a vender',
    campos: [
      { campo: 'opcao_compra_prevista', rotulo: 'Opção de compra prevista', tipo: 'booleano',
        ajuda: 'O direito de exigir que outro lhe venda a participação.' },
      { campo: 'opcao_compra_quem', rotulo: 'Quem detém a opção de compra', tipo: 'texto',
        dependeDe: 'opcao_compra_prevista' },
      { campo: 'opcao_compra_preco', rotulo: 'Preço na opção de compra', tipo: 'texto',
        dependeDe: 'opcao_compra_prevista' },
      { campo: 'opcao_venda_prevista', rotulo: 'Opção de venda prevista', tipo: 'booleano',
        ajuda: 'O direito de exigir que os outros comprem a sua parte.' },
      { campo: 'juros_valor_subscrito', rotulo: 'Juros sobre o valor subscrito', tipo: 'texto' },
    ],
  },
  {
    chave: 'usufruto',
    titulo: 'Usufruto e voto',
    resumo: 'Quais quotas têm usufruto e quem vota cada uma',
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
      { campo: 'camara_arbitral', rotulo: 'Câmara arbitral', tipo: 'texto' },
      { campo: 'prazo_indicacao_arbitros_dias', rotulo: 'Prazo para indicação de árbitros, em dias',
        tipo: 'numero' },
    ],
  },
  {
    chave: 'representacao',
    titulo: 'Garantias e representação',
    resumo: 'Quem fala pelos quotistas',
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
