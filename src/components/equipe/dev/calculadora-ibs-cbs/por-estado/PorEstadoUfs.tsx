import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPp } from "@/lib/ibs-cbs/formatters";
import type { UfAgregada } from "@/lib/porEstadoIbsCbsModel";
import { CORES_NATUREZA, LABEL_NATUREZA } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/constants";
import { HelpHint } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives";

interface PorEstadoUfsProps {
  ufs: UfAgregada[];
  faturamentoTotal: number;
  onSelecionarUf: (uf: string) => void;
}

export function PorEstadoUfs({ ufs, faturamentoTotal, onSelecionarUf }: PorEstadoUfsProps) {
  const maximo = ufs[0]?.faturamento ?? 1;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <Card className="border-border xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">Mapa de exposição por UF<HelpHint><strong>Intensidade da cor</strong> proporcional ao faturamento. <strong>Cor do badge</strong> indica a natureza (Interno/Inter./Exp.). <strong>Alíq efet.</strong> é a alíquota efetiva ponderada de IBS/CBS sobre o faturamento da UF. <strong>Δ pp</strong> compara a carga antes vs depois. <strong>Clique em qualquer UF</strong> para abrir o drill-down completo (produtos + clientes).</HelpHint></CardTitle>
          <p className="text-xs text-slate-500">Clique em uma UF para ver detalhes · intensidade = faturamento · cor = natureza</p>
        </CardHeader>
        <CardContent><div className="grid grid-cols-2 gap-3">{ufs.map((uf) => {
          const cor = CORES_NATUREZA[uf.natureza];
          return <button key={uf.uf} type="button" onClick={() => onSelecionarUf(uf.uf)} className="group relative rounded-lg border border-border overflow-hidden bg-white text-left hover:border-slate-400 hover:shadow-md transition-all cursor-pointer" title={`Ver detalhamento de ${uf.uf}`}>
            <div className="absolute inset-0 group-hover:opacity-80 transition-opacity" style={{ background: cor, opacity: 0.05 + (uf.faturamento / maximo) * 0.18 }} />
            <div className="relative p-3"><div className="flex items-center justify-between mb-1"><span className="font-bold text-lg text-slate-900">{uf.uf}</span><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${cor}25`, color: cor }}>{uf.natureza === "interno" ? "MT" : uf.natureza === "interestadual" ? "Inter." : "Exp."}</span></div><p className="text-sm font-bold text-slate-900 tabular-nums">{fmtBRLCompact(uf.faturamento)}</p><p className="text-[11px] text-slate-500 mt-0.5">{fmtInt(uf.qtdNFs)} NFs · alíq {uf.aliqDepois.toFixed(1)}%</p><div className="flex items-center justify-between mt-1.5"><div className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${uf.tributoDepois - uf.tributoAntes < 0 ? "text-emerald-700" : "text-rose-700"}`}>{uf.tributoDepois - uf.tributoAntes < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}{fmtPp(uf.aliqDepois - uf.aliqAntes)}</div><span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-medium">Detalhes →</span></div></div>
          </button>;
        })}</div></CardContent>
      </Card>
      <Card className="border-border xl:col-span-3">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">Detalhamento por UF<HelpHint><strong>Faturamento</strong>: soma de vProd nas saídas com essa uf_dest.<br /><strong>% Total</strong>: participação no faturamento filtrado.<br /><strong>Ticket médio</strong>: faturamento ÷ qtd. de NFs distintas.<br /><strong>Carga antes / depois</strong>: tributo ÷ faturamento da UF.<br /><strong>Δ pp</strong>: diferença (depois − antes) em pontos percentuais.</HelpHint></CardTitle><p className="text-xs text-slate-500">Ordenado por faturamento</p></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow className="bg-muted hover:bg-muted"><TableHead className="w-14">UF</TableHead><TableHead>Natureza</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">% Total</TableHead><TableHead className="text-right">NFs</TableHead><TableHead className="text-right">Ticket médio</TableHead><TableHead className="text-right">Carga antes</TableHead><TableHead className="text-right">Carga depois</TableHead><TableHead className="text-right">Δ pp</TableHead></TableRow></TableHeader>
          <TableBody>{ufs.map((uf) => {
            const percentual = faturamentoTotal > 0 ? (uf.faturamento / faturamentoTotal) * 100 : 0;
            const cor = CORES_NATUREZA[uf.natureza];
            const delta = uf.aliqDepois - uf.aliqAntes;
            return <TableRow key={uf.uf} onClick={() => onSelecionarUf(uf.uf)} className="cursor-pointer hover:bg-muted"><TableCell className="font-bold">{uf.uf}</TableCell><TableCell><Badge variant="secondary" style={{ background: `${cor}20`, color: cor }} className="text-[10px]">{LABEL_NATUREZA[uf.natureza]}</Badge></TableCell><TableCell className="text-right tabular-nums font-semibold">{fmtBRL(uf.faturamento)}</TableCell><TableCell className="text-right tabular-nums">{percentual.toFixed(2)}%</TableCell><TableCell className="text-right tabular-nums">{fmtInt(uf.qtdNFs)}</TableCell><TableCell className="text-right tabular-nums text-slate-600">{fmtBRL(uf.ticketMedio)}</TableCell><TableCell className="text-right tabular-nums text-orange-700">{uf.aliqAntes.toFixed(2)}%</TableCell><TableCell className="text-right tabular-nums text-primary">{uf.aliqDepois.toFixed(2)}%</TableCell><TableCell className={`text-right tabular-nums font-semibold ${delta < 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmtPp(delta)}</TableCell></TableRow>;
          })}</TableBody>
        </Table></div></CardContent>
      </Card>
    </div>
  );
}
