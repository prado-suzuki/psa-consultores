import { ApuracaoDataTable } from "@/components/equipe/dev/pis-cofins/ApuracaoDataTable";
import { BalanceteTreeTable } from "@/components/equipe/dev/pis-cofins/BalanceteTreeTable";
import { MultiSelectContas } from "@/components/equipe/dev/pis-cofins/MultiSelectContas";
import { NEGATIVE_VALUE_CLASS, PeriodResultsTable, POSITIVE_VALUE_CLASS, type PeriodResultRow } from "@/components/equipe/dev/pis-cofins/PeriodResultsTable";
import type { ApuracaoPisCofinsController } from "@/hooks/useApuracaoPisCofinsController";
import { getResultadoColValue, getResultadoLiquidoColValue } from "@/lib/pisCofinsPresentation";

const TOOLTIPS = {
  baseApuracao: "Itens-base utilizados como ponto de partida da apuração: receitas (CST 01–09) e/ou contas do balancete vinculadas, antes de aplicar débitos e créditos.",
  outrasSaidas: "Operações de saída que não geram débito direto, mas compõem a análise (ex.: transferências, devoluções).",
  baseAposIsencoes: "Receita bruta líquida das isenções e exclusões — base efetiva sobre a qual incidem PIS e COFINS.",
  debitosMes: "Valor do débito de PIS/COFINS calculado sobre a base, separado por alíquota cheia e alíquota reduzida.",
  baseCredito: "Soma das aquisições e custos que dão direito a crédito de PIS/COFINS no período.",
  creditoMes: "Crédito apropriado mês a mês para PIS e COFINS, com destaque para alíquota reduzida quando aplicável.",
  apuracaoPis: "Resultado líquido (Débito - Crédito) e evolução do saldo de PIS no período.",
  apuracaoCofins: "Resultado líquido (Débito - Crédito) e evolução do saldo de COFINS no período.",
} as const;

const tabClass = "space-y-8 animate-in fade-in duration-300";

function tableProps(controller: ApuracaoPisCofinsController) {
  return {
    columnsData: controller.calculation.columnsData,
    expandedYears: controller.expandedYears,
    toggleYear: controller.toggleYear,
    columnTooltips: controller.columnTooltips,
  };
}

function periodProps(controller: ApuracaoPisCofinsController) {
  return {
    ...controller.headers,
    expandedYears: controller.expandedYears,
    toggleYear: controller.toggleYear,
    columnTooltips: controller.columnTooltips,
  };
}

export function ResumoTab({ controller }: { controller: ApuracaoPisCofinsController }) {
  const { calculation } = controller;
  return <div className={tabClass}>
    {controller.tipoApuracao === "BALANCETE" && calculation.contasTree.length > 0 ? <div className="space-y-4">
      <MultiSelectContas options={controller.contaOptionsBalancete} selected={controller.selectedContas} onChange={controller.setSelectedContas} placeholder="Filtrar por conta..." />
      <BalanceteTreeTable contasTree={controller.filteredContasTree} periodoFechado={controller.periodoFechado} sectionTitle="Base da Apuração - Balancete" extraContas={new Map(Array.from(controller.extraContas, ([key, value]) => [key, value.tipo]))} efdContas={calculation.efdContasSet} onToggleExtra={controller.handleToggleExtra} onRemoveExtra={controller.handleRemoveExtra} columnTooltips={controller.columnTooltips} />
    </div> : <div className="space-y-4">
      <MultiSelectContas options={controller.contaOptions} selected={controller.selectedContas} onChange={controller.setSelectedContas} placeholder="Filtrar por conta..." />
      <ApuracaoDataTable title={`Base da Apuração - ${controller.tipoApuracao === "EFD" ? "EFD Contribuições" : "Balancete"}`} titleTooltip={TOOLTIPS.baseApuracao} data={controller.filteredResumoData} showCst showBloco highlightHeaderFooter {...tableProps(controller)} />
    </div>}
  </div>;
}

export function DebitosTab({ controller }: { controller: ApuracaoPisCofinsController }) {
  const { resultados, totais, tables } = controller.calculation;
  const debitRows: PeriodResultRow[] = [
    { label: "PIS", className: NEGATIVE_VALUE_CLASS, value: (keys) => getResultadoLiquidoColValue(resultados, keys, (r) => r.resultado.pisContribuicaoBruta, (r) => r.resultado.pisContribuicaoBrutaAliquotaReduzida), total: totais.pisContribuicaoBruta - totais.pisContribuicaoBrutaAliquotaReduzida },
    { label: "COFINS", className: NEGATIVE_VALUE_CLASS, value: (keys) => getResultadoLiquidoColValue(resultados, keys, (r) => r.resultado.cofinsContribuicaoBruta, (r) => r.resultado.cofinsContribuicaoBrutaAliquotaReduzida), total: totais.cofinsContribuicaoBruta - totais.cofinsContribuicaoBrutaAliquotaReduzida },
    { label: "PIS - Alíquota Reduzida", className: NEGATIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => r.resultado.pisContribuicaoBrutaAliquotaReduzida), total: totais.pisContribuicaoBrutaAliquotaReduzida },
    { label: "COFINS - Alíquota Reduzida", className: NEGATIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => r.resultado.cofinsContribuicaoBrutaAliquotaReduzida), total: totais.cofinsContribuicaoBrutaAliquotaReduzida },
  ];
  return <div className={tabClass}>
    <ApuracaoDataTable title="Débitos" titleTooltip="Para débitos são considerados itens de CST 01 a 10." data={tables.debitosData} showTotals highlightHeaderFooter {...tableProps(controller)} />
    <ApuracaoDataTable title="Isenções e Exclusões" titleTooltip="Para isenções e exclusões de débito são considerados itens de CST 04 a 09." data={tables.isencoesData} emptyMessage="Nenhuma isenção/exclusão encontrada." showTotals highlightHeaderFooter {...tableProps(controller)} />
    {tables.outrasSaidasData.length > 0 && <ApuracaoDataTable title="Outras Saídas" titleTooltip={TOOLTIPS.outrasSaidas} data={tables.outrasSaidasData} showTotals highlightHeaderFooter {...tableProps(controller)} />}
    <PeriodResultsTable title="Base de Cálculo Após Isenções/Exclusões" tooltip={TOOLTIPS.baseAposIsencoes} rows={[{ label: "Base Normal", value: (keys) => getResultadoColValue(resultados, keys, (r) => r.baseDebito.baseNormal), total: totais.receitaBruta }]} {...periodProps(controller)} />
    <PeriodResultsTable title="Débitos do Mês" tooltip={TOOLTIPS.debitosMes} rows={debitRows} {...periodProps(controller)} />
  </div>;
}

export function CreditosTab({ controller }: { controller: ApuracaoPisCofinsController }) {
  const { resultados, totais, tables } = controller.calculation;
  const baseRows: PeriodResultRow[] = [
    { label: "Base Normal (1,65% e 7,6%)", value: (keys) => getResultadoColValue(resultados, keys, (r) => r.baseCredito.baseNormal), total: resultados.reduce((sum, r) => sum + r.baseCredito.baseNormal, 0) },
    { label: "Base Presumida (1,2375% e 5,7%)", value: (keys) => getResultadoColValue(resultados, keys, (r) => r.baseCredito.basePresumido), total: resultados.reduce((sum, r) => sum + r.baseCredito.basePresumido, 0) },
    { label: "Total", value: (keys) => getResultadoColValue(resultados, keys, (r) => r.baseCredito.baseTotal), total: totais.baseCredito, totalRow: true },
  ];
  const creditRows: PeriodResultRow[] = [
    { label: "PIS", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoLiquidoColValue(resultados, keys, (r) => r.resultado.pisCreditoMes, (r) => r.resultado.pisCreditoMesAliquotaReduzida), total: totais.pisCreditoMes - totais.pisCreditoMesAliquotaReduzida },
    { label: "COFINS", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoLiquidoColValue(resultados, keys, (r) => r.resultado.cofinsCreditoMes, (r) => r.resultado.cofinsCreditoMesAliquotaReduzida), total: totais.cofinsCreditoMes - totais.cofinsCreditoMesAliquotaReduzida },
    { label: "PIS - Alíquota Reduzida", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => r.resultado.pisCreditoMesAliquotaReduzida), total: totais.pisCreditoMesAliquotaReduzida },
    { label: "COFINS - Alíquota Reduzida", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => r.resultado.cofinsCreditoMesAliquotaReduzida), total: totais.cofinsCreditoMesAliquotaReduzida },
  ];
  return <div className={tabClass}>
    <ApuracaoDataTable title="Créditos" titleTooltip="Para créditos são considerados itens de CST 50 a 66." data={tables.creditosData} showTotals highlightHeaderFooter {...tableProps(controller)} />
    <ApuracaoDataTable title="Operações não geradoras de Crédito" titleTooltip="Para operações não geradoras de crédito são considerados itens de CST 70 a 99." data={tables.isencoesCreditoData} emptyMessage="Nenhuma adição/exclusão de crédito encontrada." showTotals highlightHeaderFooter {...tableProps(controller)} />
    <PeriodResultsTable title="Base de Cálculo do Crédito" tooltip={TOOLTIPS.baseCredito} rows={baseRows} {...periodProps(controller)} />
    <PeriodResultsTable title="Crédito do Mês" tooltip={TOOLTIPS.creditoMes} rows={creditRows} {...periodProps(controller)} />
  </div>;
}

function taxRows(controller: ApuracaoPisCofinsController, tax: "pis" | "cofins"): PeriodResultRow[] {
  const { resultados, totais } = controller.calculation;
  const isPis = tax === "pis";
  return [
    { label: "Contribuição Bruta (Débito)", className: NEGATIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => isPis ? r.resultado.pisContribuicaoBruta : r.resultado.cofinsContribuicaoBruta), total: isPis ? totais.pisContribuicaoBruta : totais.cofinsContribuicaoBruta },
    { label: "Crédito do Mês", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => isPis ? r.resultado.pisCreditoMes : r.resultado.cofinsCreditoMes), total: isPis ? totais.pisCreditoMes : totais.cofinsCreditoMes },
    { label: "Crédito Anterior (Carryforward)", className: POSITIVE_VALUE_CLASS, value: (keys) => getResultadoColValue(resultados, keys, (r) => isPis ? r.resultado.pisCreditoAnterior : r.resultado.cofinsCreditoAnterior), total: "-" },
    { label: "Valor Devido", highlighted: true, value: (keys) => getResultadoColValue(resultados, keys, (r) => isPis ? r.resultado.pisDue : r.resultado.cofinsDue), total: isPis ? totais.pisDue : totais.cofinsDue },
    { label: "Saldo Acumulado p/ Próximo Mês", subdued: true, value: (keys) => getResultadoColValue(resultados, keys, (r) => isPis ? r.resultado.pisSaldoAcumulado : r.resultado.cofinsSaldoAcumulado), total: "-" },
  ];
}

export function ApuracaoTab({ controller }: { controller: ApuracaoPisCofinsController }) {
  return <div className={tabClass}>
    <PeriodResultsTable title="Apuração do Débito de PIS" tooltip={TOOLTIPS.apuracaoPis} rows={taxRows(controller, "pis")} {...periodProps(controller)} />
    <PeriodResultsTable title="Apuração do Débito de COFINS" tooltip={TOOLTIPS.apuracaoCofins} rows={taxRows(controller, "cofins")} {...periodProps(controller)} />
  </div>;
}
