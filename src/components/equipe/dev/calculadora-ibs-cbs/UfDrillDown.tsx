import { useMemo } from "react";
import { MapPin, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPp } from "@/lib/ibs-cbs/formatters";
import type { ApuracaoFiltros, FatoCliente, FatoUfProduto, NaturezaDestino } from "@/lib/ibs-cbs/types";

const CORES_NATUREZA: Record<NaturezaDestino, string> = {
  interno: "#0D9488",
  interestadual: "#F2810A",
  exportacao: "#3478F5",
};

const LABEL_NATUREZA: Record<NaturezaDestino, string> = {
  interno: "Interno (MT)",
  interestadual: "Interestadual",
  exportacao: "Exportação",
};

const PALETA_ANEXO: Record<string, string> = {
  "Anexo I": "#65A30D",
  "Anexo IX": "#F2810A",
  "Anexo XV": "#6B46E8",
  "Sem anexo": "#94A3B8",
};

interface UfDrillDownProps {
  uf: string | null;
  onClose: () => void;
  filtros?: ApuracaoFiltros;
  fatosPorUfProduto: FatoUfProduto[];
  clientes: FatoCliente[];
}

export function UfDrillDown({ uf, onClose, filtros, fatosPorUfProduto, clientes }: UfDrillDownProps) {
  const open = uf !== null;

  const dados = useMemo(() => {
    if (!uf) return null;
    const anexosFiltro = filtros?.anexos ?? [];
    const produtos = fatosPorUfProduto.filter((f) => {
      if (f.uf !== uf) return false;
      if (anexosFiltro.length > 0 && !anexosFiltro.includes(f.anexo)) return false;
      return true;
    });
    const clientesUf = clientes.filter((c) => {
      if (c.uf !== uf) return false;
      if (anexosFiltro.length > 0 && !anexosFiltro.includes(c.anexoPrincipal)) return false;
      return true;
    });
    const faturamento = produtos.reduce((s, p) => s + p.faturamento, 0);
    const tribAntes = produtos.reduce((s, p) => s + p.tributoAntes, 0);
    const tribDepois = produtos.reduce((s, p) => s + p.tributoDepois, 0);
    const qtdNFs = produtos.reduce((s, p) => s + p.qtdNFs, 0);
    const cargaAntes = faturamento > 0 ? (tribAntes / faturamento) * 100 : 0;
    const cargaDepois = faturamento > 0 ? (tribDepois / faturamento) * 100 : 0;
    const natureza = produtos[0]?.natureza ?? "interestadual";
    return {
      produtos: produtos.sort((a, b) => b.faturamento - a.faturamento),
      clientes: clientesUf.sort((a, b) => b.faturamento - a.faturamento),
      faturamento,
      tribAntes,
      tribDepois,
      qtdNFs,
      cargaAntes,
      cargaDepois,
      deltaPp: cargaDepois - cargaAntes,
      natureza,
    };
  }, [uf, filtros?.anexos, fatosPorUfProduto, clientes]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        {uf && dados && (
          <>
            <SheetHeader className="pb-4 border-b border-slate-100">
              <SheetTitle className="flex items-center gap-3 text-xl">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${CORES_NATUREZA[dados.natureza]}15`,
                    color: CORES_NATUREZA[dados.natureza],
                  }}
                >
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Destino: {uf}</span>
                    <Badge
                      variant="secondary"
                      style={{
                        background: `${CORES_NATUREZA[dados.natureza]}20`,
                        color: CORES_NATUREZA[dados.natureza],
                      }}
                      className="text-[10px]"
                    >
                      {LABEL_NATUREZA[dados.natureza]}
                    </Badge>
                  </div>
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    Drill-down completo das saídas para esta UF
                  </p>
                </div>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detalhamento de produtos e clientes da UF {uf}
              </SheetDescription>
            </SheetHeader>

            {/* KPIs da UF */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Card className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Faturamento
                  </p>
                  <p className="text-lg font-bold tabular-nums">{fmtBRL(dados.faturamento)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{fmtInt(dados.qtdNFs)} NFs</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Δ pp
                  </p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      dados.deltaPp < 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {fmtPp(dados.deltaPp)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {dados.cargaAntes.toFixed(2)}% → {dados.cargaDepois.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 mb-1">
                    Tributo antes
                  </p>
                  <p className="text-lg font-bold tabular-nums text-orange-700">
                    {fmtBRL(dados.tribAntes)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Carga {dados.cargaAntes.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 mb-1">
                    Tributo depois
                  </p>
                  <p className="text-lg font-bold tabular-nums text-teal-700">
                    {fmtBRL(dados.tribDepois)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Carga {dados.cargaDepois.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Interpretação do delta */}
            <div
              className={`mt-4 p-3 rounded-lg text-xs leading-relaxed ${
                dados.deltaPp < 0
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-start gap-2">
                {dados.deltaPp < 0 ? (
                  <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <p>
                  <strong>Interpretação:</strong> a cada R$ 100 vendidos para {uf}, o tributo
                  passa de <strong>R$ {dados.cargaAntes.toFixed(2)}</strong> para{" "}
                  <strong>R$ {dados.cargaDepois.toFixed(2)}</strong>.{" "}
                  {dados.deltaPp < 0
                    ? `Alívio de R$ ${(-dados.deltaPp).toFixed(2)} por R$ 100 — produtos predominantemente em anexo de redução.`
                    : `Aumento de R$ ${dados.deltaPp.toFixed(2)} por R$ 100 — produtos predominantemente "Sem anexo" (regra geral 27,5%).`}
                </p>
              </div>
            </div>

            {/* Tabela de produtos */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Produtos vendidos para {uf} ({dados.produtos.length} NCMs)
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-[11px]">Produto</TableHead>
                      <TableHead className="text-[11px]">Anexo</TableHead>
                      <TableHead className="text-right text-[11px]">Faturam.</TableHead>
                      <TableHead className="text-right text-[11px]">Δ pp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.produtos.map((p) => {
                      const aliqAntes = p.faturamento > 0 ? (p.tributoAntes / p.faturamento) * 100 : 0;
                      const aliqDepois = p.faturamento > 0 ? (p.tributoDepois / p.faturamento) * 100 : 0;
                      const delta = aliqDepois - aliqAntes;
                      const corAnexo = PALETA_ANEXO[p.anexo] ?? "#94A3B8";
                      return (
                        <TableRow key={`${p.ncm}-${p.uf}`}>
                          <TableCell className="py-2">
                            <p className="text-xs font-medium text-slate-900 line-clamp-1" title={p.xProd}>
                              {p.xProd}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">NCM {p.ncm}</p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              style={{ background: `${corAnexo}20`, color: corAnexo }}
                              className="text-[10px]"
                            >
                              {p.anexo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {fmtBRLCompact(p.faturamento)}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums text-xs font-semibold ${
                              delta < 0 ? "text-emerald-700" : delta > 0 ? "text-rose-700" : "text-slate-400"
                            }`}
                          >
                            {fmtPp(delta)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Clientes da UF */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Clientes em {uf} ({dados.clientes.length})
              </h3>
              {dados.clientes.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center border border-slate-200 rounded-lg">
                  Sem clientes nesta UF
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-[11px]">Cliente</TableHead>
                        <TableHead className="text-right text-[11px]">NFs</TableHead>
                        <TableHead className="text-right text-[11px]">Faturam.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.clientes.map((c) => (
                        <TableRow key={c.nome}>
                          <TableCell className="py-2">
                            <p className="text-xs font-medium text-slate-900">{c.nome}</p>
                            <p className="text-[10px] text-slate-500">{c.produtoPrincipal}</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {fmtInt(c.qtdNFs)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-semibold">
                            {fmtBRL(c.faturamento)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 mt-4 italic">
              Clientes da UF, ordenados por faturamento.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
