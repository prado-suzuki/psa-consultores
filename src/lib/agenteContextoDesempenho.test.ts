import { describe, it, expect } from 'vitest';
import { contextoBoardDesempenho, type EntradaContextoDesempenho } from './agenteContextoDesempenho';
import { itensDeDecisao } from './agenteDecisao';

/**
 * O que estes testes travam não é layout: é HONESTIDADE do snapshot. Esta tela
 * perdeu o card "Análise IA do Ciclo" e o card de alertas, e o conteúdo passou
 * a chegar ao usuário POR AQUI. Se um alerta não entrar no bloco, ele deixou de
 * existir para quem olha a tela — e ninguém vai notar.
 */
const base: EntradaContextoDesempenho = {
  ciclo: {
    nome: 'Ciclo 2026.1', status: 'em_andamento', fim: '2026-12-31',
    pctDecorrido: 62, analiseSemestral: '2026-09-30',
  },
  totalMetas: 48,
  metasConcluidas: 12,
  metasEmRisco: 7,
  mediaProgresso: 71.4,
  feedbacks: { total: 23, reconhecimento: 15, desenvolvimento: 8 },
  reunioes: { noCiclo: 19, membrosSem1a1: 3, itensVencidos: 2 },
  ppr: [
    { nome: 'Ana Souza', ppr: 104, classificacao: 'supera', metas: 4, metasAtivas: 2, feedbacks: 3, reunioes: 2 },
    { nome: 'Bruno Lima', ppr: 58, classificacao: 'abaixo', metas: 3, metasAtivas: 3, feedbacks: 1, reunioes: 0 },
  ],
  alertas: [
    { severidade: 'risco', titulo: 'Meta X abaixo de 70% com prazo em 9d', detalhe: 'Bruno Lima · 58%' },
    { severidade: 'info', titulo: 'Análise semestral em 40 dias', detalhe: 'Preparar formulários' },
  ],
  falhas: [],
};

describe('contextoBoardDesempenho', () => {
  it('publica os alertas no bloco que o painel desenha', () => {
    const ctx = contextoBoardDesempenho(base);
    const itens = itensDeDecisao(ctx.blocos);
    expect(itens).toHaveLength(2);
    expect(itens[0].alerta).toBe('Meta X abaixo de 70% com prazo em 9d');
    expect(itens[0].evidencia).toBe('Bruno Lima · 58%');
  });

  it('colapsa "info" em "atencao" — o painel tem duas gravidades, não três', () => {
    const itens = itensDeDecisao(contextoBoardDesempenho(base).blocos);
    expect(itens.map((i) => i.severidade)).toEqual(['risco', 'atencao']);
  });

  it('omite o bloco de decisão quando não há alerta (em vez de bloco vazio)', () => {
    const ctx = contextoBoardDesempenho({ ...base, alertas: [] });
    expect(ctx.blocos.some((b) => b.id === 'alertas')).toBe(false);
    expect(itensDeDecisao(ctx.blocos)).toEqual([]);
  });

  it('consulta não respondida chega como null, nunca como zero', () => {
    const ctx = contextoBoardDesempenho({
      ...base,
      totalMetas: null, metasConcluidas: null, metasEmRisco: null, mediaProgresso: null,
      feedbacks: { total: null, reconhecimento: 0, desenvolvimento: 0 },
      falhas: ['overview do ciclo'],
    });
    const metas = ctx.blocos.find((b) => b.id === 'metas');
    expect(metas?.campos.find((c) => c.rotulo === 'Total de metas')?.valor).toBeNull();
    expect(metas?.campos.find((c) => c.rotulo === 'Média de progresso')?.valor).toBeNull();
    expect(ctx.avisos).toEqual(['falha ao carregar: overview do ciclo']);
  });

  it('não inventa aviso quando nada falhou', () => {
    expect(contextoBoardDesempenho(base).avisos).toBeUndefined();
  });

  it('formata percentual como a tela mostra', () => {
    const ctx = contextoBoardDesempenho(base);
    const metas = ctx.blocos.find((b) => b.id === 'metas');
    // 71,4 arredonda para 71%: é o que o BoardStatStrip desenha.
    expect(metas?.campos.find((c) => c.rotulo === 'Média de progresso')?.valor).toBe('71%');
    const ciclo = ctx.blocos.find((b) => b.id === 'ciclo');
    expect(ciclo?.campos.find((c) => c.rotulo === 'Decorrido')?.valor).toBe('62%');
  });

  it('recorta o bloco de pessoas e conta quem está abaixo da linha', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({
      nome: `Pessoa ${i}`, ppr: i < 5 ? 40 : 90, classificacao: i < 5 ? 'abaixo' : 'atende',
      metas: 2, metasAtivas: 1, feedbacks: 0, reunioes: 0,
    }));
    const bloco = contextoBoardDesempenho({ ...base, ppr: muitos })
      .blocos.find((b) => b.id === 'ppr');
    expect(bloco?.itens).toHaveLength(12);
    expect(bloco?.campos.find((c) => c.rotulo === 'Pessoas abaixo de 70%')?.valor).toBe('5');
    // O total continua sendo o real, não o recortado: o agente precisa saber
    // que viu 12 de 20.
    expect(bloco?.campos.find((c) => c.rotulo === 'Pessoas com meta no ciclo')?.valor).toBe('20');
  });

  it('omite o bloco de pessoas quando ninguém tem meta', () => {
    const ctx = contextoBoardDesempenho({ ...base, ppr: [] });
    expect(ctx.blocos.some((b) => b.id === 'ppr')).toBe(false);
  });

  it('põe o bloco de decisão em primeiro — o corte por tamanho descarta o fim', () => {
    expect(contextoBoardDesempenho(base).blocos[0].id).toBe('alertas');
  });
});
