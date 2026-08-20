import { useMemo, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Globe, Layers, TrendingDown, TrendingUp } from 'lucide-react';
import { useCalculadoraResumo } from '@/hooks/useCalculadoraIbsCbs';
import type { ApuracaoFiltros, ComposicaoTributosAntes, QuebraNatureza } from '@/lib/ibs-cbs/types';
import { fmtBRL, fmtBRLCompact, fmtPct, fmtMesAno, fmtPp } from '@/lib/ibs-cbs/formatters';
import { NotasMetodologicas } from './NotasMetodologicas';
import {
  NOTA_TRIBUTO_ANTES,
  NOTA_TRIBUTO_DEPOIS,
  NOTA_BASE_SAIDAS,
  NOTA_PERIODO_TRANSICAO,
} from './notasMetodologicas.constants';

const CORES = {
  antes: '#F2810A',
  depois: '#0D9488',
  icmsMonof: '#6B46E8',
  lime: '#65A30D',
  composicao: ['#0D9488', '#65A30D', '#F2810A', '#0EA271', '#3478F5', '#6B46E8', '#0A9BB5'],
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  accent: 'neutral' | 'antes' | 'depois' | 'lime';
  trend?: { dir: 'up' | 'down'; text: string };
  tooltip?: ReactNode;
}

function KpiCard({ label, value, sub, accent, trend, tooltip }: KpiCardProps) {
  const accentColor = {
    neutral: '#3478F5',
    antes: CORES.antes,
    depois: CORES.depois,
    lime: CORES.lime,
  }[accent];

  const card = (
    <Card className={`relative overflow-hidden border-slate-200 ${tooltip ? 'cursor-help' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accentColor }} />
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900 leading-none mb-1 tabular-nums">{value}</p>
        {sub && <div className="text-xs text-slate-500 mt-2 space-y-0.5">{sub}</div>}
        {trend && (
          <div
            className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.dir === 'down' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.dir === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {trend.text}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!tooltip) return card;

  return (
    <UITooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs shadow-2xl ring-1 ring-slate-200">
        {tooltip}
      </TooltipContent>
    </UITooltip>
  );
}

interface SegmentoCardProps {
  icon: ReactNode;
  label: string;
  segmento: {
    faturamento: number;
    tributoAntes: number;
    tributoDepois: number;
    tributoDepoisIbsCbs: number;
    tributoDepoisIcmsMonof: number;
    qtdItens: number;
    qtdNFs: number;
  };
  totalFaturamento: number;
  accent: string;
  emptyHint: string;
}

function SegmentoCard({
  icon,
  label,
  segmento,
  totalFaturamento,
  accent,
  emptyHint,
}: SegmentoCardProps) {
  const pct = totalFaturamento > 0 ? segmento.faturamento / totalFaturamento : 0;
  const cargaDepois =
    segmento.faturamento > 0 ? segmento.tributoDepoisIbsCbs / segmento.faturamento : 0;
  const isEmpty = segmento.qtdItens === 0;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        </div>
        {isEmpty ? (
          <div>
            <p className="text-lg font-semibold text-slate-400 mb-1">Sem ocorrências</p>
            <p className="text-xs text-slate-400">{emptyHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-400 uppercase tracking-wider mb-0.5">Faturamento</p>
              <p className="font-bold text-slate-900 tabular-nums">
                {fmtBRL(segmento.faturamento)}
              </p>
              <p className="text-slate-500 font-mono">{fmtPct(pct)} do fat.</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider mb-0.5">Tributo DEPOIS</p>
              <>
                <p className="font-bold text-primary tabular-nums">
                  {fmtBRL(segmento.tributoDepoisIbsCbs)}
                </p>
                <p className="text-slate-500">Carga {fmtPct(cargaDepois)}</p>
              </>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider mb-0.5">Volume</p>
              <p className="font-bold text-slate-900 tabular-nums">
                {segmento.qtdNFs.toLocaleString('pt-BR')} NFs
              </p>
              <p className="text-slate-500">{segmento.qtdItens.toLocaleString('pt-BR')} itens</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AbaResumoProps {
  filtros: ApuracaoFiltros;
  idContribuinte: string;
}

const TOTAIS_VAZIO = {
  faturamento: 0,
  tributoAntes: 0,
  tributoDepois: 0,
  tributoDepoisIbsCbs: 0,
  tributoDepoisIcmsMonof: 0,
  cargaAntesPct: 0,
  cargaDepoisPct: 0,
  deltaPp: 0,
  qtdNotas: 0,
  qtdItens: 0,
  aliqNominalMediaTributada: 0,
  faturamentoTributado: 0,
};

const COMPOSICAO_VAZIA: ComposicaoTributosAntes = {
  vICMS: 0,
  vICMSST: 0,
  vIPI: 0,
  vPIS: 0,
  vPIS_ST: 0,
  vCOFINS: 0,
  vCOFINS_ST: 0,
};

const SEGMENTO_VAZIO = {
  faturamento: 0,
  tributoAntes: 0,
  tributoDepois: 0,
  tributoDepoisIbsCbs: 0,
  tributoDepoisIcmsMonof: 0,
  qtdItens: 0,
  qtdNFs: 0,
};
const QUEBRA_VAZIA: QuebraNatureza = {
  exportacao: SEGMENTO_VAZIO,
  interno: SEGMENTO_VAZIO,
  monofasico: SEGMENTO_VAZIO,
  plurifasico: SEGMENTO_VAZIO,
};

export function AbaResumo({ filtros, idContribuinte }: AbaResumoProps) {
  const { isLoading, error, data } = useCalculadoraResumo(idContribuinte, filtros);
  const totais = data?.totais ?? TOTAIS_VAZIO;
  const composicaoAntes = data?.composicaoAntes ?? COMPOSICAO_VAZIA;
  const porMes = useMemo(() => data?.porMes ?? [], [data?.porMes]);
  const quebra = data?.quebra ?? QUEBRA_VAZIA;
  const tributoDepoisIbsCbs = totais.tributoDepoisIbsCbs;
  const cargaDepoisIbsCbsPct =
    totais.faturamento > 0 ? tributoDepoisIbsCbs / totais.faturamento : 0;
  const deltaPpIbsCbs = (cargaDepoisIbsCbsPct - totais.cargaAntesPct) * 100;

  const composicaoData = useMemo(() => {
    const labels: Record<keyof typeof composicaoAntes, string> = {
      vICMS: 'ICMS',
      vICMSST: 'ICMS-ST',
      vIPI: 'IPI',
      vPIS: 'PIS',
      vPIS_ST: 'PIS-ST',
      vCOFINS: 'COFINS',
      vCOFINS_ST: 'COFINS-ST',
    };
    const total = Object.values(composicaoAntes).reduce((acc, v) => acc + v, 0);
    return Object.entries(composicaoAntes)
      .filter(([, v]) => v > 0 && v / total >= 0.001)
      .map(([k, v]) => ({ name: labels[k as keyof typeof composicaoAntes], value: v }));
  }, [composicaoAntes]);

  const cargaIbsCbsPct = cargaDepoisIbsCbsPct * 100;
  const cargaCompara = [
    {
      label: 'Antes',
      Antes: Number((totais.cargaAntesPct * 100).toFixed(2)),
      'IBS/CBS': 0,
    },
    {
      label: 'Depois',
      Antes: 0,
      'IBS/CBS': Number(cargaIbsCbsPct.toFixed(2)),
    },
  ];

  const linhaTemporal = useMemo(
    () =>
      porMes.map((m) => ({
        mes: fmtMesAno(m.mes),
        Antes: m.tributoAntes,
        Depois: m.tributoDepoisIbsCbs,
      })),
    [porMes],
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Falha ao carregar dados de saída: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-xs">
          Cálculo sobre <strong>saídas</strong> apenas — não considera créditos de entradas.
          Resultado representa <strong>carga sobre faturamento</strong>, não saldo a recolher.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Faturamento bruto"
          value={fmtBRL(totais.faturamento)}
          sub={`${totais.qtdNotas.toLocaleString('pt-BR')} NFs · ${totais.qtdItens.toLocaleString('pt-BR')} itens`}
          accent="neutral"
        />
        <KpiCard
          label="Tributos ANTES"
          value={fmtBRL(totais.tributoAntes)}
          sub={<p>Carga efetiva {fmtPct(totais.cargaAntesPct)}</p>}
          accent="antes"
        />
        <KpiCard
          label="Tributos DEPOIS"
          value={fmtBRL(tributoDepoisIbsCbs)}
          sub={
            <>
              <p>Carga efetiva {fmtPct(cargaDepoisIbsCbsPct)}</p>
              {totais.aliqNominalMediaTributada > 0 && (
                <p className="text-slate-400">
                  Alíq nominal {totais.aliqNominalMediaTributada.toFixed(1)}% (em{' '}
                  {fmtPct(totais.faturamentoTributado / Math.max(1, totais.faturamento))} do fat.)
                </p>
              )}
            </>
          }
          accent="depois"
          tooltip={
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-900">Tributo DEPOIS exibido no dashboard</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: CORES.depois }}
                    />
                    IBS/CBS real
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">
                    {fmtBRL(totais.tributoDepoisIbsCbs)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Os cards e gráficos comparativos desta página passaram a considerar apenas o valor
                de IBS/CBS, sem somar ICMS monofásico.
              </p>
            </div>
          }
        />
        <KpiCard
          label="Δ Carga"
          value={fmtPp(deltaPpIbsCbs)}
          sub={
            totais.tributoAntes > 0
              ? `${fmtBRL(tributoDepoisIbsCbs - totais.tributoAntes)} no período`
              : undefined
          }
          accent="lime"
          trend={{
            dir: deltaPpIbsCbs <= 0 ? 'down' : 'up',
            text: deltaPpIbsCbs <= 0 ? 'Reduz carga' : 'Aumenta carga',
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SegmentoCard
          icon={<Globe className="h-4 w-4" />}
          label="Exportações"
          segmento={quebra.exportacao}
          totalFaturamento={totais.faturamento}
          accent="#3478F5"
          emptyHint="CFOP 7xxx ou UF destino EX"
        />
        <SegmentoCard
          icon={<Layers className="h-4 w-4" />}
          label="Monofásicos"
          segmento={quebra.monofasico}
          totalFaturamento={totais.faturamento}
          accent="#6B46E8"
          emptyHint="Itens marcados como monofásico no XML"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Carga tributária comparada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cargaCompara} layout="vertical" margin={{ left: 12, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  stroke="#7A8899"
                  fontSize={12}
                />
                <YAxis type="category" dataKey="label" stroke="#7A8899" fontSize={12} width={64} />
                <Tooltip
                  formatter={(v: number) => `${v.toFixed(2)}%`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E4E9F0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Antes" stackId="carga" fill={CORES.antes} barSize={32} />
                <Bar dataKey="IBS/CBS" stackId="carga" fill={CORES.depois} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Composição dos tributos ANTES
            </CardTitle>
          </CardHeader>
          <CardContent>
            {composicaoData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={composicaoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ percent }) =>
                      percent && percent >= 0.001 ? `${(percent * 100).toFixed(1)}%` : ''
                    }
                    labelLine={true}
                    fontSize={11}
                  >
                    {composicaoData.map((_, i) => (
                      <Cell key={i} fill={CORES.composicao[i % CORES.composicao.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name) => [fmtBRL(v), name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E4E9F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Evolução mensal — antes vs depois
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linhaTemporal.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={linhaTemporal} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F0" />
                <XAxis dataKey="mes" stroke="#7A8899" fontSize={11} />
                <YAxis
                  tickFormatter={(v) => fmtBRLCompact(v)}
                  stroke="#7A8899"
                  fontSize={11}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E4E9F0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Antes"
                  stroke={CORES.antes}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Depois"
                  stroke={CORES.depois}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <NotasMetodologicas
        notas={[
          NOTA_TRIBUTO_ANTES,
          NOTA_TRIBUTO_DEPOIS,
          {
            titulo: "ICMS monofásico (transição)",
            texto: (
              <>
                Para itens monofásicos (combustíveis, lubrificantes), o backend aplica{" "}
                <strong>ICMS provisório</strong> enquanto as alíquotas efetivas de IBS/CBS não são
                definidas. Esse valor é somado ao IBS/CBS na visualização "Tributos DEPOIS".
              </>
            ),
          },
          {
            titulo: "Quebra por natureza",
            texto: (
              <>
                <strong>Exportações</strong> = CFOP iniciada em 7 ou UF destino "EX".{" "}
                <strong>Monofásicos</strong> = itens marcados como tal no XML. As categorias podem
                se sobrepor (uma exportação pode ser monofásica).
              </>
            ),
          },
          NOTA_PERIODO_TRANSICAO,
          NOTA_BASE_SAIDAS,
        ]}
      />
    </div>
  );
}
