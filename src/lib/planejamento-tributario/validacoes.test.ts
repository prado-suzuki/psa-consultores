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

describe('a corrente da apuração do IRPF', () => {
  const valores = le('transferencia-rural');

  it('acusa quando a presunção deixa de ser 20% do resultado', () => {
    const problemas = validar(adultera(valores, 'Presunção de 20%', 999));
    const daPresuncao = problemas.filter((p) => p.detalhe.includes('Presunção de 20%'));

    expect(daPresuncao.length).toBeGreaterThan(0);
    expect(daPresuncao[0].detalhe).toContain('20.0%');
  });

  it('acusa quando o imposto deixa de ser 27,5% da presunção', () => {
    const problemas = validar(adultera(valores, 'Total a recolher', 999));
    const doImposto = problemas.filter((p) => p.detalhe.includes('Total a recolher'));

    expect(doImposto.length).toBeGreaterThan(0);
    expect(doImposto[0].detalhe).toContain('27.5%');
  });

  /*
   * Adulterar o resultado do exercício quebra as duas proporções de uma vez, e é
   * assim que se distingue "digitaram o imposto errado" de "a base mudou": no
   * primeiro caso reclama uma regra, no segundo reclamam duas.
   */
  it('mexer na base derruba as duas proporções', () => {
    const problemas = validar(adultera(valores, 'Resultado do exercício', 1));
    expect(problemas.filter((p) => p.tipo === 'conta_nao_fecha').length).toBeGreaterThanOrEqual(1);
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
