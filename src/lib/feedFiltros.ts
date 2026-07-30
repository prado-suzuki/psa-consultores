/**
 * Regras puras dos filtros do feed: forma do recorte, presets de período e a
 * tradução de ida e volta para a URL.
 *
 * O feed pagina por cursor, então o filtro em si não mora aqui nem no
 * componente: ele é aplicado dentro da função `feed_org_comments` (migration
 * `20260730151500_feed_org_comments_filtros.sql`). O que este arquivo resolve é
 * o que dá para travar com teste sem subir React nem banco — qual é o recorte,
 * quantos filtros estão ligados, onde começa o período e como isso vira (e volta
 * de) query string.
 */

/** Presets de período. O feed sempre termina no agora, então só há piso. */
export type PeriodoDoFeed = 'sempre' | 'hoje' | '7d' | '30d';

export const PERIODOS_DO_FEED: { valor: PeriodoDoFeed; rotulo: string }[] = [
  { valor: 'sempre', rotulo: 'Qualquer data' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
];

/**
 * O recorte do feed. Nulo em cada campo é ausência de filtro, não "nenhum" —
 * a distinção é o que a função SQL usa para diferenciar "passa tudo" de "passa
 * zero".
 */
export interface FeedFiltros {
  clienteId: string | null;
  projetoId: string | null;
  /** Quem escreveu. Não é "quem está na conversa" — ver `apenasMencoes`. */
  autorId: string | null;
  apenasMencoes: boolean;
  periodo: PeriodoDoFeed;
}

export const FILTROS_VAZIOS: FeedFiltros = {
  clienteId: null,
  projetoId: null,
  autorId: null,
  apenasMencoes: false,
  periodo: 'sempre',
};

/** Quantos dias cada preset abrange, contando hoje como o primeiro. */
const DIAS_DO_PERIODO: Record<Exclude<PeriodoDoFeed, 'sempre'>, number> = {
  hoje: 1,
  '7d': 7,
  '30d': 30,
};

/**
 * Onde o período começa, como ISO — o `_since` da função do banco.
 *
 * Ancorado na MEIA-NOITE LOCAL, não em "agora menos N × 24h", por dois motivos:
 * o feed é lido em blocos de dia (o rótulo `Hoje` no topo), então cortar no meio
 * de um dia deixaria o bloco pela metade; e um piso ancorado no dia é estável
 * durante o dia inteiro, o que faz todas as páginas da mesma rolagem
 * compartilharem o mesmo corte em vez de ele escorregar a cada requisição.
 *
 * "Últimos 7 dias" inclui hoje e os seis anteriores — é como se lê a frase, e
 * casa com o que a tela mostra.
 */
export function desdeDoPeriodo(periodo: PeriodoDoFeed, agora: Date = new Date()): string | null {
  if (periodo === 'sempre') return null;
  const inicio = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() - (DIAS_DO_PERIODO[periodo] - 1),
  );
  return inicio.toISOString();
}

/** Quantos filtros estão ligados — alimenta o contador do botão de filtros. */
export function contarFiltrosAtivos(filtros: FeedFiltros): number {
  return (
    (filtros.clienteId ? 1 : 0) +
    (filtros.projetoId ? 1 : 0) +
    (filtros.autorId ? 1 : 0) +
    (filtros.apenasMencoes ? 1 : 0) +
    (filtros.periodo !== 'sempre' ? 1 : 0)
  );
}

export function temFiltroAtivo(filtros: FeedFiltros): boolean {
  return contarFiltrosAtivos(filtros) > 0;
}

/**
 * Nomes dos parâmetros na URL. Em português, como o resto da navegação da casa,
 * e curtos porque aparecem no link que se cola no chat.
 */
const PARAM = {
  cliente: 'cliente',
  projeto: 'projeto',
  autor: 'autor',
  mencoes: 'mencoes',
  periodo: 'periodo',
} as const;

function ehPeriodo(valor: string | null): valor is PeriodoDoFeed {
  return PERIODOS_DO_FEED.some((periodo) => periodo.valor === valor);
}

/**
 * O recorte que a URL está pedindo.
 *
 * A URL é a fonte da verdade do filtro — é ela que sobrevive ao F5 e ao link
 * colado para outra pessoa. Valor desconhecido em `periodo` cai no padrão em vez
 * de virar erro: query string é entrada de fora, e um link velho não deve
 * quebrar a tela.
 */
export function filtrosDaUrl(params: URLSearchParams): FeedFiltros {
  const periodo = params.get(PARAM.periodo);
  return {
    clienteId: params.get(PARAM.cliente) || null,
    projetoId: params.get(PARAM.projeto) || null,
    autorId: params.get(PARAM.autor) || null,
    apenasMencoes: params.get(PARAM.mencoes) === '1',
    periodo: ehPeriodo(periodo) ? periodo : 'sempre',
  };
}

/**
 * Escreve o recorte na URL, preservando os outros parâmetros que já estavam lá
 * (o `?taskId=` do deep-link de tarefa, por exemplo).
 *
 * Filtro desligado sai da URL em vez de virar `cliente=`: assim "sem filtro" tem
 * uma representação só, e a URL do feed limpo é o caminho puro.
 */
export function aplicarFiltrosNaUrl(
  params: URLSearchParams,
  filtros: FeedFiltros,
): URLSearchParams {
  const proximo = new URLSearchParams(params);
  const valores: Record<string, string | null> = {
    [PARAM.cliente]: filtros.clienteId,
    [PARAM.projeto]: filtros.projetoId,
    [PARAM.autor]: filtros.autorId,
    [PARAM.mencoes]: filtros.apenasMencoes ? '1' : null,
    [PARAM.periodo]: filtros.periodo === 'sempre' ? null : filtros.periodo,
  };
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor) proximo.set(chave, valor);
    else proximo.delete(chave);
  }
  return proximo;
}
