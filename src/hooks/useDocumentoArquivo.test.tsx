import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));

const qcMocks = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const apiMocks = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
const auditMocks = vi.hoisted(() => ({ logAction: vi.fn() }));
const dbMocks = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), getUser: vi.fn(), rpc: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useApiAuth', () => ({
  useApiAuth: () => ({ fetchWithAuth: apiMocks.fetchWithAuth }),
}));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: auditMocks.logAction }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: toastMocks.toast }));
vi.mock('@/config/api', () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
  currentAmbiente: 'dev',
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: dbMocks.from, rpc: dbMocks.rpc, auth: { getUser: dbMocks.getUser } },
}));

import {
  useAtualizarDocumento, useBaixarDocumento, useExcluirDocumento,
  type AtualizarDocumentoPatch, type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { DOWNLOADS_QUERY_KEY } from '@/hooks/useDomainDocumentoDownload';

const OBJECT_KEY = 'outros/cliente-1/objeto-1.pdf';

function docRow(over: Partial<DocumentoArquivoRow> = {}): DocumentoArquivoRow {
  return {
    id: 'doc-1',
    gcs_uri: `gs://psa-osg-documentos-dev/${OBJECT_KEY}`,
    nome_original: 'contrato.pdf',
    categoria: 'outros',
    matricula_id: null,
    ...over,
  } as DocumentoArquivoRow;
}

function respostaOk(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      documento_id: 'doc-1',
      object_key: OBJECT_KEY,
      deleted: true,
      georef_rows_deleted: 0,
      georef_preservado: false,
      ...over,
    }),
  } as unknown as Response;
}

function excluirMutation() {
  renderHook(() => useExcluirDocumento('cliente-1'));
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) =>
      o as {
        mutationFn: (input: DocumentoArquivoRow) => Promise<Record<string, unknown>>;
        onSuccess: (data: Record<string, unknown>, doc: DocumentoArquivoRow) => void;
        onError: (e: unknown) => void;
      },
  )[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  reactQueryMocks.useQueryClient.mockReturnValue(qcMocks);
  apiMocks.fetchWithAuth.mockResolvedValue(respostaOk());
});

describe('useExcluirDocumento', () => {
  it('delega a exclusão ao backend identificando o documento por id', async () => {
    const resultado = await excluirMutation().mutationFn(docRow());

    // documento_id, e NÃO gcs_uri: aceitar a URI do cliente permitiria apontar
    // para o objeto de outro cliente usando a própria linha como credencial.
    expect(apiMocks.fetchWithAuth).toHaveBeenCalledWith(
      'https://api.test/api/v1/osg/documentos/delete',
      { method: 'POST', body: JSON.stringify({ documento_id: 'doc-1' }) },
      // Timeout maior que o default de 30s: abortar no cliente não aborta o
      // servidor, então o erro de timeout mentiria sobre o que aconteceu.
      60000,
    );
    expect(resultado).toMatchObject({ deleted: true, object_key: OBJECT_KEY });
  });

  it('não escreve o metadado pelo cliente (a RLS de UPDATE é a autorização, no backend)', async () => {
    await excluirMutation().mutationFn(docRow());

    expect(dbMocks.from).not.toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it('registra a exclusão na trilha de auditoria', async () => {
    await excluirMutation().mutationFn(docRow());

    expect(auditMocks.logAction).toHaveBeenCalledWith({
      area: 'osg',
      entity_type: 'documento_arquivo',
      entity_id: 'doc-1',
      entity_name: 'contrato.pdf',
      action: 'deleted',
      changed_fields: { excluido: { old: false, new: true } },
      details: `Arquivo apagado do storage (${OBJECT_KEY})`,
    });
  });

  it('audita como linha sem arquivo quando o backend informa object_key nulo', async () => {
    apiMocks.fetchWithAuth.mockResolvedValue(respostaOk({ object_key: null, deleted: false }));

    await excluirMutation().mutationFn(docRow({ gcs_uri: null }));

    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ details: 'Linha sem arquivo associado' }),
    );
  });

  it('traduz o 403 do backend em mensagem de permissão e não audita', async () => {
    apiMocks.fetchWithAuth.mockResolvedValue({ ok: false, status: 403 } as Response);

    await expect(excluirMutation().mutationFn(docRow())).rejects.toThrow(
      'Sem permissão para excluir este documento (ou ele já estava excluído).',
    );
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  it('falha com mensagem genérica nos outros erros do backend', async () => {
    apiMocks.fetchWithAuth.mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(excluirMutation().mutationFn(docRow())).rejects.toThrow(
      'Falha ao excluir o documento',
    );
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  it('propaga erro de rede sem auditar', async () => {
    apiMocks.fetchWithAuth.mockRejectedValue(new Error('Sessão expirada'));

    await expect(excluirMutation().mutationFn(docRow())).rejects.toThrow('Sessão expirada');
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  // A invalidação por prefixo é a única, e é ela que recompõe também o checklist
  // do consultor, hoje derivado desta mesma lista.
  it('invalida as listas de documentos do cliente', () => {
    excluirMutation().onSuccess({ deleted: true }, docRow());

    expect(qcMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['documento-arquivo', 'cliente-1'],
    });
    expect(toastMocks.toast).toHaveBeenCalledWith({
      title: 'Documento excluído',
      description: 'O arquivo foi apagado do storage.',
    });
  });

  it('não afirma ter apagado o arquivo quando os bytes já não estavam lá', () => {
    excluirMutation().onSuccess({ deleted: false }, docRow());

    expect(toastMocks.toast).toHaveBeenCalledWith({
      title: 'Documento excluído',
      description: 'O registro foi excluído (o arquivo já não estava no storage).',
    });
  });

  it('invalida o georref da matrícula quando o documento excluído era georreferenciamento', () => {
    const doc = docRow({ categoria: 'georreferenciamento', matricula_id: 'mat-9' });
    excluirMutation().onSuccess({ deleted: true }, doc);

    // O backend purga as linhas no BigQuery; sem isto a tela Gerar montaria a
    // tabela de vértices (e o .docx) com coordenadas que já não existem.
    expect(qcMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['georef-by-matricula', 'mat-9'],
    });
  });

  it('não invalida georref para documento de outra categoria', () => {
    excluirMutation().onSuccess({ deleted: true }, docRow({ matricula_id: 'mat-9' }));

    expect(qcMocks.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['georef-by-matricula', 'mat-9'],
    });
  });

  it('mostra o motivo da falha no toast de erro', () => {
    excluirMutation().onError(new Error('storage-fora-do-ar'));

    expect(toastMocks.toast).toHaveBeenCalledWith({
      title: 'Erro ao excluir',
      description: 'storage-fora-do-ar',
      variant: 'destructive',
    });
  });
});

/**
 * Encadeamento do PostgREST: a mesma cadeia serve para a leitura da linha
 * anterior (select → eq → maybeSingle) e para o update (update → eq → select →
 * single), que é como o hook fala com o banco.
 */
function mockCadeia(anterior: Record<string, unknown> | null, depois: Record<string, unknown>) {
  const cadeia: Record<string, unknown> = {};
  cadeia.select = vi.fn(() => cadeia);
  cadeia.update = vi.fn(() => cadeia);
  cadeia.eq = vi.fn(() => cadeia);
  cadeia.maybeSingle = vi.fn(async () => ({ data: anterior, error: null }));
  cadeia.single = vi.fn(async () => ({ data: depois, error: null }));
  dbMocks.from.mockReturnValue(cadeia);
  return cadeia;
}

function atualizarMutation() {
  renderHook(() => useAtualizarDocumento('cliente-1'));
  return reactQueryMocks.useMutation.mock.calls.map(
    ([o]) =>
      o as {
        mutationFn: (input: {
          id: string;
          patch: AtualizarDocumentoPatch;
          origem?: string;
        }) => Promise<DocumentoArquivoRow>;
      },
  )[0];
}

const SEM_DONO = { pessoa_id: null, bem_id: null, matricula_id: null, triado_em: null };

describe('useAtualizarDocumento — auditoria do vínculo (BER-41)', () => {
  it('registra o vínculo com o antes e o depois do dono', async () => {
    mockCadeia(SEM_DONO, { ...docRow(), ...SEM_DONO, pessoa_id: 'P1' });

    await atualizarMutation().mutationFn({
      id: 'doc-1',
      patch: { pessoa_id: 'P1', bem_id: null, matricula_id: null },
      origem: 'Cadastro por Documento',
    });

    expect(auditMocks.logAction).toHaveBeenCalledWith({
      area: 'osg',
      entity_type: 'documento_arquivo',
      entity_id: 'doc-1',
      entity_name: 'contrato.pdf',
      action: 'updated',
      changed_fields: { pessoa_id: { old: null, new: 'P1' } },
      details: 'Cadastro por Documento',
    });
  });

  it('registra também a marca "é do cliente" e a saída dela', async () => {
    dbMocks.getUser.mockResolvedValue({ data: { user: { id: 'U1' } } });
    mockCadeia(SEM_DONO, { ...docRow(), ...SEM_DONO, triado_em: '2026-08-05T10:00:00Z' });

    await atualizarMutation().mutationFn({
      id: 'doc-1',
      patch: { ...SEM_DONO, triado_em: '2026-08-05T10:00:00Z' },
    });

    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        changed_fields: { triado_em: { old: null, new: '2026-08-05T10:00:00Z' } },
      }),
    );
  });

  // Renomear e trocar categoria passam pela mesma mutation. Nenhum dos dois é
  // mudança de dono, e o histórico da ficha não deve encher com isso.
  it('não audita quando o dono não mudou', async () => {
    mockCadeia({ ...SEM_DONO, pessoa_id: 'P1' }, { ...docRow(), ...SEM_DONO, pessoa_id: 'P1' });

    await atualizarMutation().mutationFn({ id: 'doc-1', patch: { nome_original: 'novo.pdf' } });

    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });

  it('falha da auditoria não derruba o vínculo já gravado', async () => {
    auditMocks.logAction.mockRejectedValueOnce(new Error('audit_logs fora do ar'));
    mockCadeia(SEM_DONO, { ...docRow(), ...SEM_DONO, pessoa_id: 'P1' });

    const linha = await atualizarMutation().mutationFn({
      id: 'doc-1',
      patch: { pessoa_id: 'P1', bem_id: null, matricula_id: null },
    });

    expect(linha.id).toBe('doc-1');
    expect(linha.pessoa_id).toBe('P1');
  });
});

describe('useBaixarDocumento — registro do acesso (EDU-8)', () => {
  const RESPOSTA_ASSINADA = {
    ok: true,
    status: 200,
    json: async () => ({ signed_url: 'https://storage.test/objeto-1.pdf?assinatura' }),
  } as unknown as Response;

  function baixarMutation() {
    renderHook(() => useBaixarDocumento());
    return reactQueryMocks.useMutation.mock.calls.map(
      ([o]) =>
        o as {
          mutationFn: (row: DocumentoArquivoRow) => Promise<void>;
          onSuccess: () => void;
          onError: (e: unknown) => void;
        },
    )[0];
  }

  /** A gravação é disparada e esquecida: os avisos dela chegam num microtask. */
  const esvaziarFila = () => new Promise(resolve => setTimeout(resolve, 0));

  const abrir = vi.fn();
  const erroNoConsole = vi.fn();
  const ordem: string[] = [];

  beforeEach(() => {
    ordem.length = 0;
    apiMocks.fetchWithAuth.mockResolvedValue(RESPOSTA_ASSINADA);
    abrir.mockImplementation(() => {
      ordem.push('abriu');
      return null;
    });
    dbMocks.rpc.mockImplementation(() => {
      ordem.push('registrou');
      return Promise.resolve({ data: 'ev-1', error: null });
    });
    vi.stubGlobal('open', abrir);
    vi.spyOn(console, 'error').mockImplementation(erroNoConsole);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('identifica o documento por id, nunca pela URI do objeto', async () => {
    await baixarMutation().mutationFn(docRow());

    expect(dbMocks.rpc).toHaveBeenCalledWith('registrar_download_documento', {
      _documento_id: 'doc-1',
    });
  });

  // A ordem é requisito, não estilo: adiar a abertura para fora do turno
  // síncrono do gesto faz o navegador bloquear a janela.
  it('grava depois de abrir a URL assinada, e não antes', async () => {
    await baixarMutation().mutationFn(docRow());

    expect(ordem).toEqual(['abriu', 'registrou']);
  });

  it('falha do registro não rejeita a mutação nem avisa o usuário', async () => {
    dbMocks.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    await expect(baixarMutation().mutationFn(docRow())).resolves.toBeUndefined();
    await esvaziarFila();

    // O download funcionou: transformar falha de auditoria em "erro ao baixar"
    // mentiria sobre o que aconteceu. Por isso vai ao console, e não ao toast.
    expect(toastMocks.toast).not.toHaveBeenCalled();
    expect(erroNoConsole).toHaveBeenCalled();
  });

  it('exceção do registro também não derruba o download', async () => {
    dbMocks.rpc.mockRejectedValue(new Error('rede caiu no meio'));

    await expect(baixarMutation().mutationFn(docRow())).resolves.toBeUndefined();
    await esvaziarFila();

    expect(erroNoConsole).toHaveBeenCalled();
  });

  it('não registra tentativa que falhou antes de assinar', async () => {
    apiMocks.fetchWithAuth.mockResolvedValue({ ok: false, status: 403 } as unknown as Response);

    await expect(baixarMutation().mutationFn(docRow())).rejects.toThrow('Falha ao gerar link');
    expect(abrir).not.toHaveBeenCalled();
    expect(dbMocks.rpc).not.toHaveBeenCalled();
  });

  it('invalida a aba de auditoria por prefixo, sem saber qual período está aberto', () => {
    baixarMutation().onSuccess();

    expect(qcMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [DOWNLOADS_QUERY_KEY],
    });
  });
});
