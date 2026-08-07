import { describe, it, expect } from 'vitest';
import {
  tipoClienteLabel,
  categoriaLabel,
  situacaoOsLabel,
  statusProjetoLabel,
  statusContratoLabel,
  buildClusterPrincipal,
  buildHorasPorProjeto,
  buildClienteRows,
  buildOsRows,
  buildProjetoRows,
  kpisClientes,
  kpisOperacional,
  kpisProjetos,
  faturamentoPorTipo,
  faturamentoPorCliente,
  buildRateioPorOs,
  matrizCentroCustoPorMes,
  matrizClientePorMes,
  matrizServicoPorMes,
  matrizProdutoPorMes,
  buildRateioProdutoPorOs,
  comparativoAnoAnterior,
  shareCentroCusto,
  centrosCustoEmUso,
  faturamentoMensal,
  osPorStatus,
  estimadoVsRealizado,
  SEM_CENTRO_CUSTO_ID,
  SEM_DATA,
} from './aggregations';
import type {
  RawCliente,
  RawOrdemServico,
  RawOrgProject,
  RawOrgTask,
  RawClienteCluster,
  RawEstruturaCluster,
  RawCentroCusto,
  RawDistribuicaoReceita,
  RawOsProduto,
  RawProdutoSegmento,
} from './types';

const HOJE = '2026-07-14';

// ── Fixtures base ──────────────────────────────────────────────────────
const clientes: RawCliente[] = [
  { id: 'c1', nome: 'Alpha', fixo: 'Sim', categoria: 'Bronze', ativo: true, uf: 'GO', created_at: '2026-01-10T00:00:00Z' },
  { id: 'c2', nome: 'Beta', fixo: 'Não', categoria: 'Prata', ativo: true, uf: 'SP', created_at: '2026-06-20T00:00:00Z' },
  { id: 'c3', nome: 'Gama', fixo: null, categoria: null, ativo: false, uf: null, created_at: '2025-02-01T00:00:00Z' },
];

const estruturaClusters: RawEstruturaCluster[] = [
  { id: 'k1', name: 'PSA Consultores', is_active: true },
  { id: 'k2', name: 'PSA OSG', is_active: true },
  { id: 'k3', name: 'Legado', is_active: false },
];

const clienteClusters: RawClienteCluster[] = [
  // c1 tem 2 vínculos → o mais antigo (k2) é o principal
  { cliente_id: 'c1', cluster_id: 'k2', created_at: '2026-01-01T00:00:00Z' },
  { cliente_id: 'c1', cluster_id: 'k1', created_at: '2026-03-01T00:00:00Z' },
  // c2 só vínculo com cluster inativo → ignorado (fica SEM_CLUSTER)
  { cliente_id: 'c2', cluster_id: 'k3', created_at: '2026-01-01T00:00:00Z' },
];

describe('rótulos (CASE das views)', () => {
  it('tipoCliente', () => {
    expect(tipoClienteLabel('Sim')).toBe('Fixo');
    expect(tipoClienteLabel('Não')).toBe('Pontual');
    expect(tipoClienteLabel('Nao')).toBe('Pontual');
    expect(tipoClienteLabel('Em Análise')).toBe('Em Análise');
    expect(tipoClienteLabel(null)).toBe('Não informado');
  });
  it('categoria e situação', () => {
    expect(categoriaLabel(null)).toBe('Não classificado');
    expect(categoriaLabel('Ouro')).toBe('Ouro');
    expect(situacaoOsLabel('em_andamento')).toBe('Em andamento');
    expect(situacaoOsLabel('concluido')).toBe('Concluído');
    expect(situacaoOsLabel(null)).toBe('Não informado');
    expect(statusProjetoLabel('active')).toBe('Ativo');
    expect(statusProjetoLabel('on_hold')).toBe('Pausado');
    expect(statusProjetoLabel('xpto')).toBe('xpto');
  });
});

describe('statusContratoLabel', () => {
  it('cobre os 4 estados e a borda de 30 dias', () => {
    expect(statusContratoLabel(null, HOJE)).toBe('Sem prazo');
    expect(statusContratoLabel('2026-07-13', HOJE)).toBe('Vencido');
    expect(statusContratoLabel('2026-07-14', HOJE)).toBe('Vence em 30 dias'); // == hoje
    expect(statusContratoLabel('2026-08-13', HOJE)).toBe('Vence em 30 dias'); // hoje+30
    expect(statusContratoLabel('2026-08-14', HOJE)).toBe('Vigente'); // hoje+31
  });
});

describe('buildClusterPrincipal', () => {
  it('pega o vínculo mais antigo e ignora clusters inativos', () => {
    const cp = buildClusterPrincipal(clienteClusters, estruturaClusters);
    expect(cp.get('c1')).toEqual({ cluster_id: 'k2', cluster_nome: 'PSA OSG' });
    expect(cp.has('c2')).toBe(false); // só tinha cluster inativo
  });
});

describe('buildHorasPorProjeto', () => {
  it('soma só tarefas-raiz; realizadas = estimated_hours de status done', () => {
    const tasks: RawOrgTask[] = [
      { project_id: 'p1', parent_task_id: null, estimated_hours: 10, status: 'done' },
      { project_id: 'p1', parent_task_id: null, estimated_hours: 5, status: 'in_progress' },
      { project_id: 'p1', parent_task_id: 'x', estimated_hours: 100, status: 'done' }, // subtarefa → ignorada
      { project_id: 'p2', parent_task_id: null, estimated_hours: 8, status: 'todo' }, // nenhuma done
      { project_id: null, parent_task_id: null, estimated_hours: 3, status: 'done' }, // sem projeto → ignorada
    ];
    const h = buildHorasPorProjeto(tasks);
    expect(h.get('p1')).toEqual({ estimadas: 15, realizadas: 10 });
    expect(h.get('p2')).toEqual({ estimadas: 8, realizadas: null }); // realizadas null (não 0)
  });
});

describe('buildClienteRows', () => {
  const os: RawOrdemServico[] = [
    { id: 'o1', numero_os: '1/26', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: '2026-05-01', data_inicio: null, data_fim: '2026-08-01', valor_projeto: 100000 },
    { id: 'o2', numero_os: '2/26', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: '2026-05-10', data_inicio: null, data_fim: '2026-07-01', valor_projeto: 20000 },
    { id: 'o3', numero_os: '3/26', id_cliente: 'c2', id_servico: null, cluster_id: null, situacao: 'concluido', data_emissao: null, data_inicio: null, data_fim: null, valor_projeto: 40000 },
  ];

  it('agrega faturamento, ticket médio e contadores de contrato', () => {
    const rows = buildClienteRows({ clientes, os, clienteClusters, estruturaClusters, setorRegiao: [{ id_cliente: 'c1', setor_cliente: 'AGR', regiao: '3SU' }], hoje: HOJE });
    const c1 = rows.find((r) => r.cliente_id === 'c1')!;
    expect(c1.faturamento_total).toBe(120000);
    expect(c1.qtd_os_ativas).toBe(2);
    expect(c1.ticket_medio).toBe(60000);
    expect(c1.cluster_nome).toBe('PSA OSG');
    expect(c1.setor).toBe('AGR');
    expect(c1.regiao).toBe('3SU');
    expect(c1.qtd_contratos_vencidos).toBe(1); // o2 (2026-07-01 < hoje)
    expect(c1.qtd_contratos_vigentes).toBe(1); // o1 (2026-08-01 >= hoje)

    const c2 = rows.find((r) => r.cliente_id === 'c2')!;
    expect(c2.qtd_os_ativas).toBe(0);
    expect(c2.ticket_medio).toBeNull(); // sem OS ativa → null (SAFE_DIVIDE)
    expect(c2.cluster_nome).toBe('Sem cluster'); // só cluster inativo

    const c3 = rows.find((r) => r.cliente_id === 'c3')!;
    expect(c3.faturamento_total).toBe(0);
    expect(c3.tipo_cliente).toBe('Não informado');
    expect(c3.categoria).toBe('Não classificado');
  });
});

describe('buildOsRows', () => {
  it('INNER JOIN cliente: descarta OS de cliente inexistente e resolve cluster/serviço', () => {
    const os: RawOrdemServico[] = [
      { id: 'o1', numero_os: '1/26', id_cliente: 'c1', id_servico: 's1', cluster_id: 'k1', situacao: 'em_andamento', data_emissao: '2026-05-01', data_inicio: null, data_fim: null, valor_projeto: 100000 },
      { id: 'o9', numero_os: '9/26', id_cliente: 'cX', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: null, data_inicio: null, data_fim: null, valor_projeto: 5000 }, // cliente inexistente
    ];
    const rows = buildOsRows({ os, clientes, clienteClusters, estruturaClusters, servicos: [{ id: 's1', nome: 'Consultoria' }], hoje: HOJE });
    expect(rows).toHaveLength(1);
    const o1 = rows[0];
    expect(o1.cluster_nome).toBe('PSA Consultores'); // vem de os.cluster_id (k1), não do principal (k2)
    expect(o1.servico_nome).toBe('Consultoria');
    expect(o1.situacao_label).toBe('Em andamento');
    expect(o1.status_contrato).toBe('Sem prazo');
  });
});

describe('buildProjetoRows', () => {
  const projetos: RawOrgProject[] = [
    { id: 'p1', name: 'Projeto A', status: 'active', external_client_id: 'c1', ordem_servico_id: 'o1', estrutura_area_id: null, equipe_id: null, responsible_id: 'u1' },
    { id: 'p2', name: 'Projeto Órfão', status: 'planned', external_client_id: null, ordem_servico_id: null, estrutura_area_id: null, equipe_id: null, responsible_id: null },
  ];
  const os: RawOrdemServico[] = [
    { id: 'o1', numero_os: '1/26', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: null, data_inicio: null, data_fim: null, valor_projeto: 100000 },
  ];
  const tasks: RawOrgTask[] = [
    { project_id: 'p1', parent_task_id: null, estimated_hours: 40, status: 'done' },
    { project_id: 'p1', parent_task_id: null, estimated_hours: 60, status: 'in_progress' },
  ];

  it('LEFT JOIN cliente mantém projeto órfão; desvio e cluster corretos', () => {
    const rows = buildProjetoRows({ projetos, clientes, os, tasks, clienteClusters, estruturaClusters, areas: [], equipes: [], profiles: [{ id: 'u1', first_name: 'Ana', last_name: 'Lima' }] });
    const p1 = rows.find((r) => r.projeto_id === 'p1')!;
    expect(p1.cliente_nome).toBe('Alpha');
    expect(p1.horas_estimadas).toBe(100);
    expect(p1.horas_realizadas).toBe(40);
    expect(p1.desvio_pct).toBeCloseTo((40 - 100) / 100); // -0.6
    expect(p1.responsavel_nome).toBe('Ana Lima');
    expect(p1.valor_os).toBe(100000);
    expect(p1.cluster_nome).toBe('PSA OSG'); // via cluster principal do c1 (sem área)

    const p2 = rows.find((r) => r.projeto_id === 'p2')!;
    expect(p2.cliente_nome).toBeNull();
    expect(p2.tipo_cliente).toBe('Não informado');
    expect(p2.categoria).toBe('Não classificado');
    expect(p2.horas_estimadas).toBe(0);
    expect(p2.desvio_pct).toBeNull(); // sem horas estimadas → SAFE_DIVIDE/NULLIF → null
    expect(p2.cluster_nome).toBe('Sem cluster');
  });
});

describe('seletores de KPI/série', () => {
  const os: RawOrdemServico[] = [
    { id: 'o1', numero_os: '1', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: '2026-05-01', data_inicio: '2026-05-01', data_fim: null, valor_projeto: 100000 },
    { id: 'o2', numero_os: '2', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'em_andamento', data_emissao: '2026-05-20', data_inicio: '2026-05-20', data_fim: null, valor_projeto: 20000 },
    { id: 'o3', numero_os: '3', id_cliente: 'c2', id_servico: null, cluster_id: null, situacao: 'concluido', data_emissao: null, data_inicio: null, data_fim: null, valor_projeto: 40000 },
  ];
  const clienteRows = buildClienteRows({ clientes, os, clienteClusters, estruturaClusters, setorRegiao: [], hoje: HOJE });
  const osRows = buildOsRows({ os, clientes, clienteClusters, estruturaClusters, servicos: [], hoje: HOJE });

  const fatPorCliente = faturamentoPorCliente(osRows);

  it('kpisClientes: ativos, fixos/pontuais, ticket médio global', () => {
    const k = kpisClientes(clienteRows, fatPorCliente);
    expect(k.faturamento_total).toBe(160000);
    expect(k.clientes_ativos).toBe(2); // c1, c2 (c3 inativo)
    expect(k.clientes_ativos_fixos).toBe(1);
    expect(k.clientes_ativos_pontuais).toBe(1);
    expect(k.os_ativas).toBe(2);
    expect(k.ticket_medio).toBe(80000); // 160000 / 2
  });

  it('kpisOperacional: novos clientes no trimestre', () => {
    const k = kpisOperacional(clienteRows, HOJE);
    expect(k.novos_clientes_trimestre).toBe(1); // só c2 (created_at 2026-06-20, dentro de 90d de 2026-07-14)
  });

  it('faturamento por tipo de cliente e mensal', () => {
    expect(faturamentoPorTipo(clienteRows, fatPorCliente)).toEqual([
      { tipo: 'Fixo', faturamento: 120000 }, // c1 (Alpha)
      { tipo: 'Pontual', faturamento: 40000 }, // c2 (Beta)
      { tipo: 'Não informado', faturamento: 0 }, // c3 (Gama), sem faturamento
    ]);
    expect(faturamentoMensal(osRows)).toEqual([{ mes: '2026-05', faturamento: 120000 }]); // o3 sem data_inicio → fora
  });

  describe('matriz por centro de custo / cliente', () => {
    const centros: RawCentroCusto[] = [
      { id: 'cc1', codigo: '1001', nome: 'Consultoria' },
      { id: 'cc2', codigo: '1002', nome: 'Fiscal' },
      { id: 'cc3', codigo: '1003', nome: '' }, // sem nome → cai no código
    ];

    it('rateia o valor da OS pelos percentuais e distribui nos meses', () => {
      // o1 (100k, mai): 70/30 · o2 (20k, mai): 100% no cc1 · o3 (40k, sem data): sem rateio
      const dist: RawDistribuicaoReceita[] = [
        { id_ordem_servico: 'o1', id_centro_custo: 'cc1', percentual_rateio: 70 },
        { id_ordem_servico: 'o1', id_centro_custo: 'cc2', percentual_rateio: 30 },
        { id_ordem_servico: 'o2', id_centro_custo: 'cc1', percentual_rateio: 100 },
      ];
      const m = matrizCentroCustoPorMes(osRows, buildRateioPorOs(dist, centros), null);
      expect(m.meses).toEqual(['2026-05']);
      expect(m.temSemData).toBe(true); // o3
      expect(m.linhas).toEqual([
        { id: 'cc1', label: 'Consultoria', porMes: { '2026-05': 90000 }, total: 90000 }, // 70k + 20k
        { id: SEM_CENTRO_CUSTO_ID, label: 'Sem centro de custo', porMes: { [SEM_DATA]: 40000 }, total: 40000 },
        { id: 'cc2', label: 'Fiscal', porMes: { '2026-05': 30000 }, total: 30000 },
      ]);
      // O total da matriz bate com o KPI de faturamento total (160k).
      expect(m.linhas.reduce((a, l) => a + l.total, 0)).toBe(160000);
    });

    it('rateio parcial: a sobra vira "Sem centro de custo"', () => {
      const dist: RawDistribuicaoReceita[] = [
        { id_ordem_servico: 'o1', id_centro_custo: 'cc1', percentual_rateio: 60 },
      ];
      const m = matrizCentroCustoPorMes(osRows, buildRateioPorOs(dist, centros), null);
      expect(m.linhas.find((l) => l.id === 'cc1')?.total).toBe(60000);
      // 40% de o1 (40k) + o2 (20k) + o3 (40k), nenhum rateado
      expect(m.linhas.find((l) => l.id === SEM_CENTRO_CUSTO_ID)?.total).toBe(100000);
    });

    it('ignora rateio de centro de custo fora do catálogo e usa o código quando não há nome', () => {
      const dist: RawDistribuicaoReceita[] = [
        { id_ordem_servico: 'o1', id_centro_custo: 'cc3', percentual_rateio: 50 },
        { id_ordem_servico: 'o1', id_centro_custo: 'apagado', percentual_rateio: 50 },
      ];
      const m = matrizCentroCustoPorMes(osRows, buildRateioPorOs(dist, centros), null);
      expect(m.linhas.find((l) => l.id === 'cc3')?.label).toBe('1003');
      expect(m.linhas.find((l) => l.id === 'cc3')?.total).toBe(50000);
      // os 50% do centro apagado voltam para o bucket sem centro de custo
      expect(m.linhas.find((l) => l.id === SEM_CENTRO_CUSTO_ID)?.total).toBe(110000);
    });

    it('com centro selecionado, a matriz tem uma linha só (as OS já vêm com a fatia)', () => {
      const m = matrizCentroCustoPorMes(osRows, new Map(), { id: 'cc1', label: 'Consultoria' });
      expect(m.linhas).toHaveLength(1);
      expect(m.linhas[0]).toMatchObject({ id: 'cc1', label: 'Consultoria', total: 160000 });
    });

    it('matriz por cliente: uma linha por cliente, ordenada pelo total', () => {
      const m = matrizClientePorMes(osRows);
      expect(m.linhas.map((l) => [l.label, l.total])).toEqual([['Alpha', 120000], ['Beta', 40000]]);
      expect(m.linhas[0].porMes['2026-05']).toBe(120000);
      expect(m.linhas[1].porMes[SEM_DATA]).toBe(40000); // o3 não tem data_inicio
    });

    it('shareCentroCusto: fatia da OS por centro, sobra e centro sem rateio', () => {
      const rateio = buildRateioPorOs(
        [{ id_ordem_servico: 'o1', id_centro_custo: 'cc1', percentual_rateio: 70 }],
        centros,
      );
      expect(shareCentroCusto('o1', rateio, null)).toBe(1); // sem filtro → OS inteira
      expect(shareCentroCusto('o1', rateio, 'cc1')).toBeCloseTo(0.7);
      expect(shareCentroCusto('o1', rateio, 'cc2')).toBe(0); // não pertence ao centro
      expect(shareCentroCusto('o1', rateio, SEM_CENTRO_CUSTO_ID)).toBeCloseTo(0.3);
      expect(shareCentroCusto('o3', rateio, SEM_CENTRO_CUSTO_ID)).toBe(1); // sem rateio nenhum
    });

    it('matriz por serviço: valor inteiro da OS, sem rateio', () => {
      // o1/o2 usam o serviço s1; o3 não tem serviço → bucket próprio.
      const comServico: RawOrdemServico[] = os.map((o) => (o.id === 'o3' ? o : { ...o, id_servico: 's1' }));
      const rows = buildOsRows({
        os: comServico, clientes, clienteClusters, estruturaClusters,
        servicos: [{ id: 's1', nome: 'REC PIS/COFINS' }], hoje: HOJE,
      });
      const m = matrizServicoPorMes(rows);
      expect(m.linhas).toEqual([
        { id: 's1', label: 'REC PIS/COFINS', porMes: { '2026-05': 120000 }, total: 120000 },
        { id: 'SEM_SERVICO', label: 'Sem serviço na OS', porMes: { [SEM_DATA]: 40000 }, total: 40000 },
      ]);
    });

    describe('matriz por produto', () => {
      const produtos: RawProdutoSegmento[] = [
        { id: 'p1', codigo: 'PIS', nome: 'PIS/COFINS' },
        { id: 'p2', codigo: 'IRPJ', nome: 'IRPJ/CSLL' },
      ];

      it('divide a receita pelas horas contratadas de cada produto', () => {
        const osProdutos: RawOsProduto[] = [
          { ordem_servico_id: 'o1', produto_segmento_id: 'p1', horas_contratadas: 30 },
          { ordem_servico_id: 'o1', produto_segmento_id: 'p2', horas_contratadas: 10 },
        ];
        const m = matrizProdutoPorMes(osRows, buildRateioProdutoPorOs(osProdutos, produtos));
        // o1 = 100k → 75% p1 (30h de 40h) e 25% p2
        expect(m.linhas.find((l) => l.id === 'p1')?.total).toBe(75000);
        expect(m.linhas.find((l) => l.id === 'p2')?.total).toBe(25000);
        // o2 (20k) e o3 (40k) não têm produto cadastrado
        expect(m.linhas.find((l) => l.id === 'SEM_PRODUTO')?.total).toBe(60000);
        expect(m.linhas.reduce((a, l) => a + l.total, 0)).toBe(160000);
      });

      it('sem horas em todos os produtos, divide em partes iguais', () => {
        const osProdutos: RawOsProduto[] = [
          { ordem_servico_id: 'o1', produto_segmento_id: 'p1', horas_contratadas: 30 },
          { ordem_servico_id: 'o1', produto_segmento_id: 'p2', horas_contratadas: null },
        ];
        const m = matrizProdutoPorMes(osRows, buildRateioProdutoPorOs(osProdutos, produtos));
        expect(m.linhas.find((l) => l.id === 'p1')?.total).toBe(50000);
        expect(m.linhas.find((l) => l.id === 'p2')?.total).toBe(50000);
      });
    });

    it('comparativoAnoAnterior: mesmos meses, um ano antes', () => {
      // mai/2026: 120k (o1+o2) · mai/2025: 60k · o3 sem data fica fora dos dois lados
      const comOsDoAnoPassado: RawOrdemServico[] = [
        ...os,
        { id: 'o4', numero_os: '4', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'concluido', data_emissao: '2025-05-10', data_inicio: '2025-05-10', data_fim: null, valor_projeto: 60000 },
        { id: 'o5', numero_os: '5', id_cliente: 'c1', id_servico: null, cluster_id: null, situacao: 'concluido', data_emissao: '2025-09-10', data_inicio: '2025-09-10', data_fim: null, valor_projeto: 999 }, // set/25 não é mês comparado
      ];
      const rows = buildOsRows({ os: comOsDoAnoPassado, clientes, clienteClusters, estruturaClusters, servicos: [], hoje: HOJE });
      const cmp = comparativoAnoAnterior(rows, ['2026-05']);
      expect(cmp.meses).toEqual(['2025-05']);
      expect(cmp.atual).toBe(120000);
      expect(cmp.anterior).toBe(60000);
      expect(cmp.variacao).toBe(1); // +100%
    });

    it('comparativoAnoAnterior: sem base no ano anterior não inventa percentual', () => {
      const cmp = comparativoAnoAnterior(osRows, ['2026-05']);
      expect(cmp.anterior).toBe(0);
      expect(cmp.variacao).toBeNull();
    });

    it('centrosCustoEmUso: só os que aparecem em rateio, + o bucket sem centro', () => {
      const rateio = buildRateioPorOs(
        [{ id_ordem_servico: 'o1', id_centro_custo: 'cc2', percentual_rateio: 100 }],
        centros,
      );
      expect(centrosCustoEmUso(rateio)).toEqual([
        { id: 'cc2', label: 'Fiscal' },
        { id: SEM_CENTRO_CUSTO_ID, label: 'Sem centro de custo' },
      ]);
    });
  });

  it('osPorStatus e kpisProjetos', () => {
    expect(osPorStatus(osRows)).toEqual([
      { status: 'Em andamento', qtd: 2 },
      { status: 'Concluído', qtd: 1 }, // o3 (c2) entra no INNER JOIN
    ]);

    const projetoRows = buildProjetoRows({
      projetos: [{ id: 'p1', name: 'A', status: 'active', external_client_id: 'c1', ordem_servico_id: null, estrutura_area_id: null, equipe_id: null, responsible_id: null }],
      clientes, os, tasks: [{ project_id: 'p1', parent_task_id: null, estimated_hours: 100, status: 'done' }],
      clienteClusters, estruturaClusters, areas: [], equipes: [], profiles: [],
    });
    const kp = kpisProjetos(projetoRows, osRows);
    expect(kp.horas_estimadas).toBe(100);
    expect(kp.horas_realizadas).toBe(100);
    expect(kp.desvio_medio).toBe(0);
    expect(kp.os_em_andamento).toBe(2);
    expect(estimadoVsRealizado(projetoRows)).toHaveLength(1);
  });
});
