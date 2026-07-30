import type { OrgCommentEntityType } from '@/hooks/useDomainOrgComments';
import { textoPlanoDoCorpo } from '@/lib/orgCommentRichText';

/**
 * Regras puras da caixa de menções: o que virou notificação e o que ela diz.
 *
 * Não existe tabela genérica de notificação no projeto — `org_comment_mentions`
 * **é** a caixa de entrada, e "não lida" é `lido_em IS NULL` (§3.4 do plano
 * `docs/planos/plano-comentarios-mencoes-feed.md`). A junção com o comentário
 * citado mora aqui, sem React nem Supabase, porque é onde estão as decisões:
 * auto-menção não notifica e menção sem comentário ao alcance não aparece.
 */

/** Linha de `org_comment_mentions` na fatia que a caixa de entrada usa. */
export interface MencaoNaoLida {
  id: string;
  comment_id: string;
  created_at: string;
}

/** O comentário citado, na fatia que o item da notificação precisa. */
export interface ComentarioCitado {
  id: string;
  entity_type: OrgCommentEntityType;
  entity_id: string;
  entity_title: string | null;
  project_name: string | null;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface MencaoNotificacao {
  /**
   * Id da **menção**, não do comentário: é a linha que se carimba como lida.
   * O comentário vem em `commentId`.
   */
  id: string;
  commentId: string;
  /** Campos de origem em snake_case para reusar `hrefDeOrigem`/`origemDoComentario`. */
  entity_type: OrgCommentEntityType;
  entity_id: string;
  entity_title: string | null;
  project_name: string | null;
  /** Quem escreveu o comentário que menciona o usuário. */
  authorName: string;
  /** Recorte legível do corpo — o corpo é documento rico, não texto. */
  trecho: string;
  /** Data do comentário (é o que a pessoa reconhece, não a da linha de menção). */
  created_at: string;
}

const TRECHO_MAX = 120;

/**
 * Recorte de uma linha do corpo do comentário.
 *
 * Passa pelo texto plano porque o corpo pode ser documento TipTap serializado —
 * mostrar o JSON na notificação não diria nada a quem foi mencionado.
 */
export function trechoDoComentario(body: string, max = TRECHO_MAX): string {
  const limpo = textoPlanoDoCorpo(body).trim().replace(/\s+/g, ' ');
  return limpo.length <= max ? limpo : `${limpo.slice(0, max)}…`;
}

/**
 * Junta menções não lidas com os comentários que as originaram, preservando a
 * ordem recebida (mais recente primeiro).
 *
 * Duas menções somem no caminho, e nos dois casos em silêncio:
 *
 * - **auto-menção** — a RPC `criar_org_comment` grava qualquer id que venha no
 *   `_mentions`, inclusive o do próprio autor. Notificar alguém do que ele
 *   acabou de escrever só emperraria o sino;
 * - **comentário fora de alcance** — a RLS de `org_comment_mentions` libera o
 *   mencionado a ver a linha da menção, mas a de `org_comments` não tem o
 *   caminho "fui mencionado". Se a pessoa perdeu o acesso ao projeto (ou o
 *   comentário foi excluído, filtrado na leitura), o comentário não vem — e uma
 *   notificação sem conteúdo é pior que notificação nenhuma.
 */
export function montarNotificacoesDeMencao(
  mencoes: MencaoNaoLida[],
  comentariosPorId: Map<string, ComentarioCitado>,
  usuarioId: string,
): MencaoNotificacao[] {
  const notificacoes: MencaoNotificacao[] = [];

  for (const mencao of mencoes) {
    const comentario = comentariosPorId.get(mencao.comment_id);
    if (!comentario) continue;
    if (comentario.author_id === usuarioId) continue;

    notificacoes.push({
      id: mencao.id,
      commentId: comentario.id,
      entity_type: comentario.entity_type,
      entity_id: comentario.entity_id,
      entity_title: comentario.entity_title,
      project_name: comentario.project_name,
      authorName: comentario.author_name || 'Usuário removido',
      trecho: trechoDoComentario(comentario.body),
      created_at: comentario.created_at,
    });
  }

  return notificacoes;
}

/**
 * Ids das menções que estão nos comentários informados.
 *
 * É o que a thread aberta usa para baixar o sino: quem leu o comentário na
 * tarefa não deveria continuar com a menção pendurada na caixa de entrada.
 */
export function mencoesDosComentarios(
  notificacoes: MencaoNotificacao[],
  commentIds: string[],
): string[] {
  if (commentIds.length === 0) return [];
  const alvos = new Set(commentIds);
  return notificacoes
    .filter((notificacao) => alvos.has(notificacao.commentId))
    .map((notificacao) => notificacao.id);
}
