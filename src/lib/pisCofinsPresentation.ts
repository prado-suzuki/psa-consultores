import type { ContaNode, RateioResultado, ResultadoPeriodo } from "@/types/pisCofins";

export const formatPisCofinsCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const getResultadoColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (resultado: ResultadoPeriodo) => number,
) => resultados
  .filter((resultado) => dataKeys.includes(resultado.dt_ini.substring(0, 7)))
  .reduce((total, resultado) => total + accessor(resultado), 0);

export const getResultadoLiquidoColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  totalAccessor: (resultado: ResultadoPeriodo) => number,
  reducedAccessor: (resultado: ResultadoPeriodo) => number,
) => getResultadoColValue(resultados, dataKeys, (resultado) =>
  totalAccessor(resultado) - reducedAccessor(resultado));

export const getRateioReceitasColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (rateio: NonNullable<ResultadoPeriodo["rateio_receitas"]>) => number,
) => resultados
  .filter((resultado) => dataKeys.includes(resultado.dt_ini.substring(0, 7)) && resultado.rateio_receitas)
  .reduce((total, resultado) => total + accessor(resultado.rateio_receitas!), 0);

export const getRateioColValue = (
  resultados: ResultadoPeriodo[],
  dataKeys: string[],
  accessor: (rateio: RateioResultado) => number,
) => resultados
  .filter((resultado) => dataKeys.includes(resultado.dt_ini.substring(0, 7)) && resultado.rateio)
  .reduce((total, resultado) => total + accessor(resultado.rateio!), 0);

export const buildColumnTooltips = (yearsMap: Map<string, string[]>) => {
  const tooltips: Record<string, string> = {
    CST: "Código de Situação Tributária do PIS/COFINS aplicado ao item.",
    Conta: "Código contábil da conta (do EFD ou Balancete) que originou o valor.",
    "Descrição": "Descrição contábil da conta ou do item da apuração.",
    Bloco: "Bloco do EFD Contribuições onde o registro foi extraído (A170, C170, F100 etc.).",
    "Rateio das receitas": "Categoria de receita usada no cálculo do percentual de rateio.",
    Tipo: "Tipo da conta no balancete (Devedora 'D' ou Credora 'C').",
    __total__: "Soma de todos os meses exibidos no período consultado.",
    __vlr_efd__: "Valor extraído do EFD Contribuições para a conta no período.",
    __saldo__: "Saldo contábil da conta — Atual (período fechado) ou Periódico (movimentação do mês).",
  };
  yearsMap.forEach((months, year) => {
    tooltips[year] = "Total do ano. Clique no '+' para expandir e ver os meses.";
    months.forEach((month) => { tooltips[month] = "Valor total do mês."; });
  });
  return tooltips;
};

export const buildContaOptions = (rows: Array<{ cod_cta: string; descricao_conta: string }>) => {
  const seen = new Map<string, string>();
  rows.forEach((row) => { if (!seen.has(row.cod_cta)) seen.set(row.cod_cta, row.descricao_conta); });
  return Array.from(seen, ([value, description]) => ({ value, label: `${value} - ${description}` }))
    .sort((left, right) => left.value.localeCompare(right.value));
};

export const buildTreeContaOptions = (periodos: Array<{ contas: ContaNode[] }>) => {
  const rows: Array<{ cod_cta: string; descricao_conta: string }> = [];
  const walk = (nodes: ContaNode[]) => nodes.forEach((node) => {
    rows.push(node);
    if (node.children?.length) walk(node.children);
  });
  periodos.forEach((periodo) => walk(periodo.contas));
  return buildContaOptions(rows);
};

export const filterContaTree = (
  periodos: Array<{ dt_ini: string; contas: ContaNode[] }>,
  selected: string[],
) => {
  if (selected.length === 0) return periodos;
  const prune = (nodes: ContaNode[]): ContaNode[] => nodes.flatMap((node) => {
    if (selected.includes(node.cod_cta)) return [node];
    const children = prune(node.children ?? []);
    return children.length ? [{ ...node, children }] : [];
  });
  return periodos.map((periodo) => ({ ...periodo, contas: prune(periodo.contas) }))
    .filter((periodo) => periodo.contas.length > 0);
};

export const getImportEmptyMessage = (hasEfd: boolean, hasBalancete: boolean) => {
  if (!hasEfd && !hasBalancete) return "Apuração indisponível: nem a EFD Contribuições nem o Balancete deste contribuinte foram importados para o período selecionado. Importe ambos os documentos e refaça a consulta.";
  if (!hasEfd) return "Apuração indisponível: a EFD Contribuições deste contribuinte não foi importada para o período selecionado. Importe o arquivo e refaça a consulta.";
  if (!hasBalancete) return "Apuração indisponível: o Balancete deste contribuinte não foi importado para o período selecionado. Importe o arquivo e refaça a consulta.";
  return "Nenhum dado encontrado para os filtros selecionados.";
};
