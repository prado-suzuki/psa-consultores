import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EFDArquivo, EFDOverview } from '@/types/efd';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  domain: vi.fn(),
  fetchWithAuth: vi.fn(),
  toast: vi.fn(),
  refetch: vi.fn(),
  exportProps: [] as Array<Record<string, unknown>>,
  analysisProps: {} as Record<string, unknown>,
}));

const arquivoMatriz: EFDArquivo = {
  CNPJ: '12345678000190',
  ID_ARQUIVO: 'arquivo/matriz 1',
  COD_VER: '17',
  TIPO_ESCRIT: 0,
  IND_SIT_ESP: null,
  NUM_REC_ANTERIOR: null,
  DT_INI: '2025-01-01',
  DT_FIN: '2025-01-31',
  NOME: 'Matriz PSA',
  UF: 'SP',
  COD_MUN: '3550308',
  SUFRAMA: null,
  IND_NAT_PJ: '00',
  IND_ATIV: 1,
  pis_devido: null,
  cofins_devido: null,
  credito_pis: null,
  credito_cofins: null,
  num_filial: '0000',
  IE: '110042490114',
  icms_a_recolher: '1234.5',
  icms_st_a_recolher: null,
};

const arquivoFilial: EFDArquivo = {
  ...arquivoMatriz,
  CNPJ: '12345678000270',
  ID_ARQUIVO: 'filial-2',
  TIPO_ESCRIT: 1,
  DT_INI: '2025-02-01',
  DT_FIN: '2025-02-28',
  NOME: 'Filial Campinas',
  num_filial: '0002',
  IE: '222',
  icms_a_recolher: '0',
  icms_st_a_recolher: '50.25',
};

const arquivoForaDoPeriodo: EFDArquivo = {
  ...arquivoMatriz,
  ID_ARQUIVO: 'antigo-1',
  DT_INI: '2010-01-01',
  DT_FIN: '2010-01-31',
  NOME: 'Arquivo Antigo',
  num_filial: '0003',
};

const overview: EFDOverview = {
  id_contribuinte: 'contrib-1',
  blocos_disponiveis: { C: [{ codigo: 'REG_C100', descricao: 'Notas' }] },
  arquivos: [arquivoFilial, arquivoMatriz, arquivoForaDoPeriodo],
};

vi.mock('@/hooks/useEFDData', () => ({ useEFDOverview: mocks.overview }));
vi.mock('@/hooks/useDomainConsultaEFDICMS', () => ({
  useDomainConsultaEFDICMS: mocks.domain,
}));
vi.mock('@/hooks/useApiAuth', () => ({
  useApiAuth: () => ({ fetchWithAuth: mocks.fetchWithAuth }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/config/api', () => ({ getApiUrl: (path: string) => `https://api.test${path}` }));
vi.mock('@/components/equipe/dev/DevLayout', () => ({
  DevLayout: ({ children, title }: PropsWithChildren<{ title: string }>) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));
vi.mock('@/components/equipe/dev/DevPageHeader', () => ({ DevPageHeader: () => null }));
vi.mock('@/components/equipe/dev/EFDExportDialog', () => ({
  EFDExportDialog: (props: Record<string, unknown>) => {
    mocks.exportProps.push(props);
    return props.hideTrigger ? <div data-testid="export-externo" /> : <div data-testid="export-linha" />;
  },
}));
vi.mock('@/components/equipe/dev/EFDAnalysisModal', () => ({
  EFDAnalysisModal: (props: Record<string, unknown>) => {
    mocks.analysisProps = props;
    return props.open ? <div>análise aberta</div> : null;
  },
}));

import ConsultaEFDICMS from '@/pages/equipe/dev/ConsultaEFDICMS';

async function selecionarClienteEBuscar() {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('combobox')[0]);
  await user.click(await screen.findByRole('option', { name: 'Cliente PSA' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Buscar arquivos/i })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: /Buscar arquivos/i }));
}

function okBlobResponse(fileName = 'servidor.zip') {
  return {
    ok: true,
    headers: new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Files-Found': '2',
    }),
    blob: vi.fn().mockResolvedValue(new Blob(['conteudo'])),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
    setPointerCapture: { configurable: true, value: vi.fn() },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  mocks.exportProps.length = 0;
  mocks.analysisProps = {};
  mocks.domain.mockImplementation((clienteId: string) => ({
    clientes: [{ id: 'cliente-1', nome: 'Cliente PSA' }],
    loadingClientes: false,
    contribuintes: clienteId
      ? [{ id: 'contrib-1', nome_razao_social: 'Contribuinte Único', cpf_cnpj: '12.345.678/0001-90' }]
      : [],
    loadingContribuintes: false,
  }));
  mocks.overview.mockImplementation((params: { enabled: boolean }) => ({
    data: params.enabled ? overview : undefined,
    isLoading: false,
    error: null,
    refetch: mocks.refetch,
  }));
  mocks.fetchWithAuth.mockResolvedValue(okBlobResponse());
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('ConsultaEFDICMS', () => {
  it('submete o contrato ICMS só após cliente/contribuinte e apresenta a tabela fiscal', async () => {
    render(<ConsultaEFDICMS />);

    expect(mocks.overview).toHaveBeenLastCalledWith({
      enabled: false,
      idContribuinte: '',
      tipo: 'icms',
    });
    expect(screen.getByText('Nenhum arquivo listado')).toBeInTheDocument();

    await selecionarClienteEBuscar();

    expect(mocks.domain).toHaveBeenLastCalledWith('cliente-1');
    expect(mocks.overview).toHaveBeenLastCalledWith({
      enabled: true,
      idContribuinte: 'contrib-1',
      tipo: 'icms',
    });
    expect(screen.getByText('Matriz PSA')).toBeInTheDocument();
    expect(screen.getByText('Filial Campinas')).toBeInTheDocument();
    expect(screen.queryByText('Arquivo Antigo')).not.toBeInTheDocument();
    expect(screen.getByText('01/01/2025 a 31/01/2025')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Retificadora')).toBeInTheDocument();
    expect(screen.getByText(/1\.234,50/)).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(1);
    expect(screen.getAllByTestId('export-linha')).toHaveLength(2);
    expect(mocks.exportProps[0]).toMatchObject({
      arquivo: arquivoFilial,
      blocosDisponiveis: overview.blocos_disponiveis,
      tipo: 'icms',
      idContribuinte: 'contrib-1',
    });
  });

  it('filtra filial localmente e encaminha análise com o arquivo e contrato ICMS', async () => {
    render(<ConsultaEFDICMS />);
    await selecionarClienteEBuscar();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(await screen.findByRole('option', { name: /Filial Campinas.*0002/ }));

    expect(screen.queryByText('Matriz PSA')).not.toBeInTheDocument();
    expect(screen.getAllByText('Filial Campinas')).toHaveLength(2);
    expect(screen.getByText('CNPJ: 12.345.678/0002-70')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Analisar/i }));
    expect(screen.getByText('análise aberta')).toBeInTheDocument();
    expect(mocks.analysisProps).toMatchObject({
      open: true,
      arquivo: arquivoFilial,
      blocosDisponiveis: overview.blocos_disponiveis,
      idContribuinte: 'contrib-1',
      tipo: 'icms',
    });
  });

  it('um selecionado baixa exatamente o TXT individual e expõe export controlado', async () => {
    mocks.fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['txt'])),
    });
    render(<ConsultaEFDICMS />);
    await selecionarClienteEBuscar();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Matriz PSA' }));
    expect(screen.getByText('1 selecionado(s)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Exportar excel/i }));
    expect(screen.getByTestId('export-externo')).toBeInTheDocument();
    expect(mocks.exportProps.at(-1)).toMatchObject({
      arquivo: arquivoMatriz,
      tipo: 'icms',
      profileType: 'efd_icms',
      idContribuinte: 'contrib-1',
      externalOpen: true,
      hideTrigger: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Baixar txt/i }));
    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(1));
    expect(mocks.fetchWithAuth).toHaveBeenCalledWith(
      'https://api.test/api/v1/query/download/efd/icms/arquivo/arquivo%2Fmatriz%201',
      {},
      60000,
    );
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download concluído' }));
  });

  it('múltiplos selecionados preservam o download amplo por contribuinte, sem enviar IDs selecionados', async () => {
    render(<ConsultaEFDICMS />);
    await selecionarClienteEBuscar();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }));
    expect(screen.getByText('2 selecionado(s)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Baixar txt/i }));

    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(1));
    const [url, options, timeout] = mocks.fetchWithAuth.mock.calls[0];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://api.test/api/v1/query/download/efd/icms/contrib-1',
    );
    const now = new Date();
    const expectedStart = `${now.getFullYear() - 5}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10);
    expect(parsed.searchParams.get('data_inicio')).toBe(expectedStart);
    expect(parsed.searchParams.get('data_fim')).toBe(expectedEnd);
    expect(parsed.search).not.toContain('arquivo');
    expect(options).toEqual({});
    expect(timeout).toBe(60000);
  });

  it('limpar restaura o estado inicial e remove seleção/resultados', async () => {
    render(<ConsultaEFDICMS />);
    await selecionarClienteEBuscar();
    const row = screen.getByText('Matriz PSA').closest('tr');
    fireEvent.click(within(row!).getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }));

    expect(screen.getByText('Nenhum arquivo listado')).toBeInTheDocument();
    expect(screen.queryByText('1 selecionado(s)')).not.toBeInTheDocument();
    expect(mocks.overview).toHaveBeenLastCalledWith({ enabled: false, idContribuinte: '', tipo: 'icms' });
  });
});
