import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from 'recharts';
import { BarChart2, AlertTriangle, ArrowUp, ArrowDown, ChevronsUpDown, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BoardChip } from '@/components/board/BoardChip';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import {
  kpisClientes, kpisOperacional, kpisProjetos,
  faturamentoPorCategoria, faturamentoPorCluster, faturamentoMensal,
  top10Clientes, osPorStatus, estimadoVsRealizado,
} from '@/lib/dashboardClientesOs/aggregations';
import type { ClienteRow, OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';

type Aba = 'clientes' | 'operacional' | 'projetos';
type SortDir = 'asc' | 'desc';

// Referências estáveis para o estado vazio (evita re-render dos useMemo).
const EMPTY_CLIENTES: ClienteRow[] = [];
const EMPTY_OS: OsRow[] = [];
const EMPTY_PROJETOS: ProjetoRow[] = [];

const TODOS = '__todos__';
const PERIODO_VAZIO = '|';
const PERIODO_DEFAULT = '2026-01-01|'; // default: OS iniciadas a partir de 01/01/2026
const DEFAULTS = { periodo: PERIODO_DEFAULT, cliente: TODOS, tipo: TODOS, categoria: TODOS, cluster: TODOS };

// Paleta da marca PSA (tokens de src/index.css: --lime-*, --teal-*, --osg-moss).
const PSA = {
  lime: '#8CC63F',
  teal: '#0D877C',
  moss: '#125837',
  tealLight: '#4FB0A5',
  amber: '#D4820A',
  risk: '#D03040',
  grey: '#9AA7B4',
};
const SERIES = [PSA.teal, PSA.lime, PSA.moss, PSA.tealLight, PSA.amber, PSA.grey];

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const brlMil = (v: number) => `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;
const milAxis = (v: number) => (v === 0 ? '0' : `${(v / 1000).toLocaleString('pt-BR')} mil`);
const num = (v: number, dec = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: dec });
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const mesLabel = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(2, 4)}`;
const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

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

const th: React.CSSProperties = {
  textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 700,
  color: 'var(--board-v4-ink3)', borderBottom: '1px solid var(--board-v4-line)', whiteSpace: 'nowrap',
  cursor: 'pointer', userSelect: 'none',
};
const td: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, color: 'var(--board-v4-ink)',
  borderBottom: '1px solid var(--board-v4-line)',
};

// Grids assimétricos: a série temporal e a tabela de nomes longos ganham mais largura
// que o donut / gráfico de poucas barras. minmax(0,..) evita estouro de conteúdo.
const gridMensalDonut: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 12, marginBottom: 16 };
const gridClusterTop: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: 12, marginBottom: 16 };

// Controles de filtro usando os componentes de UI do projeto (shadcn), não os nativos.
const fieldLabelCss: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
  color: 'var(--board-v4-ink3)', marginBottom: 5, display: 'block',
};
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={fieldLabelCss}>{label}</span>
    {children}
  </div>
);

const DateField = ({ value, onChange, placeholder }: {
  value?: Date; onChange: (d?: Date) => void; placeholder: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className={cn('h-9 justify-start text-sm font-normal', !value && 'text-muted-foreground')}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar selected={value} onSelect={onChange} />
    </PopoverContent>
  </Popover>
);

const SelectFilter = ({ value, onChange, options, width }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; width: number;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-9 text-sm" style={{ width }}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

// Eixos dos gráficos: texto mais escuro/legível (o default do board é cinza-claro demais).
const AXIS = {
  tick: { fontSize: 11, fill: '#566173', fontFamily: "'Instrument Sans', sans-serif" },
  axisLine: { stroke: '#E4E9F0' },
  tickLine: false as const,
};

// KPI card: TÍTULO acima do número, em cor legível (não o cinza apagado do stat-label padrão).
interface KpiItem { value: React.ReactNode; label: string; color: string; subText?: string; }
const KpiStrip = ({ items }: { items: KpiItem[] }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
    background: 'var(--board-v4-surface)', border: '1px solid var(--board-v4-line)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  }}>
    {items.map((it, i) => (
      <div key={i} style={{ padding: '18px 22px 16px', position: 'relative', borderLeft: i > 0 ? '1px solid var(--board-v4-line)' : undefined }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: it.color }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--board-v4-ink2)', marginBottom: 8 }}>{it.label}</div>
        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--board-v4-ink)', fontVariantNumeric: 'tabular-nums' }}>{it.value}</div>
        {it.subText && <div style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', marginTop: 8 }}>{it.subText}</div>}
      </div>
    ))}
  </div>
);

function SortTh<T>({ label, colKey, sort, align = 'left' }: {
  label: string; colKey: keyof T; sort: SortState<T>; align?: 'left' | 'right';
}) {
  const active = sort.key === colKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th style={{ ...th, textAlign: align }} onClick={() => sort.toggle(colKey)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label}<Icon style={{ width: 11, height: 11, opacity: active ? 0.9 : 0.3, color: active ? PSA.teal : 'currentColor' }} />
      </span>
    </th>
  );
}

const ChartEmpty = ({ msg }: { msg: string }) => (
  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
    <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />
    {msg}
  </div>
);

const BoardDashboardClientesOs = () => {
  const { ambiente } = useDashboardAmbiente();
  const { data, isLoading, error, hoje } = useDashboardClientesOs(ambiente);
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({
    pageKey: 'dashboard-clientes-os-v2', defaults: DEFAULTS,
  });
  const [aba, setAba] = useState<Aba>('clientes');
  const revealRef = useBoardReveal();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) revealRef(containerRef.current);
  }, [revealRef, isLoading, aba]);

  const clienteRows = data?.clienteRows ?? EMPTY_CLIENTES;
  const osRows = data?.osRows ?? EMPTY_OS;
  const projetoRows = data?.projetoRows ?? EMPTY_PROJETOS;

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
  const clusterOptions = useMemo(() => [
    { value: TODOS, label: 'Todos os clusters' },
    ...[...new Set(clienteRows.map((c) => c.cluster_nome))].sort().map((c) => ({ value: c, label: c })),
  ], [clienteRows]);

  // Filtros ativos.
  const cliente = filters.cliente as string;
  const tipo = filters.tipo as string;
  const categoria = filters.categoria as string;
  const cluster = filters.cluster as string;
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

  const matchDim = useCallback(
    (r: { cliente_id: string | null; tipo_cliente: string; categoria: string; cluster_nome: string }) =>
      (cliente === TODOS || r.cliente_id === cliente) &&
      (tipo === TODOS || r.tipo_cliente === tipo) &&
      (categoria === TODOS || r.categoria === categoria) &&
      (cluster === TODOS || r.cluster_nome === cluster),
    [cliente, tipo, categoria, cluster],
  );

  const clientesFiltrados: ClienteRow[] = useMemo(() => clienteRows.filter(matchDim), [clienteRows, matchDim]);
  const osFiltrado: OsRow[] = useMemo(
    () => osRows.filter((o) => {
      if (!matchDim(o)) return false;
      // Filtro por DATA DE INÍCIO da OS, mantendo OS sem data (null nunca é excluída):
      // 60% das OS não têm data_inicio; excluí-las esvaziaria o painel.
      if (o.data_inicio) {
        if (de && o.data_inicio < de) return false;
        if (ate && o.data_inicio > ate) return false;
      }
      return true;
    }),
    [osRows, matchDim, de, ate],
  );
  const projetosFiltrado: ProjetoRow[] = useMemo(() => projetoRows.filter(matchDim), [projetoRows, matchDim]);

  // KPIs / séries.
  const kClientes = useMemo(() => kpisClientes(clientesFiltrados), [clientesFiltrados]);
  const kOper = useMemo(() => kpisOperacional(clientesFiltrados, hoje), [clientesFiltrados, hoje]);
  const kProj = useMemo(() => kpisProjetos(projetosFiltrado, osFiltrado), [projetosFiltrado, osFiltrado]);
  const serieMensal = useMemo(() => faturamentoMensal(osFiltrado).map((m) => ({ ...m, label: mesLabel(m.mes) })), [osFiltrado]);
  const serieCategoria = useMemo(() => faturamentoPorCategoria(clientesFiltrados).filter((c) => c.faturamento > 0), [clientesFiltrados]);
  const totalCategoria = useMemo(() => serieCategoria.reduce((a, c) => a + c.faturamento, 0), [serieCategoria]);
  const serieCluster = useMemo(() => faturamentoPorCluster(clientesFiltrados), [clientesFiltrados]);
  const top10 = useMemo(() => top10Clientes(clientesFiltrados), [clientesFiltrados]);
  const maxTop = Math.max(1, ...top10.map((c) => c.faturamento_total));
  const serieStatus = useMemo(() => osPorStatus(osFiltrado), [osFiltrado]);
  const serieHoras = useMemo(
    () => estimadoVsRealizado(projetosFiltrado).map((p) => ({
      ...p, nome: p.projeto_nome.length > 18 ? `${p.projeto_nome.slice(0, 18)}…` : p.projeto_nome,
    })),
    [projetosFiltrado],
  );
  const maxStatus = Math.max(1, ...serieStatus.map((s) => s.qtd));

  // Ordenação das tabelas.
  const topSort = useSort(top10, 'faturamento_total', 'desc');
  const carteiraSort = useSort(osFiltrado, 'cliente_nome', 'asc');
  const detalheSort = useSort(projetosFiltrado, 'horas_estimadas', 'desc');

  const tipoOptions = [
    { value: TODOS, label: 'Todos os tipos' }, { value: 'Fixo', label: 'Fixo' },
    { value: 'Pontual', label: 'Pontual' }, { value: 'Em Análise', label: 'Em Análise' },
    { value: 'Não informado', label: 'Não informado' },
  ];

  return (
    <BoardLayout title="Clientes e OS" subtitle="Painel nativo (teste)">
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
            <Field label="Cluster">
              <SelectFilter value={cluster} onChange={(v) => setFilter('cluster', v)} options={clusterOptions} width={160} />
            </Field>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-sm" style={{ color: 'var(--board-v4-risk)' }}>
                <X className="mr-1 h-4 w-4" /> Limpar ({activeCount})
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="v4-card" style={{ display: 'flex', gap: 10, alignItems: 'center', color: PSA.risk }}>
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
                <KpiStrip
                  items={[
                    { value: brl(kClientes.faturamento_total), label: 'Faturamento total', color: PSA.lime },
                    { value: kClientes.clientes_ativos, label: 'Clientes ativos', color: PSA.teal, subText: `${kClientes.clientes_ativos_fixos} fixos · ${kClientes.clientes_ativos_pontuais} pontuais` },
                    { value: kClientes.ticket_medio == null ? '—' : brl(kClientes.ticket_medio), label: 'Ticket médio', color: PSA.moss },
                    { value: kClientes.os_ativas, label: 'OS ativas', color: PSA.tealLight },
                    { value: kClientes.contratos_30d, label: 'Contratos vencendo 30d', color: PSA.amber },
                  ]}
                />

                <div style={gridMensalDonut}>
                  <div className="v4-card">
                    <div className="v4-card-title">Faturamento mensal (R$)</div>
                    {serieMensal.length > 0 ? (
                      <div style={{ cursor: 'pointer' }}>
                        <ResponsiveContainer width="100%" height={210}>
                          <BarChart data={serieMensal} onClick={(e) => toggleMes(pickField(e?.activePayload?.[0], 'mes'))}>
                            <CartesianGrid {...GRID_STYLE} />
                            <XAxis dataKey="label" {...AXIS} />
                            <YAxis {...AXIS} tickFormatter={milAxis} />
                            <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP_STYLE} />
                            <Bar dataKey="faturamento" radius={[4, 4, 0, 0]} maxBarSize={54}>
                              {serieMensal.map((m) => (
                                <Cell key={m.mes} fill={PSA.lime} fillOpacity={mesSelecionado && m.mes !== mesSelecionado ? 0.28 : 1} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <ChartEmpty msg="Sem OS com data de emissão no período" />}
                  </div>

                  <div className="v4-card">
                    <div className="v4-card-title">Faturamento por categoria</div>
                    {serieCategoria.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 4 }}>
                        <div style={{ position: 'relative', width: 208, height: 208, cursor: 'pointer' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={serieCategoria} dataKey="faturamento" nameKey="categoria"
                                innerRadius={66} outerRadius={98} paddingAngle={serieCategoria.length > 1 ? 2 : 0} stroke="none"
                                onClick={(e) => toggleFilter('categoria', pickField(e, 'categoria'))}
                              >
                                {serieCategoria.map((c, i) => (
                                  <Cell key={c.categoria} fill={SERIES[i % SERIES.length]} fillOpacity={categoria !== TODOS && c.categoria !== categoria ? 0.28 : 1} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP_STYLE} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>Total</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--board-v4-ink)' }}>{brlMil(totalCategoria)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                          {serieCategoria.map((c, i) => {
                            const on = categoria === c.categoria;
                            return (
                              <button
                                key={c.categoria}
                                onClick={() => toggleFilter('categoria', c.categoria)}
                                title={`Filtrar por ${c.categoria}`}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 7, width: '100%',
                                  border: `1px solid ${on ? 'var(--board-v4-line)' : 'transparent'}`,
                                  background: on ? 'var(--board-v4-surface2)' : 'transparent', cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: SERIES[i % SERIES.length], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--board-v4-ink)', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.categoria}</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--board-v4-ink)', minWidth: 48, textAlign: 'right' }}>{((c.faturamento / totalCategoria) * 100).toFixed(1)}%</span>
                                <span style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', minWidth: 66, textAlign: 'right' }}>{brlMil(c.faturamento)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : <ChartEmpty msg="Sem dados" />}
                  </div>
                </div>

                <div style={gridClusterTop}>
                  <div className="v4-card">
                    <div className="v4-card-title">Faturamento por cluster</div>
                    {serieCluster.length > 0 ? (
                      <div style={{ cursor: 'pointer' }}>
                        <ResponsiveContainer width="100%" height={Math.max(130, serieCluster.length * 50)}>
                          <BarChart data={serieCluster} layout="vertical" margin={{ top: 4, right: 74, bottom: 4, left: 4 }}>
                            <CartesianGrid {...GRID_STYLE} horizontal={false} />
                            <XAxis type="number" {...AXIS} tickFormatter={milAxis} />
                            <YAxis type="category" dataKey="cluster" {...AXIS} width={116} />
                            <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(13,135,124,.06)' }} />
                            <Bar dataKey="faturamento" radius={[0, 4, 4, 0]} maxBarSize={30} onClick={(e) => toggleFilter('cluster', pickField(e, 'cluster'))}>
                              {serieCluster.map((c) => (
                                <Cell key={c.cluster} fill={PSA.teal} fillOpacity={cluster !== TODOS && c.cluster !== cluster ? 0.28 : 1} />
                              ))}
                              <LabelList dataKey="faturamento" position="right" formatter={(v: number | string) => brlMil(Number(v))} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--board-v4-ink2)' }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <ChartEmpty msg="Sem dados" />}
                  </div>

                  <div className="v4-card">
                    <div className="v4-card-title">Top 10 clientes por faturamento (R$)</div>
                    {top10.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <SortTh label="Cliente" colKey="cliente_nome" sort={topSort} />
                            <SortTh label="Tipo" colKey="tipo_cliente" sort={topSort} />
                            <SortTh label="Categoria" colKey="categoria" sort={topSort} />
                            <SortTh label="Faturamento" colKey="faturamento_total" sort={topSort} align="right" />
                          </tr>
                        </thead>
                        <tbody>
                          {topSort.sorted.map((c) => (
                            <tr key={c.cliente_id}>
                              <td style={{ ...td, fontWeight: 500 }}>{c.cliente_nome}</td>
                              <td style={td}>{c.tipo_cliente}</td>
                              <td style={td}>{c.categoria}</td>
                              <td style={td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                  <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{brlMil(c.faturamento_total)}</span>
                                  <div style={{ width: 80, height: 9, background: '#EEF2F6', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                                    <div style={{ width: `${(c.faturamento_total / maxTop) * 100}%`, height: '100%', background: PSA.teal }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td style={{ ...td, fontWeight: 700, borderTop: '2px solid var(--board-v4-line)' }}>Total geral</td>
                            <td style={{ ...td, borderTop: '2px solid var(--board-v4-line)' }} />
                            <td style={{ ...td, borderTop: '2px solid var(--board-v4-line)' }} />
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, borderTop: '2px solid var(--board-v4-line)' }}>{brlMil(kClientes.faturamento_total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : <ChartEmpty msg="Sem clientes" />}
                  </div>
                </div>
              </>
            )}

            {/* ── ABA OPERACIONAL ──────────────────────────────────── */}
            {aba === 'operacional' && (
              <>
                <KpiStrip
                  items={[
                    { value: kOper.contratos_30d, label: 'Contratos vencendo em 30 dias', color: PSA.amber },
                    { value: kOper.contratos_vencidos, label: 'Contratos vencidos (renovar)', color: PSA.risk },
                    { value: kOper.novos_clientes_trimestre, label: 'Novos clientes no trimestre', color: PSA.lime },
                    { value: clientesFiltrados.length, label: 'Clientes na carteira', color: PSA.teal },
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
                    { value: kProj.os_em_andamento, label: 'OS em andamento', color: PSA.teal, subText: `de ${kProj.os_total} OS` },
                    { value: `${num(kProj.horas_estimadas)} h`, label: 'Horas estimadas', color: PSA.moss },
                    { value: `${num(kProj.horas_realizadas)} h`, label: 'Horas realizadas', color: PSA.lime },
                    { value: pct(kProj.desvio_medio), label: 'Desvio médio', color: PSA.amber },
                    { value: projetosFiltrado.length, label: 'Projetos', color: PSA.tealLight },
                  ]}
                />

                <div className="v4-g2">
                  <div className="v4-card">
                    <div className="v4-card-title">Estimado × realizado por projeto (h)</div>
                    {serieHoras.length > 0 ? (
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={serieHoras}>
                          <CartesianGrid {...GRID_STYLE} />
                          <XAxis dataKey="nome" {...AXIS} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis {...AXIS} />
                          <Tooltip formatter={(v: number) => `${num(v)} h`} {...TOOLTIP_STYLE} />
                          <Bar dataKey="horas_estimadas" name="Estimadas" fill={PSA.teal} radius={[3, 3, 0, 0]} />
                          <Bar dataKey="horas_realizadas" name="Realizadas" fill={PSA.lime} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <ChartEmpty msg="Sem horas apontadas" />}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6 }}>
                      {[{ c: PSA.teal, l: 'Estimadas' }, { c: PSA.lime, l: 'Realizadas' }].map((x) => (
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
                              <td style={{ ...td, textAlign: 'right', color: p.desvio_pct != null && p.desvio_pct > 0 ? PSA.risk : PSA.teal }}>{pct(p.desvio_pct)}</td>
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
    </BoardLayout>
  );
};

export default BoardDashboardClientesOs;
