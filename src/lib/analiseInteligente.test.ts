import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALISE_INTELIGENTE_ALL,
  buildAnaliseInteligenteKpis,
  buildAnaliseInteligenteRequestPayload,
  buildDailysPorSemana,
  buildEntregasPorSemana,
  buildHorasPorSprint,
  buildStatusData,
  filterAnaliseInteligenteData,
  type AnaliseInteligenteAnalysis,
  type AnaliseInteligenteData,
  type AnaliseInteligenteDeliverable,
  type AnaliseInteligenteFilters,
  type AnaliseInteligenteKpis,
} from '@/lib/analiseInteligente';
import {
  exportAnaliseInteligentePdf,
  loadAnaliseInteligenteLogo,
} from '@/lib/analiseInteligenteExport';

const ALL = ANALISE_INTELIGENTE_ALL;
const filters = (
  overrides: Partial<AnaliseInteligenteFilters> = {},
): AnaliseInteligenteFilters => ({
  startDate: '',
  endDate: '',
  sprintFilter: ALL,
  projectFilter: ALL,
  processFilter: ALL,
  ...overrides,
});

const deliverable = (
  id: string,
  overrides: Partial<AnaliseInteligenteDeliverable> = {},
): AnaliseInteligenteDeliverable => ({
  id,
  sprint_id: 'sprint-1',
  project_id: 'project-1',
  process_id: 'process-1',
  status: 'pending',
  due_date: '2026-07-10',
  estimated_hours: 0,
  completed_at: null,
  created_at: '2026-07-01T00:00:00Z',
  assigned_to: null,
  ...overrides,
});

const baseData = (): AnaliseInteligenteData => ({
  sprints: [
    {
      id: 'sprint-1',
      name: 'Sprint principal',
      project_id: 'project-1',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      status: 'active',
    },
  ],
  projects: [{ id: 'project-1', name: 'Projeto' }],
  processes: [{ id: 'process-1', name: 'Processo', area: 'Fiscal', project_id: 'project-1' }],
  deliverables: [],
  dailys: [],
  improvements: [],
});

const emptyKpis: AnaliseInteligenteKpis = {
  totalSprints: 0,
  activeSprints: 0,
  completedSprints: 0,
  totalDel: 0,
  completed: 0,
  inProgress: 0,
  pending: 0,
  overdue: 0,
  rate: 0,
  hours: 0,
  totalDailys: 0,
  blockers: 0,
  savings: 0,
  timeSaved: 0,
  extraCost: 0,
  scopeCreep: 0,
  score: 75,
};

describe('filtros e payload da análise inteligente', () => {
  it('considera sprints que apenas sobrepõem o período e exclui as totalmente externas', () => {
    const data = baseData();
    data.sprints.push(
      {
        id: 'before',
        name: 'Antes',
        project_id: 'project-1',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        status: 'completed',
      },
      {
        id: 'after',
        name: 'Depois',
        project_id: 'project-1',
        start_date: '2026-08-01',
        end_date: '2026-08-31',
        status: 'planned',
      },
      {
        id: 'overlap-start',
        name: 'Cruza início',
        project_id: 'project-1',
        start_date: '2026-06-20',
        end_date: '2026-07-05',
        status: 'active',
      },
      {
        id: 'overlap-end',
        name: 'Cruza fim',
        project_id: 'project-1',
        start_date: '2026-07-25',
        end_date: '2026-08-05',
        status: 'active',
      },
    );

    const result = filterAnaliseInteligenteData(
      data,
      filters({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    );

    expect(result.sprintsF.map(({ id }) => id)).toEqual([
      'sprint-1',
      'overlap-start',
      'overlap-end',
    ]);
  });

  it('mantém item sem sprint pelo vencimento dentro da janela de datas', () => {
    const data = baseData();
    data.deliverables = [
      deliverable('unsprinted', { sprint_id: null, due_date: '2026-07-12' }),
      deliverable('outside', { sprint_id: null, due_date: '2026-08-01' }),
    ];

    const result = filterAnaliseInteligenteData(
      data,
      filters({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    );

    expect(result.deliverablesF.map(({ id }) => id)).toEqual(['unsprinted']);
  });

  it('converte somente filtros específicos no payload da Edge Function', () => {
    expect(
      buildAnaliseInteligenteRequestPayload(
        filters({
          startDate: '2026-07-01',
          sprintFilter: 'sprint-1',
          processFilter: 'process-1',
        }),
      ),
    ).toEqual({
      start_date: '2026-07-01',
      end_date: null,
      sprint_id: 'sprint-1',
      project_id: null,
      process_id: 'process-1',
      category: null,
    });
  });
});

describe('KPIs', () => {
  it('produz score vazio 75', () => {
    expect(
      buildAnaliseInteligenteKpis(
        { sprintsF: [], deliverablesF: [], dailysF: [] },
        [],
        '2026-07-17',
      ),
    ).toMatchObject({ totalDel: 0, rate: 0, overdue: 0, score: 75 });
  });

  it('calcula atraso, gasto, bloqueios, scope creep e economias somente vinculadas', () => {
    const data = baseData();
    data.deliverables = [
      deliverable('late', {
        due_date: '2026-07-16',
        estimated_hours: 5,
        created_at: '2026-07-03T00:00:01Z',
      }),
      deliverable('done', {
        status: 'completed',
        due_date: '2026-07-01',
        estimated_hours: 3,
        created_at: '2026-07-02T00:00:00Z',
      }),
      deliverable('today', { status: 'in_progress', due_date: '2026-07-17', created_at: null }),
    ];
    data.dailys = [
      {
        id: 'd1',
        date: '2026-07-10',
        sprint_id: 'sprint-1',
        project_id: 'project-1',
        process_id: 'process-1',
        blockers: ' impedimento ',
        user_id: 'u1',
      },
      {
        id: 'd2',
        date: '2026-07-11',
        sprint_id: 'sprint-1',
        project_id: 'project-1',
        process_id: 'process-1',
        blockers: '   ',
        user_id: 'u1',
      },
    ];
    const filtered = filterAnaliseInteligenteData(data, filters());

    const result = buildAnaliseInteligenteKpis(
      filtered,
      [
        {
          sprint_deliverable_id: 'late',
          cost_saved_monthly: 1200,
          time_saved_hours: 4,
          evaluation_status: 'completed',
        },
        {
          sprint_deliverable_id: 'not-visible',
          cost_saved_monthly: 9999,
          time_saved_hours: 99,
          evaluation_status: 'completed',
        },
      ],
      '2026-07-17',
    );

    expect(result).toMatchObject({
      totalDel: 3,
      completed: 1,
      inProgress: 1,
      pending: 1,
      overdue: 1,
      rate: 33,
      hours: 8,
      blockers: 1,
      scopeCreep: 1,
      savings: 1200,
      timeSaved: 4,
      extraCost: 600,
    });
  });
});

describe('semântica das séries dos gráficos', () => {
  it('agrupa entregas pela conclusão quando presente, pelo vencimento caso contrário, e limita às 12 semanas finais', () => {
    const items = Array.from({ length: 13 }, (_, index) =>
      deliverable(`d-${index}`, {
        due_date: new Date(Date.UTC(2026, 0, 2 + index * 7)).toISOString().split('T')[0],
      }),
    );
    items.push(
      deliverable('completed', {
        status: 'completed',
        due_date: '2026-01-01',
        completed_at: '2026-12-30T10:00:00Z',
      }),
    );

    const result = buildEntregasPorSemana(items);

    expect(result).toHaveLength(12);
    expect(result.at(-1)).toMatchObject({ concluidas: 1 });
    expect(result.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(12);
  });

  it('agrupa dailys e conta apenas bloqueios não vazios', () => {
    const result = buildDailysPorSemana([
      {
        id: '1',
        date: '2026-07-13',
        sprint_id: null,
        project_id: null,
        process_id: null,
        blockers: 'A',
        user_id: 'u',
      },
      {
        id: '2',
        date: '2026-07-14',
        sprint_id: null,
        project_id: null,
        process_id: null,
        blockers: '  ',
        user_id: 'u',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ dailys: 2, bloqueios: 1 });
  });

  it('remove status zerados e limita horas aos oito primeiros sprints, truncando nomes', () => {
    const sprintsF = Array.from({ length: 9 }, (_, index) => ({
      id: `s${index}`,
      name: index === 0 ? 'Nome de sprint muito extenso' : `Sprint ${index}`,
      project_id: null,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: null,
    }));
    const horas = buildHorasPorSprint({
      sprintsF,
      deliverablesF: [deliverable('h', { sprint_id: 's0', estimated_hours: 2.6 })],
      dailysF: [],
    });

    expect(horas).toHaveLength(8);
    expect(horas[0]).toEqual({ sprint: 'Nome de sprint mui…', horas: 3 });
    expect(buildStatusData({ ...emptyKpis, completed: 2, overdue: 1 })).toEqual([
      expect.objectContaining({ name: 'Concluído', value: 2 }),
      expect.objectContaining({ name: 'Atrasado', value: 1, color: '#ef4444' }),
    ]);
  });
});

describe('exportação', () => {
  const analysis: AnaliseInteligenteAnalysis = {
    sintese_executiva: 'Síntese',
    evolucao_entregas: 'Evolução',
    tempo_vs_resultado: 'Tempo',
    saudabilidade_sprint: 'Saúde',
    aderencia_escopo: 'Escopo',
    gastos_extras: 'Gastos',
    riscos: ['r1', 'r2', 'r3', 'r4', 'r5'],
    oportunidades: ['o1', 'o2', 'o3', 'o4', 'o5'],
    recomendacoes: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
    nivel_risco: 'medio',
    score_saude: 70,
  };

  beforeEach(() => vi.restoreAllMocks());

  it('retorna false sem popup e não tenta escrever', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(
      exportAnaliseInteligentePdf({
        analise: null,
        kpis: emptyKpis,
        logoBase64: '',
        startDate: '',
        endDate: '',
        scoreBg: '#fff',
      }),
    ).toBe(false);
  });

  it('escreve HTML com período/logo e respeita limites das listas antes de fechar o popup', () => {
    const write = vi.fn();
    const close = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { write, close } } as unknown as Window);

    expect(
      exportAnaliseInteligentePdf({
        analise: analysis,
        kpis: { ...emptyKpis, score: 70 },
        logoBase64: 'data:image/png;base64,logo',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        scoreBg: '#f59e0b',
      }),
    ).toBe(true);

    const html = String(write.mock.calls[0][0]);
    expect(html).toContain('Período: 2026-07-01 a 2026-07-31');
    expect(html).toContain('<img src="data:image/png;base64,logo"');
    expect(html).toContain('<li>r4</li>');
    expect(html).not.toContain('<li>r5</li>');
    expect(html).not.toContain('<li>o5</li>');
    expect(html).toContain('<li>a5</li>');
    expect(html).not.toContain('<li>a6</li>');
    expect(html).toContain('window.print()');
    expect(close).toHaveBeenCalledOnce();
  });

  it('usa período padrão sem análise e converte o logo carregado para data URL', async () => {
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close: vi.fn() },
    } as unknown as Window);
    exportAnaliseInteligentePdf({
      analise: null,
      kpis: emptyKpis,
      logoBase64: '',
      startDate: '',
      endDate: '',
      scoreBg: '#fff',
    });
    expect(String(write.mock.calls[0][0])).toContain('Período: Início a Hoje');
    expect(String(write.mock.calls[0][0])).toContain('Clique em "Gerar Análise IA"');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob(['logo'])) }),
    );
    const loaded = new Promise<string>((resolve) => {
      void loadAnaliseInteligenteLogo(resolve);
    });
    await expect(loaded).resolves.toMatch(/^data:/);
    vi.unstubAllGlobals();
  });
});
