import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Catraca do título de página: um componente, sete consumidores.
 *
 * O DEFEITO QUE ISTO FECHA é o mesmo do fundo de página, uma camada acima.
 * Sete layouts escreviam o próprio título, e eram seis cópias idênticas —
 *
 *     <h1 className="text-xl font-bold text-foreground">{title}</h1>
 *     {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
 *
 * — mais uma que já tinha divergido sem ninguém notar: a do `DevLayout`, com
 * `break-words` e o link do SOP. A divergência não era erro; era o formato
 * cobrando a mesma decisão em sete arquivos, o que garante que um dia um deles
 * mude sozinho. Foi assim que cinco dos oito layouts acabaram pintando a página
 * com a superfície rebaixada, em 10/09/2026, no mesmo dia que isto.
 *
 * Trocar `text-xl` por `text-3xl` nas sete cópias arrumaria as telas de hoje e
 * deixaria a oitava nascer errada. Por isso a régua mora em
 * `components/layout/TituloDaPagina.tsx`, e este teste cobra que continue lá.
 *
 * A SEGUNDA ASSERÇÃO é o par da primeira, e sem ela a primeira faz estrago: com
 * o título a 30px, título mais subtítulo somam ~56px e não cabem num cabeçalho
 * `h-16` (64px) com respiro. O `DevLayout` já usava `min-h-16` por ter batido
 * nisso antes, sozinho; agora os sete usam. Um cabeçalho que volte a `h-16`
 * corta o título no meio por causa do `overflow-hidden` do `<main>`, e não
 * quebra build nenhum.
 */

const RAIZ = resolve(__dirname, '..');

/** O `<h1>` de um layout é o título da página — e ele não se escreve à mão. */
const H1_NA_MAO = /<h1[\s>]/;

/**
 * Cabeçalho de altura travada: o título de 30px não cabe.
 *
 * O `(?<![-\w])` não é zelo: `\bh-16\b` casa DENTRO de `min-h-16`, porque o
 * hífen conta como fronteira de palavra. Sem ele este teste reprova
 * exatamente os cabeçalhos que já estão certos — foi o que aconteceu na
 * primeira execução, com os cinco.
 */
const ALTURA_TRAVADA = /className="[^"]*(?<![-\w])h-16\b/;

function arquivosDeLayout(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivosDeLayout(caminho));
    } else if (/Layout.*\.tsx$/.test(nome) && !nome.endsWith('.test.tsx')) {
      achados.push(caminho);
    }
  }
  return achados;
}

describe('título de página: uma régua, sete cabeçalhos', () => {
  it('nenhum layout escreve o próprio <h1>', () => {
    const culpados: string[] = [];
    for (const caminho of arquivosDeLayout(join(RAIZ, 'components'))) {
      readFileSync(caminho, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          if (H1_NA_MAO.test(linha)) {
            culpados.push(`${relative(RAIZ, caminho)}:${i + 1}`);
          }
        });
    }
    expect(
      culpados,
      'layout escrevendo o próprio título. Use `<TituloDaPagina>` em vez de um\n' +
        '`<h1>`: sete cópias da mesma decisão foi como uma delas divergiu sozinha.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('nenhum cabeçalho de layout trava a altura em h-16', () => {
    const culpados: string[] = [];
    for (const caminho of arquivosDeLayout(join(RAIZ, 'components'))) {
      readFileSync(caminho, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          if (linha.includes('<header') && ALTURA_TRAVADA.test(linha)) {
            culpados.push(`${relative(RAIZ, caminho)}:${i + 1}`);
          }
        });
    }
    expect(
      culpados,
      'cabeçalho travado em `h-16`. O título tem 30px desde 10/09 e com subtítulo\n' +
        'passa de 64px; com o `overflow-hidden` do <main>, ele corta no meio sem\n' +
        'erro de build. Use `min-h-16` com `py-2`.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('a régua do título mora no componente, e é uma só', () => {
    // Sem isto, tirar o `text-3xl` do componente não quebra nada: os sete
    // cabeçalhos continuam chamando `<TituloDaPagina>` e o título volta ao
    // tamanho de antes em silêncio. É o mesmo par do `fundoDePagina.test.ts`,
    // onde a segunda asserção guarda o `body`.
    const fonte = readFileSync(join(RAIZ, 'components/layout/TituloDaPagina.tsx'), 'utf8');
    expect(fonte, 'o título deixou de ser `text-3xl`').toMatch(/<h1[^>]*\btext-3xl\b/);
  });
});
