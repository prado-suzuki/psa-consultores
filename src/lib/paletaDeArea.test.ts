import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PAPEIS_DE_STATUS,
  TEMAS,
  TONS_DE_TAG,
  blocoDoTema,
  distanciaDeMatiz,
  paletaDoTema,
  problemasDeSeparacao,
  problemasDoTema,
  problemasEntreAreas,
} from '@/lib/paletaDeArea';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

/**
 * Guarda das paletas de área. Vale para o `index.css` de verdade: área nova que
 * esqueça um papel, exagere a saturação ou quebre contraste falha AQUI, e não na
 * tela do usuário.
 */
describe('paletas de área declaradas no index.css', () => {
  it.each(TEMAS)('%s declara a paleta inteira, com contraste e dentro da faixa', tema => {
    expect(blocoDoTema(css, tema), `bloco ${tema} não existe no index.css`).not.toBe('');
    const problemas = problemasDoTema(css, tema);
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(problemas, `paleta fora do contrato:\n${relatorio}`).toEqual([]);
  });

  it('toda área declara os mesmos papéis e tons da base — nada de herança silenciosa', () => {
    const esperado = [
      ...PAPEIS_DE_STATUS.flatMap(papel => [`status-${papel}`, `status-${papel}-soft`]),
      ...TONS_DE_TAG.map(tom => `tag-${tom}`),
    ].sort();
    for (const tema of TEMAS) {
      expect(Object.keys(paletaDoTema(css, tema)).sort(), `${tema} divergiu da base`).toEqual(esperado);
    }
  });

  it.each(TEMAS)('%s: dois papéis nunca viram a mesma bolinha de 8px', tema => {
    // Substitui a antiga asserção "a rampa fila → andamento → revisão escurece".
    // Aquela regra APROVAVA o defeito que motivou este teste: os três papéis no
    // mesmo teal, separados só por 6 pontos de luminosidade, passavam na rampa e
    // saíam indistinguíveis na legenda do Gantt (bolinha de 8px, sem rótulo
    // colado). O que importa não é a ordem da rampa: é a distância entre CADA
    // par de tons cheios. Critério e calibragem em `SEPARACAO`.
    const problemas = problemasDeSeparacao(css, tema);
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(problemas, `papéis que colidem como bolinha:\n${relatorio}`).toEqual([]);
  });

  it('o mesmo papel muda de cara ao trocar de área', () => {
    // O buraco que a usuária encontrou. Os testes acima olham UMA paleta por
    // vez: cada área podia declarar os oito papéis, cumprir contraste, faixa e
    // separação interna — e ainda assim ser cópia da outra. Era o caso: o
    // `alerta` da Tax (`43 68% 28%`) e o da OSG (`44 66% 28%`) estavam a 1° de
    // matiz e ZERO ponto de luminosidade, e os quatro quentes inteiros ficavam
    // entre 1° e 6°. A legenda do Gantt na Tax e na OSG liam como a mesma
    // paleta, e a área deixou de ser reconhecível pela cor.
    //
    // Limiares e o porquê de serem menores que os de `SEPARACAO`: ver
    // `SEPARACAO_ENTRE_AREAS`.
    const problemas = problemasEntreAreas(css);
    const relatorio = problemas.map(p => `  ${p.item}: ${p.tema} — ${p.motivo}`).join('\n');
    expect(problemas, `papéis que não distinguem uma área da outra:\n${relatorio}`).toEqual([]);
  });

  it('o soft acompanha o tom cheio do próprio papel, em toda área', () => {
    // O par (soft, cheio) tem que ler como a MESMA cor em duas profundidades. É o
    // que sobrou da regra da rampa: a leitura de avanço agora vem da separação
    // entre papéis, mas a pílula continua sendo um papel só, e um soft que fugisse
    // da família do seu cheio faria a pílula parecer dois papéis empilhados.
    for (const tema of TEMAS) {
      const paleta = paletaDoTema(css, tema);
      for (const papel of PAPEIS_DE_STATUS) {
        const distancia = distanciaDeMatiz(paleta[`status-${papel}`], paleta[`status-${papel}-soft`]);
        expect(distancia, `${tema}: soft de ${papel} a ${distancia.toFixed(0)}° do tom cheio, longe demais`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('papéis de significado oposto não se confundem na mesma área', () => {
    // "Concluído" e "devolvido para ajuste" precisam ser distinguíveis lado a lado:
    // é o par que mais dói errar numa lista. Os dois são tons escuros, então quem
    // decide é a matiz — a razão de contraste entre eles é ~1:1 por construção.
    for (const tema of TEMAS) {
      const paleta = paletaDoTema(css, tema);
      const distancia = distanciaDeMatiz(paleta['status-feito'], paleta['status-ajuste']);
      expect(distancia, `${tema}: feito e ajuste a ${distancia.toFixed(0)}° de matiz, perto demais`).toBeGreaterThan(60);
    }
  });
});
