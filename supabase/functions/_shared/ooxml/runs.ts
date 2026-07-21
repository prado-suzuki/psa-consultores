// Merge de runs (<a:r><a:t>...) e substituição de tokens {{CLIENTE}}/{{DATA}}/{{SOCIEDADE}}.
//
// Problema clássico: o PowerPoint fragmenta um token em vários <a:r> quando o
// designer edita a caixa (formatação parcial, cursor, autocorrect). Se você
// só substituir dentro de cada <a:t>, o token não é encontrado.
//
// Estratégia: para cada parágrafo <a:p>, se a concatenação dos <a:t> contém
// "{{", colapsa todos os <a:t> no PRIMEIRO run e apaga os demais — preserva
// o <a:rPr> do primeiro run (formatação predominante do token).

import { parseXml, qsa, serializeXml } from "./xml.ts";

export type Tokens = Record<string, string>;

function replaceTokens(text: string, tokens: Tokens): string {
  let out = text;
  for (const [k, v] of Object.entries(tokens)) {
    // Escape para regex e substitui `{{K}}` global. Valor é escapado para XML.
    const re = new RegExp(`\\{\\{\\s*${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*\\}\\}`, "g");
    out = out.replace(re, escapeXmlText(v));
  }
  return out;
}

function escapeXmlText(v: string): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Aplica token replacement num XML de slide.
 * Passa parágrafo por parágrafo: normaliza runs quando há `{{` e reescreve <a:t>.
 */
export function applyTokensToSlideXml(xml: string, tokens: Tokens): string {
  const doc = parseXml(xml);
  const paragraphs = qsa(doc as any, "a:p");

  for (const p of paragraphs) {
    const runs = qsa(p, "a:r");
    if (runs.length === 0) continue;

    const texts: Element[] = [];
    for (const r of runs) {
      const ts = qsa(r, "a:t");
      if (ts.length > 0) texts.push(ts[0]);
    }
    if (texts.length === 0) continue;

    const joined = texts.map((t) => t.textContent ?? "").join("");
    if (!joined.includes("{{")) {
      // Sem token neste parágrafo — mas ainda pode haver token dentro de um run isolado.
      for (const t of texts) {
        const before = t.textContent ?? "";
        const after = replaceTokens(before, tokens);
        if (after !== before) t.textContent = after;
      }
      continue;
    }

    // Colapsa: escreve o resultado final no primeiro <a:t>, zera os demais.
    const replaced = replaceTokens(joined, tokens);
    texts[0].textContent = replaced;
    for (let i = 1; i < texts.length; i++) texts[i].textContent = "";
  }

  return serializeXml(doc);
}
