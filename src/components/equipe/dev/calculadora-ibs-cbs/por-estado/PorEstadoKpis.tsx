import { Globe, MapPin, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { fmtInt, fmtPp } from "@/lib/ibs-cbs/formatters";
import type { TotaisPorEstado, UfAgregada } from "@/lib/porEstadoIbsCbsModel";
import { CORES_POR_ESTADO } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/constants";
import { KpiCard } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives";

interface PorEstadoKpisProps {
  totais: TotaisPorEstado;
  ufs: UfAgregada[];
  pctTop3Ufs: number;
  quantidadeClientes: number;
  totalClientesDistintos: number;
  filtrosAtivos: boolean;
}

export function PorEstadoKpis({ totais, ufs, pctTop3Ufs, quantidadeClientes, totalClientesDistintos, filtrosAtivos }: PorEstadoKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="UFs atendidas"
        value={fmtInt(totais.qtdUfs)}
        sub={<><p>Top destino: <strong className="text-slate-700">{ufs[0]?.uf ?? "—"}</strong></p><p className="text-slate-400">{filtrosAtivos ? `${fmtInt(quantidadeClientes)} clientes no filtro` : `${fmtInt(totalClientesDistintos)} clientes distintos`}</p></>}
        accent={CORES_POR_ESTADO.neutral}
        icon={<MapPin className="h-4 w-4" />}
        hint={<>Quantidade de Unidades Federativas que aparecem como <strong>destino (uf_dest)</strong> nas saídas. Não considera tipo de operação — interno e interestadual entram juntos.</>}
      />
      <KpiCard
        label="Concentração Top-3 UFs"
        value={`${pctTop3Ufs.toFixed(1)}%`}
        sub={<><p className={`font-semibold ${pctTop3Ufs > 80 ? "text-rose-600" : pctTop3Ufs > 60 ? "text-amber-600" : "text-emerald-600"}`}>{pctTop3Ufs > 80 ? "Alta concentração geográfica" : pctTop3Ufs > 60 ? "Concentração moderada" : "Distribuição saudável"}</p><p className="text-slate-400">{ufs.slice(0, 3).map((uf) => uf.uf).join(" + ")}</p></>}
        accent={pctTop3Ufs > 80 ? "#E11D48" : "#F2810A"}
        icon={<ShieldAlert className="h-4 w-4" />}
        hint={<>Soma do <strong>% de faturamento</strong> das 3 UFs com maior volume. Acima de 80% sinaliza dependência geográfica — qualquer mudança regulatória regional ou instabilidade comercial nesses estados afeta diretamente o resultado.</>}
      />
      <KpiCard
        label="Mix por natureza"
        value={`${totais.pctInterno.toFixed(0)} / ${totais.pctInterestadual.toFixed(0)} / ${totais.pctExportacao.toFixed(0)}`}
        sub={<div className="flex items-center gap-2 mt-1 text-[10px]"><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES_POR_ESTADO.interno }} />Interno</span><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES_POR_ESTADO.interestadual }} />Inter.</span><span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CORES_POR_ESTADO.exportacao }} />Export.</span></div>}
        accent={CORES_POR_ESTADO.interestadual}
        icon={<Globe className="h-4 w-4" />}
        hint={<>Composição do faturamento por tipo de destino: <strong>Interno</strong> (uf_dest = MT, UF de origem) · <strong>Interestadual</strong> (outras UFs) · <strong>Exportação</strong> (CFOP iniciado por 7). No regime IBS/CBS, exportação tem <strong>imunidade total</strong>; interestadual recolhe IBS no <strong>destino</strong>.</>}
      />
      <KpiCard
        label="Δ pp ponderado"
        value={fmtPp(totais.deltaPp)}
        sub={<><p className="text-slate-400">Antes: <strong className="text-muted-foreground">{totais.cargaAntesPct.toFixed(2)}%</strong> · Depois: <strong className="text-muted-foreground">{totais.cargaDepoisPct.toFixed(2)}%</strong></p><div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${totais.deltaPp < 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{totais.deltaPp < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}{totais.deltaPp < 0 ? "Reforma alivia carga" : "Reforma aumenta carga"}</div></>}
        accent={totais.deltaPp < 0 ? CORES_POR_ESTADO.anexoI : "#E11D48"}
        icon={totais.deltaPp < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
        hint={<>Variação em <strong>pontos percentuais</strong> da carga tributária sobre o faturamento, ANTES vs DEPOIS da reforma. Fórmula: <code className="text-[10px]">((tributoDepois - tributoAntes) / faturamento) × 100</code>. Tributo antes = ICMS + ICMS-ST + IPI + PIS + COFINS somados do XML. Tributo depois = valor IBS+CBS calculado pela classificação no anexo.</>}
      />
    </div>
  );
}
