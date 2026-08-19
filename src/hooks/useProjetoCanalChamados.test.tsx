import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { makeHookWrapper } from '@/test/queryWrapper';
import { mockSupabaseChain } from '@/test/supabaseMock';
import { useProjetoCanalChamados } from './useProjetoCanalChamados';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

function mockProjeto(result: { data: unknown; error: { message: string } | null }) {
  const chain = mockSupabaseChain(result);
  vi.mocked(supabase.from).mockImplementation((() => chain) as never);
  return chain;
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset();
});

describe('useProjetoCanalChamados', () => {
  it('devolve o id do projeto de canal do cliente', async () => {
    mockProjeto({ data: { id: 'proj-canal', produto_segmento: { is_canal_chamados: true } }, error: null });
    const { result } = renderHook(() => useProjetoCanalChamados('cli-1'), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('proj-canal');
  });

  it('cliente nulo não dispara consulta', () => {
    mockProjeto({ data: null, error: null });
    const { result } = renderHook(() => useProjetoCanalChamados(null), {
      wrapper: makeHookWrapper(),
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('cliente sem projeto de canal devolve null, sem estourar', async () => {
    // Este é o caso NORMAL que a tela existe para detectar — por isso
    // `maybeSingle()` e não `single()`.
    mockProjeto({ data: null, error: null });
    const { result } = renderHook(() => useProjetoCanalChamados('cli-sem-projeto'), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('erro é propagado, e não vira valor neutro', async () => {
    // Sem isto, "não consegui olhar" e "cliente sem projeto" seriam a mesma
    // coisa na tela, e o aviso mentiria.
    mockProjeto({ data: null, error: { message: 'permission denied for table org_projects' } });
    const { result } = renderHook(() => useProjetoCanalChamados('cli-1'), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: 'permission denied for table org_projects' });
    expect(result.current.data).toBeUndefined();
  });

  it('recorta pela marca is_canal_chamados com embutido !inner, nunca por código de produto', async () => {
    // O `!inner` é o que faz o filtro recortar a linha-pai; sem ele o hook
    // devolveria projeto que não é de canal. E o produto é resolvido pela marca
    // porque o código muda entre bancos (`01-CHA` em produção, `CHA` em dev).
    const chain = mockProjeto({ data: { id: 'proj-canal' }, error: null });
    const { result } = renderHook(() => useProjetoCanalChamados('cli-1'), {
      wrapper: makeHookWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('org_projects');
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('produto_segmento!inner'));
    expect(chain.eq).toHaveBeenCalledWith('external_client_id', 'cli-1');
    expect(chain.eq).toHaveBeenCalledWith('produto_segmento.is_canal_chamados', true);
    expect(chain.maybeSingle).toHaveBeenCalled();
    expect(chain.single).not.toHaveBeenCalled();
  });
});
