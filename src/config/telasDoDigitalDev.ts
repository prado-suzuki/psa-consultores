import type { ReactNode } from 'react';

/**
 * O nome e a explicação de cada tela do Digital Dev, num registro só.
 *
 * O ESPELHO AQUI NÃO É ENTRE ÁREAS, é entre SUPERFÍCIES: o mesmo nome aparece no
 * rótulo do menu, no card do catálogo e no H1 da página. Eram três fontes — o
 * `DEV_NAV_LABELS` cobria as duas primeiras e cada página escrevia a terceira à
 * mão —, e por isso o catálogo dizia "EFD ICMS/IPI" enquanto a página dizia
 * "Consulta EFD ICMS", e "Apuração Tributária" levava a "Apuração PIS/COFINS".
 *
 * Com o registro, o nome é UM. Mexer aqui mexe nas três superfícies de uma vez, e
 * é isso que torna cumprível a regra que a revisão de conteúdo fixou: *o nome que
 * o usuário clica é o nome que ele encontra na página seguinte*.
 *
 * `satisfies` preserva os nomes das chaves, então tela inexistente vira erro de
 * compilação em vez de cabeçalho vazio em produção — mesma garantia do
 * `textosDasTelas.ts`, que faz este papel para a Tax e a OSG.
 */

export interface TextoDeTelaDev {
  /** O nome da tela. Vale para o menu, para o card do catálogo e para o H1. */
  titulo: string;
  /** A linha de apoio da PÁGINA. O card do catálogo pode ter a sua, mais curta. */
  subtitulo?: string;
}

export const TELAS_DO_DEV = {
  // ── Entrada da área ────────────────────────────────────────
  inicio: {
    titulo: 'Ferramentas Tax Work',
    subtitulo: 'Acesse as ferramentas da área e seus respectivos manuais de operação.',
  },
  novaFerramenta: { titulo: 'Solicitar ferramenta' },
  consultaXmls: {
    titulo: 'Consulta de XMLs',
    subtitulo: 'Consulte e baixe XMLs de NFe e CT-e por cliente e período.',
  },

  // ── Central: Consulta SPED ─────────────────────────────────
  consultaSped: {
    titulo: 'Consulta de arquivos SPED',
    subtitulo: 'Acesse EFD Contribuições, EFD ICMS/IPI, ECD e ECF para consulta, análise e download.',
  },
  efdContribuicoes: {
    titulo: 'EFD Contribuições',
    subtitulo: 'Consulte, analise e baixe arquivos da EFD Contribuições.',
  },
  // "EFD ICMS/IPI", e não "EFD ICMS": o IPI se perdia no caminho entre o card e
  // a página, e o usuário clicava num nome e chegava noutro.
  efdIcms: {
    titulo: 'EFD ICMS/IPI',
    subtitulo: 'Consulte, analise e baixe arquivos da EFD ICMS/IPI.',
  },
  ecd: {
    titulo: 'ECD',
    subtitulo: 'Consulte, analise e baixe arquivos da Escrituração Contábil Digital (ECD).',
  },
  ecf: {
    titulo: 'ECF',
    subtitulo: 'Consulte, analise e baixe arquivos da Escrituração Contábil Fiscal (ECF).',
  },

  // ── Central: Levantamento PIS/COFINS ───────────────────────
  // A sigla expandida saiu do título — ela ocupava três linhas no cabeçalho sem
  // ganho de clareza para um público fiscal. A explicação mora no subtítulo.
  levantamentoPisCofins: {
    titulo: 'Levantamento PIS/COFINS',
    subtitulo:
      'Acesse ferramentas para parametrização de regras, apuração, análise cruzada e correções da EFD Contribuições.',
  },
  mapaNCMs: {
    titulo: 'Mapa NCM',
    subtitulo: 'Consulte e mantenha regras fiscais de PIS/COFINS por NCM e segmento.',
  },
  apuracaoPisCofins: {
    titulo: 'Apuração PIS/COFINS',
    subtitulo: 'Apure débitos, créditos e saldos de PIS/COFINS por cliente e período.',
  },
  analiseCruzada: {
    titulo: 'Análise Cruzada',
    subtitulo: 'Cruze balancete, EFD Contribuições, EFD ICMS e XMLs para identificar divergências.',
  },
  // O card dizia "Revisão de Registros da EFD Contribuições" e a página dizia
  // "Correções no SPED" — dois nomes para a mesma tela, e o segundo dava a
  // entender que a ferramenta alcança as outras escriturações. Não alcança.
  correcoesEfdContribuicoes: {
    titulo: 'Correções na EFD Contribuições',
    subtitulo:
      'Revise divergências entre a EFD Contribuições e os XMLs e prepare as correções necessárias.',
  },

  // ── Central: Análise de ICMS ───────────────────────────────
  analiseIcms: {
    titulo: 'Análise de ICMS',
    subtitulo: 'Acesse as análises de ICMS das saídas e DIFAL.',
  },
  icmsSaidas: {
    titulo: 'ICMS das Saídas',
    subtitulo: 'Analise saídas, reconcilie dados e revise a classificação fiscal.',
  },
  difalInteligente: {
    titulo: 'DIFAL Inteligente',
    subtitulo: 'Audite e classifique produtos para análise de DIFAL.',
  },

  // ── Central: PERDCOMP ──────────────────────────────────────
  perdcomp: {
    titulo: 'PERDCOMP',
    subtitulo: 'Acesse o acompanhamento analítico e o controle operacional de PERDCOMP.',
  },
  dashboardPerdcomp: {
    titulo: 'Dashboard PERDCOMP',
    subtitulo: 'Acompanhe os principais indicadores de PERDCOMP no painel analítico.',
  },
  controlePerdcomp: {
    titulo: 'Controle PERDCOMP',
    subtitulo: 'Gerencie processos de PER e DCOMP, status, vínculos e pagamentos.',
  },

  // ── Avulsas ────────────────────────────────────────────────
  calculadoraIbsCbs: {
    titulo: 'Calculadora IBS/CBS',
    subtitulo: 'Compare a carga tributária antes e depois da reforma a partir da classificação fiscal.',
  },
  controleBalancetes: {
    titulo: 'Controle de Balancetes',
    subtitulo: 'Envie, consulte e acompanhe balancetes contábeis.',
  },
  procedimentos: { titulo: 'Procedimentos' },
  gerenciarDados: { titulo: 'Gerenciar dados' },
  carregarDados: { titulo: 'Carregar dados' },
  dashboardsGerenciarDados: { titulo: 'Dashboards' },

  // ── Central: Planejamento Tributário ───────────────────────
  planejamentoTributario: { titulo: 'Planejamento Tributário' },
  papelDeTrabalho: { titulo: 'Papel de Trabalho' },
  geradorDeSlides: { titulo: 'Gerador de Slides' },
} as const satisfies Record<string, TextoDeTelaDev>;

/** As chaves como tipo: tela inexistente vira erro de compilação. */
export type TelaDoDev = keyof typeof TELAS_DO_DEV;

/**
 * As duas formas de o `DevLayout` receber cabeçalho, e só uma por vez.
 *
 * Os `never` impedem o meio-termo: passar `tela` e `title` juntos não compila,
 * então ninguém escreve um título à mão "só nesta" e sai do registro em silêncio.
 * `title`/`subtitle` seguem existindo para as telas que não têm nome fixo — o
 * detalhe da ferramenta, que exibe o nome vindo do banco.
 */
export type CabecalhoDoDev =
  | { tela: TelaDoDev; title?: never; subtitle?: never }
  | { tela?: never; title: string; subtitle?: ReactNode };

/** O cabeçalho que o layout vai exibir, venha ele do registro ou escrito à mão. */
export function resolverCabecalhoDoDev(
  texto: CabecalhoDoDev,
): { title: string; subtitle?: ReactNode } {
  if (texto.tela) {
    // O tipo largo é necessário: com `as const`, cada entrada vira um literal
    // próprio, e as que não têm `subtitulo` deixam a união sem a propriedade.
    const { titulo, subtitulo }: TextoDeTelaDev = TELAS_DO_DEV[texto.tela];
    return { title: titulo, subtitle: subtitulo };
  }
  return { title: texto.title, subtitle: texto.subtitle };
}
