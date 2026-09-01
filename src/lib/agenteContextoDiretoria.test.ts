import { describe, expect, it } from 'vitest';
import { contextoBoardDiretoria, SUGESTOES_BOARD } from './agenteContextoDiretoria';
import type { ContextoTela } from '@/hooks/useAgenteContexto';

const tela = (rotulo: string, id: string): ContextoTela => ({
  rotulo,
  filtros: { recorte: rotulo },
  blocos: [{ id, titulo: 'Leitura', campos: [{ rotulo: 'N', valor: '1' }] }],
  sugestoes: ['pergunta da aba'],
});

describe('contextoBoardDiretoria', () => {
  it('junta as quatro leituras e prefixa o bloco', () => {
    const ctx = contextoBoardDiretoria({
      estrategico: tela('E', 'caixa'),
      ferramentas: tela('F', 'fte'),
      projetos: tela('P', 'carga'),
      clientes: tela('C', 'receita'),
    });
    expect(ctx.rotulo).toBe('Board');
    expect(ctx.sugestoes).toEqual(SUGESTOES_BOARD);
    expect(ctx.blocos.map((b) => b.id)).toEqual([
      'estrategico.caixa', 'ferramentas.fte', 'projetos.carga', 'clientes.receita',
    ]);
    expect(ctx.blocos[1].titulo).toBe('Ferramentas · Leitura');
  });

  it('parte ausente não inventa bloco', () => {
    const ctx = contextoBoardDiretoria({ ferramentas: tela('F', 'fte') });
    expect(ctx.blocos).toHaveLength(1);
  });
});
