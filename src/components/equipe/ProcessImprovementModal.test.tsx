import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  createImprovement: vi.fn(),
  createSavingsDetails: vi.fn(),
  createTeamMembers: vi.fn(),
  calculateRoi: vi.fn(),
  updateProcess: vi.fn(),
  toast: vi.fn(),
  jobRolesResponse: {
    data: [
      { id: 'role-analyst', name: 'Analista', hourly_rate: 100 },
      { id: 'role-dev', name: 'Desenvolvedor', hourly_rate: 150 },
    ],
    error: null,
  },
}));

vi.mock('@/hooks/useDomainProcessImprovement', () => ({
  useDomainProcessImprovement: () => ({
    jobRolesQuery: {
      data: boundary.jobRolesResponse,
    },
    createImprovementMutation: { mutateAsync: boundary.createImprovement },
    createSavingsDetailsMutation: { mutateAsync: boundary.createSavingsDetails },
    createTeamMembersMutation: { mutateAsync: boundary.createTeamMembers },
    calculateRoiMutation: { mutateAsync: boundary.calculateRoi },
    updateProcessMutation: { mutateAsync: boundary.updateProcess },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-7' } }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: boundary.toast }));

import { ProcessImprovementModal } from './ProcessImprovementModal';

const roiResults = {
  time_saved_hours: 6,
  cost_saved_monthly: 950,
  roi_percentage: 125,
  payback_months: 2.5,
};

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  processId: 'process-1',
  processName: 'Conciliação fiscal',
  deliverableId: 'deliverable-2',
  projectId: 'project-3',
  baselineData: {
    time_spent_hours: 22,
    cost_monthly: 2200,
    volume_executions: 40,
    people_involved: 3,
    evaluation_period_days: 45,
  },
};

function setSuccessfulBoundaries() {
  boundary.createImprovement.mockResolvedValue({ data: { id: 'improvement-9' }, error: null });
  boundary.createSavingsDetails.mockResolvedValue({ error: null });
  boundary.createTeamMembers.mockResolvedValue({ error: null });
  boundary.calculateRoi.mockResolvedValue({ data: { results: roiResults }, error: null });
  boundary.updateProcess.mockResolvedValue({ error: null });
}

function renderModal(overrides: Partial<typeof baseProps> = {}) {
  return render(<ProcessImprovementModal {...baseProps} {...overrides} />);
}

function addMember(side: 'baseline' | 'improved', hours: number, roleText = 'Analista (R$ 100/h)') {
  const addButtons = screen.getAllByRole('button', { name: 'Adicionar Membro' });
  fireEvent.click(addButtons[side === 'baseline' ? 0 : 1]);

  const emptyRoleTriggers = screen.getAllByText('Selecionar cargo');
  fireEvent.click(emptyRoleTriggers[emptyRoleTriggers.length - 1].closest('button')!);
  fireEvent.click(screen.getByRole('option', { name: roleText }));

  const hourInputs = screen.getAllByPlaceholderText('h/mês');
  fireEvent.change(hourInputs[hourInputs.length - 1], { target: { value: String(hours) } });
}

function openSavingsSection(name: string) {
  fireEvent.click(screen.getByText(name));
}

function addSystemSavings(description: string, before: number, after: number) {
  openSavingsSection('Economia com Sistemas');
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Sistema' }));
  const descriptionInput = screen.getByPlaceholderText('Nome do sistema');
  const row = descriptionInput.parentElement!;
  const inputs = within(row).getAllByRole('spinbutton');
  fireEvent.change(descriptionInput, { target: { value: description } });
  fireEvent.change(inputs[0], { target: { value: String(before) } });
  fireEvent.change(inputs[1], { target: { value: String(after) } });
}

function addBuildVsBuySavings(description: string, before: number, after: number) {
  openSavingsSection('Construir vs Comprar');
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Item' }));
  const descriptionInput = screen.getByPlaceholderText('Nome da solução');
  const row = descriptionInput.parentElement!;
  const inputs = within(row).getAllByRole('spinbutton');
  fireEvent.change(descriptionInput, { target: { value: description } });
  fireEvent.change(inputs[0], { target: { value: String(before) } });
  fireEvent.change(inputs[1], { target: { value: String(after) } });
}

function addOtherSavings(description: string, value: number) {
  openSavingsSection('Outras Economias');
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Economia' }));
  fireEvent.change(screen.getByPlaceholderText('Descrição da economia'), {
    target: { value: description },
  });
  fireEvent.change(screen.getByPlaceholderText('R$/mês'), { target: { value: String(value) } });
}

describe('ProcessImprovementModal (caracterização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSuccessfulBoundaries();
  });

  it('expõe textos/estado inicial e preserva o rascunho ao fechar e reabrir', () => {
    const onClose = vi.fn();
    const view = renderModal({ onClose });

    expect(screen.getByRole('heading', { name: 'Avaliar Melhoria do Processo' })).toBeInTheDocument();
    expect(screen.getByText('Conciliação fiscal')).toBeInTheDocument();
    expect(screen.getByText('ANTES (Baseline)')).toBeInTheDocument();
    expect(screen.getByText('DEPOIS (Atual)')).toBeInTheDocument();
    expect(screen.queryByText('Prévia dos Resultados')).not.toBeInTheDocument();
    expect(screen.queryByText('ROI Calculado')).not.toBeInTheDocument();

    const description = screen.getByPlaceholderText('Descreva a melhoria realizada...');
    fireEvent.change(description, { target: { value: 'Automação em andamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();

    view.rerender(<ProcessImprovementModal {...baseProps} open={false} onClose={onClose} />);
    expect(screen.queryByText('Conciliação fiscal')).not.toBeInTheDocument();
    view.rerender(<ProcessImprovementModal {...baseProps} open onClose={onClose} />);
    expect(screen.getByDisplayValue('Automação em andamento')).toBeInTheDocument();
  });

  it('edita equipe/economias e mostra a prévia com os totais atuais', () => {
    renderModal();
    addMember('baseline', 10);
    addMember('improved', 4);
    addSystemSavings('ERP antigo', 500, 200);
    addBuildVsBuySavings('Portal próprio', 800, 300);
    addOtherSavings('Retrabalho evitado', 50);

    expect(screen.getByText('Prévia dos Resultados')).toBeInTheDocument();
    expect(screen.getByText('6h')).toBeInTheDocument();
    expect(screen.getByText('R$ 950')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('0.03')).toBeInTheDocument();
    expect(screen.getByText('Total: R$ 850')).toBeInTheDocument();
    expect(screen.getByText('Os dados de "DEPOIS" serão salvos como novo baseline')).toBeInTheDocument();

    const baselineHours = screen.getAllByPlaceholderText('h/mês')[0];
    const baselineRow = baselineHours.parentElement!;
    fireEvent.click(within(baselineRow).getByRole('button'));
    expect(screen.getAllByPlaceholderText('h/mês')).toHaveLength(1);
    expect(screen.getByText('-4h')).toBeInTheDocument();
  });

  it('salva em ordem não transacional, congela payloads/totais e renderiza o resultado', async () => {
    const order: string[] = [];
    boundary.createImprovement.mockImplementation(async () => {
      order.push('improvement');
      return { data: { id: 'improvement-9' }, error: null };
    });
    boundary.createSavingsDetails.mockImplementation(async () => {
      order.push('savings');
      return { error: null };
    });
    boundary.createTeamMembers.mockImplementation(async () => {
      order.push('members');
      return { error: null };
    });
    boundary.calculateRoi.mockImplementation(async () => {
      order.push('roi');
      return { data: { results: roiResults }, error: null };
    });
    boundary.updateProcess.mockImplementation(async () => {
      order.push('process');
      return { error: null };
    });

    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Descreva a melhoria realizada...'), {
      target: { value: 'Robotização da conferência' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '12.5' } });
    addMember('baseline', 10);
    addMember('improved', 4);
    addSystemSavings('ERP antigo', 500, 200);
    addBuildVsBuySavings('Portal próprio', 800, 300);
    addOtherSavings('Retrabalho evitado', 50);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));

    await waitFor(() => expect(boundary.updateProcess).toHaveBeenCalledOnce());
    expect(order).toEqual(['improvement', 'savings', 'members', 'roi', 'process']);
    expect(boundary.createImprovement).toHaveBeenCalledWith(expect.objectContaining({
      process_id: 'process-1',
      sprint_deliverable_id: 'deliverable-2',
      project_id: 'project-3',
      baseline_time_hours: 10,
      baseline_cost_monthly: 1000,
      baseline_volume: 40,
      baseline_people_involved: 1,
      improved_time_hours: 4,
      improved_cost_monthly: 400,
      improved_volume: 0,
      improved_people_involved: 1,
      evaluation_period_days: 45,
      evaluation_status: 'in_evaluation',
      implementation_hours: 12.5,
      improvement_description: 'Robotização da conferência',
      evaluated_by: 'user-7',
      system_savings_monthly: 300,
      build_vs_buy_savings: 500,
      other_savings_monthly: 50,
      evaluation_start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      evaluation_end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
    expect(boundary.createSavingsDetails).toHaveBeenCalledWith([
      {
        improvement_id: 'improvement-9', savings_type: 'system', description: 'ERP antigo',
        cost_before: 500, cost_after: 200, savings_value: 300, is_monthly: true,
      },
      {
        improvement_id: 'improvement-9', savings_type: 'build_vs_buy', description: 'Portal próprio',
        cost_before: 800, cost_after: 300, savings_value: 500, is_monthly: false,
      },
      {
        improvement_id: 'improvement-9', savings_type: 'other', description: 'Retrabalho evitado',
        cost_before: 0, cost_after: 0, savings_value: 50, is_monthly: true,
      },
    ]);
    expect(boundary.createTeamMembers).toHaveBeenCalledWith([
      { improvement_id: 'improvement-9', job_role_id: 'role-analyst', hours_allocated: 10, is_baseline: true },
      { improvement_id: 'improvement-9', job_role_id: 'role-analyst', hours_allocated: 4, is_baseline: false },
    ]);
    expect(boundary.calculateRoi).toHaveBeenCalledWith('improvement-9');
    expect(boundary.updateProcess).toHaveBeenCalledWith({
      processId: 'process-1',
      payload: expect.objectContaining({
        time_spent_hours: 4,
        cost_monthly: 400,
        volume_executions: 0,
        people_involved: 1,
        last_roi_percentage: 125,
        last_cost_saved_monthly: 950,
        last_time_saved_hours: 6,
        last_improvement_date: expect.any(String),
      }),
    });
    expect(await screen.findByText('ROI Calculado')).toBeInTheDocument();
    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(screen.getByText('2.5 meses')).toBeInTheDocument();
    expect(boundary.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Avaliação criada!' }));
    expect(baseProps.onSaved).toHaveBeenCalledOnce();
  });

  it('trata erros retornados pelas etapas auxiliares como best-effort e conclui', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    boundary.createSavingsDetails.mockResolvedValue({ error: new Error('savings unavailable') });
    boundary.createTeamMembers.mockResolvedValue({ error: new Error('members unavailable') });
    boundary.calculateRoi.mockResolvedValue({ data: null, error: new Error('roi unavailable') });
    boundary.updateProcess.mockResolvedValue({ error: new Error('process unavailable') });

    renderModal();
    addMember('baseline', 2);
    addSystemSavings('Licença', 100, 20);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));

    await waitFor(() => expect(boundary.updateProcess).toHaveBeenCalledOnce());
    expect(boundary.createSavingsDetails).toHaveBeenCalledOnce();
    expect(boundary.createTeamMembers).toHaveBeenCalledOnce();
    expect(boundary.calculateRoi).toHaveBeenCalledOnce();
    expect(boundary.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Avaliação criada!' }));
    expect(baseProps.onSaved).toHaveBeenCalledOnce();
    expect(screen.queryByText('ROI Calculado')).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledTimes(4);
    consoleSpy.mockRestore();
  });

  it('mantém estado Calculando ROI e, se a criação principal falha, interrompe o restante', async () => {
    let resolveRoi!: (value: { data: { results: typeof roiResults }; error: null }) => void;
    boundary.calculateRoi.mockReturnValue(new Promise(resolve => { resolveRoi = resolve; }));
    const first = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));
    expect(await screen.findByRole('button', { name: 'Calculando ROI...' })).toBeDisabled();
    await act(async () => resolveRoi({ data: { results: roiResults }, error: null }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar Avaliação' })).not.toBeDisabled());
    first.unmount();

    vi.clearAllMocks();
    setSuccessfulBoundaries();
    boundary.createImprovement.mockResolvedValue({ data: null, error: new Error('insert denied') });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));

    await waitFor(() => expect(boundary.toast).toHaveBeenCalledWith({
      title: 'Erro ao salvar', description: 'insert denied', variant: 'destructive',
    }));
    expect(boundary.createSavingsDetails).not.toHaveBeenCalled();
    expect(boundary.createTeamMembers).not.toHaveBeenCalled();
    expect(boundary.calculateRoi).not.toHaveBeenCalled();
    expect(boundary.updateProcess).not.toHaveBeenCalled();
    expect(baseProps.onSaved).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
