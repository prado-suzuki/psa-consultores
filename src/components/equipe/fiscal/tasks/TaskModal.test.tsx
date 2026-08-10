/**
 * Teste de caracterização (golden master) do TaskModal.
 *
 * Escrito ANTES da decomposição do arquivo (1423 linhas → fachada + partes),
 * conforme AGENTS.md §Decomposição. Ele trava o comportamento OBSERVÁVEL de
 * hoje: payloads exatos das mutations, ordem das chamadas, argumentos dos
 * hooks (query keys), textos da UI e os estados vazio / erro / carregando.
 *
 * Peculiaridades atuais são caracterizadas DE PROPÓSITO (ver comentários
 * "QUIRK"). Refatoração preserva comportamento, inclusive bugs — os achados
 * estão registrados em docs/geral/achados-taskmodal.md.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';

// Radix Select depende de Pointer Events, ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

type Call = [kind: 'create' | 'update' | 'comment', payload: Record<string, unknown>];

const mocks = vi.hoisted(() => ({
  user: {
    id: 'U1',
    email: 'bernardo@psa.com',
    user_metadata: {} as Record<string, string>,
  } as { id: string; email: string; user_metadata: Record<string, string> } | null,
  calls: [] as Call[],
  createTask: vi.fn(),
  updateTask: vi.fn(),
  createComment: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  restoreDraft: vi.fn(),
  clearDraft: vi.fn(),
  reviewerCandidates: [] as { id: string; name: string }[],
  reviewerCandidatesLoading: false,
  projects: [] as { id: string; name: string; external_client_id: string | null }[],
  projectMembers: [] as { user_id: string }[],
  clusterIds: [] as string[],
  allProfiles: [] as { id: string; first_name: string; last_name: string }[],
  externalClients: [] as { id: string; nome: string }[],
  contribuintes: [] as { id: string; nome_razao_social: string; cpf_cnpj: string | null }[],
  subtasks: [] as OrgTask[],
  hookArgs: {} as Record<string, unknown>,
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));

vi.mock('@/hooks/useOrgTasks', () => ({
  useOrgSubtasks: (parentTaskId?: string | null) => {
    mocks.hookArgs.useOrgSubtasks = parentTaskId;
    return { data: mocks.subtasks, isLoading: false };
  },
  useCreateOrgTask: (...args: unknown[]) => {
    mocks.hookArgs.useCreateOrgTask = args;
    return { mutateAsync: mocks.createTask, isPending: false };
  },
  useUpdateOrgTask: (...args: unknown[]) => {
    mocks.hookArgs.useUpdateOrgTask = args;
    return { mutateAsync: mocks.updateTask, isPending: false };
  },
  useCreateOrgTaskComment: (...args: unknown[]) => {
    mocks.hookArgs.useCreateOrgTaskComment = args;
    return { mutateAsync: mocks.createComment, isPending: false };
  },
}));

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: (editingClientId?: string | null) => {
    mocks.hookArgs.useExternalClients = editingClientId;
    return { data: mocks.externalClients };
  },
  useContribuintes: (clientId: string | null, editingContribuinteId?: string | null) => {
    mocks.hookArgs.useContribuintes = [clientId, editingContribuinteId];
    return { data: mocks.contribuintes };
  },
  useTeamProfilesSafe: () => ({ data: mocks.allProfiles }),
}));

vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectsList: (onlyActive?: boolean) => {
    mocks.hookArgs.useOrgProjectsList = onlyActive;
    return { data: mocks.projects };
  },
  useProjectMembers: (projectId?: string) => {
    mocks.hookArgs.useProjectMembers = projectId;
    return { data: mocks.projectMembers };
  },
  useOrgProjectClusterIds: (projectId?: string) => {
    mocks.hookArgs.useOrgProjectClusterIds = projectId;
    return { data: mocks.clusterIds };
  },
}));

vi.mock('@/hooks/useReviewerCandidates', () => ({
  useReviewerCandidates: (clusterIds: readonly string[]) => {
    mocks.hookArgs.useReviewerCandidates = clusterIds;
    return { data: mocks.reviewerCandidates, isLoading: mocks.reviewerCandidatesLoading };
  },
}));

vi.mock('@/hooks/useDraftPersistence', () => ({
  useDraftPersistence: (key: string, _values: unknown, enabled: boolean, userId?: string) => {
    mocks.hookArgs.useDraftPersistence = { key, enabled, userId };
    return { restore: mocks.restoreDraft, clear: mocks.clearDraft };
  },
}));

// O editor rich text tem teste próprio (ReviewRichText.test.tsx); aqui ele vira
// um textarea simples para controlar o valor que o TaskModal serializa.
vi.mock('@/components/equipe/fiscal/tasks/ReviewRichText', () => ({
  ReviewRichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label="comentario-revisao"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  ReviewRichTextContent: ({ value }: { value: string }) => (
    <span data-testid="rich-text-content">{value}</span>
  ),
}));

vi.mock('@/components/comentarios/OrgCommentsPanel', () => ({
  OrgCommentsPanel: ({
    entityId,
    projectId,
    focusComposerSignal,
  }: {
    entityId: string;
    projectId?: string | null;
    focusComposerSignal?: number;
  }) => (
    <aside
      data-testid="activity-panel"
      data-entity-id={entityId}
      data-project-id={projectId}
      data-focus-signal={focusComposerSignal}
    >
      <h2>Atividade</h2>
    </aside>
  ),
}));

// A listagem de anexos lê a thread de comentários pelo React Query; aqui só
// interessa que ela receba a tarefa certa.
vi.mock('@/components/comentarios/OrgCommentAttachments', () => ({
  OrgEntityAttachments: ({ entityId }: { entityId: string }) => (
    <div data-testid="anexos-agregados" data-entity-id={entityId} />
  ),
}));

import { TaskModal } from './TaskModal';

// ── Fixtures ────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  { id: 'U1', name: 'Bernardo' },
  { id: 'U2', name: 'Ana' },
];

const ALL_PROFILES = [
  { id: 'U1', first_name: 'Bernardo', last_name: 'K' },
  { id: 'U2', first_name: 'Ana', last_name: 'S' },
  { id: 'U9', first_name: 'Zeca', last_name: 'M' },
  { id: 'REV1', first_name: 'Rita', last_name: 'Rev' },
];

const PROJECTS = [
  { id: 'PRJ1', name: 'Projeto Alfa', external_client_id: 'CLI1' },
  { id: 'PRJ2', name: 'Projeto Beta', external_client_id: 'CLI2' },
];

const CLIENTS = [
  { id: 'CLI1', nome: 'Cliente Um' },
  { id: 'CLI2', nome: 'Cliente Dois' },
];

const CONTRIBUINTES = [
  { id: 'CTB1', nome_razao_social: 'Contribuinte Um', cpf_cnpj: '11.111.111/0001-11' },
];

const baseTask: OrgTask = {
  id: 'T1',
  title: 'Tarefa existente',
  description: 'Descrição existente',
  status: 'in_progress',
  priority: 'high',
  assigned_to: 'U1',
  assigned_to_name: 'Bernardo',
  reviewer_id: null,
  created_by: 'U1',
  due_date: '2026-04-10',
  due_time: null,
  is_recurring: false,
  recurrence_type: null,
  category: 'task',
  tags: [],
  estimated_hours: 5,
  actual_hours: null,
  parent_task_id: null,
  start_date: '2026-04-01',
  project_id: 'PRJ1',
  client_id: 'CLI1',
  contribuinte_id: 'CTB1',
  created_at: '2026-04-01T10:00:00.000Z',
  updated_at: '2026-04-01T10:00:00.000Z',
  client: { id: 'CLI1', nome: 'Cliente Um' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderModal(overrides: Partial<React.ComponentProps<typeof TaskModal>> = {}) {
  const props: React.ComponentProps<typeof TaskModal> = {
    open: true,
    onOpenChange: vi.fn(),
    area: 'tax',
    teamMembers: TEAM_MEMBERS,
    ...overrides,
  };
  return { ...render(<TaskModal {...props} />), props };
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  option: RegExp,
) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: option }));
}

/** Seleciona um dia do mês corrente no date picker do campo `label`. */
async function pickDate(user: ReturnType<typeof userEvent.setup>, label: RegExp, day: number) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('button', { name: String(day) }));
  await user.keyboard('{Escape}');
}

/** Mensagens de validação atualmente renderizadas, em ordem de DOM. */
function formMessages() {
  return Array.from(document.querySelectorAll('p[id$="-form-item-message"]')).map(
    (node) => node.textContent,
  );
}

/** Seção "Anexos" do corpo da edição (há mais de um botão "Adicionar" na tela). */
function anexosSection() {
  return screen.getByRole('heading', { name: 'Anexos' }).closest('section') as HTMLElement;
}

/** Seção "Subtarefas" do corpo da edição. */
function subtarefasSection() {
  return screen.getByRole('heading', { name: /Subtarefas/ }).closest('section') as HTMLElement;
}

/** O diálogo de ação de revisão (segundo Dialog do componente). */
function reviewDialog() {
  const dialogs = screen.getAllByRole('dialog');
  return dialogs[dialogs.length - 1];
}

function dayOfCurrentMonth(day: number) {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), day), 'yyyy-MM-dd');
}

const kinds = () => mocks.calls.map(([kind]) => kind);
const payloadOf = (kind: Call[0]) => mocks.calls.find(([k]) => k === kind)?.[1];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.user = { id: 'U1', email: 'bernardo@psa.com', user_metadata: {} };
  mocks.reviewerCandidates = [
    { id: 'REV1', name: 'Rita Rev' },
    { id: 'U1', name: 'Bernardo K' },
  ];
  mocks.reviewerCandidatesLoading = false;
  mocks.projects = PROJECTS;
  mocks.projectMembers = [{ user_id: 'U1' }, { user_id: 'U2' }, { user_id: 'U9' }];
  mocks.clusterIds = ['CLU1'];
  mocks.allProfiles = ALL_PROFILES;
  mocks.externalClients = CLIENTS;
  mocks.contribuintes = CONTRIBUINTES;
  mocks.subtasks = [];
  mocks.hookArgs = {};
  mocks.restoreDraft.mockReturnValue(null);
  mocks.createTask.mockImplementation(async (input: Record<string, unknown>) => {
    mocks.calls.push(['create', input]);
    return { id: 'T-NOVA' };
  });
  mocks.updateTask.mockImplementation(async (input: Record<string, unknown>) => {
    mocks.calls.push(['update', input]);
    return { id: input.id };
  });
  mocks.createComment.mockImplementation(async (input: Record<string, unknown>) => {
    mocks.calls.push(['comment', input]);
    return { id: 'C-NOVO' };
  });
});

describe('TaskModal — wiring dos hooks', () => {
  it('instancia os hooks de dados com os mesmos argumentos de hoje', () => {
    renderModal({ task: baseTask });

    expect(mocks.hookArgs.useCreateOrgTask).toEqual(['tax', { showToasts: false }]);
    expect(mocks.hookArgs.useUpdateOrgTask).toEqual(['tax', { showToasts: false }]);
    expect(mocks.hookArgs.useCreateOrgTaskComment).toEqual([{ showToasts: false, area: 'tax' }]);
    expect(mocks.hookArgs.useOrgProjectsList).toBe(true);
    expect(mocks.hookArgs.useProjectMembers).toBe('PRJ1');
    expect(mocks.hookArgs.useOrgProjectClusterIds).toBe('PRJ1');
    expect(mocks.hookArgs.useReviewerCandidates).toEqual(['CLU1']);
    expect(mocks.hookArgs.useExternalClients).toBe('CLI1');
    expect(mocks.hookArgs.useContribuintes).toEqual(['CLI1', 'CTB1']);
  });

  it('em tarefa nova consulta comentários com id vazio e habilita o rascunho', () => {
    renderModal();

    expect(mocks.hookArgs.useDraftPersistence).toEqual({
      key: 'fiscal-task-draft',
      enabled: true,
      userId: 'U1',
    });
    // Sem projeto selecionado os hooks dependentes recebem undefined/null.
    expect(mocks.hookArgs.useProjectMembers).toBeUndefined();
    expect(mocks.hookArgs.useExternalClients).toBeNull();
    expect(mocks.hookArgs.useContribuintes).toEqual([null, null]);
  });

  it('desabilita o rascunho durante a edição', () => {
    renderModal({ task: baseTask });

    expect(mocks.hookArgs.useDraftPersistence).toEqual({
      key: 'fiscal-task-draft',
      enabled: false,
      userId: 'U1',
    });
  });
});

describe('TaskModal — criação', () => {
  it('espelha a anatomia da edição: título grande, contexto aberto e pílulas', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Nova Tarefa' })).toBeInTheDocument();
    // Contexto aberto: na criação não há o que esconder atrás de "Alterar
    // contexto", os campos ainda precisam ser escolhidos.
    expect(screen.queryByRole('button', { name: /Alterar contexto/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Projeto/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cliente/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contribuinte/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tarefa Pai/)).toBeInTheDocument();

    // As mesmas pílulas da edição, no lugar da antiga seção "Execução".
    expect(screen.getByLabelText('Status')).toHaveTextContent('A Fazer');
    expect(screen.getByLabelText('Prioridade')).toHaveTextContent('Média');
    expect(screen.getByLabelText(/^Responsável/)).toHaveTextContent('Selecione');
    expect(screen.getByLabelText(/^Início/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Vencimento/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Horas realizadas/)).toBeDisabled();
    expect(screen.queryByText('Execução')).not.toBeInTheDocument();
    expect(screen.queryByText('Contexto')).not.toBeInTheDocument();

    // Ações na barra do topo, como na edição — sem rodapé fixo.
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('cria a tarefa com o payload exato e fecha o modal', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    expect(screen.getByRole('heading', { name: 'Nova Tarefa' })).toBeInTheDocument();

    // Selecionar o projeto preenche o cliente automaticamente (Effect B).
    await chooseOption(user, /^Projeto/, /Projeto Alfa/);
    await waitFor(() => expect(screen.getByLabelText(/^Cliente/)).toHaveTextContent('Cliente Um'));

    await chooseOption(user, /^Contribuinte/, /Contribuinte Um/);
    await user.type(screen.getByLabelText(/^Título/), 'Nova tarefa fiscal');
    await user.type(screen.getByLabelText(/^Descrição/), 'Descrição da tarefa');
    await chooseOption(user, /^Responsável/, /^Ana$/);
    await user.type(screen.getByLabelText(/^Horas estimadas/), '4');
    await pickDate(user, /^Início/, 10);
    await pickDate(user, /^Vencimento/, 20);

    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledTimes(1));
    const payload = payloadOf('create')!;
    expect(payload).toEqual({
      title: 'Nova tarefa fiscal',
      description: 'Descrição da tarefa',
      status: 'todo',
      priority: 'medium',
      assigned_to: 'U2',
      assigned_to_name: 'Ana',
      reviewer_id: null,
      due_date: dayOfCurrentMonth(20),
      start_date: dayOfCurrentMonth(10),
      parent_task_id: undefined,
      project_id: 'PRJ1',
      client_id: 'CLI1',
      contribuinte_id: 'CTB1',
      estimated_hours: 4,
      actual_hours: null,
    });
    expect(Object.keys(payload).sort()).toEqual([
      'actual_hours',
      'assigned_to',
      'assigned_to_name',
      'client_id',
      'contribuinte_id',
      'description',
      'due_date',
      'estimated_hours',
      'parent_task_id',
      'priority',
      'project_id',
      'reviewer_id',
      'start_date',
      'status',
      'title',
    ]);

    expect(kinds()).toEqual(['create']);
    expect(mocks.clearDraft).toHaveBeenCalled();
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.toast.success).toHaveBeenCalledWith('Tarefa criada com sucesso');
  });

  it('bloqueia o envio e mostra as mensagens de campo obrigatório', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    // QUIRK caracterizado: campos de select/número vazios caem na mensagem
    // padrão do zod ("Required"/"Expected number...") em vez das mensagens
    // customizadas, porque chegam como `undefined` e não como string vazia.
    //
    // A ordem é a do DOM depois do redesenho: título, cartão de contexto
    // (projeto → cliente → contribuinte), faixa de propriedades (responsável,
    // datas, esforço) e, por último, a descrição.
    expect(formMessages()).toEqual([
      'Título é obrigatório',
      'Projeto é obrigatório',
      'Required',
      'Required',
      'Required',
      'Data de Início é obrigatória',
      'Data de Vencimento é obrigatória',
      'Expected number, received nan',
      'Descrição é obrigatória',
    ]);
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it('restaura o rascunho e exibe o aviso', async () => {
    mocks.restoreDraft.mockReturnValue({ title: 'Rascunho salvo', description: 'Do rascunho' });
    renderModal();

    expect(
      await screen.findByText('Rascunho restaurado — clique em Salvar para confirmar.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveValue('Rascunho salvo');
  });

  it('limpa o rascunho ao cancelar', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mocks.clearDraft).toHaveBeenCalledTimes(1);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('TaskModal — edição', () => {
  it('preenche o formulário a partir da tarefa e salva com o payload exato', async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ task: baseTask });

    expect(screen.getByRole('heading', { name: 'Editar Tarefa' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveValue('Tarefa existente');
    expect(screen.getByLabelText(/^Descrição/)).toHaveValue('Descrição existente');
    expect(screen.getByLabelText(/^Horas estimadas/)).toHaveValue(5);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadOf('update')).toEqual({
      id: 'T1',
      title: 'Tarefa existente',
      description: 'Descrição existente',
      status: 'in_progress',
      priority: 'high',
      assigned_to: 'U1',
      assigned_to_name: 'Bernardo',
      reviewer_id: null,
      due_date: '2026-04-10',
      start_date: '2026-04-01',
      parent_task_id: undefined,
      project_id: 'PRJ1',
      client_id: 'CLI1',
      contribuinte_id: 'CTB1',
      estimated_hours: 5,
      // QUIRK caracterizado: `actual_hours` null vira 0 no payload — o reset
      // preenche o campo com '' e o `z.coerce.number()` do union converte ''
      // para 0 antes do check `=== ''`. Ver docs/geral/achados-taskmodal.md.
      actual_hours: 0,
      reviewTransitionValidated: false,
    });
    expect(kinds()).toEqual(['update']);
    expect(mocks.toast.success).toHaveBeenCalledWith('Tarefa atualizada');
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('exige horas realizadas ao concluir e envia o número', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await chooseOption(user, /^Status/, /^Concluído$/);
    expect(await screen.findByText(/informe as/i, { selector: 'span' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe as horas realizadas')).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Horas realizadas/), '7');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadOf('update')).toMatchObject({ status: 'done', actual_hours: 7 });
  });

  it('segura o salvamento quando as horas parecem erro de digitação', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await chooseOption(user, /^Status/, /^Concluído$/);
    await user.type(screen.getByLabelText(/^Horas realizadas/), '70');

    expect(
      await screen.findByText('70h é 14× as 5h estimadas — confira a digitação.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Confirme o aviso')).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Está certo' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadOf('update')).toMatchObject({ status: 'done', actual_hours: 70 });
  });

  it('corrige as horas pelo valor sugerido no aviso', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await chooseOption(user, /^Status/, /^Concluído$/);
    await user.type(screen.getByLabelText(/^Horas realizadas/), '70');
    await user.click(await screen.findByRole('button', { name: 'Usar 7h' }));

    expect(screen.getByLabelText(/^Horas realizadas/)).toHaveValue(7);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledTimes(1));
    expect(payloadOf('update')).toMatchObject({ status: 'done', actual_hours: 7 });
  });

  it('mostra erro do servidor sem fechar o modal', async () => {
    const user = userEvent.setup();
    mocks.updateTask.mockRejectedValueOnce(new Error('RLS negou a operação'));
    const { props } = renderModal({ task: baseTask });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('RLS negou a operação'));
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });

  it('restringe o Responsável aos membros do projeto, resolvendo nomes por perfil', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await user.click(screen.getByLabelText(/^Responsável/));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    // Ordenado por nome (pt-BR); 'Zeca M' vem de allProfiles (fora do cluster Tax).
    expect(options).toEqual(['Nenhum', 'Ana', 'Bernardo', 'Zeca M']);
  });

  it('esconde os status de revisão que não são o status atual da tarefa', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await user.click(screen.getByLabelText(/^Status/));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual([
      'Backlog',
      'Pendente Cliente',
      'A Fazer',
      'Em Progresso',
      'Concluído',
    ]);
  });

  it('lista apenas as tarefas-pai do projeto selecionado', async () => {
    const user = userEvent.setup();
    const parentTasks = [
      { ...baseTask, id: 'P1', title: 'Pai do Alfa', project_id: 'PRJ1' },
      { ...baseTask, id: 'P2', title: 'Pai do Beta', project_id: 'PRJ2' },
    ];
    renderModal({ task: baseTask, parentTasks });

    // Na edição os campos de contexto ficam atrás de "Alterar contexto".
    await user.click(screen.getByRole('button', { name: /Alterar contexto/ }));
    await user.click(screen.getByLabelText(/Tarefa Pai/));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['Nenhuma', 'Pai do Alfa']);
  });
});

describe('TaskModal — cabeçalho da edição', () => {
  it('mostra o contexto da tarefa como texto e o título como campo', () => {
    renderModal({ task: baseTask, parentTasks: [{ ...baseTask, id: 'P1', title: 'Pai do Alfa' }] });

    expect(screen.getByLabelText(/^Título/)).toHaveValue('Tarefa existente');
    // Cliente, projeto e contribuinte viram texto — sem select à mostra.
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    expect(screen.getByText('Projeto Alfa')).toBeInTheDocument();
    expect(screen.getByText(/Contribuinte Um · 11\.111\.111\/0001-11/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Cliente/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Tarefa Pai/)).not.toBeInTheDocument();
  });

  it('abre o painel de contexto sozinho quando o contexto reprova na validação', async () => {
    const user = userEvent.setup();
    renderModal({ task: { ...baseTask, contribuinte_id: null } });

    expect(screen.queryByLabelText(/^Contribuinte/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    // Sem isso a mensagem de erro ficaria escondida dentro do painel fechado.
    expect(await screen.findByLabelText(/^Contribuinte/)).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('não oferece Salvar nem Cancelar no rodapé — as ações vivem no cabeçalho', () => {
    renderModal({ task: baseTask });

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });
});

describe('TaskModal — enviar para revisão', () => {
  const sendableTask = { ...baseTask, assigned_to: 'U1', assigned_to_name: 'Bernardo' };

  async function openSendDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Enviar para revisão/ }));
    expect(await screen.findByRole('heading', { name: 'Enviar para revisão' })).toBeInTheDocument();
  }

  /** O select de revisor é o único combobox do diálogo de revisão. */
  async function chooseReviewer(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(within(reviewDialog()).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name }));
  }

  it('salva a tarefa e o comentário de sistema, nessa ordem', async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ task: sendableTask });

    await openSendDialog(user);
    await chooseReviewer(user, 'Rita Rev');
    await user.type(screen.getByLabelText('comentario-revisao'), 'Revisar os cálculos');
    await user.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(1));
    expect(kinds()).toEqual(['update', 'comment']);
    expect(payloadOf('update')).toMatchObject({
      id: 'T1',
      status: 'review',
      reviewer_id: 'REV1',
      reviewTransitionValidated: true,
    });
    expect(payloadOf('comment')).toEqual({
      taskId: 'T1',
      comment: '[[review-rich-text:v1]]Revisar os cálculos'.replace(
        '[[review-rich-text:v1]]',
        'Enviado para revisão de Rita Rev: [[review-rich-text:v1]]',
      ),
      userName: 'Bernardo K',
      isSystem: true,
    });

    expect(await screen.findByText('Enviado para revisão!')).toBeInTheDocument();
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledWith(false), { timeout: 3000 });
    expect(mocks.toast.success).toHaveBeenCalledWith('Tarefa atualizada');
  });

  it('exige revisor e comentário antes de qualquer mutation', async () => {
    const user = userEvent.setup();
    renderModal({ task: sendableTask });

    await openSendDialog(user);
    await user.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('Selecione quem fará a revisão')).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();

    await chooseReviewer(user, 'Rita Rev');
    await user.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    expect(await screen.findByText('Informe o que precisa ser revisado')).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it('remove o próprio responsável da lista de revisores', async () => {
    const user = userEvent.setup();
    renderModal({ task: sendableTask });

    await openSendDialog(user);
    await user.click(within(reviewDialog()).getByRole('combobox'));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['Rita Rev']);
  });

  it('mostra o estado de carregando dos revisores', async () => {
    const user = userEvent.setup();
    mocks.reviewerCandidatesLoading = true;
    renderModal({ task: sendableTask });

    await openSendDialog(user);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(within(reviewDialog()).getByRole('combobox')).toBeDisabled();
  });

  it('quando o comentário falha, avisa e não regrava a tarefa na segunda tentativa', async () => {
    const user = userEvent.setup();
    mocks.createComment.mockRejectedValueOnce(new Error('offline'));
    const { props } = renderModal({ task: sendableTask });

    await openSendDialog(user);
    await chooseReviewer(user, 'Rita Rev');
    await user.type(screen.getByLabelText('comentario-revisao'), 'Revisar');
    await user.click(screen.getByRole('button', { name: 'Confirmar envio' }));

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'A tarefa foi salva, mas o comentário obrigatório não foi registrado. Tente salvar novamente.',
      ),
    );
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(kinds()).toEqual(['update']);

    await user.click(screen.getByRole('button', { name: 'Confirmar envio' }));
    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(2));
    // A tarefa já estava salva: só o comentário é reenviado.
    expect(kinds()).toEqual(['update', 'comment']);
  });

  it('não oferece o envio para revisão quando a tarefa é de outra pessoa', () => {
    renderModal({ task: { ...baseTask, assigned_to: 'U2', assigned_to_name: 'Ana' } });

    expect(screen.queryByRole('button', { name: /Enviar para revisão/ })).not.toBeInTheDocument();
  });
});

describe('TaskModal — revisor delegado', () => {
  const reviewTask: OrgTask = {
    ...baseTask,
    status: 'review',
    assigned_to: 'U2',
    assigned_to_name: 'Ana',
    reviewer_id: 'U1',
  };

  it('mostra o aviso de revisão delegada e bloqueia a edição dos campos', () => {
    renderModal({ task: reviewTask });

    expect(screen.getByText('Revisão delegada a você')).toBeInTheDocument();
    expect(
      screen.getByText(/Revise a tarefa de Ana e escolha uma ação ao final\./),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aprovar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solicitar ajustes/ })).toBeInTheDocument();
  });

  it('aprovar grava o comentário "Tarefa aprovada"', async () => {
    const user = userEvent.setup();
    renderModal({ task: reviewTask });

    await user.click(screen.getByRole('button', { name: /Aprovar/ }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(1));
    expect(kinds()).toEqual(['update', 'comment']);
    // QUIRK caracterizado: aprovar move a tarefa para 'em_ajuste', não para
    // 'done' nem mantém 'review'. Preservado na refatoração — ver
    // docs/geral/achados-taskmodal.md.
    expect(payloadOf('update')).toMatchObject({
      id: 'T1',
      status: 'em_ajuste',
      reviewTransitionValidated: true,
    });
    expect(payloadOf('comment')).toEqual({
      taskId: 'T1',
      comment: 'Tarefa aprovada',
      userName: 'Bernardo K',
      isSystem: true,
    });
    expect(await screen.findByText('Revisão aprovada!')).toBeInTheDocument();
  });

  it('solicitar ajustes exige o comentário e grava o prefixo "Devolvido para ajustes"', async () => {
    const user = userEvent.setup();
    renderModal({ task: reviewTask });

    await user.click(screen.getByRole('button', { name: /Solicitar ajustes/ }));
    expect(await screen.findByRole('heading', { name: 'Solicitar ajustes' })).toBeInTheDocument();
    // No modo ajustes não há seleção de revisor, apenas o responsável atual.
    const dialog = reviewDialog();
    expect(within(dialog).getByText('Responsável pelos ajustes')).toBeInTheDocument();
    expect(within(dialog).getByText('Ana')).toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Devolver para ajustes' }));
    expect(await screen.findByText('Informe o que precisa ser ajustado')).toBeInTheDocument();
    expect(mocks.updateTask).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('comentario-revisao'), 'Corrigir a base de cálculo');
    await user.click(screen.getByRole('button', { name: 'Devolver para ajustes' }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(1));
    expect(kinds()).toEqual(['update', 'comment']);
    expect(payloadOf('update')).toMatchObject({
      status: 'em_ajuste',
      reviewTransitionValidated: true,
    });
    expect(payloadOf('comment')).toEqual({
      taskId: 'T1',
      comment: 'Devolvido para ajustes: [[review-rich-text:v1]]Corrigir a base de cálculo',
      userName: 'Bernardo K',
      isSystem: true,
    });
    expect(await screen.findByText('Ajustes solicitados!')).toBeInTheDocument();
  });

  it('mostra o status atual da revisão e mantém o select bloqueado', async () => {
    const user = userEvent.setup();
    renderModal({ task: reviewTask });

    const status = screen.getByLabelText(/^Status/);
    expect(status).toHaveTextContent('Revisão');
    // O fieldset inteiro está desabilitado para o revisor (no browser o select
    // nem abre); a lista abaixo trava o filtro: 'Concluído' some para o revisor
    // e 'Em Ajuste' some por não ser o status atual da tarefa.
    expect(status).toBeDisabled();
    await user.click(status);
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['Backlog', 'Pendente Cliente', 'A Fazer', 'Em Progresso', 'Revisão']);
  });

  it('usa o nome do metadata/email quando o perfil do usuário não existe', async () => {
    const user = userEvent.setup();
    mocks.allProfiles = ALL_PROFILES.filter((p) => p.id !== 'U1');
    renderModal({ task: reviewTask });

    await user.click(screen.getByRole('button', { name: /Aprovar/ }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledTimes(1));
    expect(payloadOf('comment')).toMatchObject({ userName: 'bernardo@psa.com' });
  });
});

describe('TaskModal — atividade', () => {
  it('renderiza o painel unificado na edição com os ids da tarefa e do projeto', () => {
    renderModal({ task: baseTask });

    expect(screen.getByRole('heading', { name: 'Atividade' })).toBeInTheDocument();
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-entity-id', 'T1');
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-project-id', 'PRJ1');
  });

  it('não renderiza atividade antes de a tarefa existir', () => {
    renderModal();
    expect(screen.queryByRole('heading', { name: 'Atividade' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('anexos-agregados')).not.toBeInTheDocument();
  });

  it('lista os anexos da thread na coluna de detalhes', () => {
    renderModal({ task: baseTask });

    expect(screen.getByTestId('anexos-agregados')).toHaveAttribute('data-entity-id', 'T1');
  });

  it('"Adicionar" anexo leva o foco para o compositor do painel', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-focus-signal', '0');
    await user.click(within(anexosSection()).getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-focus-signal', '1');
  });
});

describe('TaskModal — subtarefas', () => {
  const subtask = (overrides: Partial<OrgTask>): OrgTask => ({
    ...baseTask,
    id: 'S1',
    title: 'Mapeamento - Revisão de IRPF',
    status: 'todo',
    priority: 'medium',
    assigned_to: null,
    assigned_to_name: null,
    parent_task_id: 'T1',
    ...overrides,
  });

  it('consulta as subtarefas da tarefa aberta e mostra o progresso', () => {
    mocks.subtasks = [
      subtask({ id: 'S1', assigned_to: 'U2', assigned_to_name: 'Ana' }),
      subtask({ id: 'S2', title: 'Mapeamento - Livro Caixa', status: 'done', priority: 'high' }),
    ];
    renderModal({ task: baseTask });

    expect(mocks.hookArgs.useOrgSubtasks).toBe('T1');
    const secao = subtarefasSection();
    expect(within(secao).getByText('Mapeamento - Revisão de IRPF')).toBeInTheDocument();
    expect(within(secao).getByText('Mapeamento - Livro Caixa')).toBeInTheDocument();
    expect(within(secao).getByText('1/2 concluídas')).toBeInTheDocument();
    expect(within(secao).getByLabelText('Responsável de Mapeamento - Livro Caixa')).toHaveTextContent(
      'Atribuir',
    );
    expect(within(secao).getByLabelText('Prioridade de Mapeamento - Livro Caixa')).toHaveTextContent(
      'Alta',
    );
  });

  it('vem antes dos anexos no corpo da edição', () => {
    renderModal({ task: baseTask });

    const ordem = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent ?? '');
    const posicao = (titulo: string) => ordem.findIndex((texto) => texto.startsWith(titulo));
    expect(posicao('Subtarefas')).toBeGreaterThan(posicao('Descrição'));
    expect(posicao('Subtarefas')).toBeLessThan(posicao('Anexos'));
  });

  it('cria a subtarefa com o nome digitado, herdando projeto e cliente da tarefa-mãe', async () => {
    const user = userEvent.setup();
    renderModal({ task: baseTask });

    await user.click(
      within(subtarefasSection()).getByRole('button', { name: /Adicionar subtarefa/ }),
    );
    await user.type(screen.getByLabelText('Nome da nova subtarefa'), 'Revisão PIS/COFINS{Enter}');

    await waitFor(() => expect(kinds()).toEqual(['create']));
    expect(payloadOf('create')).toEqual({
      title: 'Revisão PIS/COFINS',
      status: 'todo',
      priority: 'medium',
      parent_task_id: 'T1',
      project_id: 'PRJ1',
      client_id: 'CLI1',
    });
    // A tarefa-mãe não é salva junto: o Enter não vaza para o form do modal.
    expect(screen.getByLabelText('Nome da nova subtarefa')).toHaveValue('');
  });

  it('não oferece criação ao revisor delegado', () => {
    renderModal({
      task: { ...baseTask, status: 'review', assigned_to: 'U2', reviewer_id: 'U1' },
    });

    const secao = subtarefasSection();
    expect(
      within(secao).queryByRole('button', { name: /Adicionar subtarefa/ }),
    ).not.toBeInTheDocument();
    expect(within(secao).queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
  });
});
