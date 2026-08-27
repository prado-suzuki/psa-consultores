import { describe, expect, it } from 'vitest';
import { comFlagDaPecaRetroativa, flagDaPeca } from './flags';

describe('flagDaPeca', () => {
  it('liga somente e_constituicao na peça inicial', () => {
    expect([flagDaPeca(0)]).toEqual(['e_constituicao']);
  });

  it('liga somente e_alteracao a partir da primeira alteração', () => {
    expect([flagDaPeca(1)]).toEqual(['e_alteracao']);
    expect([flagDaPeca(3)]).toEqual(['e_alteracao']);
  });
});

describe('comFlagDaPecaRetroativa — o acervo selado antes das flags de peça', () => {
  it('snapshot sem NENHUMA das duas é lido como constituição', () => {
    // No sandbox, 15 dos 19 documentos gerados são assim: selados antes de
    // 26/08/2026, quando as flags de peça nasceram. Sem esta leitura, todo bloco
    // que passou a pender de `e_constituicao` (capital, sede, objeto) sai daquelas
    // peças sem sinal nenhum — inclusive das registradas.
    expect(comFlagDaPecaRetroativa([])).toEqual(['e_constituicao']);
    expect(comFlagDaPecaRetroativa(['e_pr'])).toEqual(['e_pr', 'e_constituicao']);
  });

  it('snapshot que já traz uma delas é decisão selada e não se mexe', () => {
    expect(comFlagDaPecaRetroativa(['e_alteracao', 'evento_aumento_capital']))
      .toEqual(['e_alteracao', 'evento_aumento_capital']);
    expect(comFlagDaPecaRetroativa(['e_constituicao'])).toEqual(['e_constituicao']);
  });
});
