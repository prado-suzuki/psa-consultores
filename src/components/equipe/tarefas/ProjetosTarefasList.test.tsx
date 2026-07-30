import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrgProject } from '@/hooks/useOrgProjects';
import { ProjetosTarefasList } from '@/components/equipe/tarefas/ProjetosTarefasList';

// Radix (Progress/DropdownMenu) usa APIs de pointer ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => {} },
  releasePointerCapture: { configurable: true, value: () => {} },
});

vi.mock('@/hooks/useOrgTasks', () => ({
  useUpdateOrgTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

const noop = () => {};

function renderList(props: Partial<Parameters<typeof ProjetosTarefasList>[0]> = {}) {
  return render(
    <ProjetosTarefasList
      area="tax"
      projects={[]}
      tasks={[]}
      osRows={[]}
      search=""
      onEditProject={noop}
      onDeleteProject={noop}
      onNewTask={noop}
      onEditTask={noop}
      onDeleteTask={noop}
      onReassignTask={noop}
      onMoveTask={noop}
      onAddSubtask={noop}
      {...props}
    />,
  );
}

const projeto = {
  id: 'p1',
  name: 'Projeto Alfa',
  status: 'active',
  external_client_id: 'c1',
  external_client: { id: 'c1', nome: 'Cliente Um' },
  ordem_servico_id: null,
  responsible: null,
} as unknown as OrgProject;

describe('ProjetosTarefasList — estado de carregamento', () => {
  it('mostra o loader em vez do vazio enquanto os dados não resolvem', () => {
    renderList({ isLoading: true });

    expect(screen.getByText('Carregando projetos e tarefas…')).toBeInTheDocument();
    // O bug corrigido: a lista anunciava "nenhum" durante toda a espera.
    expect(screen.queryByText('Nenhum projeto ou tarefa encontrado')).not.toBeInTheDocument();
  });

  it('usa o glifo de cada área — porquinho na Tax, Sísifo na OSG', () => {
    const { container: tax } = renderList({ area: 'tax', isLoading: true });
    expect(tax.querySelectorAll('.animate-tax-coin-fall').length).toBeGreaterThan(0);
    expect(tax.querySelectorAll('.animate-spin')).toHaveLength(0);

    const { container: osg } = renderList({ area: 'osg', isLoading: true });
    expect(osg.querySelectorAll('.animate-osg-sisyphus-hip-front').length).toBeGreaterThan(0);
    expect(osg.querySelectorAll('.animate-tax-coin-fall')).toHaveLength(0);
    // Sem spinner genérico sobrando, senão a troca ficou pela metade.
    expect(osg.querySelectorAll('.animate-spin')).toHaveLength(0);
  });

  it('cai no spinner padrão nas áreas sem glifo próprio', () => {
    const { container } = renderList({ area: 'digital', isLoading: true });

    expect(container.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.animate-osg-sisyphus-hip-front')).toHaveLength(0);
  });

  it('o loader tem precedência sobre o vazio de filtros — carregando não é "nada corresponde"', () => {
    renderList({ isLoading: true, hideEmpty: true });

    expect(screen.getByText('Carregando projetos e tarefas…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma tarefa corresponde aos filtros')).not.toBeInTheDocument();
  });

  it('mantém o vazio real quando o carregamento termina sem dados', () => {
    renderList({ isLoading: false });

    expect(screen.getByText('Nenhum projeto ou tarefa encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Carregando projetos e tarefas…')).not.toBeInTheDocument();
  });

  it('com dados parciais renderiza a lista, mesmo ainda carregando o resto', () => {
    renderList({ isLoading: true, projects: [projeto] });

    expect(screen.getByText('Projeto Alfa')).toBeInTheDocument();
    expect(screen.queryByText('Carregando projetos e tarefas…')).not.toBeInTheDocument();
  });
});
