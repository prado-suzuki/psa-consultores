// Duplicar/remover slide inteiro no pptx.
//
// Registrar um slide novo exige tocar 4 lugares:
//   1. parts["ppt/slides/slideN.xml"] + parts["ppt/slides/_rels/slideN.xml.rels"]
//   2. [Content_Types].xml → <Override PartName="/ppt/slides/slideN.xml" .../>
//   3. ppt/_rels/presentation.xml.rels → nova <Relationship Id="rIdX" Target="slides/slideN.xml"/>
//   4. ppt/presentation.xml → novo <p:sldId id="..." r:id="rIdX"/> na sldIdLst
//
// Midia (ppt/media/*) e compartilhada — nao duplicar. O clone reusa o mesmo
// slideN.xml.rels (com os mesmos rIds internos apontando para ../media/...).

import { readText, writeText, listPaths, type PptxParts } from "./zip.ts";

const SLIDE_CT = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const SLIDE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

function nextSlideNum(parts: PptxParts): number {
  const nums = listPaths(parts, "ppt/slides/slide", ".xml")
    .map((p) => Number(p.match(/slide(\d+)\.xml$/)?.[1] ?? 0))
    .filter((n) => Number.isFinite(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function nextRelId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  const next = (ids.length ? Math.max(...ids) : 0) + 1;
  return `rId${next}`;
}

function nextSldId(presXml: string): number {
  // sldId numerico tem que ser >= 256 e unico.
  const ids = [...presXml.matchAll(/<p:sldId[^/>]*\sid="(\d+)"/g)].map((m) => Number(m[1]));
  const next = (ids.length ? Math.max(...ids) : 255) + 1;
  return Math.max(256, next);
}

export interface DuplicatedSlide { newPath: string; newRelsPath: string }

/**
 * Duplica `srcPath` (ex.: "ppt/slides/slide3.xml"). O novo slide fica logo
 * apos o srcPath na sldIdLst (para preservar ordem intuitiva).
 */
export function duplicateSlide(parts: PptxParts, srcPath: string): DuplicatedSlide {
  const srcRelsPath = srcPath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  const num = nextSlideNum(parts);
  const newPath = `ppt/slides/slide${num}.xml`;
  const newRelsPath = `ppt/slides/_rels/slide${num}.xml.rels`;

  // 1) parts
  writeText(parts, newPath, readText(parts, srcPath));
  if (parts[srcRelsPath]) {
    // Nota é 1:1 com o slide — não pode ser compartilhada, senão o PowerPoint recusa o arquivo.
    let rels = readText(parts, srcRelsPath);
    rels = rels.replace(/<Relationship\b[^>]*notesSlide[^>]*>/g, "");
    writeText(parts, newRelsPath, rels);
  }

  // 2) Content_Types
  const ctPath = "[Content_Types].xml";
  const ct = readText(parts, ctPath);
  if (!ct.includes(`PartName="/${newPath}"`)) {
    const insertion = `<Override PartName="/${newPath}" ContentType="${SLIDE_CT}"/>`;
    writeText(parts, ctPath, ct.replace("</Types>", `${insertion}</Types>`));
  }

  // 3) presentation.xml.rels
  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  const presRels = readText(parts, presRelsPath);
  const rid = nextRelId(presRels);
  const relInsertion = `<Relationship Id="${rid}" Type="${SLIDE_REL_TYPE}" Target="slides/slide${num}.xml"/>`;
  writeText(parts, presRelsPath, presRels.replace("</Relationships>", `${relInsertion}</Relationships>`));

  // 4) presentation.xml — inserir <p:sldId> depois do sldId do slide original
  const presPath = "ppt/presentation.xml";
  const pres = readText(parts, presPath);
  const sldNum = Number(srcPath.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
  // Descobrir rId do slide de origem
  const srcRid = presRels.match(new RegExp(`Id="(rId\\d+)"[^/]*Target="slides/slide${sldNum}\\.xml"`))?.[1];
  const newSldId = nextSldId(pres);
  const newSldEl = `<p:sldId id="${newSldId}" r:id="${rid}"/>`;
  let updated = pres;
  if (srcRid) {
    // Inserir apos o sldId cuja r:id === srcRid
    const re = new RegExp(`(<p:sldId[^/>]*r:id="${srcRid}"[^/>]*/>)`);
    if (re.test(pres)) updated = pres.replace(re, `$1${newSldEl}`);
    else updated = pres.replace("</p:sldIdLst>", `${newSldEl}</p:sldIdLst>`);
  } else {
    updated = pres.replace("</p:sldIdLst>", `${newSldEl}</p:sldIdLst>`);
  }
  writeText(parts, presPath, updated);

  return { newPath, newRelsPath };
}

/**
 * Remove um slide: parte + rels + Override + Relationship + <p:sldId>.
 */
export function removeSlide(parts: PptxParts, path: string): void {
  const relsPath = path.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  delete parts[path];
  delete parts[relsPath];

  const ctPath = "[Content_Types].xml";
  const ct = readText(parts, ctPath);
  const pathEsc = path.replace(/\./g, "\\.");
  writeText(parts, ctPath, ct.replace(new RegExp(`<Override[^>]*PartName="/${pathEsc}"[^>]*/>`, "g"), ""));

  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  const presRels = readText(parts, presRelsPath);
  const sldNum = Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
  const sldNumEsc = String(sldNum);
  const relMatch = presRels.match(new RegExp(`<Relationship\\s+Id="(rId\\d+)"[^>]*Target="slides/slide${sldNumEsc}\\.xml"[^>]*/>`));
  const rid = relMatch?.[1];
  writeText(parts, presRelsPath, presRels.replace(new RegExp(`<Relationship[^>]*Target="slides/slide${sldNumEsc}\\.xml"[^>]*/>`, "g"), ""));

  if (rid) {
    const presPath = "ppt/presentation.xml";
    const pres = readText(parts, presPath);
    writeText(parts, presPath, pres.replace(new RegExp(`<p:sldId[^/>]*r:id="${rid}"[^/>]*/>`, "g"), ""));
  }
}
