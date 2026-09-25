import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SEPARACAO_DE_ANCORAS,
  ancorasQueRepetemPontinho,
  ancorasQueSeAproximam,
  distanciaPerceptiva,
} from '@/lib/ancorasDeArea';
import { ANCORAS } from '@/lib/paletaDeArea';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

describe('de onde vem a âncora de cada área', () => {
  it('nenhuma âncora é um tom da paleta de pontinhos', () => {
    const problemas = ancorasQueRepetemPontinho(css);
    expect(problemas.map(p => `${p.area}: ${p.motivo}`)).toEqual([]);
  });

  it('duas áreas não caem na mesma cor grande', () => {
    const problemas = ancorasQueSeAproximam();
    expect(problemas.map(p => `${p.area}: ${p.motivo}`)).toEqual([]);
  });

  /**
   * O piso de 10 não é redondo por acaso: ele fica entre o conjunto de
   * referência e a troca que o motivou. Sem estes dois números o piso vira
   * arbitrário e a próxima pessoa o afrouxa sem saber o que está soltando.
   */
  it('o piso separa o conjunto de referência da troca que o motivou', () => {
    const identidade = { h: 191, s: 30, l: 36 };
    const pontinho = { h: 160, s: 44, l: 32 };
    const referencia = distanciaPerceptiva(ANCORAS.casa, identidade);
    const trocada = distanciaPerceptiva(ANCORAS.casa, pontinho);

    expect(referencia).toBeGreaterThan(SEPARACAO_DE_ANCORAS.distanciaMinima);
    expect(trocada).toBeLessThan(SEPARACAO_DE_ANCORAS.distanciaMinima);
  });
});
