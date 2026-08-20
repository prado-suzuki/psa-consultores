import { describe, it, expect } from 'vitest';
import {
  classificarArea,
  filtrarPorCluster,
  filtrarTarefasPorProjetos,
  saudeProjetos,
  granularidadePara,
  serieTarefasPorArea,
  consolidarRoi,
  serieRoiAcumulado,
  resumoPorArea,
  entregaNoPrazo,
  construirMapaDeClusters,
  bucketDoItem,
  mesclarResumoArea,
  type MelhoriaRoi,
  type ProjetoResumo,
  type ResumoArea,
  type TarefaConcluida,
} from './boardExecutivo';

const projetos: ProjetoResumo[] = [
  { id: 'p1', area_name: 'Tax', computed_status: 'em_dia' },
  { id: 'p2', area_name: 'Fiscal', computed_status: 'atrasado' },
  { id: 'p3', area_name: 'OSG Projects', computed_status: 'em_dia' },
  { id: 'p4', area_name: 'Digital', computed_status: 'em_risco' },
  { id: 'p5', area_name: 'Controladoria', computed_status: 'em_dia' },
  { id: 'p6', area_name: null, computed_status: 'atrasado' },
];

describe('classificarArea', () => {
  it('reconhece os apelidos de cada área', () => {
    expect(classificarArea('Tax')).toBe('tax');
    expect(classificarArea('Fiscal / Tributário')).toBe('tax');
    expect(classificarArea('OSG')).toBe('osg');
    expect(classificarArea('Societário')).toBe('osg');
    expect(classificarArea('Dev')).toBe('dev');
    expect(classificarArea('Digital')).toBe('dev');
  });

  it('NÃO joga área desconhecida em Tax — vira "outros"', () => {
    expect(classificarArea('Controladoria')).toBe('outros');
    expect(classificarArea('')).toBe('outros');
    expect(classificarArea(null)).toBe('outros');
    expect(classificarArea(undefined)).toBe('outros');
  });
});

describe('filtrarPorCluster', () => {
  const linhas = [
    { id: 'a', cluster_id: 'c1' },
    { id: 'b', cluster_id: 'c2' },
    { id: 'c', cluster_id: 'c1' },
    { id: 'd', cluster_id: null },
  ];

  it('sem cliente selecionado passa a coleção inteira', () => {
    expect(filtrarPorCluster(linhas, '')).toHaveLength(4);
  });

  it('filtra pelo ID do cluster', () => {
    expect(filtrarPorCluster(linhas, 'c1').map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('linha sem cluster fica de fora com filtro ativo — "não sei de quem é" não vira "é deste"', () => {
    expect(filtrarPorCluster(linhas, 'c2').map((l) => l.id)).toEqual(['b']);
  });

  it('cluster inexistente devolve vazio, não a coleção inteira', () => {
    expect(filtrarPorCluster(linhas, 'nao-existe')).toEqual([]);
  });
});

describe('filtrarTarefasPorProjetos', () => {
  const tarefas = [
    { project_id: 'p1', nome: 't1' },
    { project_id: 'p2', nome: 't2' },
    { project_id: 'p1', nome: 't3' },
    { project_id: null, nome: 'orfa' },
  ];

  it('mantém só as tarefas dos projetos informados', () => {
    expect(filtrarTarefasPorProjetos(tarefas, [{ id: 'p1' }]).map((t) => t.nome))
      .toEqual(['t1', 't3']);
  });

  it('tarefa sem projeto fica de fora — cairia em "Outros" e inflaria a linha', () => {
    expect(filtrarTarefasPorProjetos(tarefas, [{ id: 'p1' }, { id: 'p2' }]))
      .toHaveLength(3);
  });

  it('nenhum projeto no recorte devolve nenhuma tarefa', () => {
    expect(filtrarTarefasPorProjetos(tarefas, [])).toEqual([]);
  });
});

describe('saudeProjetos', () => {
  it('conta status e calcula pontualidade', () => {
    expect(saudeProjetos(projetos)).toEqual({
      total: 6, emDia: 3, emRisco: 1, atrasados: 2, pontualidade: 50,
    });
  });

  it('escopo vazio não divide por zero', () => {
    expect(saudeProjetos([])).toEqual({
      total: 0, emDia: 0, emRisco: 0, atrasados: 0, pontualidade: 0,
    });
  });

  it('acompanha o recorte da tela (pontualidade do escopo, não global)', () => {
    const bucket = (a: string) => projetos.filter((p) => bucketDoItem(p) === a);
    expect(saudeProjetos(bucket('tax')).pontualidade).toBe(50);
    expect(saudeProjetos(bucket('osg')).pontualidade).toBe(100);
  });
});

describe('granularidadePara', () => {
  it('janela curta vira semana; longa vira mês', () => {
    expect(granularidadePara(7)).toBe('semana');
    expect(granularidadePara(30)).toBe('semana');
    expect(granularidadePara(45)).toBe('semana');
    expect(granularidadePara(90)).toBe('mes');
  });
});

describe('serieTarefasPorArea', () => {
  const tarefas: TarefaConcluida[] = [
    // fora de ordem de propósito: o Postgres não garante ordem
    { updated_at: '2026-07-10T12:00:00Z', project_id: 'p3' },
    { updated_at: '2026-05-05T12:00:00Z', project_id: 'p1' },
    { updated_at: '2026-06-02T12:00:00Z', project_id: 'p4' },
    { updated_at: '2026-05-20T12:00:00Z', project_id: 'p5' },
    { updated_at: '2026-06-15T12:00:00Z', project_id: null },
  ];

  it('ordena cronologicamente mesmo com linhas desordenadas', () => {
    const serie = serieTarefasPorArea(tarefas, projetos, 'mes');
    expect(serie.map((p) => p.name)).toEqual(['05/26', '06/26', '07/26']);
  });

  it('separa por área e manda desconhecido para "outros"', () => {
    const serie = serieTarefasPorArea(tarefas, projetos, 'mes');
    expect(serie[0]).toEqual({ name: '05/26', tax: 1, osg: 0, dev: 0, outros: 1 });
    expect(serie[1]).toEqual({ name: '06/26', tax: 0, osg: 0, dev: 1, outros: 1 });
    expect(serie[2]).toEqual({ name: '07/26', tax: 0, osg: 1, dev: 0, outros: 0 });
  });

  it('agrupa por semana quando pedido', () => {
    const serie = serieTarefasPorArea(
      [
        { updated_at: '2026-07-14T10:00:00Z', project_id: 'p1' },
        { updated_at: '2026-07-15T10:00:00Z', project_id: 'p1' },
        { updated_at: '2026-07-21T10:00:00Z', project_id: 'p1' },
      ],
      projetos,
      'semana',
    );
    expect(serie).toHaveLength(2);
    expect(serie[0].tax).toBe(2);
    expect(serie[1].tax).toBe(1);
  });

  it('ignora data inválida ou ausente em vez de quebrar', () => {
    const serie = serieTarefasPorArea(
      [
        { updated_at: '', project_id: 'p1' },
        { updated_at: 'não é data', project_id: 'p1' },
        { updated_at: '2026-07-10T12:00:00Z', project_id: 'p1' },
      ],
      projetos,
      'mes',
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].tax).toBe(1);
  });

  it('sem tarefas devolve série vazia (a UI mostra estado vazio)', () => {
    expect(serieTarefasPorArea([], projetos, 'mes')).toEqual([]);
  });
});

describe('consolidarRoi', () => {
  const melhorias: MelhoriaRoi[] = [
    { id: 'm1', cost_saved_monthly: 1000, implementation_cost: 6000, one_time_external_cost: 0, created_at: '2026-01-10T00:00:00Z' },
    { id: 'm2', cost_saved_monthly: 500, implementation_cost: 0, one_time_external_cost: 6000, created_at: '2026-03-10T00:00:00Z' },
  ];

  it('soma economia mensal e anualiza', () => {
    const roi = consolidarRoi(melhorias);
    expect(roi.economiaMensal).toBe(1500);
    expect(roi.economiaAnual).toBe(18000);
    expect(roi.melhorias).toBe(2);
  });

  it('soma investimento de implantação e custo externo', () => {
    expect(consolidarRoi(melhorias).investimento).toBe(12000);
  });

  it('ROI = economia anual ÷ investimento', () => {
    expect(consolidarRoi(melhorias).roiPct).toBeCloseTo(150, 5);
  });

  it('sem investimento cadastrado o ROI é null — nunca um % inventado', () => {
    const roi = consolidarRoi([
      { id: 'm1', cost_saved_monthly: 1000, implementation_cost: null, one_time_external_cost: null, created_at: null },
    ]);
    expect(roi.economiaAnual).toBe(12000);
    expect(roi.roiPct).toBeNull();
  });

  it('lista vazia zera tudo sem NaN', () => {
    const roi = consolidarRoi([]);
    expect(roi).toEqual({
      economiaMensal: 0, economiaAnual: 0, investimento: 0, roiPct: null, melhorias: 0,
    });
  });

  it('nulos não viram NaN', () => {
    const roi = consolidarRoi([
      { id: 'm1', cost_saved_monthly: null, implementation_cost: null, one_time_external_cost: null, created_at: null },
    ]);
    expect(roi.economiaAnual).toBe(0);
    expect(Number.isNaN(roi.economiaAnual)).toBe(false);
  });
});

describe('serieRoiAcumulado', () => {
  it('acumula em ordem de criação', () => {
    const serie = serieRoiAcumulado([
      { id: 'm2', cost_saved_monthly: 500, implementation_cost: null, one_time_external_cost: null, created_at: '2026-03-10T00:00:00Z' },
      { id: 'm1', cost_saved_monthly: 1000, implementation_cost: null, one_time_external_cost: null, created_at: '2026-01-10T00:00:00Z' },
    ]);
    expect(serie).toEqual([
      { name: '01/26', value: 12000 },
      { name: '03/26', value: 18000 },
    ]);
  });

  it('descarta melhoria sem data (não dá para posicionar no tempo)', () => {
    expect(serieRoiAcumulado([
      { id: 'm1', cost_saved_monthly: 1000, implementation_cost: null, one_time_external_cost: null, created_at: null },
    ])).toEqual([]);
  });
});

describe('resumoPorArea', () => {
  const tarefas: TarefaConcluida[] = [
    { updated_at: '2026-07-01T12:00:00Z', project_id: 'p1', due_date: '2026-07-05' }, // no prazo
    { updated_at: '2026-07-09T12:00:00Z', project_id: 'p2', due_date: '2026-07-05' }, // atrasada
    { updated_at: '2026-07-03T12:00:00Z', project_id: 'p3', due_date: '2026-07-03' }, // no próprio dia
  ];

  it('uma linha por área com projetos ou entregas', () => {
    const resumo = resumoPorArea(projetos, tarefas);
    expect(resumo.map((r) => r.area)).toEqual(['tax', 'osg', 'dev', 'outros']);
  });

  it('consolida status dos projetos e entregas da área', () => {
    const tax = resumoPorArea(projetos, tarefas).find((r) => r.area === 'tax');
    // p1 e p2 são Tax: uma entrega no prazo, uma atrasada → 50%.
    expect(tax).toMatchObject({
      label: 'Tax', projetos: 2, emDia: 1, atrasados: 1, concluidas: 2, comPrazo: 2, pontualidade: 50,
    });
  });

  it('pontualidade mede ENTREGAS no prazo, não projetos em dia', () => {
    // p3 (OSG) tem 1 projeto em dia e 1 entrega no próprio dia do prazo.
    const osg = resumoPorArea(projetos, tarefas).find((r) => r.area === 'osg');
    expect(osg).toMatchObject({ projetos: 1, emDia: 1, concluidas: 1, pontualidade: 100 });
  });

  it('entrega sem prazo conta como entrega, mas fica fora da pontualidade', () => {
    const resumo = resumoPorArea(projetos, [
      { updated_at: '2026-07-01T12:00:00Z', project_id: 'p1', due_date: null },
    ]);
    const tax = resumo.find((r) => r.area === 'tax');
    expect(tax).toMatchObject({ concluidas: 1, comPrazo: 0, pontualidade: null });
  });

  it('sem entrega com prazo a pontualidade é null — nunca 0%', () => {
    const resumo = resumoPorArea(projetos, []);
    expect(resumo.every((r) => r.pontualidade === null)).toBe(true);
  });

  it('omite área sem projeto e sem entrega', () => {
    const somenteTax: ProjetoResumo[] = [{ id: 'p1', area_name: 'Tax', computed_status: 'em_dia' }];
    const resumo = resumoPorArea(somenteTax, []);
    expect(resumo).toHaveLength(1);
    expect(resumo[0].area).toBe('tax');
  });

  it('escopo vazio devolve lista vazia', () => {
    expect(resumoPorArea([], [])).toEqual([]);
  });
});

describe('construirMapaDeClusters', () => {
  it('usa page_categories como fonte canônica — imune ao nome da área', () => {
    const { bucketDoCluster, bucketDaArea } = construirMapaDeClusters({
      areas: [{ id: 'a1', name: 'Núcleo Alfa', cluster_id: 'c-tax', page_categories: ['tax'] }],
    });
    expect(bucketDaArea.get('a1')).toBe('tax');
    expect(bucketDoCluster.get('c-tax')).toBe('tax');
  });

  // ── O caso real que motivou a remoção do palpite por nome ────────────────
  // `TAX LEGAL` é área ATIVA do cluster **Prado Advogados** e não declara
  // `page_categories`. Enquanto o mapa caía no nome, o "tax" do nome fazia o
  // Prado inteiro ser contado como Tax. Área sem categoria declarada não
  // classifica mais nada — nem a si, nem o cluster dela.
  it('área sem page_categories fica fora do mapa, mesmo com nome que casaria', () => {
    const { bucketDoCluster, bucketDaArea } = construirMapaDeClusters({
      areas: [{ id: 'a1', name: 'TAX LEGAL', cluster_id: 'c-prado', page_categories: null }],
    });
    expect(bucketDaArea.has('a1')).toBe(false);
    expect(bucketDoCluster.has('c-prado')).toBe(false);
  });

  it('page_categories vazio conta como não declarado', () => {
    const { bucketDaArea } = construirMapaDeClusters({
      areas: [{ id: 'a1', name: 'Societário', cluster_id: 'c-osg', page_categories: [] }],
    });
    expect(bucketDaArea.has('a1')).toBe(false);
  });

  it('irmã sem categoria não interfere na que declara', () => {
    const { bucketDoCluster, bucketDaArea } = construirMapaDeClusters({
      areas: [
        { id: 'a1', name: 'Digital interno', cluster_id: 'c-tax', page_categories: null },
        { id: 'a2', name: 'Fiscal', cluster_id: 'c-tax', page_categories: ['tax'] },
      ],
    });
    expect(bucketDoCluster.get('c-tax')).toBe('tax');
    expect(bucketDaArea.has('a1')).toBe(false);
  });

  it('entrada vazia não quebra', () => {
    const { bucketDoCluster, bucketDaArea } = construirMapaDeClusters({ areas: [] });
    expect(bucketDoCluster.size).toBe(0);
    expect(bucketDaArea.size).toBe(0);
  });
});

describe('bucketDoItem', () => {
  it('area_key resolvida por cluster vence o palpite pelo nome', () => {
    expect(bucketDoItem({ area_name: 'Controladoria', area_key: 'tax' })).toBe('tax');
  });

  it('sem area_key cai na classificação pelo nome', () => {
    expect(bucketDoItem({ area_name: 'Societário' })).toBe('osg');
  });

  it('sem nada vira outros', () => {
    expect(bucketDoItem({ area_name: null, area_key: null })).toBe('outros');
  });

  it('a chave resolvida vence o palpite pelo nome', () => {
    const itens = [
      { area_name: null, area_key: 'tax' as const },
      { area_name: 'Tax', area_key: null },
      { area_name: null, area_key: null },
    ];
    expect(itens.filter((i) => bucketDoItem(i) === 'tax')).toHaveLength(2);
    expect(itens.filter((i) => bucketDoItem(i) === 'outros')).toHaveLength(1);
  });
});

describe('entregaNoPrazo', () => {
  it('entregar no próprio dia do prazo é no prazo', () => {
    expect(entregaNoPrazo('2026-07-10T12:00:00Z', '2026-07-10')).toBe(true);
  });

  it('entregar depois do prazo é atraso', () => {
    expect(entregaNoPrazo('2026-07-11T12:00:00Z', '2026-07-10')).toBe(false);
  });

  it('22h de Brasília ainda é o mesmo dia (não vira atraso pelo fuso UTC)', () => {
    // 2026-07-11T01:00Z = 2026-07-10 22:00 em São Paulo. Comparar a string ISO
    // crua marcaria atraso; a comparação por dia-calendário local não.
    expect(entregaNoPrazo('2026-07-11T01:00:00Z', '2026-07-10')).toBe(true);
  });

  it('prazo com hora é comparado só pela data', () => {
    expect(entregaNoPrazo('2026-07-10T12:00:00Z', '2026-07-10T00:00:00Z')).toBe(true);
  });

  it('data de conclusão inválida não é no prazo', () => {
    expect(entregaNoPrazo('não é data', '2026-07-10')).toBe(false);
  });
});

describe('mesclarResumoArea', () => {
  const linha = (over: Partial<ResumoArea>): ResumoArea => ({
    area: 'dev', label: 'Dev', projetos: 0, emDia: 0, emRisco: 0, atrasados: 0,
    pontualidade: null, concluidas: 0, ...over,
  });

  it('soma contagens das duas fontes', () => {
    const r = mesclarResumoArea(
      linha({ projetos: 2, emDia: 1, atrasados: 1, concluidas: 10 }),
      linha({ projetos: 3, emDia: 3, concluidas: 5 }),
    );
    expect(r).toMatchObject({ projetos: 5, emDia: 4, atrasados: 1, concluidas: 15 });
  });

  it('pontualidade é média ponderada pela base de cada lado', () => {
    const r = mesclarResumoArea(
      linha({ pontualidade: 100, comPrazo: 10, concluidas: 10 }),
      linha({ pontualidade: 50, comPrazo: 10, concluidas: 10 }),
    );
    expect(r.pontualidade).toBe(75);
    expect(r.comPrazo).toBe(20);
  });

  it('base desigual pesa mais o lado com mais entregas', () => {
    const r = mesclarResumoArea(
      linha({ pontualidade: 100, comPrazo: 90, concluidas: 90 }),
      linha({ pontualidade: 0, comPrazo: 10, concluidas: 10 }),
    );
    expect(r.pontualidade).toBe(90);
  });

  it('usa `concluidas` como base quando a fonte não expõe `comPrazo`', () => {
    const r = mesclarResumoArea(
      linha({ pontualidade: 80, concluidas: 5 }),
      linha({ pontualidade: null, concluidas: 7 }),
    );
    // O lado sem pontualidade não tem base: não dilui o número do outro.
    expect(r.pontualidade).toBe(80);
    expect(r.concluidas).toBe(12);
  });

  it('nenhum lado com base devolve null, não 0%', () => {
    const r = mesclarResumoArea(linha({ projetos: 1 }), linha({ projetos: 2 }));
    expect(r.pontualidade).toBeNull();
  });
});
