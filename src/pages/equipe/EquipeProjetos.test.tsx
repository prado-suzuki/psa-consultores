import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useClusters: vi.fn(),
  useProjects: vi.fn(),
  useCatalogClients: vi.fn(),
  useExternalClients: vi.fn(),
  useTeamMembers: vi.fn(),
  useBacklog: vi.fn(),
  useProcesses: vi.fn(),
  useProjectMutations: vi.fn(),
  useProcessMutations: vi.fn(),
  useEstrutura: vi.fn(),
  refetchProjects: vi.fn(),
  refetchProcesses: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: pageMocks.useAuth }));
vi.mock('@/hooks/useClusters', () => ({ useClusters: pageMocks.useClusters }));
vi.mock('@/hooks/useDomainEquipeProjetosQueries', () => ({
  useEquipeProjetosQuery: pageMocks.useProjects,
  useEquipeProjetosCatalogClientsQuery: pageMocks.useCatalogClients,
  useEquipeProjetosExternalClientsQuery: pageMocks.useExternalClients,
  useEquipeProjetosTeamMembersQuery: pageMocks.useTeamMembers,
  useEquipeProjetoBacklogQuery: pageMocks.useBacklog,
  useEquipeProjetoProcessesQuery: pageMocks.useProcesses,
}));
vi.mock('@/hooks/useDomainEquipeProjetosMutations', () => ({
  useEquipeProjetoMutations: pageMocks.useProjectMutations,
  useEquipeProjetoProcessMutations: pageMocks.useProcessMutations,
}));
vi.mock('@/hooks/useEstruturaEquipesAll', () => ({
  useEstruturaEquipesAll: pageMocks.useEstrutura,
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    children,
    title,
    subtitle,
    headerActions,
  }: {
    children: ReactNode;
    title: string;
    subtitle?: string;
    headerActions?: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{headerActions}</div>
      {children}
    </main>
  ),
}));

import EquipeProjetos from '@/pages/equipe/EquipeProjetos';

beforeEach(() => {
  vi.clearAllMocks();
  pageMocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
  pageMocks.useClusters.mockReturnValue({ data: [] });
  pageMocks.useProjects.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: pageMocks.refetchProjects,
  });
  pageMocks.useCatalogClients.mockReturnValue({ data: [] });
  pageMocks.useExternalClients.mockReturnValue({ data: [] });
  pageMocks.useTeamMembers.mockReturnValue({ data: [] });
  pageMocks.useBacklog.mockReturnValue({ data: [], isFetching: false });
  pageMocks.useProcesses.mockReturnValue({
    data: [],
    isFetching: false,
    refetch: pageMocks.refetchProcesses,
  });
  pageMocks.useProjectMutations.mockReturnValue({
    importProjectsMutation: { mutateAsync: pageMocks.mutateAsync },
    createProjectMutation: { mutateAsync: pageMocks.mutateAsync },
    updateProjectMutation: { mutateAsync: pageMocks.mutateAsync },
    deleteProjectMutation: { mutateAsync: pageMocks.mutateAsync },
    updateProjectStatusMutation: { mutateAsync: pageMocks.mutateAsync },
  });
  pageMocks.useProcessMutations.mockReturnValue({
    createProcessMutation: { mutateAsync: pageMocks.mutateAsync },
    updateProcessMutation: { mutateAsync: pageMocks.mutateAsync },
    deleteProcessMutation: { mutateAsync: pageMocks.mutateAsync },
    updateProcessStageMutation: { mutateAsync: pageMocks.mutateAsync },
  });
  pageMocks.useEstrutura.mockReturnValue({
    data: { equipes: [], areas: [], grouped: [] },
  });
});

describe('EquipeProjetos', () => {
  it('renderiza a composição vazia e abre o fluxo principal de criação via hooks mockados', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EquipeProjetos />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projetos' })).toBeInTheDocument();
    expect(screen.getByText('0 projetos encontrados')).toBeInTheDocument();
    expect(screen.getByText('Nenhum projeto criado')).toBeInTheDocument();
    expect(pageMocks.useProjects).toHaveBeenCalledWith('user-1');
    expect(pageMocks.useProcesses).toHaveBeenCalledWith('user-1', undefined);
    expect(pageMocks.useBacklog).toHaveBeenCalledWith('user-1', undefined);

    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    expect(await screen.findByRole('heading', { name: 'Criar Novo Projeto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Projeto *')).toBeInTheDocument();
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();
  });
});
