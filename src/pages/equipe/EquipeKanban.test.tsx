import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ initial: vi.fn(), deliverables: vi.fn(), attachments: vi.fn() }));
vi.mock('@/hooks/useDomainEquipeKanbanQueries', () => ({
  useEquipeKanbanInitialQuery: mocks.initial,
}));
vi.mock('@/hooks/useDomainEquipeKanbanDeliverableMutations', () => ({
  useEquipeKanbanDeliverableMutations: mocks.deliverables,
}));
vi.mock('@/hooks/useDomainEquipeKanbanAttachments', () => ({
  useEquipeKanbanAttachments: mocks.attachments,
}));
vi.mock('@/hooks/useDeliverableBlockers', () => ({
  useDeliverableBlockers: () => ({ data: {} }),
  formatBlockerTooltip: () => '',
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    title,
    subtitle,
    children,
    headerActions,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
    headerActions: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div aria-label="Modos de visualização">{headerActions}</div>
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/kanban/KanbanFilters', () => ({
  KanbanFilters: ({
    mainTaskCount,
    totalTaskCount,
  }: {
    mainTaskCount: number;
    totalTaskCount: number;
  }) => (
    <p>
      contagem {mainTaskCount}/{totalTaskCount}
    </p>
  ),
}));

import EquipeKanban from '@/pages/equipe/EquipeKanban';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.initial.mockReturnValue({
    data: {
      sprints: [],
      profiles: [],
      projects: [],
      processes: [],
      deliverables: [
        {
          id: 'parent',
          title: 'Entrega',
          description: null,
          status: 'pending',
          assigned_to: null,
          sprint_id: null,
          estimated_hours: null,
          due_date: null,
          start_date: null,
          parent_id: null,
          task_code: '1',
        },
      ],
    },
    isLoading: false,
    isSuccess: true,
    error: null,
  });
  mocks.deliverables.mockReturnValue({
    updateStatus: { mutateAsync: vi.fn() },
    saveDeliverable: { mutateAsync: vi.fn() },
    deleteDeliverable: { mutateAsync: vi.fn() },
  });
  mocks.attachments.mockReturnValue({
    load: { mutateAsync: vi.fn().mockResolvedValue([]) },
    upload: { mutateAsync: vi.fn() },
    download: { mutateAsync: vi.fn() },
    remove: { mutateAsync: vi.fn() },
  });
});

describe('EquipeKanban', () => {
  it('integra quadro/tabela reais e abre o diálogo real com os dados do entregável', async () => {
    const user = userEvent.setup();
    render(<EquipeKanban />);
    expect(screen.getByRole('heading', { name: 'Quadro Kanban' })).toBeInTheDocument();
    expect(screen.getByText('Visualize e gerencie os entregáveis das sprints')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('contagem 1/1')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'A Fazer' })).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();

    const viewButtons = within(screen.getByLabelText('Modos de visualização')).getAllByRole(
      'button',
    );
    await user.click(viewButtons[1]);
    expect(screen.getByRole('columnheader', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByText('A Fazer')).toBeInTheDocument();

    await user.click(screen.getByText('Entrega'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detalhes do Entregável' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Entrega')).toBeInTheDocument();
    expect(mocks.attachments.mock.results[0]?.value.load.mutateAsync).toHaveBeenCalledWith(
      'parent',
    );
  });

  it('avisa ao arrastar mãe com subtarefa aberta para Concluído e só grava se confirmar', async () => {
    const user = userEvent.setup();
    const base = {
      description: null,
      assigned_to: null,
      sprint_id: null,
      estimated_hours: null,
      due_date: null,
      start_date: null,
    };
    mocks.initial.mockReturnValue({
      data: {
        sprints: [],
        profiles: [],
        projects: [],
        processes: [],
        deliverables: [
          { ...base, id: 'mae', title: 'TAX · Portal', status: 'pending', parent_id: null, task_code: 'TAX-01' },
          {
            ...base,
            id: 'sub-aberta',
            title: 'Criar os manuais',
            status: 'pending',
            parent_id: 'mae',
            task_code: 'TAX-03',
          },
        ],
      },
      isLoading: false,
      isSuccess: true,
      error: null,
    });

    render(<EquipeKanban />);
    const coluna = (await screen.findByRole('heading', { name: 'Concluído' })).closest('div')!
      .parentElement!;
    // A área que recebe o drop é a lista de cards, irmã do cabeçalho da coluna.
    const areaDoDrop = coluna.querySelector('[class*="space-y-3"]') as HTMLElement;
    fireEvent.drop(areaDoDrop, { dataTransfer: { getData: () => 'mae' } });

    const warning = await screen.findByRole('alertdialog');
    expect(within(warning).getByText(/Criar os manuais/)).toBeInTheDocument();
    const updateStatus = mocks.deliverables.mock.results[0]?.value.updateStatus.mutateAsync;
    expect(updateStatus).not.toHaveBeenCalled();

    await user.click(within(warning).getByRole('button', { name: 'Concluir mesmo assim' }));
    expect(updateStatus).toHaveBeenCalledWith({ deliverableId: 'mae', status: 'completed' });
  });

  it('abre sozinho a mãe concluída que esconde subtarefa aberta e sinaliza no card', async () => {
    const base = {
      description: null,
      assigned_to: null,
      sprint_id: null,
      estimated_hours: null,
      due_date: null,
      start_date: null,
    };
    mocks.initial.mockReturnValue({
      data: {
        sprints: [],
        profiles: [],
        projects: [],
        processes: [],
        deliverables: [
          {
            ...base,
            id: 'mae',
            title: 'TAX · Portal',
            status: 'completed',
            parent_id: null,
            task_code: 'TAX-01',
          },
          {
            ...base,
            id: 'sub-aberta',
            title: 'Criar os manuais de uso das ferramentas da área Tax',
            status: 'pending',
            parent_id: 'mae',
            task_code: 'TAX-03',
          },
        ],
      },
      isLoading: false,
      isSuccess: true,
      error: null,
    });

    render(<EquipeKanban />);

    // Sem clicar em nada: a subtarefa aberta tem que estar na tela.
    expect(
      await screen.findByText('Criar os manuais de uso das ferramentas da área Tax'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 aberta')).toBeInTheDocument();
  });
});
