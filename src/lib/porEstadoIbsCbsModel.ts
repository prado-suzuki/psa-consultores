import type {
  ApuracaoFiltros,
  FatoCliente,
  FatoUfProduto,
  NaturezaDestino,
} from "@/lib/ibs-cbs/types";

export type MetricaSankey = "faturamento" | "tributoDepois";

export interface TotaisPorEstado {
  faturamento: number;
  tribAntes: number;
  tribDepois: number;
  qtdUfs: number;
  pctInterno: number;
  pctInterestadual: number;
  pctExportacao: number;
  cargaAntesPct: number;
  cargaDepoisPct: number;
  deltaPp: number;
}

export type UfAgregada = FatoUfProduto & {
  aliqAntes: number;
  aliqDepois: number;
  ticketMedio: number;
};

export interface SankeyPorEstadoData {
  nodes: Array<{ name: string; cor: string; valor: number }>;
  links: Array<{ source: number; target: number; value: number }>;
}

const CORES = {
  interno: "#0D9488",
  interestadual: "#F2810A",
  exportacao: "#3478F5",
  anexoI: "#65A30D",
  anexoIX: "#F2810A",
  anexoXV: "#6B46E8",
  semAnexo: "#94A3B8",
};

const PALETA_ANEXO: Record<string, string> = {
  "Anexo I": CORES.anexoI,
  "Anexo IX": CORES.anexoIX,
  "Anexo XV": CORES.anexoXV,
  "Sem anexo": CORES.semAnexo,
};

const CORES_NATUREZA: Record<NaturezaDestino, string> = {
  interno: CORES.interno,
  interestadual: CORES.interestadual,
  exportacao: CORES.exportacao,
};

const LABEL_NATUREZA: Record<NaturezaDestino, string> = {
  interno: "Interno (MT)",
  interestadual: "Interestadual",
  exportacao: "Exportação",
};

export function filtrarFatosPorEstado(fatos: FatoUfProduto[], filtros: ApuracaoFiltros) {
  return fatos.filter((fato) => {
    if (filtros.ufs.length > 0 && !filtros.ufs.includes(fato.uf)) return false;
    if (filtros.anexos.length > 0 && !filtros.anexos.includes(fato.anexo)) return false;
    return true;
  });
}

export function filtrarClientesPorEstado(clientes: FatoCliente[], filtros: ApuracaoFiltros) {
  return clientes.filter((cliente) => {
    if (filtros.ufs.length > 0 && !filtros.ufs.includes(cliente.uf)) return false;
    if (filtros.anexos.length > 0 && !filtros.anexos.includes(cliente.anexoPrincipal)) return false;
    return true;
  });
}

export function calcularTotaisPorEstado(fatos: FatoUfProduto[]): TotaisPorEstado {
  const faturamento = fatos.reduce((soma, fato) => soma + fato.faturamento, 0);
  const tribAntes = fatos.reduce((soma, fato) => soma + fato.tributoAntes, 0);
  const tribDepois = fatos.reduce((soma, fato) => soma + fato.tributoDepois, 0);
  const faturamentoNatureza = (natureza: NaturezaDestino) =>
    fatos
      .filter((fato) => fato.natureza === natureza)
      .reduce((soma, fato) => soma + fato.faturamento, 0);
  const percentual = (valor: number) => (faturamento > 0 ? (valor / faturamento) * 100 : 0);

  return {
    faturamento,
    tribAntes,
    tribDepois,
    qtdUfs: new Set(fatos.map((fato) => fato.uf)).size,
    pctInterno: percentual(faturamentoNatureza("interno")),
    pctInterestadual: percentual(faturamentoNatureza("interestadual")),
    pctExportacao: percentual(faturamentoNatureza("exportacao")),
    cargaAntesPct: percentual(tribAntes),
    cargaDepoisPct: percentual(tribDepois),
    deltaPp: percentual(tribDepois - tribAntes),
  };
}

export function agregarPorUf(fatos: FatoUfProduto[]): UfAgregada[] {
  const mapa = new Map<string, UfAgregada>();
  fatos.forEach((fato) => {
    const atual = mapa.get(fato.uf);
    if (atual) {
      atual.faturamento += fato.faturamento;
      atual.tributoAntes += fato.tributoAntes;
      atual.tributoDepois += fato.tributoDepois;
      atual.tributoDepoisIbsCbs += fato.tributoDepoisIbsCbs;
      atual.tributoDepoisIcmsMonof += fato.tributoDepoisIcmsMonof;
      atual.qtdNFs += fato.qtdNFs;
      atual.qtdItens += fato.qtdItens;
      return;
    }
    mapa.set(fato.uf, {
      ...fato,
      ncm: "",
      xProd: "",
      aliqAntes: 0,
      aliqDepois: 0,
      ticketMedio: 0,
    });
  });

  return Array.from(mapa.values())
    .map((uf) => ({
      ...uf,
      aliqAntes: uf.faturamento > 0 ? (uf.tributoAntes / uf.faturamento) * 100 : 0,
      aliqDepois: uf.faturamento > 0 ? (uf.tributoDepois / uf.faturamento) * 100 : 0,
      ticketMedio: uf.qtdNFs > 0 ? uf.faturamento / uf.qtdNFs : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function calcularConcentracaoTop3Ufs(ufs: UfAgregada[], faturamentoTotal: number) {
  if (faturamentoTotal === 0) return 0;
  return (ufs.slice(0, 3).reduce((soma, uf) => soma + uf.faturamento, 0) / faturamentoTotal) * 100;
}

export function calcularConcentracaoTop3Clientes(clientes: FatoCliente[], faturamentoTotal: number) {
  if (faturamentoTotal === 0) return 0;
  const top3 = [...clientes]
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 3)
    .reduce((soma, cliente) => soma + cliente.faturamento, 0);
  return (top3 / faturamentoTotal) * 100;
}

export function ordenarTopClientes(clientes: FatoCliente[]) {
  return [...clientes].sort((a, b) => b.faturamento - a.faturamento).slice(0, 12);
}

export function criarSankeyPorEstado(fatos: FatoUfProduto[], metrica: MetricaSankey): SankeyPorEstadoData {
  type NcmAgregado = { ncm: string; xProd: string; anexo: string; total: number };
  const valorDoFato = (fato: FatoUfProduto) =>
    metrica === "faturamento" ? fato.faturamento : fato.tributoDepois;
  const agregadoNcm = new Map<string, NcmAgregado>();
  fatos.forEach((fato) => {
    const atual = agregadoNcm.get(fato.ncm);
    if (atual) atual.total += valorDoFato(fato);
    else agregadoNcm.set(fato.ncm, { ncm: fato.ncm, xProd: fato.xProd, anexo: fato.anexo, total: valorDoFato(fato) });
  });

  const ordenados = Array.from(agregadoNcm.values())
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  const topNcms = ordenados.slice(0, 6);
  const topSet = new Set(topNcms.map((item) => item.ncm));
  const valorOutros = ordenados
    .filter((item) => !topSet.has(item.ncm))
    .reduce((soma, item) => soma + item.total, 0);
  const esquerda = topNcms.map((item) => ({
    name: item.xProd,
    cor: PALETA_ANEXO[item.anexo] ?? CORES.semAnexo,
    valor: item.total,
  }));
  if (valorOutros > 0) esquerda.push({ name: "Outros produtos", cor: CORES.semAnexo, valor: valorOutros });

  const naturezas: NaturezaDestino[] = ["interno", "interestadual", "exportacao"];
  const totaisNatureza: Record<NaturezaDestino, number> = { interno: 0, interestadual: 0, exportacao: 0 };
  fatos.forEach((fato) => { totaisNatureza[fato.natureza] += valorDoFato(fato); });
  const direita = naturezas.map((natureza) => ({
    name: LABEL_NATUREZA[natureza],
    cor: CORES_NATUREZA[natureza],
    valor: totaisNatureza[natureza],
  }));
  const offsetDireita = esquerda.length;
  const links: SankeyPorEstadoData["links"] = [];
  fatos.forEach((fato) => {
    const value = valorDoFato(fato);
    if (value <= 0) return;
    const source = topSet.has(fato.ncm)
      ? topNcms.findIndex((item) => item.ncm === fato.ncm)
      : esquerda.length - 1;
    const natureza = naturezas.indexOf(fato.natureza);
    if (source < 0 || natureza < 0) return;
    links.push({ source, target: offsetDireita + natureza, value });
  });
  return { nodes: [...esquerda, ...direita], links };
}
