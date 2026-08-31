import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// As DUAS marcas do registro na junta (D4/D5/D6 de
// docs/planos/derivacao-de-eventos-e-carimbo.md): o carimbo em
// `movimentacao_quotas.documento_gerado_id` e o status do bem indo a
// 'Integralizado'. Este arquivo trava o SQL das duas, porque é dele que dependem
// a idempotência do assistente e a saída do bem da lista de elegíveis — e as duas
// são irreversíveis pela tela.

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: undefined, isFetching: false })),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useMovimentosDaEmpresa: () => ({ data: undefined, isFetching: false }),
}));

import { useFormalizarMovimentos } from '@/hooks/useEventosDaAlteracao';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO } from '@/lib/osg/statusIntegralizacao';

interface Chamada {
  tabela: string;
  metodo: string;
  args: unknown[];
}

const chamadas: Chamada[] = [];
/** O que cada `.select()` devolve, por tabela. */
const respostas: Record<string, unknown[]> = {};

function cadeia(tabela: string) {
  const chain: Record<string, unknown> = {};
  for (const metodo of ['update', 'in', 'is', 'eq', 'select']) {
    chain[metodo] = vi.fn((...args: unknown[]) => {
      chamadas.push({ tabela, metodo, args });
      return chain;
    });
  }
  chain.then = (ok: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve({ data: respostas[tabela] ?? [], error: null }).then(ok);
  return chain;
}

const argsDe = (tabela: string, metodo: string) =>
  chamadas.filter((c) => c.tabela === tabela && c.metodo === metodo).map((c) => c.args);

/**
 * Chama a escrita como o "Registrar na junta" chama. O `useMutation` mockado
 * devolve as próprias opções, então `mutationFn` fica acessível pelo resultado do
 * hook — o mesmo caminho de useGeracaoDocumento.statusElegiveis.test.tsx.
 */
const formalizar = (movimentoIds: string[]) => {
  const { result } = renderHook(() => useFormalizarMovimentos());
  const { mutationFn } = result.current as unknown as {
    mutationFn: (input: { movimentoIds: string[]; documentoGeradoId: string }) => Promise<unknown>;
  };
  return mutationFn({ movimentoIds, documentoGeradoId: 'doc-alteracao' });
};

beforeEach(() => {
  vi.clearAllMocks();
  chamadas.length = 0;
  for (const chave of Object.keys(respostas)) delete respostas[chave];
  vi.mocked(supabase.from).mockImplementation(((tabela: string) => cadeia(tabela)) as never);
});

describe('useFormalizarMovimentos — carimbo e status do bem no mesmo gesto', () => {
  it('carimba só o movimento AINDA sem documento, e vira o status dos bens dele', () => {
    respostas.movimentacao_quotas = [
      { id: 'mov-1', bem_id: 'bem-1' },
      { id: 'mov-2', bem_id: 'bem-2' },
      // Aporte em quotas de outra sociedade: não tem bem para virar.
      { id: 'mov-3', bem_id: null },
    ];
    respostas.bem = [{ id: 'bem-1' }, { id: 'bem-2' }];

    return formalizar(['mov-1', 'mov-2', 'mov-3']).then((resultado) => {
      expect(resultado).toEqual({ carimbados: 3, integralizados: 2 });

      // O carimbo: nunca reescreve movimento já formalizado por outra peça.
      expect(argsDe('movimentacao_quotas', 'update')[0][0])
        .toEqual({ documento_gerado_id: 'doc-alteracao' });
      expect(argsDe('movimentacao_quotas', 'in')[0])
        .toEqual(['id', ['mov-1', 'mov-2', 'mov-3']]);
      expect(argsDe('movimentacao_quotas', 'is')[0]).toEqual(['documento_gerado_id', null]);
      // Precisa do bem_id de volta: é ele a chave da segunda marca (D6).
      expect(argsDe('movimentacao_quotas', 'select')[0]).toEqual(['id, bem_id']);

      // O status: pelos bens dos movimentos carimbados, e só a partir de um status
      // que ainda era elegível — 'Recusado' deliberado não é sobrescrito.
      expect(argsDe('bem', 'update')[0][0]).toEqual({ status_integralizacao: 'Integralizado' });
      expect(argsDe('bem', 'in')[0]).toEqual(['id', ['bem-1', 'bem-2']]);
      expect(argsDe('bem', 'in')[1]).toEqual([
        'status_integralizacao', [...STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO],
      ]);
    });
  });

  it('movimento que o banco não carimbou não vira status de bem nenhum', () => {
    // A corrida perdeu: outra peça carimbou primeiro. O `.is(null)` não pegou
    // linha nenhuma, e virar o status ali seria consumir o bem por conta da peça
    // errada.
    respostas.movimentacao_quotas = [];
    return formalizar(['mov-1']).then((resultado) => {
      expect(resultado).toEqual({ carimbados: 0, integralizados: 0 });
      expect(argsDe('bem', 'update')).toEqual([]);
    });
  });

  it('sem movimento nenhum não toca no banco', () => {
    // O caminho da PR que gerou contrato sem gravar quadro: não existe movimento,
    // e um flip por "bens aprovados da empresa" a deixaria sem integralizações.
    return formalizar([]).then((resultado) => {
      expect(resultado).toEqual({ carimbados: 0, integralizados: 0 });
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  it('id repetido é carimbado uma vez', () => {
    respostas.movimentacao_quotas = [{ id: 'mov-1', bem_id: null }];
    return formalizar(['mov-1', 'mov-1']).then(() => {
      expect(argsDe('movimentacao_quotas', 'in')[0]).toEqual(['id', ['mov-1']]);
    });
  });
});
