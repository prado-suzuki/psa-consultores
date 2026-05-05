import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Globe, Layers, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApuracaoIbsCbs } from "@/hooks/useApuracaoIbsCbs";
import type { AgregadoProduto, ApuracaoFiltros } from "@/lib/ibs-cbs/types";
import { exportToCsv } from "@/lib/ibs-cbs/calc";
import { fmtBRL, fmtInt, fmtNum, fmtPp } from "@/lib/ibs-cbs/formatters";

const PALETA: Record<string, string> = {
  "Anexo I": "#0D9488",
  "Anexo IX": "#65A30D",
  "Anexo XV": "#F2810A",
  "Sem anexo": "#94A3B8",
};
const corDoAnexo = (a: string, fallback = "#3478F5") => PALETA[a] ?? fallback;

const PAGE_SIZE = 25;

type SortKey = keyof Pick<
  AgregadoProduto,
  "faturamento" | "qtd" | "tributoAntes" | "tributoDepois" | "deltaRs" | "deltaPp" | "aliqIbsCbs"
>;

interface AbaPorProdutoProps {
  filtros: ApuracaoFiltros;
}

export function AbaPorProduto({ filtros }: AbaPorProdutoProps) {
  const { isLoading, error, porProduto } = useApuracaoIbsCbs(filtros);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("faturamento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return porProduto;
    return porProduto.filter(
      (p) => p.ncm.toLowerCase().includes(q) || p.xProdExemplo.toLowerCase().includes(q)
    );
  }, [porProduto, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const diff = (av as number) - (bv as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
    setPage(1);
  };

  const sortIcon = (k: SortKey) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleExport = () => {
    exportToCsv(
      sorted.map((p) => ({
        NCM: p.ncm,
        Produto_exemplo: p.xProdExemplo,
        Produtos_distintos: p.produtosDistintos,
        Anexo: p.anexo,
        Quantidade: p.qtd,
        Faturamento: p.faturamento.toFixed(2),
        Aliq_IBS_CBS_pct: p.aliqIbsCbs.toFixed(2),
        Tributo_antes: p.tributoAntes.toFixed(2),
        Tributo_depois: p.tributoDepois.toFixed(2),
        Delta_RS: p.deltaRs.toFixed(2),
        Delta_pp: p.deltaPp.toFixed(2),
        NFs: p.qtdNFs,
      })),
      `ibs-cbs-por-ncm-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const scatterData = useMemo(
    () =>
      sorted.slice(0, 200).map((p) => ({
        x: p.faturamento,
        y: p.deltaPp,
        z: Math.max(20, Math.min(280, Math.sqrt(p.faturamento) / 6)),
        anexo: p.anexo,
        produto: p.xProdExemplo,
        ncm: p.ncm,
        fill: corDoAnexo(p.anexo),
      })),
    [sorted]
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
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-xs">
          Comparativo por produto (NCM × xProd). Cálculo sobre saídas — Δ é variação na carga sobre faturamento.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top NCMs por faturamento
            <span className="ml-2 text-xs font-normal text-slate-500">
              ({fmtInt(sorted.length)} NCMs)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por NCM ou produto..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 w-[260px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="sticky left-0 bg-slate-50 z-10 min-w-[140px] font-mono">
                    NCM
                  </TableHead>
                  <TableHead className="min-w-[260px]">Produto (exemplo)</TableHead>
                  <TableHead>Anexo</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("qtd")}>
                    <span className="inline-flex items-center gap-1">Qtd {sortIcon("qtd")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("faturamento")}>
                    <span className="inline-flex items-center gap-1">Faturamento {sortIcon("faturamento")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("aliqIbsCbs")}>
                    <span className="inline-flex items-center gap-1">Alíq IBS/CBS {sortIcon("aliqIbsCbs")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("tributoAntes")}>
                    <span className="inline-flex items-center gap-1">Trib. ANTES {sortIcon("tributoAntes")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("tributoDepois")}>
                    <span className="inline-flex items-center gap-1">Trib. DEPOIS {sortIcon("tributoDepois")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("deltaRs")}>
                    <span className="inline-flex items-center gap-1">Δ R$ {sortIcon("deltaRs")}</span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("deltaPp")}>
                    <span className="inline-flex items-center gap-1">Δ pp {sortIcon("deltaPp")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                      Sem produtos para os filtros atuais
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((p) => (
                    <TableRow key={p.ncm}>
                      <TableCell className="sticky left-0 bg-white z-10 font-mono text-sm">
                        {p.ncm}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 line-clamp-1">{p.xProdExemplo}</p>
                          <p className="text-xs text-slate-500">
                            {p.produtosDistintos === 1
                              ? "1 produto distinto"
                              : `${fmtInt(p.produtosDistintos)} produtos distintos`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            background: `${corDoAnexo(p.anexo)}20`,
                            color: corDoAnexo(p.anexo),
                          }}
                        >
                          {p.anexo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(p.qtd)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(p.faturamento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.aliqIbsCbs.toFixed(2)}%</TableCell>
                      <TableCell className="text-right tabular-nums text-orange-700">
                        {fmtBRL(p.tributoAntes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-teal-700 font-medium">
                        {fmtBRL(p.tributoDepois)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${p.deltaRs < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {p.deltaRs >= 0 ? "+" : ""}
                        {fmtBRL(p.deltaRs)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${p.deltaPp < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {fmtPp(p.deltaPp)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Página {currentPage} de {totalPages} · {fmtInt(sorted.length)} produtos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Onde a reforma muda mais
            <span className="ml-2 text-xs font-normal text-slate-500">
              X: faturamento · Y: Δ pp na carga · cor: anexo
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scatterData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Faturamento"
                  tickFormatter={(v) => fmtBRL(v).replace("R$ ", "R$ ")}
                  stroke="#7A8899"
                  fontSize={11}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Δ pp"
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                  stroke="#7A8899"
                  fontSize={11}
                  width={50}
                />
                <ZAxis type="number" dataKey="z" range={[20, 280]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E9F0" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs">
                        <p className="font-semibold text-slate-800 max-w-[260px] truncate">{d.produto}</p>
                        <p className="text-slate-500 font-mono">NCM {d.ncm}</p>
                        <p className="text-slate-500">{d.anexo}</p>
                        <div className="mt-1 text-slate-700">
                          Faturamento: <strong>{fmtBRL(d.x)}</strong>
                        </div>
                        <div className="text-slate-700">
                          Δ pp: <strong>{fmtPp(d.y)}</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => (
                    <Cell key={i} fill={d.fill} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
