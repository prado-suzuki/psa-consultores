// Auto-fix #2: parseia "Property 'X' does not exist on type 'Y'" e aplica
// renames específicos por type (campos ambíguos onde o destino depende do tipo).

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Por tipo: nome do campo errado → nome correto. Independente do tipo
// (campo ambíguo onde o destino depende do tipo).
const TYPE_FIELD_MAP: Record<string, Record<string, string>> = {
  RoiProcesso: {
    process_id: 'processoId',
    annual_cost: 'custoAnual',
    annual_hours: 'horasAnual',
    annual_savings: 'economiaAnual',
    hours_freed: 'horasLiberadas',
    roi_percent: 'roiPercentual',
    payback_months: 'paybackMeses',
    investment: 'investimento',
  },
  RoiAgregado: {
    annual_savings: 'economiaAnual',
    hours_freed: 'horasLiberadas',
    roi_percent: 'roiPercentual',
    payback_months: 'paybackMeses',
  },
  Projeto: {
    nome: 'name',
    descricao: 'description',
    cluster: 'clusterName',
  },
  Processo: {
    nome: 'name',
    descricao: 'description',
    ordem: 'order_index',
  },
  Etapa: {
    nome: 'name',
    descricao: 'description',
    ordem: 'stage_order',
  },
  EtapaFicou: {
    descricao: 'description',
  },
  Responsavel: {
    nome: 'name',
    cargo: 'level',           // mapper antigo mapeava `cargo` → `level`. Mantém.
    categoria: 'category',
    cluster: 'clusterName',
    tipo: 'type',
  },
  Melhoria: {
    nome: 'improvement_description',
    descricao: 'improvement_description',
    custoExternoUnico: 'one_time_external_cost',
    horasTreinamento: 'training_hours',
    cluster: 'clusterName',
    status: 'improvement_status',
  },
  Gargalo: {
    cluster: 'clusterName',
    custoExternoUnico: 'custo_externo_unico',
  },
};

interface TsError {
  file: string;
  line: number;
  col: number;
  from: string;
  type: string;
}

function parseErrors(stdout: string): TsError[] {
  const errs: TsError[] = [];
  // TS2339: Property 'X' does not exist on type 'Y'.
  const re1 = /^(\S+?\.tsx?)\((\d+),(\d+)\): error TS2339: Property '([^']+)' does not exist on type '(?:Partial<)?(\w+)(?:>)?(?:\[\])?'\.\s*$/gm;
  // TS2353: Object literal may only specify known properties, and 'X' does not exist in type 'Y'.
  // (Y pode ser 'Etapa', 'Partial<Melhoria>', 'Omit<Processo, "id">', 'MelhoriaInput', etc.)
  const re2 = /^(\S+?\.tsx?)\((\d+),(\d+)\): error TS2353: Object literal may only specify known properties, and '([^']+)' does not exist in type '(?:Partial<|Omit<)?(\w+?)(?:Input)?(?:>)?(?:,[^']*)?'.*$/gm;
  for (const re of [re1, re2]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(stdout))) {
      errs.push({
        file: m[1].replace(/\\/g, '/'),
        line: parseInt(m[2], 10),
        col: parseInt(m[3], 10),
        from: m[4],
        type: m[5],
      });
    }
  }
  return errs;
}

function applyFixes(errs: TsError[]): number {
  const byFile = new Map<string, TsError[]>();
  for (const e of errs) {
    const map = TYPE_FIELD_MAP[e.type];
    if (!map || !map[e.from]) continue;
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file)!.push(e);
  }
  let applied = 0;
  for (const [file, fileErrs] of byFile) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    fileErrs.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of fileErrs) {
      const to = TYPE_FIELD_MAP[e.type][e.from];
      const idx = e.line - 1;
      if (idx < 0 || idx >= lines.length) continue;
      const line = lines[idx];
      const colIdx = e.col - 1;
      const before = line.slice(0, colIdx);
      const after = line.slice(colIdx);
      if (after.startsWith(e.from)) {
        lines[idx] = before + to + after.slice(e.from.length);
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
    console.log(`[iter ${i}] Nenhum match — parando.`);
    break;
  }
  const applied = applyFixes(errs);
  console.log(`[iter ${i}] ${errs.length} matches, aplicou ${applied}.`);
  if (applied === 0) {
    console.log(`[iter ${i}] Estabilizou — parando.`);
    break;
  }
}

const final = spawnSync('bun', ['run', 'typecheck'], { encoding: 'utf8' });
const finalOut = (final.stdout || '') + (final.stderr || '');
const remaining = (finalOut.match(/error TS\d+/g) || []).length;
console.log(`\nErros restantes: ${remaining}`);
