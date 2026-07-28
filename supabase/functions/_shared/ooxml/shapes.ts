// Helpers para <p:sp> (shapes) no spTree do slide.
//
// Uso principal (organograma): encontrar shapes com um token no <a:t>, agrupar
// por Y (faixa), clonar horizontalmente e redistribuir em X.

import { qsa } from "./xml.ts";
import { nextCNvPrId } from "./ids.ts";

/** Retorna todos os <p:sp> filhos diretos do spTree. */
export function listShapes(slideDoc: Document): Element[] {
  const spTree = qsa(slideDoc, "p:spTree")[0];
  if (!spTree) return [];
  const sps: Element[] = [];
  const children = spTree.childNodes;
  for (let i = 0; i < children.length; i++) {
    const n = children.item(i) as Element;
    if (n && n.nodeType === 1 && (n.tagName === "p:sp" || n.nodeName === "p:sp")) sps.push(n);
  }
  return sps;
}

export interface XFrm { x: number; y: number; cx: number; cy: number }

export function getShapeXfrm(sp: Element): XFrm | null {
  const spPr = qsa(sp, "p:spPr")[0];
  if (!spPr) return null;
  const xfrm = qsa(spPr, "a:xfrm")[0];
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

export function setShapeXfrm(sp: Element, xfrm: Partial<XFrm>): void {
  const spPr = qsa(sp, "p:spPr")[0];
  const x = qsa(spPr, "a:xfrm")[0];
  const off = qsa(x, "a:off")[0];
  const ext = qsa(x, "a:ext")[0];
  if (off) {
    if (xfrm.x !== undefined) off.setAttribute("x", String(Math.round(xfrm.x)));
    if (xfrm.y !== undefined) off.setAttribute("y", String(Math.round(xfrm.y)));
  }
  if (ext) {
    if (xfrm.cx !== undefined) ext.setAttribute("cx", String(Math.round(xfrm.cx)));
    if (xfrm.cy !== undefined) ext.setAttribute("cy", String(Math.round(xfrm.cy)));
  }
}

export function shapeContainsToken(sp: Element, token: string): boolean {
  const ts = qsa(sp, "a:t");
  for (const t of ts) if ((t.textContent ?? "").includes(`{{${token}}}`)) return true;
  return false;
}

/** Deep clone com novo cNvPr/@id (unico dentro do slide). */
export function cloneShapeWithNewId(sp: Element, slideXml: string): Element {
  const clone = sp.cloneNode(true) as Element;
  const newId = nextCNvPrId(slideXml);
  const cn = qsa(clone, "p:cNvPr")[0];
  if (cn) cn.setAttribute("id", String(newId));
  return clone;
}

/** Deep clone com id explicito (para contador monotonico externo). */
export function cloneShapeWithId(sp: Element, id: number): Element {
  const clone = sp.cloneNode(true) as Element;
  const cn = qsa(clone, "p:cNvPr")[0];
  if (cn) cn.setAttribute("id", String(id));
  return clone;
}

export function removeShape(sp: Element): void {
  sp.parentNode?.removeChild(sp);
}

export function appendShape(spTree: Element, sp: Element): void {
  spTree.appendChild(sp);
}
