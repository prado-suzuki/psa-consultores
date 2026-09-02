import { describe, it, expect } from 'vitest';
import {
  movimentoDaLinha,
  movimentosDoAto,
  movimentosPendentes,
  ordenarMovimentos,
  procedenciaDosMovimentos,
  quadroEm,
  type LinhaCrua,
  type MovimentoDoLedger,
} from './projecaoQuadro';

const PR = 'empresa-proprietaria';
const CN = 'empresa-controladora';
const ANA = 'pessoa-ana';
const BRUNO = 'pessoa-bruno';

let relogio = 0;
/** created_at crescente, como a gravação escalona (um ms por linha). */
const carimbo = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, relogio++)).toISOString();

const mov = (p: Partial<MovimentoDoLedger> & { id: string }): MovimentoDoLedger => ({
  empresaPessoaId: PR,
  tipo: 'aporte',
  origemPessoaId: null,
  destinoPessoaId: ANA,
  quotas: 100,
  valor: 100,
  createdAt: carimbo(),
  dataMovimento: null,
  atoId: null,
  sequencia: null,
  documentoGeradoId: null,
  pagamento: { tipo: 'moeda' },
  ...p,
});

describe('quadroEm', () => {
  it('acumula entradas menos saídas e mantém a ordem do primeiro movimento', () => {
    const movs = [
      mov({ id: 'm1', destinoPessoaId: ANA, quotas: 600, valor: 600 }),
      mov({ id: 'm2', destinoPessoaId: BRUNO, quotas: 400, valor: 400 }),
      mov({ id: 'm3', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: BRUNO, quotas: 100, valor: 100 }),
    ];
    expect(quadroEm(movs, PR)).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 500, vlrTotal: 500 }),
      expect.objectContaining({ pessoaId: BRUNO, quotas: 500, vlrTotal: 500 }),
    ]);
  });

  it('tira do quadro quem zerou o saldo, como o `having` da view', () => {
    const movs = [
      mov({ id: 'm1', destinoPessoaId: ANA, quotas: 600, valor: 600 }),
      mov({ id: 'm2', destinoPessoaId: BRUNO, quotas: 400, valor: 400 }),
      mov({ id: 'm3', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: BRUNO, quotas: 600, valor: 600 }),
    ];
    expect(quadroEm(movs, PR).map((l) => l.pessoaId)).toEqual([BRUNO]);
  });

  it('ignora os movimentos das outras empresas', () => {
    const movs = [
      mov({ id: 'm1', empresaPessoaId: PR, quotas: 600, valor: 600 }),
      mov({ id: 'm2', empresaPessoaId: CN, quotas: 500, valor: 500 }),
    ];
    expect(quadroEm(movs, CN)).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 500 }),
    ]);
  });

  it('reúne os ids dos movimentos que compõem o saldo', () => {
    const movs = [
      mov({ id: 'm1', quotas: 600, valor: 600 }),
      mov({ id: 'm2', quotas: 100, valor: 100 }),
    ];
    expect(quadroEm(movs, PR)[0].movimentoIds).toEqual(['m1', 'm2']);
  });
});

describe('quadroEm com corte: o quadro INTERMEDIÁRIO da peça', () => {
  // O caso MMS: o ato aumenta o capital (sequências 1 e 2) e depois cede tudo à
  // holding (sequências 3 e 4). A cláusula sexta publica o quadro entre os dois.
  const ATO = 'ato-reorganizacao';
  const HOLDING = 'pessoa-holding';
  const criados = new Date(Date.UTC(2026, 5, 1)).toISOString();
  const doAto = (id: string, sequencia: number, p: Partial<MovimentoDoLedger>) =>
    mov({ id, atoId: ATO, sequencia, createdAt: criados, ...p });

  const movs = [
    mov({ id: 'c1', destinoPessoaId: ANA, quotas: 436337, valor: 436337 }),
    mov({ id: 'c2', destinoPessoaId: BRUNO, quotas: 436337, valor: 436337 }),
    doAto('a1', 1, { destinoPessoaId: ANA, quotas: 1681074, valor: 1681074 }),
    doAto('a2', 2, { destinoPessoaId: BRUNO, quotas: 1681074, valor: 1681074 }),
    doAto('a3', 3, { tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: HOLDING, quotas: 2117411, valor: 2117411 }),
    doAto('a4', 4, { tipo: 'cessao', origemPessoaId: BRUNO, destinoPessoaId: HOLDING, quotas: 2117411, valor: 2117411 }),
  ];

  it('projeta o quadro que o ato ENCONTROU', () => {
    expect(quadroEm(movs, PR, { ate: 'antesDoAto', atoId: ATO })).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 436337 }),
      expect.objectContaining({ pessoaId: BRUNO, quotas: 436337 }),
    ]);
  });

  it('projeta o quadro DEPOIS do aumento e ANTES da cessão', () => {
    expect(quadroEm(movs, PR, { ate: 'sequenciaDoAto', atoId: ATO, sequencia: 2 })).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 2117411 }),
      expect.objectContaining({ pessoaId: BRUNO, quotas: 2117411 }),
    ]);
  });

  it('projeta o quadro final: a holding como única sócia', () => {
    expect(quadroEm(movs, PR)).toEqual([
      expect.objectContaining({ pessoaId: HOLDING, quotas: 4234822 }),
    ]);
  });

  it('projeta tudo quando o ato pedido não está no livro', () => {
    // Corte por ato inexistente não pode esconder movimento: é o estado que o
    // ato encontraria se fosse gravado agora.
    expect(quadroEm(movs, PR, { ate: 'antesDoAto', atoId: 'ato-que-nao-existe' })).toEqual(
      quadroEm(movs, PR),
    );
  });
});

describe('ordenarMovimentos', () => {
  it('desempata pela sequência quando o carimbo é o mesmo (insert em lote)', () => {
    const t = new Date(Date.UTC(2026, 5, 1)).toISOString();
    const movs = [
      mov({ id: 'b', createdAt: t, sequencia: 2 }),
      mov({ id: 'a', createdAt: t, sequencia: 1 }),
    ];
    expect(ordenarMovimentos(movs).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('é função só dos dados: desempate final pelo id', () => {
    const t = new Date(Date.UTC(2026, 5, 1)).toISOString();
    const movs = [mov({ id: 'z', createdAt: t }), mov({ id: 'a', createdAt: t })];
    expect(ordenarMovimentos(movs).map((m) => m.id)).toEqual(['a', 'z']);
    expect(ordenarMovimentos([...movs].reverse()).map((m) => m.id)).toEqual(['a', 'z']);
  });
});

describe('movimentosDoAto e movimentosPendentes', () => {
  it('lista o ato inteiro, atravessando as duas empresas', () => {
    const movs = [
      mov({ id: 'x', atoId: 'ato', sequencia: 1, empresaPessoaId: PR }),
      mov({ id: 'y', atoId: 'ato', sequencia: 2, empresaPessoaId: CN }),
      mov({ id: 'z', atoId: null }),
    ];
    expect(movimentosDoAto(movs, 'ato').map((m) => m.id)).toEqual(['x', 'y']);
  });

  it('pendente é o movimento que nenhum documento formalizou', () => {
    const movs = [
      mov({ id: 'formalizado', documentoGeradoId: 'doc-1' }),
      mov({ id: 'pendente' }),
    ];
    expect(movimentosPendentes(movs, PR).map((m) => m.id)).toEqual(['pendente']);
  });
});

describe('movimentoDaLinha', () => {
  const crua = (p: Partial<LinhaCrua>): LinhaCrua => ({
    id: 'l1',
    empresa_pessoa_id: PR,
    tipo: 'aporte',
    origem_pessoa_id: null,
    destino_pessoa_id: ANA,
    // `quotas` é bigint: o PostgREST devolve string.
    quotas: '2117411',
    vlr_capital_arredondado: '2117411.00',
    created_at: '2026-06-01T00:00:00.000Z',
    data_movimento: null,
    ato_id: null,
    sequencia: null,
    documento_gerado_id: null,
    bem_id: null,
    pago_com_empresa_pessoa_id: null,
    pago_com_quotas: null,
    pago_com_valor: null,
    ...p,
  });

  it('converte o bigint que chega como string', () => {
    const m = movimentoDaLinha(crua({}));
    expect(m.quotas).toBe(2117411);
    expect(m.valor).toBe(2117411);
  });

  it('lê as três formas de pagamento', () => {
    expect(movimentoDaLinha(crua({})).pagamento).toEqual({ tipo: 'moeda' });
    expect(movimentoDaLinha(crua({ bem_id: 'bem-1' })).pagamento).toEqual({
      tipo: 'bem',
      bemId: 'bem-1',
    });
    expect(
      movimentoDaLinha(
        crua({ pago_com_empresa_pessoa_id: CN, pago_com_quotas: '500', pago_com_valor: '500' }),
      ).pagamento,
    ).toEqual({ tipo: 'quotas', empresaPessoaId: CN, quotas: 500, valor: 500 });
  });
});

describe('procedenciaDosMovimentos', () => {
  it('o prefixo de aportes sem ato é a constituição', () => {
    const movs = [
      mov({ id: 'c1', destinoPessoaId: ANA, quotas: 600, valor: 600 }),
      mov({ id: 'c2', destinoPessoaId: BRUNO, quotas: 400, valor: 400 }),
    ];
    expect([...procedenciaDosMovimentos(movs, PR).values()]).toEqual([
      'Constituição', 'Constituição',
    ]);
  });

  it('o aumento gravado sob um ato é o NOME do ato, e nunca Constituição', () => {
    // A armadilha que o `ato_id` do aumento de capital evita: numa PR cuja
    // história é só aportes, o prefixo "Constituição" só fecharia num movimento
    // que não fosse aporte, e o aumento entraria nele — a tela chamaria o
    // aumento de capital de abertura.
    const movs = [
      mov({ id: 'c1', destinoPessoaId: ANA, quotas: 600, valor: 600 }),
      mov({ id: 'a1', atoId: 'ato-1', sequencia: 1, destinoPessoaId: ANA, quotas: 900, valor: 900 }),
    ];
    const atos = [{ id: 'ato-1', data: '2026-08-31', descricao: 'Aumento de capital por integralização de imóveis' }];
    expect([...procedenciaDosMovimentos(movs, PR, atos).values()]).toEqual([
      'Constituição',
      'Aumento de capital por integralização de imóveis',
    ]);
  });

  it('ato sem descrição cai na data, e movimento avulso na forma mais a data', () => {
    const movs = [
      mov({ id: 'c1', destinoPessoaId: ANA, quotas: 600, valor: 600 }),
      mov({ id: 'a1', atoId: 'ato-1', destinoPessoaId: ANA, quotas: 100, valor: 100 }),
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: BRUNO, quotas: 50, valor: 50, dataMovimento: '2026-08-30' }),
    ];
    const atos = [{ id: 'ato-1', data: '2026-08-31', descricao: null }];
    expect([...procedenciaDosMovimentos(movs, PR, atos).values()]).toEqual([
      'Constituição', 'Ato de 31/08/2026', 'Cessão de 30/08/2026',
    ]);
  });
});
