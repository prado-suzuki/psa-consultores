import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgComment } from '@/hooks/useDomainOrgComments';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const mocks = vi.hoisted(() => ({
  comments: [] as OrgComment[],
  candidates: [] as { id: string; name: string }[],
  candidatesArgs: [] as unknown[][],
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'U1' } }),
}));

vi.mock('@/hooks/useDomainMentionCandidates', () => ({
  useDomainMentionCandidates: (...args: unknown[]) => {
    mocks.candidatesArgs.push(args);
    return { candidates: mocks.candidates, isLoading: false };
  },
}));

vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDomainOrgComments: () => ({
    comments: mocks.comments,
    isLoading: false,
    createComment: { mutateAsync: mocks.create },
    isCreating: false,
    updateComment: { mutateAsync: mocks.update, isPending: false },
    deleteComment: { mutate: mocks.remove, mutateAsync: mocks.remove, isPending: false },
    downloadAttachment: { mutateAsync: mocks.download, isPending: false },
  }),
}));

import { OrgCommentsPanel } from '@/components/comentarios/OrgCommentsPanel';

function comment(overrides: Partial<OrgComment> = {}): OrgComment {
  return {
    id: 'C1',
    entity_type: 'org_task',
    entity_id: 'T1',
    project_id: 'P1',
    parent_id: null,
    kind: 'comment',
    body: 'Comentário principal',
    metadata: {},
    author_id: 'U1',
    author_name: 'Bernardo Silva',
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

function renderPanel() {
  return render(<OrgCommentsPanel entityId="T1" projectId="P1" area="tax" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.comments = [];
  mocks.candidatesArgs = [];
  mocks.candidates = [
    { id: 'U1', name: 'Bernardo Silva' },
    { id: 'U2', name: 'Ana Souza' },
  ];
  mocks.create.mockResolvedValue('C-NOVO');
  mocks.update.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.download.mockResolvedValue({
    url: 'https://signed.example/anexo',
    fileName: 'arquivo.pdf',
  });
});

describe('OrgCommentsPanel', () => {
  it('pede a lista de menção ao hook, pela entidade da thread', () => {
    renderPanel();

    // Nada de lista pronta por prop: a fatia de segurança mora no hook.
    expect(mocks.candidatesArgs[0]).toEqual(['org_task', 'T1', 'P1']);
  });

  it('digitar @ abre a lista, filtra por nome e grava a menção escolhida', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    const composer = screen.getByPlaceholderText(/Escreva um comentário/);
    await user.type(composer, 'Confira com @');
    expect(screen.getByRole('option', { name: /Ana Souza/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Bernardo Silva/ })).toBeInTheDocument();

    await user.type(composer, 'ana');
    expect(screen.queryByRole('option', { name: /Bernardo Silva/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /Ana Souza/ }));
    // No campo aparece só o nome; o uuid fica fora do texto até publicar.
    expect(composer).toHaveValue('Confira com @Ana Souza ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // A pílula é desenhada no espelho atrás do campo.
    expect(container.querySelector('[data-mention-chip="U2"]')).toHaveTextContent('@Ana Souza');

    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      body: 'Confira com @[Ana Souza](U2)',
      files: [],
      mentions: ['U2'],
    });
  });

  it('escolhe a pessoa destacada pelo teclado', async () => {
    const user = userEvent.setup();
    renderPanel();

    const composer = screen.getByPlaceholderText(/Escreva um comentário/);
    await user.type(composer, '@');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(composer).toHaveValue('@Ana Souza ');
  });

  it('Esc fecha a lista e deixa o texto como está', async () => {
    const user = userEvent.setup();
    renderPanel();

    const composer = screen.getByPlaceholderText(/Escreva um comentário/);
    await user.type(composer, 'reunião de 9@10');
    // Um `@` colado em palavra nem abre a lista.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.type(composer, ' @ana');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(composer).toHaveValue('reunião de 9@10 @ana');
  });

  it('duas pessoas escolhidas viram duas menções no mesmo comentário', async () => {
    const user = userEvent.setup();
    renderPanel();

    const composer = screen.getByPlaceholderText(/Escreva um comentário/);
    await user.type(composer, '@bern');
    await user.click(screen.getByRole('option', { name: /Bernardo Silva/ }));
    await user.type(composer, 'e @ana');
    await user.click(screen.getByRole('option', { name: /Ana Souza/ }));
    expect(composer).toHaveValue('@Bernardo Silva e @Ana Souza ');

    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      body: '@[Bernardo Silva](U1) e @[Ana Souza](U2)',
      files: [],
      mentions: ['U1', 'U2'],
    });
  });

  it('publica texto, menção normalizada e anexo no mesmo comando', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    await user.type(screen.getByPlaceholderText(/Escreva um comentário/), 'Confira com ');
    await user.click(screen.getByRole('button', { name: 'Mencionar pessoa' }));
    await user.click(screen.getByRole('option', { name: /Ana Souza/ }));

    const file = new File(['pdf'], 'memoria.pdf', { type: 'application/pdf' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(input!, file);
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      body: 'Confira com @[Ana Souza](U2)',
      files: [file],
      mentions: ['U2'],
    });
  });

  it('organiza respostas sob a raiz e identifica eventos de sistema', () => {
    mocks.comments = [
      comment(),
      comment({
        id: 'C2',
        parent_id: 'C1',
        author_id: 'U2',
        author_name: 'Ana Souza',
        body: 'Respondido',
      }),
      comment({
        id: 'C3',
        kind: 'review_submitted',
        body: 'Enviado para revisão de Ana: Validar cálculo',
      }),
    ];

    renderPanel();

    expect(screen.getByText('Comentário principal')).toBeInTheDocument();
    expect(screen.getByText('Respondido')).toBeInTheDocument();
    expect(screen.getByText('Enviado para revisão')).toBeInTheDocument();
    expect(screen.getByText('Validar cálculo')).toBeInTheDocument();
  });

  it('preserva a raiz excluída como marcador quando ela possui respostas', () => {
    mocks.comments = [
      comment({ excluido: true }),
      comment({ id: 'C2', parent_id: 'C1', author_id: 'U2', body: 'Resposta preservada' }),
    ];

    renderPanel();

    expect(screen.getByText('Comentário excluído')).toBeInTheDocument();
    expect(screen.getByText('Resposta preservada')).toBeInTheDocument();
  });

  it('liga cada resposta à raiz pelo fio da thread', () => {
    mocks.comments = [
      comment(),
      comment({
        id: 'C2',
        parent_id: 'C1',
        author_id: 'U2',
        author_name: 'Ana Souza',
        body: 'Respondido',
      }),
      comment({ id: 'C3', parent_id: 'C1', author_id: 'U2', body: 'Outra resposta' }),
    ];

    const { container } = renderPanel();

    const raiz = container.querySelector<HTMLElement>('[data-comment-root="C1"]');
    expect(raiz).not.toBeNull();
    // As respostas vivem dentro do bloco da raiz, cada uma com seu cotovelo.
    expect(raiz).toContainElement(screen.getByText('Respondido'));
    expect(raiz).toContainElement(screen.getByText('Outra resposta'));
    expect(raiz!.querySelectorAll('[data-thread-connector]')).toHaveLength(2);
  });

  it('não oferece responder dentro de uma resposta', async () => {
    const user = userEvent.setup();
    mocks.comments = [
      comment(),
      comment({ id: 'C2', parent_id: 'C1', author_id: 'U2', body: 'Respondido' }),
    ];

    renderPanel();

    // Um único botão: o da raiz. O trigger do banco rejeita resposta de resposta.
    const responder = screen.getAllByRole('button', { name: /Responder/ });
    expect(responder).toHaveLength(1);

    await user.click(responder[0]);
    expect(screen.getByText('Respondendo a Bernardo')).toBeInTheDocument();
  });

  it('só exclui depois da confirmação no dialog', async () => {
    const user = userEvent.setup();
    mocks.comments = [comment()];

    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ações do comentário' }));
    await user.click(screen.getByRole('menuitem', { name: /Excluir/ }));

    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Excluir comentário?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('C1'));
  });

  it('editar abre o comentário sem uuid e devolve o token ao salvar', async () => {
    const user = userEvent.setup();
    mocks.comments = [comment({ body: 'Confira com @[Ana Souza](U2) hoje' })];

    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ações do comentário' }));
    await user.click(screen.getByRole('menuitem', { name: /Editar/ }));

    const campo = screen.getByDisplayValue('Confira com @Ana Souza hoje');
    await user.type(campo, ' cedo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        id: 'C1',
        body: 'Confira com @[Ana Souza](U2) hoje cedo',
      }),
    );
  });

  it('não oferece editar nem excluir comentário de outra pessoa', () => {
    mocks.comments = [comment({ author_id: 'U2', author_name: 'Ana Souza' })];

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Ações do comentário' })).not.toBeInTheDocument();
  });
});
