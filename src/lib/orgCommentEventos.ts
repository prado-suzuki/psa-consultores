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
  /*
   * PT-04. **Dois rótulos, e não um**, porque a Patricia aprovou dois títulos:
   * a primeira importação anuncia que os slides já podem sair, e as seguintes
   * dizem que existe revisão nova sem sugerir que a anterior morreu.
   */
  papel_de_trabalho_importado: 'Papel de trabalho importado',
  papel_de_trabalho_revisado: 'Nova revisão do papel de trabalho',
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

/**
 * De onde sai o destinatário de cada evento que tem um.
 *
 * O corpo gravado carrega o nome no prefixo que o `corpoDoEvento` remove da
 * leitura ("Enviado para revisão de Anne Strini: ..."), e não em coluna própria.
 * Ler dali é o que permite mostrar para quem a peça foi sem migration nenhuma,
 * e vale para o acervo inteiro: em 21/09/2026 as 33 linhas de `review_submitted`
 * do sandbox traziam o prefixo.
 *
 * Os outros eventos não têm destinatário gravado em lugar nenhum. O de
 * "Ajustes solicitados" volta para quem enviou, mas isso é inferência sobre o
 * evento anterior, não dado: fica de fora em vez de virar chute na tela.
 */
const DESTINATARIO_NO_CORPO: Partial<Record<OrgCommentEventoKind, RegExp>> = {
  review_submitted: /^Enviado para revisão de ([^:]+):/,
  assignment_changed: /^Tarefa reatribuída para ([^.]+)\./,
};

/**
 * Quem agiu e, quando existe, para quem: "Patricia Melo para Anne Strini".
 *
 * Vai no cinza, logo depois do rótulo do ato. Sem "por" antes do primeiro nome:
 * ele ocupa a mesma posição em que a thread mostra quem falou em toda linha, e
 * é lido como autor sem precisar ser anunciado. Sobra uma preposição só, a que
 * carrega a informação que muda.
 *
 * Evento sem autor gravado (acervo antigo) devolve string vazia, e a tela não
 * desenha o segmento: melhor o rótulo sozinho, como era antes, do que um "para"
 * pendurado em ninguém.
 */
export function pessoasDoEvento(
  comment: Pick<OrgComment, 'kind' | 'body' | 'author_name'>,
): string {
  if (!ehEventoDeSistema(comment.kind)) return '';

  const autor = comment.author_name?.trim() ?? '';
  const destinatario = DESTINATARIO_NO_CORPO[comment.kind]?.exec(comment.body)?.[1]?.trim() ?? '';
  if (!autor) return '';
  return destinatario ? `${autor} para ${destinatario}` : autor;
}
