/**
 * Teste do ProjetoDialog depois do redesenho (duas colunas na edição, com a
 * thread de atividade à direita — mesma anatomia do TaskModal).
 *
 * A criação espelha essa anatomia em coluna única (nome, contexto, pílulas,
 * equipe e descrição), sem a thread.
 *
 * Trava o comportamento observável: qual layout cada modo renderiza, o que o
 * painel de atividade recebe (entidade `org_project`), quais campos ficam atrás
 * de "Alterar contexto" e que as ações continuam chamando `handleSubmit` /
 * `handleCloseModal` do controller — nada de Supabase no componente.
 */
import { useState, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgProject, OrgProjectFormData } from '@/hooks/useOrgProjects';
import type { ProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { EMPTY_PROJECT_FORM } from '@/lib/projetosCadastro';

// Radix Select depende de Pointer Events, ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
  scrollIntoView: { configurable: true, value: () => undefined },
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const mocks = vi.hoisted(() => ({
  handleSubmit: vi.fn(),
  handleCloseModal: vi.fn(),
  setIsModalOpen: vi.fn(),
}));

vi.mock('@/components/comentarios/OrgCommentsPanel', () => ({
  OrgCommentsPanel: ({
    entityType,
    entityId,
    projectId,
    area,
    focusComposerSignal,
    consolidarTarefas,
  }: {
    entityType?: string;
    entityId: string;
    projectId?: string | null;
    area: string;
    focusComposerSignal?: number;
    consolidarTarefas?: boolean;
  }) => (
    <aside
      data-testid="activity-panel"
      data-entity-type={entityType}
      data-entity-id={entityId}
      data-project-id={projectId}
      data-area={area}
      data-focus-signal={focusComposerSignal}
      data-consolidado={String(!!consolidarTarefas)}
    >
      <h2>Atividade</h2>
    </aside>
  ),
}));

vi.mock('@/components/comentarios/OrgCommentAttachments', () => ({
  OrgEntityAttachments: ({
    entityType,
    entityId,
    consolidarTarefas,
  }: {
    entityType?: string;
    entityId: string;
    consolidarTarefas?: boolean;
  }) => (
    <div
      data-testid="anexos-agregados"
      data-entity-type={entityType}
      data-entity-id={entityId}
      data-consolidado={String(!!consolidarTarefas)}
    />
  ),
}));

import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

// ── Fixtures ────────────────────────────────────────────────────────────────

const PROJECT: OrgProject = {
  id: 'PRJ1',
  name: 'Projeto Alfa',
  description: 'Descrição existente',
  status: 'active',
  start_date: '2026-04-01',
  end_date: '2026-06-30',
  created_at: '2026-04-01T10:00:00.000Z',
  responsible_id: 'U2',
  leader_id: 'U1',
  external_client_id: 'CLI1',
  contribuinte_id: null,
  estrutura_area_id: 'AREA1',
  equipe_id: 'EQ1',
  is_multidisciplinar: false,
  objective: null,
  ordem_servico_id: 'OS1',
  servico_id: null,
  produto_segmento_id: 'PRD1',
};

const EDIT_FORM: OrgProjectFormData = {
  ...EMPTY_PROJECT_FORM,
  name: 'Projeto Alfa',
  description: 'Descrição existente',
  status: 'active',
  start_date: '2026-04-01',
  end_date: '2026-06-30',
  leader_ids: ['U1'],
  responsible_id: 'U2',
  external_client_id: 'CLI1',
  estrutura_area_id: 'AREA1',
  equipe_id: 'EQ1',
  member_ids: ['U3'],
  ordem_servico_id: 'OS1',
};

const PROFILES = [
  { id: 'U1', first_name: 'Bernardo', last_name: 'K' },
  { id: 'U2', first_name: 'Ana', last_name: 'S' },
  { id: 'U3', first_name: 'Zeca', last_name: 'M' },
];

/**
 * Controller de teste: mantém `formData` em estado real, para que digitar no
 * nome ou trocar o status reflita na tela como no app.
 */
function Harness({
  editingProject,
  initialForm,
  children,
}: {
  editingProject: OrgProject | null;
  initialForm: OrgProjectFormData;
  children: ReactNode;
}) {
  const [formData, setFormData] = useState(initialForm);
  const controller = {
    area: 'tax',
    isModalOpen: true,
    setIsModalOpen: mocks.setIsModalOpen,
    editingProject,
    formData,
    setFormData,
    handleSubmit: mocks.handleSubmit,
    handleCloseModal: mocks.handleCloseModal,
    createProject: { isPending: false },
    updateProject: { isPending: false },
    externalClients: [
      { id: 'CLI1', nome: 'Cliente Um' },
      { id: 'CLI2', nome: 'Cliente Dois' },
    ],
    equipesOptions: [
      { id: 'EQ1', name: 'Equipe Fiscal', area_id: 'AREA1', area_name: 'Tributário' },
      { id: 'EQ2', name: 'Equipe OSG', area_id: 'AREA2', area_name: 'Societário' },
    ],
    clienteOS: [
      {
        id: 'OS1',
        numero_os: '1234',
        situacao: 'em_andamento',
        data_emissao: '2026-03-01',
        data_inicio: '2026-04-01',
        data_fim: '2026-06-30',
      },
    ],
    osProdutosByOs: {
      OS1: [{ produto_segmento_id: 'PRD1', produto_codigo: 'REC', produto_nome: 'Recuperação' }],
    },
    selectedOsId: 'OS1',
    setSelectedOsId: vi.fn(),
    selectedOsProdutos: [
      { produto_segmento_id: 'PRD1', produto_codigo: 'REC', produto_nome: 'Recuperação' },
    ],
    selectedProdutoId: 'PRD1',
    setSelectedProdutoId: vi.fn(),
    teamMembers: PROFILES,
    lideres: PROFILES,
    executores: PROFILES,
    equipeId: 'EQ1',
    equipeMemberIds: ['U3'],
    availableMembers: PROFILES,
    availableMembersByArea: [],
    memberSearch: '',
    setMemberSearch: vi.fn(),
    collapsedAreaGroups: new Set<string>(),
    toggleAreaGroup: vi.fn(),
    handleMemberToggle: vi.fn(),
    // O controller real expõe muito mais (filtros, agrupamento, exclusão), nada
    // disso é lido pelo modal.
  } as unknown as ProjetosCadastroController;

  return (
    <ProjetosCadastroContext.Provider value={controller}>
      {children}
    </ProjetosCadastroContext.Provider>
  );
}

function renderEdit() {
  return render(
    <Harness editingProject={PROJECT} initialForm={EDIT_FORM}>
      <ProjetoDialog />
    </Harness>,
  );
}

function renderCreate() {
  return render(
    <Harness editingProject={null} initialForm={{ ...EMPTY_PROJECT_FORM }}>
      <ProjetoDialog />
    </Harness>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjetoDialog — edição', () => {
  it('mostra o nome como campo e o contexto do projeto como texto', () => {
    renderEdit();

    expect(screen.getByRole('heading', { name: 'Editar Projeto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Projeto')).toHaveValue('Projeto Alfa');
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    expect(screen.getByText('Nº 1234')).toBeInTheDocument();
    expect(screen.getByText('REC — Recuperação')).toBeInTheDocument();
    expect(screen.getByText('Equipe Fiscal · Tributário')).toBeInTheDocument();
    // Os selects de contexto só existem depois de "Alterar contexto".
    expect(screen.queryByLabelText('Cliente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Equipe')).not.toBeInTheDocument();
  });

  it('abre cliente, equipe e OS atrás de "Alterar contexto"', async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.click(screen.getByRole('button', { name: /Alterar contexto/ }));

    expect(await screen.findByLabelText('Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipe')).toBeInTheDocument();
    expect(screen.getByText('Ordens de Serviço Vinculadas')).toBeInTheDocument();
  });

  it('renderiza a faixa de propriedades com status, responsável e período', () => {
    renderEdit();

    expect(screen.getByLabelText('Status')).toHaveTextContent('Ativo');
    expect(screen.getByLabelText('Responsável')).toHaveTextContent('Ana S');
    // Período herdado da OS: pílula de leitura com a data formatada, sem campo
    // para digitar. Quem muda o período muda a OS.
    expect(screen.getByLabelText('Início')).toHaveValue('01/04/2026');
    expect(screen.getByLabelText('Término')).toHaveValue('30/06/2026');
    expect(screen.getByLabelText('Início')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Término')).toHaveAttribute('readonly');
    // O responsável não é repetido na seção Equipe.
    expect(screen.queryByText('Responsável Executor')).not.toBeInTheDocument();
  });

  it('edita nome e descrição pelo formData do controller', async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.clear(screen.getByLabelText('Nome do Projeto'));
    await user.type(screen.getByLabelText('Nome do Projeto'), 'Projeto Beta');
    expect(screen.getByLabelText('Nome do Projeto')).toHaveValue('Projeto Beta');

    await user.type(screen.getByLabelText('Descrição do Projeto'), ' ampliada');
    expect(screen.getByLabelText('Descrição do Projeto')).toHaveValue(
      'Descrição existente ampliada',
    );
  });

  it('coloca a thread de atividade do projeto ao lado, sem Cancelar no rodapé', () => {
    renderEdit();

    const panel = screen.getByTestId('activity-panel');
    expect(panel).toHaveAttribute('data-entity-type', 'org_project');
    expect(panel).toHaveAttribute('data-entity-id', 'PRJ1');
    expect(panel).toHaveAttribute('data-project-id', 'PRJ1');
    expect(panel).toHaveAttribute('data-area', 'tax');
    // A thread do projeto é a soma das conversas dele — inclusive as das tarefas.
    expect(panel).toHaveAttribute('data-consolidado', 'true');

    expect(screen.getByTestId('anexos-agregados')).toHaveAttribute(
      'data-entity-type',
      'org_project',
    );
    expect(screen.getByTestId('anexos-agregados')).toHaveAttribute('data-entity-id', 'PRJ1');
    // Mesmo recorte do painel: os dois compartilham a query key.
    expect(screen.getByTestId('anexos-agregados')).toHaveAttribute('data-consolidado', 'true');

    expect(screen.getByRole('button', { name: /Salvar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('"Adicionar" anexo leva o foco para o compositor do painel', async () => {
    const user = userEvent.setup();
    renderEdit();

    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-focus-signal', '0');
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-focus-signal', '1');
  });

  it('Salvar delega para o handleSubmit do controller', async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.click(screen.getByRole('button', { name: /Salvar/ }));

    expect(mocks.handleSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('ProjetoDialog — criação', () => {
  it('espelha a anatomia da edição em coluna única, sem thread de atividade', () => {
    renderCreate();

    expect(screen.getByRole('heading', { name: 'Novo Projeto' })).toBeInTheDocument();
    expect(screen.queryByTestId('activity-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('anexos-agregados')).not.toBeInTheDocument();

    // Nome em corpo grande e contexto aberto: aqui não há o que esconder atrás
    // de "Alterar contexto", os campos ainda precisam ser escolhidos.
    expect(screen.queryByRole('button', { name: /Alterar contexto/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Projeto')).toHaveValue('');
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipe')).toBeInTheDocument();

    // As mesmas pílulas da edição: status, responsável e período.
    expect(screen.getByLabelText('Status')).toHaveTextContent('Ativo');
    expect(screen.getByLabelText('Responsável')).toHaveTextContent('Selecione');
    // Sem OS escolhida ainda não há período: o travessão é o vazio da pílula de
    // leitura, que espera a data vir da OS.
    expect(screen.getByLabelText('Início')).toHaveValue('—');
    expect(screen.getByLabelText('Término')).toHaveValue('—');

    expect(screen.getByLabelText('Descrição do Projeto')).toBeInTheDocument();
    // O responsável executor não é repetido na seção Equipe, como na edição.
    expect(screen.queryByText('Responsável Executor')).not.toBeInTheDocument();
  });

  it('Criar e Cancelar delegam para o controller', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(mocks.handleSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.handleCloseModal).toHaveBeenCalledTimes(1);
  });
});
