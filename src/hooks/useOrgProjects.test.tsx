import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { makeHookWrapper } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { useCreateOrgProject, useOrgProjects, useOrgProjectsList, type OrgProjectFormData } from './useOrgProjects';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
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

  /**
   * O rótulo da coluna Produto sai de `produto_segmento_id`, o dado gravado.
   * A concatenação dos produtos da OS é só fallback do projeto antigo — e é
   * justamente ela que mostrava três produtos numa OS de três produtos.
   */
  describe('rótulo do produto', () => {
    const OS_PRODUTOS = [
      { ordem_servico_id: 'os-1', produto_segmento_id: 'prd-a', produto_segmento: { id: 'prd-a', codigo: 'DC', nome: 'Diagnóstico contábil' } },
      { ordem_servico_id: 'os-1', produto_segmento_id: 'prd-b', produto_segmento: { id: 'prd-b', codigo: 'CHA', nome: 'Canal de Chamados' } },
    ];

    function mockComProdutos(projetos: unknown[], produtoSegmento: unknown[] = []) {
      chains.org_projects = mockSupabaseChain({ data: projetos, error: null });
      chains.cliente = mockSupabaseChain({ data: CLIENTES, error: null });
      chains.os_produtos_contratados = mockSupabaseChain({ data: OS_PRODUTOS, error: null });
      chains.produto_segmento = mockSupabaseChain({ data: produtoSegmento, error: null });
      vi.mocked(supabase.from).mockImplementation(((table: string) =>
        chains[table] ?? mockSupabaseChain({ data: [], error: null })) as never);
    }

    it('mostra só o produto do projeto, não os da OS inteira', async () => {
      mockComProdutos([projeto({ ordem_servico_id: 'os-1', produto_segmento_id: 'prd-b' })]);
      const { result } = renderHook(() => useOrgProjects(), { wrapper: makeHookWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0].servico_contratado).toBe('CHA — Canal de Chamados');
    });

    it('projeto antigo sem produto gravado ainda cai nos produtos da OS', async () => {
      mockComProdutos([projeto({ ordem_servico_id: 'os-1' })]);
      const { result } = renderHook(() => useOrgProjects(), { wrapper: makeHookWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0].servico_contratado)
        .toBe('DC — Diagnóstico contábil, CHA — Canal de Chamados');
    });

    it('produto que não está na OS do projeto é buscado no catálogo', async () => {
      // Produto saiu da OS depois, ou o projeto nem tem OS: sem essa busca o
      // rótulo sumiria no caso que a coluna existe para resolver.
      mockComProdutos(
        [projeto({ ordem_servico_id: null, produto_segmento_id: 'prd-z' })],
        [{ id: 'prd-z', codigo: 'AF', nome: 'Atendimento a fiscalizações' }],
      );
      const { result } = renderHook(() => useOrgProjects(), { wrapper: makeHookWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.[0].servico_contratado).toBe('AF — Atendimento a fiscalizações');
    });
  });

  /**
   * Abrir a demanda dispara a geração das tarefas do produto (ALE-7).
   *
   * A chamada vive em `insertProjectWithMembers`, e não no `onSuccess`: o lote
   * tem um sucesso para N projetos e só devolve contagens, então os ids não
   * chegariam lá. Estes testes cobrem o contrato dessa chamada e — o mais
   * importante — que a falha dela não derruba a criação do projeto.
   */
  describe('geração de tarefas na criação do projeto', () => {
    const formulario = {
      name: 'Fazenda Horizonte — CHA',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      leader_ids: [],
      responsible_id: '',
      external_client_id: 'cli-daqui',
      estrutura_area_id: '',
      equipe_id: '',
      is_multidisciplinar: false,
      member_ids: [],
      ordem_servico_id: '',
      servico_id: '',
      produto_segmento_id: 'prd-b',
    } satisfies OrgProjectFormData;

    beforeEach(() => {
      vi.mocked(supabase.from).mockReset();
      vi.mocked(supabase.rpc).mockReset();
      // Insert do projeto devolvendo o id; sem membros, a segunda tabela não é
      // tocada (buildMembersList devolve lista vazia).
      const chain = mockSupabaseChain({ data: { id: 'proj-novo' }, error: null });
      vi.mocked(supabase.from).mockImplementation(((): unknown => chain) as never);
    });

    it('chama a RPC com o id do projeto recém-criado', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: 3, error: null } as never);
      const { result } = renderHook(() => useCreateOrgProject(), { wrapper: makeHookWrapper() });

      result.current.mutate(formulario);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(supabase.rpc).toHaveBeenCalledWith('gerar_tarefas_projeto', { _project_id: 'proj-novo' });
    });

    it('RPC recusada NÃO derruba a criação: o projeto fica, e o erro vai só ao console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'projeto fora do seu escopo', code: '42501' },
      } as never);
      const { result } = renderHook(() => useCreateOrgProject(), { wrapper: makeHookWrapper() });

      result.current.mutate(formulario);

      // A mutação conclui em SUCESSO: quem pediu criou o projeto, e é o projeto
      // que ela devolve. A geração de tarefa é efeito, não requisito.
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ id: 'proj-novo' });
      expect(consoleError).toHaveBeenCalledWith(
        'Erro ao gerar tarefas do projeto:',
        'proj-novo',
        expect.objectContaining({ code: '42501' }),
      );
      consoleError.mockRestore();
    });

    it('RPC lançando exceção de rede também não derruba a criação', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Failed to fetch'));
      const { result } = renderHook(() => useCreateOrgProject(), { wrapper: makeHookWrapper() });

      result.current.mutate(formulario);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
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
