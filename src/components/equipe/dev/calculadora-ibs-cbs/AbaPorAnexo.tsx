import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { useApuracaoIbsCbs } from "@/hooks/useApuracaoIbsCbs";
import type { ApuracaoFiltros } from "@/lib/ibs-cbs/types";
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPct } from "@/lib/ibs-cbs/formatters";

const PALETA = ["#0D9488", "#65A30D", "#F2810A", "#3478F5", "#6B46E8", "#0A9BB5", "#E0404A"];

const BASE_LEGAL: Record<string, { artigo: string; texto: string }> = {
  "Anexo I": {
    artigo: "Art. 125",
    texto:
      "Alíquotas do IBS e da CBS reduzidas a zero sobre vendas de produtos destinados à alimentação humana listados no Anexo I (Cesta Básica Nacional de Alimentos), conforme EC 132/2023.",
  },
  "Anexo VII": {
    artigo: "Art. 135",
    texto:
      "Alíquotas do IBS e da CBS reduzidas em 60% sobre o fornecimento de alimentos destinados ao consumo humano listados no Anexo VII, com classificações NCM/SH.",
  },
  "Anexo IX": {
    artigo: "Art. 138",
    texto:
      "Alíquotas do IBS e da CBS reduzidas em 60% sobre o fornecimento de insumos agropecuários e aquícolas listados no Anexo IX, com classificações NCM/SH e NBS.",
  },
  "Anexo XV": {
    artigo: "Art. 148",
    texto:
      "Alíquotas do IBS e da CBS reduzidas a zero sobre o fornecimento de produtos hortícolas, frutas e ovos listados no Anexo XV, com classificações NCM/SH.",
  },
  "Seção VI": {
    artigo: "Art. 180",
    texto:
      "Vedada a apropriação de créditos sobre aquisições de combustíveis sujeitos à incidência única do IBS e da CBS quando destinadas à distribuição, comercialização ou revenda.",
  },
};

interface AbaPorAnexoProps {
  filtros: ApuracaoFiltros;
}

export function AbaPorAnexo({ filtros }: AbaPorAnexoProps) {
  const { isLoading, error, porAnexo, totais } = useApuracaoIbsCbs(filtros);

  const barData = useMemo(
    () =>
      porAnexo
        .filter((a) => a.tributoDepois > 0 || a.faturamento > 0)
        .map((a, i) => ({
          name: a.anexo,
          tributoDepois: a.tributoDepois,
          faturamento: a.faturamento,
          fill: PALETA[i % PALETA.length],
        }))
        .sort((a, b) => b.tributoDepois - a.tributoDepois),
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
        <Skeleton className="h-72" />
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
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help">
                          Alíq. efetiva
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                        Alíquota IBS/CBS já após a redução do anexo. Quando há ICMS monofásico
                        (ex.: Seção VI), a carga DEPOIS pode ser maior que a alíquota efetiva.
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">Redução média</TableHead>
                  <TableHead className="text-right">Trib. ANTES</TableHead>
                  <TableHead className="text-right">Trib. DEPOIS</TableHead>
                  <TableHead className="text-right">Carga DEPOIS</TableHead>
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
                  porAnexo.map((a, i) => {
                    const base = BASE_LEGAL[a.anexo];
                    const trigger = (
                      <div className="flex items-center gap-2 w-fit">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: PALETA[i % PALETA.length] }}
                        />
                        <span
                          className={`font-medium ${
                            base ? "underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help" : ""
                          }`}
                        >
                          {a.anexo}
                        </span>
                      </div>
                    );
                    return (
                    <TableRow key={a.anexo}>
                      <TableCell>
                        {base ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm text-xs leading-relaxed">
                              <div className="font-semibold mb-1">
                                {a.anexo} — {base.artigo}
                              </div>
                              <div className="text-slate-900">{base.texto}</div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          trigger
                        )}
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
                          <span className="inline-flex items-center gap-1">
                            {a.cargaPct > 0.0001 ? "▲" : a.cargaPct < -0.0001 ? "▼" : "▬"}
                            {fmtPct(a.cargaPct).replace("%", "").trim()}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(a.qtdNFs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(a.qtdItens)}</TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Tributo IBS/CBS por anexo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={barData} margin={{ left: 12, right: 24, top: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F0" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="name"
                  stroke="#7A8899"
                  fontSize={12}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  type="number"
                  tickFormatter={(v) => fmtBRLCompact(v)}
                  stroke="#7A8899"
                  fontSize={12}
                />
                <ChartTooltip
                  formatter={(
                    _value: number,
                    _name: unknown,
                    item: { payload?: { tributoDepois: number; faturamento: number; name: string } },
                  ) => {
                    const p = item.payload;
                    if (!p) return ["", ""];
                    return [
                      `Trib. depois: ${fmtBRL(p.tributoDepois)} · Fat: ${fmtBRL(p.faturamento)}`,
                      p.name,
                    ];
                  }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0" }}
                />
                <Bar dataKey="tributoDepois" maxBarSize={56} radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
