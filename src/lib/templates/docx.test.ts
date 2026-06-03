import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { montarDocx } from './docx';
import type { Bloco } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string): Bloco => ({ id, tipo, conteudo });

/** Extrai uma parte XML do pacote .docx gerado. */
async function parteXml(doc: Awaited<ReturnType<typeof montarDocx>>, parte: RegExp): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
  return zip.file(parte)[0].async('string');
}

describe('export .docx (formatação do modelo de referência)', () => {
  it('aplica margens, fonte padrão e formatação por tipo estrutural', async () => {
    const doc = await montarDocx([
      bloco('cab', 'livre', 'INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA'),
      bloco('cap', 'capitulo', 'CAPÍTULO I\nDenominação, Sede e Prazo de Duração'),
      bloco('cl', 'clausula', 'CLÁUSULA PRIMEIRA: A sociedade girará sob o nome X.\n    a) Primeira alínea;'),
      bloco('par', 'paragrafo', 'Parágrafo Único: Texto do parágrafo.'),
      bloco('fecho', 'livre', '_______________________________________\nFulano de Tal'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Página e margens do modelo (A4; 2,5 / 2,25 / 3,0 / 2,0 cm)
    expect(xml).toContain('w:w="11906"');
    expect(xml).toContain('w:top="1418"');
    expect(xml).toContain('w:bottom="1276"');
    expect(xml).toContain('w:left="1701"');
    expect(xml).toContain('w:right="1133"');

    // Fonte padrão do corpo (docDefaults em styles.xml)
    const styles = await parteXml(doc, /word\/styles\.xml$/);
    expect(styles).toContain('Arial Narrow');
    expect(styles).toContain('w:val="24"'); // 12pt

    // Capítulo: sublinhado presente no documento (só capítulos usam <w:u>)
    expect(xml).toContain('<w:u w:val="single"/>');
    expect(xml).toContain('CAPÍTULO I');

    // Rótulos preservados como runs separados (negrito no rótulo)
    expect(xml).toContain('CLÁUSULA PRIMEIRA: ');
    expect(xml).toContain('Parágrafo Único: ');

    // Alínea com recuo de 1,27 cm
    expect(xml).toContain('w:left="720"');

    // Título 18pt (36 half-points) e justificação no corpo
    expect(xml).toContain('w:val="36"');
    expect(xml).toContain('w:val="both"');
  });

  it('rodapé tem "Página X de Y" com campos dinâmicos em Arial 9pt à direita', async () => {
    const doc = await montarDocx([bloco('a', 'livre', 'Qualquer texto.')]);
    const footer = await parteXml(doc, /word\/footer\d*\.xml$/);

    expect(footer).toContain('Página ');
    expect(footer).toContain('PAGE');
    expect(footer).toContain('NUMPAGES');
    expect(footer).toContain('Arial');
    expect(footer).toContain('w:val="18"'); // 9pt
    expect(footer).toContain('w:val="right"');
  });
});
