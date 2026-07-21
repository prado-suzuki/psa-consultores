// Remove <p:timing>...</p:timing> de um slide.
// Motivo: timing referencia spid (shape ids) por número — quando clonamos
// linhas/shapes ou removemos elementos, essas refs quebram e o PowerPoint
// exibe "arquivo corrompido". O deck alvo é estático, então descartar as
// animações é seguro.

export function stripTiming(xml: string): string {
  return xml.replace(/<p:timing\b[\s\S]*?<\/p:timing>/g, "");
}
