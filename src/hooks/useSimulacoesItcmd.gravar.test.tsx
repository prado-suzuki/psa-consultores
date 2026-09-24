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
    pctDaGia: '100.0000',
    basePorCenario: { contabil: '100.00', itr: '90.00', mercado: '110.00' },
    impostoPorCenario: { contabil: '10.00', itr: '9.00', mercado: '11.00' },
    // Sem reserva a guia só existe na base integral.
    baseAlternativa: null,
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
    // A doação anterior saiu do banco: a guia não a grava.
    expect(args.p.gias[0]).not.toHaveProperty('vlr_doacao_anterior');
    expect(args.p.gias[0].base_alternativa).toBeNull();

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

  it('as guias com alternativa levam a base de 70%; a reserva vai sem nenhuma', async () => {
    // A calculadora grava as duas bases: a integral nas colunas de sempre, a de 70% em `base_alternativa`,
    // na doação com reserva e na instituição.
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });
    const comUsufruto: SimulacaoParaGravar = {
      ...retrato,
      comReserva: true,
      pctBaseReserva: '100',
      pctBaseInstituicao: '100',
      gias: [{
        ...retrato.gias[0],
        baseAlternativa: {
          pctBase: '70.00',
          basePorCenario: { contabil: '70.00', itr: '63.00', mercado: '77.00' },
          impostoPorCenario: { contabil: '7.00', itr: '6.30', mercado: '7.70' },
        },
      }],
      concessoes: [
        {
          deId: 'G', paraId: 'D', origem: 'reserva', quotas: '400',
          basePorCenario: null, impostoPorCenario: null,
        },
        {
          deId: 'G', paraId: 'D', origem: 'instituicao', quotas: '50',
          basePorCenario: { contabil: '5.00', itr: '4.50', mercado: '5.50' },
          impostoPorCenario: { contabil: '0.00', itr: '0.00', mercado: '0.00' },
          baseAlternativa: {
            pctBase: '70.00',
            basePorCenario: { contabil: '3.50', itr: '3.15', mercado: '3.85' },
            impostoPorCenario: { contabil: '0.00', itr: '0.00', mercado: '0.00' },
          },
        },
      ],
    };

    await act(async () => {
      await result.current.mutateAsync(comUsufruto);
    });

    const [, args] = mocks.rpc.mock.calls[0];
    expect(args.p.simulacao.pct_base_reserva).toBe('100');
    expect(args.p.simulacao.pct_base_instituicao).toBe('100');
    expect(args.p.gias[0].vlr_base_contabil).toBe('100.00');
    expect(args.p.gias[0].base_alternativa).toEqual({
      pct_base: '70.00',
      vlr_base_contabil: '70.00', vlr_base_itr: '63.00', vlr_base_mercado: '77.00',
      vlr_imposto_contabil: '7.00', vlr_imposto_itr: '6.30', vlr_imposto_mercado: '7.70',
    });
    const [reserva, instituicao] = args.p.concessoes;
    expect(reserva.base_alternativa).toBeNull();
    expect(instituicao.vlr_base_contabil).toBe('5.00');
    expect(instituicao.base_alternativa).toEqual({
      pct_base: '70.00',
      vlr_base_contabil: '3.50', vlr_base_itr: '3.15', vlr_base_mercado: '3.85',
      vlr_imposto_contabil: '0.00', vlr_imposto_itr: '0.00', vlr_imposto_mercado: '0.00',
    });
    // Não sobra o formato antigo, com uma base "comparada".
    expect(instituicao).not.toHaveProperty('bases_comparadas');
  });

  it('base de 70% pela metade não chega ao banco', async () => {
    const { result } = renderHook(() => useGravarSimulacaoItcmd(), { wrapper: molde });
    const pelaMetade: SimulacaoParaGravar = {
      ...retrato,
      concessoes: [{
        deId: 'G', paraId: 'D', origem: 'instituicao', quotas: '50',
        basePorCenario: { contabil: '5.00', itr: '4.50', mercado: '5.50' },
        impostoPorCenario: { contabil: '0.00', itr: '0.00', mercado: '0.00' },
        baseAlternativa: {
          pctBase: '70.00',
          basePorCenario: { contabil: '3.50', itr: '3.15', mercado: null },
          impostoPorCenario: { contabil: '0.00', itr: '0.00', mercado: null },
        },
      }],
    };

    await expect(result.current.mutateAsync(pelaMetade))
      .rejects.toThrow(/mercado da instituição em 70% sem valor/);
    expect(mocks.rpc).not.toHaveBeenCalled();
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
