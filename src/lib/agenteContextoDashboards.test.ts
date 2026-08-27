import { describe, it, expect } from 'vitest';
import { contextoBoardDashboards, type EntradaContextoDashboards } from './agenteContextoDashboards';

const base: EntradaContextoDashboards = {
  dashboards: [
    { name: 'Receita por cliente', filter_type: 'cliente', sop_url: 'https://sop' },
    { name: 'Horas por área', filter_type: 'area', sop_url: null },
  ],
  selecionado: 'Receita por cliente',
  carregando: false,
  falhas: [],
};

const bloco = (ctx: ReturnType<typeof contextoBoardDashboards>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardDashboards>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardDashboards', () => {
  it('o LIMITE vem primeiro — e a informacao mais importante desta tela', () => {
    expect(contextoBoardDashboards(base).blocos[0].id).toBe('limite');
  });

  it('diz com todas as letras que nao le o conteudo do relatorio', () => {
    const c = campo(contextoBoardDashboards(base), 'limite', 'O agente consegue ler os números do relatório?');
    expect(c?.valor).toBe('não');
    expect(c?.nota).toContain('seria invenção');
  });

  it('sem relatorio aberto, o campo e null com nota — nao string vazia', () => {
    const ctx = contextoBoardDashboards({ ...base, selecionado: null });
    const c = campo(ctx, 'limite', 'Relatório aberto agora');
    expect(c?.valor).toBeNull();
    expect(c?.nota).toBe('nenhum selecionado');
    expect(ctx.filtros['relatório']).toBe('nenhum aberto');
  });

  it('lista os relatorios e avisa que a lista e por acesso', () => {
    const ctx = contextoBoardDashboards(base);
    expect(campo(ctx, 'biblioteca', 'Relatórios disponíveis')?.valor).toBe('2');
    expect(bloco(ctx, 'biblioteca')?.nota).toContain('respeita o seu acesso');
    expect(bloco(ctx, 'biblioteca')?.itens?.[1]).toMatchObject({
      relatorio: 'Horas por área', tem_procedimento: 'não',
    });
  });

  it('biblioteca vazia nao vira bloco vazio, mas o limite continua', () => {
    const ctx = contextoBoardDashboards({ ...base, dashboards: [], selecionado: null });
    expect(bloco(ctx, 'biblioteca')).toBeUndefined();
    expect(bloco(ctx, 'limite')).toBeDefined();
  });

  it('falha vira aviso', () => {
    expect(contextoBoardDashboards({ ...base, falhas: ['biblioteca de dashboards'] }).avisos)
      .toEqual(['falha ao carregar: biblioteca de dashboards']);
  });
});
