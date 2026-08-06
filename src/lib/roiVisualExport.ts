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
  // Dimensões TOTAIS do conteúdo (não só a caixa visível) — garante que
  // tabelas/seções inteiras entrem mesmo se houver scroll interno.
  const w = Math.max(node.scrollWidth, node.offsetWidth);
  const h = Math.max(node.scrollHeight, node.offsetHeight);
  const dataUrl = await toPng(node, {
    backgroundColor: '#ffffff',  // áreas transparentes viram branco
    pixelRatio: 2,               // nitidez (retina)
    cacheBust: true,
    width: w,
    height: h,
    style: { overflow: 'visible' },
  });
  return { dataUrl, width: w, height: h };
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

/** Margem da folha, em pt (~11 mm). Antes era 0 e o conteúdo colava na borda. */
const MARGEM = 32;
/** Seção até este fator acima da área útil encolhe p/ caber numa folha só,
 *  em vez de virar 2 páginas com uma tira de sobra na segunda. */
const LIMITE_ENCOLHER = 1.18;

/**
 * PDF A4 retrato: cada seção começa em página nova; seções altas paginam.
 * O conteúdo é desenhado dentro da área útil (folha menos margem) e recortado
 * nela, para que a fatia seguinte não invada a margem da página.
 */
export async function montarPdf(secoes: SecaoImagem[], filename: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const cw = pw - MARGEM * 2;  // largura útil
  const ch = ph - MARGEM * 2;  // altura útil

  let primeira = true;
  for (const s of secoes) {
    if (!s.dataUrl || s.width <= 0) continue;

    let imgW = cw;
    let imgH = (s.height / s.width) * cw;
    if (imgH > ch && imgH <= ch * LIMITE_ENCOLHER) {
      imgH = ch;
      imgW = (s.width / s.height) * ch;
    }
    const x = MARGEM + (cw - imgW) / 2;  // centraliza quando encolheu

    if (!primeira) pdf.addPage();
    primeira = false;

    let deslocamento = 0;
    do {
      // Recorta na área útil: o que passa da folha não pinta sobre a margem.
      pdf.saveGraphicsState();
      pdf.rect(MARGEM, MARGEM, cw, ch);
      pdf.clip();
      pdf.discardPath();
      pdf.addImage(s.dataUrl, 'PNG', x, MARGEM - deslocamento, imgW, imgH, undefined, 'FAST');
      pdf.restoreGraphicsState();
      deslocamento += ch;
      if (deslocamento < imgH) pdf.addPage();
    } while (deslocamento < imgH);
  }

  // Rodapé com a paginação — só dá para numerar depois de saber o total.
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7.5);
    pdf.setTextColor(130, 138, 150);
    pdf.text(`${i} / ${total}`, pw - MARGEM, ph - MARGEM / 2.4, { align: 'right' });
  }

  pdf.save(filename);
}
