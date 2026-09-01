import { describe, it, expect } from 'vitest';
import {
  contextoBoardFerramentas, type EntradaContextoFerramentas,
} from './agenteContextoFerramentas';

/**
 * Esta tela tem DUAS formas de "zero" que não são zero, e cada uma tem caso
 * abaixo: retenção `null` no primeiro mês da série, e mês de referência
 * PARCIAL. As duas já produziram leitura errada nesta base — o snapshot tem que
 * carregar o qualificador junto do número, sempre.
 */
const base: EntradaContextoFerramentas = {
  periodo: 'tudo',
  escopo: 'consolidado, todas as unidades',
  pessoa: null,
  totais: {
    pessoasAtivas: 31, usuariosNovos: 4, totalAcoes: 12_480,
    acoesPorPessoa: 402.6, ferramentasUtilizadas: 6,
  },
  mesReferencia: {
    label: 'jul/26', parcial: false, taxaRetencao: 0.8125, anteriorLabel: 'jun/26',
  },
  ferramentas: [
    { ferramenta: 'Consulta CNPJ', usuariosAtivos: 22, chamadas: 5400, coberturaUsuarios: 0.71, taxaSucesso: 0.994 },
  ],
  pessoas: [
    { usuario: 'ana@psa', chamadas: 1200, diasAtivos: 41, ferramentasUsadas: 5, documentosEnviados: 90 },
  ],
  catalogoFerramentas: 9,
  usandoFixtures: false,
  falhas: [],
};

const campo = (ctx: ReturnType<typeof contextoBoardFerramentas>, bloco: string, rotulo: string) =>
  ctx.blocos.find((b) => b.id === bloco)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardFerramentas', () => {
  it('retenção null no primeiro mês diz que NÃO é 0%', () => {
    const ctx = contextoBoardFerramentas({
      ...base,
      mesReferencia: { label: 'jan/26', parcial: false, taxaRetencao: null, anteriorLabel: null },
    });
    const c = campo(ctx, 'retencao', 'Taxa de retenção');
    expect(c?.valor).toBeNull();
    expect(c?.nota).toContain('NÃO é 0%');
  });

  it('mês parcial vira aviso no próprio bloco, junto do número', () => {
    const ctx = contextoBoardFerramentas({
      ...base,
      mesReferencia: { ...base.mesReferencia, label: 'ago/26', parcial: true },
    });
    const bloco = ctx.blocos.find((b) => b.id === 'retencao');
    expect(bloco?.nota).toContain('PARCIAL');
    expect(bloco?.nota).toContain('ago/26');
  });

  it('mês fechado não ganha aviso de parcial', () => {
    expect(contextoBoardFerramentas(base).blocos.find((b) => b.id === 'retencao')?.nota)
      .toBeUndefined();
  });

  it('nomeia os dois meses da comparação — retenção anônima não se audita', () => {
    const c = campo(contextoBoardFerramentas(base), 'retencao', 'Taxa de retenção');
    expect(c?.valor).toBe('81,3%');
    expect(c?.nota).toContain('jul/26');
    expect(c?.nota).toContain('jun/26');
  });

  it('consulta sem resposta deixa TODO o bloco de adoção não apurado', () => {
    const ctx = contextoBoardFerramentas({ ...base, totais: null, falhas: ['uso das ferramentas'] });
    expect(campo(ctx, 'adocao', 'Pessoas ativas')?.valor).toBeNull();
    expect(campo(ctx, 'adocao', 'Ações no período')?.valor).toBeNull();
    expect(campo(ctx, 'adocao', 'Ações por pessoa')?.valor).toBeNull();
    expect(ctx.avisos).toContain('falha ao carregar: uso das ferramentas');
  });

  it('fixture é declarada como demonstração — o agente não pode afirmar isso como real', () => {
    const ctx = contextoBoardFerramentas({ ...base, usandoFixtures: true });
    expect(ctx.avisos?.some((a) => a.includes('DEMONSTRAÇÃO'))).toBe(true);
  });

  it('não inventa aviso quando nada falhou e o dado é real', () => {
    expect(contextoBoardFerramentas(base).avisos).toBeUndefined();
  });

  it('diz de quantas ferramentas do catálogo o número de adotadas saiu', () => {
    expect(campo(contextoBoardFerramentas(base), 'adocao', 'Ferramentas com uso')?.nota)
      .toBe('de 9 no catálogo');
    // Catálogo desconhecido não vira "de 0 no catálogo".
    expect(campo(contextoBoardFerramentas({ ...base, catalogoFerramentas: null }), 'adocao', 'Ferramentas com uso')?.nota)
      .toBeUndefined();
  });

  it('omite listas vazias em vez de publicar bloco sem linha', () => {
    const ctx = contextoBoardFerramentas({ ...base, ferramentas: [], pessoas: [] });
    expect(ctx.blocos.some((b) => b.id === 'ferramentas')).toBe(false);
    expect(ctx.blocos.some((b) => b.id === 'pessoas')).toBe(false);
  });

  it('recorta as listas', () => {
    const ctx = contextoBoardFerramentas({
      ...base,
      ferramentas: Array.from({ length: 12 }, (_, i) => ({
        ferramenta: `F${i}`, usuariosAtivos: 1, chamadas: 1, coberturaUsuarios: 0.1, taxaSucesso: 1,
      })),
      pessoas: Array.from({ length: 25 }, (_, i) => ({
        usuario: `p${i}`, chamadas: 1, diasAtivos: 1, ferramentasUsadas: 1, documentosEnviados: 0,
      })),
    });
    expect(ctx.blocos.find((b) => b.id === 'ferramentas')?.itens).toHaveLength(5);
    expect(ctx.blocos.find((b) => b.id === 'pessoas')?.itens).toHaveLength(10);
  });

  it('benefício medido entra na frente; sem cadastro o FTE fica null', () => {
    const ctx = contextoBoardFerramentas({
      ...base,
      beneficio: { horasLiberadas: 352, fte: 2, melhoriasMedidas: 3 },
    });
    expect(ctx.blocos[0]?.id).toBe('beneficio');
    expect(campo(ctx, 'beneficio', 'FTE')?.valor).toBe('2');
    expect(campo(ctx, 'beneficio', 'Demanda vs FTE')?.valor).toBeNull();
  });

  it('sem bloco de benefício quando a tela ainda não apurou', () => {
    expect(contextoBoardFerramentas(base).blocos.some((b) => b.id === 'beneficio')).toBe(false);
  });

  it('carrega escopo e pessoa nos filtros publicados', () => {
    const ctx = contextoBoardFerramentas({ ...base, escopo: 'PSA Norte', pessoa: 'ana@psa' });
    expect(ctx.filtros).toEqual({ periodo: 'tudo', escopo: 'PSA Norte', pessoa: 'ana@psa' });
    expect(ctx.blocos.find((b) => b.id === 'adocao')?.nota).toContain('PSA Norte');
    expect(ctx.blocos.find((b) => b.id === 'adocao')?.nota).toContain('ana@psa');
  });
});
