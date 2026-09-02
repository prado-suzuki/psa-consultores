/**
 * Testes de caracterização da proposta comercial (ALE-8).
 *
 * O que estes testes travam, e por quê:
 *
 * 1. O PREFIXO da chave de consulta. A lista de propostas herda a invalidação de
 *    `useUploadDocumento` e `useExcluirDocumento` porque começa com
 *    `['documento-arquivo', clienteId]`. Se alguém "arrumar" a chave para algo
 *    próprio, a aba para de atualizar sozinha e o defeito é silencioso.
 * 2. Os QUATRO filtros da leitura, incluindo a categoria. Sem o de categoria a
 *    aba mostraria todos os documentos do cliente.
 * 3. `fonte: 'psa'` na gravação. É o que mantém a proposta fora do portal do
 *    cliente: a policy do cliente exige `fonte = 'cliente'`. Trocar este valor
 *    publica a proposta para quem ela precifica — é o teste mais importante aqui.
 * 4. Vínculo VAZIO. A proposta é do cliente inteiro, e a constraint
 *    `documento_arquivo_um_dono_apenas` só aceita nenhum dono ou um.
 * 5. Falha de auditoria NÃO derruba o anexo. O arquivo já está no storage.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
const auditMocks = vi.hoisted(() => ({ logAction: vi.fn() }));
const uploadMocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const dbMocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/use-toast', () => ({ toast: toastMocks.toast }));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: auditMocks.logAction }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useDocumentoArquivo', () => ({
  useUploadDocumento: () => ({ mutateAsync: uploadMocks.mutateAsync }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: dbMocks.from, auth: { getUser: dbMocks.getUser } },
}));

import { useAnexarProposta, usePropostasDoCliente } from '@/hooks/useDocumentoProposta';

/** Encadeamento do PostgREST, registrando os `eq` para o teste conferir. */
function chainMock(resultado: { data: unknown; error: unknown }) {
  const eqs: Array<[string, unknown]> = [];
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((coluna: string, valor: unknown) => {
      eqs.push([coluna, valor]);
      return chain;
    }),
    order: vi.fn(() => Promise.resolve(resultado)),
  };
  return { chain, eqs };
}

type OpcoesQuery = {
  queryKey: unknown[];
  enabled: boolean;
  queryFn: () => Promise<unknown>;
};
type OpcoesMutation = {
  mutationFn: (file: File) => Promise<{ id: string; nome_original: string }>;
  onSuccess: () => void;
  onError: (e: unknown) => void;
};

const opcoesDaLista = (clienteId: string | null): OpcoesQuery => {
  renderHook(() => usePropostasDoCliente(clienteId));
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as OpcoesQuery)[0];
};

const opcoesDoAnexo = (): OpcoesMutation => {
  renderHook(() => useAnexarProposta('cliente-1'));
  return reactQueryMocks.useMutation.mock.calls.map(([o]) => o as OpcoesMutation)[0];
};

/** Encadeamento do `update`, que a marca de triagem usa. */
function updateChainMock(resultado: { error: unknown } = { error: null }) {
  const patches: unknown[] = [];
  const eqs: Array<[string, unknown]> = [];
  const chain = {
    update: vi.fn((patch: unknown) => {
      patches.push(patch);
      return chain;
    }),
    eq: vi.fn((coluna: string, valor: unknown) => {
      eqs.push([coluna, valor]);
      return Promise.resolve(resultado);
    }),
  };
  return { chain, patches, eqs };
}

beforeEach(() => {
  vi.clearAllMocks();
  auditMocks.logAction.mockResolvedValue(undefined);
  uploadMocks.mutateAsync.mockResolvedValue({ id: 'doc-1', nome_original: 'proposta.pdf' });
  dbMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  dbMocks.from.mockReturnValue(updateChainMock().chain);
});

describe('usePropostasDoCliente', () => {
  it('usa o prefixo compartilhado na chave, para herdar a invalidação', () => {
    const { queryKey } = opcoesDaLista('cliente-1');
    // Os DOIS primeiros elementos são o contrato: é por eles que
    // useUploadDocumento e useExcluirDocumento invalidam.
    expect(queryKey.slice(0, 2)).toEqual(['documento-arquivo', 'cliente-1']);
    // E a chave é própria, senão colidiria com a lista central do cliente.
    expect(queryKey).not.toEqual(['documento-arquivo', 'cliente-1', '__all__']);
  });

  it('não consulta sem cliente', () => {
    expect(opcoesDaLista(null).enabled).toBe(false);
  });

  it('filtra cliente, não excluído, ativo e a categoria da proposta', async () => {
    const { chain, eqs } = chainMock({ data: [], error: null });
    dbMocks.from.mockReturnValue(chain);

    await opcoesDaLista('cliente-1').queryFn();

    expect(dbMocks.from).toHaveBeenCalledWith('documento_arquivo');
    expect(eqs).toEqual([
      ['cliente_id', 'cliente-1'],
      ['excluido', false],
      ['status', 'ativo'],
      ['categoria', 'proposta_comercial'],
    ]);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('propaga erro do banco em vez de devolver lista vazia', async () => {
    const { chain } = chainMock({ data: null, error: new Error('rls') });
    dbMocks.from.mockReturnValue(chain);

    await expect(opcoesDaLista('cliente-1').queryFn()).rejects.toThrow('rls');
  });
});

describe('useAnexarProposta', () => {
  const arquivo = new File(['x'], 'proposta.pdf', { type: 'application/pdf' });

  it('grava como documento da casa, sem vínculo e com a categoria da proposta', async () => {
    await opcoesDoAnexo().mutationFn(arquivo);

    expect(uploadMocks.mutateAsync).toHaveBeenCalledWith({
      clienteId: 'cliente-1',
      vinculo: {},
      categoria: 'proposta_comercial',
      file: arquivo,
      // 'psa' é o que esconde a proposta do portal do cliente.
      fonte: 'psa',
      // Silencia o aviso genérico do hook de baixo; o toast é desta camada.
      silencioso: true,
    });
  });

  it('audita na área de cadastros, como criação', async () => {
    await opcoesDoAnexo().mutationFn(arquivo);

    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'cadastros',
        entity_type: 'documento_arquivo',
        entity_id: 'doc-1',
        entity_name: 'proposta.pdf',
        action: 'created',
      }),
    );
  });

  it('nasce triada, para não cair no balde do Classificar', async () => {
    const { chain, patches, eqs } = updateChainMock();
    dbMocks.from.mockReturnValue(chain);

    await opcoesDoAnexo().mutationFn(arquivo);

    expect(dbMocks.from).toHaveBeenCalledWith('documento_arquivo');
    expect(patches).toHaveLength(1);
    // `semDono` é "sem os três donos E sem triagem": a marca é o que tira a
    // proposta da fila de classificação do consultor.
    expect(patches[0]).toMatchObject({ triado_por: 'user-1' });
    expect((patches[0] as { triado_em: string }).triado_em).toEqual(expect.any(String));
    expect(eqs).toEqual([['id', 'doc-1']]);
  });

  it('não derruba o anexo quando a marca de triagem falha', async () => {
    const { chain } = updateChainMock({ error: new Error('rls') });
    dbMocks.from.mockReturnValue(chain);
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(opcoesDoAnexo().mutationFn(arquivo)).resolves.toMatchObject({ id: 'doc-1' });
    expect(console_).toHaveBeenCalled();
    console_.mockRestore();
  });

  it('não derruba o anexo quando a auditoria falha', async () => {
    auditMocks.logAction.mockRejectedValue(new Error('audit fora do ar'));

    await expect(opcoesDoAnexo().mutationFn(arquivo)).resolves.toMatchObject({ id: 'doc-1' });
  });

  it('deixa a falha do upload subir, para o onError avisar', async () => {
    uploadMocks.mutateAsync.mockRejectedValue(new Error('storage fora do ar'));

    await expect(opcoesDoAnexo().mutationFn(arquivo)).rejects.toThrow('storage fora do ar');
    expect(auditMocks.logAction).not.toHaveBeenCalled();
  });
});
