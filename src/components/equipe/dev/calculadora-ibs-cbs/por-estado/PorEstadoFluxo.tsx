import { Plane } from "lucide-react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip as ChartTooltip } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtBRL, fmtBRLCompact } from "@/lib/ibs-cbs/formatters";
import type { MetricaSankey, SankeyPorEstadoData } from "@/lib/porEstadoIbsCbsModel";
import { HelpHint } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives";

interface SankeyNodeProps {
  x?: number; y?: number; width?: number; height?: number; index?: number;
  payload?: { name: string; cor?: string; valor?: number }; containerWidth?: number;
}

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload, containerWidth = 0 }: SankeyNodeProps) {
  const esquerda = x < containerWidth / 2;
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={payload?.cor ?? "#94A3B8"} fillOpacity={0.85} />
      <text x={esquerda ? x - 8 : x + width + 8} y={y + height / 2} textAnchor={esquerda ? "end" : "start"} dominantBaseline="middle" fontSize={12} fontWeight={600} fill="#334155">{payload?.name}</text>
      {payload?.valor !== undefined && <text x={esquerda ? x - 8 : x + width + 8} y={y + height / 2 + 14} textAnchor={esquerda ? "end" : "start"} dominantBaseline="middle" fontSize={10} fill="#94A3B8">{fmtBRLCompact(payload.valor)}</text>}
    </Layer>
  );
}

interface PorEstadoFluxoProps {
  metrica: MetricaSankey;
  onMetricaChange: (metrica: MetricaSankey) => void;
  dados: SankeyPorEstadoData;
  pctExportacao: number;
}

export function PorEstadoFluxo({ metrica, onMetricaChange, dados, pctExportacao }: PorEstadoFluxoProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">Fluxo Produto → Destino<HelpHint>Cada faixa representa o fluxo de um <strong>produto (NCM)</strong> para uma <strong>natureza de destino</strong>. Espessura proporcional à métrica escolhida. Os 6 produtos de maior valor são mostrados individualmente; os demais são consolidados em "Outros".</HelpHint></CardTitle><p className="text-xs text-slate-500 mt-1">Onde cada produto está sendo vendido — espessura por {metrica === "faturamento" ? "faturamento" : "tributo IBS/CBS"}</p></div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button size="sm" variant={metrica === "faturamento" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => onMetricaChange("faturamento")}>Faturamento</Button>
          <Button size="sm" variant={metrica === "tributoDepois" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => onMetricaChange("tributoDepois")}>Tributo IBS/CBS</Button>
        </div>
      </CardHeader>
      <CardContent>
        {dados.links.length === 0 ? <div className="py-16 text-center text-sm text-slate-400">Sem fluxo de {metrica === "faturamento" ? "faturamento" : "tributo"} para esta seleção</div> : (
          <ResponsiveContainer width="100%" height={420}><Sankey data={dados} nodePadding={28} nodeWidth={14} margin={{ top: 16, right: 200, bottom: 16, left: 200 }} link={{ stroke: "#CBD5E1", strokeOpacity: 0.4 }} node={<SankeyNode />}><ChartTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0", fontSize: 12 }} formatter={(value: number) => [fmtBRL(value), metrica === "faturamento" ? "Faturamento" : "Tributo"]} /></Sankey></ResponsiveContainer>
        )}
        {pctExportacao === 0 && <Alert variant="warning" className="mt-4"><Plane className="h-4 w-4" /><AlertDescription className="text-xs"><strong>Sem fluxo de exportação detectado</strong> (nenhuma CFOP iniciada em 7). Na reforma, exportações têm <strong>imunidade total de IBS/CBS</strong> + manutenção de créditos sobre insumos.</AlertDescription></Alert>}
      </CardContent>
    </Card>
  );
}
