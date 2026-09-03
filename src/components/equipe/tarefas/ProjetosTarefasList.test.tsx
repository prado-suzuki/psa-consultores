import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
import { ProjetosTarefasList } from '@/components/equipe/tarefas/ProjetosTarefasList';

// Radix (Progress/DropdownMenu) usa APIs de pointer ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => {} },
  releasePointerCapture: { configurable: true, value: () => {} },
});

const mocks = vi.hoisted(() => ({
  updateTask: vi.fn(),
  updateTaskAsync: vi.fn(),
  createComment: vi.fn(),
  reviewerCandidates: [{ id: 'U2', name: 'Geizi Andrade' }],
}));

vi.mock('@/hooks/useOrgTasks', () => ({
  useUpdateOrgTask: () => ({
    mutate: mocks.updateTask,
    mutateAsync: mocks.updateTaskAsync,
    isPending: false,
  }),
  useCreateOrgTaskComment: () => ({ mutateAsync: mocks.createComment, isPending: false }),
}));

// O diálogo de transição (revisor + detalhamento) fica montado junto da lista.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1' } }) }));
vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectClusterIds: () => ({ data: ['CL1'] }),
}));
vi.mock('@/hooks/useReviewerCandidates', () => ({
  useReviewerCandidates: () => ({ data: mocks.reviewerCandidates, isLoading: false }),
}));

beforeEach(() => {
  mocks.updateTask.mockClear();
  mocks.updateTaskAsync.mockClear();
  mocks.createComment.mockClear();
});

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
      onGerarTarefas={noop}
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
      periodo={periodoParado}
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

/** O mês não é o assunto deste teste: um período parado basta. */
const periodoParado = {
  mes: new Date(2026, 7, 1),
  escopo: 'mes' as const,
  tarefas: [],
  tarefasDoMes: [],
  onPasso: () => {},
  onHoje: () => {},
  onEscopo: () => {},
};

describe('ProjetosTarefasList — barra de período', () => {
  it('a Lista ganhou a mesma barra da Tabela, do Calendário e do Gantt', () => {
    renderList();

    expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });
});

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

describe('ProjetosTarefasList — redisparo da geração de tarefas', () => {
  it('o menu do projeto oferece gerar as tarefas do produto, com o projeto inteiro', async () => {
    const user = userEvent.setup();
    const onGerarTarefas = vi.fn();
    renderList({ projects: [projeto], onGerarTarefas });

    fireEvent.click(screen.getByLabelText('Expandir OS'));
    await user.click(screen.getByRole('button', { name: 'Ações do projeto' }));
    await user.click(screen.getByRole('menuitem', { name: /Gerar tarefas do produto/ }));

    // O projeto inteiro, e não só o id: a auditoria da mutação precisa do nome.
    expect(onGerarTarefas).toHaveBeenCalledWith(projeto);
  });

  it('fica entre editar e mover, não no fim do menu junto do excluir', async () => {
    const user = userEvent.setup();
    renderList({ projects: [projeto], tasks: [tarefa('Coleta')] });

    fireEvent.click(screen.getByLabelText('Expandir OS'));
    await user.click(screen.getByRole('button', { name: 'Ações do projeto' }));

    const itens = screen.getAllByRole('menuitem').map(item => item.textContent);
    expect(itens).toEqual([
      'Nova tarefa',
      'Editar projeto',
      'Gerar tarefas do produto',
      'Mover as 1 tarefas para outro projeto',
      'Excluir projeto',
    ]);
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
    // Em `tudo` o vazio é o vazio: não há recorte a quem culpar.
    renderList({ isLoading: false, periodo: { ...periodoParado, escopo: 'tudo' } });

    expect(screen.getByText('Nenhum projeto ou tarefa encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Carregando projetos e tarefas…')).not.toBeInTheDocument();
  });

  it('no recorte de um mês, o vazio acusa o mês em vez de mandar criar projeto', () => {
    // "Crie um novo projeto para começar" num mês sem prazo manda a gestora
    // criar o que ela já tem — e o projeto está ali, no mês seguinte.
    renderList({ isLoading: false });

    expect(screen.getByText('Nada com prazo em agosto de 2026')).toBeInTheDocument();
    // A saída é a da barra, uma só: o vazio aponta para ela e não repete o botão.
    expect(screen.getAllByRole('button', { name: 'Ver tudo' })).toHaveLength(1);
    expect(screen.queryByText('Nenhum projeto ou tarefa encontrado')).not.toBeInTheDocument();
  });

  it('com dados parciais renderiza a lista, mesmo ainda carregando o resto', () => {
    renderList({ isLoading: true, projects: [projeto] });

    // A árvore abre recolhida, então o que prova que a lista renderizou é o
    // divisor do cliente — o nome do projeto só aparece depois de expandir.
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    expect(screen.queryByText('Carregando projetos e tarefas…')).not.toBeInTheDocument();
  });
});

describe('ProjetosTarefasList — responsável e prazo direto na linha', () => {
  // A gente do projeto — não o quadro do cluster. U4 fica de fora de propósito.
  const doProjeto = { p1: [{ id: 'U2', name: 'Geizi Andrade' }, { id: 'U3', name: 'Diego Melo' }] };

  const expandirAteTarefa = () => {
    fireEvent.click(screen.getByLabelText('Expandir OS'));
    fireEvent.click(screen.getByLabelText('Expandir projeto'));
  };

  it('troca o responsável sem abrir a tarefa, gravando id e nome juntos', async () => {
    const user = userEvent.setup();
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { assigned_to: 'U2' })],
      assigneesByProject: doProjeto,
    });
    expandirAteTarefa();

    await user.click(screen.getByLabelText('Responsável por Coleta'));
    await user.click(screen.getByRole('option', { name: 'Diego Melo' }));

    // O nome vai junto: a lista e os cartões leem assigned_to_name, não o perfil.
    expect(mocks.updateTask).toHaveBeenCalledWith({
      id: 'Coleta',
      assigned_to: 'U3',
      assigned_to_name: 'Diego Melo',
    });
  });

  it('escolher o mesmo responsável não grava nada', async () => {
    const user = userEvent.setup();
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { assigned_to: 'U2' })],
      assigneesByProject: doProjeto,
    });
    expandirAteTarefa();

    await user.click(screen.getByLabelText('Responsável por Coleta'));
    await user.click(screen.getByRole('option', { name: 'Geizi Andrade' }));

    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('troca o prazo pelo calendário da linha, em yyyy-MM-dd', async () => {
    const user = userEvent.setup();
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { due_date: '2026-08-17' })],
      assigneesByProject: doProjeto,
    });
    expandirAteTarefa();

    await user.click(screen.getByLabelText('Prazo de Coleta'));
    await user.click(screen.getByRole('button', { name: '20' }));

    expect(mocks.updateTask).toHaveBeenCalledWith({ id: 'Coleta', due_date: '2026-08-20' });
    // O calendário fecha ao escolher — o Popover não faz isso sozinho.
    expect(screen.queryByRole('button', { name: '20' })).not.toBeInTheDocument();
  });

  it('só oferece a gente do projeto, e mantém quem já está com a tarefa', async () => {
    const user = userEvent.setup();
    renderList({
      projects: [projeto],
      // Tarefa com alguém que saiu da equipe do projeto: o valor atual precisa
      // continuar selecionável, senão o seletor abre sem o próprio valor.
      tasks: [tarefa('Coleta', { assigned_to: 'U9', assigned_to_name: 'Ex-membro' })],
      assigneesByProject: doProjeto,
    });
    expandirAteTarefa();

    await user.click(screen.getByLabelText('Responsável por Coleta'));
    const opcoes = screen.getAllByRole('option').map(item => item.textContent);
    expect(opcoes).toEqual(['Não atribuído', 'Geizi Andrade', 'Diego Melo', 'Ex-membro']);
  });

  it('projeto sem gente cadastrada não abre seletor nenhum', () => {
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { assigned_to: null, assigned_to_name: null })],
      assigneesByProject: {},
    });
    expandirAteTarefa();

    expect(screen.queryByLabelText('Responsável por Coleta')).not.toBeInTheDocument();
    // Uma para a linha do projeto (sem responsável) e uma para a da tarefa.
    expect(screen.getAllByText('Não atribuído')).toHaveLength(2);
  });

  it('sem permissão de editar campos, as células só leem', () => {
    renderList({
      projects: [projeto],
      tasks: [tarefa('Coleta', { due_date: '2026-08-17' })],
      assigneesByProject: doProjeto,
      canEditTaskFields: () => false,
    });
    expandirAteTarefa();

    expect(screen.queryByLabelText('Responsável por Coleta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Prazo de Coleta')).not.toBeInTheDocument();
    // O status continua editável: o trigger da RLS-06 sempre o libera.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByText('Geizi Andrade')).toBeInTheDocument();
  });
});

describe('ProjetosTarefasList — troca de status pelo seletor', () => {
  const expandirAteTarefa = (titulo: string) => {
    fireEvent.click(screen.getByLabelText('Expandir OS'));
    fireEvent.click(screen.getByLabelText('Expandir projeto'));
    return screen.getByText(titulo);
  };

  it('mandar para revisão abre o diálogo e não grava direto', async () => {
    const user = userEvent.setup();
    renderList({ projects: [projeto], tasks: [tarefa('Coleta')] });
    expandirAteTarefa('Coleta');

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Revisão' }));

    // Quem grava é o diálogo, depois de exigir revisor e detalhamento.
    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Enviar para revisão' })).toBeInTheDocument();
    expect(screen.getByText('Revisor')).toBeInTheDocument();
    expect(screen.getByText('O que precisa ser revisado?')).toBeInTheDocument();
  });

  it('devolver para ajuste também passa pelo diálogo', async () => {
    const user = userEvent.setup();
    renderList({ projects: [projeto], tasks: [tarefa('Coleta', { status: 'review' })] });
    expandirAteTarefa('Coleta');

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Em Ajuste' }));

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Devolver para ajustes' })).toBeInTheDocument();
  });

  it('status sem transição de revisão continua gravando direto', async () => {
    const user = userEvent.setup();
    renderList({ projects: [projeto], tasks: [tarefa('Coleta')] });
    expandirAteTarefa('Coleta');

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Em Progresso' }));

    expect(mocks.updateTask).toHaveBeenCalledWith({ id: 'Coleta', status: 'in_progress' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
