/**
 * Funções PURAS que reproduzem a lógica das 3 views do BigQuery
 * (VW_ANL_DASHBOARD_CLIENTES / _OS / _PROJETOS) a partir das linhas cruas do
 * Supabase. Sem dependência de Supabase/React → 100% testáveis com vitest.
 *
 * `hoje` é sempre injetado ('YYYY-MM-DD') para manter as funções determinísticas
 * (as views usam CURRENT_DATE('America/Sao_Paulo')).
 */
import type {
  RawCliente,
  RawOrdemServico,
  RawOrgProject,
  RawOrgTask,
  RawClienteCluster,
  RawEstruturaCluster,
  RawEstruturaArea,
  RawEstruturaEquipe,
  RawServico,
  RawProfile,
  RawSetorRegiao,
  ClienteRow,
  OsRow,
  ProjetoRow,
  TipoCliente,
  StatusContrato,
  CategoriaFaturamento,
  ClusterFaturamento,
  MesFaturamento,
  TopCliente,
  StatusContagem,
  ProjetoHoras,
  KpisClientes,
  KpisOperacional,
  KpisProjetos,
} from './types';

const DAY_MS = 86_400_000;

/** Converte 'YYYY-MM-DD' (ou timestamp ISO) em ms UTC de meia-noite. */
function toUTCms(dateStr: string): number {
  return Date.parse(`${dateStr.slice(0, 10)}T00:00:00Z`);
}

// ── Rótulos (espelham os CASE das views) ───────────────────────────────

export function tipoClienteLabel(fixo: string | null | undefined): TipoCliente {
  switch (fixo) {
    case 'Sim':
      return 'Fixo';
    case 'Não':
    case 'Nao':
      return 'Pontual';
    case 'Em Análise':
      return 'Em Análise';
    default:
      return 'Não informado';
  }
}

export function categoriaLabel(categoria: string | null | undefined): string {
  return categoria ?? 'Não classificado';
}

export function situacaoOsLabel(situacao: string | null | undefined): string {
  switch (situacao) {
    case 'em_andamento':
      return 'Em andamento';
    case 'concluido':
      return 'Concluído';
    case 'suspenso':
      return 'Suspenso';
    default:
      return situacao ?? 'Não informado';
  }
}

export function statusProjetoLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'completed':
      return 'Concluído';
    case 'on_hold':
      return 'Pausado';
    case 'cancelled':
      return 'Cancelado';
    case 'planning':
      return 'Planejamento';
    case 'planned':
      return 'Planejado';
    default:
      return status ?? 'Não informado';
  }
}

export function statusContratoLabel(dataFim: string | null, hoje: string): StatusContrato {
  if (!dataFim) return 'Sem prazo';
  const df = toUTCms(dataFim);
  const h = toUTCms(hoje);
  if (df < h) return 'Vencido';
  if (df <= h + 30 * DAY_MS) return 'Vence em 30 dias';
  return 'Vigente';
}

// ── Cluster principal (CTE cluster_principal) ──────────────────────────

interface ClusterPrincipal {
  cluster_id: string;
  cluster_nome: string;
}

/**
 * Para cada cliente, o cluster do vínculo mais antigo (menor created_at),
 * considerando apenas clusters ativos — espelha o INNER JOIN is_active=TRUE +
 * QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY created_at)=1.
 */
export function buildClusterPrincipal(
  clusters: RawClienteCluster[],
  estruturas: RawEstruturaCluster[],
): Map<string, ClusterPrincipal> {
  const ativosPorId = new Map(
    estruturas.filter((e) => e.is_active).map((e) => [e.id, e.name] as const),
  );

  const porCliente = new Map<string, RawClienteCluster[]>();
  for (const cc of clusters) {
    if (!ativosPorId.has(cc.cluster_id)) continue; // INNER JOIN ativos
    const arr = porCliente.get(cc.cliente_id);
    if (arr) arr.push(cc);
    else porCliente.set(cc.cliente_id, [cc]);
  }

  const result = new Map<string, ClusterPrincipal>();
  for (const [clienteId, rows] of porCliente) {
    const primeiro = rows
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    result.set(clienteId, {
      cluster_id: primeiro.cluster_id,
      cluster_nome: ativosPorId.get(primeiro.cluster_id)!,
    });
  }
  return result;
}

// ── Horas por projeto (CTE horas_tarefas) ──────────────────────────────

interface HorasProjeto {
  estimadas: number | null;
  realizadas: number | null;
}

/**
 * Soma horas por projeto usando SÓ tarefas-raiz (parent_task_id IS NULL) com
 * project_id. `realizadas` = soma das horas estimadas de tarefas com status
 * 'done' (espelha exatamente a view — não é apontamento real de horas).
 * Retorna null (não 0) quando não há soma, para o cálculo de desvio bater com
 * o SAFE_DIVIDE/NULLIF da view.
 */
export function buildHorasPorProjeto(tasks: RawOrgTask[]): Map<string, HorasProjeto> {
  const map = new Map<string, HorasProjeto>();
  for (const t of tasks) {
    if (t.parent_task_id !== null || t.project_id == null) continue;
    const cur = map.get(t.project_id) ?? { estimadas: null, realizadas: null };
    if (t.estimated_hours != null) {
      cur.estimadas = (cur.estimadas ?? 0) + t.estimated_hours;
      if (t.status === 'done') {
        cur.realizadas = (cur.realizadas ?? 0) + t.estimated_hours;
      }
    }
    map.set(t.project_id, cur);
  }
  return map;
}

// ── Builders das views ─────────────────────────────────────────────────

interface FaturamentoCliente {
  faturamento_total: number;
  qtd_os_ativas: number;
  qtd_contratos_vigentes: number;
  qtd_contratos_vencidos: number;
  qtd_contratos_30d: number;
}

function buildFaturamentoPorCliente(
  os: RawOrdemServico[],
  hoje: string,
): Map<string, FaturamentoCliente> {
  const h = toUTCms(hoje);
  const map = new Map<string, FaturamentoCliente>();
  for (const o of os) {
    const cur =
      map.get(o.id_cliente) ??
      ({
        faturamento_total: 0,
        qtd_os_ativas: 0,
        qtd_contratos_vigentes: 0,
        qtd_contratos_vencidos: 0,
        qtd_contratos_30d: 0,
      } satisfies FaturamentoCliente);
    cur.faturamento_total += o.valor_projeto ?? 0;
    if (o.situacao === 'em_andamento') cur.qtd_os_ativas += 1;
    if (o.data_fim) {
      const df = toUTCms(o.data_fim);
      if (df >= h) cur.qtd_contratos_vigentes += 1;
      if (df < h) cur.qtd_contratos_vencidos += 1;
      if (df >= h && df <= h + 30 * DAY_MS) cur.qtd_contratos_30d += 1;
    }
    map.set(o.id_cliente, cur);
  }
  return map;
}

/** Reproduz VW_ANL_DASHBOARD_CLIENTES. */
export function buildClienteRows(input: {
  clientes: RawCliente[];
  os: RawOrdemServico[];
  clienteClusters: RawClienteCluster[];
  estruturaClusters: RawEstruturaCluster[];
  setorRegiao: RawSetorRegiao[];
  hoje: string;
}): ClienteRow[] {
  const { clientes, os, clienteClusters, estruturaClusters, setorRegiao, hoje } = input;
  const fat = buildFaturamentoPorCliente(os, hoje);
  const clusterPrincipal = buildClusterPrincipal(clienteClusters, estruturaClusters);
  const setorPorCliente = new Map(
    setorRegiao.filter((s) => s.id_cliente).map((s) => [s.id_cliente as string, s] as const),
  );

  return clientes.map((c) => {
    const f = fat.get(c.id);
    const cl = clusterPrincipal.get(c.id);
    const sr = setorPorCliente.get(c.id);
    const faturamento_total = f?.faturamento_total ?? 0;
    const qtd_os_ativas = f?.qtd_os_ativas ?? 0;
    return {
      cliente_id: c.id,
      cliente_nome: c.nome,
      cluster_id: cl?.cluster_id ?? 'SEM_CLUSTER',
      cluster_nome: cl?.cluster_nome ?? 'Sem cluster',
      tipo_cliente: tipoClienteLabel(c.fixo),
      categoria: categoriaLabel(c.categoria),
      setor: sr?.setor_cliente ?? null,
      uf: c.uf,
      regiao: sr?.regiao ?? null,
      ativo: c.ativo ?? false,
      data_cadastro: c.created_at,
      faturamento_total,
      ticket_medio: qtd_os_ativas === 0 ? null : faturamento_total / qtd_os_ativas,
      qtd_os_ativas,
      qtd_contratos_vigentes: f?.qtd_contratos_vigentes ?? 0,
      qtd_contratos_vencidos: f?.qtd_contratos_vencidos ?? 0,
      qtd_contratos_30d: f?.qtd_contratos_30d ?? 0,
    } satisfies ClienteRow;
  });
}

/** Reproduz VW_ANL_DASHBOARD_OS (INNER JOIN cliente → só OS de clientes do escopo). */
export function buildOsRows(input: {
  os: RawOrdemServico[];
  clientes: RawCliente[];
  clienteClusters: RawClienteCluster[];
  estruturaClusters: RawEstruturaCluster[];
  servicos: RawServico[];
  hoje: string;
}): OsRow[] {
  const { os, clientes, clienteClusters, estruturaClusters, servicos, hoje } = input;
  const clientePorId = new Map(clientes.map((c) => [c.id, c] as const));
  const clusterPrincipal = buildClusterPrincipal(clienteClusters, estruturaClusters);
  // ec = estrutura_clusters por os.cluster_id — LEFT JOIN, sem filtro is_active.
  const clusterNomePorId = new Map(estruturaClusters.map((e) => [e.id, e.name] as const));
  const servicoPorId = new Map(servicos.map((s) => [s.id, s.nome] as const));

  const rows: OsRow[] = [];
  for (const o of os) {
    const c = clientePorId.get(o.id_cliente);
    if (!c) continue; // INNER JOIN cliente
    const cl = clusterPrincipal.get(c.id);
    rows.push({
      os_id: o.id,
      numero_os: o.numero_os,
      cliente_id: c.id,
      cliente_nome: c.nome,
      tipo_cliente: tipoClienteLabel(c.fixo),
      categoria: categoriaLabel(c.categoria),
      cluster_id: o.cluster_id ?? cl?.cluster_id ?? 'SEM_CLUSTER',
      cluster_nome:
        (o.cluster_id ? clusterNomePorId.get(o.cluster_id) : undefined) ??
        cl?.cluster_nome ??
        'Sem cluster',
      servico_nome: o.id_servico ? servicoPorId.get(o.id_servico) ?? null : null,
      data_emissao: o.data_emissao,
      data_inicio: o.data_inicio,
      data_fim: o.data_fim,
      situacao: o.situacao,
      situacao_label: situacaoOsLabel(o.situacao),
      status_contrato: statusContratoLabel(o.data_fim, hoje),
      faturamento: o.valor_projeto ?? 0,
    });
  }
  return rows;
}

/** Reproduz VW_ANL_DASHBOARD_PROJETOS (LEFT JOIN cliente → mantém projetos sem cliente). */
export function buildProjetoRows(input: {
  projetos: RawOrgProject[];
  clientes: RawCliente[];
  os: RawOrdemServico[];
  tasks: RawOrgTask[];
  clienteClusters: RawClienteCluster[];
  estruturaClusters: RawEstruturaCluster[];
  areas: RawEstruturaArea[];
  equipes: RawEstruturaEquipe[];
  profiles: RawProfile[];
}): ProjetoRow[] {
  const { projetos, clientes, os, tasks, clienteClusters, estruturaClusters, areas, equipes, profiles } =
    input;
  const clientePorId = new Map(clientes.map((c) => [c.id, c] as const));
  const osPorId = new Map(os.map((o) => [o.id, o] as const));
  const clusterPrincipal = buildClusterPrincipal(clienteClusters, estruturaClusters);
  const clusterNomePorId = new Map(estruturaClusters.map((e) => [e.id, e.name] as const));
  const areaPorId = new Map(areas.map((a) => [a.id, a] as const));
  const equipePorId = new Map(equipes.map((e) => [e.id, e.name] as const));
  const profilePorId = new Map(profiles.map((p) => [p.id, p] as const));
  const horas = buildHorasPorProjeto(tasks);

  return projetos.map((p) => {
    const c = p.external_client_id ? clientePorId.get(p.external_client_id) : undefined;
    const o = p.ordem_servico_id ? osPorId.get(p.ordem_servico_id) : undefined;
    const area = p.estrutura_area_id ? areaPorId.get(p.estrutura_area_id) : undefined;
    const cl = c ? clusterPrincipal.get(c.id) : undefined;
    const pr = p.responsible_id ? profilePorId.get(p.responsible_id) : undefined;
    const h = horas.get(p.id);

    const responsavel = pr
      ? `${pr.first_name ?? ''} ${pr.last_name ?? ''}`.trim() || null
      : null;

    const estimadas = h?.estimadas ?? null;
    const realizadas = h?.realizadas ?? null;
    const desvio_pct =
      estimadas != null && estimadas !== 0 && realizadas != null
        ? (realizadas - estimadas) / estimadas
        : null;

    return {
      projeto_id: p.id,
      projeto_nome: p.name,
      status_projeto: p.status,
      status_projeto_label: statusProjetoLabel(p.status),
      cliente_id: c?.id ?? null,
      cliente_nome: c?.nome ?? null,
      tipo_cliente: tipoClienteLabel(c?.fixo),
      categoria: categoriaLabel(c?.categoria),
      cluster_id: area?.cluster_id ?? cl?.cluster_id ?? 'SEM_CLUSTER',
      cluster_nome:
        (area?.cluster_id ? clusterNomePorId.get(area.cluster_id) : undefined) ??
        cl?.cluster_nome ??
        'Sem cluster',
      area_nome: area?.name ?? null,
      equipe_nome: p.equipe_id ? equipePorId.get(p.equipe_id) ?? null : null,
      responsavel_nome: responsavel,
      os_id: o?.id ?? null,
      numero_os: o?.numero_os ?? null,
      situacao_os: o?.situacao ?? null,
      situacao_os_label: situacaoOsLabel(o?.situacao),
      os_data_fim: o?.data_fim ?? null,
      valor_os: o?.valor_projeto ?? 0,
      horas_estimadas: estimadas ?? 0,
      horas_realizadas: realizadas ?? 0,
      desvio_pct,
    } satisfies ProjetoRow;
  });
}

// ── Seletores de KPI / série (para os cards e gráficos) ────────────────

function sum<T>(rows: T[], get: (r: T) => number): number {
  return rows.reduce((acc, r) => acc + get(r), 0);
}

export function kpisClientes(rows: ClienteRow[]): KpisClientes {
  const ativos = rows.filter((r) => r.ativo);
  const faturamento_total = sum(rows, (r) => r.faturamento_total);
  const os_ativas = sum(rows, (r) => r.qtd_os_ativas);
  return {
    faturamento_total,
    clientes_ativos: ativos.length,
    clientes_ativos_fixos: ativos.filter((r) => r.tipo_cliente === 'Fixo').length,
    clientes_ativos_pontuais: ativos.filter((r) => r.tipo_cliente === 'Pontual').length,
    ticket_medio: os_ativas === 0 ? null : faturamento_total / os_ativas,
    os_ativas,
    contratos_30d: sum(rows, (r) => r.qtd_contratos_30d),
  };
}

export function kpisOperacional(rows: ClienteRow[], hoje: string): KpisOperacional {
  const limite = toUTCms(hoje) - 90 * DAY_MS;
  return {
    contratos_30d: sum(rows, (r) => r.qtd_contratos_30d),
    contratos_vencidos: sum(rows, (r) => r.qtd_contratos_vencidos),
    novos_clientes_trimestre: rows.filter((r) => toUTCms(r.data_cadastro) >= limite).length,
  };
}

export function kpisProjetos(projetos: ProjetoRow[], os: OsRow[]): KpisProjetos {
  const comDesvio = projetos.filter((p) => p.desvio_pct != null);
  return {
    os_em_andamento: os.filter((o) => o.situacao === 'em_andamento').length,
    os_total: os.length,
    horas_estimadas: sum(projetos, (p) => p.horas_estimadas),
    horas_realizadas: sum(projetos, (p) => p.horas_realizadas),
    desvio_medio:
      comDesvio.length === 0
        ? null
        : sum(comDesvio, (p) => p.desvio_pct as number) / comDesvio.length,
  };
}

function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(key(r), (map.get(key(r)) ?? 0) + val(r));
  }
  return map;
}

export function faturamentoPorCategoria(rows: ClienteRow[]): CategoriaFaturamento[] {
  return [...groupSum(rows, (r) => r.categoria, (r) => r.faturamento_total)]
    .map(([categoria, faturamento]) => ({ categoria, faturamento }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function faturamentoPorCluster(rows: ClienteRow[]): ClusterFaturamento[] {
  return [...groupSum(rows, (r) => r.cluster_nome, (r) => r.faturamento_total)]
    .map(([cluster, faturamento]) => ({ cluster, faturamento }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

/** Faturamento por mês de INÍCIO da OS (ignora OS sem data_inicio — não dá para
 * posicionar numa linha do tempo). data_inicio tem melhor cobertura que data_emissao. */
export function faturamentoMensal(rows: OsRow[]): MesFaturamento[] {
  const comData = rows.filter((r) => r.data_inicio);
  return [...groupSum(comData, (r) => (r.data_inicio as string).slice(0, 7), (r) => r.faturamento)]
    .map(([mes, faturamento]) => ({ mes, faturamento }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

export function top10Clientes(rows: ClienteRow[]): TopCliente[] {
  return rows
    .slice()
    .sort((a, b) => b.faturamento_total - a.faturamento_total)
    .slice(0, 10)
    .map((r) => ({
      cliente_id: r.cliente_id,
      cliente_nome: r.cliente_nome,
      tipo_cliente: r.tipo_cliente,
      categoria: r.categoria,
      faturamento_total: r.faturamento_total,
    }));
}

export function osPorStatus(rows: OsRow[]): StatusContagem[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.situacao_label, (map.get(r.situacao_label) ?? 0) + 1);
  return [...map].map(([status, qtd]) => ({ status, qtd })).sort((a, b) => b.qtd - a.qtd);
}

/** Séries do gráfico "Estimado vs realizado por projeto" (maiores por estimado). */
export function estimadoVsRealizado(rows: ProjetoRow[], limite = 15): ProjetoHoras[] {
  return rows
    .filter((p) => p.horas_estimadas > 0 || p.horas_realizadas > 0)
    .sort((a, b) => b.horas_estimadas - a.horas_estimadas)
    .slice(0, limite)
    .map((p) => ({
      projeto_id: p.projeto_id,
      projeto_nome: p.projeto_nome,
      horas_estimadas: p.horas_estimadas,
      horas_realizadas: p.horas_realizadas,
    }));
}
