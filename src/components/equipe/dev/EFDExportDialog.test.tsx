import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import type { EFDArquivo, EFDTipo } from '@/types/efd';

const mocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
  toast: vi.fn(),
  useProfiles: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setDefault: vi.fn(),
}));

const arquivo: EFDArquivo = {
  CNPJ: '12345678000190', ID_ARQUIVO: 'efd id/1', COD_VER: '17', TIPO_ESCRIT: 0,
  IND_SIT_ESP: null, NUM_REC_ANTERIOR: null, DT_INI: '2025-01-01', DT_FIN: '2025-01-31',
  NOME: 'Arquivo PSA', UF: 'SP', COD_MUN: '3550308', SUFRAMA: null, IND_NAT_PJ: '00',
  IND_ATIV: 1, pis_devido: null, cofins_devido: null, credito_pis: null, credito_cofins: null,
};

const blocos = {
  C: [
    { codigo: 'REG_C100', descricao: 'Nota fiscal' },
    { codigo: 'REG_C190', descricao: 'Registro analítico' },
  ],
  E: [{ codigo: 'REG_E110', descricao: 'Apuração ICMS' }],
};

vi.mock('@/hooks/useApiAuth', () => ({
  useApiAuth: () => ({ fetchWithAuth: mocks.fetchWithAuth }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/config/api', () => ({ getApiUrl: (path: string) => `https://api.test${path}` }));
vi.mock('@/hooks/useExportProfiles', () => ({ useExportProfiles: mocks.useProfiles }));

function responseHeaders(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

function renderOpen(props: Partial<React.ComponentProps<typeof EFDExportDialog>> = {}) {
  return render(
    <EFDExportDialog
      arquivo={arquivo}
      blocosDisponiveis={blocos}
      idContribuinte="contrib-1"
      externalOpen
      hideTrigger
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ id: 'perfil-novo' });
  mocks.remove.mockResolvedValue(undefined);
  mocks.setDefault.mockResolvedValue(undefined);
  mocks.useProfiles.mockReturnValue({
    profiles: [],
    isLoading: false,
    defaultProfile: undefined,
    createProfile: { mutateAsync: mocks.create, isPending: false },
    updateProfile: { mutateAsync: mocks.update, isPending: false },
    deleteProfile: { mutateAsync: mocks.remove, isPending: false },
    setDefaultProfile: { mutateAsync: mocks.setDefault, isPending: false },
  });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:excel') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('EFDExportDialog - interface pública e registros', () => {
  it.each([
    ['contribuicoes', 'efd'],
    ['icms', 'efd_icms'],
    ['ecd', 'efd_ecd'],
    ['ecf', 'efd_ecf'],
  ] as const)('deriva o perfil de %s como %s', (tipo, profileType) => {
    renderOpen({ tipo });
    expect(mocks.useProfiles).toHaveBeenCalledWith(profileType);
  });

  it('respeita controle interno pelo trigger e controle externo pelo callback', () => {
    const { rerender } = render(
      <EFDExportDialog arquivo={arquivo} blocosDisponiveis={blocos} idContribuinte="c1" tipo="icms" />,
    );
    expect(screen.queryByText('Exportar para Excel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Exportar para Excel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Exportar para Excel')).not.toBeInTheDocument();

    const onOpenChange = vi.fn();
    rerender(
      <EFDExportDialog arquivo={arquivo} blocosDisponiveis={blocos} idContribuinte="c1"
        externalOpen onExternalOpenChange={onOpenChange} hideTrigger />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('carrega apenas registros válidos do perfil padrão e salva códigos sem REG_', async () => {
    mocks.useProfiles.mockReturnValue({
      profiles: [{ id: 'p1', name: 'Fiscal', columns: ['C100', 'REG_E110', 'INVALIDO'], is_default: true }],
      isLoading: false,
      defaultProfile: { id: 'p1', name: 'Fiscal', columns: ['C100', 'REG_E110', 'INVALIDO'], is_default: true },
      createProfile: { mutateAsync: mocks.create, isPending: false },
      updateProfile: { mutateAsync: mocks.update, isPending: false },
      deleteProfile: { mutateAsync: mocks.remove, isPending: false },
      setDefaultProfile: { mutateAsync: mocks.setDefault, isPending: false },
    });
    renderOpen({ tipo: 'icms' });

    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Salvar seleção como perfil'));
    fireEvent.change(screen.getByLabelText('Nome do Perfil'), { target: { value: ' Auditoria ' } });
    fireEvent.click(screen.getByLabelText('Definir como perfil padrão'));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Perfil/i }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      name: 'Auditoria',
      columns: ['C100', 'E110'],
      isDefault: true,
    }));
  });

  it('seleciona registros na ordem dos blocos e envia endpoint/payload exatos para cada ferramenta', async () => {
    const tipos: EFDTipo[] = ['contribuicoes', 'icms', 'ecd', 'ecf'];
    for (const tipo of tipos) {
      mocks.fetchWithAuth.mockResolvedValueOnce({
        ok: true,
        headers: responseHeaders({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ url: `https://download.test/${tipo}.xlsx`, file_name: `${tipo}.xlsx` }),
      });
      const view = renderOpen({ tipo });
      fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
      fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));
      await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(tipos.indexOf(tipo) + 1));
      expect(mocks.fetchWithAuth).toHaveBeenLastCalledWith(
        `https://api.test/api/v1/efd/${tipo}/contrib-1/efd id/1/exportar`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registros: ['C100', 'C190', 'E110'] }),
          signal: expect.any(AbortSignal),
        }),
        300000,
      );
      await waitFor(() => expect(screen.getByText('Download pronto!')).toBeInTheDocument());
      view.unmount();
    }
  });
});

describe('EFDExportDialog - máquina de exportação', () => {
  it('resolve cache hit JSON por url e nome retornados', async () => {
    mocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      headers: responseHeaders({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ download_url: 'https://download.test/cache.xlsx', file_name: 'cache.xlsx' }),
    });
    renderOpen({ tipo: 'icms' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));

    await screen.findByText('Download pronto!');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Exportação concluída', description: 'Arquivo Excel baixado com sucesso!',
    });
  });

  it('faz polling imediato e a cada 2s até completed, preservando endpoint e progresso', async () => {
    vi.useFakeTimers();
    mocks.fetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        headers: responseHeaders({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ job_id: 'job-9' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'processing', progress: 0.42 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'completed', url: 'https://download.test/job.xlsx', file_name: 'job.xlsx' }),
      });
    renderOpen({ tipo: 'ecd' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mocks.fetchWithAuth).toHaveBeenNthCalledWith(
      2,
      'https://api.test/api/v1/efd/exportar/status/job-9',
      { signal: expect.any(AbortSignal) },
    );
    expect(screen.getByText('Processando... 42%')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Download pronto!')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('consome streaming binário em ordem, mostra progresso e usa filename do header', async () => {
    const reads = [
      { done: false, value: new Uint8Array([1, 2]) },
      { done: false, value: new Uint8Array([3, 4]) },
      { done: true, value: undefined },
    ];
    mocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      headers: responseHeaders({
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-length': '4',
        'content-disposition': 'attachment; filename="stream.xlsx"',
      }),
      body: { getReader: () => ({ read: vi.fn().mockImplementation(() => Promise.resolve(reads.shift())) }) },
    });
    renderOpen({ tipo: 'ecf' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));

    await screen.findByText('Download pronto!');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:excel');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it('aborta a requisição e fecha ao cancelar durante processamento', async () => {
    let signal: AbortSignal | undefined;
    mocks.fetchWithAuth.mockImplementation((_url, options) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const onOpenChange = vi.fn();
    renderOpen({ onExternalOpenChange: onOpenChange });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));
    expect(screen.getByText('Iniciando geração do relatório...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(signal?.aborted).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('não aborta a exportação em starting quando perfil padrão e registros mudam com o dialog aberto', () => {
    let signal: AbortSignal | undefined;
    mocks.fetchWithAuth.mockImplementation((_url, options) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const view = renderOpen({ tipo: 'icms' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));
    expect(screen.getByText('Iniciando geração do relatório...')).toBeInTheDocument();

    mocks.useProfiles.mockReturnValue({
      profiles: [{ id: 'p2', name: 'Novo padrão', columns: ['C100'], is_default: true }],
      isLoading: false,
      defaultProfile: { id: 'p2', name: 'Novo padrão', columns: ['C100'], is_default: true },
      createProfile: { mutateAsync: mocks.create, isPending: false },
      updateProfile: { mutateAsync: mocks.update, isPending: false },
      deleteProfile: { mutateAsync: mocks.remove, isPending: false },
      setDefaultProfile: { mutateAsync: mocks.setDefault, isPending: false },
    });
    view.rerender(
      <EFDExportDialog
        arquivo={arquivo}
        blocosDisponiveis={{ ...blocos, H: [{ codigo: 'REG_H005', descricao: 'Inventário' }] }}
        idContribuinte="contrib-1"
        tipo="icms"
        externalOpen
        hideTrigger
      />,
    );

    expect(signal?.aborted).toBe(false);
    expect(screen.getByText('Iniciando geração do relatório...')).toBeInTheDocument();
  });

  it('mantém polling em processing quando registros disponíveis mudam com o dialog aberto', async () => {
    let pollingSignal: AbortSignal | undefined;
    mocks.fetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        headers: responseHeaders({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ job_id: 'job-active' }),
      })
      .mockImplementationOnce((_url, options) => {
        pollingSignal = options.signal;
        return new Promise(() => {});
      });
    const view = renderOpen({ tipo: 'ecd' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));
    expect(await screen.findByText('Gerando arquivo no servidor...')).toBeInTheDocument();
    await waitFor(() => expect(pollingSignal).toBeDefined());

    view.rerender(
      <EFDExportDialog
        arquivo={arquivo}
        blocosDisponiveis={{ ...blocos, H: [{ codigo: 'REG_H005', descricao: 'Inventário' }] }}
        idContribuinte="contrib-1"
        tipo="ecd"
        externalOpen
        hideTrigger
      />,
    );

    expect(pollingSignal?.aborted).toBe(false);
    expect(screen.getByText('Gerando arquivo no servidor...')).toBeInTheDocument();
    view.unmount();
    expect(pollingSignal?.aborted).toBe(true);
  });

  it('preserva mensagens distintas de status e toast quando job falha sem error', async () => {
    mocks.fetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        headers: responseHeaders({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ job_id: 'job-failed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'failed' }),
      });
    renderOpen({ tipo: 'ecf' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Relatório (3)' }));

    expect(await screen.findByText('Erro na geração do arquivo')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Erro na exportação',
      description: 'Falha ao gerar arquivo.',
      variant: 'destructive',
    });
  });
});
