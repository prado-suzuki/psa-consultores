import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { AREA_ROUTES } from '@/config/areaCategories';
import { parseDate } from '@/lib/dateUtils';

/**
 * Regras puras do feed de comentários: cursor de paginação, agrupamento por dia,
 * texto de origem e destino do link.
 *
 * Tudo aqui é função pura de propósito — é a parte do feed que dá para travar
 * com teste sem subir React nem banco.
 */

/**
 * O feed só existe nas áreas que têm projetos e tarefas. Estreitar o tipo aqui
 * evita montar um link para `/equipe/digital/projetos/...`, que não existe.
 */
export type AreaDeProjetos = 'tax' | 'osg';

/** Cursor de paginação por chave: o par (created_at, id) do último item lido. */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface GrupoDeDia<T> {
  /** Chave estável do dia, `YYYY-MM-DD` no fuso local. */
  dia: string;
  /** `Hoje`, `Ontem` ou a data escrita. */
  rotulo: string;
  itens: T[];
}

interface ItemDoFeed {
  id: string;
  created_at: string;
  parent_id?: string | null;
  entity_type?: string;
  entity_id?: string;
  entity_title?: string | null;
  project_name?: string | null;
  author_id?: string | null;
  author_name?: string | null;
}

export function cursorDoComentario(comentario: Pick<ItemDoFeed, 'id' | 'created_at'>): FeedCursor {
  return { createdAt: comentario.created_at, id: comentario.id };
}

/**
 * Dia do comentário no fuso local, como `YYYY-MM-DD`.
 *
 * Monta a chave a partir das partes locais da data em vez de recortar o ISO:
 * o ISO vem em UTC e, à noite, o recorte cairia no dia seguinte.
 */
export function chaveDoDia(createdAt: string): string {
  return chaveDaData(new Date(createdAt));
}

function chaveDaData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function rotuloDoDia(dia: string, hoje: Date = new Date()): string {
  if (dia === chaveDaData(hoje)) return 'Hoje';

  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  if (dia === chaveDaData(ontem)) return 'Ontem';

  return format(parseDate(dia), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Agrupa a lista já ordenada (mais novo primeiro) em blocos de dia, preservando
 * a ordem de entrada.
 *
 * Roda sobre a lista achatada de todas as páginas carregadas, e não por página:
 * assim um dia que atravessa a fronteira da paginação vira um grupo só.
 */
export function agruparPorDia<T extends Pick<ItemDoFeed, 'created_at'>>(
  itens: T[],
  hoje: Date = new Date(),
): GrupoDeDia<T>[] {
  const grupos: GrupoDeDia<T>[] = [];
  for (const item of itens) {
    const dia = chaveDoDia(item.created_at);
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) {
      ultimo.itens.push(item);
      continue;
    }
    grupos.push({ dia, rotulo: rotuloDoDia(dia, hoje), itens: [item] });
  }
  return grupos;
}

/** Um trecho de conversa: comentários seguidos que vieram da mesma origem. */
export interface GrupoDeOrigem<T> {
  /** Chave estável da origem — `tipo:id` da entidade comentada. */
  chave: string;
  itens: T[];
}

/** Identidade da entidade comentada, usada para juntar o que veio do mesmo lugar. */
export function chaveDeOrigem(item: Pick<ItemDoFeed, 'entity_type' | 'entity_id'>): string {
  return `${item.entity_type ?? '?'}:${item.entity_id ?? '?'}`;
}

/**
 * Junta comentários **seguidos** da mesma tarefa/projeto num bloco só.
 *
 * É o que transforma a pilha de cards em feed: em vez de repetir a linha de
 * origem em cada comentário, o bloco a mostra uma vez no topo e pendura a
 * conversa embaixo. Só junta itens contíguos — a ordem cronológica do feed nunca
 * é reembaralhada, então a mesma tarefa pode aparecer em mais de um bloco no dia
 * se outra conversa aconteceu no meio.
 */
export function agruparPorOrigem<
  T extends Pick<ItemDoFeed, 'entity_type' | 'entity_id'>,
>(itens: T[]): GrupoDeOrigem<T>[] {
  const grupos: GrupoDeOrigem<T>[] = [];
  for (const item of itens) {
    const chave = chaveDeOrigem(item);
    const ultimo = grupos.at(-1);
    if (ultimo?.chave === chave) {
      ultimo.itens.push(item);
      continue;
    }
    grupos.push({ chave, itens: [item] });
  }
  return grupos;
}

/** Janela em que duas falas da mesma pessoa contam como um bloco só. */
const JANELA_DE_BLOCO_MS = 10 * 60 * 1000;

/**
 * Se o item continua o bloco do vizinho — mesma pessoa, mesma thread e pouco
 * tempo entre um e outro.
 *
 * Serve só à apresentação: quando é continuação, o item repete nem avatar nem
 * nome, como numa conversa. Autor anônimo (`author_id` nulo) nunca agrupa, senão
 * dois "Usuário removido" diferentes viriam como se fossem a mesma pessoa.
 */
export function mesmoBlocoDeAutor(
  atual: Pick<ItemDoFeed, 'author_id' | 'parent_id' | 'created_at'>,
  vizinho: Pick<ItemDoFeed, 'author_id' | 'parent_id' | 'created_at'> | undefined,
): boolean {
  if (!vizinho) return false;
  if (!atual.author_id || atual.author_id !== vizinho.author_id) return false;
  if ((atual.parent_id ?? null) !== (vizinho.parent_id ?? null)) return false;

  const distancia = Math.abs(
    new Date(atual.created_at).getTime() - new Date(vizinho.created_at).getTime(),
  );
  return distancia <= JANELA_DE_BLOCO_MS;
}

/** Uma conversa dentro do bloco de origem: a raiz e as respostas dela. */
export interface ThreadDoFeed<T> {
  /** Id da raiz — a chave da thread, mesmo quando a raiz não veio nesta leva. */
  raizId: string;
  /**
   * A raiz, quando ela está na leva carregada. Vem `null` na resposta cuja raiz
   * ficou fora do recorte do feed (outra página, ou fora da RLS) — aí as
   * respostas se apresentam soltas, sem fingir uma thread que não se pode montar.
   */
  raiz: T | null;
  /** Respostas do mais antigo ao mais novo, como se lê uma conversa. */
  respostas: T[];
  /** A raiz continua o bloco de autor da thread anterior (sem avatar nem nome). */
  continuaBloco: boolean;
}

/**
 * Monta as conversas de um bloco de origem: raiz seguida das respostas dela.
 *
 * É o que permite desenhar a resposta como o painel da tarefa desenha — fio
 * contínuo saindo da raiz e cotovelo entrando no avatar da resposta — em vez de
 * uma fila de comentários irmãos com etiqueta "resposta".
 *
 * A leitura dentro do bloco é do mais antigo para o mais novo, igual à thread da
 * tarefa: o fio só faz sentido descendo da raiz para as respostas. A recência do
 * feed continua expressa fora daqui, na ordem dos dias e dos blocos.
 *
 * A thread tem um nível só (o trigger `org_comments_validate_parent` garante),
 * então não há recursão: `respostas` é lista, não árvore.
 */
export function montarThreads<
  T extends Pick<ItemDoFeed, 'id' | 'parent_id' | 'created_at' | 'author_id'>,
>(itens: T[]): ThreadDoFeed<T>[] {
  const porRaiz = new Map<string, ThreadDoFeed<T>>();
  for (const item of itens) {
    const raizId = item.parent_id ?? item.id;
    const thread =
      porRaiz.get(raizId) ??
      ({ raizId, raiz: null, respostas: [], continuaBloco: false } satisfies ThreadDoFeed<T>);
    if (item.parent_id) thread.respostas.push(item);
    else thread.raiz = item;
    porRaiz.set(raizId, thread);
  }

  const threads = [...porRaiz.values()];
  for (const thread of threads) thread.respostas.sort(ordemCronologica);
  threads.sort((a, b) => ordemCronologica(inicioDaThread(a), inicioDaThread(b)));

  for (const [indice, thread] of threads.entries()) {
    const anterior = threads[indice - 1];
    /**
     * Continuação some com o avatar, e o avatar é de onde o fio da thread desce —
     * então quem abre respostas nunca é continuação, nem quem vem depois de uma
     * thread que abriu.
     */
    thread.continuaBloco = Boolean(
      anterior &&
        anterior.respostas.length === 0 &&
        anterior.raiz &&
        thread.raiz &&
        thread.respostas.length === 0 &&
        mesmoBlocoDeAutor(thread.raiz, anterior.raiz),
    );
  }
  return threads;
}

/** Onde a conversa começa: a raiz, ou a resposta mais antiga se ela não veio. */
function inicioDaThread<T extends Pick<ItemDoFeed, 'id' | 'created_at'>>(
  thread: ThreadDoFeed<T>,
): Pick<ItemDoFeed, 'id' | 'created_at'> {
  return thread.raiz ?? thread.respostas[0];
}

/** Mais antigo primeiro; o id desempata para a ordem não oscilar entre renders. */
function ordemCronologica(
  a: Pick<ItemDoFeed, 'id' | 'created_at'>,
  b: Pick<ItemDoFeed, 'id' | 'created_at'>,
): number {
  const diferenca = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  return diferenca !== 0 ? diferenca : a.id.localeCompare(b.id);
}

export interface AutorDoFeed {
  id: string | null;
  nome: string;
}

/**
 * Quem falou no bloco, sem repetir, na ordem em que aparece.
 *
 * Alimenta a pilha de avatares do cabeçalho de origem — o "quem está nessa
 * conversa" que se lê antes de abrir.
 */
export function autoresDoGrupo(
  itens: Pick<ItemDoFeed, 'author_id' | 'author_name'>[],
): AutorDoFeed[] {
  const autores: AutorDoFeed[] = [];
  const vistos = new Set<string>();
  for (const item of itens) {
    const nome = item.author_name || 'Usuário removido';
    const chave = item.author_id ?? `nome:${nome}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    autores.push({ id: item.author_id ?? null, nome });
  }
  return autores;
}

/**
 * Para onde o item leva: a tarefa ou o projeto de onde o comentário saiu.
 *
 * Os dois destinos são deep-links do `PainelTarefas`, que ignora filtros e
 * escopo de cluster quando há id na URL — então um item de outra área abre
 * normalmente pela moldura atual, com a RLS como único limite.
 */
export function hrefDeOrigem(
  item: Pick<ItemDoFeed, 'entity_type' | 'entity_id'>,
  area: AreaDeProjetos,
): string {
  const base = AREA_ROUTES[area];
  return item.entity_type === 'org_project'
    ? `${base}/projetos/cadastro?projetoId=${item.entity_id}`
    : `${base}/projetos/tarefas?taskId=${item.entity_id}`;
}

export interface OrigemDoComentario {
  /** Preposição + tipo, ex.: `na tarefa`. */
  rotulo: string;
  titulo: string;
  /** Nome do projeto, quando ele não é o próprio título. */
  projeto: string | null;
  /**
   * Cliente da conversa. Nulo quando o projeto não tem cliente vinculado, quando
   * a RLS do `cliente` não deixa o leitor ver o cadastro, ou quando o nome já
   * aparece no texto ao lado — nos três casos o cliente simplesmente não
   * aparece, em vez de virar um "Cliente não informado" ocupando espaço em cada
   * bloco do feed.
   */
  cliente: string | null;
}

/**
 * O texto de origem do bloco.
 *
 * O nome do cliente entra por fora (`cliente`), e não pela linha do comentário:
 * quem o resolve é `useDomainFeedClientes`, a partir do projeto do comentário.
 */
export function origemDoComentario(
  item: Pick<ItemDoFeed, 'entity_type' | 'entity_title' | 'project_name'>,
  cliente?: string | null,
): OrigemDoComentario {
  if (item.entity_type === 'org_project') {
    const titulo = item.entity_title || item.project_name || 'Projeto sem nome';
    return {
      rotulo: 'no projeto',
      titulo,
      projeto: null,
      cliente: clienteQueAcrescenta(cliente, titulo),
    };
  }

  const projeto = item.project_name || null;
  return {
    rotulo: 'na tarefa',
    titulo: item.entity_title || 'Tarefa sem título',
    projeto,
    cliente: clienteQueAcrescenta(cliente, projeto),
  };
}

/**
 * O cliente só entra quando diz algo novo.
 *
 * Nome de projeto costuma carregar o cliente dentro ("Recuperação Tributária —
 * Frigorífico Vale"); repeti-lo ao lado seria dobrar a mesma informação em toda
 * linha do feed. Então, se o texto que já vai aparecer contém o nome do cliente,
 * o cliente é omitido.
 */
function clienteQueAcrescenta(
  cliente: string | null | undefined,
  textoVizinho: string | null,
): string | null {
  if (!cliente) return null;
  if (textoVizinho && semAcentoMinusculo(textoVizinho).includes(semAcentoMinusculo(cliente))) {
    return null;
  }
  return cliente;
}

function semAcentoMinusculo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Onde a resposta se pendura.
 *
 * A thread tem um nível só — o trigger `org_comments_validate_parent` rejeita
 * resposta de resposta. Então responder a uma resposta pendura na mesma raiz
 * dela, não nela.
 */
export function parentIdParaResposta(item: Pick<ItemDoFeed, 'id' | 'parent_id'>): string {
  return item.parent_id ?? item.id;
}
