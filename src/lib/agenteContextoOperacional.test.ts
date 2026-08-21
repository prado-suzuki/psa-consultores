import { describe, it, expect } from 'vitest';
import {
  contextoBoardOperacional, type EntradaContextoOperacional,
} from './agenteContextoOperacional';

/**
 * O que estes testes travam é HONESTIDADE. Esta tela perdeu o banner "Dados
 * incompletos", e o único caminho que sobrou para o usuário saber que uma
 * consulta falhou é o `avisos` daqui. Além disso, ela tem três armadilhas
 * próprias, e cada uma tem um caso abaixo: escopo vazio virando 0% de
 * pontualidade, ROI ausente virando 0%, e metas de escopo mais largo somadas
 * com projetos de escopo estreito.
 */
const base: EntradaContextoOperacional = {
  janela: 'últimos 30 dias',
  escopo: 'PSA Norte',
  saude: { total: 14, emDia: 9, emRisco: 3, atrasados: 2, pontualidade: 64 },
  desvio: { dias: 2.04, amostra: 22, atrasadas: 6 },
  roi: { economiaMensal: 26_000, economiaAnual: 320_000, investimento: 90_000, roiPct: 255, melhorias: 7 },
  metas: { total: 30, individuais: 18, emRisco: 4, progresso: 71, escopoLabel: 'todas as empresas' },
  pessoas: { total: 23, escopoLabel: 'todas as empresas' },
  projetosCriticos: [
    { nome: 'Recuperação PIS/COFINS', status: 'atrasado', cliente: 'Cliente A' },
    { nome: 'Revisão de créditos', status: 'em_risco', cliente: null },
  ],
  falhas: [],
};

describe('contextoBoardOperacional', () => {
  it('leva as falhas para avisos — é o único caminho que sobrou do banner removido', () => {
    const ctx = contextoBoardOperacional({
      ...base, falhas: ['projetos e tarefas', 'metas do ciclo'],
    });
    expect(ctx.avisos).toEqual(['falha ao carregar: projetos e tarefas, metas do ciclo']);
  });

  it('não inventa aviso quando nada falhou', () => {
    expect(contextoBoardOperacional(base).avisos).toBeUndefined();
  });

  it('escopo vazio não tem pontualidade: null, nunca 0%', () => {
    const ctx = contextoBoardOperacional({
      ...base,
      saude: { total: 0, emDia: 0, emRisco: 0, atrasados: 0, pontualidade: 0 },
    });
    const campo = ctx.blocos
      .find((b) => b.id === 'entrega')?.campos
      .find((c) => c.rotulo === 'Taxa de pontualidade');
    expect(campo?.valor).toBeNull();
    expect(campo?.nota).toContain('escopo vazio');
  });

  it('ROI sem investimento é não apurado, e a nota diz que não é 0%', () => {
    const ctx = contextoBoardOperacional({
      ...base,
      roi: { ...base.roi, investimento: 0, roiPct: null },
    });
    const campo = ctx.blocos
      .find((b) => b.id === 'economia')?.campos
      .find((c) => c.rotulo === 'ROI');
    expect(campo?.valor).toBeNull();
    expect(campo?.nota).toContain('não é 0%');
  });

  it('desvio de prazo sai com sinal explícito, como o KPI da tela', () => {
    const campos = contextoBoardOperacional(base).blocos
      .find((b) => b.id === 'entrega')?.campos;
    expect(campos?.find((c) => c.rotulo === 'Desvio médio de prazo')?.valor).toBe('+2.0d');

    const antes = contextoBoardOperacional({
      ...base, desvio: { dias: -1.5, amostra: 10, atrasadas: 0 },
    }).blocos.find((b) => b.id === 'entrega')?.campos;
    expect(antes?.find((c) => c.rotulo === 'Desvio médio de prazo')?.valor).toBe('-1.5d');
  });

  it('desvio sem amostra é não apurado e declara que não há base', () => {
    const campo = contextoBoardOperacional({
      ...base, desvio: { dias: null, amostra: 0, atrasadas: 0 },
    }).blocos.find((b) => b.id === 'entrega')?.campos
      .find((c) => c.rotulo === 'Desvio médio de prazo');
    expect(campo?.valor).toBeNull();
    expect(campo?.nota).toContain('sem base');
  });

  it('progresso de metas é null quando não há meta individual', () => {
    const campo = contextoBoardOperacional({
      ...base,
      metas: { ...base.metas, individuais: 0, progresso: null },
    }).blocos.find((b) => b.id === 'metas-equipe')?.campos
      .find((c) => c.rotulo === 'Progresso médio das metas individuais');
    expect(campo?.valor).toBeNull();
    expect(campo?.nota).toContain('não é 0%');
  });

  it('carrega o escopo de cada número — é o erro mais fácil desta tela', () => {
    const ctx = contextoBoardOperacional(base);
    expect(ctx.blocos.find((b) => b.id === 'entrega')?.nota).toBe('escopo: PSA Norte');
    const metas = ctx.blocos.find((b) => b.id === 'metas-equipe');
    expect(metas?.nota).toContain('MAIS LARGO');
    expect(metas?.campos.find((c) => c.rotulo === 'Metas no ciclo')?.nota)
      .toBe('escopo: todas as empresas');
  });

  it('formata a economia como o KPI: R$ 320k', () => {
    const campo = contextoBoardOperacional(base).blocos
      .find((b) => b.id === 'economia')?.campos
      .find((c) => c.rotulo === 'Economia validada por ano');
    expect(campo?.valor).toBe('R$ 320k');
  });

  it('rotula a economia como acumulada, e não como a janela da execução', () => {
    const bloco = contextoBoardOperacional(base).blocos.find((b) => b.id === 'economia');
    expect(bloco?.janela).toContain('acumulado');
    expect(bloco?.janela).not.toContain('30 dias');
  });

  it('recorta a lista de projetos críticos', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({
      nome: `Projeto ${i}`, status: 'atrasado', cliente: null,
    }));
    const bloco = contextoBoardOperacional({ ...base, projetosCriticos: muitos })
      .blocos.find((b) => b.id === 'entrega');
    expect(bloco?.itens).toHaveLength(8);
  });
});
