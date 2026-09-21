import { describe, expect, it } from 'vitest';

import {
  ANOS_NO_QUADRO,
  CENARIOS_NO_QUADRO,
  LINHAS_DO_QUADRO_01,
  LINHAS_DO_QUADRO_02,
  PARCELAS_NO_FLUXO,
  montaDeck,
  type ValorDaRevisao,
} from './slides.ts';
import { TOKENS_DO_MOLDE, tokensDoDeck } from './tokens.ts';

/**
 * O contrato com o molde.
 *
 * **Estes casos existem para pegar drift entre o código e o arquivo.** O molde
 * mora no bucket e não no repositório, então nada compila junto com ele: se
 * alguém acrescentar uma linha num quadro e mexer só de um lado, o slide sai com
 * o slot em branco e ninguém é avisado. A contagem abaixo é a única trava que
 * existe para isso, e foi medida no arquivo: 194 tokens distintos.
 */

/** Um valor de DRE qualquer, só para o deck ter três exercícios. */
function comTresAnos(): ValorDaRevisao[] {
  const valores: ValorDaRevisao[] = [];
  for (const [i, ano] of [2026, 2027, 2028].entries()) {
    valores.push({
      bloco: 'dre',
      rotulo: 'Receita',
      cenario: 'Cenário Atual (PF)',
      ano,
      valor: 1000 * (i + 1),
      unidade: 'moeda',
      origemCelula: 'Cenário Atual (PF)!C31',
    });
  }
  return valores;
}

describe('o mapa de tokens', () => {
  it('tem exatamente os tokens que o molde tem', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: comTresAnos() }));
    expect(Object.keys(tokens)).toHaveLength(TOKENS_DO_MOLDE);
  });

  /* A contagem por família, para o erro dizer ONDE faltou em vez de só dizer que
   * o total mudou. */
  it('a contagem por família bate com o desenho do capítulo', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: comTresAnos() }));
    const nomes = Object.keys(tokens);
    const quantos = (prefixo: RegExp) => nomes.filter((n) => prefixo.test(n)).length;

    expect(quantos(/^Q1_L\d\d_A\d$/)).toBe(LINHAS_DO_QUADRO_01 * ANOS_NO_QUADRO);
    expect(quantos(/^Q2_L\d\d_A\dC\d$/)).toBe(
      LINHAS_DO_QUADRO_02 * ANOS_NO_QUADRO * CENARIOS_NO_QUADRO,
    );
    expect(quantos(/^Q2_VAR_A\dC\d$/)).toBe(ANOS_NO_QUADRO * (CENARIOS_NO_QUADRO - 1));
    expect(quantos(/^TR_P\d$/)).toBe(PARCELAS_NO_FLUXO);
    expect(quantos(/^ANO_P\d$/)).toBe(PARCELAS_NO_FLUXO);
    expect(quantos(/^RES_SOMA_C\d$/)).toBe(CENARIOS_NO_QUADRO);
    expect(quantos(/^RES_VAR_C\d$/)).toBe(CENARIOS_NO_QUADRO - 1);
    expect(quantos(/^PARC_/)).toBe(4);
    expect(quantos(/^ANO\d$/)).toBe(ANOS_NO_QUADRO);
  });

  /*
   * O slot do primeiro cenário é a base da comparação, e o molde escreve "base"
   * nele em texto fixo. Um token ali faria o gerador sobrescrever a palavra com
   * um traço.
   */
  it('não emite token para a coluna base da variação', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: comTresAnos() }));
    expect(tokens.Q2_VAR_A1C1).toBeUndefined();
    expect(tokens.RES_VAR_C1).toBeUndefined();
    expect(tokens.Q2_VAR_A1C2).toBeDefined();
  });

  /*
   * Todo slot tem de sair preenchido, mesmo sem dado: o gerador apaga qualquer
   * `{{TOKEN}}` que sobre, então um slot ausente do mapa vira célula vazia em vez
   * de traço, e célula vazia no meio de um quadro parece defeito de leitura.
   */
  it('nenhum slot sai vazio, nem num WP sem nada', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: [] }));
    expect(Object.keys(tokens)).toHaveLength(TOKENS_DO_MOLDE);
    for (const [nome, valor] of Object.entries(tokens)) {
      expect(valor, `o token ${nome} saiu vazio`).not.toBe('');
    }
  });

  it('o nome do slot é 1-based e com zero à esquerda', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: comTresAnos() }));
    expect(tokens).toHaveProperty('Q1_L01_A1');
    expect(tokens).toHaveProperty('Q1_L11_A3');
    expect(tokens).toHaveProperty('Q2_L14_A3C3');
    expect(tokens).not.toHaveProperty('Q1_L0_A0');
    expect(tokens).not.toHaveProperty('Q1_L12_A1');
  });

  it('a receita do quadro chega ao slot certo', () => {
    const tokens = tokensDoDeck(montaDeck({ valores: comTresAnos() }));
    expect(tokens.Q1_L01_A1).toBe('1.000');
    expect(tokens.Q1_L01_A2).toBe('2.000');
    expect(tokens.Q1_L01_A3).toBe('3.000');
    expect(tokens.ANO1).toBe('2026');
    expect(tokens.ANO3).toBe('2028');
  });
});
