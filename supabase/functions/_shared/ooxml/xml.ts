// XML parse/serialize com @xmldom/xmldom.
// Mantém namespaces do OOXML (a:, p:, r:, etc.) — não usar libs que estripam prefixos.

import { DOMParser, XMLSerializer } from "npm:@xmldom/xmldom@0.8.10";

const parser = new DOMParser({
  errorHandler: {
    warning: () => {},
    error: (e) => { throw new Error(`XML parse error: ${e}`); },
    fatalError: (e) => { throw new Error(`XML fatal: ${e}`); },
  },
});
const serializer = new XMLSerializer();

export function parseXml(xml: string): Document {
  return parser.parseFromString(xml, "application/xml") as unknown as Document;
}

export function serializeXml(doc: Document | Element): string {
  const s = serializer.serializeToString(doc as unknown as Node);
  // Garante prólogo XML — Office não abre sem ele.
  return s.startsWith("<?xml") ? s : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${s}`;
}

/** getElementsByTagName cobre namespace-prefixed em xmldom (ex.: "a:t"). */
export function qsa(node: Document | Element, tag: string): Element[] {
  const list = (node as any).getElementsByTagName(tag);
  const out: Element[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.item(i));
  return out;
}
