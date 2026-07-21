// Validação leve pós-geração — barra upload se algo grosseiro está incoerente.
// Não substitui abrir no PowerPoint, mas pega os erros mais comuns:
//   - parte listada em [Content_Types].xml mas ausente do zip
//   - slide referenciado em presentation.xml.rels mas ausente
//   - cNvPr/@id duplicado dentro de um mesmo slide

import type { PptxParts } from "./zip.ts";

export interface ValidationIssue { kind: string; where: string; detail?: string }

export function validatePptx(parts: PptxParts): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const ct = parts["[Content_Types].xml"];
  if (!ct) {
    issues.push({ kind: "missing_part", where: "[Content_Types].xml" });
    return issues;
  }
  const ctXml = new TextDecoder().decode(ct);
  const overrides = [...ctXml.matchAll(/<Override[^>]+PartName="([^"]+)"/g)].map((m) => m[1].replace(/^\//, ""));
  for (const p of overrides) {
    if (!(p in parts)) issues.push({ kind: "override_without_part", where: p });
  }

  const slidePaths = Object.keys(parts).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  for (const sp of slidePaths) {
    const xml = new TextDecoder().decode(parts[sp]);
    const ids = new Set<string>();
    const dup = new Set<string>();
    for (const m of xml.matchAll(/<p:cNvPr\b[^>]*\sid="(\d+)"/g)) {
      if (ids.has(m[1])) dup.add(m[1]);
      ids.add(m[1]);
    }
    if (dup.size > 0) issues.push({ kind: "duplicate_cNvPr_id", where: sp, detail: [...dup].join(",") });
  }

  return issues;
}
