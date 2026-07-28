// Merge de runs (<a:r><a:t>...) e substituição de tokens {{X}}.
//
// Problema classico: o PowerPoint fragmenta um token em varios <a:r> quando o
// designer edita a caixa. Se voce so substituir dentro de cada <a:t>, o token
// nao e encontrado. Estrategia: para cada paragrafo <a:p>, se a concatenacao
// dos <a:t> contem "{{", colapsa todos no PRIMEIRO run e apaga os demais —
// preserva o <a:rPr> do primeiro run.

import { parseXml, qsa, serializeXml } from "./xml.ts";

export type Tokens = Record<string, string>;

function replaceTokens(text: string, tokens: Tokens): string {
  let out = text;
  for (const [k, v] of Object.entries(tokens)) {
    const re = new RegExp(`\\{\\{\\s*${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*\\}\\}`, "g");
    // Valor cru — o serializador XML escapa &, <, > uma unica vez ao converter
    // textContent em texto. NAO escapar aqui, senao vira "&amp;amp;" no arquivo.
    out = out.replace(re, String(v ?? ""));
  }
  return out;
}

/**
 * Aplica tokens em todos os <a:p> descendentes de `root` (Document ou Element).
 * Mesma logica do merge de runs.
 */
export function applyTokensToNode(root: Document | Element, tokens: Tokens): void {
  const paragraphs = qsa(root, "a:p");
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
      for (const t of texts) {
        const before = t.textContent ?? "";
        const after = replaceTokens(before, tokens);
        if (after !== before) t.textContent = after;
      }
      continue;
    }

    const replaced = replaceTokens(joined, tokens);
    texts[0].textContent = replaced;
    for (let i = 1; i < texts.length; i++) texts[i].textContent = "";
  }
}

export function applyTokensToSlideXml(xml: string, tokens: Tokens): string {
  const doc = parseXml(xml);
  applyTokensToNode(doc, tokens);
  return serializeXml(doc);
}

/**
 * Varre um Document/Element e substitui qualquer {{TOKEN}} remanescente por "".
 * Defesa final para nao deixar token cru no slide.
 */
export function stripRemainingTokens(root: Document | Element): void {
  const paragraphs = qsa(root, "a:p");
  for (const p of paragraphs) {
    const runs = qsa(p, "a:r");
    for (const r of runs) {
      const ts = qsa(r, "a:t");
      for (const t of ts) {
        const s = t.textContent ?? "";
        if (s.includes("{{")) t.textContent = s.replace(/\{\{\s*[A-Z_0-9]+\s*\}\}/g, "");
      }
    }
  }
}
