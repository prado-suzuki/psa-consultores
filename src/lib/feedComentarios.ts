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
}

export function origemDoComentario(
  item: Pick<ItemDoFeed, 'entity_type' | 'entity_title' | 'project_name'>,
): OrigemDoComentario {
  if (item.entity_type === 'org_project') {
    return {
      rotulo: 'no projeto',
      titulo: item.entity_title || item.project_name || 'Projeto sem nome',
      projeto: null,
    };
  }
  return {
    rotulo: 'na tarefa',
    titulo: item.entity_title || 'Tarefa sem título',
    projeto: item.project_name || null,
  };
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
