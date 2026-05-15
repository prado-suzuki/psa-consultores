import { useMemo, useState, type ReactNode } from "react";
import { ResponsiveContainer, Sankey, Tooltip as ChartTooltip, Layer, Rectangle } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Globe,
  HelpCircle,
  Lightbulb,
  MapPin,
  Plane,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCalculadoraPorUf } from "@/hooks/useCalculadoraIbsCbs";
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPp } from "@/lib/ibs-cbs/formatters";
import type {
  ApuracaoFiltros,
  CalculadoraPorUfResponse,
  FatoCliente,
  FatoUfProduto,
  NaturezaDestino,
} from "@/lib/ibs-cbs/types";
import { UfDrillDown } from "./UfDrillDown";
import { NotasMetodologicas } from "./NotasMetodologicas";
import {
  NOTA_TRIBUTO_ANTES,
  NOTA_TRIBUTO_DEPOIS,
  NOTA_BASE_SAIDAS,
  NOTA_SEM_ANEXO,
} from "./notasMetodologicas.constants";

const CORES = {
  interno: "#0D9488",
  interestadual: "#F2810A",
  exportacao: "#3478F5",
  anexoI: "#65A30D",
  anexoIX: "#F2810A",
  anexoXV: "#6B46E8",
  semAnexo: "#94A3B8",
  neutral: "#3478F5",
};

const PALETA_ANEXO: Record<string, string> = {
  "Anexo I": CORES.anexoI,
  "Anexo IX": CORES.anexoIX,
  "Anexo XV": CORES.anexoXV,
  "Sem anexo": CORES.semAnexo,
};

const CORES_NATUREZA: Record<NaturezaDestino, string> = {
  interno: CORES.interno,
  interestadual: CORES.interestadual,
  exportacao: CORES.exportacao,
};

const LABEL_NATUREZA: Record<NaturezaDestino, string> = {
  interno: "Interno (MT)",
  interestadual: "Interestadual",
  exportacao: "Exportação",
};

const EMPTY_POR_UF_RESPONSE: CalculadoraPorUfResponse = {
  fatosPorUfProduto: [],
  clientes: [],
  totalClientesDistintos: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Help icon com tooltip explicativo

function HelpHint({ children }: { children: ReactNode }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help inline-block" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </UITooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card

interface KpiCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  accent: string;
  icon?: ReactNode;
  hint?: ReactNode;
}

function KpiCard({ label, value, sub, accent, icon, hint }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border-slate-200">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {label}
            {hint && <HelpHint>{hint}</HelpHint>}
          </p>
          {icon && (
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}15`, color: accent }}
            >
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none mb-1 tabular-nums">{value}</p>
        {sub && <div className="text-xs text-slate-500 mt-2 space-y-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sankey custom node

interface SankeyNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name: string; cor?: string; valor?: number };
  containerWidth?: number;
}

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload, containerWidth = 0 }: SankeyNodeProps) {
  const isLeft = x < containerWidth / 2;
  const cor = payload?.cor ?? "#94A3B8";
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={cor} fillOpacity={0.85} />
      <text
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={600}
        fill="#334155"
      >
        {payload?.name}
      </text>
      {payload?.valor !== undefined && (
        <text
          x={isLeft ? x - 8 : x + width + 8}
          y={y + height / 2 + 14}
          textAnchor={isLeft ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={10}
          fill="#94A3B8"
        >
          {fmtBRLCompact(payload.valor)}
        </text>
      )}
    </Layer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba

interface AbaPorEstadoProps {
  filtros: ApuracaoFiltros;
  idContribuinte: string;
}

export function AbaPorEstado({ filtros, idContribuinte }: AbaPorEstadoProps) {
  const { isLoading, error, data } = useCalculadoraPorUf(idContribuinte, filtros);
  const [metricaSankey, setMetricaSankey] = useState<"faturamento" | "tributoDepois">("faturamento");
  const [ufDrillDown, setUfDrillDown] = useState<string | null>(null);
  const dados = data ?? EMPTY_POR_UF_RESPONSE;
  const fatosBrutos = dados.fatosPorUfProduto;
  const clientesBrutos = dados.clientes;
  const totalClientesDistintos = dados.totalClientesDistintos;

  // ── Aplica filtros UF + Anexo nos fatos brutos ────────────────────────────
  const fatosFiltrados = useMemo<FatoUfProduto[]>(() => {
    return fatosBrutos.filter((f) => {
      if (filtros.ufs.length > 0 && !filtros.ufs.includes(f.uf)) return false;
      if (filtros.anexos.length > 0 && !filtros.anexos.includes(f.anexo)) return false;
      return true;
    });
  }, [fatosBrutos, filtros.ufs, filtros.anexos]);

  const clientesFiltrados = useMemo<FatoCliente[]>(() => {
    return clientesBrutos.filter((c) => {
      if (filtros.ufs.length > 0 && !filtros.ufs.includes(c.uf)) return false;
      if (filtros.anexos.length > 0 && !filtros.anexos.includes(c.anexoPrincipal)) return false;
      return true;
    });
  }, [clientesBrutos, filtros.ufs, filtros.anexos]);

  // ── Agregados derivados ───────────────────────────────────────────────────
  const totais = useMemo(() => {
    const faturamento = fatosFiltrados.reduce((s, f) => s + f.faturamento, 0);
    const tribAntes = fatosFiltrados.reduce((s, f) => s + f.tributoAntes, 0);
    const tribDepois = fatosFiltrados.reduce((s, f) => s + f.tributoDepois, 0);
    const ufs = new Set(fatosFiltrados.map((f) => f.uf));
    const fatInterno = fatosFiltrados
      .filter((f) => f.natureza === "interno")
      .reduce((s, f) => s + f.faturamento, 0);
    const fatInterestadual = fatosFiltrados
      .filter((f) => f.natureza === "interestadual")
      .reduce((s, f) => s + f.faturamento, 0);
    const fatExportacao = fatosFiltrados
      .filter((f) => f.natureza === "exportacao")
      .reduce((s, f) => s + f.faturamento, 0);

    return {
      faturamento,
      tribAntes,
      tribDepois,
      qtdUfs: ufs.size,
      pctInterno: faturamento > 0 ? (fatInterno / faturamento) * 100 : 0,
      pctInterestadual: faturamento > 0 ? (fatInterestadual / faturamento) * 100 : 0,
      pctExportacao: faturamento > 0 ? (fatExportacao / faturamento) * 100 : 0,
      cargaAntesPct: faturamento > 0 ? (tribAntes / faturamento) * 100 : 0,
      cargaDepoisPct: faturamento > 0 ? (tribDepois / faturamento) * 100 : 0,
      deltaPp:
        faturamento > 0 ? ((tribDepois - tribAntes) / faturamento) * 100 : 0,
    };
  }, [fatosFiltrados]);

  const porUfAgregado = useMemo(() => {
    const map = new Map<string, FatoUfProduto & { aliqAntes: number; aliqDepois: number; ticketMedio: number }>();
    fatosFiltrados.forEach((f) => {
      const cur = map.get(f.uf);
      if (cur) {
        cur.faturamento += f.faturamento;
        cur.tributoAntes += f.tributoAntes;
        cur.tributoDepois += f.tributoDepois;
        cur.tributoDepoisIbsCbs += f.tributoDepoisIbsCbs;
        cur.tributoDepoisIcmsMonof += f.tributoDepoisIcmsMonof;
        cur.qtdNFs += f.qtdNFs;
        cur.qtdItens += f.qtdItens;
      } else {
        map.set(f.uf, {
          uf: f.uf,
          ncm: "",
          xProd: "",
          anexo: f.anexo,
          natureza: f.natureza,
          faturamento: f.faturamento,
          tributoAntes: f.tributoAntes,
          tributoDepois: f.tributoDepois,
          tributoDepoisIbsCbs: f.tributoDepoisIbsCbs,
          tributoDepoisIcmsMonof: f.tributoDepoisIcmsMonof,
          qtdNFs: f.qtdNFs,
          qtdItens: f.qtdItens,
          aliqAntes: 0,
          aliqDepois: 0,
          ticketMedio: 0,
        });
      }
    });
    const arr = Array.from(map.values()).map((u) => ({
      ...u,
      aliqAntes: u.faturamento > 0 ? (u.tributoAntes / u.faturamento) * 100 : 0,
      aliqDepois: u.faturamento > 0 ? (u.tributoDepois / u.faturamento) * 100 : 0,
      ticketMedio: u.qtdNFs > 0 ? u.faturamento / u.qtdNFs : 0,
    }));
    return arr.sort((a, b) => b.faturamento - a.faturamento);
  }, [fatosFiltrados]);

  const pctTop3Ufs = useMemo(() => {
    const total = totais.faturamento;
    if (total === 0) return 0;
    const top3 = porUfAgregado.slice(0, 3).reduce((s, u) => s + u.faturamento, 0);
    return (top3 / total) * 100;
  }, [porUfAgregado, totais.faturamento]);

  // % dos top 3 clientes sobre o faturamento TOTAL filtrado
  // (fonte de verdade = totais.faturamento dos fatos UF×produto, não a soma da
  // agregação por cliente).
  const pctTop3Clientes = useMemo(() => {
    if (totais.faturamento === 0) return 0;
    const top3 = [...clientesFiltrados]
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 3)
      .reduce((s, c) => s + c.faturamento, 0);
    return (top3 / totais.faturamento) * 100;
  }, [clientesFiltrados, totais.faturamento]);

  const ufTopDestino = porUfAgregado[0]?.uf ?? "—";

  // ── Sankey ────────────────────────────────────────────────────────────────
  const sankeyData = useMemo(() => {
    type NcmAgr = { ncm: string; xProd: string; anexo: string; total: number };
    const agregadoNcm = new Map<string, NcmAgr>();
    fatosFiltrados.forEach((f) => {
      const cur = agregadoNcm.get(f.ncm);
      const valor = metricaSankey === "faturamento" ? f.faturamento : f.tributoDepois;
      if (cur) cur.total += valor;
      else agregadoNcm.set(f.ncm, { ncm: f.ncm, xProd: f.xProd, anexo: f.anexo, total: valor });
    });

    const sortedNcms = Array.from(agregadoNcm.values())
      .filter((n) => n.total > 0)
      .sort((a, b) => b.total - a.total);
    const topNcms = sortedNcms.slice(0, 6);
    const ncmsTopSet = new Set(topNcms.map((n) => n.ncm));
    const outrosValor = sortedNcms
      .filter((n) => !ncmsTopSet.has(n.ncm))
      .reduce((acc, n) => acc + n.total, 0);

    const nodesEsquerda = topNcms.map((n) => ({
      name: n.xProd,
      cor: PALETA_ANEXO[n.anexo] ?? CORES.semAnexo,
      valor: n.total,
    }));
    if (outrosValor > 0) {
      nodesEsquerda.push({ name: "Outros produtos", cor: CORES.semAnexo, valor: outrosValor });
    }

    const naturezas: NaturezaDestino[] = ["interno", "interestadual", "exportacao"];
    const totalPorNatureza: Record<NaturezaDestino, number> = {
      interno: 0,
      interestadual: 0,
      exportacao: 0,
    };
    fatosFiltrados.forEach((f) => {
      const v = metricaSankey === "faturamento" ? f.faturamento : f.tributoDepois;
      totalPorNatureza[f.natureza] += v;
    });
    const nodesDireita = naturezas.map((nat) => ({
      name: LABEL_NATUREZA[nat],
      cor: CORES_NATUREZA[nat],
      valor: totalPorNatureza[nat],
    }));

    const nodes = [...nodesEsquerda, ...nodesDireita];
    const offsetDireita = nodesEsquerda.length;

    const links: Array<{ source: number; target: number; value: number }> = [];
    fatosFiltrados.forEach((f) => {
      const valor = metricaSankey === "faturamento" ? f.faturamento : f.tributoDepois;
      if (valor <= 0) return;
      const ncmIdx = ncmsTopSet.has(f.ncm)
        ? topNcms.findIndex((n) => n.ncm === f.ncm)
        : nodesEsquerda.length - 1; // "Outros"
      if (ncmIdx < 0) return;
      const natIdx = naturezas.indexOf(f.natureza);
      if (natIdx < 0) return;
      links.push({ source: ncmIdx, target: offsetDireita + natIdx, value: valor });
    });

    return { nodes, links };
  }, [fatosFiltrados, metricaSankey]);

  const maxFatUf = porUfAgregado[0]?.faturamento ?? 1;
  const topClientesOrdenados = useMemo(
    () => [...clientesFiltrados].sort((a, b) => b.faturamento - a.faturamento).slice(0, 12),
    [clientesFiltrados]
  );

  const filtrosAtivos = filtros.ufs.length > 0 || filtros.anexos.length > 0;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Falha ao carregar: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  // ── Estado vazio ──────────────────────────────────────────────────────────
  if (fatosFiltrados.length === 0) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-xs">
          Nenhum dado para os filtros atuais. Tente remover restrições de UF ou Anexo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─────────── LINHA 1: KPIs Executivos ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="UFs atendidas"
          value={fmtInt(totais.qtdUfs)}
          sub={
            <>
              <p>Top destino: <strong className="text-slate-700">{ufTopDestino}</strong></p>
              <p className="text-slate-400">
                {filtrosAtivos
                  ? `${fmtInt(clientesFiltrados.length)} clientes no filtro`
                  : `${fmtInt(totalClientesDistintos)} clientes distintos`}
              </p>
            </>
          }
          accent={CORES.neutral}
          icon={<MapPin className="h-4 w-4" />}
          hint={
            <>
              Quantidade de Unidades Federativas que aparecem como{" "}
              <strong>destino (uf_dest)</strong> nas saídas. Não considera tipo de operação — interno
              e interestadual entram juntos.
            </>
          }
        />
        <KpiCard
          label="Concentração Top-3 UFs"
          value={`${pctTop3Ufs.toFixed(1)}%`}
          sub={
            <>
              <p
                className={`font-semibold ${
                  pctTop3Ufs > 80 ? "text-rose-600" : pctTop3Ufs > 60 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {pctTop3Ufs > 80
                  ? "Alta concentração geográfica"
                  : pctTop3Ufs > 60
                    ? "Concentração moderada"
                    : "Distribuição saudável"}
              </p>
              <p className="text-slate-400">
                {porUfAgregado
                  .slice(0, 3)
                  .map((u) => u.uf)
                  .join(" + ")}
              </p>
            </>
          }
          accent={pctTop3Ufs > 80 ? "#E11D48" : "#F2810A"}
          icon={<ShieldAlert className="h-4 w-4" />}
          hint={
            <>
              Soma do <strong>% de faturamento</strong> das 3 UFs com maior volume. Acima de 80%
              sinaliza dependência geográfica — qualquer mudança regulatória regional ou
              instabilidade comercial nesses estados afeta diretamente o resultado.
            </>
          }
        />
        <KpiCard
          label="Mix por natureza"
          value={`${totais.pctInterno.toFixed(0)} / ${totais.pctInterestadual.toFixed(0)} / ${totais.pctExportacao.toFixed(0)}`}
          sub={
            <div className="flex items-center gap-2 mt-1 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES.interno }} />
                Interno
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES.interestadual }} />
                Inter.
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES.exportacao }} />
                Export.
              </span>
            </div>
          }
          accent={CORES.interestadual}
          icon={<Globe className="h-4 w-4" />}
          hint={
            <>
              Composição do faturamento por tipo de destino: <strong>Interno</strong> (uf_dest = MT,
              UF de origem) · <strong>Interestadual</strong> (outras UFs) ·{" "}
              <strong>Exportação</strong> (CFOP iniciado por 7). No regime IBS/CBS, exportação tem{" "}
              <strong>imunidade total</strong>; interestadual recolhe IBS no <strong>destino</strong>.
            </>
          }
        />
        <KpiCard
          label="Δ pp ponderado"
          value={fmtPp(totais.deltaPp)}
          sub={
            <>
              <p className="text-slate-400">
                Antes: <strong className="text-slate-600">{totais.cargaAntesPct.toFixed(2)}%</strong> · Depois:{" "}
                <strong className="text-slate-600">{totais.cargaDepoisPct.toFixed(2)}%</strong>
              </p>
              <div
                className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                  totais.deltaPp < 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {totais.deltaPp < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {totais.deltaPp < 0 ? "Reforma alivia carga" : "Reforma aumenta carga"}
              </div>
            </>
          }
          accent={totais.deltaPp < 0 ? CORES.anexoI : "#E11D48"}
          icon={totais.deltaPp < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          hint={
            <>
              Variação em <strong>pontos percentuais</strong> da carga tributária sobre o faturamento,
              ANTES vs DEPOIS da reforma. Fórmula:{" "}
              <code className="text-[10px]">((tributoDepois - tributoAntes) / faturamento) × 100</code>
              . Tributo antes = ICMS + ICMS-ST + IPI + PIS + COFINS somados do XML. Tributo depois =
              valor IBS+CBS calculado pela classificação no anexo.
            </>
          }
        />
      </div>

      {/* ─────────── LINHA 2: Sankey ─────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              Fluxo Produto → Destino
              <HelpHint>
                Cada faixa representa o fluxo de um <strong>produto (NCM)</strong> para uma{" "}
                <strong>natureza de destino</strong>. Espessura proporcional à métrica escolhida.
                Os 6 produtos de maior valor são mostrados individualmente; os demais são
                consolidados em "Outros".
              </HelpHint>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Onde cada produto está sendo vendido — espessura por{" "}
              {metricaSankey === "faturamento" ? "faturamento" : "tributo IBS/CBS"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={metricaSankey === "faturamento" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMetricaSankey("faturamento")}
            >
              Faturamento
            </Button>
            <Button
              size="sm"
              variant={metricaSankey === "tributoDepois" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMetricaSankey("tributoDepois")}
            >
              Tributo IBS/CBS
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sankeyData.links.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Sem fluxo de {metricaSankey === "faturamento" ? "faturamento" : "tributo"} para esta seleção
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <Sankey
                data={sankeyData}
                nodePadding={28}
                nodeWidth={14}
                margin={{ top: 16, right: 200, bottom: 16, left: 200 }}
                link={{ stroke: "#CBD5E1", strokeOpacity: 0.4 }}
                node={<SankeyNode />}
              >
                <ChartTooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0", fontSize: 12 }}
                  formatter={(value: number) => [
                    fmtBRL(value),
                    metricaSankey === "faturamento" ? "Faturamento" : "Tributo",
                  ]}
                />
              </Sankey>
            </ResponsiveContainer>
          )}
          {totais.pctExportacao === 0 && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <Plane className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-xs">
                <strong>Sem fluxo de exportação detectado</strong> (nenhuma CFOP iniciada em 7).
                Na reforma, exportações têm <strong>imunidade total de IBS/CBS</strong> + manutenção
                de créditos sobre insumos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ─────────── LINHA 3: Grid de UFs + Tabela ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              Mapa de exposição por UF
              <HelpHint>
                <strong>Intensidade da cor</strong> proporcional ao faturamento. <strong>Cor do
                badge</strong> indica a natureza (Interno/Inter./Exp.). <strong>Alíq efet.</strong>{" "}
                é a alíquota efetiva ponderada de IBS/CBS sobre o faturamento da UF. <strong>Δ pp
                </strong> compara a carga antes vs depois. <strong>Clique em qualquer UF</strong>{" "}
                para abrir o drill-down completo (produtos + clientes).
              </HelpHint>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Clique em uma UF para ver detalhes · intensidade = faturamento · cor = natureza
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {porUfAgregado.map((u) => {
                const intensidade = u.faturamento / maxFatUf;
                const cor = CORES_NATUREZA[u.natureza];
                return (
                  <button
                    key={u.uf}
                    type="button"
                    onClick={() => setUfDrillDown(u.uf)}
                    className="group relative rounded-lg border border-slate-200 overflow-hidden bg-white text-left hover:border-slate-400 hover:shadow-md transition-all cursor-pointer"
                    title={`Ver detalhamento de ${u.uf}`}
                  >
                    <div
                      className="absolute inset-0 group-hover:opacity-80 transition-opacity"
                      style={{ background: cor, opacity: 0.05 + intensidade * 0.18 }}
                    />
                    <div className="relative p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg text-slate-900">{u.uf}</span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: `${cor}25`, color: cor }}
                        >
                          {u.natureza === "interno" ? "MT" : u.natureza === "interestadual" ? "Inter." : "Exp."}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">
                        {fmtBRLCompact(u.faturamento)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {fmtInt(u.qtdNFs)} NFs · alíq {u.aliqDepois.toFixed(1)}%
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div
                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                            u.tributoDepois - u.tributoAntes < 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {u.tributoDepois - u.tributoAntes < 0 ? (
                            <TrendingDown className="h-2.5 w-2.5" />
                          ) : (
                            <TrendingUp className="h-2.5 w-2.5" />
                          )}
                          {fmtPp(u.aliqDepois - u.aliqAntes)}
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-medium">
                          Detalhes →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              Detalhamento por UF
              <HelpHint>
                <strong>Faturamento</strong>: soma de vProd nas saídas com essa uf_dest.<br />
                <strong>% Total</strong>: participação no faturamento filtrado.<br />
                <strong>Ticket médio</strong>: faturamento ÷ qtd. de NFs distintas.<br />
                <strong>Carga antes / depois</strong>: tributo ÷ faturamento da UF.<br />
                <strong>Δ pp</strong>: diferença (depois − antes) em pontos percentuais.
              </HelpHint>
            </CardTitle>
            <p className="text-xs text-slate-500">Ordenado por faturamento</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-14">UF</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                    <TableHead className="text-right">NFs</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                    <TableHead className="text-right">Carga antes</TableHead>
                    <TableHead className="text-right">Carga depois</TableHead>
                    <TableHead className="text-right">Δ pp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porUfAgregado.map((u) => {
                    const pctTotal = totais.faturamento > 0 ? (u.faturamento / totais.faturamento) * 100 : 0;
                    const cor = CORES_NATUREZA[u.natureza];
                    const deltaPp = u.aliqDepois - u.aliqAntes;
                    return (
                      <TableRow
                        key={u.uf}
                        onClick={() => setUfDrillDown(u.uf)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <TableCell className="font-bold">{u.uf}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{ background: `${cor}20`, color: cor }}
                            className="text-[10px]"
                          >
                            {LABEL_NATUREZA[u.natureza]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {fmtBRL(u.faturamento)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pctTotal.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtInt(u.qtdNFs)}</TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">
                          {fmtBRL(u.ticketMedio)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-700">
                          {u.aliqAntes.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-teal-700">
                          {u.aliqDepois.toFixed(2)}%
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            deltaPp < 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {fmtPp(deltaPp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────── LINHA 4: Top Clientes ─────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-teal-600" />
            Top 12 Clientes — Quem está demandando
            <HelpHint>
              Clientes agrupados pelo <strong>nome do destinatário (nome_dest)</strong>,
              consolidando filiais (CNPJs distintos com mesmo nome). Universo do filtro atual:{" "}
              <strong>{fmtInt(clientesFiltrados.length)} clientes</strong>. Top 3 representam{" "}
              <strong>{pctTop3Clientes.toFixed(1)}%</strong> do faturamento do filtro — métrica
              clássica de risco de concentração comercial.
            </HelpHint>
          </CardTitle>
          <p className="text-xs text-slate-500">
            Top 3 concentram <strong>{pctTop3Clientes.toFixed(1)}%</strong> do faturamento — monitorar risco de concentração
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {topClientesOrdenados.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">
              Sem clientes para os filtros atuais
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead>Produto principal</TableHead>
                    <TableHead className="text-right">NFs</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientesOrdenados.map((c, idx) => {
                    const pct = totais.faturamento > 0 ? (c.faturamento / totais.faturamento) * 100 : 0;
                    const cor = CORES_NATUREZA[c.natureza];
                    return (
                      <TableRow key={c.nome}>
                        <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium text-slate-900">{c.nome}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold">
                            {c.uf}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{ background: `${cor}20`, color: cor }}
                            className="text-[10px]"
                          >
                            {LABEL_NATUREZA[c.natureza]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{c.produtoPrincipal}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtInt(c.qtdNFs)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {fmtBRL(c.faturamento)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(100, pct * 4)}%`,
                                  background: cor,
                                }}
                              />
                            </div>
                            <span className="font-semibold">{pct.toFixed(2)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─────────── LINHA 5: Insights Estratégicos ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InsightCard
          icon={<Building2 className="h-5 w-5" />}
          accent={pctTop3Ufs > 80 ? "#E11D48" : "#F2810A"}
          titulo="Concentração geográfica"
          texto={
            <>
              <strong>{pctTop3Ufs.toFixed(1)}%</strong> do faturamento concentrado em apenas 3 UFs (
              {porUfAgregado
                .slice(0, 3)
                .map((u) => u.uf)
                .join(", ")}
              ). Mudança regulatória regional ou ruptura comercial nesses estados afeta diretamente
              o resultado.
            </>
          }
          acao={
            pctTop3Ufs > 80
              ? "Diversificar canais de distribuição para UFs com presença incipiente"
              : "Manter monitoramento — concentração dentro de patamar aceitável"
          }
        />
        <InsightCard
          icon={<Plane className="h-5 w-5" />}
          accent={totais.pctExportacao > 0 ? CORES.exportacao : CORES.interestadual}
          titulo={
            totais.pctExportacao > 0 ? "Exportação em curso" : "Oportunidade: exportação"
          }
          texto={
            totais.pctExportacao > 0 ? (
              <>
                <strong>{totais.pctExportacao.toFixed(1)}%</strong> do faturamento já vai para
                exportação. Na reforma, esse fluxo se beneficia da{" "}
                <strong>imunidade total IBS/CBS</strong> + créditos amplos sobre insumos.
              </>
            ) : (
              <>
                <strong>0%</strong> de fluxo de exportação atual. Na reforma, exportações têm{" "}
                <strong>imunidade total de IBS/CBS</strong> + manutenção de créditos sobre insumos.
                Açúcar tem mercado externo robusto.
              </>
            )
          }
          acao={
            totais.pctExportacao > 0
              ? "Avaliar ampliação do mix exportador para outros produtos"
              : "Avaliar habilitação no Radar e cadastro de exportador"
          }
        />
        <InsightCard
          icon={<Lightbulb className="h-5 w-5" />}
          accent={totais.deltaPp < 0 ? CORES.interno : "#E11D48"}
          titulo={
            totais.deltaPp < 0 ? "Alívio agregado de carga" : "Aumento agregado de carga"
          }
          texto={
            <>
              Δ pp ponderado de <strong>{fmtPp(totais.deltaPp)}</strong> sobre o portfólio do
              filtro atual. Carga antes <strong>{totais.cargaAntesPct.toFixed(2)}%</strong> → carga
              depois <strong>{totais.cargaDepoisPct.toFixed(2)}%</strong>. Produtos sem anexo
              (peças e insumos) sobem para 27,5% — pressão isolada sobre custos de manutenção.
            </>
          }
          acao={
            totais.deltaPp < 0
              ? "Revisar fornecedores de insumos sem anexo para aproveitar créditos plenos"
              : "Renegociar margens com clientes ou rever mix de produtos"
          }
        />
      </div>

      {/* ─────────── Rodapé: Notas metodológicas ─────────── */}
      <NotasMetodologicas
        notas={[
          NOTA_TRIBUTO_ANTES,
          NOTA_TRIBUTO_DEPOIS,
          {
            titulo: "Natureza do destino",
            texto: (
              <>
                Derivada da comparação <code className="font-mono">uf_emit</code> vs{" "}
                <code className="font-mono">uf_dest</code>: iguais = Interno, diferentes =
                Interestadual. Exportação seria CFOP iniciada em 7.
              </>
            ),
          },
          NOTA_SEM_ANEXO,
          NOTA_BASE_SAIDAS,
        ]}
      />

      <UfDrillDown
        uf={ufDrillDown}
        onClose={() => setUfDrillDown(null)}
        filtros={filtros}
        fatosPorUfProduto={fatosBrutos}
        clientes={clientesBrutos}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight Card

interface InsightCardProps {
  icon: ReactNode;
  accent: string;
  titulo: string;
  texto: ReactNode;
  acao: string;
}

function InsightCard({ icon, accent, titulo, texto, acao }: InsightCardProps) {
  return (
    <Card className="border-slate-200 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
          <h4 className="text-sm font-bold text-slate-900 leading-tight pt-1">{titulo}</h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{texto}</p>
        <div className="flex items-start gap-1.5 pt-3 border-t border-slate-100">
          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
          <p className="text-[11px] font-semibold text-slate-700">{acao}</p>
        </div>
      </CardContent>
    </Card>
  );
}
