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
  tarefas: [],
  onPasso: () => {},
  onHoje: () => {},
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
    await user.click(screen.getByRole('option', { name: 'Em Andamento' }));

    expect(mocks.updateTask).toHaveBeenCalledWith({ id: 'Coleta', status: 'in_progress' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ProjetosTarefasList — o texto inteiro da coluna Nome', () => {
  const tituloLongo = '1.4.1 Elaborar Protocolo e Justificativa da Reestruturação Societária';
  const projetoComOs = { ...projeto, ordem_servico_id: 'os1' } as unknown as OrgProject;
  const osRows = [{
    os_id: 'os1',
    numero_os: '035/2026',
    cliente_id: 'c1',
    cliente_nome: 'Cliente Um',
    servico_nome: null,
    data_fim: null,
    produtos: 'CC — Consultoria contábil, CHA — Canal de chamados',
  }];

  const renderComTarefaLonga = () => renderList({
    projects: [projetoComOs],
    tasks: [tarefa(tituloLongo, { assigned_to_name: 'Monica Matunaga' })],
    osRows,
  });

  it('o título da tarefa quebra em duas linhas em vez de sumir em reticências', () => {
    renderComTarefaLonga();
    fireEvent.click(screen.getByLabelText('Expandir OS'));
    fireEvent.click(screen.getByLabelText('Expandir projeto'));

    const titulo = screen.getByRole('button', { name: tituloLongo });
    expect(titulo.className).toContain('line-clamp-2');
    // Uma linha só era o defeito: no piso de 1.200px da grade sobram ~30
    // caracteres na subtarefa, e a tarefa mediana tem mais que isso.
    expect(titulo.className).not.toContain('truncate');
  });

  it('o mouse revela o texto na tarefa, na OS e no responsável — não só na linha do projeto', () => {
    renderComTarefaLonga();

    // A OS aparece fechada; as outras duas linhas pedem a árvore aberta.
    expect(screen.getByTitle('035/2026 - CC — Consultoria contábil, CHA — Canal de chamados')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expandir OS'));
    // O tooltip do projeto já existia, e é o único que mostra coisa diferente
    // do texto da linha: ali se lê o nome inteiro, não o encurtado.
    expect(screen.getByTitle('Projeto Alfa')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expandir projeto'));
    expect(screen.getByTitle(tituloLongo)).toBeInTheDocument();
    expect(screen.getByTitle('Monica Matunaga')).toBeInTheDocument();
  });
});

describe('ProjetosTarefasList — a grade reflui em cartão no celular', () => {
  /*
    No piso de 1.200px da grade, um celular de 358px úteis mostrava a PRIMEIRA
    das sete colunas — o nome — e status, responsável, prazo, esforço e
    progresso ficavam fora, alcançáveis só arrastando de lado.

    O conserto não remonta JSX: as mesmas sete células se refluem em duas
    colunas abaixo de `md`, com o nome ocupando a linha inteira. O cartão sai do
    refluxo. Estas asserções olham classe porque jsdom não calcula layout, e
    porque nenhuma delas dá erro de build se cair.
  */
  const comArvoreAberta = () => {
    renderList({
      projects: [projeto],
      tasks: [tarefa('Tarefa da lista', { assigned_to_name: 'Monica Matunaga' })],
    });
    fireEvent.click(screen.getByLabelText('Expandir OS'));
    fireEvent.click(screen.getByLabelText('Expandir projeto'));
  };

  /** A linha da grade é o ancestral que declara as sete colunas. */
  const linhaDaGrade = (dentro: HTMLElement) =>
    dentro.closest('[class*="grid-cols-["]');

  it('a linha larga de 1.200px deixa de valer no celular, e vira duas colunas', () => {
    comArvoreAberta();

    const linha = linhaDaGrade(screen.getByRole('button', { name: 'Tarefa da lista' }));
    expect(linha?.className).toContain('max-md:grid-cols-2');
    // Sem soltar o piso, as duas colunas continuariam somando 1.200px e a
    // rolagem de lado voltaria.
    expect(linha?.className).toContain('max-md:min-w-0');
  });

  it('o nome ocupa a linha inteira do cartão, e as outras cinco se dividem em duas', () => {
    comArvoreAberta();

    const nome = screen.getByRole('button', { name: 'Tarefa da lista' }).closest('div');
    expect(nome?.closest('[class*="col-span-2"]')).not.toBeNull();
  });

  it('o cabeçalho de coluna sai do celular, porque rótulo de coluna não sobrevive ao refluxo', () => {
    comArvoreAberta();

    const cabecalho = screen.getByText('Progresso').closest('[class*="grid-cols-["]');
    expect(cabecalho?.className).toContain('max-md:hidden');
  });

  it('o recuo da hierarquia vai por variável, porque estilo inline não tem breakpoint', () => {
    comArvoreAberta();

    const nome = screen
      .getByRole('button', { name: 'Tarefa da lista' })
      .closest('[class*="pl-[var("]') as HTMLElement | null;

    expect(nome?.className).toContain('pl-[var(--recuo)]');
    expect(nome?.className).toContain('max-md:pl-[var(--recuo-estreito)]');
    // 60px de base num telefone é um sexto da largura gasto antes da primeira
    // letra; o degrau curto mantém a hierarquia sem cobrar isso.
    expect(nome?.style.getPropertyValue('--recuo')).toBe('60px');
    expect(nome?.style.getPropertyValue('--recuo-estreito')).toBe('26px');
  });

  it('a guia vertical existe no celular, com x próprio — é ela que diz de que bloco a linha desce', () => {
    // A primeira versão escondia a guia no celular, e foi o que fez os quatro
    // níveis lerem como um: "parece que está tudo no mesmo nível, não tem
    // profundidade". Recuo sozinho é ambíguo — a guia mostra a descendência.
    comArvoreAberta();

    const guia = document
      .querySelector('[class*="max-md:left-[var("]') as HTMLElement | null;

    expect(guia).not.toBeNull();
    expect(guia?.className).not.toContain('max-md:hidden');
    expect(guia?.style.getPropertyValue('--guia-estreita')).toBeTruthy();
  });

  it('cada nível tem superfície própria em tela estreita', () => {
    // `primary/[0.045]` e `muted/30` são invisíveis num telefone. Sem separar as
    // superfícies, trilho e recuo não bastam.
    comArvoreAberta();

    const os = screen.getByText(/101\/2026|OS vinculada|Sem OS/).closest('[class*="grid-cols-["]');
    expect(os?.className).toContain('max-md:bg-primary/10');
    expect(os?.className).toContain('max-md:border-l-primary');

    const tarefa = linhaDaGrade(screen.getByRole('button', { name: 'Tarefa da lista' }));
    // A tarefa fica branca: é o contraste contra as tintas de cima que a marca
    // como o nível de baixo.
    expect(tarefa?.className).toContain('bg-background');
    expect(tarefa?.className).not.toContain('max-md:bg-');
  });

  it('o tooltip e as duas linhas do título sobrevivem ao cartão', () => {
    // Herdado da frente do Welber (`lista-de-tarefas-texto-e-prazo.md`): no
    // telefone não existe passar o mouse, então cartão que corta o título
    // perderia o texto sem saída nenhuma. As duas coisas continuam de pé.
    comArvoreAberta();

    const titulo = screen.getByRole('button', { name: 'Tarefa da lista' });
    expect(titulo.className).toContain('line-clamp-2');
    expect(titulo).toHaveAttribute('title', 'Tarefa da lista');
  });
});
