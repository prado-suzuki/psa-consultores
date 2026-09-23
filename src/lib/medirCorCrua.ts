import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/**
 * O scanner por trás das catracas de cor crua (`filaDoAlerta`, `filaDoSlate`).
 *
 * ⚠️ **Isto é código de TESTE**, e usa `node:fs`. Ele mora em `src/lib` porque é de
 * onde as catracas o importam, e não porque componente possa usá-lo — se algum
 * arquivo de tela importar daqui, o build quebra alto na hora de resolver `node:fs`.
 * A falha é ruidosa de propósito; não a silencie, tire o import.
 *
 * Existe como arquivo separado porque nasceu a SEGUNDA catraca. A primeira podia
 * carregar o scanner dentro dela; duas cópias da mesma varredura já seriam o
 * defeito que esta rodada passou o dia inteiro consertando em outros lugares.
 */

const RAIZ = resolve(__dirname, '../..');

/** As pastas que pintam tela. `src/lib` e `src/hooks` ficam de fora: lá cor crua,
    quando existe, é dado de gráfico, e isso é outra frente (a fase 3b). */
export const PASTAS_DE_TELA = ['src/components', 'src/pages'] as const;

/**
 * Os arquivos de tela de uma pasta, recursivamente. Exportado desde 12/09/2026,
 * quando a `cartaoTingido` precisou da MESMA varredura com outro predicado (ela
 * não procura família de cor, procura caixa arredondada pintada à mão). Copiar o
 * `readdirSync` de novo seria a terceira cópia do mesmo caminhar — e o
 * `fundoDePagina.test.ts` já tem duas dele.
 */
export function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivosDeCodigo(caminho);
    if (!/\.tsx?$/.test(entrada.name)) return [];
    // A própria catraca cita as classes que procura; arquivo de teste não pinta tela.
    if (/\.(test|spec)\.tsx?$/.test(entrada.name)) return [];
    return [caminho];
  });
}

/**
 * Conta, por arquivo, quantas vezes o padrão aparece nas pastas de tela.
 *
 * Devolve caminho relativo com barra normal, e não `sep` do sistema, para o
 * inventário das catracas ser o mesmo no Windows e no CI.
 */
export function medirCorCrua(padrao: RegExp): Record<string, number> {
  const medido: Record<string, number> = {};
  for (const pasta of PASTAS_DE_TELA) {
    for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
      const achados = readFileSync(caminho, 'utf8').match(padrao);
      if (achados) medido[relative(RAIZ, caminho).split(sep).join('/')] = achados.length;
    }
  }
  return medido;
}

/**
 * As propriedades do Tailwind que aceitam cor. É a mesma lista da auditoria do
 * `paleta-por-area.md`, mais `decoration` — que faltava lá, e por isso onze
 * `decoration-slate-400` atravessaram quatro lotes de conversão sem serem contados.
 */
export const PROPRIEDADES_DE_COR =
  'bg|text|border|divide|ring|fill|stroke|from|to|via|outline|decoration|accent|caret|placeholder|shadow';

/**
 * O padrão de uma família crua do Tailwind, em forma de CLASSE.
 *
 * O recorte importa: `hsl(var(--slate-500))` **não** casa, e é proposital. Aquilo é a
 * escala institucional do `index.css`, resultado da fase 3a, e não cor crua. Prosa de
 * comentário que cite `slate-600` também não casa, porque falta o prefixo de
 * propriedade — e comentário que conta história é para ficar.
 */
export function familiaCrua(...familias: string[]): RegExp {
  return new RegExp(
    String.raw`\b(?:[a-z-]+:)*(?:${PROPRIEDADES_DE_COR})-(?:${familias.join('|')})-\d{2,3}\b`,
    'g',
  );
}

/**
 * O raio que faz de uma caixa um OBJETO. `rounded-full` (pílula) e
 * `rounded`/`rounded-sm` (chip, bloco de código) ficam de fora de propósito.
 */
export const CAIXA_ARREDONDADA = /\brounded-(?:md|lg|xl|2xl|3xl)\b/;

/** O fim da expressão que começa em `inicio`: chaves balanceadas, ou a aspa de fechar. */
function fimDaExpressao(texto: string, inicio: number): number | null {
  const TETO = 2000;
  const primeiro = texto[inicio];
  if (primeiro === '"' || primeiro === "'" || primeiro === '`') {
    const fim = texto.indexOf(primeiro, inicio + 1);
    return fim === -1 || fim - inicio > TETO ? null : fim + 1;
  }
  if (primeiro !== '{') return null;
  let profundidade = 0;
  for (let i = inicio; i < texto.length && i - inicio < TETO; i++) {
    if (texto[i] === '{') profundidade++;
    else if (texto[i] === '}') {
      profundidade--;
      if (profundidade === 0) return i + 1;
    }
  }
  return null;
}

/**
 * As linhas do arquivo, cada uma somada à EXPRESSÃO DE CLASSE que a contém.
 *
 * Sem isto a leitura é linha a linha, e o `KpiHero` prova por que isso não
 * basta: ele abre `cn(` numa linha, declara `rounded-2xl` na seguinte e
 * `bg-card` três linhas abaixo. Linha a linha, o cartão que faz a massa branca
 * do meio do Dashboard — oito deles — passa invisível pela catraca que existe
 * para achá-lo.
 *
 * O recorte é o `className=` inteiro, incluindo `cn()` multilinha e template
 * literal. O teto de 2000 caracteres existe para um `{` desbalanceado dentro de
 * string não engolir o arquivo até o fim.
 *
 * ⚠️ **Mora aqui desde 17/09/2026**, quando nasceu a `filaDoBranco` e virou a
 * SEGUNDA catraca a precisar dele — antes vivia dentro da `cartaoTingido`. É a
 * mesma razão que fez este arquivo existir: duas cópias da mesma varredura são
 * o defeito que estas catracas passam o dia consertando em outros lugares.
 */
export function linhasComAExpressaoDeClasse(texto: string): string[] {
  const linhas = texto.split('\n');
  const contexto = linhas.slice();
  const inicioDaLinha: number[] = [];
  let offset = 0;
  for (const linha of linhas) {
    inicioDaLinha.push(offset);
    offset += linha.length + 1;
  }
  const linhaDe = (pos: number) => {
    let i = inicioDaLinha.length - 1;
    while (i > 0 && inicioDaLinha[i] > pos) i--;
    return i;
  };

  const abertura = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = abertura.exec(texto))) {
    const inicio = m.index + m[0].length;
    const fim = fimDaExpressao(texto, inicio);
    if (fim === null) continue;
    const trecho = texto.slice(inicio, fim).replace(/\s+/g, ' ');
    for (let l = linhaDe(inicio); l <= linhaDe(fim - 1); l++) {
      contexto[l] = `${linhas[l]} ${trecho}`;
    }
    abertura.lastIndex = fim;
  }
  return contexto;
}

/**
 * Quantas vezes o padrão aparece DENTRO de caixa arredondada, por arquivo.
 *
 * O `padrao` precisa ter a flag `g` — ele é usado com `match`, e sem o `g` a
 * contagem para em 1 por linha sem avisar.
 */
export function medirEmCaixaArredondada(
  padrao: RegExp,
  ignorar: readonly string[] = [],
): Record<string, number> {
  const medido: Record<string, number> = {};
  for (const pasta of PASTAS_DE_TELA) {
    for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
      const rel = relative(RAIZ, caminho).split(sep).join('/');
      if (ignorar.includes(rel)) continue;
      const texto = readFileSync(caminho, 'utf8');
      const contexto = linhasComAExpressaoDeClasse(texto);
      let achados = 0;
      texto.split('\n').forEach((linha, i) => {
        if (!CAIXA_ARREDONDADA.test(contexto[i])) return;
        achados += linha.match(padrao)?.length ?? 0;
      });
      if (achados) medido[rel] = achados;
    }
  }
  return medido;
}
