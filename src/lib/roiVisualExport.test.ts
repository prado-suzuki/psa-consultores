// Geometria do PDF do Dashboard ROI. Trava o que não dá para ver em teste de UI:
// margem da folha, recorte na área útil e quantas páginas cada seção ocupa.
// Regressão de origem: o export desenhava em x=0 com a largura inteira da página
// (full-bleed), então texto e números colavam na borda do papel.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecaoImagem } from '@/lib/roiVisualExport';

// A4 em pt, como o jsPDF reporta.
const PW = 595.28;
const PH = 841.89;
const MARGEM = 32;
const CW = PW - MARGEM * 2;
const CH = PH - MARGEM * 2;

interface AddImageCall { x: number; y: number; w: number; h: number }
const spy = {
  addImage: [] as AddImageCall[],
  rect: [] as { x: number; y: number; w: number; h: number }[],
  clip: 0,
  saveGraphicsState: 0,
  restoreGraphicsState: 0,
  addPage: 0,
  text: [] as string[],
  salvo: '',
};

vi.mock('jspdf', () => ({
  default: class FakeJsPDF {
    private paginas = 1;
    internal = { pageSize: { getWidth: () => PW, getHeight: () => PH } };
    addPage() { this.paginas++; spy.addPage++; return this; }
    getNumberOfPages() { return this.paginas; }
    setPage() { return this; }
    setFontSize() { return this; }
    setTextColor() { return this; }
    saveGraphicsState() { spy.saveGraphicsState++; return this; }
    restoreGraphicsState() { spy.restoreGraphicsState++; return this; }
    rect(x: number, y: number, w: number, h: number) { spy.rect.push({ x, y, w, h }); return this; }
    clip() { spy.clip++; return this; }
    discardPath() { return this; }
    addImage(_d: string, _f: string, x: number, y: number, w: number, h: number) {
      spy.addImage.push({ x, y, w, h });
      return this;
    }
    text(t: string) { spy.text.push(t); return this; }
    save(nome: string) { spy.salvo = nome; return this; }
  },
}));

const secao = (width: number, height: number, label = 'Seção'): SecaoImagem =>
  ({ label, dataUrl: 'data:image/png;base64,AA', width, height });

async function montar(secoes: SecaoImagem[], nome = 'roi.pdf') {
  const { montarPdf } = await import('@/lib/roiVisualExport');
  await montarPdf(secoes, nome);
}

beforeEach(() => {
  spy.addImage = []; spy.rect = []; spy.text = [];
  spy.clip = 0; spy.saveGraphicsState = 0; spy.restoreGraphicsState = 0;
  spy.addPage = 0; spy.salvo = '';
});

describe('montarPdf — margem e área útil', () => {
  it('desenha dentro da margem, nunca colado na borda', async () => {
    await montar([secao(1000, 500)]);
    expect(spy.addImage).toHaveLength(1);
    const [img] = spy.addImage;
    expect(img.x).toBeCloseTo(MARGEM, 2);
    expect(img.y).toBeCloseTo(MARGEM, 2);
    expect(img.w).toBeCloseTo(CW, 2);
    // A borda direita também respeita a margem.
    expect(img.x + img.w).toBeCloseTo(PW - MARGEM, 2);
  });

  it('recorta na área útil a cada fatia, para não pintar sobre a margem', async () => {
    await montar([secao(1000, 500)]);
    expect(spy.rect).toEqual([{ x: MARGEM, y: MARGEM, w: CW, h: CH }]);
    expect(spy.clip).toBe(1);
    // Todo clip é aberto e fechado — senão o recorte vaza para a página seguinte.
    expect(spy.saveGraphicsState).toBe(spy.restoreGraphicsState);
  });

  it('seção que cabe numa folha não gera página extra', async () => {
    await montar([secao(1000, 500)]);
    expect(spy.addPage).toBe(0);
  });
});

describe('montarPdf — paginação', () => {
  it('fatia a seção alta deslocando pela altura útil, sem página sobrando', async () => {
    // imgH = 4 x CW ≈ 2125pt → 3 fatias de CH (777,89pt).
    await montar([secao(1000, 4000)]);
    expect(spy.addImage).toHaveLength(3);
    expect(spy.addPage).toBe(2);
    spy.addImage.forEach((img, i) => {
      expect(img.x).toBeCloseTo(MARGEM, 2);
      expect(img.y).toBeCloseTo(MARGEM - i * CH, 2);
    });
    expect(spy.saveGraphicsState).toBe(spy.restoreGraphicsState);
  });

  it('cada seção começa em página nova', async () => {
    await montar([secao(1000, 500), secao(1000, 500), secao(1000, 500)]);
    expect(spy.addImage).toHaveLength(3);
    expect(spy.addPage).toBe(2); // 3 seções curtas = 3 páginas
  });

  it('ignora seção sem imagem em vez de gerar página vazia', async () => {
    await montar([secao(1000, 500), { label: 'vazia', dataUrl: '', width: 0, height: 0 }]);
    expect(spy.addImage).toHaveLength(1);
    expect(spy.addPage).toBe(0);
  });
});

describe('montarPdf — encolher em vez de partir', () => {
  it('seção pouco mais alta que a folha encolhe e fica centrada', async () => {
    // imgH ≈ 800pt, entre CH (777,89) e CH x 1,18 (917,9) → encolhe.
    await montar([secao(1000, 1506)]);
    expect(spy.addImage).toHaveLength(1);
    expect(spy.addPage).toBe(0);
    const [img] = spy.addImage;
    expect(img.h).toBeCloseTo(CH, 2);
    expect(img.w).toBeLessThan(CW);
    // Centralizada: sobra igual dos dois lados.
    expect(img.x - MARGEM).toBeCloseTo((PW - MARGEM) - (img.x + img.w), 2);
  });

  it('seção muito mais alta que a folha continua sendo fatiada', async () => {
    // imgH ≈ 1063pt > CH x 1,18 → não encolhe, parte em 2.
    await montar([secao(1000, 2000)]);
    expect(spy.addImage).toHaveLength(2);
    expect(spy.addImage[0].h).toBeGreaterThan(CH);
  });
});

describe('montarPdf — rodapé e nome do arquivo', () => {
  it('numera todas as páginas com o total', async () => {
    await montar([secao(1000, 4000)]);
    expect(spy.text).toEqual(['1 / 3', '2 / 3', '3 / 3']);
  });

  it('salva com o nome pedido', async () => {
    await montar([secao(1000, 500)], 'dashboard-roi-P2.pdf');
    expect(spy.salvo).toBe('dashboard-roi-P2.pdf');
  });
});
