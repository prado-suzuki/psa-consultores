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
    expect(comFlagDaPecaRetroativa([])).toEqual(['e_constituicao', 'administracao_simples']);
    expect(comFlagDaPecaRetroativa(['e_pr']))
      .toEqual(['e_pr', 'e_constituicao', 'administracao_simples']);
  });

  it('snapshot que já traz uma delas é decisão selada e não se mexe', () => {
    expect(comFlagDaPecaRetroativa(['e_alteracao', 'evento_aumento_capital', 'administracao_simples']))
      .toEqual(['e_alteracao', 'evento_aumento_capital', 'administracao_simples']);
    expect(comFlagDaPecaRetroativa(['e_constituicao', 'governanca_por_orgaos']))
      .toEqual(['e_constituicao', 'governanca_por_orgaos']);
  });
});

describe('comFlagDaPecaRetroativa — o par da governança', () => {
  it('snapshot sem nenhum dos dois lados é administração simples', () => {
    // Toda peça selada antes da frente de governança é de administração simples,
    // e não sabe dizê-lo. Sem completar, os seis blocos que passaram a pender de
    // `administracao_simples` somem do acervo validado, e o contrato sai com o
    // cabeçalho do Capítulo da Administração e nada embaixo.
    expect(comFlagDaPecaRetroativa(['e_alteracao']))
      .toEqual(['e_alteracao', 'administracao_simples']);
  });

  it('snapshot que escolheu a governança por órgãos não vira administração simples', () => {
    // O par inteiro é que se completa: quem já tem um lado tem decisão selada, e
    // completar o outro poria os dois regramentos no mesmo capítulo.
    expect(comFlagDaPecaRetroativa(['e_alteracao', 'governanca_por_orgaos']))
      .toEqual(['e_alteracao', 'governanca_por_orgaos']);
  });

  it('completa os dois pares quando o snapshot é anterior aos dois', () => {
    expect(comFlagDaPecaRetroativa(['e_pr', 'empresa-controladora']))
      .toEqual(['e_pr', 'empresa-controladora', 'e_constituicao', 'administracao_simples']);
  });
});
