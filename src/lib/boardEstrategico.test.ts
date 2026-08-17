import { describe, it, expect } from 'vitest';
import {
  concentracaoCarteira,
  ratearPorCentroCusto,
  receitaEmRisco,
  entregasEmRisco,
  carteiraDormindo,
  alertasEstrategicos,
  receitaAnoCorrente,
  serieReceitaComparada,
  ticketMedioAtivo,
  LIMITE_SHARE_TOP1,
} from './boardEstrategico';
import type { ClienteRow, OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';
import type { ResumoArea } from '@/lib/boardExecutivo';

const HOJE = '2026-08-17';

const os = (over: Partial<OsRow> & Pick<OsRow, 'os_id' | 'cliente_id' | 'faturamento'>): OsRow => ({
  numero_os: null,
  cliente_nome: `Cliente ${over.cliente_id}`,
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  servico_id: null,
  servico_nome: null,
  data_emissao: null,
  data_inicio: null,
  data_fim: null,
  situacao: 'em_andamento',
  situacao_label: 'Em andamento',
  status_contrato: 'Sem prazo',
  ...over,
});

const cliente = (over: Partial<ClienteRow> & Pick<ClienteRow, 'cliente_id'>): ClienteRow => ({
  cliente_nome: `Cliente ${over.cliente_id}`,
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  setor: null,
  uf: null,
  regiao: null,
  ativo: true,
  data_cadastro: '2025-01-01T00:00:00Z',
  faturamento_total: 0,
  ticket_medio: null,
  qtd_os_ativas: 0,
  qtd_contratos_vigentes: 0,
  qtd_contratos_vencidos: 0,
  qtd_contratos_30d: 0,
  ...over,
});

const projeto = (over: Partial<ProjetoRow> & Pick<ProjetoRow, 'projeto_id'>): ProjetoRow => ({
  projeto_nome: `Projeto ${over.projeto_id}`,
  status_projeto: 'active',
  status_projeto_label: 'Ativo',
  cliente_id: 'cli-1',
  cliente_nome: 'Cliente cli-1',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  area_nome: null,
  equipe_nome: null,
  responsavel_nome: null,
  os_id: 'os-1',
  numero_os: null,
  situacao_os: 'em_andamento',
  situacao_os_label: 'Em andamento',
  os_data_fim: null,
  valor_os: 0,
  horas_estimadas: 0,
  horas_realizadas: 0,
  desvio_pct: null,
  ...over,
});

const area = (over: Partial<ResumoArea> & Pick<ResumoArea, 'area'>): ResumoArea => ({
  label: over.area.toUpperCase(),
  projetos: 0,
  emDia: 0,
  emRisco: 0,
  atrasados: 0,
  pontualidade: null,
  concluidas: 0,
  ...over,
});

// ── ratearPorCentroCusto ───────────────────────────────────────────────

describe('ratearPorCentroCusto', () => {
  const linhas = [
    os({ os_id: 'a', cliente_id: 'c1', faturamento: 100_000 }),
    os({ os_id: 'b', cliente_id: 'c2', faturamento: 50_000 }),
  ];
  const rateio = new Map([
    ['a', [
      { id: 'cc-1', label: 'CC 1', percentual: 60 },
      { id: 'cc-2', label: 'CC 2', percentual: 40 },
    ]],
    ['b', [{ id: 'cc-2', label: 'CC 2', percentual: 100 }]],
  ]);

  it('sem centro escolhido, a coleção passa intacta', () => {
    expect(ratearPorCentroCusto(linhas, rateio, null)).toBe(linhas);
  });

  it('com centro, a OS entra pela fatia dele', () => {
    const r = ratearPorCentroCusto(linhas, rateio, 'cc-1');
    expect(r).toHaveLength(1);
    expect(r[0].faturamento).toBe(60_000);
  });

  it('OS sem fatia no centro some, em vez de entrar zerada', () => {
    const r = ratearPorCentroCusto(linhas, rateio, 'cc-1');
    expect(r.map((o) => o.os_id)).toEqual(['a']);
  });

  it('somar todos os centros devolve o valor cheio — nada some nem duplica', () => {
    const total = ['cc-1', 'cc-2'].reduce(
      (acc, cc) => acc + ratearPorCentroCusto(linhas, rateio, cc).reduce((s, o) => s + o.faturamento, 0),
      0,
    );
    expect(total).toBe(150_000);
  });

  it('não muta as linhas originais', () => {
    ratearPorCentroCusto(linhas, rateio, 'cc-1');
    expect(linhas[0].faturamento).toBe(100_000);
  });
});

// ── concentracaoCarteira ───────────────────────────────────────────────

describe('concentracaoCarteira', () => {
  it('agrupa por cliente, ordena por receita e acumula a fatia', () => {
    const c = concentracaoCarteira([
      os({ os_id: '1', cliente_id: 'a', faturamento: 100 }),
      os({ os_id: '2', cliente_id: 'a', faturamento: 500 }),
      os({ os_id: '3', cliente_id: 'b', faturamento: 300 }),
      os({ os_id: '4', cliente_id: 'c', faturamento: 100 }),
    ]);

    expect(c.total).toBe(1000);
    expect(c.top.map((t) => t.cliente_id)).toEqual(['a', 'b', 'c']);
    expect(c.top[0].share).toBeCloseTo(0.6);
    expect(c.top[1].acumulado).toBeCloseTo(0.9);
    expect(c.shareTop1).toBeCloseTo(0.6);
  });

  it('shareTop5 usa o acumulado real quando há menos de 5 clientes', () => {
    const c = concentracaoCarteira([
      os({ os_id: '1', cliente_id: 'a', faturamento: 700 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 300 }),
    ]);
    expect(c.shareTop5).toBeCloseTo(1);
  });

  it('clientesParaMetade conta quantos somam 50% da receita', () => {
    const c = concentracaoCarteira([
      os({ os_id: '1', cliente_id: 'a', faturamento: 400 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 300 }),
      os({ os_id: '3', cliente_id: 'c', faturamento: 300 }),
    ]);
    // a=40%, a+b=70% → dois clientes cruzam a metade.
    expect(c.clientesParaMetade).toBe(2);
  });

  it('sem receita devolve null nas fatias — nunca 0%', () => {
    const c = concentracaoCarteira([os({ os_id: '1', cliente_id: 'a', faturamento: 0 })]);
    expect(c.total).toBe(0);
    expect(c.shareTop1).toBeNull();
    expect(c.shareTop5).toBeNull();
    expect(c.clientesParaMetade).toBeNull();
    expect(c.top).toEqual([]);
  });

  it('respeita o limite de linhas do topo', () => {
    const linhas = Array.from({ length: 10 }, (_, i) =>
      os({ os_id: `${i}`, cliente_id: `cli-${i}`, faturamento: 100 - i }),
    );
    expect(concentracaoCarteira(linhas, 3).top).toHaveLength(3);
  });
});

// ── receitaEmRisco ─────────────────────────────────────────────────────

describe('receitaEmRisco', () => {
  it('conta vencido só com trabalho em andamento e ignora OS concluída', () => {
    const r = receitaEmRisco([
      os({ os_id: '1', cliente_id: 'a', faturamento: 1000, status_contrato: 'Vencido', situacao: 'em_andamento' }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 9000, status_contrato: 'Vencido', situacao: 'concluido' }),
      os({ os_id: '3', cliente_id: 'c', faturamento: 500, status_contrato: 'Vigente', situacao: 'em_andamento' }),
    ]);
    expect(r.vencido).toMatchObject({ qtd: 1, valor: 1000 });
    expect(r.vencido.clientes).toEqual(['Cliente a']);
  });

  it('renovação pega tudo que vence em 30 dias e não está concluído', () => {
    const r = receitaEmRisco([
      os({ os_id: '1', cliente_id: 'a', faturamento: 200, status_contrato: 'Vence em 30 dias', situacao: 'em_andamento' }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 800, status_contrato: 'Vence em 30 dias', situacao: 'suspenso' }),
      os({ os_id: '3', cliente_id: 'c', faturamento: 400, status_contrato: 'Vence em 30 dias', situacao: 'concluido' }),
    ]);
    expect(r.renovacao).toMatchObject({ qtd: 2, valor: 1000 });
    // Os maiores primeiro — a evidência nomeada segue o dinheiro.
    expect(r.renovacao.clientes).toEqual(['Cliente b', 'Cliente a']);
  });

  it('nomeia no máximo 3 clientes distintos', () => {
    const linhas = Array.from({ length: 6 }, (_, i) =>
      os({
        os_id: `${i}`, cliente_id: `cli-${i}`, faturamento: 100 - i,
        status_contrato: 'Vencido', situacao: 'em_andamento',
      }),
    );
    expect(receitaEmRisco(linhas).vencido.clientes).toHaveLength(3);
  });
});

// ── entregasEmRisco ────────────────────────────────────────────────────

describe('entregasEmRisco', () => {
  it('pega projeto ativo pouco avançado com contrato vencendo', () => {
    const r = entregasEmRisco(
      [
        projeto({
          projeto_id: 'p1', horas_estimadas: 100, horas_realizadas: 20,
          os_data_fim: '2026-08-25', valor_os: 50_000,
        }),
      ],
      HOJE,
    );
    expect(r).toHaveLength(1);
    expect(r[0].progresso).toBeCloseTo(0.2);
    expect(r[0].diasParaFim).toBe(8);
  });

  it('contrato já vencido devolve dias negativos', () => {
    const r = entregasEmRisco(
      [projeto({ projeto_id: 'p1', horas_estimadas: 10, horas_realizadas: 1, os_data_fim: '2026-08-07' })],
      HOJE,
    );
    expect(r[0].diasParaFim).toBe(-10);
  });

  it('ignora projeto adiantado, projeto não-ativo, sem horas e com contrato longe', () => {
    const r = entregasEmRisco(
      [
        projeto({ projeto_id: 'adiantado', horas_estimadas: 100, horas_realizadas: 90, os_data_fim: '2026-08-20' }),
        projeto({ projeto_id: 'pausado', status_projeto: 'on_hold', horas_estimadas: 100, horas_realizadas: 0, os_data_fim: '2026-08-20' }),
        projeto({ projeto_id: 'sem-horas', horas_estimadas: 0, horas_realizadas: 0, os_data_fim: '2026-08-20' }),
        projeto({ projeto_id: 'longe', horas_estimadas: 100, horas_realizadas: 0, os_data_fim: '2026-12-31' }),
        projeto({ projeto_id: 'sem-prazo', horas_estimadas: 100, horas_realizadas: 0, os_data_fim: null }),
      ],
      HOJE,
    );
    expect(r).toEqual([]);
  });

  it('ordena pelo valor da OS', () => {
    const base = { horas_estimadas: 100, horas_realizadas: 10, os_data_fim: '2026-08-20' };
    const r = entregasEmRisco(
      [
        projeto({ projeto_id: 'pequeno', valor_os: 1_000, ...base }),
        projeto({ projeto_id: 'grande', valor_os: 90_000, ...base }),
      ],
      HOJE,
    );
    expect(r.map((e) => e.projeto_id)).toEqual(['grande', 'pequeno']);
  });
});

// ── carteiraDormindo ───────────────────────────────────────────────────

describe('carteiraDormindo', () => {
  it('pega ativo, com histórico e sem OS em andamento', () => {
    const r = carteiraDormindo([
      cliente({ cliente_id: 'a', faturamento_total: 30_000, qtd_os_ativas: 0 }),
      cliente({ cliente_id: 'b', faturamento_total: 10_000, qtd_os_ativas: 2 }),
      cliente({ cliente_id: 'c', faturamento_total: 0, qtd_os_ativas: 0 }),
      cliente({ cliente_id: 'd', ativo: false, faturamento_total: 90_000, qtd_os_ativas: 0 }),
    ]);
    expect(r).toMatchObject({ qtd: 1, valorHistorico: 30_000 });
    expect(r.clientes).toEqual(['Cliente a']);
  });
});

// ── receitaAnoCorrente / serieReceitaComparada ─────────────────────────

describe('receitaAnoCorrente', () => {
  it('compara o ano corrente até o mês de hoje com os mesmos meses do anterior', () => {
    const r = receitaAnoCorrente(
      [
        os({ os_id: '1', cliente_id: 'a', faturamento: 100, data_inicio: '2026-03-10' }),
        os({ os_id: '2', cliente_id: 'a', faturamento: 50, data_inicio: '2026-08-01' }),
        os({ os_id: '3', cliente_id: 'a', faturamento: 60, data_inicio: '2025-03-10' }),
        // Dezembro do ano anterior está fora da janela jan–ago.
        os({ os_id: '4', cliente_id: 'a', faturamento: 999, data_inicio: '2025-12-10' }),
      ],
      HOJE,
    );
    expect(r.atual).toBe(150);
    expect(r.anterior).toBe(60);
    expect(r.variacao).toBeCloseTo(1.5);
    expect(r.meses).toHaveLength(8);
  });

  it('sem base no ano anterior a variação é null, não infinito', () => {
    const r = receitaAnoCorrente(
      [os({ os_id: '1', cliente_id: 'a', faturamento: 100, data_inicio: '2026-03-10' })],
      HOJE,
    );
    expect(r.variacao).toBeNull();
  });

  it('reporta OS sem data de início em vez de escondê-las', () => {
    const r = receitaAnoCorrente(
      [
        os({ os_id: '1', cliente_id: 'a', faturamento: 100, data_inicio: null }),
        os({ os_id: '2', cliente_id: 'a', faturamento: 100, data_inicio: '2026-02-01' }),
      ],
      HOJE,
    );
    expect(r.semData).toBe(1);
    expect(r.atual).toBe(100);
  });
});

describe('serieReceitaComparada', () => {
  it('devolve um ponto por mês decorrido, com o mesmo mês do ano anterior', () => {
    const serie = serieReceitaComparada(
      [
        os({ os_id: '1', cliente_id: 'a', faturamento: 100, data_inicio: '2026-02-10' }),
        os({ os_id: '2', cliente_id: 'a', faturamento: 40, data_inicio: '2025-02-10' }),
      ],
      HOJE,
    );
    expect(serie).toHaveLength(8);
    expect(serie[1]).toEqual({ mes: '2026-02', atual: 100, anterior: 40 });
    expect(serie[0]).toEqual({ mes: '2026-01', atual: 0, anterior: 0 });
  });
});

describe('ticketMedioAtivo', () => {
  it('média das OS em andamento', () => {
    const v = ticketMedioAtivo([
      os({ os_id: '1', cliente_id: 'a', faturamento: 100, situacao: 'em_andamento' }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 300, situacao: 'em_andamento' }),
      os({ os_id: '3', cliente_id: 'c', faturamento: 9999, situacao: 'concluido' }),
    ]);
    expect(v).toBe(200);
  });

  it('sem OS ativa é null, não zero', () => {
    expect(ticketMedioAtivo([os({ os_id: '1', cliente_id: 'a', faturamento: 100, situacao: 'concluido' })])).toBeNull();
  });
});

// ── alertasEstrategicos ────────────────────────────────────────────────

describe('alertasEstrategicos', () => {
  const vazio = { os: [], clientes: [], projetos: [], areas: [], hoje: HOJE };

  it('sem nada errado, não inventa alerta', () => {
    const r = alertasEstrategicos({ ...vazio, concentracao: concentracaoCarteira([]) });
    expect(r).toEqual([]);
  });

  it('ordena risco antes de atenção e, dentro do nível, pelo valor', () => {
    const linhas = [
      os({ os_id: '1', cliente_id: 'a', faturamento: 1_000, status_contrato: 'Vencido', situacao: 'em_andamento' }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 80_000, status_contrato: 'Vence em 30 dias', situacao: 'em_andamento' }),
    ];
    const r = alertasEstrategicos({
      ...vazio,
      os: linhas,
      // Concentração calculada sobre outro recorte (sem receita) para isolar o teste.
      concentracao: concentracaoCarteira([]),
    });
    expect(r.map((a) => a.id)).toEqual(['contrato-vencido', 'renovacao-30d']);
    expect(r[0].severidade).toBe('risco');
  });

  it('dispara concentração quando o maior cliente passa do limite', () => {
    const linhas = [
      os({ os_id: '1', cliente_id: 'a', faturamento: 900 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 100 }),
      os({ os_id: '3', cliente_id: 'c', faturamento: 60 }),
    ];
    const c = concentracaoCarteira(linhas);
    expect(c.shareTop1).toBeGreaterThan(LIMITE_SHARE_TOP1);
    const ids = alertasEstrategicos({ ...vazio, os: linhas, concentracao: c }).map((a) => a.id);
    expect(ids).toContain('concentracao-top1');
    // Top1 e top5 são o mesmo problema — só o mais grave aparece.
    expect(ids).not.toContain('concentracao-top5');
  });

  it('não mede concentração com menos de 3 clientes — o caso de filtrar por um cliente', () => {
    const linhas = [
      os({ os_id: '1', cliente_id: 'a', faturamento: 900 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 100 }),
    ];
    const c = concentracaoCarteira(linhas);
    expect(c.clientes).toBe(2);
    // O número continua correto — só não vira alerta.
    expect(c.shareTop1).toBeCloseTo(0.9);
    const ids = alertasEstrategicos({ ...vazio, os: linhas, concentracao: c }).map((a) => a.id);
    expect(ids).not.toContain('concentracao-top1');
    expect(ids).not.toContain('concentracao-top5');
  });

  it('cliente único no recorte não vira alerta de 100%', () => {
    const linhas = [os({ os_id: '1', cliente_id: 'a', faturamento: 500 })];
    const c = concentracaoCarteira(linhas);
    expect(c.shareTop1).toBe(1);
    expect(alertasEstrategicos({ ...vazio, os: linhas, concentracao: c })).toEqual([]);
  });

  it('carteira dormindo entra sem valor para não dominar a ordenação', () => {
    const r = alertasEstrategicos({
      ...vazio,
      clientes: [cliente({ cliente_id: 'a', faturamento_total: 5_000_000, qtd_os_ativas: 0 })],
      concentracao: concentracaoCarteira([]),
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'carteira-dormindo', valor: null });
  });

  it('área abaixo da meta vira alerta; área sem entrega no período, não', () => {
    const r = alertasEstrategicos({
      ...vazio,
      concentracao: concentracaoCarteira([]),
      areas: [
        area({ area: 'tax', pontualidade: 60, concluidas: 10, atrasados: 2 }),
        area({ area: 'osg', pontualidade: 95, concluidas: 10 }),
        area({ area: 'dev', pontualidade: 10, concluidas: 0 }),
        area({ area: 'outros', pontualidade: null, concluidas: 5 }),
      ],
    });
    expect(r.map((a) => a.id)).toEqual(['pontualidade-tax']);
  });
});
