// Lê o CSV bruto da Patricia, descarta linhas mal-formadas (vírgula dentro de xProd
// sem aspas), normaliza colunas usadas pela calculadora e grava em public/mocks/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] || 'C:/Users/Patricia Melo/Downloads/dados_ibs_cbs_barralcool (2).csv';
const OUT = join(process.cwd(), 'public', 'mocks', 'ibs_cbs_saidas.csv');

if (!existsSync(SRC)) {
  console.error('Fonte não encontrada:', SRC);
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const raw = readFileSync(SRC, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);

const KEEP = [
  'chave_nfe','dEmi','tipo_mov','uf_dest','nome_dest','cProd','xProd','NCM','CFOP',
  'qCom','valor_bruto','vICMS','vICMSST','vIPI','vPIS','vPIS_ST','vCOFINS','vCOFINS_ST',
  'regra_reducao','monofasico','ibs_cbs_base','reducao_aliq','aliq_ibs_cbs','valor_ibs_cbs'
];
const idx = Object.fromEntries(KEEP.map(k => [k, header.indexOf(k)]));
const missing = KEEP.filter(k => idx[k] === -1);
if (missing.length) { console.error('Colunas faltando:', missing); process.exit(1); }

const VALID_REGRA = new Set(['Anexo I','Anexo II','Anexo III','Anexo IV','Anexo V','Anexo VI','Anexo VII','Anexo VIII','Anexo IX','Anexo X','Anexo XI','Anexo XII','Anexo XIII','Anexo XIV','Anexo XV','Anexo XVI','Anexo XVII','Anexo XVIII','']);

let kept = 0, dropped = 0;
const outRows = [KEEP.join(',')];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols.length < header.length) { dropped++; continue; }
  const reg = cols[idx['regra_reducao']]?.trim() ?? '';
  if (!VALID_REGRA.has(reg)) { dropped++; continue; }
  const row = KEEP.map(k => {
    const v = cols[idx[k]] ?? '';
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  });
  outRows.push(row.join(','));
  kept++;
}

writeFileSync(OUT, outRows.join('\n'), 'utf8');
console.log(`OK: ${kept} linhas em ${OUT} (descartadas: ${dropped})`);
