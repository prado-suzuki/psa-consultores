import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Os hooks entram mockados, como o resto dos relatórios da OSG faz: o que este
 * arquivo prende é o que a pessoa vê e o que ela consegue fazer, não a consulta.
 */
const mocks = vi.hoisted(() => ({
  clientes: [{ id: 'cli-1', nome: 'Fazenda Aurora' }],
  estudos: [] as { id: string; descricao: string | null; created_at: string }[],
  revisoes: [] as unknown[],
  geradas: [] as unknown[],
  gerar: vi.fn(),
  baixar: vi.fn(),
  gerando: false,
}));

vi.mock('@/hooks/useGestaoClientes', () => ({
  useClientesLista: () => ({ data: mocks.clientes }),
}));

vi.mock('@/hooks/useDomainPapelDeTrabalho', () => ({
  useEstudosDoCliente: () => ({ data: mocks.estudos, isLoading: false }),
  useRevisoesDoEstudo: () => ({ data: mocks.revisoes, isLoading: false }),
  useApresentacoesDaRevisao: () => ({ data: mocks.geradas }),
  useGerarApresentacaoTributaria: () => ({
    mutateAsync: mocks.gerar,
    isPending: mocks.gerando,
  }),
  useBaixarApresentacao: () => ({ mutateAsync: mocks.baixar, isPending: false }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { PapeisDeTrabalhoReport } from './PapeisDeTrabalhoReport';

const UMA_REVISAO = {
  id: 'rev-1',
  versao: 2,
  nome_original: 'WP_Fazenda_Aurora.xlsx',
  cliente_no_wp: 'Fazenda Aurora',
  ano_inicial: 2026,
  ano_final: 2028,
  versao_do_mapa: '1.4',
  problemas: 0,
  created_at: '2026-09-04T18:45:00Z',
};

afterEach(() => {
  mocks.estudos = [];
  mocks.revisoes = [];
  mocks.geradas = [];
  mocks.gerando = false;
  vi.clearAllMocks();
});

describe('PapeisDeTrabalhoReport', () => {
  /*
   * O caso mais provável de quem abre a tela pela primeira vez. Dizer só "nada
   * aqui" deixaria a pessoa parada: o texto tem de dizer onde se importa um WP.
   */
  it('sem papel de trabalho, diz onde importar', () => {
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.getByText(/ainda não tem papel de trabalho importado/)).toBeInTheDocument();
    expect(screen.getByText(/Digital Rotina, na tela Papel de Trabalho/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gerar os slides/ })).not.toBeInTheDocument();
  });

  it('com revisão, mostra qual é e deixa gerar', () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.getByText(/Fazenda Aurora/)).toBeInTheDocument();
    expect(screen.getByText(/WP_Fazenda_Aurora\.xlsx/)).toBeInTheDocument();
    expect(screen.getByText(/2026 a 2028/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar os slides/ })).toBeEnabled();
  });

  /* Um estudo só é o caso normal, e um seletor com uma opção só é ruído. */
  it('esconde a escolha de OS quando só existe uma', () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.queryByLabelText('Ordem de serviço')).not.toBeInTheDocument();
  });

  it('mostra a escolha de OS quando há mais de uma', () => {
    mocks.estudos = [
      { id: 'est-1', descricao: 'OS-001', created_at: '2026-09-01T12:00:00Z' },
      { id: 'est-2', descricao: 'OS-002', created_at: '2026-09-02T12:00:00Z' },
    ];
    mocks.revisoes = [UMA_REVISAO];
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.getByLabelText('Ordem de serviço')).toBeInTheDocument();
  });

  /*
   * O que a geração deixou pendente é a informação mais acionável da tela, e
   * tem de aparecer como tarefa e não como erro: o arquivo saiu e baixou.
   */
  it('depois de gerar, lista o que ajustar no PowerPoint', async () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    mocks.gerar.mockResolvedValue({
      apresentacaoId: 'ap-1',
      versao: 1,
      nomeArquivo: 'PSA_Tributario.pptx',
      url: null,
      problemas: [{ tipo: 'formatacao' as const, onde: 'DRE', detalhe: 'Não cabe: 25 linhas para 20 de espaço.' }],
    });

    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar os slides/ }));

    await waitFor(() =>
      expect(screen.getByText('Um ponto para ajustar no PowerPoint')).toBeInTheDocument(),
    );
    expect(screen.getByText('Não cabe: 25 linhas para 20 de espaço.')).toBeInTheDocument();
    expect(mocks.gerar).toHaveBeenCalledWith('rev-1');
  });

  /*
   * Enquanto o molde é provisório, aviso de origem não é retoque: ninguém vai
   * mapear célula no PowerPoint. Ele continua gravado, só não polui a lista.
   */
  it('não mostra aviso de origem enquanto o molde é provisório', async () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    mocks.gerar.mockResolvedValue({
      apresentacaoId: 'ap-1',
      versao: 1,
      nomeArquivo: 'PSA_Tributario.pptx',
      url: null,
      problemas: [
        { tipo: 'origem' as const, onde: 'slide', detalhe: 'Sai como traço: a origem dela no WP nunca foi mapeada.' },
        { tipo: 'formatacao' as const, onde: 'DRE', detalhe: 'Não cabe: 25 linhas para 20 de espaço.' },
      ],
    });

    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar os slides/ }));

    await waitFor(() =>
      expect(screen.getByText('Não cabe: 25 linhas para 20 de espaço.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Um ponto para ajustar no PowerPoint')).toBeInTheDocument();
    expect(screen.queryByText(/nunca foi mapeada/)).not.toBeInTheDocument();
  });

  /* A tela manda o id da revisão e mais nada: é o que impede número de tela
   * virar número de slide. */
  it('manda só o id da revisão', async () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    mocks.gerar.mockResolvedValue({
      apresentacaoId: 'ap-1',
      versao: 1,
      nomeArquivo: 'x.pptx',
      url: null,
      problemas: [],
    });

    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar os slides/ }));

    await waitFor(() => expect(mocks.gerar).toHaveBeenCalledTimes(1));
    expect(mocks.gerar.mock.calls[0]).toEqual(['rev-1']);
  });

  it('lista o que já foi gerado, com botão de baixar', () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    mocks.geradas = [
      {
        id: 'ap-1',
        versao: 1,
        nome_arquivo: 'PSA_Tributario_v1.pptx',
        storage_path: 'est-1/PSA_Tributario_v1.pptx',
        tamanho: 306180,
        template_nome: 'TEMPLATE_TRIBUTARIO.pptx',
        problemas: 2,
        created_at: '2026-09-04T19:00:00Z',
      },
    ];
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.getByText('PSA_Tributario_v1.pptx')).toBeInTheDocument();
    expect(screen.getByText(/299 KB/)).toBeInTheDocument();
    expect(screen.getByText(/2 pontos a ajustar no PowerPoint/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Baixar/ }));
    expect(mocks.baixar).toHaveBeenCalledWith('est-1/PSA_Tributario_v1.pptx');
  });

  it('enquanto gera, o botão avisa e não aceita clique', () => {
    mocks.estudos = [{ id: 'est-1', descricao: null, created_at: '2026-09-01T12:00:00Z' }];
    mocks.revisoes = [UMA_REVISAO];
    mocks.gerando = true;
    render(<PapeisDeTrabalhoReport clienteId="cli-1" />);

    expect(screen.getByRole('button', { name: /Gerando/ })).toBeDisabled();
  });
});
