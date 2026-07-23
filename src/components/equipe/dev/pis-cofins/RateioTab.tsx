import { PeriodResultsTable, type PeriodResultRow } from "@/components/equipe/dev/pis-cofins/PeriodResultsTable";
import type { ApuracaoPisCofinsController } from "@/hooks/useApuracaoPisCofinsController";
import { getRateioColValue, getRateioReceitasColValue } from "@/lib/pisCofinsPresentation";
import type { RateioResultado, ResultadoPeriodo } from "@/types/pisCofins";

const receitaRows: Array<{
  label: string;
  accessor: (rateio: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => number;
}> = [
  { label: "Total de Receitas apuradas", accessor: (rateio) => rateio.rec_bru_total },
  { label: "Total Tributadas", accessor: (rateio) => rateio.rec_bru_ncum_trib_mi },
  { label: "Total Não Tributadas", accessor: (rateio) => rateio.rec_bru_ncum_nt_mi },
  { label: "Total Não Tributadas - Exp.", accessor: (rateio) => rateio.rec_bru_ncum_exp },
];

const percentualRows = [
  { label: "Tributado", field: "rec_bru_ncum_trib_mi" },
  { label: "Não Tributado", field: "rec_bru_ncum_nt_mi" },
  { label: "Não Tributado - Exportação", field: "rec_bru_ncum_exp" },
] as const;

const pisCreditRows: Array<{ label: string; field: keyof Pick<RateioResultado, "pis101" | "pis201" | "pis301"> }> = [
  { label: "PIS - 101 (Créditos Vinculados a Receita Tributada M.I.)", field: "pis101" },
  { label: "PIS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)", field: "pis201" },
  { label: "PIS - 301 (Créditos Vinculados a Receita de Exportação)", field: "pis301" },
];

const cofinsCreditRows: Array<{ label: string; field: keyof Pick<RateioResultado, "cofins101" | "cofins201" | "cofins301"> }> = [
  { label: "COFINS - 101 (Créditos Vinculados a Receita Tributada M.I.)", field: "cofins101" },
  { label: "COFINS - 201 (Créditos Vinculados a Receita Não Tributada M.I.)", field: "cofins201" },
  { label: "COFINS - 301 (Créditos Vinculados a Receita de Exportação)", field: "cofins301" },
];

export function RateioTab({ controller }: { controller: ApuracaoPisCofinsController }) {
  const resultados = controller.calculation.resultados;
  const rows: PeriodResultRow[] = [
    ...receitaRows.map((row) => ({
      label: row.label,
      value: (keys: string[]) => getRateioReceitasColValue(resultados, keys, row.accessor),
      total: null,
    })),
    { label: "Percentual de rateio", section: true, value: () => 0, total: null },
    ...percentualRows.map((row) => ({
      label: row.label,
      value: (keys: string[]) => {
        const total = getRateioReceitasColValue(resultados, keys, (rateio) => rateio.rec_bru_total);
        const value = getRateioReceitasColValue(resultados, keys, (rateio) => rateio[row.field]);
        return total > 0 ? value / total : 0;
      },
      format: (value: number) => `${(value * 100).toFixed(2)}%`,
      total: null,
    })),
    { label: "Espaço antes dos créditos PIS", spacer: true, value: () => 0, total: null },
    ...pisCreditRows.map((row) => ({
      label: row.label,
      value: (keys: string[]) => getRateioColValue(resultados, keys, (rateio) => rateio[row.field]),
      total: resultados.reduce((sum, resultado) => sum + (resultado.rateio?.[row.field] || 0), 0),
      muted: true,
    })),
    { label: "Espaço antes dos créditos COFINS", spacer: true, value: () => 0, total: null },
    ...cofinsCreditRows.map((row) => ({
      label: row.label,
      value: (keys: string[]) => getRateioColValue(resultados, keys, (rateio) => rateio[row.field]),
      total: resultados.reduce((sum, resultado) => sum + (resultado.rateio?.[row.field] || 0), 0),
      muted: true,
    })),
  ];
  return <div className="space-y-8 animate-in fade-in duration-300">
    <PeriodResultsTable
      title="Rateio" tooltip="Distribuição percentual das receitas (tributadas, não tributadas, exportação) e aplicação dos percentuais sobre o crédito apurado."
      stickyLabel="Rateio das receitas" rows={rows} {...controller.headers} expandedYears={controller.expandedYears}
      toggleYear={controller.toggleYear} columnTooltips={controller.columnTooltips}
    />
  </div>;
}
