import { describe, it, expect } from 'vitest';
import { contextoBoardEstrategico, type EntradaContextoBoard } from './agenteContextoBoard';

/**
 * O que estes testes travam não é layout: é HONESTIDADE do snapshot. O agente
 * responde exclusivamente sobre o que sai daqui, então "não apurado" virando
 * zero, ou uma falha de consulta que não chega como aviso, seria o agente
 * afirmando com convicção um número que ninguém mediu.
 */
const base: EntradaContextoBoard = {
  janelaReceita: '2026 até agosto',
  janelaExecucao: 'últimos 30 dias',
  filtros: { periodo: '30d', centroCusto: null, empresa: null },
  cicloAtivo: 'Ciclo 2026.1',
  receita: { atual: 4_100_000, anterior: 3_200_000, variacao: 28, meses: [], semData: 7, semDataValor: 418_000 },
  emRisco: {
    vencido: { qtd: 2, valor: 180_000, clientes: ['Alfa', 'Beta'] },
    renovacao: { qtd: 1, valor: 90_000, clientes: ['Gama'] },
  },
  concentracao: {
    total: 4_100_000,
    clientes: 12,
    top: [{ cliente_id: 'c1', nome: 'Alfa', receita: 1_500_000, share: 0.366, acumulado: 0.366 }],
    shareTop1: 0.366,
    shareTop5: 0.72,
    clientesParaMetade: 3,
  },
  clientesComReceita: 12,
  saude: { total: 40, emDia: 26, emRisco: 9, atrasados: 5, pontualidade: 65 },
  totalHoras: 1240,
  roi: { economiaMensal: 30_000, economiaAnual: 360_000, investimento: 0, roiPct: null, melhorias: 4 },
  areas: [
    { id: 'a1', label: 'Tax', projetos: 12, emDia: 8, emRisco: 3, atrasados: 1, pontualidade: 71, concluidas: 34, unidade: 'tarefas' },
    { id: 'a2', label: 'Digital', projetos: 4, emDia: 4, emRisco: 0, atrasados: 0, pontualidade: null, concluidas: 9, unidade: 'entregáveis' },
  ],
  alertas: [
    { id: 'al1', severidade: 'risco', titulo: 'Contrato vencido em andamento', detalhe: 'Alfa, desde março', valor: 180_000, rota: '/x' },
  ],
  projetosCriticos: [{ name: 'Recuperação PIS/COFINS', computed_status: 'atrasado', area_name: 'Tax' }],
  preenchimento: {
    osSemDataInicio: { comLacuna: 7, total: 119, nomes: ['OS 1042'] },
    clientesSemUf: { comLacuna: null, total: null, nomes: [] },
    clientesSemCategoria: { comLacuna: 3, total: 88, nomes: [] },
  },
  notas: { receita: 'Receita limitada aos clientes do seu acesso.' },
  falhas: [],
};

const campo = (ctx: ReturnType<typeof contextoBoardEstrategico>, blocoId: string, rotulo: string) =>
  ctx.blocos.find((b) => b.id === blocoId)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardEstrategico', () => {
  it('formata valor como a tela formata (Ctrl+F no número tem que achar)', () => {
    const ctx = contextoBoardEstrategico(base);
    expect(campo(ctx, 'receita', 'Receita do ano corrente')?.valor).toBe('R$ 4,1 mi');
    expect(campo(ctx, 'concentracao', 'Fatia do maior cliente')?.valor).toBe('36,6%');
  });

  it('mantem null onde o dado nao foi apurado, em vez de zero', () => {
    const ctx = contextoBoardEstrategico({ ...base, totalHoras: null });
    expect(campo(ctx, 'execucao', 'Horas alocadas no escopo')?.valor).toBeNull();
    // ROI sem investimento: a tela mostra "em construção", não 0%.
    expect(campo(ctx, 'roi', 'ROI')?.valor).toBeNull();
    // Lacuna com consulta indisponível não vira "0 de 0".
    expect(campo(ctx, 'preenchimento', 'Clientes sem UF')?.valor).toBeNull();
  });

  it('pontualidade nula de area nao virou 0% na linha', () => {
    const ctx = contextoBoardEstrategico(base);
    const linhas = ctx.blocos.find((b) => b.id === 'areas')?.itens ?? [];
    expect(linhas.find((l) => l.area === 'Digital')?.pontualidade).toBeNull();
    expect(linhas.find((l) => l.area === 'Tax')?.pontualidade).toBe('71%');
  });

  it('falha de consulta chega como aviso, nao desaparece', () => {
    const ctx = contextoBoardEstrategico({ ...base, falhas: ['contratos e clientes', 'equipe'] });
    expect(ctx.avisos).toEqual(['falha ao carregar: contratos e clientes, equipe']);
  });

  it('sem falha, nao inventa aviso', () => {
    expect(contextoBoardEstrategico(base).avisos).toBeUndefined();
  });

  it('cada bloco carrega a propria janela — o Estrategico tem duas', () => {
    const ctx = contextoBoardEstrategico(base);
    expect(ctx.blocos.find((b) => b.id === 'receita')?.janela).toBe('2026 até agosto');
    expect(ctx.blocos.find((b) => b.id === 'execucao')?.janela).toBe('últimos 30 dias');
  });

  it('decisao e receita vem antes de preenchimento (o corte descarta o fim)', () => {
    const ordem = contextoBoardEstrategico(base).blocos.map((b) => b.id);
    expect(ordem.indexOf('alertas')).toBe(0);
    expect(ordem.indexOf('receita')).toBeLessThan(ordem.indexOf('preenchimento'));
  });

  it('sem alerta, o bloco de decisao nao existe (nao entra vazio)', () => {
    const ctx = contextoBoardEstrategico({ ...base, alertas: [] });
    expect(ctx.blocos.some((b) => b.id === 'alertas')).toBe(false);
  });

  it('filtros nomeiam o recorte, inclusive quando é "todas"', () => {
    const ctx = contextoBoardEstrategico(base);
    expect(ctx.filtros.empresa).toBe('todas');
    expect(ctx.filtros['centro de custo']).toBe('todos');

    const recortado = contextoBoardEstrategico({
      ...base,
      filtros: { periodo: '90d', centroCusto: 'CC Fiscal', empresa: 'Grupo Alfa' },
    });
    expect(recortado.filtros.empresa).toBe('Grupo Alfa');
    expect(recortado.filtros['centro de custo']).toBe('CC Fiscal');
  });

  it('OS sem data viaja com contagem E valor (37% do total ficava escondido)', () => {
    const ctx = contextoBoardEstrategico(base);
    expect(campo(ctx, 'receita', 'OS sem data de início (fora da janela)')?.valor)
      .toBe('7 OS, R$ 418 mil');
  });
});
