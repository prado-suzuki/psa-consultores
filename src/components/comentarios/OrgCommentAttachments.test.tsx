import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgComment, OrgCommentAttachment } from '@/hooks/useDomainOrgComments';

const mocks = vi.hoisted(() => ({
  comments: [] as OrgComment[],
  isLoading: false,
  download: vi.fn(),
  abrir: vi.fn(),
  hookArgs: [] as unknown[],
}));

vi.mock('@/hooks/useDomainOrgComments', () => ({
  abrirAnexoEmNovaAba: mocks.abrir,
  useDomainOrgComments: (...args: unknown[]) => {
    mocks.hookArgs = args;
    return {
      comments: mocks.comments,
      isLoading: mocks.isLoading,
      downloadAttachment: { mutateAsync: mocks.download, isPending: false },
    };
  },
}));

import { OrgEntityAttachments } from '@/components/comentarios/OrgCommentAttachments';

function attachment(overrides: Partial<OrgCommentAttachment> = {}): OrgCommentAttachment {
  return {
    id: 'A1',
    comment_id: 'C1',
    file_path: 'tarefa/T1/guia.pdf',
    file_name: 'guia_pagamento.pdf',
    file_size: 2048,
    file_type: 'application/pdf',
    width: null,
    height: null,
    uploaded_by: 'U1',
    uploaded_at: '2026-07-28T10:00:00.000Z',
    ...overrides,
  };
}

function comment(overrides: Partial<OrgComment> = {}): OrgComment {
  return {
    id: 'C1',
    entity_type: 'org_task',
    entity_id: 'T1',
    project_id: 'P1',
    parent_id: null,
    kind: 'comment',
    body: 'Segue a guia',
    metadata: {},
    author_id: 'U1',
    author_name: 'Bernardo',
    editado_em: null,
    created_at: '2026-07-28T10:00:00.000Z',
    updated_at: '2026-07-28T10:00:00.000Z',
    entity_title: 'Tarefa',
    project_name: 'Projeto',
    reply_count: 0,
    attachment_count: 0,
    attachments: [],
    excluido: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.comments = [];
  mocks.isLoading = false;
  mocks.download.mockResolvedValue({
    url: 'https://signed.example/guia',
    fileName: 'guia_pagamento.pdf',
  });
});

describe('OrgEntityAttachments', () => {
  it('consulta a thread da entidade e agrega os anexos de todos os comentários', () => {
    mocks.comments = [
      comment({ attachments: [attachment()] }),
      comment({
        id: 'C2',
        attachments: [attachment({ id: 'A2', comment_id: 'C2', file_name: 'comprovante.png' })],
      }),
    ];

    render(<OrgEntityAttachments entityId="T1" projectId="P1" area="tax" />);

    expect(mocks.hookArgs).toEqual(['org_task', 'T1', 'tax', 'P1']);
    expect(screen.getByText('guia_pagamento.pdf')).toBeInTheDocument();
    expect(screen.getByText('comprovante.png')).toBeInTheDocument();
    expect(screen.getAllByText('2.0 KB')).toHaveLength(2);
  });

  it('ignora anexos de comentário excluído', () => {
    mocks.comments = [
      comment({ excluido: true, attachments: [attachment()] }),
      comment({
        id: 'C2',
        attachments: [attachment({ id: 'A2', comment_id: 'C2', file_name: 'vigente.pdf' })],
      }),
    ];

    render(<OrgEntityAttachments entityId="T1" area="tax" />);

    expect(screen.queryByText('guia_pagamento.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('vigente.pdf')).toBeInTheDocument();
  });

  it('explica de onde vêm os anexos quando não há nenhum', () => {
    render(<OrgEntityAttachments entityId="T1" area="tax" />);

    expect(screen.getByText(/envie arquivos junto com um comentário/i)).toBeInTheDocument();
  });

  it('abre o anexo pela URL assinada', async () => {
    const user = userEvent.setup();
    mocks.comments = [comment({ attachments: [attachment()] })];

    render(<OrgEntityAttachments entityId="T1" area="tax" />);
    await user.click(screen.getByRole('button', { name: /guia_pagamento\.pdf/ }));

    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(attachment()));
    expect(mocks.abrir).toHaveBeenCalledWith('https://signed.example/guia', 'guia_pagamento.pdf');
  });
});
