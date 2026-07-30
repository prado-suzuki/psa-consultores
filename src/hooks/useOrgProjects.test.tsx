import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { makeHookWrapper } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { useOrgProjects, useOrgProjectsList } from './useOrgProjects';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const OUTRO_AMBIENTE = currentAmbiente === 'prod' ? 'dev' : 'prod';

// A mesma linha serve à régua de ambiente (id, ambiente) e à resolução de nome
// (id, nome) — são duas consultas na tabela cliente dentro do mesmo queryFn.
const CLIENTES = [
  { id: 'cli-daqui', nome: 'Fazenda Horizonte', ambiente: currentAmbiente },
  { id: 'cli-de-fora', nome: 'Fazenda Horizonte', ambiente: OUTRO_AMBIENTE },
];

const projeto = (patch: Record<string, unknown>) => ({
  id: 'proj-1',
  name: 'Canal de Chamados',
  external_client_id: null,
  contribuinte_id: null,
  ordem_servico_id: null,
  servico_id: null,
  ...patch,
});

/**
 * org_projects não tem coluna `ambiente`: o ambiente do projeto é o do cliente PSA
 * vinculado (ver lib/ambienteScope). Sem esse corte a lista de projetos — e todas
 * as visões de Projetos e tarefas que saem dela — misturava dev e prod.
 */
describe('escopo de ambiente dos projetos', () => {
  const chains: Record<string, ReturnType<typeof mockSupabaseChain>> = {};

  function mockTables(projetos: unknown[]) {
    chains.org_projects = mockSupabaseChain({ data: projetos, error: null });
    chains.cliente = mockSupabaseChain({ data: CLIENTES, error: null });
    vi.mocked(supabase.from).mockImplementation(((table: string) =>
      chains[table] ?? mockSupabaseChain({ data: [], error: null })) as never);
  }

  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('useOrgProjects deixa fora o projeto de cliente de outro ambiente', async () => {
    mockTables([
      projeto({ id: 'proj-daqui', external_client_id: 'cli-daqui' }),
      projeto({ id: 'proj-de-fora', external_client_id: 'cli-de-fora' }),
    ]);
    const { result } = renderHook(() => useOrgProjects(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(p => p.id)).toEqual(['proj-daqui']);
  });

  it('useOrgProjects mantém projeto interno (sem cliente) e cliente irresolvível', async () => {
    mockTables([
      projeto({ id: 'proj-interno' }),
      projeto({ id: 'proj-cliente-apagado', external_client_id: 'cli-inexistente' }),
    ]);
    const { result } = renderHook(() => useOrgProjects(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(p => p.id)).toEqual(['proj-interno', 'proj-cliente-apagado']);
    // Cliente que não resolve continua rotulado como antes, em vez de sumir.
    expect(result.current.data?.[1].external_client).toEqual({ id: 'cli-inexistente', nome: 'Desconhecido' });
  });

  it('useOrgProjectsList aplica o mesmo escopo nos seletores', async () => {
    mockTables([
      projeto({ id: 'proj-daqui', external_client_id: 'cli-daqui' }),
      projeto({ id: 'proj-de-fora', external_client_id: 'cli-de-fora' }),
    ]);
    const { result } = renderHook(() => useOrgProjectsList(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(p => p.id)).toEqual(['proj-daqui']);
  });
});
