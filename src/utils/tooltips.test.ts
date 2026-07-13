// Integridade do guia/tooltips: toda chave usada em dica('...') no código-fonte
// precisa existir em TOOLTIPS. Chave inexistente = tooltip vazio silencioso.
// Varre o src (offline, sem banco) e cruza com o dicionário.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { TOOLTIPS } from './tooltips';

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) acc.push(p);
  }
  return acc;
}

describe('integridade dos tooltips (dica)', () => {
  it('toda chave dica("literal") existe em TOOLTIPS', () => {
    const root = join(process.cwd(), 'src');
    const files = walk(root).filter(
      (f) => !/\.test\.(ts|tsx)$/.test(f) && !f.endsWith(join('utils', 'tooltips.ts')),
    );
    const faltando = new Set<string>();
    const re = /\bdica\(\s*'([^']+)'/g;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (!(m[1] in TOOLTIPS)) faltando.add(`${m[1]}  ←  ${f.slice(root.length + 1)}`);
      }
    }
    expect([...faltando].sort()).toEqual([]);
  });
});
