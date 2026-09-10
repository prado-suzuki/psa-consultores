import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { AREAS } from './nomeDaArea';

/**
 * Catraca do nome de área: escrito num lugar, lido em dois.
 *
 * O DEFEITO QUE ISTO FECHA é o terceiro do mesmo formato em 10/09/2026, e a
 * essa altura ele já tem nome próprio: decisão repetida por arquivo diverge, e
 * não avisa quando uma das cópias muda sozinha. Antes foram o fundo de página
 * (cinco dos oito layouts pintando com a superfície rebaixada) e o título da
 * página (seis cópias idênticas mais uma que já tinha divergido).
 *
 * Aqui a duplicação ainda não tinha acontecido — foi criada no mesmo dia. O
 * nome da área aparecia num lugar só, a barra lateral, e o sobretítulo do
 * cabeçalho ia torná-lo dois. Escrever "Tax" nos dois lugares funcionaria hoje
 * e divergiria no dia em que alguém renomeasse a área num deles.
 *
 * O QUE ESTE TESTE NÃO IMPEDE, de propósito: o nome aparecer em prosa, em
 * comentário, em rota (`/equipe/tax`) ou em texto de tela. Ele cobra só o que é
 * RÓTULO renderizado — o `<h1>`/`<h2>` da barra e o sobretítulo do cabeçalho —,
 * porque é ali que dois valores viram duas verdades.
 */

const RAIZ = resolve(__dirname, '..');

/** Um rótulo de área renderizado como texto literal dentro de JSX. */
function rotuloCravado(linha: string, nome: string): boolean {
  return new RegExp(`>\\s*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`).test(linha);
}

function arquivosDeChrome(dir: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivosDeChrome(caminho));
    } else if (/(Layout|Sidebar).*\.tsx$/.test(nome) && !nome.endsWith('.test.tsx')) {
      achados.push(caminho);
    }
  }
  return achados;
}

describe('nome de área: um lugar escreve, os outros leem', () => {
  it('nenhum layout ou barra lateral crava o nome de uma área', () => {
    const nomes = Object.values(AREAS).flatMap(a => [a.nome, a.subtitulo]);
    const culpados: string[] = [];

    for (const caminho of arquivosDeChrome(join(RAIZ, 'components'))) {
      readFileSync(caminho, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          for (const nome of nomes) {
            if (rotuloCravado(linha, nome)) {
              culpados.push(`${relative(RAIZ, caminho)}:${i + 1} — "${nome}"`);
            }
          }
        });
    }

    expect(
      culpados,
      'nome de área cravado no chrome. Ele mora em `@/lib/nomeDaArea` e é lido de\n' +
        'lá pela barra lateral E pelo sobretítulo do cabeçalho — dois consumidores,\n' +
        'um valor. Cravar num deles é como as três divergências de 10/09 nasceram.\n' +
        culpados.join('\n'),
    ).toEqual([]);
  });

  it('todo layout de área entrega um sobretítulo', () => {
    // O par da asserção acima. Sem ela, tirar o `sobretitulo` de um layout não
    // quebra nada: o cabeçalho continua montando e a área perde a identificação
    // em silêncio — que é o estado em que o produto estava antes de hoje.
    const semSobretitulo: string[] = [];
    for (const caminho of arquivosDeChrome(join(RAIZ, 'components'))) {
      const fonte = readFileSync(caminho, 'utf8');
      if (fonte.includes('<TituloDaPagina') && !fonte.includes('sobretitulo=')) {
        semSobretitulo.push(relative(RAIZ, caminho));
      }
    }
    expect(
      semSobretitulo,
      'layout monta o título sem dizer de que área ele é:\n' + semSobretitulo.join('\n'),
    ).toEqual([]);
  });
});
