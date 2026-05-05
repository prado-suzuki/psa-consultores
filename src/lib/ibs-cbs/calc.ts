import type {
  AgregadoAnexo,
  AgregadoMes,
  AgregadoProduto,
  AgregadoTotais,
  ApuracaoFiltros,
  ComposicaoTributosAntes,
  NotaSaida,
  QuebraNatureza,
  QuebraSegmento,
} from "./types";

export function isExportacao(n: NotaSaida): boolean {
  return n.CFOP.startsWith("7") || n.uf_dest === "EX";
}

export function aplicaFiltros(notas: NotaSaida[], filtros: ApuracaoFiltros): NotaSaida[] {
  const ufs = new Set(filtros.ufs);
  const anexos = new Set(filtros.anexos);
  const ini = filtros.inicio ?? "";
  const fim = filtros.fim ?? "";
  return notas.filter((n) => {
    if (ufs.size > 0 && !ufs.has(n.uf_dest)) return false;
    if (anexos.size > 0 && !anexos.has(n.regra_reducao)) return false;
    if (ini && n.mesRef < ini) return false;
    if (fim && n.mesRef > fim) return false;
    return true;
  });
}

export function totais(notas: NotaSaida[]): AgregadoTotais {
  let faturamento = 0;
  let tributoAntes = 0;
  let tributoDepois = 0;
  let faturamentoTributado = 0;
  let somaAliqNomPond = 0;
  const chaves = new Set<string>();
  for (const n of notas) {
    faturamento += n.valor_bruto;
    tributoAntes += n.tributoAntes;
    tributoDepois += n.tributoDepois;
    if (n.chave_nfe) chaves.add(n.chave_nfe);
    if (n.reducao_aliq < 1 && n.aliq_ibs_cbs > 0) {
      faturamentoTributado += n.valor_bruto;
      somaAliqNomPond += n.aliq_ibs_cbs * n.valor_bruto;
    }
  }
  const cargaAntesPct = faturamento > 0 ? tributoAntes / faturamento : 0;
  const cargaDepoisPct = faturamento > 0 ? tributoDepois / faturamento : 0;
  return {
    faturamento,
    tributoAntes,
    tributoDepois,
    cargaAntesPct,
    cargaDepoisPct,
    deltaPp: (cargaDepoisPct - cargaAntesPct) * 100,
    qtdNotas: chaves.size,
    qtdItens: notas.length,
    aliqNominalMediaTributada: faturamentoTributado > 0 ? somaAliqNomPond / faturamentoTributado : 0,
    faturamentoTributado,
  };
}

export function composicaoAntes(notas: NotaSaida[]): ComposicaoTributosAntes {
  const acc: ComposicaoTributosAntes = {
    vICMS: 0,
    vICMSST: 0,
    vIPI: 0,
    vPIS: 0,
    vPIS_ST: 0,
    vCOFINS: 0,
    vCOFINS_ST: 0,
  };
  for (const n of notas) {
    acc.vICMS += n.vICMS;
    acc.vICMSST += n.vICMSST;
    acc.vIPI += n.vIPI;
    acc.vPIS += n.vPIS;
    acc.vPIS_ST += n.vPIS_ST;
    acc.vCOFINS += n.vCOFINS;
    acc.vCOFINS_ST += n.vCOFINS_ST;
  }
  return acc;
}

export function porMes(notas: NotaSaida[]): AgregadoMes[] {
  const map = new Map<string, AgregadoMes>();
  for (const n of notas) {
    const key = n.mesRef || "—";
    const cur = map.get(key) ?? { mes: key, tributoAntes: 0, tributoDepois: 0, faturamento: 0 };
    cur.tributoAntes += n.tributoAntes;
    cur.tributoDepois += n.tributoDepois;
    cur.faturamento += n.valor_bruto;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export function porAnexo(notas: NotaSaida[]): AgregadoAnexo[] {
  const map = new Map<
    string,
    {
      faturamento: number;
      tributoAntes: number;
      tributoDepois: number;
      somaAliqPond: number;
      somaRedPond: number;
      somaPond: number;
      qtdItens: number;
      nfs: Set<string>;
    }
  >();
  for (const n of notas) {
    const key = n.regra_reducao || "Sem anexo";
    const cur =
      map.get(key) ??
      {
        faturamento: 0,
        tributoAntes: 0,
        tributoDepois: 0,
        somaAliqPond: 0,
        somaRedPond: 0,
        somaPond: 0,
        qtdItens: 0,
        nfs: new Set<string>(),
      };
    cur.faturamento += n.valor_bruto;
    cur.tributoAntes += n.tributoAntes;
    cur.tributoDepois += n.tributoDepois;
    cur.somaAliqPond += n.aliq_ibs_cbs * n.valor_bruto;
    cur.somaRedPond += n.reducao_aliq * n.valor_bruto;
    cur.somaPond += n.valor_bruto;
    cur.qtdItens += 1;
    if (n.chave_nfe) cur.nfs.add(n.chave_nfe);
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([anexo, v]) => ({
      anexo,
      faturamento: v.faturamento,
      tributoAntes: v.tributoAntes,
      tributoDepois: v.tributoDepois,
      aliqMedia: v.somaPond > 0 ? v.somaAliqPond / v.somaPond : 0,
      reducaoMedia: v.somaPond > 0 ? v.somaRedPond / v.somaPond : 0,
      cargaPct: v.faturamento > 0 ? v.tributoDepois / v.faturamento : 0,
      qtdItens: v.qtdItens,
      qtdNFs: v.nfs.size,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function porProduto(notas: NotaSaida[]): AgregadoProduto[] {
  const map = new Map<
    string,
    {
      ncm: string;
      qtd: number;
      faturamento: number;
      somaAliqPond: number;
      somaPond: number;
      tributoAntes: number;
      tributoDepois: number;
      nfs: Set<string>;
      cProds: Set<string>;
      faturamentoPorProduto: Map<string, { xProd: string; faturamento: number }>;
      faturamentoPorAnexo: Map<string, number>;
      monoCount: number;
      expCount: number;
      itensCount: number;
    }
  >();
  for (const n of notas) {
    const key = n.NCM || "—";
    const cur =
      map.get(key) ??
      {
        ncm: n.NCM,
        qtd: 0,
        faturamento: 0,
        somaAliqPond: 0,
        somaPond: 0,
        tributoAntes: 0,
        tributoDepois: 0,
        nfs: new Set<string>(),
        cProds: new Set<string>(),
        faturamentoPorProduto: new Map<string, { xProd: string; faturamento: number }>(),
        faturamentoPorAnexo: new Map<string, number>(),
        monoCount: 0,
        expCount: 0,
        itensCount: 0,
      };
    cur.qtd += n.qCom;
    cur.faturamento += n.valor_bruto;
    cur.somaAliqPond += n.aliq_ibs_cbs * n.valor_bruto;
    cur.somaPond += n.valor_bruto;
    cur.tributoAntes += n.tributoAntes;
    cur.tributoDepois += n.tributoDepois;
    if (n.chave_nfe) cur.nfs.add(n.chave_nfe);
    if (n.cProd) cur.cProds.add(n.cProd);
    const prodKey = n.cProd || n.xProd;
    const prodCur = cur.faturamentoPorProduto.get(prodKey) ?? { xProd: n.xProd, faturamento: 0 };
    prodCur.faturamento += n.valor_bruto;
    cur.faturamentoPorProduto.set(prodKey, prodCur);
    cur.faturamentoPorAnexo.set(
      n.regra_reducao,
      (cur.faturamentoPorAnexo.get(n.regra_reducao) ?? 0) + n.valor_bruto,
    );
    cur.itensCount += 1;
    if (n.monofasico) cur.monoCount += 1;
    if (isExportacao(n)) cur.expCount += 1;
    map.set(key, cur);
  }

  const dominante = <K>(m: Map<K, number>): K | undefined => {
    let best: { k: K; v: number } | null = null;
    for (const [k, v] of m) {
      if (!best || v > best.v) best = { k, v };
    }
    return best?.k;
  };

  return Array.from(map.values())
    .map((v) => {
      const cargaAntes = v.faturamento > 0 ? v.tributoAntes / v.faturamento : 0;
      const cargaDepois = v.faturamento > 0 ? v.tributoDepois / v.faturamento : 0;
      let xProdExemplo = "";
      let maxFat = -1;
      for (const { xProd, faturamento } of v.faturamentoPorProduto.values()) {
        if (faturamento > maxFat) {
          maxFat = faturamento;
          xProdExemplo = xProd;
        }
      }
      const anexo = dominante(v.faturamentoPorAnexo) ?? "Sem anexo";
      const flag = (count: number, total: number): "todos" | "alguns" | "nenhum" =>
        count === 0 ? "nenhum" : count === total ? "todos" : "alguns";
      return {
        ncm: v.ncm,
        xProdExemplo,
        produtosDistintos: v.cProds.size,
        anexo,
        qtd: v.qtd,
        faturamento: v.faturamento,
        aliqIbsCbs: v.somaPond > 0 ? v.somaAliqPond / v.somaPond : 0,
        tributoAntes: v.tributoAntes,
        tributoDepois: v.tributoDepois,
        deltaRs: v.tributoDepois - v.tributoAntes,
        deltaPp: (cargaDepois - cargaAntes) * 100,
        qtdNFs: v.nfs.size,
        monofasico: flag(v.monoCount, v.itensCount),
        exportacao: flag(v.expCount, v.itensCount),
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);
}

export function listaUfs(notas: NotaSaida[]): string[] {
  return Array.from(new Set(notas.map((n) => n.uf_dest).filter(Boolean))).sort();
}

export function listaAnexos(notas: NotaSaida[]): string[] {
  return Array.from(new Set(notas.map((n) => n.regra_reducao || "Sem anexo"))).sort();
}

export function rangeMeses(notas: NotaSaida[]): { min: string; max: string } {
  let min = "";
  let max = "";
  for (const n of notas) {
    if (!n.mesRef) continue;
    if (!min || n.mesRef < min) min = n.mesRef;
    if (!max || n.mesRef > max) max = n.mesRef;
  }
  return { min, max };
}

export function quebraNatureza(notas: NotaSaida[]): QuebraNatureza {
  const empty = (): QuebraSegmento & { _nfs: Set<string> } => ({
    faturamento: 0,
    tributoAntes: 0,
    tributoDepois: 0,
    qtdItens: 0,
    qtdNFs: 0,
    _nfs: new Set<string>(),
  });
  const exp = empty();
  const intr = empty();
  const mono = empty();
  const pluri = empty();

  for (const n of notas) {
    const target = isExportacao(n) ? exp : intr;
    target.faturamento += n.valor_bruto;
    target.tributoAntes += n.tributoAntes;
    target.tributoDepois += n.tributoDepois;
    target.qtdItens += 1;
    if (n.chave_nfe) target._nfs.add(n.chave_nfe);

    const monoTarget = n.monofasico ? mono : pluri;
    monoTarget.faturamento += n.valor_bruto;
    monoTarget.tributoAntes += n.tributoAntes;
    monoTarget.tributoDepois += n.tributoDepois;
    monoTarget.qtdItens += 1;
    if (n.chave_nfe) monoTarget._nfs.add(n.chave_nfe);
  }

  const finalize = (s: ReturnType<typeof empty>): QuebraSegmento => ({
    faturamento: s.faturamento,
    tributoAntes: s.tributoAntes,
    tributoDepois: s.tributoDepois,
    qtdItens: s.qtdItens,
    qtdNFs: s._nfs.size,
  });

  return {
    exportacao: finalize(exp),
    interno: finalize(intr),
    monofasico: finalize(mono),
    plurifasico: finalize(pluri),
  };
}

export function exportToCsv<T extends Record<string, unknown>>(rows: T[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
