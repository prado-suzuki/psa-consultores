import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useClusters: vi.fn(),
  useProcesses: vi.fn(),
  useCatalogClients: vi.fn(),
  useProjects: vi.fn(),
  useImperative: vi.fn(),
  useMutations: vi.fn(),
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: pageMocks.useAuth }));
vi.mock('@/hooks/useClusters', () => ({ useClusters: pageMocks.useClusters }));
vi.mock('@/hooks/useDomainEquipeProcessosQueries', () => ({
  useEquipeProcessosQuery: pageMocks.useProcesses,
  useEquipeProcessosCatalogClientsQuery: pageMocks.useCatalogClients,
  useEquipeProcessosProjectsQuery: pageMocks.useProjects,
  useEquipeProcessosImperativeQueries: pageMocks.useImperative,
}));
vi.mock('@/hooks/useDomainEquipeProcessosMutations', () => ({
  useEquipeProcessosMutations: pageMocks.useMutations,
}));
vi.mock('@/hooks/usePersistedState', () => ({
  usePersistedState: (_key: string, initial: unknown) => [initial, vi.fn()],
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    title,
    subtitle,
    headerActions,
    children,
  }: {
    title: string;
    subtitle: string;
    headerActions: ReactNode;
    children: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {headerActions}
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/processos/ProcessToolbar', () => ({
  ProcessToolbar: () => <button type="button">Criar processo</button>,
}));
vi.mock('@/components/equipe/processos/ProcessFilters', () => ({
  ProcessFilters: ({ areas }: { areas: string[] }) => <div>Áreas: {areas.join(', ')}</div>,
}));
vi.mock('@/components/equipe/processos/ProcessList', () => ({
  ProcessList: ({
    processes,
    loading,
  }: {
    processes: Array<{ name: string }>;
    loading: boolean;
  }) => (
    <section aria-label="lista de processos">
      {loading ? 'Carregando' : `${processes.length} processos`}
      {processes.map((process) => (
        <span key={process.name}>{process.name}</span>
      ))}
    </section>
  ),
}));
vi.mock('@/components/equipe/processos/ProcessDetailsDialog', () => ({
  ProcessDetailsDialog: () => null,
}));
vi.mock('@/components/equipe/processos/ProcessInfoTab', () => ({ ProcessInfoTab: () => null }));
vi.mock('@/components/equipe/processos/ProcessProjectsTab', () => ({
  ProcessProjectsTab: () => null,
}));
vi.mock('@/components/equipe/processos/ProcessStagesTab', () => ({ ProcessStagesTab: () => null }));
vi.mock('@/components/equipe/CreateProcessModal', () => ({ CreateProcessModal: () => null }));
vi.mock('@/components/equipe/ImprovementHistoryModal', () => ({
  ImprovementHistoryModal: () => null,
}));
vi.mock('@/components/equipe/ProcessImprovementModal', () => ({
  ProcessImprovementModal: () => null,
}));
vi.mock('@/components/equipe/SOPConfigModal', () => ({ SOPConfigModal: () => null }));
vi.mock('@/components/equipe/SOPViewerModal', () => ({ SOPViewerModal: () => null }));

import EquipeProcessos from '@/pages/equipe/EquipeProcessos';

beforeEach(() => {
  vi.clearAllMocks();
  pageMocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
  pageMocks.useClusters.mockReturnValue({ data: [] });
  pageMocks.useProcesses.mockReturnValue({
    data: [
      {
        id: 'p',
        name: 'Fechamento',
        description: null,
        area: 'Fiscal',
        stage: 'analysis',
        priority: null,
        frequency: null,
        volume_month: null,
        financial_impact: null,
        client_id: null,
        created_at: '2026-01-01',
      },
    ],
    isPending: false,
    error: null,
    refetch: pageMocks.refetch,
  });
  pageMocks.useCatalogClients.mockReturnValue({
    data: [{ id: 'c', name: 'Cliente A', responsible: null, color: '#fff', is_active: true }],
  });
  pageMocks.useProjects.mockReturnValue({ data: [] });
  pageMocks.useImperative.mockReturnValue({
    fetchEquipes: vi.fn(),
    fetchProcessDetails: vi.fn(),
    fetchProcessSnapshot: vi.fn(),
    patchProcessInCache: vi.fn(),
    removeProcessFromCache: vi.fn(),
  });
  const mutation = { mutateAsync: pageMocks.mutateAsync };
  pageMocks.useMutations.mockReturnValue({
    importProcessesMutation: mutation,
    updateProcessMutation: mutation,
    deleteProcessMutation: mutation,
    addProjectLinkMutation: mutation,
    removeProjectLinkMutation: mutation,
  });
});

describe('EquipeProcessos', () => {
  it('compõe o estado carregado com os hooks de domínio e dados filtrados', () => {
    render(
      <MemoryRouter>
        <EquipeProcessos />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Processos' })).toBeInTheDocument();
    expect(screen.getByText('Visualize e gerencie os processos mapeados')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'lista de processos' })).toHaveTextContent(
      '1 processos',
    );
    expect(screen.getByText('Fechamento')).toBeInTheDocument();
    expect(screen.getByText('Áreas: Cliente A')).toBeInTheDocument();
    expect(pageMocks.useProcesses).toHaveBeenCalledWith('user-1');
    expect(pageMocks.useCatalogClients).toHaveBeenCalledWith('user-1');
    expect(pageMocks.useProjects).toHaveBeenCalledWith('user-1');
    expect(pageMocks.useImperative).toHaveBeenCalledWith('user-1');
    expect(pageMocks.useMutations).toHaveBeenCalledWith('user-1');
  });
});
