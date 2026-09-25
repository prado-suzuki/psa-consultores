import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Teste de wiring do fluxo ditado → tarefa → comentário no feed.
 *
 * A resolução em si (nomes → IDs) tem suíte própria em
 * `resolverTarefaDitada.test.ts` e `useTarefaDitadaResolvida.test.tsx`. Aqui o
 * que se trava é o encadeamento: a sugestão COMPLETA chega ao feed, o modal
 * abre com os valores resolvidos, e desistir da tarefa preserva a transcrição
 * original para "usar como comentário".
 */

const mocks = vi.hoisted(() => ({
  inserirTexto: vi.fn(),
  tarefaRecebida: null as unknown,
  onTarefaSugerida: null as null | ((tarefa: unknown, usarComoComentario: () => void) => void),
  restaurarRef: null as null | (() => void),
  valoresResolvidos: null as Record<string, unknown> | null,
  camposNaoResolvidos: [] as string[],
  conflitos: [] as string[],
  carregando: false,
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  createComment: vi.fn(),
  useTarefaDitadaResolvidaArgs: null as unknown,
  onFecharModal: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock('@/hooks/useDomainFeedComentarios', () => ({
  feedComentariosQueryKeyPrefix: () => ['feed-comentarios'],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'U1' } }),
}));

vi.mock('@/hooks/useDomainOrgComments', () => ({
  useDomainOrgComments: () => ({
    createComment: { mutateAsync: mocks.createComment, isCreating: false },
  }),
}));

vi.mock('@/hooks/useDomainMentionCandidates', () => ({
  mentionCandidatesQueryOptions: vi.fn(),
  useDomainMentionCandidates: () => ({ candidates: [], isLoading: false }),
}));

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useClusterIdByPageCategory: () => ({ data: 'CLU1' }),
  useExternalClients: () => ({ data: [] }),
  useOrgProjectsForFilter: () => ({ data: [] }),
  useTeamMembersForTasks: () => ({ data: [] }),
}));

vi.mock('@/hooks/useOrgTasks', () => ({
  useOrgTasks: () => ({ data: [] }),
}));

/**
 * O compositor é o gatilho: em vez de renderizar o editor inteiro, um botão
 * dispara `onTarefaSugerida` com a sugestão e o callback de restauração —
 * que é exatamente o contrato que o feed consome.
 */
vi.mock('@/components/comentarios/CommentComposer', () => ({
  CommentComposer: (props: {
    onTarefaSugerida?: (tarefa: unknown, usarComoComentario: () => void) => void;
  }) => {
    mocks.onTarefaSugerida = props.onTarefaSugerida ?? null;
    return <button type="button" onClick={() => props.onTarefaSugerida?.(
      mocks.tarefaRecebida,
      () => mocks.inserirTexto('transcrição crua da fala'),
    )}>disparar-ditado</button>;
  },
}));

vi.mock('@/components/comentarios/feed/EscolherDestinoDaFala', () => ({
  EscolherDestinoDaFala: () => null,
}));

vi.mock('@/hooks/useTarefaDitadaResolvida', () => ({
  useTarefaDitadaResolvida: (args: unknown) => {
    mocks.useTarefaDitadaResolvidaArgs = args;
    return {
      carregando: mocks.carregando,
      valores: mocks.valoresResolvidos,
      camposNaoResolvidos: mocks.camposNaoResolvidos,
      conflitos: mocks.conflitos,
    };
  },
}));

vi.mock('@/components/equipe/fiscal/tasks/TaskModal', () => ({
  TaskModal: (props: { initialValues?: Record<string, unknown>; onOpenChange: (aberto: boolean) => void }) => (
    <div data-testid="task-modal-stub">
      <pre data-testid="valores-iniciais">{JSON.stringify(props.initialValues)}</pre>
      <button type="button" onClick={() => props.onOpenChange(false)}>fechar-tarefa</button>
    </div>
  ),
}));

import { FeedNovoComentario } from '@/components/comentarios/feed/FeedNovoComentario';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

const SUGESTAO = {
  titulo: 'Revisar apuração',
  descricao: 'Revisar a apuração antes do envio.',
  responsavel_mencionado: 'Ana',
  cliente_mencionado: null,
  projeto_mencionado: null,
  horas_estimadas: 4,
  transcricaoOriginal: 'fala crua',
  classificacao: { nome: 'intencao-ditado', versao: 2, classe: 'criar_tarefa', certeza: 'alta' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tarefaRecebida = SUGESTAO;
  mocks.carregando = false;
  mocks.camposNaoResolvidos = [];
  mocks.conflitos = [];
  mocks.valoresResolvidos = {
    title: 'Revisar apuração',
    description: 'descrição serializada',
    project_id: 'proj-1',
    client_id: 'cli-1',
    assigned_to: 'u-ana',
    assigned_to_name: 'Ana Lima',
    estimated_hours: 4,
  };
});

function renderFeed() {
  return render(
    <FeedNovoComentario area="tax" filtros={{}} onPublicou={vi.fn()} />,
    { wrapper },
  );
}

describe('FeedNovoComentario — tarefa ditada', () => {
  it('armazena a sugestão completa, resolve e abre o modal com os valores', async () => {
    const { user } = { user: await userEvent.setup() };
    renderFeed();

    await user.click(screen.getByRole('button', { name: 'disparar-ditado' }));

    await waitFor(() => expect(screen.getByTestId('task-modal-stub')).toBeInTheDocument());

    // A resolução recebeu a sugestão INTEIRA e o contexto da tela (sem filtro).
    expect(mocks.useTarefaDitadaResolvidaArgs).toMatchObject({
      sugestao: SUGESTAO,
      projetoDaTela: null,
    });
    // E o modal abriu com os valores resolvidos, não com a fala crua.
    const valores = JSON.parse(
      screen.getByTestId('valores-iniciais').textContent ?? 'null',
    ) as Record<string, unknown>;
    expect(valores).toEqual(mocks.valoresResolvidos);
  });

  it('fechar sem criar oferece "Usar como comentário" e preserva a transcrição original', async () => {
    const user = userEvent.setup();
    renderFeed();

    await user.click(screen.getByRole('button', { name: 'disparar-ditado' }));
    await waitFor(() => expect(screen.getByTestId('task-modal-stub')).toBeInTheDocument());

    // Fecha o modal sem criar a tarefa.
    await user.click(screen.getByRole('button', { name: 'fechar-tarefa' }));

    expect(mocks.toast.info).toHaveBeenCalledWith(
      'A tarefa sugerida não foi criada.',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Usar como comentário' }) }),
    );

    // A ação do toast recoloca a TRANSCRIÇÃO ORIGINAL no editor.
    const { action } = mocks.toast.info.mock.calls[0][1] as {
      action: { onClick: () => void };
    };
    action.onClick();
    expect(mocks.inserirTexto).toHaveBeenCalledWith('transcrição crua da fala');
  });

  it('avisa de forma não bloqueante quando uma menção não se resolve', async () => {
    mocks.camposNaoResolvidos = ['responsavel'];
    const user = userEvent.setup();
    renderFeed();

    await user.click(screen.getByRole('button', { name: 'disparar-ditado' }));
    await waitFor(() => expect(screen.getByTestId('task-modal-stub')).toBeInTheDocument());

    expect(mocks.toast.info).toHaveBeenCalledWith(
      'Confira a tarefa sugerida',
      {
        description:
          'Não foi possível identificar com segurança o responsável “Ana”. Selecione-o antes de criar a tarefa.',
      },
    );
    // O modal abriu mesmo assim: o aviso não bloqueia.
    expect(screen.getByTestId('task-modal-stub')).toBeInTheDocument();
  });

  it('não avisa quando a resolução fica sem pendências', async () => {
    const user = userEvent.setup();
    renderFeed();

    await user.click(screen.getByRole('button', { name: 'disparar-ditado' }));
    await waitFor(() => expect(screen.getByTestId('task-modal-stub')).toBeInTheDocument());

    expect(mocks.toast.info).not.toHaveBeenCalledWith(
      'Confira a tarefa sugerida',
      expect.anything(),
    );
  });
});
