/**
 * A régua dos modais, cobrada em cima do código fonte.
 *
 * Desde que o teto de altura passou a nascer nas primitivas (ver
 * `dialog.teto.test.tsx`), duas formas de escrever um `DialogContent` quebram em
 * silêncio — e as duas apareceram de verdade em 09/09/2026:
 *
 * 1. Declarar altura própria (`h-[95vh]`) e não declarar teto: o `max-h-[90vh]`
 *    da primitiva aperta a altura pedida, e o modal encolhe sem ninguém pedir.
 *    Foram seis, todos de tela cheia, perdendo de 3 a 7vh.
 * 2. Declarar `overflow-hidden` — que descarta a rolagem da primitiva — sem dizer
 *    o próprio tamanho e sem rolagem interna: o conteúdo passa do teto herdado e
 *    é cortado, sem barra nenhuma. Foi um, o de avisar cliente da OSG, onde a
 *    lista de notificações escondia o botão de enviar.
 *
 * Nenhuma das duas dá erro de build, de tipo ou de lint. E as duas escaparam da
 * varredura manual porque `className` escrito em várias linhas não cabe num grep
 * de linha — motivo pelo qual a leitura aqui é por contador de chaves, e não por
 * regex de tag: o `>` de `[&>button]:hidden` estraga o recorte.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const RAIZ = 'src';

function arquivosDeTela(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivosDeTela(caminho));
    else if (nome.endsWith('.tsx') && !nome.includes('.test.')) saida.push(caminho);
  }
  return saida;
}

/** O texto do `className` de cada `<DialogContent` do arquivo, em uma linha. */
export function classesDosModais(fonte: string): string[] {
  const achados: string[] = [];
  const marca = /<DialogContent\b/g;
  let encontro: RegExpExecArray | null;

  while ((encontro = marca.exec(fonte))) {
    const depois = fonte.slice(encontro.index, encontro.index + 2000);
    const iCls = depois.indexOf('className=');
    if (iCls === -1) {
      achados.push('');
      continue;
    }

    const i = iCls + 'className='.length;
    const abre = depois[i];
    let texto = '';

    if (abre === '"' || abre === "'") {
      texto = depois.slice(i + 1, depois.indexOf(abre, i + 1));
    } else if (abre === '{') {
      let nivel = 0;
      for (let j = i; j < depois.length; j++) {
        if (depois[j] === '{') nivel += 1;
        else if (depois[j] === '}') {
          nivel -= 1;
          if (nivel === 0) {
            texto = depois.slice(i + 1, j);
            break;
          }
        }
      }
    }

    achados.push(texto.replace(/\s+/g, ' '));
  }

  return achados;
}

export const temAlturaPropria = (classes: string) =>
  /(^|[\s"'`])(sm:|md:|lg:|xl:)?h-\[/.test(classes) || /(^|[\s"'`])h-screen/.test(classes);

export const temTetoDeclarado = (classes: string) => /max-h-(none|\[)/.test(classes);

export const desligaRolagemHerdada = (classes: string) => /overflow-(hidden|visible)\b/.test(classes);

/** Rolagem no próprio arquivo. `<CommandList` conta: ele rola em 300px. */
export const temRolagemInterna = (fonte: string) =>
  /overflow-y-auto|overflow-auto|<CommandList|ScrollArea/.test(fonte);

interface Quebra {
  arquivo: string;
  motivo: string;
}

function quebras(): Quebra[] {
  const achadas: Quebra[] = [];

  for (const arquivo of arquivosDeTela(RAIZ)) {
    const fonte = readFileSync(arquivo, 'utf8');
    if (!fonte.includes('<DialogContent')) continue;

    const rolagemInterna = temRolagemInterna(fonte);

    for (const classes of classesDosModais(fonte)) {
      if (temAlturaPropria(classes) && !temTetoDeclarado(classes)) {
        achadas.push({
          arquivo,
          motivo: 'pede altura própria sem declarar teto — o max-h-[90vh] da primitiva aperta',
        });
      }
      if (desligaRolagemHerdada(classes) && !temAlturaPropria(classes) && !temTetoDeclarado(classes) && !rolagemInterna) {
        achadas.push({
          arquivo,
          motivo: 'desliga a rolagem da primitiva sem dizer o tamanho nem rolar por dentro — corta',
        });
      }
    }
  }

  return achadas;
}

describe('régua dos modais', () => {
  it('nenhum DialogContent do repositório quebra a régua', () => {
    expect(quebras().map((q) => `${q.arquivo} — ${q.motivo}`)).toEqual([]);
  });

  // Sem estes dois, a varredura acima poderia estar aprovando tudo por não
  // enxergar nada. São as formas exatas que quebraram, escritas à mão.
  it('reprova altura própria sem teto, como nos seis modais de tela cheia', () => {
    const classes = 'max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0 flex flex-col overflow-hidden';
    expect(temAlturaPropria(classes)).toBe(true);
    expect(temTetoDeclarado(classes)).toBe(false);

    expect(temTetoDeclarado(`${classes} max-h-none`)).toBe(true);
  });

  it('reprova quem desliga a rolagem sem dizer o tamanho, como o modal de avisar cliente', () => {
    const classes = 'max-w-3xl gap-0 overflow-hidden p-0';
    expect(desligaRolagemHerdada(classes)).toBe(true);
    expect(temAlturaPropria(classes)).toBe(false);
    expect(temTetoDeclarado(classes)).toBe(false);
    expect(temRolagemInterna('<div className="px-6 py-5">')).toBe(false);

    expect(temRolagemInterna('<div className="min-h-0 flex-1 overflow-y-auto">')).toBe(true);
  });

  it('lê className escrito em várias linhas e com cn(), que é onde o grep falhou', () => {
    const fonte = `
      <DialogContent
        className={cn(
          "max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0",
          "flex flex-col overflow-hidden",
          "[&>button]:hidden"
        )}
      >
    `;

    const [classes] = classesDosModais(fonte);
    expect(classes).toContain('h-[calc(100vh-3rem)]');
    expect(classes).toContain('[&>button]:hidden');
  });
});
