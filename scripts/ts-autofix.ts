// Auto-fix usando os hints "Did you mean X" do TypeScript.
// Parseia stderr do tsc, abre cada arquivo, aplica o rename na exata
// linha/coluna apontada. Itera até estabilizar (nenhum erro com "Did you mean").
//
// Suporta também TS2561 (object literal property).

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

interface TsError {
  file: string;
  line: number;
  col: number;
  from: string;
  to: string;
}

function parseErrors(stdout: string): TsError[] {
  const errs: TsError[] = [];
  // Property 'X' does not exist on type ...  Did you mean 'Y'?
  const re1 = /^(\S+?\.tsx?)\((\d+),(\d+)\): error TS\d+: Property '([^']+)' does not exist on .*?\. Did you mean '([^']+)'\?/gm;
  // Object literal may only specify known properties, but 'X' does not exist in type ...  Did you mean to write 'Y'?
  const re2 = /^(\S+?\.tsx?)\((\d+),(\d+)\): error TS\d+: Object literal may only specify known properties, but '([^']+)' does not exist in .*?\. Did you mean to write '([^']+)'\?/gm;
  for (const re of [re1, re2]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(stdout))) {
      errs.push({
        file: m[1].replace(/\\/g, '/'),
        line: parseInt(m[2], 10),
        col: parseInt(m[3], 10),
        from: m[4],
        to: m[5],
      });
    }
  }
  return errs;
}

function applyFixes(errs: TsError[]): number {
  // Agrupa por arquivo
  const byFile = new Map<string, TsError[]>();
  for (const e of errs) {
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file)!.push(e);
  }
  let applied = 0;
  for (const [file, fileErrs] of byFile) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    // Sort by line desc, col desc (aplicar de trás pra frente pra não invalidar cols)
    fileErrs.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of fileErrs) {
      const idx = e.line - 1;
      if (idx < 0 || idx >= lines.length) continue;
      const line = lines[idx];
      // col is 1-based
      const colIdx = e.col - 1;
      const before = line.slice(0, colIdx);
      const after = line.slice(colIdx);
      if (after.startsWith(e.from)) {
        lines[idx] = before + e.to + after.slice(e.from.length);
        applied++;
      }
    }
    writeFileSync(file, lines.join('\n'));
  }
  return applied;
}

const MAX_ITER = 10;
for (let i = 0; i < MAX_ITER; i++) {
  const result = spawnSync('bun', ['run', 'typecheck'], { encoding: 'utf8' });
  const out = (result.stdout || '') + (result.stderr || '');
  const errs = parseErrors(out);
  if (errs.length === 0) {
    console.log(`[iter ${i}] Nenhum "Did you mean" — parando.`);
    break;
  }
  console.log(`[iter ${i}] ${errs.length} fixes...`);
  const applied = applyFixes(errs);
  console.log(`[iter ${i}] Aplicou ${applied}.`);
  if (applied === 0) {
    console.log(`[iter ${i}] Estabilizou sem mudança — parando.`);
    break;
  }
}

const final = spawnSync('bun', ['run', 'typecheck'], { encoding: 'utf8' });
const finalOut = (final.stdout || '') + (final.stderr || '');
const remaining = (finalOut.match(/error TS\d+/g) || []).length;
console.log(`\nErros restantes: ${remaining}`);
