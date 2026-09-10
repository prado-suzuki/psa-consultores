import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Catraca da caixa alta: título de tela não grita.
 *
 * POR QUE ISTO EXISTE AGORA. Em 10/09/2026 o título da página subiu de 20px
 * para 30px, para desfazer uma hierarquia invertida. A régua nova expôs seis
 * títulos de hub escritos em CAIXA ALTA no `devHubDefinitions.ts` — que a 20px
 * passavam por ênfase e a 30px passam a ocupar a tela inteira gritando. Quem
 * viu foi a Patricia, olhando as telas depois da mudança.
 *
 * A conversão foi só de CAIXA, palavra por palavra, sem reescrever nenhum
 * texto: `'ANÁLISE DO IMPOSTO...'` virou `'Análise do Imposto...'`. Nada de
 * conteúdo se perdeu, e as siglas ficaram como estavam.
 *
 * O LIMIAR, e ele não é arbitrário. Sigla em caixa alta é legítima e o produto
 * usa várias — `ECD` e `ECF` (3 letras), `EFD ICMS` (7), `PERDCOMP` (8). O
 * corte em 12 letras fica acima da maior delas com folga, então uma sigla nova
 * não derruba o teste e uma frase gritada não passa. O que se mede é a razão de
 * maiúsculas entre as LETRAS: acentos e barras não contam, e `SPEDs` continua
 * legível como sigla com plural.
 *
 * COBRE `title` E `heroTitle` porque os dois viram texto grande: o `title` vai
 * direto para o `<TituloDaPagina>` do `DevLayout` (ver `DevHubPage.tsx:19`), e
 * o `heroTitle` é o título do banner logo abaixo. O `subtitle`, a
 * `heroDescription` e a `landingDescription` ficam de fora: são prosa corrida,
 * onde caixa alta não acontece por engano.
 */

const FONTE = resolve(__dirname, '../constants/devHubDefinitions.ts');

/** Acima disto, caixa alta é frase gritada e não sigla. Ver a nota acima. */
const LETRAS_ATE_ONDE_E_SIGLA = 12;

/** A partir daqui, é caixa alta e não uma palavra capitalizada. */
const PROPORCAO_DE_MAIUSCULAS = 0.7;

function grita(texto: string): boolean {
  const letras = [...texto].filter(c => /\p{L}/u.test(c));
  if (letras.length <= LETRAS_ATE_ONDE_E_SIGLA) return false;
  const maiusculas = letras.filter(c => c === c.toLocaleUpperCase('pt-BR')).length;
  return maiusculas / letras.length > PROPORCAO_DE_MAIUSCULAS;
}

describe('título de hub do Dev: caixa alta é sigla, não ênfase', () => {
  it('nenhum título de hub está escrito em caixa alta', () => {
    const fonte = readFileSync(FONTE, 'utf8');
    const culpados: string[] = [];

    for (const [, campo, texto] of fonte.matchAll(/\b(title|heroTitle):\s*\n?\s*'([^']+)'/g)) {
      if (grita(texto)) {
        culpados.push(`  ${campo}: ${texto.slice(0, 60)}${texto.length > 60 ? '…' : ''}`);
      }
    }

    expect(
      culpados,
      'título de hub em caixa alta. Desde que o título subiu para 30px, caixa alta\n' +
        'ocupa a tela gritando — converta a CAIXA sem reescrever as palavras, e\n' +
        'deixe as siglas como estão.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('sigla curta continua podendo ser caixa alta', () => {
    // O par da asserção acima, e o que impede alguém de "resolver" o teste
    // baixando a caixa de `ECD`, `EFD ICMS` e `PERDCOMP`, que estão certos.
    for (const sigla of ['ECD', 'ECF', 'EFD ICMS', 'PERDCOMP', 'EFD ICMS/IPI']) {
      expect(grita(sigla), `${sigla} é sigla e o teste não pode reprová-la`).toBe(false);
    }
    // E o contrário: a frase que motivou o teste tem que reprovar.
    expect(grita('ANÁLISE DO IMPOSTO SOBRE CIRCULAÇÃO DE MERCADORIAS E SERVIÇOS (ICMS)')).toBe(true);
  });
});
