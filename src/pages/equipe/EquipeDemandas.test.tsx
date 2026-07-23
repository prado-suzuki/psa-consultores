import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EquipeSubdemandDraft } from '@/lib/equipeDemandas';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  query: vi.fn(),
  parents: vi.fn(),
  items: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/useDomainEquipeDemandasQueries', () => ({ useEquipeDemandasQuery: mocks.query }));
vi.mock('@/hooks/useDomainEquipeDemandasMutations', () => ({
  useEquipeDemandaParentMutations: mocks.parents,
  useEquipeDemandaItemMutations: mocks.items,
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    title,
    headerActions,
    children,
  }: {
    title: string;
    headerActions: ReactNode;
    children: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      {headerActions}
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/HorasAcumuladas', () => ({ HorasAcumuladas: () => <div>Horas</div> }));
vi.mock('@/components/equipe/demandas/DemandDialogs', () => ({
  CreateDemandDialog: () => <div>Diálogo de criação</div>,
  EditDemandDialog: () => <div>Diálogo de edição</div>,
}));
vi.mock('@/components/equipe/demandas/DemandList', () => ({
  DemandList: ({
    subdemandDraft,
    setSubdemandDraft,
  }: {
    subdemandDraft: EquipeSubdemandDraft;
    setSubdemandDraft: Dispatch<SetStateAction<EquipeSubdemandDraft>>;
  }) => (
    <div>
      <span data-testid="child-title">{subdemandDraft.title || 'vazio'}</span>
      <button
        onClick={() => setSubdemandDraft({ ...subdemandDraft, title: 'Rascunho compartilhado' })}
      >
        Editar filha
      </button>
    </div>
  ),
}));

import EquipeDemandas from '@/pages/equipe/EquipeDemandas';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
  mocks.query.mockReturnValue({ refetch: mocks.refetch });
  const mutation = { mutateAsync: vi.fn() };
  mocks.parents.mockReturnValue({
    createRoutineMutation: mutation,
    updateRoutineMutation: mutation,
    deleteRoutineMutation: mutation,
    updateRoutineStatusMutation: mutation,
  });
  mocks.items.mockReturnValue({
    createItemMutation: mutation,
    updateItemStatusMutation: mutation,
    deleteItemMutation: mutation,
  });
});

describe('EquipeDemandas', () => {
  it('compõe os dois diálogos e mantém um único rascunho filho controlado pela página', async () => {
    const user = userEvent.setup();
    render(<EquipeDemandas />);

    expect(screen.getByRole('heading', { name: 'Demandas' })).toBeInTheDocument();
    expect(screen.getByText('Diálogo de criação')).toBeInTheDocument();
    expect(screen.getByText('Diálogo de edição')).toBeInTheDocument();
    expect(screen.getByTestId('child-title')).toHaveTextContent('vazio');
    expect(mocks.query).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        onTeamMembers: expect.any(Function),
        onDemandas: expect.any(Function),
        onDemandItems: expect.any(Function),
        onComplete: expect.any(Function),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Editar filha' }));
    expect(screen.getByTestId('child-title')).toHaveTextContent('Rascunho compartilhado');
  });
});
