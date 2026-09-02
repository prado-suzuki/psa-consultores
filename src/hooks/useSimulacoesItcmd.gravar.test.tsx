import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';

/**
 * A GRAVAÇÃO É UMA TRANSAÇÃO SÓ.
 *
 * Eram seis requisições ao PostgREST, e cada requisição é a sua própria transação. Se a
 * segunda falhasse, o código tentava desfazer apagando o pai, e esse desfazer não era
 * confiável: INSERT é de `team_member` para cima e DELETE era de `lider`, então a RLS
 * recusava justamente para quem tinha criado. Ficava no histórico uma simulação sem
 * doador ou sem GIA, indistinguível de uma completa na lista.
 *
 * Este arquivo prende o contrato pelo lado de fora: UMA chamada de RPC, com o retrato
 * inteiro, e NENHUM insert avulso nas tabelas filhas. Sem isso, alguém "otimiza" um
 * insert de volta e o furo volta calado.
 */

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  insertsAvulsos: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: (tabela: string) => {
      mocks.from(tabela);
      return {
        // A leitura da versão para o texto da trilha, e nada mais.
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { versao: 3 }, error: null }) }),
        }),
        insert: () => {
          mocks.insertsAvulsos.push(tabela);
          return { select: () => ({ single: async () => ({ data: null, error: null }) }) };
        },
        delete: () => ({ eq: async () => ({ error: null }) }),
      };
    },
  },
}));

vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: vi.fn(), logActionOrThrow: vi.fn() }),
}));

import { useGravarSimulacaoItcmd, type SimulacaoParaGravar } from '@/hooks/useSimulacoesItcmd';

/**
 * O mínimo que a gravação lê da saída do motor. O resto de `SaidaSimulacao` não é
 * tocado aqui, e inventar os campos todos só para o cast passar esconderia o que este
 * teste realmente usa.
 */
const saida = {
  competencia: '2026-08',
  upf: '263.78',
  totalDeQuotas: '9557944',
  acervoPorCenario: { contabil: '100.00', itr: '90.00', mercado: '110.00' },
  totaisPorCenario: { contabil: '10.00', itr: '9.00', mercado: '11.00' },
  linhas: [{ donatarioId: 'G', percentualDoAto: '50.0000' }],
} as unknown as SaidaSimulacao;

const retrato: SimulacaoParaGravar = {
  clienteId: 'C1',
  empresaPessoaId: 'HOLDING',
  saida,
  origemSimulacaoId: null,
  comReserva: false,
  pctBaseReserva: '100.00',
  pctBaseInstituicao: '70.00',
  doadores: [{
    pessoaId: 'D', quotas: '1000', quotasTransmitidas: '400', quotasFinal: '600',
    emissaoConjunta: false, conjugePessoaId: null,
    vlrAporteMoeda: '0.00', quotasDoAporte: '0',
  }],
  donatarios: [{
    pessoaId: 'G', quotasAtuais: '0', quotasLegitima: '200', quotasDisponivel: '200',
    quotasFinal: '400', vlrAporteMoeda: '0.00', quotasDoAporte: '0',
  }],
  gias: [{
    doadorPessoaId: 'D', donatarioPessoaId: 'G', quotasRecebidas: '400',
    pctDaGia: '100.0000', doacaoAnterior: null,
    basePorCenario: { contabil: '100.00', itr: '90.00', mercado: '110.00' },
    impostoPorCenario: { contabil: '10.00', itr: '9.00', mercado: '11.00' },
  }],
  usufruto: [],
  concessoes: [],
};

const molde = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.from.mockReset();
  mocks.insertsAvulsos.length = 0;
  mocks.rpc.mockResolvedValue({ data: 'SIM-NOVA', error: null });
});

describe('gravar a simulação', () => {
  it('chama a RPC UMA vez, com o retrato inteiro, e não insere nada avulso', async () => {
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });

    await act(async () => {
      await result.current.mutateAsync(retrato);
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [nome, args] = mocks.rpc.mock.calls[0];
    expect(nome).toBe('itcd_gravar_simulacao');
    // O retrato inteiro vai junto: as cinco filhas e o pai, num payload só.
    expect(Object.keys(args.p).sort()).toEqual([
      'concessoes', 'doadores', 'donatarios', 'gias', 'simulacao', 'usufruto',
    ]);
    expect(args.p.simulacao.empresa_pessoa_id).toBe('HOLDING');
    expect(args.p.doadores).toHaveLength(1);
    expect(args.p.gias[0].vlr_base_contabil).toBe('100.00');

    // NENHUM insert avulso: era isso que quebrava pela metade.
    expect(mocks.insertsAvulsos).toEqual([]);
    // E NENHUMA outra requisição, de tipo nenhum: a trilha de auditoria e a versão
    // passaram para dentro da função. Antes eram três idas ao servidor — a RPC, a
    // leitura da `versao` e o insert em `audit_logs` —, e as duas últimas podiam falhar
    // com a simulação já gravada, deixando linha sem rastro de quem a criou.
    expect(mocks.from).not.toHaveBeenCalled();
    // E o status não vem da tela: quem grava `gerada` é a função, dentro da transação.
    expect(args.p.simulacao).not.toHaveProperty('status');
  });

  it('cenário sem valor no acervo não chega ao banco', async () => {
    // A tela já barra; aqui é a rede. Antes a recusa acontecia no meio da sequência de
    // inserts, com o pai já gravado.
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });
    const semMercado = {
      ...retrato,
      saida: {
        ...saida,
        acervoPorCenario: { contabil: '100.00', itr: '90.00', mercado: null },
      } as unknown as SaidaSimulacao,
    };

    await expect(result.current.mutateAsync(semMercado)).rejects.toThrow(/mercado sem valor/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('erro do banco sobe como erro, sem simulação pela metade', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'RLS recusou' } });
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });

    await expect(result.current.mutateAsync(retrato)).rejects.toThrow('RLS recusou');
    // Nada a desfazer: a transação não deixou rastro para apagar.
    expect(mocks.insertsAvulsos).toEqual([]);
  });

  it('a trilha não é escrita pelo cliente: quem escreve é a transação', async () => {
    // O `AGENTS.md` exige auditoria em toda criação, com `changed_fields`. Cumprir isso
    // do lado do cliente deixava um intervalo entre gravar e registrar — e o log era
    // deliberadamente não-fatal, então a linha ficava sem rastro em silêncio. O contrato
    // agora é: ninguém escreve `audit_logs` daqui.
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });
    await act(async () => {
      await result.current.mutateAsync(retrato);
    });
    expect(mocks.from).not.toHaveBeenCalledWith('audit_logs');
    expect(mocks.insertsAvulsos).toEqual([]);
  });

  it('a gravação sem id devolvido não passa por sucesso', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });
    await expect(result.current.mutateAsync(retrato)).rejects.toThrow(/não devolveu o id/);
  });
});
