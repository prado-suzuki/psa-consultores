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
  /**
   * Só as falas com arquivo anexado. É uma LEITURA do feed, como as menções, e
   * a tela a oferece em alternância com elas; o banco aceita as duas juntas.
   */
  apenasAnexos: boolean;
  periodo: PeriodoDoFeed;
  /**
   * O que foi digitado na busca. String vazia é ausência de filtro — não `null`,
   * porque este é o único filtro que a pessoa escreve, e o campo controlado
   * precisa de um valor que não seja nulo a cada tecla.
   *
   * A comparação acontece no banco, sobre o texto extraído do documento (ver a
   * migration `20260922133138_feed_org_comments_busca.sql`): o corpo é gravado
   * como JSON do editor, e casar contra ele cru acharia "paragraph" em todo
   * comentário rico do sistema.
   */
  busca: string;
}

export const FILTROS_VAZIOS: FeedFiltros = {
  clienteId: null,
  projetoId: null,
  autorId: null,
  apenasMencoes: false,
  apenasAnexos: false,
  periodo: 'sempre',
  busca: '',
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

/**
 * O termo que vai para o banco: sem os espaços das pontas, e nulo quando não
 * sobrou nada.
 *
 * Espaço solto no campo (o que fica depois de apagar a busca com o cursor no
 * meio) não é busca: sem isto ele viraria um filtro invisível que devolve o
 * feed inteiro, mas mantém a etiqueta ligada na tela.
 */
export function termoDaBusca(filtros: FeedFiltros): string | null {
  return filtros.busca.trim() || null;
}

/**
 * O texto atende ao que foi digitado na busca?
 *
 * Espelho em TypeScript do `org_comment_casa_busca` do banco, com a mesma regra:
 * todos os termos, em qualquer ordem, sem diferenciar maiúscula de minúscula.
 * Quem filtra o feed é o banco — este espelho existe só para o compositor saber
 * se a fala que acabou de ser publicada vai aparecer no recorte da tela (ver
 * `falaCabeNoRecorte`), e por isso recebe o texto já extraído do documento.
 *
 * As duas cópias podem divergir, e o custo disso é um toast dizendo "veja no
 * topo" quando a fala não está lá. Lado errado de errar é o outro: mandar
 * limpar filtro que não atrapalhava.
 */
export function textoCasaBusca(texto: string, busca: string): boolean {
  const termos = busca.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = texto.toLowerCase();
  return termos.every((termo) => alvo.includes(termo));
}

/** Quantos filtros estão ligados — alimenta o contador do botão de filtros. */
export function contarFiltrosAtivos(filtros: FeedFiltros): number {
  return (
    (filtros.clienteId ? 1 : 0) +
    (filtros.projetoId ? 1 : 0) +
    (filtros.autorId ? 1 : 0) +
    (filtros.apenasMencoes ? 1 : 0) +
    (filtros.apenasAnexos ? 1 : 0) +
    (filtros.periodo !== 'sempre' ? 1 : 0) +
    (termoDaBusca(filtros) ? 1 : 0)
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
  anexos: 'anexos',
  periodo: 'periodo',
  busca: 'busca',
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
    apenasAnexos: params.get(PARAM.anexos) === '1',
    periodo: ehPeriodo(periodo) ? periodo : 'sempre',
    busca: params.get(PARAM.busca) ?? '',
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
    [PARAM.anexos]: filtros.apenasAnexos ? '1' : null,
    [PARAM.periodo]: filtros.periodo === 'sempre' ? null : filtros.periodo,
    // O termo vai aparado: o link colado para outra pessoa não deve carregar o
    // espaço que sobrou de uma edição no campo.
    [PARAM.busca]: termoDaBusca(filtros),
  };
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor) proximo.set(chave, valor);
    else proximo.delete(chave);
  }
  return proximo;
}

/**
 * O que o recorte precisa saber de um projeto: de quem ele é.
 *
 * É um subconjunto do que `useOrgProjectsForFilter` devolve: o filtro não
 * conhece o resto da linha de `org_projects`.
 */
export interface ProjetoDoFiltro {
  id: string;
  name: string;
  external_client_id: string | null;
}

/**
 * Os projetos que a lista pode oferecer com o cliente atual.
 *
 * Sem cliente escolhido, oferece todos. Com cliente, só os dele: uma lista de
 * centenas de projetos em que a maioria não tem nenhum comentário possível no
 * recorte não é uma lista, é um labirinto, e escolher projeto de outro cliente
 * combinava dois filtros que se anulam, devolvendo feed vazio sem dizer por quê.
 */
export function projetosDoCliente<T extends { external_client_id: string | null }>(
  projetos: T[],
  clienteId: string | null,
): T[] {
  if (!clienteId) return projetos;
  return projetos.filter((projeto) => projeto.external_client_id === clienteId);
}

/**
 * Troca o cliente do recorte mantendo o resto coerente: o projeto selecionado
 * cai junto quando pertence a outro cliente.
 *
 * Projeto que não está na lista é PRESERVADO de propósito: a lista pode não ter
 * chegado ainda (é uma query) ou o projeto pode estar fora do ambiente. Derrubar
 * o filtro por causa de uma lista vazia apagaria o recorte de um link colado
 * antes de a página carregar.
 */
export function aoTrocarDeCliente(
  filtros: FeedFiltros,
  clienteId: string | null,
  projetos: ProjetoDoFiltro[],
): FeedFiltros {
  if (!clienteId || !filtros.projetoId) return { ...filtros, clienteId };

  const projeto = projetos.find((candidato) => candidato.id === filtros.projetoId);
  const deOutroCliente = projeto !== undefined && projeto.external_client_id !== clienteId;
  return { ...filtros, clienteId, projetoId: deOutroCliente ? null : filtros.projetoId };
}
