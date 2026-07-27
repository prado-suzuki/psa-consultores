import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));

const qcMocks = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const apiMocks = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
const auditMocks = vi.hoisted(() => ({ logAction: vi.fn() }));
const dbMocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn() }));

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
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));

// useOsgChecklist NÃO é mockado de propósito: o teste ancora na fábrica de chave
// real (checklistClienteKey), senão um rename lá passaria batido aqui — que é
// exatamente o drift que a invalidação do checklist precisa evitar.
import { checklistClienteKey } from '@/hooks/useOsgChecklist';
import { useExcluirDocumento, type DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

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

  it('invalida as listas de documentos e o checklist', () => {
    excluirMutation().onSuccess({ deleted: true }, docRow());

    expect(qcMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['documento-arquivo', 'cliente-1'],
    });
    expect(qcMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: checklistClienteKey('cliente-1'),
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
