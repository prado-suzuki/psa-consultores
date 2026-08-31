import type { OrgComment } from '@/hooks/useDomainOrgComments';

/**
 * Regras puras do EVENTO DE SISTEMA em `org_comments`.
 *
 * Aviso e comentário moram na mesma tabela e na mesma thread; o que separa os
 * dois é a coluna `kind`. `comment` é alguém que digitou, todo o resto é o
 * sistema registrando um acontecimento.
 *
 * Isto vivia privado dentro de `OrgCommentsPanel.tsx`. Saiu para cá quando o
 * Feed passou a mostrar evento também (31/08/2026): as duas telas têm de
 * desenhar o mesmo aviso com o mesmo texto, e duas cópias divergiriam na
 * primeira revisão de copy da Patricia.
 */

export type OrgCommentKind = OrgComment['kind'];
export type OrgCommentEventoKind = Exclude<OrgCommentKind, 'comment'>;

/** Iniciais do avatar de todo evento: quem fala é o sistema, não a pessoa. */
export const AUTOR_DO_EVENTO = 'PSA';

/**
 * O título que ocupa o lugar do nome do autor.
 *
 * Textos revisados pela Patricia em 27/08/2026. O título do evento de cobrança
 * nomeia o ATO e não o objeto; o de encerramento usa "finalizada", palavra
 * escolhida por ela. O valor do enum continua `documentos_conferidos`: enum do
 * Postgres não aceita DROP VALUE, e renomear custaria uma migração e um valor
 * morto para sempre sem mudar nada na tela.
 */
export const ROTULOS_DE_EVENTO: Record<OrgCommentEventoKind, string> = {
  assignment_changed: 'Responsável alterado',
  review_submitted: 'Enviado para revisão',
  review_approved: 'Revisão aprovada',
  review_adjustments: 'Ajustes solicitados',
  status_changed: 'Status alterado',
  documentos_solicitados: 'Documentos solicitados ao cliente',
  documentos_cobrados: 'Cobrança de documentos pendentes',
  documentos_conferidos: 'Solicitação finalizada',
};

/** Evento de sistema, e não fala de gente. */
export function ehEventoDeSistema(kind: OrgCommentKind): kind is OrgCommentEventoKind {
  return kind !== 'comment';
}

/**
 * O título a exibir no lugar do nome do autor.
 *
 * `kind` novo no banco e ainda sem rótulo aqui não pode virar "undefined" na
 * tela: cai num texto genérico até alguém escrever o certo.
 */
export function rotuloDoEvento(kind: OrgCommentKind): string {
  if (!ehEventoDeSistema(kind)) return '';
  return ROTULOS_DE_EVENTO[kind] ?? 'Atualização do sistema';
}

/**
 * O corpo do evento sem o prefixo técnico.
 *
 * O corpo gravado repete o que o título já diz ("Enviado para revisão de
 * Fulano: ..."), então o prefixo sai e sobra só o que a pessoa escreveu. Em
 * "Tarefa aprovada" não sobra nada, e string vazia é o sinal de que não há
 * corpo para desenhar.
 */
export function corpoDoEvento(comment: Pick<OrgComment, 'kind' | 'body'>): string {
  if (comment.kind === 'review_submitted') {
    return comment.body.replace(/^Enviado para revisão(?: de [^:]+)?:\s*/, '');
  }
  if (comment.kind === 'review_adjustments') {
    return comment.body.replace(/^Devolvido para ajustes:\s*/, '');
  }
  if (comment.kind === 'review_approved' && comment.body === 'Tarefa aprovada') return '';
  return comment.body;
}
