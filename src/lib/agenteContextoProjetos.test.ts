import { describe, it, expect } from 'vitest';
import {
  contextoBoardProjetos, rotuloMes, type EntradaContextoProjetos,
} from './agenteContextoProjetos';

/**
 * O que estes testes travam é a HONESTIDADE do snapshot desta tela, e um caso
 * concreto: em 25/08 a tela mostrava R$ 196.000.000 num único mês (jun/26)
 * contra centenas de milhares nos outros. O bloco mensal existe para que o
 * agente consiga responder "que mês foge do padrão" SEM estimar — daí a
 * mediana e o "N vezes a mediana" saírem calculados aqui, da mesma série que o
 * gráfico desenha.
 */
const base: EntradaContextoProjetos = {
  janela: '2026 · a partir de janeiro',
  filtros: {
    periodo: '2026-01-01|', cliente: null, tipo: null,
    categoria: null, centroCusto: null, empresa: null,
  },
  kpisClientes: {
    faturamento_total: 197_800_000,
    clientes_ativos: 46,
    clientes_ativos_fixos: 12,
    clientes_ativos_pontuais: 34,
    ticket_medio: 4_300_000,
    os_ativas: 58,
    contratos_30d: 2,
  },
  kpisOperacional: { contratos_30d: 2, contratos_vencidos: 1, novos_clientes_trimestre: 3 },
  kpisProjetos: {
    os_em_andamento: 21, os_total: 58,
    horas_estimadas: 4037.5, horas_realizadas: 3120, desvio_medio: -22.7,
  },
  valorSemData: 350_734,
  serieMensal: [
    { mes: '2026-01', faturamento: 253_467 },
    { mes: '2026-02', faturamento: 10_000 },
    { mes: '2026-03', faturamento: 193_319 },
    { mes: '2026-04', faturamento: 131_600 },
    { mes: '2026-05', faturamento: 290_000 },
    { mes: '2026-06', faturamento: 196_067_278 },
    { mes: '2026-07', faturamento: 435_582 },
  ],
  matriz: {
    meses: ['2026-01', '2026-06'],
    temSemData: true,
    linhas: [
      { id: 'cc1', label: 'PSA CONSULTORIA EMPRESARIAL', porMes: { '2026-01': 1200, '2026-06': 196_000_000 }, total: 196_885_519 },
      { id: 'cc2', label: 'PSA CONSULTORES', porMes: { '2026-01': 252_267 }, total: 1_207_460 },
      { id: 'cc3', label: 'PRADO ADV CIVIL', porMes: {}, total: 0 },
    ],
  },
  detalhe: 'centro_custo',
  status: [{ status: 'Em andamento', qtd: 21 }, { status: 'Concluído', qtd: 37 }],
  falhas: [],
};

const bloco = (ctx: ReturnType<typeof contextoBoardProjetos>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardProjetos>, blocoId: string, rotulo: string) =>
  bloco(ctx, blocoId)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardProjetos', () => {
  it('da a REGUA do que e normal, para o outlier nao depender de estimativa', () => {
    const ctx = contextoBoardProjetos(base);
    // Mediana de 7 valores = o 4o em ordem: 253.467
    expect(campo(ctx, 'mensal', 'Mediana mensal')?.valor).toBe('R$ 253 mil');
    const maior = campo(ctx, 'mensal', 'Maior mês');
    expect(maior?.valor).toBe('jun/26 · R$ 196,1 mi');
    expect(maior?.nota).toContain('x a mediana');
  });

  it('mediana zero nao vira divisao por zero', () => {
    const ctx = contextoBoardProjetos({
      ...base,
      serieMensal: [
        { mes: '2026-01', faturamento: 0 },
        { mes: '2026-02', faturamento: 0 },
        { mes: '2026-03', faturamento: 5000 },
      ],
    });
    expect(campo(ctx, 'mensal', 'Maior mês')?.nota).toBe('sem mediana para comparar');
  });

  it('sem serie mensal, o bloco nao entra vazio', () => {
    const ctx = contextoBoardProjetos({ ...base, serieMensal: [] });
    expect(bloco(ctx, 'mensal')).toBeUndefined();
  });

  it('o valor sem data aparece, e diz que esta no total mas fora do grafico', () => {
    const ctx = contextoBoardProjetos(base);
    const c = campo(ctx, 'visao_geral', 'Valor em OS sem data de início');
    expect(c?.valor).toBe('R$ 351 mil');
    expect(c?.nota).toContain('fora do gráfico mensal');
  });

  it('ticket medio nulo continua nulo, nunca zero', () => {
    const ctx = contextoBoardProjetos({
      ...base,
      kpisClientes: { ...base.kpisClientes, ticket_medio: null },
    });
    expect(campo(ctx, 'visao_geral', 'Ticket médio')?.valor).toBeNull();
  });

  it('desvio medio nulo continua nulo', () => {
    const ctx = contextoBoardProjetos({
      ...base,
      kpisProjetos: { ...base.kpisProjetos, desvio_medio: null },
    });
    expect(campo(ctx, 'execucao', 'Desvio médio entre estimado e realizado')?.valor).toBeNull();
  });

  it('linha zerada da matriz nao vira ruido no prompt', () => {
    const itens = bloco(contextoBoardProjetos(base), 'matriz')?.itens ?? [];
    expect(itens).toHaveLength(2);
    expect(itens.map((i) => i['centro de custo'])).not.toContain('PRADO ADV CIVIL');
  });

  it('cada linha da matriz nomeia o mes em que ela concentra', () => {
    const itens = bloco(contextoBoardProjetos(base), 'matriz')?.itens ?? [];
    const consultoria = itens.find((i) => i['centro de custo'] === 'PSA CONSULTORIA EMPRESARIAL');
    // Sem casa decimal: 196.000.000 / 1e6 da 196 exato, e `maximumFractionDigits`
    // nao inventa o ",0". O `196,1 mi` do teste acima vem de 196.067.278.
    expect(consultoria?.maior_mes).toBe('jun/26 · R$ 196 mi');
  });

  it('falha de consulta chega como aviso', () => {
    const ctx = contextoBoardProjetos({ ...base, falhas: ['contratos e clientes'] });
    expect(ctx.avisos).toEqual(['falha ao carregar: contratos e clientes']);
    expect(contextoBoardProjetos(base).avisos).toBeUndefined();
  });

  it('visao geral vem antes da matriz (o corte descarta o fim)', () => {
    const ordem = contextoBoardProjetos(base).blocos.map((b) => b.id);
    expect(ordem.indexOf('visao_geral')).toBeLessThan(ordem.indexOf('matriz'));
    expect(ordem.indexOf('mensal')).toBeLessThan(ordem.indexOf('matriz'));
  });

  it('rotuloMes fala como o eixo do grafico', () => {
    expect(rotuloMes('2026-06')).toBe('jun/26');
    expect(rotuloMes('2026-01')).toBe('jan/26');
    expect(rotuloMes('sem-data')).toBe('sem-data');
  });

  it('leitura de diretoria põe mix/caixa na frente e tira faturamento total', () => {
    const ctx = contextoBoardProjetos({
      ...base,
      leitura: {
        mix: {
          ativos: 12,
          iniciadasJanela: 3,
          iniciadasAnterior: 1,
          delta: 2,
          fatias: { cliente_novo: 1, aditivo: 2, entrega_planejada: 8, inclassificavel: 1 },
        },
        caixa: 2_400_000,
        horizonteSemFim: 4,
      },
    });
    expect(ctx.blocos[0]?.id).toBe('mix');
    expect(ctx.blocos.some((b) => b.id === 'visao_geral')).toBe(false);
    expect(campo(ctx, 'caixa', 'Caixa vigente')?.valor).toBe('R$ 2,4 mi');
  });
});
