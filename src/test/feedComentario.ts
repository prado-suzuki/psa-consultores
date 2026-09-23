import type { FeedComentario } from '@/hooks/useDomainFeedComentarios';

/** Fala do feed com o mínimo preenchido; cada teste sobrescreve o que importa. */
export function comentarioDoFeed(parcial: Partial<FeedComentario> = {}): FeedComentario {
  return {
    id: 'c1',
    entity_type: 'org_task',
    entity_id: 'T1',
    project_id: 'P1',
    parent_id: null,
    kind: 'comment',
    body: 'Mandei o balancete para o cliente.',
    metadata: {},
    author_id: 'U2',
    author_name: 'Ana Souza',
    editado_em: null,
    created_at: '2026-09-22T14:30:00.000Z',
    updated_at: '2026-09-22T14:30:00.000Z',
    entity_title: 'Conferir balancete de agosto',
    project_name: 'Fechamento mensal',
    reply_count: 0,
    attachment_count: 0,
    attachments: [],
    excluido: false,
    ...parcial,
  };
}
