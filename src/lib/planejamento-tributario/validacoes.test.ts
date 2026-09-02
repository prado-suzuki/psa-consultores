import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { lerWp, type ValorWp } from '@/lib/planejamento-tributario/parser';
import { validar } from '@/lib/planejamento-tributario/validacoes';

/**
 * Confere o validador, que é quem diz se a aritmética do WP fecha.
 *
 * A prova de que ele serve não é passar nas fixtures boas: um validador que nunca
 * reclama também passaria. É estragar um número de propósito e cobrar que o erro
 * apareça, apontando a célula certa. É o que a segunda metade deste arquivo faz.
 */

const PASTA = join(__dirname, '__fixtures__');

function le(caso: string): ValorWp[] {
  const dados = new Uint8Array(readFileSync(join(PASTA, caso, 'entrada.xlsx')));
  return lerWp(dados).valores;
}

/** Devolve os valores com um deles adulterado, para provocar o validador. */
function adultera(valores: ValorWp[], rotulo: string, novoValor: number): ValorWp[] {
  const posicao = valores.findIndex((v) => v.rotulo === rotulo);
  expect(posicao, `a fixture precisa ter a linha \`${rotulo}\``).toBeGreaterThanOrEqual(0);
  const copia = [...valores];
  copia[posicao] = { ...copia[posicao], valor: novoValor };
  return copia;
}

describe('WP coerente não gera reclamação', () => {
  it.each(['resumo-pfxpj-x-pjxpj', 'transferencia-rural', 'dre'])('%s', (caso) => {
    expect(validar(le(caso))).toEqual([]);
  });
});

describe('soma de bloco', () => {
  const valores = le('resumo-pfxpj-x-pjxpj');

  it('acusa quando o total do bloco não bate com as linhas', () => {
    const problemas = validar(adultera(valores, 'IRPF', 1));

    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas[0].tipo).toBe('conta_nao_fecha');
    expect(problemas[0].detalhe).toContain('Pessoa Física');
  });

  it('aponta a célula do total, que é onde a pessoa vai olhar', () => {
    const [problema] = validar(adultera(valores, 'IRPF', 1));
    expect(problema.onde).toMatch(/^Resumo![A-Z]+16$/);
  });

  it('acusa quando o Total geral não é a soma dos três blocos', () => {
    const problemas = validar(adultera(valores, 'Total', 42));
    const doTotal = problemas.filter((p) => p.detalhe.includes('`Total`'));

    expect(doTotal.length).toBeGreaterThan(0);
    expect(doTotal[0].detalhe).toContain('Pessoa Física + PJ - Lucro Presumido');
  });
});

/**
 * Um valor sintético, para provar uma proporção sem precisar de uma fixture
 * inteira. A corrente da presunção junta a `Receita`, que mora na DRE, com a
 * apuração, que fica setenta linhas abaixo, e nenhuma das três fixtures recorta
 * os dois blocos ao mesmo tempo.
 */
function valor(
  cenario: string,
  rotulo: string,
  numero: number,
  celula: string,
  contribuinte?: string,
): ValorWp {
  return {
    bloco: 'apuracao',
    rotulo,
    nivel: 1,
    cenario,
    contribuinte,
    ano: 2026,
    valor: numero,
    unidade: 'moeda',
    origemCelula: `${cenario}!${celula}`,
  };
}

/*
 * A base da presunção é a RECEITA, não o resultado do exercício. Está nas
 * fórmulas do modelo (`Cenário Atual (PF)` C120 = `C31*20%`, e C31 é a `Receita`)
 * e no WP da Família Lunardi, onde a presunção lançada, 7.925.405,11, é 20% da
 * receita de 39.627.025,54 e não teria como sair do resultado de 1.417.963,56.
 */
describe('a corrente da apuração do IRPF, na aba de cenário', () => {
  const CENARIO = 'Cenário Atual (PF)';
  const coerente = [
    valor(CENARIO, 'Receita', 1_000_000, 'C31', 'Aurora Agro'),
    valor(CENARIO, 'Presunção de 20%', 200_000, 'C120', 'Aurora Agro'),
    valor(CENARIO, 'Resultado tributável', 150_000, 'C121', 'Aurora Agro'),
    valor(CENARIO, 'Total a recolher', 41_250, 'C122', 'Aurora Agro'),
  ];

  it('não reclama da corrente inteira quando ela fecha', () => {
    expect(validar(coerente)).toEqual([]);
  });

  it('acusa quando a presunção deixa de ser 20% da receita', () => {
    const problemas = validar(adultera(coerente, 'Presunção de 20%', 999));
    const daPresuncao = problemas.filter((p) => p.detalhe.includes('Presunção de 20%'));

    expect(daPresuncao.length).toBeGreaterThan(0);
    expect(daPresuncao[0].detalhe).toContain('`Receita`');
    expect(daPresuncao[0].onde).toBe(`${CENARIO}!C120`);
  });

  it('acusa quando o imposto deixa de ser 27,5% do resultado tributável', () => {
    const problemas = validar(adultera(coerente, 'Total a recolher', 999));
    const doImposto = problemas.filter((p) => p.detalhe.includes('Total a recolher'));

    expect(doImposto.length).toBeGreaterThan(0);
    expect(doImposto[0].detalhe).toContain('27.5%');
    expect(doImposto[0].detalhe).toContain('`Resultado tributável`');
  });

  /*
   * Mexer na receita derruba a presunção, e é assim que se distingue "digitaram o
   * imposto errado" de "a base mudou": no primeiro caso reclama uma regra só.
   */
  it('mexer na base derruba a proporção que depende dela', () => {
    const problemas = validar(adultera(coerente, 'Receita', 1));
    expect(problemas.filter((p) => p.tipo === 'conta_nao_fecha').length).toBeGreaterThanOrEqual(1);
  });
});

/*
 * Na Venda de Ativos a mesma linha tem outra base: C29 = `C26*20%`, o resultado
 * do exercício. É por isso que a regra da presunção precisou de escopo de cenário.
 */
describe('a corrente da apuração do IRPF, na Venda de Ativos', () => {
  const CENARIO = 'Cenário 02 (Venda de Ativos)';
  const coerente = [
    valor(CENARIO, 'Resultado do exercício', 500_000, 'C26'),
    valor(CENARIO, 'Presunção de 20%', 100_000, 'C29'),
    valor(CENARIO, 'Resultado tributável', 80_000, 'C30'),
    valor(CENARIO, 'Total a recolher', 22_000, 'C31'),
  ];

  it('não reclama quando a corrente fecha pela base de lá', () => {
    expect(validar(coerente)).toEqual([]);
  });

  it('acusa a presunção contra o resultado do exercício', () => {
    const problemas = validar(adultera(coerente, 'Presunção de 20%', 999));
    const daPresuncao = problemas.filter((p) => p.detalhe.includes('Presunção de 20%'));

    expect(daPresuncao.length).toBeGreaterThan(0);
    expect(daPresuncao[0].detalhe).toContain('`Resultado do exercício`');
  });

  /*
   * A regra da aba de cenário não pode vazar para cá, e não basta que hoje não
   * exista uma linha `Receita` nesta aba: o escopo é declarado, não é sorte. Uma
   * linha com esse rótulo aqui tem de passar batido.
   */
  it('a regra da aba de cenário não se aplica aqui', () => {
    const comReceitaErrada = [...coerente, valor(CENARIO, 'Receita', 42, 'C19')];
    const problemas = validar(comReceitaErrada).filter((p) => p.detalhe.includes('`Receita`'));
    expect(problemas).toEqual([]);
  });
});

describe('tributo que ainda não existe', () => {
  it('acusa CBS com valor antes de 2027', () => {
    const valores = le('resumo-pfxpj-x-pjxpj');
    const problemas = validar(adultera(valores, 'CBS (a partir de 2027)', 500));
    const daCbs = problemas.filter((p) => p.detalhe.includes('antes de o tributo existir'));

    expect(daCbs.length).toBeGreaterThan(0);
    expect(daCbs[0].detalhe).toContain('2026');
  });
});

/*
 * O validador não cobra linha que o estudo não preencheu. O WP é preenchido
 * conforme o cliente, e um bloco inteiro zerado é normal: cobrar ali encheria o
 * resultado de falso alarme e faria a pessoa parar de ler os avisos.
 */
describe('o que o validador não cobra', () => {
  it('bloco sem nenhuma linha lida passa em silêncio', () => {
    const valores = le('resumo-pfxpj-x-pjxpj').filter(
      (v) => !v.origemCelula.match(/(2[89]|3[012])$/),
    );
    const problemas = validar(valores);
    expect(problemas.filter((p) => p.detalhe.includes('Lucro Real'))).toEqual([]);
  });

  it('lista vazia não gera reclamação nenhuma', () => {
    expect(validar([])).toEqual([]);
  });
});
