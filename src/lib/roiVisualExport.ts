// Exportação VISUAL do Dashboard ROI: rasteriza as seções (cards + gráficos
// SVG) com html-to-image e monta HTML (imagens empilhadas) ou PDF (multipágina
// A4). Funções puras de browser — não falam com Supabase/Express. Os imports de
// html-to-image e jspdf são dinâmicos (carregam só no momento do export).

export interface SecaoImagem {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

/** Rasteriza um nó do DOM em PNG (dataURL) + dimensões reais. */
export async function capturarNodePng(
  node: HTMLElement,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { toPng } = await import('html-to-image');
  const rect = node.getBoundingClientRect();
  const dataUrl = await toPng(node, {
    backgroundColor: '#ffffff',  // áreas transparentes viram branco
    pixelRatio: 2,               // nitidez (retina)
    cacheBust: true,
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  });
  return { dataUrl, width: Math.round(rect.width), height: Math.round(rect.height) };
}

export function baixarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/** HTML autocontido: título + uma imagem por seção (empilhadas). */
export function montarHtml(secoes: SecaoImagem[], titulo: string): string {
  const blocos = secoes.map((s) => `
      <section style="margin:0 auto 24px;max-width:1100px">
        <img alt="${escapeHtml(s.label)}" src="${s.dataUrl}"
             style="width:100%;display:block;border:1px solid #e2e8f0;border-radius:10px" />
      </section>`).join('');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:system-ui,'Segoe UI',Roboto,sans-serif;padding:24px 16px">
  <h1 style="max-width:1100px;margin:0 auto 18px;font-size:1.2rem;color:#0f172a">${escapeHtml(titulo)}</h1>
  ${blocos}
</body>
</html>`;
}

/** PDF A4 retrato: cada seção começa em página nova; seções altas paginam. */
export async function montarPdf(secoes: SecaoImagem[], filename: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  let primeira = true;
  for (const s of secoes) {
    if (!s.dataUrl || s.width <= 0) continue;
    const imgH = (s.height / s.width) * pw;  // largura cheia (full-bleed)
    if (!primeira) pdf.addPage();
    primeira = false;

    let position = 0;
    let restante = imgH;
    pdf.addImage(s.dataUrl, 'PNG', 0, position, pw, imgH, undefined, 'FAST');
    restante -= ph;
    while (restante > 0) {
      pdf.addPage();
      position -= ph;  // desloca a imagem p/ cima → fatia seguinte aparece
      pdf.addImage(s.dataUrl, 'PNG', 0, position, pw, imgH, undefined, 'FAST');
      restante -= ph;
    }
  }
  pdf.save(filename);
}
