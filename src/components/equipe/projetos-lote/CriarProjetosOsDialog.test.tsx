import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoteOsAberta } from '@/lib/projetosLote';
import { CriarProjetosOsDialog } from './CriarProjetosOsDialog';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  clients: [] as Array<{ id: string; nome: string; setor_cliente: string | null }>,
  osAbertas: [] as unknown[],
  projects: [] as Array<{ name: string; ordem_servico_id: string | null }>,
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: () => ({ data: mocks.clients, isLoading: false }),
}));

vi.mock('@/hooks/useDomainOsAbertas', () => ({
  useOsAbertasComProdutos: () => ({ data: mocks.osAbertas, isLoading: false }),
}));

vi.mock('@/hooks/useOrgProjects', () => ({ useOrgProjects: () => ({ data: mocks.projects }) }));

const produto = (id: string, codigo: string, nome: string) => ({
  produto_segmento_id: id,
  produto_codigo: codigo,
  produto_nome: nome,
});

const os = (patch: Partial<LoteOsAberta>): LoteOsAberta => ({
  id: 'os-1',
  numero_os: '035/2026',
  cliente_id: 'cli-1',
  cliente_nome: 'Fazenda Horizonte',
  situacao: 'em_andamento',
  data_inicio: '2026-01-01',
  data_fim: '2026-12-31',
  observacoes: 'Escopo combinado',
  produtos: [
    produto('ps-cha', 'CHA', 'Canal de Chamados'),
    produto('ps-dc', 'DC', 'Diagnóstico Contábil'),
  ],
  ...patch,
});

describe('CriarProjetosOsDialog', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.clients = [
      { id: 'cli-1', nome: 'Fazenda Horizonte', setor_cliente: null },
      { id: 'cli-2', nome: 'Agro Cerrado', setor_cliente: null },
    ];
    mocks.osAbertas = [os({})];
    mocks.projects = [];
  });

  it('lista só os clientes com OS aberta sem projeto vinculado', () => {
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.getByRole('button', { name: 'Fazenda Horizonte' })).toBeInTheDocument();
    // Agro Cerrado não tem OS aberta nenhuma.
    expect(screen.queryByRole('button', { name: 'Agro Cerrado' })).not.toBeInTheDocument();
  });

  it('OS parcialmente criada mantém o cliente na lista', () => {
    mocks.projects = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
    ];
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.getByRole('button', { name: 'Fazenda Horizonte' })).toBeInTheDocument();
  });

  it('cliente cujas OS já viraram projeto sai da lista', () => {
    mocks.projects = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
      { name: 'Fazenda Horizonte — OS 035/2026 — DC — Diagnóstico Contábil', ordem_servico_id: 'os-1' },
    ];
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.queryByRole('button', { name: 'Fazenda Horizonte' })).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum cliente com OS aberta sem projeto vinculado.')).toBeInTheDocument();
  });

  it('OS sem produtos contratados não coloca o cliente na lista', () => {
    mocks.osAbertas = [os({ produtos: [] })];
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.queryByRole('button', { name: 'Fazenda Horizonte' })).not.toBeInTheDocument();
  });

  it('casa cliente e OS por nome, cobrindo UUID diferente entre dev e prod', () => {
    // Mesmo nome, UUID de outro ambiente — é o que a RPC get_ordens_by_client_name faz.
    mocks.osAbertas = [os({ cliente_id: 'cli-1-prod' })];
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    expect(screen.getByRole('button', { name: 'Fazenda Horizonte' })).toBeInTheDocument();
  });

  it('filtra os clientes pela busca', async () => {
    mocks.osAbertas = [os({}), os({ id: 'os-2', cliente_id: 'cli-2', cliente_nome: 'Agro Cerrado' })];
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

  it('vincula o projeto ao cliente do ambiente atual, não ao da OS', async () => {
    mocks.osAbertas = [os({ cliente_id: 'cli-1-prod' })];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    await user.click(screen.getByRole('radio'));
    await user.click(screen.getByRole('button', { name: 'Criar 2 projetos' }));

    const [, options] = mocks.navigate.mock.calls[0];
    expect((options as { state: { loteFromOs: { clientId: string } } }).state.loteFromOs.clientId).toBe('cli-1');
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

  it('OS esgotada aparece desabilitada quando o cliente tem outra com pendência', async () => {
    mocks.osAbertas = [
      os({}),
      os({ id: 'os-2', numero_os: '036/2026', produtos: [produto('ps-af', 'AF', 'Auditoria Fiscal')] }),
    ];
    mocks.projects = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
      { name: 'Fazenda Horizonte — OS 035/2026 — DC — Diagnóstico Contábil', ordem_servico_id: 'os-1' },
    ];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    expect(screen.getByText('Todos os 2 produtos já têm projeto')).toBeInTheDocument();
    const [esgotada, disponivel] = screen.getAllByRole('radio');
    expect(esgotada).toBeDisabled();
    expect(disponivel).toBeEnabled();
  });

  it('"Trocar cliente" volta para a lista de clientes', async () => {
    mocks.osAbertas = [os({}), os({ id: 'os-2', cliente_id: 'cli-2', cliente_nome: 'Agro Cerrado' })];
    const user = userEvent.setup();
    render(<CriarProjetosOsDialog open onOpenChange={vi.fn()} area="tax" />);

    await user.click(screen.getByRole('button', { name: 'Fazenda Horizonte' }));
    await user.click(screen.getByRole('button', { name: /Trocar cliente/ }));
    expect(screen.getByPlaceholderText('Buscar cliente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agro Cerrado' })).toBeInTheDocument();
  });
});
