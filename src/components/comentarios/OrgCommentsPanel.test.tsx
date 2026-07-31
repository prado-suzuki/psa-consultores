import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  commentsArgs: [] as unknown[][],
  mencoesLidasArgs: [] as string[][],
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'U1' } }),
}));

/**
 * O editor rico tem testes próprios (formato em `orgCommentRichText.test.ts`,
 * leitura em `OrgCommentBody.test.tsx`, inserção da menção em
 * `MencaoUsuario.test.ts`). Aqui ele vira um textarea que emite o mesmo formato
 * de corpo, para o teste do painel seguir falando de fluxo — publicar, responder,
 * editar, excluir — e não de ProseMirror em jsdom.
 */
vi.mock('@/components/comentarios/OrgCommentEditor', () => ({
  OrgCommentEditor: ({
    value,
    onChange,
    placeholder,
    ariaLabel,
    candidates,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    candidates: { id: string; name: string }[];
  }) => {
    const [texto, setTexto] = useState(() => (value ? textoPlanoDoCorpo(value) : ''));
    return (
      <textarea
        aria-label={ariaLabel}
        placeholder={placeholder}
        data-candidatos={candidates.map((candidate) => candidate.name).join('|')}
        value={texto}
        onChange={(event) => {
          setTexto(event.target.value);
          onChange(serializarDoc(docDeTextoLegado(event.target.value)));
        }}
      />
    );
  },
}));

vi.mock('@/hooks/useDomainMentionCandidates', () => ({
  useDomainMentionCandidates: (...args: unknown[]) => {
    mocks.candidatesArgs.push(args);
    return { candidates: mocks.candidates, isLoading: false };
  },
}));

vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDomainOrgComments: (...args: unknown[]) => {
    mocks.commentsArgs.push(args);
    return {
      comments: mocks.comments,
      isLoading: false,
      createComment: { mutateAsync: mocks.create },
      isCreating: false,
      updateComment: { mutateAsync: mocks.update, isPending: false },
      deleteComment: { mutate: mocks.remove, mutateAsync: mocks.remove, isPending: false },
      downloadAttachment: { mutateAsync: mocks.download, isPending: false },
    };
  },
}));

/**
 * A caixa de menções tem teste próprio (`useNotificacoesMencao.test.tsx`); aqui
 * só interessa que o painel entregue os comentários da thread para ela baixar o
 * sino.
 */
vi.mock('@/hooks/useNotificacoesMencao', () => ({
  useMarcarMencoesLidasDaThread: (commentIds: string[]) => {
    mocks.mencoesLidasArgs.push(commentIds);
  },
}));

import { OrgCommentsPanel } from '@/components/comentarios/OrgCommentsPanel';
import {
  docDeTextoLegado,
  lerCorpo,
  serializarDoc,
  textoPlanoDoCorpo,
  type CorpoDeComentario,
} from '@/lib/orgCommentRichText';

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

function renderPanel(props: { criadoPor?: { nome: string | null; em: string } } = {}) {
  return render(<OrgCommentsPanel entityId="T1" projectId="P1" area="tax" {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.comments = [];
  mocks.candidatesArgs = [];
  mocks.commentsArgs = [];
  mocks.mencoesLidasArgs = [];
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
  it('entrega os comentários da thread para a caixa de menções marcar como lidos', () => {
    mocks.comments = [comment(), comment({ id: 'C2', parent_id: 'C1' })];
    renderPanel();

    expect(mocks.mencoesLidasArgs.at(-1)).toEqual(['C1', 'C2']);
  });

  it('abre o feed com quem criou a tarefa, mesmo sem comentário nenhum', () => {
    renderPanel({ criadoPor: { nome: 'Geizi Andrade', em: '2026-03-23T12:00:00.000Z' } });

    expect(screen.getByText('Tarefa criada por Geizi Andrade')).toBeInTheDocument();
    expect(screen.getByText('Nenhum comentário ainda')).toBeInTheDocument();
  });

  it('mantém o marco de criação acima do primeiro comentário', () => {
    mocks.comments = [comment()];
    renderPanel({ criadoPor: { nome: 'Geizi Andrade', em: '2026-03-23T12:00:00.000Z' } });

    const marco = screen.getByText('Tarefa criada por Geizi Andrade');
    const autor = screen.getByText('Bernardo Silva');
    expect(marco.compareDocumentPosition(autor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('usa "outro usuário" quando o nome do criador não foi resolvido', () => {
    renderPanel({ criadoPor: { nome: null, em: '2026-03-23T12:00:00.000Z' } });

    expect(screen.getByText('Tarefa criada por outro usuário')).toBeInTheDocument();
  });

  it('não mostra marco de criação quando a origem não é informada', () => {
    renderPanel();

    expect(screen.queryByText(/^Tarefa criada por/)).not.toBeInTheDocument();
  });

  it('entrega a lista de menção ao editor', () => {
    renderPanel();

    expect(screen.getByPlaceholderText(/Escreva um comentário/)).toHaveAttribute(
      'data-candidatos',
      'Bernardo Silva|Ana Souza',
    );
  });

  it('publica o corpo como documento, com as menções que estão nele', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    fireEvent.change(screen.getByPlaceholderText(/Escreva um comentário/), {
      target: { value: 'Confira com @[Ana Souza](U2)' },
    });

    const file = new File(['pdf'], 'memoria.pdf', { type: 'application/pdf' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(input!, file);
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const chamada = mocks.create.mock.calls[0][0] as {
      body: string;
      files: File[];
      mentions: string[];
    };
    expect(chamada.files).toEqual([file]);
    expect(chamada.mentions).toEqual(['U2']);
    // O corpo vai como documento serializado, e o uuid mora no nó da menção.
    const corpo = lerCorpo(chamada.body) as Extract<CorpoDeComentario, { formato: 'rich' }>;
    expect(corpo.formato).toBe('rich');
    expect(textoPlanoDoCorpo(chamada.body)).toBe('Confira com @Ana Souza');
  });

  it('responder manda o comentário respondido, que é quem recebe a notificação', async () => {
    const user = userEvent.setup();
    mocks.comments = [comment({ author_id: 'U2', author_name: 'Ana Souza' })];

    const { container } = renderPanel();

    await user.click(screen.getByRole('button', { name: /Responder/ }));
    fireEvent.change(screen.getByPlaceholderText(/Escreva uma resposta/), {
      target: { value: 'Fechado' },
    });
    // O compositor da resposta é o que está dentro do bloco da raiz — o de baixo
    // é o da thread inteira.
    const raiz = container.querySelector<HTMLElement>('[data-comment-root="C1"]');
    await user.click(within(raiz!).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const chamada = mocks.create.mock.calls[0][0] as { parentId: string; respondidoId: string };
    expect(chamada.parentId).toBe('C1');
    // Sem isto a notificação de resposta não sai: é o `respondidoId` que diz ao
    // banco quem foi respondido.
    expect(chamada.respondidoId).toBe('C1');
  });

  it('pede a lista de menção ao hook, pela entidade da thread', () => {
    renderPanel();

    // Nada de lista pronta por prop: a fatia de segurança mora no hook.
    expect(mocks.candidatesArgs[0]).toEqual(['org_task', 'T1', 'P1']);
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

    // O editor abre o corpo legado já sem uuid na tela.
    const campo = screen.getByDisplayValue('Confira com @Ana Souza hoje');
    await user.type(campo, ' cedo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const { id, body } = mocks.update.mock.calls[0][0] as { id: string; body: string };
    expect(id).toBe('C1');
    expect(textoPlanoDoCorpo(body)).toBe('Confira com @Ana Souza hoje cedo');
  });

  it('não oferece editar nem excluir comentário de outra pessoa', () => {
    mocks.comments = [comment({ author_id: 'U2', author_name: 'Ana Souza' })];

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Ações do comentário' })).not.toBeInTheDocument();
  });

  it('não anuncia origem na thread de uma entidade só', () => {
    mocks.comments = [comment({ entity_title: 'Apurar ICMS' })];

    renderPanel();

    expect(screen.queryByText('Apurar ICMS')).not.toBeInTheDocument();
  });
});

/**
 * A thread do projeto mostra também o que foi dito nas tarefas dele. É o mesmo
 * painel: muda o recorte pedido ao hook e o cabeçalho que separa as origens.
 */
describe('OrgCommentsPanel — thread consolidada do projeto', () => {
  function renderProjeto() {
    return render(
      <OrgCommentsPanel
        entityType="org_project"
        entityId="P1"
        projectId="P1"
        area="tax"
        consolidarTarefas
      />,
    );
  }

  /** Comentário de uma tarefa vinculada ao projeto da thread. */
  function daTarefa(id: string, titulo: string, overrides: Partial<OrgComment> = {}) {
    return comment({
      id,
      entity_type: 'org_task',
      entity_id: `T-${titulo}`,
      entity_title: titulo,
      body: `Comentário de ${titulo}`,
      ...overrides,
    });
  }

  it('pede a thread consolidada ao hook', () => {
    renderProjeto();

    expect(mocks.commentsArgs[0]).toEqual([
      'org_project',
      'P1',
      'tax',
      'P1',
      { consolidarTarefas: true },
    ]);
  });

  it('anuncia a origem a cada troca de tarefa, sem repetir dentro do bloco', () => {
    mocks.comments = [
      daTarefa('C1', 'Apurar ICMS'),
      daTarefa('C2', 'Apurar ICMS', { id: 'C2', body: 'Mesma tarefa, outra fala' }),
      daTarefa('C3', 'Conferir NFe'),
    ];

    renderProjeto();

    // Duas etiquetas, não três: a segunda fala continua a conversa da primeira.
    expect(screen.getAllByText('Apurar ICMS')).toHaveLength(1);
    expect(screen.getByText('Conferir NFe')).toBeInTheDocument();
  });

  it('volta a etiquetar o projeto quando a conversa retorna dele', () => {
    mocks.comments = [
      comment({ id: 'C1', entity_type: 'org_project', entity_id: 'P1', entity_title: 'Projeto X' }),
      daTarefa('C2', 'Apurar ICMS'),
      comment({
        id: 'C3',
        entity_type: 'org_project',
        entity_id: 'P1',
        entity_title: 'Projeto X',
        body: 'De volta ao projeto',
      }),
    ];

    renderProjeto();

    // O bloco de abertura dispensa etiqueta — é o painel do próprio projeto —,
    // mas o que volta depois da tarefa precisa dela para não ler como tarefa.
    expect(screen.getAllByText('Projeto X')).toHaveLength(1);
  });

  it('responder ao comentário de uma tarefa grava na tarefa', async () => {
    const user = userEvent.setup();
    mocks.comments = [daTarefa('C1', 'Apurar ICMS', { author_id: 'U2', author_name: 'Ana Souza' })];

    const { container } = renderProjeto();

    await user.click(screen.getByRole('button', { name: /Responder/ }));
    fireEvent.change(screen.getByPlaceholderText(/Escreva uma resposta/), {
      target: { value: 'Fechado' },
    });
    const raiz = container.querySelector<HTMLElement>('[data-comment-root="C1"]');
    await user.click(within(raiz!).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const chamada = mocks.create.mock.calls[0][0] as {
      alvo: { entityType: string; entityId: string };
    };
    // Sem isto a resposta nasceria no projeto e o trigger do banco a rejeitaria.
    expect(chamada.alvo).toEqual({ entityType: 'org_task', entityId: 'T-Apurar ICMS' });
  });

  it('publicar no compositor da thread não muda a entidade — vai para o projeto', async () => {
    const user = userEvent.setup();
    renderProjeto();

    fireEvent.change(screen.getByPlaceholderText(/Escreva um comentário/), {
      target: { value: 'Aviso geral do projeto' },
    });
    await user.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('alvo');
  });
});
