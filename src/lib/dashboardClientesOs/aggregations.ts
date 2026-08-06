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
  RawDistribuicaoReceita,
  RawCentroCusto,
  ClienteRow,
  OsRow,
  ProjetoRow,
  TipoCliente,
  StatusContrato,
  TipoFaturamento,
  FatiaRateio,
  RawOsProduto,
  RawProdutoSegmento,
  MatrizLinha,
  MatrizMensal,
  ComparativoAnual,
  MesFaturamento,
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

// ── Rateio da receita por centro de custo (distribuicao_receita) ───────

/** Buckets do que não está classificado — mantêm o total batendo com o KPI. */
export const SEM_CENTRO_CUSTO = { id: 'SEM_CENTRO_CUSTO', label: 'Sem centro de custo' };
export const SEM_CENTRO_CUSTO_ID = SEM_CENTRO_CUSTO.id;
export const SEM_PRODUTO = { id: 'SEM_PRODUTO', label: 'Sem produto na OS' };
export const SEM_SERVICO = { id: 'SEM_SERVICO', label: 'Sem serviço na OS' };
/** Coluna das OS sem data de início (maioria da base) na matriz por mês. */
export const SEM_DATA = 'sem-data';

/** Rótulo de catálogo: nome quando existe (código sozinho é opaco no gráfico). */
function catalogoLabel(item: { codigo: string; nome: string }): string {
  return item.nome?.trim() || item.codigo;
}

/**
 * Rateio de cada OS por CENTRO DE CUSTO: `distribuicao_receita` agrupada por OS,
 * já com o rótulo resolvido. Linhas cujo centro saiu do catálogo são ignoradas
 * (o percentual delas volta para "Sem centro de custo").
 */
export function buildRateioPorOs(
  distribuicao: RawDistribuicaoReceita[],
  centrosCusto: RawCentroCusto[],
): Map<string, FatiaRateio[]> {
  const labelPorId = new Map(centrosCusto.map((c) => [c.id, catalogoLabel(c)] as const));
  const map = new Map<string, FatiaRateio[]>();
  for (const d of distribuicao) {
    const label = labelPorId.get(d.id_centro_custo);
    if (!label) continue;
    const item: FatiaRateio = { id: d.id_centro_custo, label, percentual: d.percentual_rateio ?? 0 };
    const arr = map.get(d.id_ordem_servico);
    if (arr) arr.push(item);
    else map.set(d.id_ordem_servico, [item]);
  }
  return map;
}

/**
 * Rateio de cada OS por PRODUTO (`os_produtos_contratados`). Diferente do centro
 * de custo, o banco não guarda percentual: a receita é dividida pelas HORAS
 * CONTRATADAS de cada produto e, quando a OS não tem horas em todos eles, em
 * PARTES IGUAIS. Os percentuais sempre somam 100 — não existe sobra aqui.
 */
export function buildRateioProdutoPorOs(
  produtosOs: RawOsProduto[],
  produtos: RawProdutoSegmento[],
): Map<string, FatiaRateio[]> {
  const labelPorId = new Map(produtos.map((p) => [p.id, catalogoLabel(p)] as const));
  const porOs = new Map<string, RawOsProduto[]>();
  for (const p of produtosOs) {
    if (!labelPorId.has(p.produto_segmento_id)) continue;
    const arr = porOs.get(p.ordem_servico_id);
    if (arr) arr.push(p);
    else porOs.set(p.ordem_servico_id, [p]);
  }

  const map = new Map<string, FatiaRateio[]>();
  for (const [osId, itens] of porOs) {
    const horas = itens.reduce((acc, i) => acc + (i.horas_contratadas ?? 0), 0);
    const porHoras = horas > 0 && itens.every((i) => (i.horas_contratadas ?? 0) > 0);
    map.set(osId, itens.map((i) => ({
      id: i.produto_segmento_id,
      label: labelPorId.get(i.produto_segmento_id) as string,
      percentual: porHoras ? ((i.horas_contratadas as number) / horas) * 100 : 100 / itens.length,
    })));
  }
  return map;
}

/**
 * Fatia (0–1) da receita de uma OS que pertence ao centro de custo selecionado.
 * Sem centro selecionado → 1 (a OS inteira). Em "Sem centro de custo" → a sobra
 * não rateada. Zero significa que a OS não pertence àquele centro.
 */
export function shareCentroCusto(
  osId: string,
  rateioPorOs: Map<string, FatiaRateio[]>,
  centroCustoId: string | null,
): number {
  if (!centroCustoId) return 1;
  const rateio = rateioPorOs.get(osId) ?? [];
  if (centroCustoId === SEM_CENTRO_CUSTO.id) {
    const alocado = rateio.reduce((acc, r) => acc + r.percentual, 0);
    return Math.max(0, 100 - alocado) / 100;
  }
  return rateio.filter((r) => r.id === centroCustoId).reduce((acc, r) => acc + r.percentual, 0) / 100;
}

/** Centros de custo que aparecem em algum rateio (+ o bucket "Sem centro de custo"). */
export function centrosCustoEmUso(
  rateioPorOs: Map<string, FatiaRateio[]>,
): Array<{ id: string; label: string }> {
  const porId = new Map<string, string>();
  for (const rateio of rateioPorOs.values()) {
    for (const r of rateio) porId.set(r.id, r.label);
  }
  return [
    ...[...porId]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    SEM_CENTRO_CUSTO,
  ];
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
      servico_id: o.id_servico,
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

export function kpisClientes(
  rows: ClienteRow[],
  fatPorCliente: Map<string, number>,
): KpisClientes {
  const ativos = rows.filter((r) => r.ativo);
  const faturamento_total = sum(rows, (r) => fatPorCliente.get(r.cliente_id) ?? 0);
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

/**
 * Faturamento por cliente a partir das OS **já filtradas e rateadas** (período,
 * dimensões e centro de custo). É a fonte única de "faturamento" da tela: os
 * cards de cliente e o KPI total saem daqui, não de `ClienteRow.faturamento_total`
 * (que soma todas as OS do cliente, ignorando os filtros).
 */
export function faturamentoPorCliente(os: OsRow[]): Map<string, number> {
  return groupSum(os, (o) => o.cliente_id, (o) => o.faturamento);
}

export function faturamentoPorTipo(
  rows: ClienteRow[],
  fatPorCliente: Map<string, number>,
): TipoFaturamento[] {
  const map = new Map<TipoCliente, number>();
  for (const r of rows) {
    map.set(r.tipo_cliente, (map.get(r.tipo_cliente) ?? 0) + (fatPorCliente.get(r.cliente_id) ?? 0));
  }
  return [...map]
    .map(([tipo, faturamento]) => ({ tipo, faturamento }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

/**
 * Divide o valor de UMA OS entre as fatias do rateio (centro de custo ou
 * produto): cada uma leva `valor * percentual / 100`.
 *
 * O que não está rateado — OS sem rateio nenhum, ou a sobra quando os
 * percentuais somam menos de 100% — vai para o bucket `semRateio`, para o total
 * continuar batendo com o KPI de faturamento.
 */
function rateiaOs(
  o: OsRow,
  rateioPorOs: Map<string, FatiaRateio[]>,
  semRateio: { id: string; label: string },
): Array<{ id: string; label: string; valor: number }> {
  const rateio = rateioPorOs.get(o.os_id) ?? [];
  const fatias = rateio.map((r) => ({
    id: r.id,
    label: r.label,
    valor: (o.faturamento * r.percentual) / 100,
  }));
  // Tolerância de 0.01pp para não criar bucket por arredondamento de rateio.
  const resto = 100 - rateio.reduce((acc, r) => acc + r.percentual, 0);
  if (resto > 0.01) {
    fatias.push({ ...semRateio, valor: (o.faturamento * resto) / 100 });
  }
  return fatias;
}

/** Mês ('YYYY-MM') de início da OS; OS sem data vão para uma coluna própria. */
function mesDaOs(o: OsRow): string {
  return o.data_inicio ? o.data_inicio.slice(0, 7) : SEM_DATA;
}

function montaMatriz(
  entradas: Array<{ id: string; label: string; mes: string; valor: number }>,
): MatrizMensal {
  const porId = new Map<string, MatrizLinha>();
  const meses = new Set<string>();
  let temSemData = false;

  for (const e of entradas) {
    if (e.mes === SEM_DATA) temSemData = true;
    else meses.add(e.mes);
    const linha = porId.get(e.id) ?? { id: e.id, label: e.label, porMes: {}, total: 0 };
    linha.porMes[e.mes] = (linha.porMes[e.mes] ?? 0) + e.valor;
    linha.total += e.valor;
    porId.set(e.id, linha);
  }

  return {
    meses: [...meses].sort(),
    temSemData,
    linhas: [...porId.values()].sort(
      (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'),
    ),
  };
}

/**
 * Comparativo com os MESMOS MESES do ano anterior: cada mês da visão atual
 * recua 12 meses (jan–jul/2026 → jan–jul/2025).
 *
 * `rows` são as OS com os filtros de dimensão e centro de custo já aplicados,
 * mas SEM o filtro de período — senão não haveria ano anterior para comparar.
 * OS sem data de início ficam fora dos dois lados (não dá para atribuir ano),
 * então `atual` aqui é menor que o KPI de faturamento total.
 */
export function comparativoAnoAnterior(rows: OsRow[], mesesAtuais: string[]): ComparativoAnual {
  const mesesAnteriores = mesesAtuais.map((m) => `${Number(m.slice(0, 4)) - 1}-${m.slice(5, 7)}`);
  const soma = (meses: string[]) => {
    const set = new Set(meses);
    return rows.reduce(
      (acc, o) => (o.data_inicio && set.has(o.data_inicio.slice(0, 7)) ? acc + o.faturamento : acc),
      0,
    );
  };
  const atual = soma(mesesAtuais);
  const anterior = soma(mesesAnteriores);
  return {
    atual,
    anterior,
    // Sem base no ano anterior não existe variação — travessão, nunca % inventado.
    variacao: anterior > 0 ? (atual - anterior) / anterior : null,
    meses: mesesAnteriores,
  };
}

/** Matriz × mês para dimensões 1:1 com a OS (cliente, serviço). */
function matrizPorChave(
  rows: OsRow[],
  chave: (o: OsRow) => { id: string; label: string },
): MatrizMensal {
  return montaMatriz(rows.map((o) => ({ ...chave(o), mes: mesDaOs(o), valor: o.faturamento })));
}

/** Matriz cliente × mês (uma linha por cliente, ordenada pelo total). */
export function matrizClientePorMes(rows: OsRow[]): MatrizMensal {
  return matrizPorChave(rows, (o) => ({ id: o.cliente_id, label: o.cliente_nome }));
}

/**
 * Matriz serviço × mês. O serviço é o `id_servico` da própria OS (1 por OS),
 * então aqui não há rateio nenhum: o valor da OS entra inteiro numa linha só.
 */
export function matrizServicoPorMes(rows: OsRow[]): MatrizMensal {
  return matrizPorChave(rows, (o) => (o.servico_id && o.servico_nome
    ? { id: o.servico_id, label: o.servico_nome }
    : SEM_SERVICO));
}

/**
 * Matriz produto × mês (`os_produtos_contratados`): a receita da OS é dividida
 * entre os produtos pelas horas contratadas (ou em partes iguais, quando a OS
 * não tem horas em todos). OS sem produto cadastrado caem em "Sem produto".
 */
export function matrizProdutoPorMes(
  rows: OsRow[],
  rateioProdutoPorOs: Map<string, FatiaRateio[]>,
): MatrizMensal {
  return montaMatriz(
    rows.flatMap((o) => rateiaOs(o, rateioProdutoPorOs, SEM_PRODUTO)
      .map((fatia) => ({ ...fatia, mes: mesDaOs(o) }))),
  );
}

/**
 * Matriz centro de custo × mês, com a receita de cada OS já dividida pelo rateio.
 * Com um centro selecionado no filtro, `rows` já chega com a fatia dele aplicada
 * (ver `shareCentroCusto`) — aí a matriz tem uma linha só, a do centro escolhido.
 */
export function matrizCentroCustoPorMes(
  rows: OsRow[],
  rateioPorOs: Map<string, FatiaRateio[]>,
  centroSelecionado: { id: string; label: string } | null,
): MatrizMensal {
  if (centroSelecionado) {
    return matrizPorChave(rows, () => centroSelecionado);
  }
  return montaMatriz(
    rows.flatMap((o) => rateiaOs(o, rateioPorOs, SEM_CENTRO_CUSTO)
      .map((fatia) => ({ ...fatia, mes: mesDaOs(o) }))),
  );
}

/** Faturamento por mês de INÍCIO da OS (ignora OS sem data_inicio — não dá para
 * posicionar numa linha do tempo). data_inicio tem melhor cobertura que data_emissao. */
export function faturamentoMensal(rows: OsRow[]): MesFaturamento[] {
  const comData = rows.filter((r) => r.data_inicio);
  return [...groupSum(comData, (r) => (r.data_inicio as string).slice(0, 7), (r) => r.faturamento)]
    .map(([mes, faturamento]) => ({ mes, faturamento }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
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
