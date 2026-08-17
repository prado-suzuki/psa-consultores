import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
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
      selectedTaskIds={new Set()}
      onToggleSelection={noop}
      onMoveSelected={noop}
      onMoveProjectTasks={noop}
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

const tarefa = (id: string, overrides: Partial<OrgTask> = {}) => ({
  id,
  title: id,
  status: 'todo',
  priority: 'medium',
  assigned_to_name: 'Geizi Andrade',
  tags: [],
  estimated_hours: null,
  actual_hours: null,
  parent_task_id: null,
  project_id: 'p1',
  ...overrides,
}) as unknown as OrgTask;

describe('ProjetosTarefasList — coluna Esforço', () => {
  it('acusa na tarefa quem concluiu sem apontar horas', () => {
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { status: 'done', estimated_hours: 4 })],
    });

    fireEvent.click(screen.getByLabelText('Expandir OS'));
    fireEvent.click(screen.getByLabelText('Expandir projeto'));

    // Duas pílulas: a da tarefa e o resumo do projeto/OS acima dela.
    expect(screen.getAllByText('Sem horas').length).toBeGreaterThan(0);
    expect(screen.getByText('Geizi Andrade')).toBeInTheDocument();
  });

  it('resume a pendência na OS sem precisar expandir a árvore', () => {
    renderList({
      projects: [projeto],
      tasks: [
        tarefa('Coleta', { status: 'done' }),
        tarefa('Relatório', { status: 'done' }),
        tarefa('Revisão', { status: 'done', actual_hours: 6 }),
      ],
    });

    expect(screen.getByText('2 sem horas')).toBeInTheDocument();
  });

  it('sem pendência, mostra o total de horas realizadas', () => {
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { status: 'done', actual_hours: 2.5 })],
    });

    expect(screen.getByText('2,5h')).toBeInTheDocument();
    expect(screen.queryByText(/sem horas/i)).not.toBeInTheDocument();
  });
});

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

    // A árvore abre recolhida, então o que prova que a lista renderizou é o
    // divisor do cliente — o nome do projeto só aparece depois de expandir.
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    expect(screen.queryByText('Carregando projetos e tarefas…')).not.toBeInTheDocument();
  });
});
