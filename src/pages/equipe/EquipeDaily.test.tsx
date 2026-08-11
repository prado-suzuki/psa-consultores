import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

Object.defineProperties(Element.prototype, {
  hasPointerCapture: { value: () => false, configurable: true },
  setPointerCapture: { value: () => undefined, configurable: true },
  releasePointerCapture: { value: () => undefined, configurable: true },
});

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useDomainEquipeDaily: vi.fn(),
  refetchStandups: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn(),
  copy: vi.fn(),
  exportStandups: vi.fn(),
  updateTaskStatus: vi.fn(),
  toast: vi.fn(),
  jsonToSheet: vi.fn(),
  bookNew: vi.fn(),
  appendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/useDomainEquipeDaily', () => ({
  useDomainEquipeDaily: mocks.useDomainEquipeDaily,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useClusters', () => ({
  useClusters: () => ({ data: [{ id: 'cluster-1', nome: 'OSG', ativo: true }] }),
}));
vi.mock('@/hooks/useDailySprintTasks', () => ({
  useDailySprintTasks: () => ({ data: [], isLoading: false }),
  useUpdateDailyTaskStatus: () => ({ mutateAsync: mocks.updateTaskStatus, isPending: false }),
}));
vi.mock('@/hooks/useDomainDailySprintProgress', () => ({
  useDomainDailySprintProgress: () => ({ data: [], isLoading: false }),
}));
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mocks.jsonToSheet,
    book_new: mocks.bookNew,
    book_append_sheet: mocks.appendSheet,
  },
  writeFile: mocks.writeFile,
}));
// O editor rico (TipTap) é trocado por um textarea: aqui interessa a fiação da tela,
// e o formato de gravação do rich text é coberto nos testes de src/lib/equipeDaily.
vi.mock('@/components/equipe/TarefaRichTextEditor', () => ({
  TarefaRichTextEditor: ({
    value,
    onChange,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

import EquipeDaily from '@/pages/equipe/EquipeDaily';
import { toDailyRichText } from '@/lib/equipeDaily';

const members = [
  { id: 'auth-user', first_name: 'Ana', last_name: 'Silva' },
  { id: 'other-user', first_name: 'Bruno', last_name: 'Souza' },
];
const sprints = [{ id: 'sprint-1', name: 'Sprint Julho' }];
const projects = [{ id: 'project-1', name: 'Portal PSA' }];
const processes = [
  { id: 'process-1', name: 'Apuração', project_id: 'project-1' },
  { id: 'process-2', name: 'Processo avulso', project_id: null },
];
const ownStandup = {
  id: 'daily-own',
  user_id: 'auth-user',
  date: '2026-07-20',
  did_yesterday: '**Entrega concluída**',
  will_do_today: 'Revisar relatório',
  blockers: 'Acesso pendente',
  sprint_id: 'sprint-1',
  project_id: 'project-1',
  process_id: 'process-1',
  created_at: '2026-07-20T13:45:00.000Z',
};
const otherStandup = {
  ...ownStandup,
  id: 'daily-other',
  user_id: 'other-user',
  did_yesterday: 'Outra entrega',
  will_do_today: 'Outra tarefa',
  blockers: null,
  sprint_id: null,
  project_id: null,
  process_id: null,
};

type Results = {
  teamMembersResult?: { roleProfiles?: typeof members; additionalProfiles?: typeof members };
  sprintsResult?: { data: typeof sprints };
  projectsResult?: { data: typeof projects };
  processesResult?: { data: typeof processes };
  standupsResult?: {
    myStandup?: typeof ownStandup | null;
    standups?: Array<typeof ownStandup>;
    hasNextPage?: boolean;
  };
};

let results: Results;

function setResults(overrides: Results = {}) {
  results = {
    teamMembersResult: { roleProfiles: members, additionalProfiles: [] },
    sprintsResult: { data: sprints },
    projectsResult: { data: projects },
    processesResult: { data: processes },
    standupsResult: { myStandup: null, standups: [] },
    ...overrides,
  };
}

function latestDomainArgs() {
  return mocks.useDomainEquipeDaily.mock.calls.at(-1)?.[0];
}

function renderAfterAuthHydration() {
  mocks.useAuth.mockReturnValue({ user: null });
  const rendered = render(<EquipeDaily />);
  mocks.useAuth.mockReturnValue({ user: { id: 'auth-user' } });
  rendered.rerender(<EquipeDaily />);
  return rendered;
}

async function chooseSelect(user: ReturnType<typeof userEvent.setup>, index: number, option: string) {
  await user.click(screen.getAllByRole('combobox')[index]);
  await user.click(await screen.findByRole('option', { name: option }));
}

/** Quem/sprint/projeto/processo ficam recolhidos: abre o painel antes de trocar. */
async function openContext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Ajustar contexto/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ user: { id: 'auth-user' } });
  mocks.update.mockResolvedValue(undefined);
  mocks.insert.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.copy.mockResolvedValue(null);
  mocks.exportStandups.mockImplementation(async () => results.standupsResult?.standups ?? []);
  mocks.refetchStandups.mockResolvedValue(undefined);
  mocks.jsonToSheet.mockReturnValue({ sheet: true });
  mocks.bookNew.mockReturnValue({ book: true });
  setResults();
  mocks.useDomainEquipeDaily.mockImplementation(() => ({
    ...results,
    refetchStandups: mocks.refetchStandups,
    updateDailyStandup: { mutateAsync: mocks.update },
    insertDailyStandup: { mutateAsync: mocks.insert },
    deleteDailyStandup: { mutateAsync: mocks.remove },
    fetchStandupsForExport: mocks.exportStandups,
    copyFromYesterday: { mutateAsync: mocks.copy },
  }));
});

describe('EquipeDaily — caracterização', () => {
  it('hidrata a pessoa selecionada quando o usuário autenticado chega depois do primeiro render', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    const { rerender } = render(<EquipeDaily />);

    expect(latestDomainArgs()).toMatchObject({ userId: undefined });
    expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeDisabled();
    expect(screen.getByText('Sem membro selecionado')).toBeInTheDocument();

    mocks.useAuth.mockReturnValue({ user: { id: 'auth-user' } });
    rerender(<EquipeDaily />);

    // O membro sai do dropdown e vira o resumo do contexto, já com o usuário logado.
    await waitFor(() => expect(screen.getByText('Ana Silva (você)')).toBeInTheDocument());
    expect(latestDomainArgs().userId).toBe('auth-user');
    expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeEnabled();
  });

  it('sugere a sprint ativa mais atual sem abrir o painel de contexto', async () => {
    const user = userEvent.setup();
    setResults({
      sprintsResult: {
        data: [
          { id: 'sprint-1', name: 'Sprint Julho', status: 'completed', start_date: '2026-07-01' },
          { id: 'sprint-2', name: 'Sprint Agosto', status: 'active', start_date: '2026-08-01' },
        ] as unknown as typeof sprints,
      },
    });
    renderAfterAuthHydration();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sprint Agosto' })).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Descreva suas entregas de ontem...'), 'Ontem');
    await user.type(screen.getByPlaceholderText('Suas tarefas para hoje...'), 'Hoje');
    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'auth-user',
      sprint_id: 'sprint-2',
    }));
  });

  it('não sobrescreve a sprint de um daily já registrado com a sprint ativa', async () => {
    setResults({
      sprintsResult: {
        data: [
          { id: 'sprint-1', name: 'Sprint Julho', status: 'completed', start_date: '2026-07-01' },
          { id: 'sprint-2', name: 'Sprint Agosto', status: 'active', start_date: '2026-08-01' },
        ] as unknown as typeof sprints,
      },
      standupsResult: { myStandup: ownStandup, standups: [ownStandup] },
    });
    renderAfterAuthHydration();

    expect(await screen.findByRole('button', { name: 'Atualizar Daily' })).toBeInTheDocument();
    expect(screen.getAllByText('Sprint Julho').length).toBeGreaterThanOrEqual(1);
    // O card mostra a sprint vigente, mas o contexto do daily permanece na sprint gravada.
    expect(screen.getByRole('heading', { name: 'Sprint Agosto' })).toBeInTheDocument();
  });

  it('deduplica perfis adicionais e preserva os textos do formulário e do estado vazio', async () => {
    const user = userEvent.setup();
    setResults({
      teamMembersResult: {
        roleProfiles: [members[0]],
        additionalProfiles: [members[0], members[1]],
      },
    });
    render(<EquipeDaily />);

    await openContext(user);
    await user.click(screen.getAllByRole('combobox')[0]);
    expect(screen.getAllByRole('option', { name: 'Ana Silva (você)' })).toHaveLength(1);
    expect(screen.getAllByRole('option', { name: 'Bruno Souza' })).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('heading', { name: 'Daily Standup' })).toBeInTheDocument();
    // A dica de [ROTINA] saiu da tela.
    expect(screen.queryByText(/\[ROTINA\]/)).not.toBeInTheDocument();
    expect(screen.getByText('Daily (15 min)')).toBeInTheDocument();
    expect(screen.getByText('Histórico de Dailys')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descreva suas entregas de ontem...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Suas tarefas para hoje...')).toBeInTheDocument();
    expect(screen.getByText('Nenhum daily encontrado para os filtros selecionados')).toBeInTheDocument();
    expect(screen.getByText('Tente alterar a data ou os filtros')).toBeInTheDocument();
  });

  it('traz o plano anterior sempre para o usuário autenticado, mesmo com outra pessoa selecionada', async () => {
    const user = userEvent.setup();
    mocks.copy.mockResolvedValue({ will_do_today: 'Plano autenticado', date: '2026-07-19' });
    renderAfterAuthHydration();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeEnabled());

    await openContext(user);
    await chooseSelect(user, 0, 'Bruno Souza');
    await user.click(screen.getByRole('button', { name: 'Trazer plano de ontem' }));

    expect(mocks.copy).toHaveBeenCalledWith({
      copyUserId: 'auth-user',
      copyDate: new Date().toISOString().split('T')[0],
    });
    expect(screen.getByPlaceholderText('Descreva suas entregas de ontem...')).toHaveValue('Plano autenticado');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Plano trazido',
      description: expect.stringContaining('19/07/2026'),
    }));
  });

  it('insere daily para a pessoa selecionada, converte opcionais vazios em null e refaz a consulta', async () => {
    const user = userEvent.setup();
    renderAfterAuthHydration();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeEnabled());

    await openContext(user);
    await chooseSelect(user, 0, 'Bruno Souza');
    expect(screen.getByText('Você está registrando a daily de outra pessoa.')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Descreva suas entregas de ontem...'), 'Fechei a análise');
    await user.type(screen.getByPlaceholderText('Suas tarefas para hoje...'), 'Enviar parecer');
    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));

    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: 'other-user',
      date: new Date().toISOString().split('T')[0],
      did_yesterday: 'Fechei a análise',
      will_do_today: 'Enviar parecer',
      blockers: null,
      sprint_id: null,
      project_id: null,
      process_id: null,
    });
    await waitFor(() => expect(mocks.refetchStandups).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Daily registrado',
      description: 'O registro foi salvo com sucesso.',
    });
  });

  it('barra o envio quando ontem ou hoje estão vazios (o editor rico não tem required nativo)', async () => {
    const user = userEvent.setup();
    renderAfterAuthHydration();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Preencha ontem e hoje',
      description: 'Descreva o que você fez ontem e o que vai fazer hoje.',
      variant: 'destructive',
    });

    // Só um dos dois preenchido também não passa.
    await user.type(screen.getByPlaceholderText('Descreva suas entregas de ontem...'), 'Fechei a análise');
    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));
    expect(mocks.insert).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Suas tarefas para hoje...'), 'Enviar parecer');
    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('hidrata meu daily, atualiza com o payload completo e faz refetch manual', async () => {
    const user = userEvent.setup();
    setResults({ standupsResult: { myStandup: ownStandup, standups: [ownStandup] } });
    renderAfterAuthHydration();

    expect(await screen.findByRole('button', { name: 'Atualizar Daily' })).toBeInTheDocument();
    expect(screen.getByText('Registrado')).toBeInTheDocument();
    const yesterday = screen.getAllByPlaceholderText('Descreva suas entregas de ontem...')[0];
    await user.clear(yesterday);
    await user.type(yesterday, 'Entrega atualizada');
    await user.click(screen.getByRole('button', { name: 'Atualizar Daily' }));

    // Com o contexto recolhido o processo hidratado sobrevive ao update: no layout
    // antigo os Selects montavam junto da hidratação e zeravam process_id.
    expect(mocks.update).toHaveBeenCalledWith({
      standupId: 'daily-own',
      payload: {
        did_yesterday: 'Entrega atualizada',
        will_do_today: 'Revisar relatório',
        blockers: 'Acesso pendente',
        sprint_id: 'sprint-1',
        project_id: 'project-1',
        process_id: 'process-1',
      },
    });
    await waitFor(() => expect(mocks.refetchStandups).toHaveBeenCalledTimes(1));
  });

  it('aplica filtros no hook, persiste somente pessoa e sprint e limpa todos os filtros', async () => {
    const user = userEvent.setup();
    render(<EquipeDaily />);
    // Com o contexto do formulário recolhido, sobram os 3 filtros do histórico
    // (Pessoa, Sprint, Cluster).
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(3));

    const dates = screen.getAllByDisplayValue('')
      .filter((element) => element.getAttribute('type') === 'date');
    await user.type(dates[0], '2026-07-01');
    await user.type(dates[1], '2026-07-31');
    await chooseSelect(user, 0, 'Bruno Souza');
    await chooseSelect(user, 1, 'Sprint Julho');

    // Os controles são um rascunho: ainda não disparam consultas a cada alteração.
    expect(latestDomainArgs().filters).toEqual({
      startDate: '',
      endDate: '',
      person: 'all',
      sprint: 'all',
    });
    // pessoa + sprint (daily) + cluster (chave compartilhada 'rotina.cluster', default '').
    expect(localStorage.length).toBe(3);
    expect(localStorage.getItem('rotina.daily.pessoa')).toBe('"other-user"');
    expect(localStorage.getItem('rotina.daily.sprint')).toBe('"sprint-1"');
    expect(localStorage.getItem('rotina.cluster')).toBe('""');

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(latestDomainArgs().filters).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      person: 'other-user',
      sprint: 'sprint-1',
    });
    // A troca da query key faz a busca; não há refetch duplicado da chave anterior.
    expect(mocks.refetchStandups).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Limpar Filtros' }));
    expect(latestDomainArgs().filters).toEqual({ startDate: '', endDate: '', person: 'all', sprint: 'all' });
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Filtros limpos',
      description: 'Todos os filtros foram removidos.',
    });
  });

  it('avança o histórico paginado sem carregar todos os dailys', async () => {
    const user = userEvent.setup();
    setResults({
      standupsResult: { myStandup: ownStandup, standups: [ownStandup], hasNextPage: true },
    });
    render(<EquipeDaily />);

    expect(await screen.findByText('Página 1')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Go to next page' }));

    expect(latestDomainArgs().page).toBe(2);
  });

  it('renderiza cards, contexto e ações somente no daily do usuário autenticado', async () => {
    setResults({ standupsResult: { myStandup: ownStandup, standups: [ownStandup, otherStandup] } });
    const { container } = render(<EquipeDaily />);

    expect(await screen.findByText('Entrega concluída')).toBeInTheDocument();
    expect(screen.getAllByText('Revisar relatório')).toHaveLength(2);
    expect(screen.getByText('Bloqueio:')).toBeInTheDocument();
    expect(screen.getAllByText('Portal PSA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Apuração').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sem sprint')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bruno Souza').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('.lucide-pencil')).toHaveLength(1);
    expect(container.querySelector('.lucide-pencil')!.closest('div')!.querySelectorAll('button')).toHaveLength(2);
  });

  it('edita e exclui o próprio card com payloads e refetch após cada mutation', async () => {
    const user = userEvent.setup();
    setResults({ standupsResult: { myStandup: ownStandup, standups: [ownStandup] } });
    const { container } = render(<EquipeDaily />);
    await waitFor(() => expect(container.querySelector('.lucide-pencil')).toBeInTheDocument());
    const actionButtons = container.querySelector('.lucide-pencil')!.closest('div')!.querySelectorAll('button');
    const deleteButton = actionButtons[1];

    await user.click(container.querySelector('.lucide-pencil')!.closest('button')!);
    expect(screen.getByRole('heading', { name: 'Editar Daily' })).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    const blockers = within(dialog).getByPlaceholderText('Algum impedimento ou bloqueio?');
    await user.clear(blockers);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }));

    // Abrir um daily antigo no editor rico converte o markdown em nós de verdade
    // (o negrito vira marca), então salvar regrava o campo já no formato novo.
    expect(mocks.update).toHaveBeenCalledWith({
      standupId: 'daily-own',
      payload: {
        did_yesterday: toDailyRichText('**Entrega concluída**'),
        will_do_today: 'Revisar relatório',
        blockers: null,
      },
    });
    await waitFor(() => expect(mocks.refetchStandups).toHaveBeenCalledTimes(1));

    await user.click(deleteButton);
    expect(await screen.findByText('Esta ação não pode ser desfeita. O registro do daily será permanentemente removido.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(mocks.remove).toHaveBeenCalledWith('daily-own');
    await waitFor(() => expect(mocks.refetchStandups).toHaveBeenCalledTimes(2));
  });

  it('exporta os cards exibidos para XLSX e informa o estado sem dados', async () => {
    const user = userEvent.setup();
    setResults({ standupsResult: { myStandup: ownStandup, standups: [ownStandup] } });
    const { rerender } = render(<EquipeDaily />);
    await waitFor(() => expect(screen.getAllByText('Revisar relatório')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.jsonToSheet).toHaveBeenCalledWith([
      expect.objectContaining({
        Membro: 'Ana Silva',
        Sprint: 'Sprint Julho',
        Projeto: 'Portal PSA',
        Processo: 'Apuração',
        Ontem: '**Entrega concluída**',
        Hoje: 'Revisar relatório',
        Bloqueios: 'Acesso pendente',
      }),
    ]);
    expect(mocks.appendSheet).toHaveBeenCalledWith({ book: true }, { sheet: true }, 'Dailys');
    expect(mocks.writeFile).toHaveBeenCalledWith({ book: true }, expect.stringMatching(/^dailys_\d{2}-\d{2}-\d{4}\.xlsx$/));
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Excel exportado',
      description: '1 daily(s) exportado(s) com sucesso.',
    });

    setResults();
    rerender(<EquipeDaily />);
    await waitFor(() => expect(screen.getByText('Nenhum daily encontrado para os filtros selecionados')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenLastCalledWith({
      title: 'Sem dados',
      description: 'Não há dailys para exportar.',
      variant: 'destructive',
    });
  });

  it('mantém textos de erro e não refaz consulta quando salvar falha', async () => {
    const user = userEvent.setup();
    mocks.insert.mockRejectedValue(new Error('falha esperada'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderAfterAuthHydration();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar Daily' })).toBeEnabled());
    await user.type(screen.getByPlaceholderText('Descreva suas entregas de ontem...'), 'Ontem');
    await user.type(screen.getByPlaceholderText('Suas tarefas para hoje...'), 'Hoje');
    await user.click(screen.getByRole('button', { name: 'Registrar Daily' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Erro',
      description: 'Não foi possível salvar o daily.',
      variant: 'destructive',
    }));
    expect(mocks.refetchStandups).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
