import { describe, expect, it } from 'vitest';
import { marcarRealceDiff } from './diffPalavras';
import type { SegmentoRender } from './render';

/** Concatena os trechos marcados com `realce` (o que a prévia destaca). */
function realcados(segs: SegmentoRender[]): string[] {
  return segs.filter((s) => s.realce).map((s) => s.texto);
}

describe('marcarRealceDiff — diff por palavra dos overrides', () => {
  it('não marca nada quando o texto é idêntico', () => {
    const segs: SegmentoRender[] = [{ tipo: 'texto', texto: 'O sócio retira-se da sociedade.' }];
    const out = marcarRealceDiff(segs, 'O sócio retira-se da sociedade.');
    expect(out).toBe(segs); // mesma referência: sem diff, sem recorte
    expect(realcados(out)).toEqual([]);
  });

  it('marca só a palavra trocada', () => {
    const original = 'O sócio retira-se da sociedade.';
    const segs: SegmentoRender[] = [{ tipo: 'texto', texto: 'O sócio exclui-se da sociedade.' }];
    const out = marcarRealceDiff(segs, original);
    expect(realcados(out)).toEqual(['exclui-se']);
    // o texto completo é preservado na recomposição
    expect(out.map((s) => s.texto).join('')).toBe('O sócio exclui-se da sociedade.');
  });

  it('marca palavras inseridas sem incluir o espaço da borda', () => {
    const original = 'Fica deliberado.';
    const segs: SegmentoRender[] = [{ tipo: 'texto', texto: 'Fica desde já deliberado.' }];
    const out = marcarRealceDiff(segs, original);
    expect(realcados(out)).toEqual(['desde já']);
  });

  it('preserva tipo/origem do segmento de valor ao recortar', () => {
    const original = 'Capital de R$ 100,00 integralizado.';
    const segs: SegmentoRender[] = [
      { tipo: 'texto', texto: 'Capital de ' },
      { tipo: 'valor', texto: 'R$ 200,00', caminho: 'empresa.capital' },
      { tipo: 'texto', texto: ' integralizado.' },
    ];
    const out = marcarRealceDiff(segs, original);
    // Só "200,00" mudou (não o "R$ "): o segmento de valor é recortado e a parte
    // alterada continua sendo um valor com a mesma proveniência.
    const valorRealcado = out.find((s) => s.tipo === 'valor' && s.realce);
    expect(valorRealcado).toMatchObject({ tipo: 'valor', caminho: 'empresa.capital', texto: '200,00' });
    expect(out.map((s) => s.texto).join('')).toBe('Capital de R$ 200,00 integralizado.');
  });
});
