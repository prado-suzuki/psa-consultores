import { describe, it, expect } from 'vitest';
import {
  aderenciaAosTitulares,
  aderenciaPorPessoa,
  somaAIntegralizarDosTitulares,
  somaContabilDosTitulares,
  titularesEfetivos,
  type LinhaDeTitularidade,
} from './integralizacaoDaMatricula';

let seq = 0;
function linha(over: Partial<LinhaDeTitularidade> & { titular_pessoa_id: string }): LinhaDeTitularidade {
  return {
    id: `t${++seq}`,
    tipo: 'DIREITO',
    fracao: null,
    vlr_contabil: null,
    vlr_integralizar: null,
    ...over,
  };
}

describe('titularesEfetivos — fato e direito da mesma pessoa são a MESMA titularidade', () => {
  it('funde por pessoa, na ordem de aparição', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', tipo: 'FATO', fracao: 50 }),
      linha({ titular_pessoa_id: 'b', tipo: 'DIREITO', fracao: 50 }),
      linha({ titular_pessoa_id: 'a', tipo: 'DIREITO', vlr_integralizar: 100 }),
    ]);
    expect(efetivos.map((t) => t.pessoaId)).toEqual(['a', 'b']);
    expect(efetivos[0].fracao).toBe(50);
    expect(efetivos[0].vlrIntegralizar).toBe(100);
  });

  // A armadilha do plano: a linha de FATO vem primeiro na lista, e o valor está
  // na de DIREITO. Preferir "a primeira" perderia o valor em silêncio.
  it('os valores vêm da linha de DIREITO mesmo quando a de fato aparece antes', () => {
    const [a] = titularesEfetivos([
      linha({ id: 'ft', titular_pessoa_id: 'a', tipo: 'FATO', vlr_contabil: 999, vlr_integralizar: 999 }),
      linha({ id: 'dt', titular_pessoa_id: 'a', tipo: 'DIREITO', vlr_contabil: 60, vlr_integralizar: 50 }),
    ]);
    expect(a.linhaDosValores).toBe('dt');
    expect(a.vlrContabil).toBe(60);
    expect(a.vlrIntegralizar).toBe(50);
  });

  // Nua-propriedade é propriedade: o nu-proprietário integraliza, o
  // usufrutuário não.
  it('NUE_PROP conta como linha de direito; USUFRUTO não', () => {
    const [a] = titularesEfetivos([
      linha({ id: 'uf', titular_pessoa_id: 'a', tipo: 'USUFRUTO', vlr_integralizar: 999 }),
      linha({ id: 'np', titular_pessoa_id: 'a', tipo: 'NUE_PROP', vlr_integralizar: 40 }),
    ]);
    expect(a.linhaDosValores).toBe('np');
    expect(a.vlrIntegralizar).toBe(40);
  });

  it('pessoa só com linha de fato conserva o que estiver nela', () => {
    const [a] = titularesEfetivos([
      linha({ id: 'ft', titular_pessoa_id: 'a', tipo: 'FATO', fracao: 100, vlr_integralizar: 30 }),
    ]);
    expect(a.linhaDosValores).toBe('ft');
    expect(a.vlrIntegralizar).toBe(30);
  });
});

describe('somas dos titulares', () => {
  it('somam em centavos, sem o resíduo do ponto flutuante', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', vlr_contabil: 0.1, vlr_integralizar: 0.1 }),
      linha({ titular_pessoa_id: 'b', vlr_contabil: 0.2, vlr_integralizar: 0.2 }),
    ]);
    expect(somaContabilDosTitulares(efetivos)).toBe(0.3);
    expect(somaAIntegralizarDosTitulares(efetivos)).toBe(0.3);
  });

  it('ninguém preencheu é null, não zero: matrícula sem dado não é matrícula de graça', () => {
    const efetivos = titularesEfetivos([linha({ titular_pessoa_id: 'a', fracao: 100 })]);
    expect(somaContabilDosTitulares(efetivos)).toBeNull();
    expect(somaAIntegralizarDosTitulares(efetivos)).toBeNull();
  });

  it('a soma a integralizar ignora quem está vazio (os 67% de fora)', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 33, vlr_contabil: 33000, vlr_integralizar: 33000 }),
      linha({ titular_pessoa_id: 'b', fracao: 67, vlr_contabil: 67000 }),
    ]);
    expect(somaContabilDosTitulares(efetivos)).toBe(100000);
    expect(somaAIntegralizarDosTitulares(efetivos)).toBe(33000);
  });
});

describe('aderência: o que se integraliza condiz com a distribuição de titularidade?', () => {
  // O exemplo que a OSG deu.
  it('titularidade 50/50 com 60/40 a integralizar acende nos dois', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 50, vlr_integralizar: 60 }),
      linha({ titular_pessoa_id: 'b', fracao: 50, vlr_integralizar: 40 }),
    ]);
    const [a, b] = aderenciaAosTitulares(efetivos);
    expect(a.esperado).toBe(50);
    expect(a.diferenca).toBe(10);
    expect(a.foraDoEsperado).toBe(true);
    expect(b.esperado).toBe(50);
    expect(b.foraDoEsperado).toBe(true);
  });

  it('ajustado para 50/50, apaga', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 50, vlr_integralizar: 50 }),
      linha({ titular_pessoa_id: 'b', fracao: 50, vlr_integralizar: 50 }),
    ]);
    expect(aderenciaAosTitulares(efetivos).every((a) => a.foraDoEsperado)).toBe(false);
  });

  // Integralização parcial: quem não integraliza sai da conta, e quem ficou
  // sozinho recebe o total como esperado.
  it('A integraliza 33% e B segura os 67%: nada acende', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 33, vlr_integralizar: 33000 }),
      linha({ titular_pessoa_id: 'b', fracao: 67 }),
    ]);
    const aderencias = aderenciaAosTitulares(efetivos);
    expect(aderencias).toHaveLength(1);
    expect(aderencias[0].esperado).toBe(33000);
    expect(aderencias[0].foraDoEsperado).toBe(false);
  });

  it('resíduo de um centavo é arredondamento, não divergência', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 50, vlr_integralizar: 69013.61 }),
      linha({ titular_pessoa_id: 'b', fracao: 50, vlr_integralizar: 69013.60 }),
    ]);
    expect(aderenciaAosTitulares(efetivos).some((a) => a.foraDoEsperado)).toBe(false);
  });

  it('sem fração não há distribuição a comparar: o aviso não acende para a matrícula', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 50, vlr_integralizar: 900 }),
      linha({ titular_pessoa_id: 'b', vlr_integralizar: 100 }),
    ]);
    expect(aderenciaAosTitulares(efetivos)).toEqual([]);
  });

  it('ninguém integralizando não tem o que conferir', () => {
    const efetivos = titularesEfetivos([linha({ titular_pessoa_id: 'a', fracao: 100 })]);
    expect(aderenciaAosTitulares(efetivos)).toEqual([]);
  });

  it('aderenciaPorPessoa indexa pelo id da pessoa, que é como a linha consulta', () => {
    const efetivos = titularesEfetivos([
      linha({ titular_pessoa_id: 'a', fracao: 50, vlr_integralizar: 60 }),
      linha({ titular_pessoa_id: 'b', fracao: 50, vlr_integralizar: 40 }),
    ]);
    expect(aderenciaPorPessoa(efetivos).get('b')?.esperado).toBe(50);
  });
});
