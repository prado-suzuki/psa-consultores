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
  faturamentoPorCategoria,
  faturamentoPorCluster,
  faturamentoMensal,
  top10Clientes,
  osPorStatus,
  estimadoVsRealizado,
} from './aggregations';
import type {
  RawCliente,
  RawOrdemServico,
  RawOrgProject,
  RawOrgTask,
  RawClienteCluster,
  RawEstruturaCluster,
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

  it('kpisClientes: ativos, fixos/pontuais, ticket médio global', () => {
    const k = kpisClientes(clienteRows);
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

  it('faturamento por categoria/cluster e mensal', () => {
    expect(faturamentoPorCategoria(clienteRows)).toEqual([
      { categoria: 'Bronze', faturamento: 120000 },
      { categoria: 'Prata', faturamento: 40000 },
      { categoria: 'Não classificado', faturamento: 0 }, // c3 (Gama), sem faturamento
    ]);
    const clusters = faturamentoPorCluster(clienteRows);
    expect(clusters.find((c) => c.cluster === 'PSA OSG')?.faturamento).toBe(120000);
    expect(faturamentoMensal(osRows)).toEqual([{ mes: '2026-05', faturamento: 120000 }]); // o3 sem data_inicio → fora
  });

  it('top10, osPorStatus e kpisProjetos', () => {
    const top = top10Clientes(clienteRows);
    expect(top[0].cliente_nome).toBe('Alpha');
    expect(top[0].faturamento_total).toBe(120000);
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
