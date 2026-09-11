import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useSaveClientTransaction } from './useSaveClientTransaction';
import { toast } from 'sonner';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(), rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc stub' } })) } }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn(), logActionOrThrow: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

interface Chamada { tabela: string; metodo: string; args: unknown[] }
const chamadas: Chamada[] = [];

/** O que a cadeia de leitura da tabela `cliente` devolve neste teste. */
let respostaCliente: { data: unknown; error: unknown } = { data: [], error: null };

/**
 * Cadeia PostgREST de mentira que registra as chamadas.
 *
 * Não reaproveita `@/test/supabaseCapture` porque aqui é preciso devolver
 * `error` na leitura — o helper só sabe devolver `{ data, error: null }`, e é
 * justamente o ramo de erro que um destes testes exercita.
 */
function cadeia(tabela: string) {
  const chain: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'in', 'is', 'update', 'insert', 'delete']) {
    chain[metodo] = vi.fn((...args: unknown[]) => { chamadas.push({ tabela, metodo, args }); return chain; });
  }
  chain.then = (ok: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(respostaCliente).then(ok);
  return chain;
}

/** Cadastro mínimo que passa nas validações e chega na verificação de duplicidade. */
const CLIENTE_NOVO = {
  nome: 'Agro MMS',
  categoria: 'A',
  ativo: true,
  fixo: '',
  telefone: '',
  municipio: '',
  uf: '',
  observacoes: '',
  cluster_ids: ['cl-1'],
};

function renderizar(over: { nome?: string; onDuplicateFound?: (nome: string) => Promise<boolean> } = {}) {
  const onDuplicateFound = vi.fn(over.onDuplicateFound ?? (async () => false));
  const onSuccess = vi.fn();
  const { result } = renderHook(() =>
    useSaveClientTransaction({
      clientData: { ...CLIENTE_NOVO, nome: over.nome ?? CLIENTE_NOVO.nome },
      entities: [],
      participants: [],
      contracts: [],
      inscricoesMap: {},
      clusterIds: ['cl-1'],
      isEditing: false,
      setoresCliente: [],
      onDuplicateFound,
      onSuccess,
    })
  );
  return { result, onDuplicateFound, onSuccess };
}

const selectsDeCliente = () => chamadas.filter(c => c.tabela === 'cliente' && c.metodo === 'select');

describe('useSaveClientTransaction', () => {
  beforeEach(() => {
    // Sem isto os testes ficam dependentes da ORDEM: `toast.error` e
    // `supabase.rpc` acumulariam chamadas de um teste para o outro, e um
    // `not.toHaveBeenCalled()` passaria ou falharia conforme quem rodou antes.
    vi.clearAllMocks();
    chamadas.length = 0;
    respostaCliente = { data: [], error: null };
    vi.mocked(supabase.from).mockImplementation((t: string) => cadeia(t) as never);
  });

  it('interrompe o salvamento quando a consulta de duplicidade falha', async () => {
    respostaCliente = { data: null, error: { message: 'timeout' } };
    const { result, onDuplicateFound } = renderizar();

    await result.current.executeSave();

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onDuplicateFound).not.toHaveBeenCalled();
  });

  it('filtra clientes duplicados pelo ambiente corrente', async () => {
    const { result } = renderizar();

    await result.current.executeSave();

    const eqCalls = chamadas.filter((c) => c.tabela === 'cliente' && c.metodo === 'eq');
    const temExcluido = eqCalls.some((c) => c.args[0] === 'excluido' && c.args[1] === false);
    // 'dev' e não `currentAmbiente`: o jsdom serve em localhost, que não está em
    // PRODUCTION_HOSTNAMES. Comparar com a mesma constante que o código usa não
    // provaria nada.
    const temAmbiente = eqCalls.some((c) => c.args[0] === 'ambiente' && c.args[1] === 'dev');

    expect(temExcluido).toBe(true);
    expect(temAmbiente).toBe(true);
  });

  it('segundo clique não dispara segunda verificação', async () => {
    const { result } = renderizar();

    const p1 = result.current.executeSave();
    const p2 = result.current.executeSave();
    await Promise.all([p1, p2]);

    expect(selectsDeCliente()).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('saving fica true desde o início, antes do diálogo de duplicidade', async () => {
    respostaCliente = { data: [{ id: 'c1', nome: 'Agro MMS' }], error: null };
    let responderDialogo!: (v: boolean) => void;
    const { result } = renderizar({
      onDuplicateFound: () => new Promise<boolean>(resolve => { responderDialogo = resolve; }),
    });

    let pendente!: Promise<void>;
    await act(async () => { pendente = result.current.executeSave(); });
    expect(result.current.saving).toBe(true);
    await act(async () => { responderDialogo(false); await pendente; });
    expect(result.current.saving).toBe(false);
  });

  it('nome duplicado com grafia diferente dispara o aviso e não cria o cliente', async () => {
    respostaCliente = { data: [{ id: 'c1', nome: '  AGRO   MMS ' }], error: null };
    const { result, onDuplicateFound } = renderizar({ nome: 'Agro Mms' });

    await result.current.executeSave();

    expect(onDuplicateFound).toHaveBeenCalledWith('Agro Mms');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('confirmar o aviso de duplicidade deixa o cadastro seguir', async () => {
    respostaCliente = { data: [{ id: 'c1', nome: 'Agro MMS' }], error: null };
    const { result, onDuplicateFound } = renderizar({ onDuplicateFound: async () => true });

    await result.current.executeSave();

    expect(onDuplicateFound).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith(
      'criar_cliente_com_clusters',
      expect.objectContaining({ p_cliente: expect.objectContaining({ nome: 'Agro MMS', ambiente: 'dev' }) }),
    );
  });

  it('a trava é solta: um segundo salvamento posterior roda de novo', async () => {
    const { result } = renderizar();

    await result.current.executeSave();
    await result.current.executeSave();

    expect(selectsDeCliente()).toHaveLength(2);
    expect(result.current.saving).toBe(false);
  });
});
