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

function arquivosDeCodigo(dir: string): string[] {
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
