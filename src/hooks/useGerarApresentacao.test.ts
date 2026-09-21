// A geração dos decks da OSG não tinha teste nenhum quando virou mutation, e é a
// única peça da Biblioteca que baixa arquivo sem deixar rastro no banco — o que
// sobra para conferir é o contrato: o que ela devolve, o que ela baixa e o que ela
// audita.
//
// USA QueryClient DE VERDADE, e não o mock de `@tanstack/react-query` que outros
// testes do repo fazem: o que se quer verificar aqui é justamente a mutation — se
// o `useMutation` fosse mockado, o teste passaria a exercitar o mock.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
const logAction = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction, logActionOrThrow: vi.fn() }),
}));

import { useGerarApresentacao } from '@/hooks/useGerarApresentacao';

const CLIENTE = 'cli-1';

function montar(clienteId: string | null = CLIENTE) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useGerarApresentacao(clienteId), { wrapper });
}

/** Um deck como a Edge Function devolve: bytes inline em base64. */
const deck = (tipo: 'patrimonial' | 'societaria') => ({
  tipo,
  nome: `PSA_${tipo}.pptx`,
  b64: btoa('pptx'),
});

describe('useGerarApresentacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // O download roda de verdade: sem estes dois, o jsdom quebra no object URL.
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  it('sem cliente escolhido, nem chama o servidor', async () => {
    const { result } = montar(null);
    const r = await result.current.mutateAsync('ambas');

    expect(r).toEqual({ arquivos: [], erro: 'nenhum cliente selecionado' });
    expect(invoke).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('devolve os dois decks, baixa cada um e audita pelo cliente', async () => {
    invoke.mockResolvedValue({
      data: { arquivos: [deck('patrimonial'), deck('societaria')] },
      error: null,
    });
    const { result } = montar();
    const r = await result.current.mutateAsync('ambas');

    expect(invoke).toHaveBeenCalledWith('gerar-apresentacao', {
      body: { clienteId: CLIENTE, tipo: 'ambas' },
    });
    expect(r.erro).toBeNull();
    expect(r.arquivos).toEqual([
      { tipo: 'patrimonial', nome: 'PSA_patrimonial.pptx' },
      { tipo: 'societaria', nome: 'PSA_societaria.pptx' },
    ]);
    // um object URL por arquivo — é o que garante que os dois baixaram
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

    // O `b64` NÃO volta para quem chamou: só tipo e nome.
    expect(r.arquivos[0]).not.toHaveProperty('b64');

    await waitFor(() => expect(logAction).toHaveBeenCalledTimes(1));
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'osg',
        entity_type: 'apresentacao_osg',
        // o cliente, e não um id de apresentação: nada é persistido
        entity_id: CLIENTE,
        entity_name: 'PSA_patrimonial.pptx, PSA_societaria.pptx',
        action: 'created',
      }),
    );
  });

  // O servidor já mandava `erros` por deck e passou a mandar `problemas` de
  // cadastro. O hook descartava os dois; o deck saía faltando coisa em silêncio.
  it('carrega os problemas de cadastro e o erro por deck que o servidor devolve', async () => {
    invoke.mockResolvedValue({
      data: {
        arquivos: [deck('patrimonial')],
        erros: [{ tipo: 'societaria', message: 'Template ausente: TEMPLATE_SOCIETARIA.pptx' }],
        problemas: [
          { tipo: 'origem', detalhe: '"Fazenda X" ficou fora do quadro societario.' },
        ],
      },
      error: null,
    });
    const { result } = montar();
    const r = await result.current.mutateAsync('ambas');

    expect(r.erro).toBeNull();
    expect(r.problemas).toEqual([
      { tipo: 'origem', detalhe: '"Fazenda X" ficou fora do quadro societario.' },
    ]);
    expect(r.errosPorDeck).toEqual([
      { tipo: 'societaria', message: 'Template ausente: TEMPLATE_SOCIETARIA.pptx' },
    ]);
  });

  it('sem problemas nem erros, os dois vêm listas vazias e não undefined', async () => {
    invoke.mockResolvedValue({ data: { arquivos: [deck('patrimonial')] }, error: null });
    const { result } = montar();
    const r = await result.current.mutateAsync('patrimonial');

    expect(r.problemas).toEqual([]);
    expect(r.errosPorDeck).toEqual([]);
  });

  it('404 do invoke vira "ainda não está publicada", que é outra conversa', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 404 }, message: 'x' } });
    const { result } = montar();
    const r = await result.current.mutateAsync('patrimonial');

    expect(r.erro).toBe('a geração ainda não está publicada no servidor');
    expect(r.arquivos).toEqual([]);
    expect(logAction).not.toHaveBeenCalled();
  });

  it('resposta vazia é erro, e não sucesso silencioso', async () => {
    invoke.mockResolvedValue({ data: { arquivos: [] }, error: null });
    const { result } = montar();
    const r = await result.current.mutateAsync('ambas');

    expect(r.erro).toBe('o servidor não devolveu nenhum arquivo');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });
});
