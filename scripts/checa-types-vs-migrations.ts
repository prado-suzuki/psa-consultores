#!/usr/bin/env bun
/**
 * Trava: coluna nova no `types.ts` exige, no MESMO PR, a migration que a cria.
 *
 * O PORQUÊ. O `types.ts` é uma FOTOGRAFIA do banco, tirada com `gen types` contra o
 * banco daquela branch. O sandbox é compartilhado por quatro pessoas, então ele
 * contém, a qualquer momento, schema de trabalho que ainda não foi mesclado (em
 * 02/09/2026 eram 23 migrations aplicadas por fora do repositório). Quem regenera o
 * `types.ts` nesse estado leva para a sua branch coluna que NENHUMA migration do
 * repositório cria, e que não existe em produção. Aí o typecheck passa, o build passa,
 * e o app publicado quebra na cara do cliente, porque a `main` é buildada contra
 * produção.
 *
 * Esta trava é a metade que faltava. A outra ("mexeu em migration, atualize o
 * types.ts") pega o esquecimento; esta pega a importação indevida, que é a que
 * machuca.
 *
 * Custo zero de credencial: compara o `types.ts` da base com o do HEAD e procura os
 * nomes nos `.sql` do próprio PR. Não fala com banco nenhum.
 *
 * Uso: bun scripts/checa-types-vs-migrations.ts <sha-da-base>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TYPES = 'src/integrations/supabase/types.ts';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** tabela -> colunas, lido do bloco `public.Tables` do arquivo gerado. */
function tabelasDe(fonte: string): Map<string, Set<string>> {
  const linhas = fonte.split('\n');
  const mapa = new Map<string, Set<string>>();

  const iPublic = linhas.findIndex((l) => /^ {2}public: \{/.test(l));
  const iTables = linhas.findIndex((l, i) => i > iPublic && /^ {4}Tables: \{/.test(l));
  if (iTables < 0) return mapa;

  let fim = linhas.length;
  for (let i = iTables + 1; i < linhas.length; i++) {
    if (/^ {4}(Views|Functions|Enums|CompositeTypes): \{/.test(linhas[i])) { fim = i; break; }
  }

  let tabela: string | null = null;
  let dentroDoRow = false;
  for (let i = iTables + 1; i < fim; i++) {
    const nova = linhas[i].match(/^ {6}("[^"]+"|[\w]+): \{$/);
    if (nova) { tabela = nova[1].replace(/"/g, ''); dentroDoRow = false; mapa.set(tabela, new Set()); continue; }
    if (/^ {8}Row: \{/.test(linhas[i])) { dentroDoRow = true; continue; }
    if (dentroDoRow && /^ {8}\}/.test(linhas[i])) { dentroDoRow = false; continue; }
    if (dentroDoRow && tabela) {
      const col = linhas[i].match(/^ {10}("[^"]+"|[\w]+)\??:/);
      if (col) mapa.get(tabela)!.add(col[1].replace(/"/g, ''));
    }
  }
  return mapa;
}

const base = process.argv[2];
if (!base) {
  console.error('uso: bun scripts/checa-types-vs-migrations.ts <sha-da-base>');
  process.exit(2);
}

let antes: string;
try {
  antes = git('show', `${base}:${TYPES}`);
} catch {
  console.log(`${TYPES} não existe na base; nada a comparar.`);
  process.exit(0);
}

const depois = readFileSync(TYPES, 'utf8');
if (antes === depois) {
  console.log(`${TYPES} não mudou neste PR.`);
  process.exit(0);
}

const deAntes = tabelasDe(antes);
const deDepois = tabelasDe(depois);

const tabelasNovas: string[] = [];
const colunasNovas: { tabela: string; coluna: string }[] = [];
for (const [tabela, colunas] of deDepois) {
  if (!deAntes.has(tabela)) { tabelasNovas.push(tabela); continue; }
  for (const c of colunas) if (!deAntes.get(tabela)!.has(c)) colunasNovas.push({ tabela, coluna: c });
}

if (tabelasNovas.length === 0 && colunasNovas.length === 0) {
  console.log(`${TYPES} mudou, mas não ganhou tabela nem coluna. OK.`);
  process.exit(0);
}

// O SQL de todas as migrations que o PR acrescenta ou altera, junto num só texto.
const migrations = git('diff', '--name-only', '--diff-filter=AM', base, 'HEAD', '--', 'supabase/migrations')
  .split('\n')
  .filter((p) => p.endsWith('.sql'));

const sqlDoPr = migrations.map((p) => readFileSync(p, 'utf8')).join('\n').toLowerCase();

const orfas = [
  ...tabelasNovas
    .filter((t) => !sqlDoPr.includes(t.toLowerCase()))
    .map((t) => ({ o_que: `tabela ${t}`, nome: t })),
  ...colunasNovas
    .filter(({ coluna }) => !sqlDoPr.includes(coluna.toLowerCase()))
    .map(({ tabela, coluna }) => ({ o_que: `coluna ${tabela}.${coluna}`, nome: coluna })),
];

console.log(`${TYPES}: ${tabelasNovas.length} tabela(s) e ${colunasNovas.length} coluna(s) novas`);
console.log(`${migrations.length} migration(s) no PR`);

if (orfas.length === 0) {
  console.log('Todas têm migration correspondente no PR. OK.');
  process.exit(0);
}

console.error('\nO types.ts ganhou schema que NENHUMA migration deste PR cria:\n');
for (const o of orfas) console.error(`  ${o.o_que}`);
console.error(`
${orfas.length} item(ns) sem migration.

Quase sempre isso significa: o types.ts foi regenerado contra o sandbox, que é
compartilhado, e trouxe trabalho de outra pessoa que ainda não foi mesclado. Esse
schema NÃO existe em produção, e a main é buildada contra produção.

O que fazer:
  - se a coluna é sua, a migration que a cria tem de entrar neste PR;
  - se não é sua, refaça o types.ts sem ela (aplique só o delta da sua mudança);
  - \`bun run db:sync\` lista o que está aplicado no sandbox e não está em origin/develop.
`);
process.exit(1);
