import type { NotaSaida } from "./types";

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const num = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function parseNotasSaidaCsv(text: string): NotaSaida[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = parseLine(lines[0]);
  const idx = (k: string) => header.indexOf(k);

  const cols = {
    chave_nfe: idx("chave_nfe"),
    dEmi: idx("dEmi"),
    tipo_mov: idx("tipo_mov"),
    uf_dest: idx("uf_dest"),
    nome_dest: idx("nome_dest"),
    cProd: idx("cProd"),
    xProd: idx("xProd"),
    NCM: idx("NCM"),
    CFOP: idx("CFOP"),
    qCom: idx("qCom"),
    valor_bruto: idx("valor_bruto"),
    vICMS: idx("vICMS"),
    vICMSST: idx("vICMSST"),
    vIPI: idx("vIPI"),
    vPIS: idx("vPIS"),
    vPIS_ST: idx("vPIS_ST"),
    vCOFINS: idx("vCOFINS"),
    vCOFINS_ST: idx("vCOFINS_ST"),
    regra_reducao: idx("regra_reducao"),
    monofasico: idx("monofasico"),
    ibs_cbs_base: idx("ibs_cbs_base"),
    reducao_aliq: idx("reducao_aliq"),
    aliq_ibs_cbs: idx("aliq_ibs_cbs"),
    valor_ibs_cbs: idx("valor_ibs_cbs"),
  };

  const rows: NotaSaida[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseLine(lines[i]);
    const dEmi = c[cols.dEmi] ?? "";
    const mesRef = dEmi.length >= 7 ? dEmi.substring(0, 7) : "";
    const regra = (c[cols.regra_reducao] ?? "").trim();
    const vICMS = num(c[cols.vICMS]);
    const vICMSST = num(c[cols.vICMSST]);
    const vIPI = num(c[cols.vIPI]);
    const vPIS = num(c[cols.vPIS]);
    const vPIS_ST = num(c[cols.vPIS_ST]);
    const vCOFINS = num(c[cols.vCOFINS]);
    const vCOFINS_ST = num(c[cols.vCOFINS_ST]);
    const valor_ibs_cbs = num(c[cols.valor_ibs_cbs]);
    const monofasico = (c[cols.monofasico] ?? "").toLowerCase() === "true";
    const icmsMonofasico = monofasico ? vICMS : 0;

    rows.push({
      chave_nfe: c[cols.chave_nfe] ?? "",
      dEmi,
      mesRef,
      tipo_mov: c[cols.tipo_mov] ?? "",
      uf_dest: c[cols.uf_dest] ?? "",
      nome_dest: c[cols.nome_dest] ?? "",
      cProd: c[cols.cProd] ?? "",
      xProd: c[cols.xProd] ?? "",
      NCM: c[cols.NCM] ?? "",
      CFOP: c[cols.CFOP] ?? "",
      qCom: num(c[cols.qCom]),
      valor_bruto: num(c[cols.valor_bruto]),
      vICMS,
      vICMSST,
      vIPI,
      vPIS,
      vPIS_ST,
      vCOFINS,
      vCOFINS_ST,
      regra_reducao: regra || "Sem anexo",
      monofasico,
      ibs_cbs_base: num(c[cols.ibs_cbs_base]),
      reducao_aliq: num(c[cols.reducao_aliq]),
      aliq_ibs_cbs: num(c[cols.aliq_ibs_cbs]),
      valor_ibs_cbs,
      icms_monofasico: icmsMonofasico,
      tributoAntes: vICMS + vICMSST + vIPI + vPIS + vPIS_ST + vCOFINS + vCOFINS_ST,
      tributoDepois: valor_ibs_cbs + icmsMonofasico,
    });
  }
  return rows;
}
