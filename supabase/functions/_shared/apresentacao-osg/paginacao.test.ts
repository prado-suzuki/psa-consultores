// A aritmetica da paginacao do quadro societario.
//
// Foi aqui que o deck perdeu dado: a tabela nao sabia ser partida, empresa grande
// era adiada para sempre, e um teto de 20 voltas no laco escondia o sintoma. Um
// cliente com 41 socios saia com 17 no .pptx, sem aviso nenhum.
//
// O baseline de ponta a ponta nao pega isto — ele so diz "o deck mudou". Quem diz
// QUAL conta quebrou e este arquivo.
import { describe, expect, it } from 'vitest';

import {
  cabemQuantasLinhas,
  estimarAltura,
  QUADRO_PAD_H,
  QUADRO_ROW_H,
  QUADRO_TOP_0,
  QUADRO_TOP_MAX,
  paginasDoQuadro,
  repartirLinhas,
  LINHAS_POR_PAGINA_DE_OUTROS_BENS,
  paginasDeOutrosBens,
} from './paginacao.ts';

/** Linhas de mentira: só a quantidade importa para a conta. */
const linhas = (n: number) => Array.from({ length: n }, (_, i) => `socio-${i}`);

describe('estimarAltura', () => {
  it('conta as três linhas fixas mais o respiro', () => {
    // cabeçalho da empresa + cabeçalho das colunas + TOTAL
    expect(estimarAltura(0)).toBe(3 * QUADRO_ROW_H + QUADRO_PAD_H);
    expect(estimarAltura(10)).toBe(13 * QUADRO_ROW_H + QUADRO_PAD_H);
  });

  it('cresce uma linha por sócio', () => {
    expect(estimarAltura(5) - estimarAltura(4)).toBe(QUADRO_ROW_H);
  });
});

describe('cabemQuantasLinhas', () => {
  // O número que o molde de hoje permite. Se o template mudar de altura, é este
  // teste que avisa — e não o consultor descobrindo sócio faltando na reunião.
  it('uma coluna inteira comporta 13 sócios', () => {
    expect(cabemQuantasLinhas(QUADRO_TOP_0)).toBe(13);
  });

  it('é coerente com a estimarAltura: o que ela diz que cabe, cabe mesmo', () => {
    for (const top of [QUADRO_TOP_0, 2_000_000, 3_500_000, 5_000_000]) {
      const n = cabemQuantasLinhas(top);
      expect(top + estimarAltura(n)).toBeLessThanOrEqual(QUADRO_TOP_MAX);
      // e uma linha a mais já não caberia — a conta não é conservadora demais
      if (n > 0) expect(top + estimarAltura(n + 1)).toBeGreaterThan(QUADRO_TOP_MAX);
    }
  });

  it('coluna cheia devolve zero, nunca negativo', () => {
    expect(cabemQuantasLinhas(QUADRO_TOP_MAX)).toBe(0);
    expect(cabemQuantasLinhas(QUADRO_TOP_MAX + 10_000_000)).toBe(0);
  });
});

describe('repartirLinhas', () => {
  it('o que cabe inteiro não vira resto — e é o pedaço que leva o TOTAL', () => {
    const r = repartirLinhas(linhas(5), QUADRO_TOP_0);
    expect(r.aqui).toHaveLength(5);
    expect(r.resto).toEqual([]);
  });

  it('o que não cabe é partido, e nenhuma linha se perde', () => {
    const r = repartirLinhas(linhas(42), QUADRO_TOP_0);
    expect(r.aqui).toHaveLength(13);
    expect(r.resto).toHaveLength(29);
    expect([...r.aqui, ...r.resto]).toEqual(linhas(42));
  });

  it('coluna sem espaço manda tudo adiante, sem desenhar meia tabela', () => {
    const r = repartirLinhas(linhas(10), QUADRO_TOP_MAX);
    expect(r.aqui).toEqual([]);
    expect(r.resto).toHaveLength(10);
  });

  // A INVARIANTE QUE O DECK PERDIA. Repartindo pagina a pagina, toda linha
  // termina em alguma — e o laco converge. Antes, uma empresa de 42 socios
  // devolvia as mesmas 42 para sempre.
  it.each([1, 13, 14, 42, 100, 500])('%i sócios: tudo sai, e o laço termina', (n) => {
    let restam = linhas(n);
    const colocadas: string[] = [];
    let voltas = 0;
    while (restam.length > 0) {
      const { aqui, resto } = repartirLinhas(restam, QUADRO_TOP_0);
      expect(aqui.length).toBeGreaterThan(0); // progresso a cada volta
      colocadas.push(...aqui);
      restam = resto;
      if (++voltas > 1000) throw new Error('não convergiu');
    }
    expect(colocadas).toEqual(linhas(n));
    expect(voltas).toBe(Math.ceil(n / 13));
  });

  it('não muda a lista que recebeu', () => {
    const entrada = linhas(42);
    repartirLinhas(entrada, QUADRO_TOP_0);
    expect(entrada).toHaveLength(42);
  });
});

describe('paginasDoQuadro', () => {
  // Os tres clientes do sandbox, conferidos contra o .pptx que a funcao gerou em
  // 21/09/2026. O deck societario tem capa + divisor + organograma antes do
  // quadro, entao "7 slides no arquivo" e "4 paginas de quadro" sao o mesmo fato.
  it('reproduz o Banana Quantica: 42 socios numa empresa e 1 na outra, 4 paginas', () => {
    // O caso que denunciou a mentira: a tela prometia 2 e o arquivo saiu com 7.
    expect(paginasDoQuadro([42, 1])).toBe(4);
  });

  it('reproduz o Agro Alianca e a Sta. Terezinha: quadro pequeno, 1 pagina', () => {
    expect(paginasDoQuadro([3, 1, 1])).toBe(1);
    expect(paginasDoQuadro([2, 2])).toBe(1);
  });

  it('nao ha quadro sem empresa, e empresa sem socio nao ocupa pagina', () => {
    // O gerador remove o slide4 quando nao ha empresa; a tela mostra 0.
    expect(paginasDoQuadro([])).toBe(0);
    expect(paginasDoQuadro([0, 0])).toBe(0);
    expect(paginasDoQuadro([0, 5])).toBe(1);
  });

  it('uma empresa sozinha ocupa ceil(socios / 13) paginas', () => {
    // 13 e a coluna cheia. A invariante e a mesma do laco do gerador: toda linha
    // termina em alguma pagina, e o numero de voltas nao depende de teto nenhum.
    for (const n of [1, 13, 14, 26, 27, 42, 100, 500]) {
      expect(paginasDoQuadro([n])).toBe(Math.ceil(n / 13));
    }
  });

  it('converge para qualquer combinacao, sem laco infinito', () => {
    // Era exatamente aqui que o gerador nao convergia: 42 socios devolviam os
    // mesmos 42 para sempre, e o `guardBail < 20` disfarcava com slides vazios.
    for (const caso of [[42, 42], [13, 13, 13], [1, 1, 1, 1, 1], [200, 3, 90]]) {
      const paginas = paginasDoQuadro(caso);
      expect(paginas).toBeGreaterThan(0);
      expect(paginas).toBeLessThanOrEqual(caso.reduce((t, n) => t + n, 0));
    }
  });
});

describe('paginasDeOutrosBens', () => {
  it('zero bem, zero página: a tabela sai do deck', () => {
    expect(paginasDeOutrosBens(0)).toBe(0);
  });
  it('uma página até o teto, e abre outra no bem seguinte', () => {
    expect(paginasDeOutrosBens(1)).toBe(1);
    expect(paginasDeOutrosBens(LINHAS_POR_PAGINA_DE_OUTROS_BENS)).toBe(1);
    expect(paginasDeOutrosBens(LINHAS_POR_PAGINA_DE_OUTROS_BENS + 1)).toBe(2);
  });
});
