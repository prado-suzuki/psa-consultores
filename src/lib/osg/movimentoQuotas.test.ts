import { describe, it, expect } from 'vitest';
import {
  capitalDoMovimento,
  colunasDoPagamento,
  FORMAS_MOVIMENTO,
  pagamentoDasColunas,
  problemaDoMovimento,
  TIPOS_MOVIMENTO,
  type MovimentoDeQuotas,
} from './movimentoQuotas';

const EMPRESA = 'empresa-1';
const ANA = 'pessoa-ana';
const BRUNO = 'pessoa-bruno';
const CARLA = 'pessoa-carla';

// Ana tem 600 quotas, Bruno 400, Carla nenhuma.
const SALDO = new Map([[ANA, 600], [BRUNO, 400]]);

const mov = (p: Partial<MovimentoDeQuotas>): MovimentoDeQuotas => ({
  tipo: 'cessao',
  origemPessoaId: ANA,
  destinoPessoaId: BRUNO,
  quotas: 100,
  dataMovimento: null,
  ...p,
});

const problema = (p: Partial<MovimentoDeQuotas>) => problemaDoMovimento(mov(p), SALDO, EMPRESA);

describe('problemaDoMovimento', () => {
  it('aceita a cessão de parte das quotas do cedente', () => {
    expect(problema({})).toBeNull();
  });

  it('aceita a cessão de TODAS as quotas do cedente, que é a saída dele do quadro', () => {
    // O saldo zerado tira o sócio do quadro (o `having` da view), sem delete
    // físico e sem perder o registro de para quem as quotas foram.
    expect(problema({ quotas: 600 })).toBeNull();
  });

  it('recusa mover mais quotas do que o cedente tem, e diz quantas ele tem', () => {
    expect(problema({ quotas: 601 })).toMatch(/600 quota\(s\)/);
  });

  it('recusa cedente que não é sócio', () => {
    expect(problema({ origemPessoaId: CARLA })).toMatch(/não tem quotas/);
  });

  it('recusa quotas zero, negativas ou fracionadas', () => {
    expect(problema({ quotas: 0 })).toMatch(/inteiro maior que zero/);
    expect(problema({ quotas: -10 })).toMatch(/inteiro maior que zero/);
    expect(problema({ quotas: 1.5 })).toMatch(/inteiro maior que zero/);
    expect(problema({ quotas: Number.NaN })).toMatch(/inteiro maior que zero/);
  });

  it('recusa a empresa como sócia de si mesma, dos dois lados', () => {
    expect(problema({ origemPessoaId: EMPRESA })).toMatch(/sócia de si mesma/);
    expect(problema({ destinoPessoaId: EMPRESA })).toMatch(/sócia de si mesma/);
  });

  it('recusa cedente igual ao adquirente: o quadro não mudaria', () => {
    expect(problema({ origemPessoaId: ANA, destinoPessoaId: ANA })).toMatch(/mesma pessoa/);
  });

  describe('cada tipo exige os lados que ele tem, e só esses', () => {
    it('aporte: as quotas nascem, sem cedente', () => {
      // Sócio novo entrando por aporte: não precisa de saldo prévio.
      expect(problema({ tipo: 'aporte', origemPessoaId: null, destinoPessoaId: CARLA })).toBeNull();
      expect(problema({ tipo: 'aporte', origemPessoaId: null, destinoPessoaId: null }))
        .toMatch(/Informe quem recebe/);
      expect(problema({ tipo: 'aporte', origemPessoaId: ANA, destinoPessoaId: BRUNO }))
        .toMatch(/não tem cedente/);
    });

    it('redução: as quotas são canceladas, sem adquirente', () => {
      expect(problema({ tipo: 'reducao', destinoPessoaId: null })).toBeNull();
      expect(problema({ tipo: 'reducao', origemPessoaId: null, destinoPessoaId: null }))
        .toMatch(/Informe de quem/);
      expect(problema({ tipo: 'reducao', destinoPessoaId: BRUNO }))
        .toMatch(/não tem adquirente/);
      // A redução também respeita o saldo: não se cancela o que não existe.
      expect(problema({ tipo: 'reducao', destinoPessoaId: null, quotas: 601 }))
        .toMatch(/600 quota\(s\)/);
    });

    it('doação: os dois lados, como a cessão', () => {
      expect(problema({ tipo: 'doacao' })).toBeNull();
      expect(problema({ tipo: 'doacao', origemPessoaId: null })).toMatch(/Informe quem doa/);
      expect(problema({ tipo: 'doacao', destinoPessoaId: null })).toMatch(/Informe quem recebe/);
    });
  });

  it('todo tipo tem ao menos um lado, senão a linha não moveria nada', () => {
    // Espelha o `movimentacao_quotas_lados_check`: origem OU destino preenchido.
    for (const tipo of TIPOS_MOVIMENTO) {
      const forma = FORMAS_MOVIMENTO[tipo];
      expect(!!forma.rotuloOrigem || !!forma.rotuloDestino).toBe(true);
    }
  });
});

describe('capitalDoMovimento', () => {
  it('é as quotas ao valor nominal da casa, não um valor digitado', () => {
    expect(capitalDoMovimento(1)).toBe(1);
    expect(capitalDoMovimento(185757)).toBe(185757);
  });
});

describe('forma de pagamento do aporte', () => {
  const OUTRA = 'empresa-2';
  const aporte = (p: Partial<MovimentoDeQuotas>) =>
    problema({ tipo: 'aporte', origemPessoaId: null, destinoPessoaId: CARLA, ...p });

  it('sem forma declarada é moeda corrente, e isso é válido', () => {
    expect(aporte({})).toBeNull();
    expect(aporte({ pagamento: { tipo: 'moeda' } })).toBeNull();
  });

  it('aceita o aporte em bem e o aporte pago com quotas de outra sociedade', () => {
    expect(aporte({ pagamento: { tipo: 'bem', bemId: 'bem-1' } })).toBeNull();
    expect(
      aporte({ pagamento: { tipo: 'quotas', empresaPessoaId: OUTRA, quotas: 500, valor: 500 } }),
    ).toBeNull();
  });

  it('recusa forma de pagamento fora do aporte: cessão move quota que já existe', () => {
    expect(problema({ pagamento: { tipo: 'bem', bemId: 'bem-1' } })).toMatch(
      /não tem forma de pagamento/,
    );
  });

  it('recusa o aporte pago com quota da própria sociedade', () => {
    // Espelha movimentacao_quotas_pago_com_outra_empresa_check: isso não é
    // integralização, é a sociedade emitindo quota contra si.
    expect(
      aporte({ pagamento: { tipo: 'quotas', empresaPessoaId: EMPRESA, quotas: 1, valor: 1 } }),
    ).toMatch(/própria sociedade/);
  });

  it('recusa quantidade e valor que não descrevem entrega nenhuma', () => {
    const base = { tipo: 'quotas', empresaPessoaId: OUTRA } as const;
    expect(aporte({ pagamento: { ...base, quotas: 0, valor: 500 } })).toMatch(/inteiro maior que zero/);
    expect(aporte({ pagamento: { ...base, quotas: 1.5, valor: 500 } })).toMatch(/inteiro maior que zero/);
    expect(aporte({ pagamento: { ...base, quotas: 500, valor: 0 } })).toMatch(/valor.*maior que zero/);
  });
});

describe('colunasDoPagamento e pagamentoDasColunas', () => {
  it('moeda corrente é a ausência das outras duas, e não uma coluna', () => {
    expect(colunasDoPagamento({ tipo: 'moeda' })).toEqual({
      bem_id: null,
      pago_com_empresa_pessoa_id: null,
      pago_com_quotas: null,
      pago_com_valor: null,
    });
    expect(colunasDoPagamento(null)).toEqual(colunasDoPagamento({ tipo: 'moeda' }));
  });

  it('nunca preenche bem_id e pago_com_empresa_pessoa_id juntos', () => {
    // É o que movimentacao_quotas_forma_pagamento_check recusaria no banco.
    for (const pgto of [
      { tipo: 'bem', bemId: 'bem-1' },
      { tipo: 'quotas', empresaPessoaId: 'empresa-2', quotas: 5, valor: 5 },
    ] as const) {
      const c = colunasDoPagamento(pgto);
      expect(c.bem_id != null && c.pago_com_empresa_pessoa_id != null).toBe(false);
    }
  });

  it('ida e volta preserva a forma', () => {
    for (const pgto of [
      { tipo: 'moeda' },
      { tipo: 'bem', bemId: 'bem-1' },
      { tipo: 'quotas', empresaPessoaId: 'empresa-2', quotas: 500, valor: 500 },
    ] as const) {
      expect(pagamentoDasColunas(colunasDoPagamento(pgto))).toEqual(pgto);
    }
  });
});
