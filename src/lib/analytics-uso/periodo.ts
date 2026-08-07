/**
 * Recorte de periodo no modo fixture.
 *
 * O payload vem pre-agregado do BigQuery, entao a unica dimensao temporal que
 * existe no cliente e a serie `porMes`. Dela da para RE-DERIVAR com exatidao os
 * blocos que sao soma de meses (totais, evolucao). Os blocos que nao tem quebra
 * mensal — por endpoint, por pessoa, por pasta — NAO podem ser recortados aqui:
 * o payload nao carrega o dado necessario.
 *
 * Por isso `recortar` devolve `parcial: true` quando o periodo escolhido nao e o
 * inteiro. A tela usa esse sinalizador para dizer, na propria pagina, quais
 * blocos seguem no periodo completo. Preferi expor a limitacao a devolver
 * numero errado em silencio.
 *
 * Com a API de produção, este módulo continua convertendo a seleção em
 * `inicio`/`fim`, mas o recorte e as agregações passam a vir prontos da fonte.
 */

export interface OpcaoPeriodo {
  id: string;
  rotulo: string;
  /** Quantos meses civis incluir, contando o mês atual. 0 = tudo. */
  meses: number;
}

export const OPCOES_PERIODO: OpcaoPeriodo[] = [
  { id: 'tudo', rotulo: 'Todo o período', meses: 0 },
  { id: '6m', rotulo: 'Últimos 6 meses', meses: 6 },
  { id: '3m', rotulo: 'Últimos 3 meses', meses: 3 },
  { id: '1m', rotulo: 'Último mês', meses: 1 },
];

export const DATA_INICIO_ANALYTICS_USO = '2026-01-01';
export const TIMEZONE_ANALYTICS_USO = 'America/Cuiaba';

export interface IntervaloPeriodo {
  inicio: string;
  fim: string;
  mesesRecorte: number;
}

/** Data civil do dashboard, sem a virada antecipada causada por `toISOString()` em UTC. */
export function hojeAnalyticsUso(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_ANALYTICS_USO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const obter = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

/**
 * Converte a escolha visual em um intervalo real para a API.
 * As opções mensais incluem o mês corrente: "3 meses" começa no primeiro dia
 * do mês de dois meses atrás e termina hoje.
 */
export function resolverIntervaloPeriodo(
  periodoId: string,
  hoje = hojeAnalyticsUso(),
): IntervaloPeriodo {
  const opcao = OPCOES_PERIODO.find((item) => item.id === periodoId) ?? OPCOES_PERIODO[0];
  if (opcao.meses <= 0) {
    return { inicio: DATA_INICIO_ANALYTICS_USO, fim: hoje, mesesRecorte: 0 };
  }

  const [ano, mes] = hoje.split('-').map(Number);
  const indiceMes = ano * 12 + (mes - 1) - (opcao.meses - 1);
  const anoInicio = Math.floor(indiceMes / 12);
  const mesInicio = (indiceMes % 12) + 1;
  return {
    inicio: `${anoInicio}-${String(mesInicio).padStart(2, '0')}-01`,
    fim: hoje,
    mesesRecorte: opcao.meses,
  };
}

export interface Recorte<T> {
  serie: T[];
  parcial: boolean;
  rotulo: string;
}

/** Corta a serie mensal nos ultimos N meses presentes no payload. */
export function recortarSerie<T extends { mes: string }>(serie: T[], meses: number): Recorte<T> {
  if (meses <= 0 || serie.length <= meses) {
    return { serie, parcial: false, rotulo: 'Todo o período' };
  }
  const cortada = serie.slice(-meses);
  return {
    serie: cortada,
    parcial: true,
    rotulo: `${cortada[0].mes} a ${cortada[cortada.length - 1].mes}`,
  };
}

/**
 * Soma simples de um campo da serie recortada. Vale para contagem; NAO vale
 * para percentil — media de p95 nao e o p95 do conjunto, entao latencia
 * recortada precisa vir do backend, nao daqui.
 */
export function somar<T>(serie: T[], campo: (item: T) => number): number {
  return serie.reduce((acc, item) => acc + campo(item), 0);
}

/** Maior valor da serie. Usado para p95 no recorte: e o pior mes, e diz isso. */
export function maximo<T>(serie: T[], campo: (item: T) => number): number {
  return serie.reduce((acc, item) => Math.max(acc, campo(item)), 0);
}

export interface ComparacaoPeriodo {
  atual: number;
  anterior: number | null;
  pct: number | null;
  rotulo: string;
}

/**
 * Compara o periodo SELECIONADO com o periodo imediatamente anterior de mesmo
 * tamanho. Quem dita o recorte e o filtro, nao uma janela fixa.
 *
 * `meses = 0` (todo o periodo) nao tem anterior com que comparar, entao devolve
 * `pct: null` — preferivel a inventar uma base.
 */
export function compararPeriodo<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  meses: number,
): ComparacaoPeriodo {
  const somaDe = (itens: T[]) => itens.reduce((acc, i) => acc + valor(i), 0);

  if (meses <= 0 || serie.length <= meses) {
    return { atual: somaDe(serie), anterior: null, pct: null, rotulo: 'todo o período' };
  }

  const atualItens = serie.slice(-meses);
  const anteriorItens = serie.slice(Math.max(0, serie.length - meses * 2), serie.length - meses);
  const atual = somaDe(atualItens);
  // Comparar seis meses com apenas dois meses anteriores produz uma variação
  // com bases diferentes. Sem uma janela anterior completa, não há comparação.
  const anterior = anteriorItens.length === meses ? somaDe(anteriorItens) : null;

  return {
    atual,
    anterior,
    pct: anterior && anterior > 0 ? (atual - anterior) / anterior : null,
    rotulo: meses === 1 ? 'vs. mês anterior' : `vs. ${meses} meses anteriores`,
  };
}
