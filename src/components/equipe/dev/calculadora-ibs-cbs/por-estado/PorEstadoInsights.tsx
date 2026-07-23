import { Building2, Lightbulb, Plane } from "lucide-react";
import { fmtPp } from "@/lib/ibs-cbs/formatters";
import type { TotaisPorEstado, UfAgregada } from "@/lib/porEstadoIbsCbsModel";
import { CORES_POR_ESTADO } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/constants";
import { InsightCard } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives";

interface PorEstadoInsightsProps {
  totais: TotaisPorEstado;
  ufs: UfAgregada[];
  pctTop3Ufs: number;
}

export function PorEstadoInsights({ totais, ufs, pctTop3Ufs }: PorEstadoInsightsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <InsightCard
        icon={<Building2 className="h-5 w-5" />}
        accent={pctTop3Ufs > 80 ? "#E11D48" : "#F2810A"}
        titulo="Concentração geográfica"
        texto={<><strong>{pctTop3Ufs.toFixed(1)}%</strong> do faturamento concentrado em apenas 3 UFs ({ufs.slice(0, 3).map((uf) => uf.uf).join(", ")}). Mudança regulatória regional ou ruptura comercial nesses estados afeta diretamente o resultado.</>}
        acao={pctTop3Ufs > 80 ? "Diversificar canais de distribuição para UFs com presença incipiente" : "Manter monitoramento — concentração dentro de patamar aceitável"}
      />
      <InsightCard
        icon={<Plane className="h-5 w-5" />}
        accent={totais.pctExportacao > 0 ? CORES_POR_ESTADO.exportacao : CORES_POR_ESTADO.interestadual}
        titulo={totais.pctExportacao > 0 ? "Exportação em curso" : "Oportunidade: exportação"}
        texto={totais.pctExportacao > 0 ? <><strong>{totais.pctExportacao.toFixed(1)}%</strong> do faturamento já vai para exportação. Na reforma, esse fluxo se beneficia da <strong>imunidade total IBS/CBS</strong> + créditos amplos sobre insumos.</> : <><strong>0%</strong> de fluxo de exportação atual. Na reforma, exportações têm <strong>imunidade total de IBS/CBS</strong> + manutenção de créditos sobre insumos. Açúcar tem mercado externo robusto.</>}
        acao={totais.pctExportacao > 0 ? "Avaliar ampliação do mix exportador para outros produtos" : "Avaliar habilitação no Radar e cadastro de exportador"}
      />
      <InsightCard
        icon={<Lightbulb className="h-5 w-5" />}
        accent={totais.deltaPp < 0 ? CORES_POR_ESTADO.interno : "#E11D48"}
        titulo={totais.deltaPp < 0 ? "Alívio agregado de carga" : "Aumento agregado de carga"}
        texto={<>Δ pp ponderado de <strong>{fmtPp(totais.deltaPp)}</strong> sobre o portfólio do filtro atual. Carga antes <strong>{totais.cargaAntesPct.toFixed(2)}%</strong> → carga depois <strong>{totais.cargaDepoisPct.toFixed(2)}%</strong>. Produtos sem anexo (peças e insumos) sobem para 27,5% — pressão isolada sobre custos de manutenção.</>}
        acao={totais.deltaPp < 0 ? "Revisar fornecedores de insumos sem anexo para aproveitar créditos plenos" : "Renegociar margens com clientes ou rever mix de produtos"}
      />
    </div>
  );
}
