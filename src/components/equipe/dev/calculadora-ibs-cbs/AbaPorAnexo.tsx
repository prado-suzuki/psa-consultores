import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useApuracaoIbsCbs } from "@/hooks/useApuracaoIbsCbs";
import type { ApuracaoFiltros } from "@/lib/ibs-cbs/types";
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPct } from "@/lib/ibs-cbs/formatters";

const PALETA = ["#0D9488", "#65A30D", "#F2810A", "#3478F5", "#6B46E8", "#0A9BB5", "#E0404A"];

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
}

function TreemapNode(props: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", fill = "#0D9488" } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
      {width > 60 && height > 30 && (
        <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={600}>
          {name}
        </text>
      )}
    </g>
  );
}

interface AbaPorAnexoProps {
  filtros: ApuracaoFiltros;
}

export function AbaPorAnexo({ filtros }: AbaPorAnexoProps) {
  const { isLoading, error, porAnexo, totais } = useApuracaoIbsCbs(filtros);

  const treemapData = useMemo(
    () =>
      porAnexo
        .filter((a) => a.tributoDepois > 0 || a.faturamento > 0)
        .map((a, i) => ({
          name: a.anexo,
          size: Math.max(a.tributoDepois, a.faturamento * 0.001),
          fill: PALETA[i % PALETA.length],
          tributoDepois: a.tributoDepois,
          faturamento: a.faturamento,
        })),
    [porAnexo]
  );

  const donutData = useMemo(
    () => porAnexo.map((a, i) => ({ name: a.anexo, value: a.faturamento, fill: PALETA[i % PALETA.length] })),
    [porAnexo]
  );

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-xs">
          Agrupamento por <strong>regra_reducao</strong> (Anexos da LC 214/2025). Cálculo sobre saídas — não considera
          créditos.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Apuração por anexo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Anexo</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">% fat.</TableHead>
                  <TableHead className="text-right">Alíq. média</TableHead>
                  <TableHead className="text-right">Redução média</TableHead>
                  <TableHead className="text-right">Trib. ANTES</TableHead>
                  <TableHead className="text-right">Trib. DEPOIS</TableHead>
                  <TableHead className="text-right">% carga</TableHead>
                  <TableHead className="text-right">NFs</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAnexo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  porAnexo.map((a, i) => (
                    <TableRow key={a.anexo}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: PALETA[i % PALETA.length] }}
                          />
                          <span className="font-medium">{a.anexo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(a.faturamento)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(totais.faturamento > 0 ? a.faturamento / totais.faturamento : 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{a.aliqMedia.toFixed(2)}%</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(a.reducaoMedia * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-orange-700">
                        {fmtBRL(a.tributoAntes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-teal-700 font-medium">
                        {fmtBRL(a.tributoDepois)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge
                          variant="secondary"
                          className={`${
                            a.cargaPct > 0.05
                              ? "bg-rose-100 text-rose-700"
                              : a.cargaPct > 0.001
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {fmtPct(a.cargaPct)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(a.qtdNFs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(a.qtdItens)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Tributo IBS/CBS por anexo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treemapData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  stroke="#fff"
                  fill="#0D9488"
                  content={<TreemapNode />}
                >
                  <Tooltip
                    formatter={(
                      _value: number,
                      _name: unknown,
                      item: { payload?: { tributoDepois: number; faturamento: number; name: string } },
                    ) => {
                      const p = item.payload;
                      if (!p) return ["", ""];
                      return [
                        `Trib. depois: ${fmtBRLCompact(p.tributoDepois)} · Fat: ${fmtBRLCompact(p.faturamento)}`,
                        p.name,
                      ];
                    }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0" }}
                  />
                </Treemap>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              % faturamento por anexo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {donutData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name) => [fmtBRL(v), name]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
