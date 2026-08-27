import { describe, it, expect } from 'vitest';
import { ESCOPOS_BOARD, escopoDaRota, rotaDoEscopo, rotuloDoEscopo } from './agenteEscopos';

/**
 * O que estes testes travam: o ícone do agente tem que abrir o escopo CERTO em
 * cada menu e submenu. Escopo errado significa o painel de Ciclos respondendo
 * com o prompt da Visão Geral — erro silencioso, porque a tela desenha igual.
 */
describe('escopoDaRota', () => {
  it('resolve o submenu, não o pai (prefixo mais longo ganha)', () => {
    expect(escopoDaRota('/equipe/board/desempenho/ciclos')?.escopo)
      .toBe('board.desempenho.ciclos');
    expect(escopoDaRota('/equipe/board/desempenho/minha-evolucao')?.escopo)
      .toBe('board.desempenho.minha-evolucao');
  });

  it('resolve o pai quando nenhum submenu casa', () => {
    expect(escopoDaRota('/equipe/board/desempenho')?.escopo).toBe('board.desempenho');
  });

  it('casa rota com parâmetro pelo prefixo (detalhe de chamado)', () => {
    expect(escopoDaRota('/equipe/board/chamados/abc-123')?.escopo).toBe('board.chamados');
  });

  it('não confunde prefixo parcial de outro segmento', () => {
    // `/clientes` e `/dashboard-clientes-os` começam parecido no meio da URL:
    // sem a checagem de igualdade ou de barra, um casaria no outro.
    expect(escopoDaRota('/equipe/board/dashboard-clientes-os')?.escopo).toBe('board.projetos');
    expect(escopoDaRota('/equipe/board/clientes')?.escopo).toBe('board.clientes');
  });

  it('devolve null fora do Board', () => {
    expect(escopoDaRota('/equipe/tax/gerencial')).toBeNull();
    expect(escopoDaRota('/')).toBeNull();
  });
});

describe('rotaDoEscopo / rotuloDoEscopo', () => {
  it('faz o caminho de volta para o "Ver" da notificação', () => {
    expect(rotaDoEscopo('board.estrategico')).toBe('/equipe/board/dashboard');
    expect(rotuloDoEscopo('board.desempenho.decisoes')).toBe('Desempenho · Decisões');
  });

  it('devolve null para escopo desconhecido em vez de rota inventada', () => {
    expect(rotaDoEscopo('board.inexistente')).toBeNull();
    expect(rotuloDoEscopo('board.inexistente')).toBeNull();
  });
});

describe('tabela de escopos', () => {
  it('não tem escopo nem rota duplicados', () => {
    expect(new Set(ESCOPOS_BOARD.map((e) => e.escopo)).size).toBe(ESCOPOS_BOARD.length);
    expect(new Set(ESCOPOS_BOARD.map((e) => e.rota)).size).toBe(ESCOPOS_BOARD.length);
  });

  it('toda rota volta para o próprio escopo (ida e volta consistentes)', () => {
    for (const e of ESCOPOS_BOARD) {
      expect(escopoDaRota(e.rota)?.escopo).toBe(e.escopo);
    }
  });
});
