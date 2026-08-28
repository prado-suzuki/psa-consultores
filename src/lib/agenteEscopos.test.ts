import { describe, it, expect } from 'vitest';
import { ESCOPOS_BOARD, escopoDaRota, rotaDoEscopo, rotuloDoEscopo } from './agenteEscopos';

/**
 * O que estes testes travam: o ícone do agente tem que abrir o escopo CERTO em
 * cada menu e submenu. Escopo errado significa o painel de Ciclos respondendo
 * com o prompt da Visão Geral — erro silencioso, porque a tela desenha igual.
 */
describe('escopoDaRota', () => {
  it('resolve a rota exata do escopo', () => {
    expect(escopoDaRota('/equipe/board/desempenho/minha-evolucao')?.escopo)
      .toBe('board.desempenho.minha-evolucao');
  });

  it('devolve null nas rotas desativadas da aba Desempenho', () => {
    // A aba saiu do menu e as rotas do App.tsx foram desativadas; sem escopo,
    // o ícone do agente não aparece e o "Ver" de uma notificação antiga não
    // navega para o NotFound.
    expect(escopoDaRota('/equipe/board/desempenho')).toBeNull();
    expect(escopoDaRota('/equipe/board/desempenho/ciclos')).toBeNull();
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
    expect(rotuloDoEscopo('board.desempenho.minha-evolucao')).toBe('Minha evolução');
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
