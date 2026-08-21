/**
 * O texto do contrato por bloco, montado com os dados que já existem.
 *
 * O molde é o `VF_Contrato Social - Governança com conselho.docx` mais a 5ª
 * Alteração do Perci Smaniotto. Cada valor declara de onde vem, e é isso que a
 * marca amarela e a tooltip mostram na tela.
 *
 * O que este arquivo prova, e é a resposta à pergunta do usuário: num contrato de
 * governança, a parte mais longa (a qualificação das partes e a identificação da
 * sociedade) o sistema JÁ TEM. O que falta é justamente o que o cadastro de
 * governança vai coletar.
 */
import { ASSUNTOS_MATRIZ, ORGAOS_COM_CLAUSULA, REGENCIA } from './cadastroGovernancaDados';
import type { Paragrafo, Parte } from './cadastroGovernancaDocumento';
import { COLUNA, SOCIEDADE, SOCIOS, TELA_PESSOAS } from './cadastroGovernancaContexto';

const doCadastro = (onde: string) => ({ de: 'cadastro' as const, onde, tela: TELA_PESSOAS });
// `campo` é o rótulo EXATO do campo no formulário: é ele que o clique na marca
// amarela usa para achar o `data-campo` e rolar até lá. Ausente = marca só
// explica, não navega.
const doForm = (onde: string, item: string, campo?: string) => ({
  de: 'formulario' as const,
  onde,
  item,
  campo: campo ?? onde,
});
const calculado = (onde: string) => ({ de: 'derivado' as const, onde });

/** A qualificação de um sócio, como o contrato escreve, tudo vindo do cadastro. */
function qualificacao(s: (typeof SOCIOS)[number]): Paragrafo {
  return {
    tipo: 'clausula',
    partes: [
      { v: s.nome, f: doCadastro(COLUNA.nome) },
      ', ',
      { v: s.nacionalidade, f: doCadastro(COLUNA.nacionalidade) },
      ', natural de ',
      { v: s.naturalidade, f: doCadastro(COLUNA.naturalidade) },
      ', nascido em ',
      { v: s.nascimento, f: doCadastro(COLUNA.nascimento) },
      ', ',
      { v: s.profissao, f: doCadastro(COLUNA.profissao) },
      ', ',
      { v: s.estadoCivil, f: doCadastro(COLUNA.estadoCivil) },
      ' sob o regime de ',
      { v: s.regimeBens, f: doCadastro(COLUNA.regimeBens) },
      ', portador do RG n.º ',
      { v: s.rg, f: doCadastro(COLUNA.rg) },
      ' ',
      { v: s.orgao, f: doCadastro(COLUNA.orgao) },
      ', inscrito no CPF/MF sob o n.º ',
      { v: s.cpf, f: doCadastro(COLUNA.cpf) },
      ', residente e domiciliado à ',
      { v: s.endereco, f: doCadastro(COLUNA.endereco) },
      ';',
    ],
  };
}

export const CABECALHO: Paragrafo[] = [
  {
    tipo: 'titulo',
    partes: [
      { v: 'SEXTA', f: calculado('extenso de alteracao.numero = 6') },
      ' ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL',
    ],
  },
  { tipo: 'centro', partes: [{ v: SOCIEDADE.razaoSocial, f: doCadastro(COLUNA.razaoSocial) }] },
  {
    tipo: 'centro',
    partes: [
      'CNPJ/MF ',
      { v: SOCIEDADE.cnpj, f: doCadastro(COLUNA.cnpj) },
      ' — NIRE ',
      { v: SOCIEDADE.nire, f: doCadastro(COLUNA.nire) },
    ],
  },
];

const PREAMBULO: Paragrafo[] = [
  ...SOCIOS.map(qualificacao),
  {
    tipo: 'clausula',
    partes: [
      'Únicos sócios da sociedade limitada ',
      { v: SOCIEDADE.razaoSocial, f: doCadastro(COLUNA.razaoSocial) },
      ', registrada na Junta Comercial do Estado de ',
      { v: SOCIEDADE.juntaUf, f: doCadastro(COLUNA.juntaUf) },
      ' sob o NIRE n.º ',
      { v: SOCIEDADE.nire, f: doCadastro(COLUNA.nire) },
      ', com sede estabelecida na ',
      { v: SOCIEDADE.endereco, f: doCadastro('pessoa.endereco_* da PJ') },
      ', regendo-se pela Lei n.º 10.406/2002 e supletivamente pela Lei n.º 6.404/1976, sendo que, nos casos omissos, será aplicado o que estiver disposto em eventual Acordo de Quotistas, resolvem alterar e consolidar o contrato social:',
    ],
  },
];

/** Lê o campo pelo rótulo; cai no valor de exemplo quando ninguém editou. */
export type LeitorDeCampo = (rotulo: string, padrao: string) => string;

/** Bloco 03 · Acordo de Quotistas — o capítulo que dá força ao acordo. */
export const clausulasDoAcordo = (v: LeitorDeCampo): Paragrafo[] => [
  ...CABECALHO,
  ...PREAMBULO,
  { tipo: 'capitulo', partes: ['CAPÍTULO X — Do Acordo de Quotistas'] },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA VIGÉSIMA OITAVA: Os sócios ',
      { v: v('Acordo de quotistas arquivado na sede', 'Sim').toLowerCase().startsWith('s') ? 'poderão firmar' : 'não firmaram', f: doForm('Acordo de quotistas arquivado na sede', 'AC Reflexo') },
      ' acordos de quotistas, os quais serão arquivados na sede da sociedade e registrados na Junta Comercial da sede, e, por conseguinte, serão oponíveis à sociedade, seus administradores, sócios e terceiros.',
    ],
  },
  {
    tipo: 'paragrafo',
    partes: [
      'Parágrafo Primeiro: A Reunião de Sócios e a administração devem obedecer o disposto nos acordos registrados, e estão obrigadas a abster-se de computar votos contrários ao acordo, a autorizar que qualquer sócio vote com as quotas do ausente ou omisso, e a coibir registros contrários ao acordo.',
    ],
  },
  {
    tipo: 'paragrafo',
    partes: [
      'Parágrafo Segundo: O administrador deverá comunicar aos sócios, no prazo máximo de 30 (trinta) dias, os eventuais acordos que forem registrados em sua sede.',
    ],
  },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA DÉCIMA NONA: O sócio que desejar alienar suas quotas deverá observar o direito de preferência, assegurado ',
      { v: v('Ordem do direito de preferência', '1º a holding · 2º os demais quotistas'), f: doForm('Ordem do direito de preferência', 'Acordo de Quotistas') },
      ', e o valor será apurado por ',
      { v: v('Métodos de avaliação da quota', 'Patrimônio líquido em balanço (IFRS), Fluxo de caixa descontado'), f: doForm('Métodos de avaliação da quota', 'Acordo de Quotistas') },
      ', prevalecendo ',
      { v: v('Regra de combinação dos métodos', 'O maior valor entre os métodos'), f: doForm('Regra de combinação dos métodos', 'Acordo de Quotistas') },
      ', com balanço levantado no máximo ',
      { v: v('Prazo máximo do balanço antes do evento', '60 dias'), f: doForm('Prazo máximo do balanço', 'Acordo de Quotistas', 'Prazo máximo do balanço antes do evento') },
      ' antes do evento.',
    ],
  },
];

/** Bloco 02 · Regimento Interno — os parâmetros que descem ao capítulo do Conselho. */
export const clausulasDoRegimento = (v: LeitorDeCampo): Paragrafo[] => [
  ...CABECALHO,
  { tipo: 'capitulo', partes: ['CAPÍTULO IV — Da Administração'] },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA SÉTIMA: O Conselho de Administração será composto por, no mínimo, ',
      { v: v('Mínimo de membros', '3'), f: doForm('Mínimo de membros', 'Regimento Interno') },
      ' e no máximo ',
      { v: v('Máximo de membros', '6'), f: doForm('Máximo de membros', 'Regimento Interno') },
      ' membros, com mandato de ',
      { v: v('Mandato dos conselheiros', '3 anos'), f: doForm('Mandato dos conselheiros', 'AC Reflexo') },
      ', sendo ',
      { v: v('Reeleição admitida', 'Sim').toLowerCase().startsWith('s') ? 'admitida a reeleição' : 'vedada a reeleição', f: doForm('Reeleição admitida', 'AC Reflexo') },
      ', assegurado a cada membro direito a um voto nas suas reuniões.',
    ],
  },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA OITAVA: As deliberações do Conselho dependerão de aprovação de ',
      { v: v('Quórum de deliberação', 'Maioria dos membros presentes'), f: doForm('Quórum de deliberação', 'Regimento Interno') },
      ', competindo ao Presidente ',
      { v: v('Voto de desempate do presidente', 'Sim').toLowerCase().startsWith('s') ? 'o voto de desempate' : 'nenhum voto de desempate', f: doForm('Voto de desempate do presidente', 'AC Reflexo') },
      '.',
    ],
  },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA NONA: O Conselho reunir-se-á ',
      { v: v('Local das reuniões', 'Na sede ou filiais da sociedade'), f: doForm('Local das reuniões', 'Regimento Interno') },
      ' em caráter ordinário, conforme calendário anual, e em caráter extraordinário quando convocado por escrito pelo Presidente ou por outros ',
      { v: v('Convocação extraordinária', '2 conselheiros'), f: doForm('Convocação extraordinária', 'Regimento Interno') },
      ' conselheiros.',
    ],
  },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA DÉCIMA PRIMEIRA: Perderá o cargo, ensejando vacância definitiva, o membro que deixar de participar de ',
      { v: v('Ausências que causam perda do cargo', '3 reuniões consecutivas'), f: doForm('Ausências que causam perda do cargo', 'Regimento Interno') },
      ' reuniões ordinárias consecutivas sem motivo justificado; e o substituto será eleito em prazo máximo de ',
      { v: v('Prazo para eleger substituto', '90 dias'), f: doForm('Prazo para eleger substituto', 'Regimento Interno') },
      '.',
    ],
  },
];

/** Bloco 05 · AC Reflexo — a alteração em si, com título, preâmbulo e administração. */
export const clausulasDoAcReflexo = (v: LeitorDeCampo): Paragrafo[] => [
  ...CABECALHO,
  ...PREAMBULO,
  { tipo: 'capitulo', partes: ['CAPÍTULO IV — Da Administração'] },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA SEXTA: A sociedade é administrada por ',
      { v: v('Órgãos previstos no contrato social', 'Conselho e Diretoria'), f: doForm('Órgãos previstos no contrato social', 'Instalação do Conselho') },
      ', cuja composição e eleição competem à Reunião de Sócios, sendo que a representação da sociedade competirá exclusivamente aos Diretores.',
    ],
  },
  {
    tipo: 'paragrafo',
    partes: [
      'Parágrafo Primeiro: Os Membros do Conselho de Administração e da Diretoria serão investidos no cargo mediante ',
      { v: v('Marco de contagem do mandato', 'Assinatura do termo de posse'), f: doForm('Marco de contagem do mandato', 'Instalação do Conselho') },
      ' no livro de atas da administração e com o registro deste termo e da respectiva ata que os elegeram na Junta Comercial, sendo que os seus mandatos se findam ',
      { v: v('Regra de término do mandato', 'Até a investidura dos novos eleitos'), f: doForm('Regra de término do mandato', 'Instalação do Conselho') },
      '.',
    ],
  },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA DÉCIMA QUARTA: Compete ',
      { v: v('Representação isolada ou conjunta', 'Isolada'), f: doForm('Representação isolada ou conjunta', 'Instalação do Conselho') },
      ' aos Diretores em exercício a representação da sociedade, para atos e negócios até o valor de ',
      { v: 'R$ 2.000.000,00', f: doForm('Alçada de Representação Legal', 'Matriz de Alçadas', 'Representação Legal') },
      '; acima deste valor, ou para atos que ',
      { v: 'não expressem valor', f: doForm('Ato sem valor declarado', 'Matriz de Alçadas') },
      ', ',
      { v: 'duas assinaturas: Diretor mais Conselheiro Procurador', f: doForm('Acima disso, autoriza', 'Matriz de Alçadas', 'Representação Legal') },
      '.',
    ],
  },
  { tipo: 'capitulo', partes: ['CAPÍTULO VIII — Da Distribuição de Lucros'] },
  {
    tipo: 'clausula',
    partes: [
      'CLÁUSULA VIGÉSIMA QUARTA: A distribuição dos lucros obedecerá ',
      { v: v('Regra de distribuição de lucros', 'Deliberada em Reunião de Sócios'), f: doForm('Regra de distribuição de lucros', 'AC Reflexo') },
      '. Fica a sociedade autorizada a ',
      { v: v('Distribuição antecipada permitida', 'Sim').toLowerCase().startsWith('s') ? 'distribuir antecipadamente' : 'não distribuir antecipadamente', f: doForm('Distribuição antecipada permitida', 'AC Reflexo') },
      ' lucros com base em balanço intermediário, bem como distribuí-los desproporcionalmente desde que deliberado por ',
      { v: v('Distribuição desproporcional e seu quórum', 'Unanimidade dos presentes'), f: doForm('Distribuição desproporcional e seu quórum', 'AC Reflexo') },
      '.',
    ],
  },
];

/**
 * Bloco 01 · Matriz de Alçadas — montada AO VIVO da grade.
 *
 * É a única que não é texto fixo: as alíneas nascem das células, então trocar uma
 * célula reescreve o documento. A alçada entra dentro da alínea, como no modelo, e
 * o Parágrafo Segundo cita as alíneas por letra, o que muda quando a grade muda.
 */
export function clausulasDaMatriz({
  orgaos,
  grade,
  atoSemValor,
}: {
  /** Nome de cada coluna da grade, na ordem. */
  orgaos: string[];
  /** grade[linha][coluna] = a palavra escolhida na célula. */
  grade: string[][];
  atoSemValor: string;
}): Paragrafo[] {
  const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const daMatriz = (onde: string, campo?: string) => ({
    de: 'formulario' as const,
    onde,
    item: 'Matriz de Alçadas',
    campo,
  });
  const letra = (i: number) => String.fromCharCode(97 + (i % 26));

  // Uma cláusula por órgão QUE TEM cláusula. Antes era só o órgão escolhido num
  // seletor, e isso confundia: mexer na coluna de outro órgão não mudava nada na
  // tela, parecendo que a prévia estava quebrada.
  const comClausula = orgaos
    .map((nome, coluna) => ({ nome, coluna }))
    .filter((o) => ORGAOS_COM_CLAUSULA.includes(o.nome));

  const semClausula = orgaos.filter((n) => !ORGAOS_COM_CLAUSULA.includes(n));

  const clausulas: Paragrafo[] = [];
  comClausula.forEach(({ nome, coluna }) => {
    const linhas = ASSUNTOS_MATRIZ.map((l, i) => ({
      assunto: l.assunto,
      regencia: REGENCIA[grade[i][coluna]] ?? null,
      alcada: l.alcada,
      ehTeto: l.acima === nome,
    })).filter((l) => l.regencia);
    const comAlcada = linhas.map((l, i) => ({ ...l, letra: letra(i) })).filter((l) => l.alcada);

    clausulas.push({
      tipo: 'clausula',
      partes: [
        `Compete ${nome === 'Reunião de Sócios' ? 'à' : 'ao'} `,
        { v: nome, f: { de: 'formulario', onde: 'Órgãos de governança', item: 'item A' } },
        ', além de outras matérias previstas neste contrato social:',
      ],
    });
    linhas.forEach((l, i) => {
      clausulas.push({
        tipo: 'alinea',
        partes: [
          `${letra(i)}) `,
          { v: l.regencia as string, f: daMatriz(`célula do ${nome} nesta linha`, l.assunto) },
          ' ',
          { v: minuscula(l.assunto), f: daMatriz('assunto da linha', l.assunto) },
          ...(l.alcada
            ? [
                l.ehTeto ? ' acima de ' : ' até ',
                { v: l.alcada, f: daMatriz('coluna Alçada', l.assunto) },
              ]
            : []),
          ';',
        ],
      });
    });
    if (comAlcada.length) {
      clausulas.push({
        tipo: 'paragrafo',
        partes: [
          'Parágrafo Segundo: As alçadas previstas nas alíneas ',
          {
            v: comAlcada.map((l) => `“${l.letra}”`).join(', '),
            f: { de: 'derivado', onde: 'letras calculadas das linhas com alçada' },
          },
          ' do caput desta cláusula não vinculam terceiros.',
        ],
      });
    }
  });

  return [
    ...CABECALHO,
    { tipo: 'capitulo', partes: ['CAPÍTULO IV — Da Administração'] },
    ...clausulas,
    {
      tipo: 'clausula',
      partes: [
        'CLÁUSULA DÉCIMA QUARTA: Compete aos Diretores em exercício a representação da sociedade, para atos e negócios até o valor de ',
        { v: 'R$ 2.000.000,00', f: daMatriz('Alçada da linha Representação Legal', 'Representação Legal') },
        ', e os atos cujo objeto seja superior a esse valor ',
        ...(atoSemValor === 'Sobe sempre ao órgão de escalada'
          ? ([
              {
                v: 'ou que não expressem valores',
                f: daMatriz('Ato sem valor declarado = sobe sempre', 'Ato sem valor declarado'),
              },
              ' ',
            ] as Parte[])
          : []),
        'deverão ser previamente autorizados pelo ',
        { v: 'Conselho de Administração', f: daMatriz('coluna Acima disso, autoriza', 'Representação Legal') },
        '.',
      ],
    },
    ...(semClausula.length
      ? ([
          {
            tipo: 'paragrafo',
            partes: [
              `Não geram cláusula: ${semClausula.join(' e ')}. O contrato social não conhece gerente como órgão, cita "os gerentes da sociedade" apenas como objeto. O que a Matriz atribui a eles fica só no documento interno.`,
            ],
          },
        ] as Paragrafo[])
      : []),
  ];
}
