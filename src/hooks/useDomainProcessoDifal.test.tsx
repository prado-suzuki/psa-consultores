import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const registrations = vi.hoisted(() => ({ queries: [] as unknown[], mutations: [] as unknown[] }));
const apiMocks = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
const rlsMocks = vi.hoisted(() => ({ assertCanPerform: vi.fn() }));
const dbMock = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: unknown) => {
    registrations.queries.push(options);
    return options;
  }),
  useMutation: vi.fn((options: unknown) => {
    registrations.mutations.push(options);
    return { mutate: vi.fn(), mutateAsync: vi.fn() };
  }),
}));
vi.mock('@/hooks/useApiAuth', () => ({ useApiAuth: () => apiMocks }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => toastMocks }));
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: dbMock }));

import { API_BASE_URL, currentAmbiente } from '@/config/api';
import {
  useProcessoDifalClassificacoesQuery,
  useProcessoDifalClientesQuery,
  useProcessoDifalContribuintesQuery,
  useProcessoDifalGroupedItemsQuery,
} from '@/hooks/useDomainProcessoDifalQueries';
import { useDomainProcessoDifalSession } from '@/hooks/useDomainProcessoDifalSession';
import { useProcessoDifalExport } from '@/hooks/useProcessoDifalExport';
import type { DifalGroupedItem } from '@/types/difal';

interface Registration {
  queryKey?: unknown[];
  enabled?: boolean;
  queryFn?: () => Promise<unknown>;
  mutationFn?: (input: never) => Promise<unknown>;
}
interface DbResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}
const dbCalls: Array<{ table: string; method: string; args: unknown[] }> = [];
const timeline: string[] = [];
const queued = new Map<string, DbResult[]>();

function enqueue(table: string, ...results: DbResult[]) {
  queued.set(table, results);
}
function calls(table: string, method: string) {
  return dbCalls.filter((call) => call.table === table && call.method === method);
}
function makeChain(table: string, result: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'or', 'order', 'limit'];
  for (const method of methods)
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      timeline.push(`${table}.${method}`);
      return chain;
    });
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (value: DbResult) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}
function query(index = registrations.queries.length - 1) {
  return registrations.queries[index] as Registration;
}
function mutations() {
  return registrations.mutations as Registration[];
}
const groupedItem: DifalGroupedItem = {
  groupKey: 'Produto|P1|1000',
  xProd: 'Produto',
  cod_produto: 'P1',
  cod_ncm: '1000',
  id_contribuinte: 'contrib-1',
  cfop: '2102',
  cst_icms: '00',
  aliq_icms: 17,
  pRedBC: null,
  count: 1,
  totalValue: 10,
  nfesCount: 1,
  status: 'pendente',
  classificacao: null,
};

beforeEach(() => {
  registrations.queries.length = 0;
  registrations.mutations.length = 0;
  dbCalls.length = 0;
  timeline.length = 0;
  queued.clear();
  vi.clearAllMocks();
  dbMock.from.mockImplementation((table: string) => {
    timeline.push(`${table}.from`);
    return makeChain(table, queued.get(table)?.shift() ?? { data: [], error: null });
  });
  rlsMocks.assertCanPerform.mockImplementation(async (...args: unknown[]) => {
    timeline.push(`precheck:${args[0]}:${args[1]}`);
  });
});

describe('queries DIFAL', () => {
  it('registra query keys e enabled conforme os filtros mínimos', () => {
    renderHook(() => {
      useProcessoDifalClientesQuery();
      useProcessoDifalContribuintesQuery('');
      useProcessoDifalGroupedItemsQuery({
        selectedContribuinte: 'c1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        currentPage: 2,
        statusFilter: 'pending',
        searchTriggered: false,
      });
      useProcessoDifalClassificacoesQuery([groupedItem]);
    });
    expect((registrations.queries as Registration[]).map((r) => r.queryKey)).toEqual([
      ['difal-clientes'],
      ['difal-contribuintes', ''],
      ['difal-grouped-items', 'c1', '2026-01-01', '2026-01-31', 2, 'pending'],
      ['difal-classificacoes', ['P1|1000']],
    ]);
    expect((registrations.queries as Registration[]).map((r) => r.enabled)).toEqual([
      undefined,
      false,
      false,
      true,
    ]);
  });

  it('clientes e contribuintes aplicam ambiente/excluído e demais filtros', async () => {
    renderHook(() => useProcessoDifalClientesQuery());
    await query().queryFn?.();
    expect(calls('cliente', 'eq').map((c) => c.args)).toEqual([
      ['ativo', true],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
    expect(calls('cliente', 'or')[0].args).toEqual(['nome.ilike.Barralcool,nome.ilike.COPRODIA']);

    renderHook(() => useProcessoDifalContribuintesQuery('cliente-1'));
    await query().queryFn?.();
    expect(calls('contribuinte', 'eq').map((c) => c.args)).toEqual([
      ['cliente_id', 'cliente-1'],
      ['excluido', false],
      ['ambiente', currentAmbiente],
    ]);
  });

  it('monta URLs e payloads exatos para itens e classificações', async () => {
    apiMocks.fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        total: 9,
        has_more: true,
        qtd_validados: 4,
        qtd_pendentes: 5,
      }),
    });
    renderHook(() =>
      useProcessoDifalGroupedItemsQuery({
        selectedContribuinte: 'c/1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        currentPage: 3,
        statusFilter: 'validated',
        searchTriggered: true,
      }),
    );
    await query().queryFn?.();
    expect(apiMocks.fetchWithAuth).toHaveBeenLastCalledWith(
      `${API_BASE_URL}/api/v1/query/contribuintes/c/1/nfes/agrupado-item?data_inicio=2026-01-01&data_fim=2026-01-31&tipo_mov=Entrada&page=3&page_size=25&valid=true`,
    );

    apiMocks.fetchWithAuth.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    renderHook(() => useProcessoDifalClassificacoesQuery([groupedItem]));
    await query().queryFn?.();
    expect(apiMocks.fetchWithAuth).toHaveBeenLastCalledWith(
      `${API_BASE_URL}/api/v1/classificacoes/buscar`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: [{ id_contribuinte: 'contrib-1', cod_produto: 'P1', cod_ncm: '1000' }],
        }),
      },
    );
  });
});

describe('sessões DIFAL', () => {
  const input = {
    userId: 'u1',
    clienteId: 'cli1',
    clienteNome: 'Cliente',
    contribuinteId: 'c1',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  };

  it('restaura sessão atual e conta decisões', async () => {
    enqueue('difal_sessao', {
      data: {
        id: 's1',
        cliente_id: 'cli1',
        status: 'EM_ANDAMENTO',
        request_original: { contribuinte_id: 'c1' },
      },
      error: null,
    });
    enqueue('difal_decisao', { count: 2, error: null });
    renderHook(() => useDomainProcessoDifalSession());
    await expect(mutations()[0].mutationFn?.('u1' as never)).resolves.toEqual({
      id: 's1',
      clienteId: 'cli1',
      status: 'EM_ANDAMENTO',
      request: { contribuinte_id: 'c1' },
      decisionsCount: 2,
    });
  });

  it('atualiza sessão existente somente depois do precheck', async () => {
    enqueue('difal_sessao', { data: { id: 's1' }, error: null }, { error: null });
    enqueue('difal_decisao', { count: 3, error: null });
    renderHook(() => useDomainProcessoDifalSession());
    await expect(mutations()[1].mutationFn?.(input as never)).resolves.toEqual({
      sessionId: 's1',
      existingSession: true,
      decisionsCount: 3,
    });
    expect(rlsMocks.assertCanPerform).toHaveBeenCalledWith('difal_sessao', 'update', 's1');
    expect(timeline.indexOf('precheck:difal_sessao:update')).toBeLessThan(
      timeline.indexOf('difal_sessao.update'),
    );
    expect(calls('difal_sessao', 'update')[0].args[0]).toMatchObject({
      cliente_id: 'cli1',
      periodo: '2026-01-01 a 2026-01-31',
      uf: 'MT',
    });
  });

  it('insere sessão nova com request original e sem precheck', async () => {
    enqueue('difal_sessao', { data: null, error: null }, { data: { id: 'nova' }, error: null });
    enqueue('difal_decisao', { count: 0, error: null });
    renderHook(() => useDomainProcessoDifalSession());
    await expect(mutations()[1].mutationFn?.(input as never)).resolves.toEqual({
      sessionId: 'nova',
      existingSession: false,
      decisionsCount: 0,
    });
    expect(calls('difal_sessao', 'insert')[0].args[0]).toMatchObject({
      usuario_id: 'u1',
      status: 'EM_ANDAMENTO',
      request_original: {
        contribuinte_id: 'c1',
        data_inicio: '2026-01-01',
        data_fim: '2026-01-31',
      },
    });
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('sincroniza na sequência atual e ignora erros das atualizações finais', async () => {
    enqueue(
      'difal_decisao',
      {
        data: [{ id: 'd1', cod_ncm: '1000', decisao: 'SEM_ST', id_icms_st_bq: null }],
        error: null,
      },
      { error: new Error('delete ignorado') },
    );
    enqueue('difal_sessao', { error: new Error('update ignorado') });
    apiMocks.fetchWithAuth.mockImplementation(async () => {
      timeline.push('fetch:sync');
      return { ok: true };
    });
    renderHook(() => useDomainProcessoDifalSession());
    await expect(
      mutations()[2].mutationFn?.({ sessionId: 's1', groupedItems: [groupedItem] } as never),
    ).resolves.toBe(1);
    expect(rlsMocks.assertCanPerform.mock.calls).toEqual([
      ['difal_sessao', 'update', 's1'],
      ['difal_decisao', 'delete', 'd1'],
    ]);
    expect(timeline).toEqual(
      expect.arrayContaining(['fetch:sync', 'difal_sessao.update', 'difal_decisao.delete']),
    );
    expect(timeline.indexOf('precheck:difal_decisao:delete')).toBeLessThan(
      timeline.indexOf('fetch:sync'),
    );
    expect(timeline.indexOf('fetch:sync')).toBeLessThan(timeline.indexOf('difal_sessao.update'));
    expect(apiMocks.fetchWithAuth).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/classificacoes/sync`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          sessao_id: 's1',
          decisoes: [
            {
              id_contribuinte: 'contrib-1',
              cod_produto: 'P1',
              cod_ncm: '1000',
              decisao: 'SEM_ST',
              id_icms_st: null,
            },
          ],
        }),
      }),
    );
  });
});

describe('exportação DIFAL', () => {
  it('baixa URL direta retornada em JSON', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    apiMocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ download_url: 'https://files/export.xlsx', file_name: 'direto.xlsx' }),
    });
    renderHook(() => useProcessoDifalExport());
    await act(async () => {
      await mutations()[0].mutationFn?.({
        contribuinteId: 'c1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        pendingDecisionsCount: 0,
      } as never);
    });
    expect(apiMocks.fetchWithAuth).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/ncm/calculo-difal/exportar/c1`,
      expect.objectContaining({ method: 'POST' }),
      300000,
    );
    expect(click).toHaveBeenCalledOnce();
    expect(toastMocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Exportação concluída' }),
    );
    click.mockRestore();
  });

  it('entra em processamento quando a API retorna uma chave de job', async () => {
    vi.useFakeTimers();
    apiMocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ job_id: 'job-1' }),
    });
    const { result, unmount } = renderHook(() => useProcessoDifalExport());
    await act(async () => {
      await mutations()[0].mutationFn?.({
        contribuinteId: 'c1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        pendingDecisionsCount: 0,
      } as never);
    });
    expect(result.current.exportStatus).toBe('processing');
    expect(result.current.exportMessage).toBe('Processando arquivo...');
    unmount();
    vi.useRealTimers();
  });

  it('baixa resposta binária e preserva filename do header', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    apiMocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment; filename="resultado.xlsx"',
      }),
      body: null,
      blob: async () => new Blob(['xlsx']),
    });
    renderHook(() => useProcessoDifalExport());
    await act(async () => {
      await mutations()[0].mutationFn?.({
        contribuinteId: 'c1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        pendingDecisionsCount: 0,
      } as never);
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
