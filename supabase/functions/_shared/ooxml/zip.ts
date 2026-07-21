// OOXML zip helpers — usa fflate para unzip/zip in-memory.
// Um .pptx é um zip; cada parte (XML/media) vira uma entrada Uint8Array.

import { unzipSync, zipSync, strFromU8, strToU8 } from "npm:fflate@0.8.2";

export type PptxParts = Record<string, Uint8Array>;

export function unpackPptx(bytes: Uint8Array): PptxParts {
  return unzipSync(bytes);
}

/**
 * Empacota `parts` em .pptx (zip DEFLATE nível 6 — equilíbrio tamanho/tempo).
 * Não recomprime XML pequeno demais em nível 0 pra evitar risco de PowerPoint
 * abrir malformado por causa de flags específicas do zip.
 */
export function packPptx(parts: PptxParts): Uint8Array {
  return zipSync(parts, { level: 6 });
}

export function readText(parts: PptxParts, path: string): string {
  const buf = parts[path];
  if (!buf) throw new Error(`OOXML: parte ausente: ${path}`);
  return strFromU8(buf);
}

export function writeText(parts: PptxParts, path: string, text: string): void {
  parts[path] = strToU8(text);
}

/** Lista as partes que casam com um prefixo (ex.: "ppt/slides/slide"). */
export function listPaths(parts: PptxParts, prefix: string, suffix = ""): string[] {
  return Object.keys(parts)
    .filter((p) => p.startsWith(prefix) && p.endsWith(suffix))
    .sort();
}
