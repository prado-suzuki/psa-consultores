// Helpers para tabelas dentro de <p:graphicFrame> em slides pptx.
//
// Layout de tabela pptx:
//   <p:graphicFrame>
//     <p:xfrm><a:off/><a:ext/></p:xfrm>   ← posicao/tamanho
//     <a:graphic><a:graphicData>
//       <a:tbl>
//         <a:tblGrid><a:gridCol/>...</a:tblGrid>
//         <a:tr h="..."><a:tc>...</a:tc>...</a:tr>
//         <a:tr>...</a:tr>
//       </a:tbl>
//     </a:graphicData></a:graphic>
//   </p:graphicFrame>

import { qsa } from "./xml.ts";
import { nextCNvPrId } from "./ids.ts";

export function listGraphicFrames(slideDoc: Document): Element[] {
  return qsa(slideDoc, "p:graphicFrame");
}

export function graphicFrameContainsToken(gf: Element, token: string): boolean {
  const ts = qsa(gf, "a:t");
  for (const t of ts) if ((t.textContent ?? "").includes(`{{${token}}}`)) return true;
  return false;
}

export interface GfBox { x: number; y: number; cx: number; cy: number }

export function getGraphicFrameBox(gf: Element): GfBox | null {
  const xfrm = qsa(gf, "p:xfrm")[0];
  if (!xfrm) return null;
  const off = qsa(xfrm, "a:off")[0];
  const ext = qsa(xfrm, "a:ext")[0];
  if (!off || !ext) return null;
  return {
    x: Number(off.getAttribute("x") ?? "0"),
    y: Number(off.getAttribute("y") ?? "0"),
    cx: Number(ext.getAttribute("cx") ?? "0"),
    cy: Number(ext.getAttribute("cy") ?? "0"),
  };
}

export function setGraphicFrameBox(gf: Element, box: Partial<GfBox>): void {
  const xfrm = qsa(gf, "p:xfrm")[0];
  const off = qsa(xfrm, "a:off")[0];
  const ext = qsa(xfrm, "a:ext")[0];
  if (off) {
    if (box.x !== undefined) off.setAttribute("x", String(Math.round(box.x)));
    if (box.y !== undefined) off.setAttribute("y", String(Math.round(box.y)));
  }
  if (ext) {
    if (box.cx !== undefined) ext.setAttribute("cx", String(Math.round(box.cx)));
    if (box.cy !== undefined) ext.setAttribute("cy", String(Math.round(box.cy)));
  }
}

export function cloneGraphicFrameWithNewId(gf: Element, slideXml: string): Element {
  const clone = gf.cloneNode(true) as Element;
  const newId = nextCNvPrId(slideXml);
  const cn = qsa(clone, "p:cNvPr")[0];
  if (cn) cn.setAttribute("id", String(newId));
  return clone;
}

/** Retorna todas as <a:tr> da primeira <a:tbl> do graphicFrame. */
export function listRows(gf: Element): Element[] {
  const tbl = qsa(gf, "a:tbl")[0];
  if (!tbl) return [];
  const rows: Element[] = [];
  const ch = tbl.childNodes;
  for (let i = 0; i < ch.length; i++) {
    const n = ch.item(i) as Element;
    if (n && n.nodeType === 1 && (n.tagName === "a:tr" || n.nodeName === "a:tr")) rows.push(n);
  }
  return rows;
}

export function rowContainsToken(tr: Element, token: string): boolean {
  const ts = qsa(tr, "a:t");
  for (const t of ts) if ((t.textContent ?? "").includes(`{{${token}}}`)) return true;
  return false;
}

/** Deep clone da row (sem cNvPr para renumerar). */
export function cloneRow(tr: Element): Element {
  return tr.cloneNode(true) as Element;
}

export function removeRow(tr: Element): void {
  tr.parentNode?.removeChild(tr);
}

export function insertRowBefore(newRow: Element, refRow: Element): void {
  refRow.parentNode?.insertBefore(newRow, refRow);
}
