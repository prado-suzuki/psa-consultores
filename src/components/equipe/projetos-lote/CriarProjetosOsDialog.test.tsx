import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CriarProjetosOsDialog } from './CriarProjetosOsDialog';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  clients: [] as Array<{ id: string; nome: string; setor_cliente: string | null }>,
  ordens: [] as Array<Record<string, unknown>>,
  produtos: [] as Array<Record<string, unknown>>,
  projects: [] as Array<{ name: string; ordem_servico_id: string | null }>,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: () => ({ data: mocks.clients, isLoading: false }),
  useClienteOrdens: (clientId: string | null) => ({
    data: clientId ? mocks.ordens : [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useOsProdutosContratados', async () => {
  const real = await vi.importActual<typeof import('@/hooks/useOsProdutosContratados')>(
    '@/hooks/useOsProdutosContratados',
  );
  return {
    groupByOs: real.groupByOs,
    useOsProdutosContratados: () => ({ data: mocks.produtos, isLoading: false }),
  };
});

vi.mock('@/hooks/useOrgProjects', () => ({ useOrgProjects: () => ({ data: mocks.projects }) }));

const produto = (osId: string, id: string, codigo: string, nome: string) => ({
  id: `${osId}-${id}`,
  ordem_servico_id: osId,
  produto_segmento_id: id,
  produto_codigo: codigo,
  produto_nome: nome,
});

describe('CriarProjetosOsDialog', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.clients = [
      { id: 'cli-1', nome: 'Fazenda Horizonte', setor_cliente: null },
      { id: 'cli-2', nome: 'Agro Cerrado', setor_cliente: null },
    ];
    mocks.ordens = [{
      id: 'os-1',
      numero_os: '035/2026',
      situacao: 'em_andamento',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
      observacoes: 'Escopo combinado',
    }];
    mocks.produtos = [
      produto('os-1', 'ps-cha', 'CHA', 'Canal de Chamados'),
      produto('os-1', 'ps-dc', 'DC', 'Diagnóstico Contábil'),
    ];
    mocks.projects = [];
  });

  it('filtra os clientes pela busca', async () => {
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.getByRole('button', { name: 'Agro Cerrado' })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Buscar cliente'), 'horizonte');
    expect(screen.queryByRole('button', { name: 'Agro Cerrado' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazenda Horizonte' })).toBeInTheDocument();
  });

  it('leva para a tela de lote com o snapshot da OS escolhida', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CriarProjetosOsDialog open onOpenChange={onOpenChange} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    expect(screen.getByText('2 de 2 produto(s) sem projeto')).toBeInTheDocument();

    await user.click(screen.getByRole('radio'));
    await user.click(screen.getByRole('button', { name: 'Criar 2 projetos' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.navigate).toHaveBeenCalledWith('/equipe/tax/projetos/cadastro-lote', {
      state: {
        loteFromOs: {
          clientId: 'cli-1',
          clientName: 'Fazenda Horizonte',
          ordemServicoId: 'os-1',
          osNumero: '035/2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active',
          description: 'Escopo combinado',
          produtos: [
            { produtoSegmentoId: 'ps-cha', produtoLabel: 'CHA — Canal de Chamados' },
            { produtoSegmentoId: 'ps-dc', produtoLabel: 'DC — Diagnóstico Contábil' },
          ],
        },
      },
    });
  });

  it('na OSG leva para a tela de lote da própria área', async () => {
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="osg" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    await user.click(screen.getByRole('radio'));
    await user.click(screen.getByRole('button', { name: 'Criar 2 projetos' }));

    expect(mocks.navigate).toHaveBeenCalledWith(
      '/equipe/osg/projetos/cadastro-lote',
      expect.objectContaining({ state: expect.anything() }),
    );
  });

  it('desconta os produtos que já viraram projeto', async () => {
    mocks.projects = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
    ];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    expect(screen.getByText('1 de 2 produto(s) sem projeto')).toBeInTheDocument();

    await user.click(screen.getByRole('radio'));
    expect(screen.getByRole('button', { name: 'Criar 1 projeto' })).toBeEnabled();
  });

  it('bloqueia a OS cujos produtos já têm projeto', async () => {
    mocks.projects = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
      { name: 'Fazenda Horizonte — OS 035/2026 — DC — Diagnóstico Contábil', ordem_servico_id: 'os-1' },
    ];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    expect(screen.getByText('Todos os 2 produtos já têm projeto')).toBeInTheDocument();
    expect(screen.getByRole('radio')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Criar projetos' })).toBeDisabled();
  });

  it('OS sem produtos contratados não pode virar projeto', async () => {
    mocks.produtos = [];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    expect(screen.getByText('Sem produtos contratados')).toBeInTheDocument();
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('"Trocar cliente" volta para a lista de clientes', async () => {
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    await user.click(screen.getByRole('button', { name: /Trocar cliente/ }));
    expect(screen.getByPlaceholderText('Buscar cliente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agro Cerrado' })).toBeInTheDocument();
  });
});
