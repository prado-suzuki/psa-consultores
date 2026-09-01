import { describe, it, expect } from 'vitest';
import { ESCOPOS_BOARD, escopoDaRota, rotaDoEscopo, rotuloDoEscopo } from './agenteEscopos';

/**
 * O que estes testes travam: o ícone do agente tem que abrir o escopo CERTO em
 * cada tela do Board. Escopo errado significa o painel de Clientes respondendo
 * com o prompt do Estratégico — erro silencioso, porque a tela desenha igual.
 */
describe('escopoDaRota', () => {
  it('resolve a rota exata do escopo', () => {
    expect(escopoDaRota('/equipe/board/capacidade')?.escopo).toBe('board.capacidade');
  });

  it('devolve null nas rotas desativadas de Desempenho e Minha Evolução', () => {
    // A aba saiu do menu e as rotas do App.tsx foram desativadas; sem escopo,
    // o ícone do agente não aparece e o "Ver" de uma notificação antiga não
    // navega para o NotFound.
    expect(escopoDaRota('/equipe/board/desempenho')).toBeNull();
    expect(escopoDaRota('/equipe/board/desempenho/ciclos')).toBeNull();
    expect(escopoDaRota('/equipe/board/desempenho/minha-evolucao')).toBeNull();
  });

  it('casa rota com parâmetro pelo prefixo (detalhe de chamado)', () => {
    expect(escopoDaRota('/equipe/board/chamados/abc-123')?.escopo).toBe('board.chamados');
  });

  it('as quatro leituras de diretoria compartilham o mesmo escopo', () => {
    expect(escopoDaRota('/equipe/board/dashboard')?.escopo).toBe('board.estrategico');
    expect(escopoDaRota('/equipe/board/uso-envio')?.escopo).toBe('board.estrategico');
    expect(escopoDaRota('/equipe/board/dashboard-clientes-os')?.escopo).toBe('board.estrategico');
    expect(escopoDaRota('/equipe/board/clientes')?.escopo).toBe('board.estrategico');
    expect(escopoDaRota('/equipe/board/dashboard-clientes-os')?.rotulo).toBe('Board');
  });

  it('devolve null fora do Board', () => {
    expect(escopoDaRota('/equipe/tax/gerencial')).toBeNull();
    expect(escopoDaRota('/')).toBeNull();
  });
});

describe('rotaDoEscopo / rotuloDoEscopo', () => {
  it('faz o caminho de volta para o "Ver" da notificação', () => {
    expect(rotaDoEscopo('board.estrategico')).toBe('/equipe/board/dashboard');
    expect(rotuloDoEscopo('board.estrategico')).toBe('Board');
    expect(rotuloDoEscopo('board.capacidade')).toBe('Board · Capacidade');
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

  it('rotas fora da diretoria voltam para o próprio escopo', () => {
    for (const e of ESCOPOS_BOARD.filter((x) => !x.rota.endsWith('/dashboard')
      && !x.rota.endsWith('/uso-envio')
      && !x.rota.endsWith('/dashboard-clientes-os')
      && !x.rota.endsWith('/clientes'))) {
      expect(escopoDaRota(e.rota)?.escopo).toBe(e.escopo);
    }
  });
});
