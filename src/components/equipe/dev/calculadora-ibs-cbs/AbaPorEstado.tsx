import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalculadoraPorUf } from "@/hooks/useCalculadoraIbsCbs";
import type { ApuracaoFiltros, CalculadoraPorUfResponse } from "@/lib/ibs-cbs/types";
import {
  agregarPorUf,
  calcularConcentracaoTop3Clientes,
  calcularConcentracaoTop3Ufs,
  calcularTotaisPorEstado,
  criarSankeyPorEstado,
  filtrarClientesPorEstado,
  filtrarFatosPorEstado,
  ordenarTopClientes,
  type MetricaSankey,
} from "@/lib/porEstadoIbsCbsModel";
import { NotasMetodologicas } from "@/components/equipe/dev/calculadora-ibs-cbs/NotasMetodologicas";
import { NOTA_BASE_SAIDAS, NOTA_SEM_ANEXO, NOTA_TRIBUTO_ANTES, NOTA_TRIBUTO_DEPOIS } from "@/components/equipe/dev/calculadora-ibs-cbs/notasMetodologicas.constants";
import { PorEstadoFluxo } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoFluxo";
import { PorEstadoInsights } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoInsights";
import { PorEstadoKpis } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoKpis";
import { PorEstadoTopClientes } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoTopClientes";
import { PorEstadoUfs } from "@/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoUfs";
import { UfDrillDown } from "@/components/equipe/dev/calculadora-ibs-cbs/UfDrillDown";

const EMPTY_POR_UF_RESPONSE: CalculadoraPorUfResponse = {
  fatosPorUfProduto: [],
  clientes: [],
  totalClientesDistintos: 0,
};

interface AbaPorEstadoProps {
  filtros: ApuracaoFiltros;
  idContribuinte: string;
}

export function AbaPorEstado({ filtros, idContribuinte }: AbaPorEstadoProps) {
  const { isLoading, error, data } = useCalculadoraPorUf(idContribuinte, filtros);
  const [metricaSankey, setMetricaSankey] = useState<MetricaSankey>("faturamento");
  const [ufDrillDown, setUfDrillDown] = useState<string | null>(null);
  const dados = data ?? EMPTY_POR_UF_RESPONSE;

  // A API já recebe os filtros, mas esta segunda aplicação client-side é deliberada.
  const fatosFiltrados = useMemo(
    () => filtrarFatosPorEstado(dados.fatosPorUfProduto, filtros),
    [dados.fatosPorUfProduto, filtros],
  );
  const clientesFiltrados = useMemo(
    () => filtrarClientesPorEstado(dados.clientes, filtros),
    [dados.clientes, filtros],
  );
  const totais = useMemo(() => calcularTotaisPorEstado(fatosFiltrados), [fatosFiltrados]);
  const ufs = useMemo(() => agregarPorUf(fatosFiltrados), [fatosFiltrados]);
  const pctTop3Ufs = useMemo(
    () => calcularConcentracaoTop3Ufs(ufs, totais.faturamento),
    [ufs, totais.faturamento],
  );
  const pctTop3Clientes = useMemo(
    () => calcularConcentracaoTop3Clientes(clientesFiltrados, totais.faturamento),
    [clientesFiltrados, totais.faturamento],
  );
  const sankey = useMemo(
    () => criarSankeyPorEstado(fatosFiltrados, metricaSankey),
    [fatosFiltrados, metricaSankey],
  );
  const topClientes = useMemo(() => ordenarTopClientes(clientesFiltrados), [clientesFiltrados]);
  const filtrosAtivos = filtros.ufs.length > 0 || filtros.anexos.length > 0;

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Falha ao carregar: {(error as Error).message}</AlertDescription></Alert>;
  }
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>;
  }
  if (fatosFiltrados.length === 0) {
    return <Alert variant="warning"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-xs">Nenhum dado para os filtros atuais. Tente remover restrições de UF ou Anexo.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <PorEstadoKpis totais={totais} ufs={ufs} pctTop3Ufs={pctTop3Ufs} quantidadeClientes={clientesFiltrados.length} totalClientesDistintos={dados.totalClientesDistintos} filtrosAtivos={filtrosAtivos} />
      <PorEstadoFluxo metrica={metricaSankey} onMetricaChange={setMetricaSankey} dados={sankey} pctExportacao={totais.pctExportacao} />
      <PorEstadoUfs ufs={ufs} faturamentoTotal={totais.faturamento} onSelecionarUf={setUfDrillDown} />
      <PorEstadoTopClientes clientes={topClientes} quantidadeClientes={clientesFiltrados.length} faturamentoTotal={totais.faturamento} pctTop3Clientes={pctTop3Clientes} />
      <PorEstadoInsights totais={totais} ufs={ufs} pctTop3Ufs={pctTop3Ufs} />
      <NotasMetodologicas notas={[NOTA_TRIBUTO_ANTES, NOTA_TRIBUTO_DEPOIS, { titulo: "Natureza do destino", texto: <>Derivada da comparação <code className="font-mono">uf_emit</code> vs <code className="font-mono">uf_dest</code>: iguais = Interno, diferentes = Interestadual. Exportação seria CFOP iniciada em 7.</> }, NOTA_SEM_ANEXO, NOTA_BASE_SAIDAS]} />
      <UfDrillDown uf={ufDrillDown} onClose={() => setUfDrillDown(null)} filtros={filtros} fatosPorUfProduto={dados.fatosPorUfProduto} clientes={dados.clientes} />
    </div>
  );
}
