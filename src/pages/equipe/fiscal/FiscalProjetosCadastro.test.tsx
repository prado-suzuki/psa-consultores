import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { OrgProject } from '@/hooks/useOrgProjects';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// APIs de pointer ausentes no jsdom e exigidas pelos componentes Radix reais.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => {} },
  releasePointerCapture: { configurable: true, value: () => {} },
});
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useOrgProjects: vi.fn(),
  useProjectMembers: vi.fn(),
  useProjectHours: vi.fn(),
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  useTeamProfilesSafe: vi.fn(),
  useTeamRolesForProjects: vi.fn(),
  useExternalClients: vi.fn(),
  useClienteOrdens: vi.fn(),
  useClusterIdByPageCategory: vi.fn(),
  useDashboardProjectIds: vi.fn(),
  useOsProdutosContratados: vi.fn(),
  useEstruturaEquipe: vi.fn(),
  useEstruturaEquipesByCategory: vi.fn(),
  useTeamMembersByArea: vi.fn(),
  useProjectMemberAreas: vi.fn(),
  useDomainFiscalProjetosCadastro: vi.fn(),
  resolveProdutoIdByServico: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
  location: { pathname: '/equipe/osg/projetos/cadastro', state: null as unknown },
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => mocks.location,
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/components/equipe/fiscal/FiscalLayout', () => ({
  FiscalLayout: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) => (
    <main data-testid="fiscal-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) => (
    <main data-testid="osg-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));
vi.mock('@/components/equipe/tarefas/PainelTarefas', () => ({
  default: ({ area }: { area: string }) => <section data-testid="projetos-tarefas">Painel consolidado {area}</section>,
}));
vi.mock('@/hooks/useTaxReferenceData', () => ({
  useTeamProfilesSafe: mocks.useTeamProfilesSafe,
  useTeamRolesForProjects: mocks.useTeamRolesForProjects,
  useExternalClients: mocks.useExternalClients,
  useClienteOrdens: mocks.useClienteOrdens,
  useClusterIdByPageCategory: mocks.useClusterIdByPageCategory,
}));
vi.mock('@/hooks/useClientFormOptions', () => ({
  useClientFormOptions: () => ({ produtoSegmentoFullOptions: [] }),
}));
vi.mock('@/hooks/useOsProdutosContratados', () => ({
  useOsProdutosContratados: mocks.useOsProdutosContratados,
  groupByOs: (items: Array<{ ordem_servico_id: string }>) =>
    items.reduce<Record<string, Array<{ ordem_servico_id: string }>>>((acc, item) => {
      (acc[item.ordem_servico_id] ||= []).push(item);
      return acc;
    }, {}),
}));
vi.mock('@/hooks/useDomainFiscalProjetosCadastro', () => ({
  useDomainFiscalProjetosCadastro: mocks.useDomainFiscalProjetosCadastro,
}));
vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjects: mocks.useOrgProjects,
  useProjectMembers: mocks.useProjectMembers,
  useProjectHours: mocks.useProjectHours,
  useCreateOrgProject: () => ({ mutate: mocks.createMutate, isPending: false }),
  useUpdateOrgProject: () => ({ mutate: mocks.updateMutate, isPending: false }),
  useDeleteOrgProject: () => ({ mutate: mocks.deleteMutate, isPending: false }),
}));
vi.mock('@/hooks/useEstruturaEquipe', () => ({ useEstruturaEquipe: mocks.useEstruturaEquipe }));
vi.mock('@/hooks/useEstruturaEquipes', () => ({
  useEstruturaEquipesByCategory: mocks.useEstruturaEquipesByCategory,
}));
vi.mock('@/hooks/useDashboardProjectIds', () => ({
  useDashboardProjectIds: mocks.useDashboardProjectIds,
}));
vi.mock('@/hooks/useTeamMembersByArea', () => ({
  useTeamMembersByArea: mocks.useTeamMembersByArea,
}));
vi.mock('@/hooks/useProjectMemberAreas', () => ({
  useProjectMemberAreas: mocks.useProjectMemberAreas,
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

// A thread de atividade e a listagem de anexos do modal têm testes próprios
// (OrgCommentsPanel.test.tsx / OrgCommentAttachments.test.tsx) e falam com o
// React Query; aqui só interessa que recebam o projeto certo.
vi.mock('@/components/comentarios/OrgCommentsPanel', () => ({
  OrgCommentsPanel: ({ entityType, entityId }: { entityType?: string; entityId: string }) => (
    <aside data-testid="activity-panel" data-entity-type={entityType} data-entity-id={entityId} />
  ),
}));
vi.mock('@/components/comentarios/OrgCommentAttachments', () => ({
  OrgEntityAttachments: ({ entityType, entityId }: { entityType?: string; entityId: string }) => (
    <div data-testid="anexos-agregados" data-entity-type={entityType} data-entity-id={entityId} />
  ),
}));

import FiscalProjetosCadastro, {
  ProjetosCadastroContent,
} from '@/pages/equipe/fiscal/FiscalProjetosCadastro';
import OsgProjetos from '@/pages/equipe/osg/OsgProjetos';
import {
  filterAndSortProjects,
  groupProjects,
  validateProjectForm,
  EMPTY_PROJECT_FORM,
} from '@/lib/projetosCadastro';

const members = [
  { id: 'leader-1', first_name: 'Lia', last_name: 'Líder' },
  { id: 'member-1', first_name: 'Eva', last_name: 'Executora' },
  { id: 'member-2', first_name: 'Mia', last_name: 'Membro' },
  { id: 'admin-1', first_name: 'Ada', last_name: 'Admin' },
];

const roles = [
  { user_id: 'leader-1', role: 'lider' },
  { user_id: 'member-1', role: 'team_member' },
  { user_id: 'member-2', role: 'sublider' },
  { user_id: 'admin-1', role: 'admin' },
];

// Espelha o que `buildMembersList` grava: uma linha por pessoa, com o papel dela
// NO projeto. A responsável executora entra como 'responsible', não como 'member'
// — e é ela que o modal precisa reconhecer para não abrir "Membros" vazio.
const currentMembers = [
  { project_id: 'project-tax', user_id: 'leader-1', role: 'leader' },
  { project_id: 'project-tax', user_id: 'member-2', role: 'member' },
  { project_id: 'project-tax', user_id: 'member-1', role: 'responsible' },
];

const taxProject = {
  id: 'project-tax',
  name: 'Zeta Tax',
  description: 'Descrição original',
  status: 'active',
  start_date: '2026-02-10',
  end_date: '2026-11-20',
  leader_id: 'leader-1',
  leader: members[0],
  responsible_id: 'member-1',
  responsible: members[1],
  external_client_id: 'client-1',
  external_client: { id: 'client-1', nome: 'Beta Cliente' },
  estrutura_area_id: 'area-tax',
  equipe_id: 'team-tax',
  equipe_ref: { id: 'team-tax', name: 'Equipe Fiscal' },
  is_multidisciplinar: false,
  ordem_servico_id: 'os-1',
  servico_id: 'service-1',
  servico_contratado: 'Produto Z',
  servico_nome: 'Revisão fiscal',
};

const completedProject = {
  ...taxProject,
  id: 'project-completed',
  name: 'Alfa Tax',
  status: 'completed',
  external_client_id: 'client-2',
  external_client: { id: 'client-2', nome: 'Alfa Cliente' },
  equipe_id: null,
  equipe_ref: null,
  ordem_servico_id: 'os-2',
  servico_contratado: 'Produto A',
};

const osgProject = {
  ...taxProject,
  id: 'project-osg',
  name: 'Projeto Geográfico',
  estrutura_area_id: 'area-osg',
};

const ordens = [
  {
    id: 'os-1',
    numero_os: '001/2026',
    situacao: 'em_andamento',
    data_emissao: '2026-01-05',
    data_inicio: '2026-01-10',
    data_fim: '2026-12-20',
  },
];

const produtos = [
  {
    ordem_servico_id: 'os-1',
    produto_segmento_id: 'product-1',
    produto_codigo: 'P01',
    produto_nome: 'Consultoria',
    horas_contratadas: 40,
  },
  {
    ordem_servico_id: 'os-2',
    produto_segmento_id: 'product-2',
    produto_codigo: 'P02',
    produto_nome: 'Auditoria',
    horas_contratadas: 12,
  },
];

// Os rótulos obrigatórios do modal usam <RequiredMark /> — o "*" fica num
// <span>, então o texto direto do <label> é só o nome do campo. Daí os
// matchers ancorados (/^Cliente/) em vez de 'Cliente *'.
async function chooseSelect(containerText: string | RegExp, option: string | RegExp) {
  const user = userEvent.setup();
  const label = screen.getByText(containerText, { selector: 'label' });
  const container = label.parentElement;
  if (!container) throw new Error('Select sem container');
  await user.click(within(container).getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: option }));
}

function inputNear(labelText: string | RegExp) {
  const label = screen.getByText(labelText, { selector: 'label' });
  const input = label.parentElement?.querySelector('input, textarea');
  if (!input) throw new Error('Campo sem input');
  return input as HTMLInputElement | HTMLTextAreaElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.location.state = null;
  mocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
  mocks.useOrgProjects.mockReturnValue({
    data: [taxProject, completedProject, osgProject],
    isLoading: false,
  });
  mocks.useClusterIdByPageCategory.mockImplementation((area: string) => ({ data: `cluster-${area}` }));
  mocks.useDashboardProjectIds.mockImplementation((clusterId: string, includeOrphans: boolean) => ({
    ids: new Set(
      clusterId === 'cluster-osg'
        ? ['project-osg']
        : includeOrphans
          ? ['project-tax', 'project-completed']
          : [],
    ),
  }));
  mocks.useProjectHours.mockReturnValue({ data: {} });
  mocks.useProjectMemberAreas.mockReturnValue({
    data: {
      'project-tax': { ids: ['area-tax'], names: ['Fiscal'] },
      'project-completed': { ids: [], names: [] },
    },
  });
  mocks.useProjectMembers.mockImplementation((id?: string) => ({
    data: id === 'project-tax' ? currentMembers : [],
  }));
  mocks.useTeamProfilesSafe.mockReturnValue({ data: members });
  mocks.useTeamRolesForProjects.mockReturnValue({ data: roles });
  mocks.useExternalClients.mockReturnValue({
    data: [{ id: 'client-1', nome: 'Beta Cliente' }, { id: 'client-2', nome: 'Alfa Cliente' }],
  });
  mocks.useClienteOrdens.mockImplementation((clientId: string | null) => ({
    data: clientId === 'client-1' ? ordens : [],
  }));
  mocks.useOsProdutosContratados.mockImplementation((ids: string[]) => ({
    data: produtos.filter(item => ids.includes(item.ordem_servico_id)),
  }));
  mocks.useEstruturaEquipesByCategory.mockReturnValue({
    data: [{ id: 'team-tax', name: 'Equipe Fiscal', area_id: 'area-tax', area_name: 'Tax' }],
  });
  mocks.useEstruturaEquipe.mockImplementation((equipeId: string | null) => ({
    equipeInfo: equipeId ? { area_id: 'area-tax' } : null,
    liderIds: equipeId ? ['leader-1'] : [],
    memberIds: equipeId ? ['member-1', 'member-2'] : [],
  }));
  mocks.useTeamMembersByArea.mockReturnValue({
    data: {
      currentUserAreaIds: ['area-tax'],
      groups: [{
        area_id: 'area-tax',
        area_name: 'Fiscal',
        cluster_name: 'Tax',
        members: [members[1], members[2]],
        equipes: [{ equipe_id: 'team-tax', equipe_name: 'Equipe Fiscal', members: [members[1], members[2]] }],
      }],
    },
  });
  mocks.resolveProdutoIdByServico.mockResolvedValue('product-1');
  mocks.useDomainFiscalProjetosCadastro.mockImplementation((produtoId: string | null) => ({
    servicosByProdutoQuery: {
      data: produtoId === 'product-1' ? [{ id: 'service-1', nome: 'Revisão fiscal' }] : [],
    },
    resolveProdutoIdByServico: mocks.resolveProdutoIdByServico,
  }));
});

describe('FiscalProjetosCadastro — caracterização F1', () => {
  it('mantém validação, filtros, ordenação e agrupamento em funções puras', () => {
    expect(validateProjectForm({ ...EMPTY_PROJECT_FORM }, false, null)).toBe('Selecione o Cliente');
    const filtered = filterAndSortProjects(
      [taxProject, completedProject] as unknown as OrgProject[],
      { cliente: '', produto: '', status: '' },
      'name',
      'asc',
    );
    expect(filtered.map(project => project.name)).toEqual(['Alfa Tax', 'Zeta Tax']);
    const groups = groupProjects(filtered, 'area', {
      'project-tax': { ids: ['area-tax'], names: ['Fiscal'] },
      'project-completed': { ids: [], names: [] },
    });
    expect(groups?.map(group => group.label)).toEqual(['Fiscal', 'Sem área']);
  });

  it('mantém o cadastro exportado e usa o painel consolidado na fachada Tax', () => {
    expect(ProjetosCadastroContent).toEqual(expect.any(Function));

    render(<FiscalProjetosCadastro />);

    expect(screen.getByTestId('fiscal-layout')).toHaveTextContent('Projetos e tarefas');
    expect(screen.getByTestId('fiscal-layout')).toHaveTextContent('Acompanhe a execução por ordem de serviço');
    expect(screen.getByTestId('projetos-tarefas')).toHaveTextContent('Painel consolidado tax');
  });

  it('usa o mesmo painel consolidado na fachada OSG', () => {
    render(<OsgProjetos />);

    expect(screen.getByTestId('osg-layout')).toHaveTextContent('Projetos e tarefas');
    expect(screen.getByTestId('osg-layout')).toHaveTextContent('Acompanhe a execução por ordem de serviço');
    expect(screen.getByTestId('projetos-tarefas')).toHaveTextContent('Painel consolidado osg');
  });

  it('abre o novo projeto com o rascunho recebido do checklist tributário', async () => {
    mocks.location.state = {
      projectPrefill: {
        clientId: 'client-1',
        name: 'Beta Cliente - Planejamento Tributário',
        description: 'Descrição multidisciplinar do planejamento tributário.',
        isMultidisciplinar: true,
      },
    };

    render(<ProjetosCadastroContent area="osg" />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(inputNear(/Nome do Projeto/)).toHaveValue('Beta Cliente - Planejamento Tributário');
    expect(inputNear(/Descrição do Projeto/)).toHaveValue('Descrição multidisciplinar do planejamento tributário.');
    expect(screen.getByText(/^Cliente/, { selector: 'label' }).parentElement).toHaveTextContent('Beta Cliente');
    expect(screen.getByRole('switch')).toBeChecked();
    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/osg/projetos/cadastro', { replace: true, state: null });
  });

  it('preserva estados de carregamento, vazio e ausência temporária do conjunto visível', () => {
    mocks.useOrgProjects.mockReturnValue({ data: [], isLoading: true });
    mocks.useDashboardProjectIds.mockReturnValue({ ids: undefined });
    const { rerender } = render(<ProjetosCadastroContent />);
    expect(screen.getByText('Carregando projetos...')).toBeInTheDocument();

    mocks.useOrgProjects.mockReturnValue({ data: [], isLoading: false });
    mocks.useDashboardProjectIds.mockReturnValue({ ids: new Set() });
    rerender(<ProjetosCadastroContent />);
    expect(screen.getByText('Nenhum projeto cadastrado.')).toBeInTheDocument();
  });

  it('filtra, limpa, ordena e agrupa sem mudar os dados de fronteira', async () => {
    const user = userEvent.setup();
    render(<ProjetosCadastroContent />);

    const filterComboboxes = screen.getAllByRole('combobox');
    await user.click(filterComboboxes[0]);
    await user.click(await screen.findByRole('option', { name: 'Alfa Cliente' }));
    expect(screen.getByText('1 de 2 projetos')).toBeInTheDocument();
    expect(screen.getByText('Alfa Tax')).toBeInTheDocument();
    expect(screen.queryByText('Zeta Tax')).not.toBeInTheDocument();
    expect(screen.getByText('Limpar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Limpar/ }));
    expect(screen.getByText('2 projetos cadastrados')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const projectNames = () => within(table).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);
    await user.click(screen.getByRole('columnheader', { name: /Projeto/ }));
    expect(projectNames()).toEqual(['Alfa Tax', 'Zeta Tax']);
    await user.click(screen.getByRole('columnheader', { name: /Projeto/ }));
    expect(projectNames()).toEqual(['Zeta Tax', 'Alfa Tax']);

    await user.click(screen.getAllByRole('combobox')[3]);
    await user.click(await screen.findByRole('option', { name: 'Agrupar por Área' }));
    expect(screen.getByText('Fiscal')).toBeInTheDocument();
    expect(screen.getByText('Sem área')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    await user.click(screen.getByText('Fiscal'));
    expect(screen.queryByText('Zeta Tax')).not.toBeInTheDocument();
  });

  it('encaminha exclusão com identidade e nome necessários à auditoria da mutation', async () => {
    const user = userEvent.setup();
    render(<ProjetosCadastroContent />);

    const row = screen.getByText('Zeta Tax').closest('tr');
    if (!row) throw new Error('Linha do projeto ausente');
    await user.click(within(row).getAllByRole('button')[1]);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Esta ação não pode ser desfeita');
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mocks.deleteMutate).toHaveBeenCalledWith(
      { id: 'project-tax', name: 'Zeta Tax' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('valida em ordem e cria com OS/produto/equipe, datas automáticas e payload integral', async () => {
    const user = userEvent.setup();
    render(<ProjetosCadastroContent />);
    await user.click(screen.getByRole('button', { name: /Novo Projeto/ }));
    expect(screen.getByRole('heading', { name: 'Novo Projeto' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(mocks.toastError).toHaveBeenLastCalledWith('Selecione o Cliente');
    expect(mocks.createMutate).not.toHaveBeenCalled();

    await chooseSelect(/^Cliente/, 'Beta Cliente');
    expect(await screen.findByText(/OS: 001\/2026 — P01 — Consultoria/)).toBeInTheDocument();
    expect(screen.getByText('OS única selecionada automaticamente — datas de início e término preenchidas.')).toBeInTheDocument();
    // Depois do redesenho o período é pílula na faixa de propriedades
    // ("Início" / "Término"), como na edição. Herdado da OS e só de leitura: as
    // pílulas mostram a data formatada, não um campo `type=date` para digitar.
    await waitFor(() => expect(inputNear(/^Início/)).toHaveValue('10/01/2026'));
    expect(inputNear(/^Término/)).toHaveValue('20/12/2026');
    expect(inputNear(/^Início/)).toHaveAttribute('readonly');
    expect(inputNear(/^Término/)).toHaveAttribute('readonly');
    expect(screen.getByText('P01 — Consultoria')).toBeInTheDocument();

    fireEvent.change(inputNear(/^Nome do Projeto/), { target: { value: 'Novo Fiscal' } });
    await chooseSelect(/^Equipe/, /Equipe Fiscal/);
    expect(screen.getByText('Lia Líder')).toBeInTheDocument();
    await chooseSelect(/^Responsável/, 'Eva Executora');
    await user.click(screen.getByRole('button', { name: /Incluir todos da equipe/ }));
    fireEvent.change(inputNear(/Descrição do Projeto/), { target: { value: 'Escopo completo' } });

    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(mocks.createMutate).toHaveBeenCalledWith(
      {
        name: 'Novo Fiscal',
        description: 'Escopo completo',
        status: 'active',
        start_date: '2026-01-10',
        end_date: '2026-12-20',
        leader_ids: ['leader-1'],
        responsible_id: 'member-1',
        external_client_id: 'client-1',
        estrutura_area_id: 'area-tax',
        equipe_id: 'team-tax',
        is_multidisciplinar: false,
        member_ids: ['member-1', 'member-2'],
        ordem_servico_id: 'os-1',
        servico_id: '',
        // O produto escolhido no formulário vai no insert. Enquanto era só
        // estado de React, o projeto nascia sem produto e reabria como "Produto:
        // Não informado".
        produto_segmento_id: 'product-1',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('abre edição sem limpar serviço/datas, resolve o produto depois da OS e envia snapshots para auditoria', async () => {
    const user = userEvent.setup();
    render(<ProjetosCadastroContent />);
    await user.click(screen.getByText('Zeta Tax'));

    // Na edição o nome é o próprio título e o período vira pílula ("Início" /
    // "Término"), com a thread de atividade do projeto na coluna da direita.
    expect(screen.getByRole('heading', { name: 'Editar Projeto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Projeto')).toHaveValue('Zeta Tax');
    // Período herdado da OS, em leitura: data formatada e sem campo para digitar.
    expect(screen.getByLabelText('Início')).toHaveValue('10/02/2026');
    expect(screen.getByLabelText('Término')).toHaveValue('20/11/2026');
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-entity-type', 'org_project');
    expect(screen.getByTestId('activity-panel')).toHaveAttribute('data-entity-id', 'project-tax');
    expect(screen.getByTestId('anexos-agregados')).toHaveAttribute('data-entity-id', 'project-tax');
    await waitFor(() => expect(mocks.resolveProdutoIdByServico).toHaveBeenCalledWith('service-1', ['product-1']));
    await waitFor(() => expect(screen.getAllByText('Revisão fiscal').length).toBeGreaterThan(1));
    expect(screen.getByText('Lia Líder')).toBeInTheDocument();
    expect(screen.getByText('Mia Membro')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        id: 'project-tax',
        data: expect.objectContaining({
          name: 'Zeta Tax',
          ordem_servico_id: 'os-1',
          servico_id: 'service-1',
          // Projeto legado sem produto gravado: ao salvar, o produto que a tela
          // já resolveu (OS de produto único) é persistido em vez de ser
          // redescoberto por dedução a cada abertura.
          produto_segmento_id: 'product-1',
          start_date: '2026-02-10',
          end_date: '2026-11-20',
          // Líder e membros vêm do papel gravado no projeto: 'leader' no campo de
          // líder, 'member' e 'responsible' no de membros.
          leader_ids: ['leader-1'],
          member_ids: ['member-2', 'member-1'],
        }),
        oldProject: taxProject,
        oldMembers: currentMembers,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
