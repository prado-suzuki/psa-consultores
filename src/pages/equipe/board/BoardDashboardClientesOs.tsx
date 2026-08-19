import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { AlertTriangle, ArrowUp, ArrowDown, ChevronsUpDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardChip } from '@/components/board/BoardChip';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import {
  kpisClientes, kpisOperacional, kpisProjetos,
  faturamentoPorTipo, faturamentoPorCliente, faturamentoMensal,
  matrizCentroCustoPorMes, matrizClientePorMes, matrizServicoPorMes, matrizProdutoPorMes,
  comparativoAnoAnterior,
  osPorStatus, estimadoVsRealizado,
  shareCentroCusto, centrosCustoEmUso,
} from '@/lib/dashboardClientesOs/aggregations';
import type { ClienteRow, OsRow, ProjetoRow, FatiaRateio } from '@/lib/dashboardClientesOs/types';
import { FaturamentoDetalhe, type Detalhe } from '@/components/equipe/board/clientes-os/FaturamentoDetalhe';
import { ChartEmpty } from '@/components/equipe/board/clientes-os/ChartEmpty';
import { KpiStrip } from '@/components/equipe/board/clientes-os/KpiStrip';
import { Field, DateField, SelectFilter } from '@/components/equipe/board/clientes-os/FiltroControles';
import {
  ACENTO, PAPEL, SERIES, AXIS, GRID, TOOLTIP, brl, brlMil, milAxis, num, pct, mesLabel, dataBR,
  th, td, rotuloMeses, variacaoLabel, corVariacao,
} from '@/components/equipe/board/clientes-os/shared';

type Aba = 'clientes' | 'operacional' | 'projetos';
type SortDir = 'asc' | 'desc';

// Referências estáveis para o estado vazio (evita re-render dos useMemo).
const EMPTY_CLIENTES: ClienteRow[] = [];
const EMPTY_OS: OsRow[] = [];
const EMPTY_PROJETOS: ProjetoRow[] = [];
const EMPTY_RATEIO: Map<string, FatiaRateio[]> = new Map();

const TODOS = '__todos__';
const PERIODO_VAZIO = '|';
const PERIODO_DEFAULT = '2026-01-01|'; // default: OS iniciadas a partir de 01/01/2026
const DEFAULTS = { periodo: PERIODO_DEFAULT, cliente: TODOS, tipo: TODOS, categoria: TODOS, centroCusto: TODOS };

// Recharts entrega o ponto clicado com tipagem frouxa; extraímos o campo com segurança.
const pickField = (d: unknown, field: string): string | undefined => {
  const rec = d as { [k: string]: unknown; payload?: { [k: string]: unknown } } | null;
  const direct = rec?.[field];
  if (typeof direct === 'string') return direct;
  const fromPayload = rec?.payload?.[field];
  return typeof fromPayload === 'string' ? fromPayload : undefined;
};

// ── Ordenação de tabela por clique na coluna ───────────────────────────
interface SortState<T> {
  sorted: T[];
  key: keyof T;
  dir: SortDir;
  toggle: (k: keyof T) => void;
}
function useSort<T>(rows: T[], initialKey: keyof T, initialDir: SortDir = 'desc'): SortState<T> {
  const [key, setKey] = useState<keyof T>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const av = a[key] as unknown;
      const bv = b[key] as unknown;
      let c = 0;
      if (typeof av === 'number' && typeof bv === 'number') c = av - bv;
      else if (av == null) c = -1;
      else if (bv == null) c = 1;
      else c = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return dir === 'asc' ? c : -c;
    });
    return arr;
  }, [rows, key, dir]);
  const toggle = (k: keyof T) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setKey(k); setDir('desc'); }
  };
  return { sorted, key, dir, toggle };
}

// Grids assimétricos: a série temporal e a tabela de nomes longos ganham mais largura
// que o donut / gráfico de poucas barras. minmax(0,..) evita estouro de conteúdo.
const gridMensalDonut: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, marginBottom: 16 };

function SortTh<T>({ label, colKey, sort, align = 'left' }: {
  label: string; colKey: keyof T; sort: SortState<T>; align?: 'left' | 'right';
}) {
  const active = sort.key === colKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th style={{ ...th, textAlign: align }} onClick={() => sort.toggle(colKey)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label}<Icon style={{ width: 11, height: 11, opacity: active ? 0.9 : 0.3, color: active ? ACENTO : 'currentColor' }} />
      </span>
    </th>
  );
}

export const DashboardClientesOsContent = ({
  scopeProjetosAClientesVisiveis = false,
  usarClusterGlobal = false,
}: {
  /** Área Gerencial: restringe a aba de projetos aos clientes visíveis (cluster). */
  scopeProjetosAClientesVisiveis?: boolean;
  /**
   * Board: obedece o seletor global de empresa da `BoardClusterBar`.
   *
   * Opt-in explícito, e não "o contexto devolve '' fora do provider": esta tela
   * também é a Gerencial do Tax e da OSG, e depender da posição na árvore faria
   * o dia em que alguém subir o Provider mais alto virar um recorte silencioso
   * naquelas telas.
   */
  usarClusterGlobal?: boolean;
} = {}) => {
  const { ambiente } = useDashboardAmbiente();
  const { data, isLoading, error, hoje } = useDashboardClientesOs(ambiente);
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({
    // v3: o filtro de cluster virou centro de custo (chaves salvas na sessão mudaram).
    pageKey: 'dashboard-clientes-os-v3', defaults: DEFAULTS,
  });
  // Hook chamado sempre (regra dos hooks); a prop decide se o valor vale.
  const { cluster } = useBoardCluster();
  const clusterGlobal = usarClusterGlobal ? cluster : '';
  const [aba, setAba] = useState<Aba>('clientes');
  const [detalhe, setDetalhe] = useState<Detalhe>('centro_custo');
  const revealRef = useBoardReveal();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [revealRef, isLoading, aba]);

  const clienteRows = data?.clienteRows ?? EMPTY_CLIENTES;
  const osRows = data?.osRows ?? EMPTY_OS;
  const projetoRows = data?.projetoRows ?? EMPTY_PROJETOS;
  const rateioPorOs = data?.rateioPorOs ?? EMPTY_RATEIO;
  const rateioProdutoPorOs = data?.rateioProdutoPorOs ?? EMPTY_RATEIO;

  // Opções de filtro derivadas dos dados.
  const clienteOptions = useMemo(() => [
    { value: TODOS, label: 'Todos os clientes' },
    ...clienteRows.slice().sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome))
      .map((c) => ({ value: c.cliente_id, label: c.cliente_nome })),
  ], [clienteRows]);
  const categoriaOptions = useMemo(() => [
    { value: TODOS, label: 'Todas as categorias' },
    ...[...new Set(clienteRows.map((c) => c.categoria))].sort().map((c) => ({ value: c, label: c })),
  ], [clienteRows]);
  const centroCustoOptions = useMemo(() => [
    { value: TODOS, label: 'Todos os centros de custo' },
    ...centrosCustoEmUso(rateioPorOs).map((c) => ({ value: c.id, label: c.label })),
  ], [rateioPorOs]);

  // Filtros ativos.
  const cliente = filters.cliente as string;
  const tipo = filters.tipo as string;
  const categoria = filters.categoria as string;
  const centroCusto = filters.centroCusto as string;
  const periodo = filters.periodo as string;
  const [de, ate] = periodo.split('|');
  const deDate = de ? new Date(`${de}T00:00:00`) : undefined;
  const ateDate = ate ? new Date(`${ate}T00:00:00`) : undefined;
  const mesSelecionado = de && ate && de.slice(0, 7) === ate.slice(0, 7) ? de.slice(0, 7) : null;

  // Cross-filter: clicar num gráfico alterna o filtro correspondente (toggle).
  const toggleFilter = useCallback((key: string, value: string | undefined) => {
    if (!value) return;
    setFilter(key, filters[key] === value ? TODOS : value);
  }, [filters, setFilter]);
  const toggleMes = useCallback((mes: string | undefined) => {
    if (!mes) return;
    const [y, m] = mes.split('-');
    const last = new Date(Number(y), Number(m), 0).getDate();
    const range = `${mes}-01|${mes}-${String(last).padStart(2, '0')}`;
    setFilter('periodo', periodo === range ? PERIODO_VAZIO : range);
  }, [periodo, setFilter]);

  /**
   * O recorte global EMPILHA com o centro de custo, não compete com ele: são
   * níveis diferentes da estrutura. A EMPRESA (cluster) inclui/exclui a OS
   * inteira — a OS tem um `cluster_id` só. O CENTRO DE CUSTO divide o
   * faturamento da OS que sobrou (`shareCentroCusto`), e ele é atributo da
   * ÁREA (`estrutura_areas.cost_center_id`), um nível ABAIXO da empresa. Por
   * isso a empresa entra aqui, no filtro de dimensão, e o rateio segue depois.
   *
   * `cluster_id` existe nas três linhas (`ClienteRow`, `OsRow`, `ProjetoRow`) e
   * resolve pela mesma cadeia, então um teste só cobre as três.
   */
  const matchDim = useCallback(
    (r: { cliente_id: string | null; tipo_cliente: string; categoria: string; cluster_id?: string }) =>
      (!clusterGlobal || r.cluster_id === clusterGlobal) &&
      (cliente === TODOS || r.cliente_id === cliente) &&
      (tipo === TODOS || r.tipo_cliente === tipo) &&
      (categoria === TODOS || r.categoria === categoria),
    [clusterGlobal, cliente, tipo, categoria],
  );

  const ccSelecionado = centroCusto === TODOS ? null : centroCusto;

  /**
   * OS com os filtros de dimensão e o faturamento JÁ RATEADO, mas SEM período:
   * sem centro de custo selecionado a OS entra inteira; com um centro entra só a
   * fatia dele (e as OS de fora do centro somem). É a base do comparativo com o
   * ano anterior — o período é aplicado depois, em `osFiltrado`.
   */
  const osDimensao: OsRow[] = useMemo(
    () => osRows.reduce<OsRow[]>((acc, o) => {
      if (!matchDim(o)) return acc;
      const share = shareCentroCusto(o.os_id, rateioPorOs, ccSelecionado);
      if (share <= 0) return acc;
      acc.push(share === 1 ? o : { ...o, faturamento: o.faturamento * share });
      return acc;
    }, []),
    [osRows, matchDim, rateioPorOs, ccSelecionado],
  );

  /**
   * Recorte de período por DATA DE INÍCIO, mantendo OS sem data (null nunca é
   * excluída): 60% das OS não têm data_inicio; excluí-las esvaziaria o painel.
   * Todo "faturamento" da tela sai daqui, então os cards, o gráfico mensal e a
   * carteira mostram sempre o mesmo total.
   */
  const osFiltrado: OsRow[] = useMemo(
    () => osDimensao.filter((o) => {
      if (!o.data_inicio) return true;
      if (de && o.data_inicio < de) return false;
      if (ate && o.data_inicio > ate) return false;
      return true;
    }),
    [osDimensao, de, ate],
  );

  // Com centro de custo selecionado, a carteira de clientes é a dos que têm OS nele.
  const clientesFiltrados: ClienteRow[] = useMemo(() => {
    const base = clienteRows.filter(matchDim);
    if (!ccSelecionado) return base;
    const comOs = new Set(osFiltrado.map((o) => o.cliente_id));
    return base.filter((c) => comOs.has(c.cliente_id));
  }, [clienteRows, matchDim, ccSelecionado, osFiltrado]);
  // Escopo opcional (Gerencial): org_projects segue a regra de projetos
  // (participação/área), não o cluster; aqui restringimos a aba de projetos aos
  // clientes visíveis (que já vêm por cluster via RLS de cliente). Não mexe na
  // RLS nem na ferramenta de Projetos e Tarefas — Board mantém a prop desligada.
  const projetoRowsEscopado = useMemo(() => {
    if (!scopeProjetosAClientesVisiveis) return projetoRows;
    const visiveis = new Set(clienteRows.map((c) => c.cliente_id));
    return projetoRows.filter((p) => p.cliente_id != null && visiveis.has(p.cliente_id));
  }, [scopeProjetosAClientesVisiveis, projetoRows, clienteRows]);
  const projetosFiltrado: ProjetoRow[] = useMemo(() => {
    const base = projetoRowsEscopado.filter(matchDim);
    if (!ccSelecionado) return base;
    const osDoCentro = new Set(osFiltrado.map((o) => o.os_id));
    return base.filter((p) => p.os_id != null && osDoCentro.has(p.os_id));
  }, [projetoRowsEscopado, matchDim, ccSelecionado, osFiltrado]);

  // KPIs / séries. `fatPorCliente` é a fonte única de faturamento da tela.
  const fatPorCliente = useMemo(() => faturamentoPorCliente(osFiltrado), [osFiltrado]);
  const kClientes = useMemo(() => kpisClientes(clientesFiltrados, fatPorCliente), [clientesFiltrados, fatPorCliente]);
  const kOper = useMemo(() => kpisOperacional(clientesFiltrados, hoje), [clientesFiltrados, hoje]);
  const kProj = useMemo(() => kpisProjetos(projetosFiltrado, osFiltrado), [projetosFiltrado, osFiltrado]);
  const serieMensal = useMemo(() => faturamentoMensal(osFiltrado).map((m) => ({ ...m, label: mesLabel(m.mes) })), [osFiltrado]);
  const serieTipo = useMemo(
    () => faturamentoPorTipo(clientesFiltrados, fatPorCliente).filter((t) => t.faturamento > 0),
    [clientesFiltrados, fatPorCliente],
  );
  const totalTipo = useMemo(() => serieTipo.reduce((a, t) => a + t.faturamento, 0), [serieTipo]);
  // Detalhamento (centro de custo × cliente): alimenta o gráfico de barras E a
  // matriz por mês logo abaixo, para os dois nunca divergirem.
  const centroSelecionado = useMemo(
    () => (ccSelecionado
      ? { id: ccSelecionado, label: centroCustoOptions.find((o) => o.value === ccSelecionado)?.label ?? ccSelecionado }
      : null),
    [ccSelecionado, centroCustoOptions],
  );
  const matriz = useMemo(() => {
    if (detalhe === 'centro_custo') return matrizCentroCustoPorMes(osFiltrado, rateioPorOs, centroSelecionado);
    if (detalhe === 'servico') return matrizServicoPorMes(osFiltrado);
    if (detalhe === 'produto') return matrizProdutoPorMes(osFiltrado, rateioProdutoPorOs);
    return matrizClientePorMes(osFiltrado);
  }, [detalhe, osFiltrado, rateioPorOs, rateioProdutoPorOs, centroSelecionado]);
  // Comparativo: os mesmos meses que a tela está mostrando, um ano antes.
  const comparativo = useMemo(
    () => comparativoAnoAnterior(osDimensao, matriz.meses),
    [osDimensao, matriz.meses],
  );
  const serieStatus = useMemo(() => osPorStatus(osFiltrado), [osFiltrado]);
  const serieHoras = useMemo(
    () => estimadoVsRealizado(projetosFiltrado).map((p) => ({
      ...p, nome: p.projeto_nome.length > 18 ? `${p.projeto_nome.slice(0, 18)}…` : p.projeto_nome,
    })),
    [projetosFiltrado],
  );
  const maxStatus = Math.max(1, ...serieStatus.map((s) => s.qtd));

  // Ordenação das tabelas.
  const carteiraSort = useSort(osFiltrado, 'cliente_nome', 'asc');
  const detalheSort = useSort(projetosFiltrado, 'horas_estimadas', 'desc');

  const tipoOptions = [
    { value: TODOS, label: 'Todos os tipos' }, { value: 'Fixo', label: 'Fixo' },
    { value: 'Pontual', label: 'Pontual' }, { value: 'Em Análise', label: 'Em Análise' },
    { value: 'Não informado', label: 'Não informado' },
  ];

  return (
      <div ref={containerRef} style={{ background: 'var(--board-v4-page)' }}>
        <div className="pg-head">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="pg-title">Dashboard · Clientes e OS</div>
              <div className="pg-sub">Dados ao vivo do Supabase · clique nos gráficos para filtrar e nos títulos das colunas para ordenar</div>
            </div>
            <div className="v3-segs">
              {([['clientes', 'Clientes'], ['operacional', 'Operacional'], ['projetos', 'OS / Projetos']] as const).map(([k, l]) => (
                <button key={k} className={`v3-seg ${aba === k ? 'on' : ''}`} onClick={() => setAba(k as Aba)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="v4-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 }}>
            <Field label="Período (início da OS)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DateField value={deDate} placeholder="Data inicial" onChange={(d) => setFilter('periodo', `${d ? format(d, 'yyyy-MM-dd') : ''}|${ate}`)} />
                <span style={{ fontSize: 11, color: 'var(--board-v4-ink3)' }}>até</span>
                <DateField value={ateDate} placeholder="Data final" onChange={(d) => setFilter('periodo', `${de}|${d ? format(d, 'yyyy-MM-dd') : ''}`)} />
              </div>
            </Field>
            <Field label="Cliente">
              <SelectFilter value={cliente} onChange={(v) => setFilter('cliente', v)} options={clienteOptions} width={210} />
            </Field>
            <Field label="Tipo">
              <SelectFilter value={tipo} onChange={(v) => setFilter('tipo', v)} options={tipoOptions} width={150} />
            </Field>
            <Field label="Categoria">
              <SelectFilter value={categoria} onChange={(v) => setFilter('categoria', v)} options={categoriaOptions} width={160} />
            </Field>
            <Field label="Centro de custo">
              <SelectFilter value={centroCusto} onChange={(v) => setFilter('centroCusto', v)} options={centroCustoOptions} width={220} />
            </Field>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-sm" style={{ color: 'var(--board-v4-risk)' }}>
                <X className="mr-1 h-4 w-4" /> Limpar ({activeCount})
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="v4-card" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'hsl(var(--destructive))' }}>
            <AlertTriangle style={{ width: 18, height: 18 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Erro ao carregar os dados</div>
              <div style={{ fontSize: 12, color: 'var(--board-v4-ink3)' }}>{error.message}</div>
            </div>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[420px] rounded-xl" />
        ) : (
          <>
            {/* ── ABA CLIENTES ─────────────────────────────────────── */}
            {aba === 'clientes' && (
              <>
                {/* Barra colorida do KPI: o que é só identidade sai na paleta
                    categórica da área (SERIES, na ordem); o que é ESTADO
                    (variação, contrato vencendo) sai no papel de status. */}
                <KpiStrip
                  items={[
                    { value: brl(kClientes.faturamento_total), label: 'Faturamento total', color: SERIES[0] },
                    {
                      value: variacaoLabel(comparativo.variacao),
                      label: 'vs. mesmo período do ano anterior',
                      color: corVariacao(comparativo.variacao),
                      subText: comparativo.meses.length === 0
                        ? 'sem OS com data de início no período'
                        : `${rotuloMeses(comparativo.meses)}: ${brlMil(comparativo.anterior)} · só OS com data de início`,
                    },
                    { value: kClientes.clientes_ativos, label: 'Clientes ativos', color: SERIES[1], subText: `${kClientes.clientes_ativos_fixos} fixos · ${kClientes.clientes_ativos_pontuais} pontuais` },
                    { value: kClientes.ticket_medio == null ? '—' : brl(kClientes.ticket_medio), label: 'Ticket médio', color: SERIES[2] },
                    { value: kClientes.os_ativas, label: 'OS ativas', color: SERIES[3] },
                    { value: kClientes.contratos_30d, label: 'Contratos vencendo 30d', color: PAPEL.atencao },
                  ]}
                />

                <div style={gridMensalDonut}>
                  <div className="v4-card">
                    <div className="v4-card-title">Faturamento mensal (R$)</div>
                    {serieMensal.length > 0 ? (
                      <div style={{ cursor: 'pointer' }}>
                        <ResponsiveContainer width="100%" height={210}>
                          <BarChart data={serieMensal} onClick={(e) => toggleMes(pickField(e?.activePayload?.[0], 'mes'))}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="label" {...AXIS} />
                            <YAxis {...AXIS} tickFormatter={milAxis} />
                            <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP} />
                            <Bar dataKey="faturamento" radius={[4, 4, 0, 0]} maxBarSize={54}>
                              {serieMensal.map((m) => (
                                <Cell key={m.mes} fill={ACENTO} fillOpacity={mesSelecionado && m.mes !== mesSelecionado ? 0.28 : 1} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <ChartEmpty msg="Sem OS com data de emissão no período" />}
                  </div>

                  <div className="v4-card">
                    <div className="v4-card-title">Faturamento por tipo de cliente</div>
                    {serieTipo.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 4 }}>
                        <div style={{ position: 'relative', width: 208, height: 208, cursor: 'pointer' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={serieTipo} dataKey="faturamento" nameKey="tipo"
                                innerRadius={66} outerRadius={98} paddingAngle={serieTipo.length > 1 ? 2 : 0} stroke="none"
                                onClick={(e) => toggleFilter('tipo', pickField(e, 'tipo'))}
                              >
                                {serieTipo.map((t, i) => (
                                  <Cell key={t.tipo} fill={SERIES[i % SERIES.length]} fillOpacity={tipo !== TODOS && t.tipo !== tipo ? 0.28 : 1} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>Total</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--board-v4-ink)' }}>{brlMil(totalTipo)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                          {serieTipo.map((t, i) => {
                            const on = tipo === t.tipo;
                            return (
                              <button
                                key={t.tipo}
                                onClick={() => toggleFilter('tipo', t.tipo)}
                                title={`Filtrar por ${t.tipo}`}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 7, width: '100%',
                                  border: `1px solid ${on ? 'var(--board-v4-line)' : 'transparent'}`,
                                  background: on ? 'var(--board-v4-surface2)' : 'transparent', cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: SERIES[i % SERIES.length], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--board-v4-ink)', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.tipo}</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--board-v4-ink)', minWidth: 48, textAlign: 'right' }}>{((t.faturamento / totalTipo) * 100).toFixed(1)}%</span>
                                <span style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', minWidth: 66, textAlign: 'right' }}>{brlMil(t.faturamento)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : <ChartEmpty msg="Sem dados" />}
                  </div>
                </div>

                <FaturamentoDetalhe detalhe={detalhe} onDetalheChange={setDetalhe} matriz={matriz} />
              </>
            )}

            {/* ── ABA OPERACIONAL ──────────────────────────────────── */}
            {aba === 'operacional' && (
              <>
                <KpiStrip
                  items={[
                    { value: kOper.contratos_30d, label: 'Contratos vencendo em 30 dias', color: PAPEL.atencao },
                    { value: kOper.contratos_vencidos, label: 'Contratos vencidos (renovar)', color: PAPEL.problema },
                    { value: kOper.novos_clientes_trimestre, label: 'Novos clientes no trimestre', color: SERIES[0] },
                    { value: clientesFiltrados.length, label: 'Clientes na carteira', color: SERIES[1] },
                  ]}
                />

                <div className="v4-card">
                  <div className="v4-card-title">Carteira completa ({osFiltrado.length} OS)</div>
                  {osFiltrado.length > 0 ? (
                    <div style={{ maxHeight: 520, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <SortTh label="Cliente" colKey="cliente_nome" sort={carteiraSort} />
                            <SortTh label="Tipo" colKey="tipo_cliente" sort={carteiraSort} />
                            <SortTh label="Categoria" colKey="categoria" sort={carteiraSort} />
                            <SortTh label="Início" colKey="data_inicio" sort={carteiraSort} />
                            <SortTh label="Fim" colKey="data_fim" sort={carteiraSort} />
                            <SortTh label="Status contrato" colKey="status_contrato" sort={carteiraSort} />
                            <SortTh label="Faturamento" colKey="faturamento" sort={carteiraSort} align="right" />
                          </tr>
                        </thead>
                        <tbody>
                          {carteiraSort.sorted.map((o) => (
                            <tr key={o.os_id}>
                              <td style={{ ...td, fontWeight: 500 }}>{o.cliente_nome}</td>
                              <td style={td}>{o.tipo_cliente}</td>
                              <td style={td}>{o.categoria}</td>
                              <td style={td}>{dataBR(o.data_inicio)}</td>
                              <td style={td}>{dataBR(o.data_fim)}</td>
                              <td style={td}>
                                <BoardChip variant={
                                  o.status_contrato === 'Vencido' ? 'risk'
                                    : o.status_contrato === 'Vence em 30 dias' ? 'warn'
                                      : o.status_contrato === 'Vigente' ? 'go' : 'dev'
                                }>{o.status_contrato}</BoardChip>
                              </td>
                              <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{brl(o.faturamento)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <ChartEmpty msg="Sem contratos/OS" />}
                </div>
              </>
            )}

            {/* ── ABA OS / PROJETOS ────────────────────────────────── */}
            {aba === 'projetos' && (
              <>
                <KpiStrip
                  items={[
                    { value: kProj.os_em_andamento, label: 'OS em andamento', color: SERIES[0], subText: `de ${kProj.os_total} OS` },
                    { value: `${num(kProj.horas_estimadas)} h`, label: 'Horas estimadas', color: SERIES[1] },
                    { value: `${num(kProj.horas_realizadas)} h`, label: 'Horas realizadas', color: SERIES[2] },
                    { value: pct(kProj.desvio_medio), label: 'Desvio médio', color: PAPEL.atencao },
                    { value: projetosFiltrado.length, label: 'Projetos', color: SERIES[3] },
                  ]}
                />

                <div className="v4-g2">
                  <div className="v4-card">
                    <div className="v4-card-title">Estimado × realizado por projeto (h)</div>
                    {serieHoras.length > 0 ? (
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={serieHoras}>
                          <CartesianGrid {...GRID} />
                          <XAxis dataKey="nome" {...AXIS} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis {...AXIS} />
                          <Tooltip formatter={(v: number) => `${num(v)} h`} {...TOOLTIP} />
                          <Bar dataKey="horas_estimadas" name="Estimadas" fill={SERIES[0]} radius={[3, 3, 0, 0]} />
                          <Bar dataKey="horas_realizadas" name="Realizadas" fill={SERIES[1]} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <ChartEmpty msg="Sem horas apontadas" />}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}>
                      {[{ c: SERIES[0], l: 'Estimadas' }, { c: SERIES[1], l: 'Realizadas' }].map((x) => (
                        <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--board-v4-ink3)' }}>
                          <div style={{ width: 9, height: 9, borderRadius: 2, background: x.c }} />{x.l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="v4-card">
                    <div className="v4-card-title">OS por status</div>
                    {serieStatus.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
                        {serieStatus.map((s, i) => (
                          <div key={s.status}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: 'var(--board-v4-ink)' }}>{s.status}</span>
                              <span style={{ fontWeight: 700, color: 'var(--board-v4-ink)' }}>{s.qtd}</span>
                            </div>
                            <div className="v4-pb v4-pb6">
                              <div className="v4-pbf" style={{ width: `${(s.qtd / maxStatus) * 100}%`, background: SERIES[i % SERIES.length] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <ChartEmpty msg="Sem OS" />}
                  </div>
                </div>

                <div className="v4-card">
                  <div className="v4-card-title">Detalhamento de projetos e OS</div>
                  {projetosFiltrado.length > 0 ? (
                    <div style={{ maxHeight: 460, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <SortTh label="Projeto" colKey="projeto_nome" sort={detalheSort} />
                            <SortTh label="Cliente" colKey="cliente_nome" sort={detalheSort} />
                            <SortTh label="Status" colKey="status_projeto_label" sort={detalheSort} />
                            <SortTh label="Est. (h)" colKey="horas_estimadas" sort={detalheSort} align="right" />
                            <SortTh label="Real. (h)" colKey="horas_realizadas" sort={detalheSort} align="right" />
                            <SortTh label="Desvio" colKey="desvio_pct" sort={detalheSort} align="right" />
                            <SortTh label="Prazo" colKey="os_data_fim" sort={detalheSort} />
                          </tr>
                        </thead>
                        <tbody>
                          {detalheSort.sorted.map((p) => (
                            <tr key={p.projeto_id}>
                              <td style={{ ...td, fontWeight: 500 }}>{p.projeto_nome}</td>
                              <td style={td}>{p.cliente_nome ?? '—'}</td>
                              <td style={td}>{p.status_projeto_label}</td>
                              <td style={{ ...td, textAlign: 'right' }}>{num(p.horas_estimadas)}</td>
                              <td style={{ ...td, textAlign: 'right' }}>{num(p.horas_realizadas)}</td>
                              <td style={{ ...td, textAlign: 'right', color: p.desvio_pct != null && p.desvio_pct > 0 ? PAPEL.problema : PAPEL.bom }}>{pct(p.desvio_pct)}</td>
                              <td style={td}>{dataBR(p.os_data_fim)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <ChartEmpty msg="Sem projetos" />}
                </div>
              </>
            )}
          </>
        )}
      </div>
  );
};

// Wrapper de rota do Board: o conteúdo nativo (DashboardClientesOsContent) é
// reaproveitado na área Gerencial da Tax (/equipe/tax/gerencial) dentro do
// FiscalLayout, então o miolo vive separado do layout.
const BoardDashboardClientesOs = () => (
  <BoardLayout title="Clientes e OS" subtitle="Painel nativo (teste)">
    <DashboardClientesOsContent usarClusterGlobal />
  </BoardLayout>
);

export default BoardDashboardClientesOs;
