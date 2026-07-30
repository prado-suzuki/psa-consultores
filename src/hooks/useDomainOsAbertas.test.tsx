import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { makeHookWrapper } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { useOsAbertasComProdutos } from './useDomainOsAbertas';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const OUTRO_AMBIENTE = currentAmbiente === 'prod' ? 'dev' : 'prod';

const OS_ROW = {
  id: 'os-1',
  numero_os: '035/2026',
  id_cliente: 'cli-1',
  situacao: 'em_andamento',
  data_inicio: '2026-01-01',
  data_fim: '2026-12-31',
  observacoes: 'Escopo combinado',
  os_produtos_contratados: [
    { produto_segmento_id: 'ps-cha', produto_segmento: { codigo: 'CHA', nome: 'Canal de Chamados' } },
  ],
};

/**
 * `ordem_servico` não tem coluna `ambiente`: quem decide o ambiente da OS é o
 * cliente que ela referencia. Estes testes travam esse corte — sem ele o seletor
 * de "Criar Projeto" listava cliente por causa de OS do outro ambiente.
 */
describe('useOsAbertasComProdutos', () => {
  const chains: Record<string, ReturnType<typeof mockSupabaseChain>> = {};

  function mockTables(clientes: Array<{ id: string; ambiente: string }>, osRows: unknown[]) {
    chains.cliente = mockSupabaseChain({ data: clientes, error: null });
    chains.ordem_servico = mockSupabaseChain({ data: osRows, error: null });
    vi.mocked(supabase.from).mockImplementation(((table: string) => chains[table]) as never);
  }

  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('descarta a OS cujo cliente é de outro ambiente', async () => {
    mockTables(
      [{ id: 'cli-1', ambiente: currentAmbiente }, { id: 'cli-1-prod', ambiente: OUTRO_AMBIENTE }],
      [OS_ROW, { ...OS_ROW, id: 'os-2', id_cliente: 'cli-1-prod' }],
    );
    const { result } = renderHook(() => useOsAbertasComProdutos(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(os => os.id)).toEqual(['os-1']);
  });

  it('mantém a OS cujo cliente não aparece na régua (soft delete, RLS)', async () => {
    // Esconder por falta de dado apagaria OS real da tela; o seletor casa por id,
    // então uma OS de cliente irresolvível não é oferecida a ninguém.
    mockTables([{ id: 'cli-1', ambiente: currentAmbiente }], [OS_ROW, { ...OS_ROW, id: 'os-2', id_cliente: 'cli-9' }]);
    const { result } = renderHook(() => useOsAbertasComProdutos(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(os => os.id)).toEqual(['os-1', 'os-2']);
  });

  it('achata os produtos contratados da OS', async () => {
    mockTables([{ id: 'cli-1', ambiente: currentAmbiente }], [OS_ROW]);
    const { result } = renderHook(() => useOsAbertasComProdutos(), { wrapper: makeHookWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toEqual({
      id: 'os-1',
      numero_os: '035/2026',
      cliente_id: 'cli-1',
      situacao: 'em_andamento',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
      observacoes: 'Escopo combinado',
      produtos: [{ produto_segmento_id: 'ps-cha', produto_codigo: 'CHA', produto_nome: 'Canal de Chamados' }],
    });
  });

  it('não consulta nada enquanto o seletor está fechado', () => {
    mockTables([{ id: 'cli-1', ambiente: currentAmbiente }], [OS_ROW]);
    renderHook(() => useOsAbertasComProdutos(false), { wrapper: makeHookWrapper() });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
