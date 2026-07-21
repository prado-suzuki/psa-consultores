// Próximo `cNvPr/@id` livre dentro de um slide.
// Todo shape/pic/graphicFrame tem <p:cNvPr id="N" name="..."/>. Ids duplicados
// no mesmo slide fazem o PowerPoint recusar abrir. Ao clonar, gere um novo id
// via max(existentes) + 1.

export function nextCNvPrId(slideXml: string): number {
  let max = 0;
  const re = /<p:cNvPr\b[^>]*\sid="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slideXml)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
