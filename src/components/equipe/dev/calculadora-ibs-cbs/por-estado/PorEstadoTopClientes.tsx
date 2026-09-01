import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL, fmtInt } from "@/lib/ibs-cbs/formatters";
import type { FatoCliente } from "@/lib/ibs-cbs/types";
import { CORES_NATUREZA, LABEL_NATUREZA } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/constants";
import { HelpHint } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives";

interface PorEstadoTopClientesProps {
  clientes: FatoCliente[];
  quantidadeClientes: number;
  faturamentoTotal: number;
  pctTop3Clientes: number;
}

export function PorEstadoTopClientes({ clientes, quantidadeClientes, faturamentoTotal, pctTop3Clientes }: PorEstadoTopClientesProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />Top 12 Clientes — Quem está demandando<HelpHint>Clientes agrupados pelo <strong>nome do destinatário (nome_dest)</strong>, consolidando filiais (CNPJs distintos com mesmo nome). Universo do filtro atual: <strong>{fmtInt(quantidadeClientes)} clientes</strong>. Top 3 representam <strong>{pctTop3Clientes.toFixed(1)}%</strong> do faturamento do filtro — métrica clássica de risco de concentração comercial.</HelpHint></CardTitle><p className="text-xs text-slate-500">Top 3 concentram <strong>{pctTop3Clientes.toFixed(1)}%</strong> do faturamento — monitorar risco de concentração</p></CardHeader>
      <CardContent className="p-0">{clientes.length === 0 ? <p className="text-sm text-slate-400 py-12 text-center">Sem clientes para os filtros atuais</p> : <div className="overflow-x-auto"><Table>
        <TableHeader><TableRow className="bg-muted hover:bg-muted"><TableHead className="w-12">#</TableHead><TableHead>Cliente</TableHead><TableHead>UF</TableHead><TableHead>Natureza</TableHead><TableHead>Produto principal</TableHead><TableHead className="text-right">NFs</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">% Total</TableHead></TableRow></TableHeader>
        <TableBody>{clientes.map((cliente, indice) => {
          const percentual = faturamentoTotal > 0 ? (cliente.faturamento / faturamentoTotal) * 100 : 0;
          const cor = CORES_NATUREZA[cliente.natureza];
          return <TableRow key={cliente.nome}><TableCell className="font-bold text-slate-400">{indice + 1}</TableCell><TableCell><p className="font-medium text-slate-900">{cliente.nome}</p></TableCell><TableCell><Badge variant="outline" className="font-bold">{cliente.uf}</Badge></TableCell><TableCell><Badge variant="secondary" style={{ background: `${cor}20`, color: cor }} className="text-[10px]">{LABEL_NATUREZA[cliente.natureza]}</Badge></TableCell><TableCell className="text-xs text-slate-600">{cliente.produtoPrincipal}</TableCell><TableCell className="text-right tabular-nums">{fmtInt(cliente.qtdNFs)}</TableCell><TableCell className="text-right tabular-nums font-semibold">{fmtBRL(cliente.faturamento)}</TableCell><TableCell className="text-right tabular-nums"><div className="flex items-center justify-end gap-2"><div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, percentual * 4)}%`, background: cor }} /></div><span className="font-semibold">{percentual.toFixed(2)}%</span></div></TableCell></TableRow>;
        })}</TableBody>
      </Table></div>}</CardContent>
    </Card>
  );
}
