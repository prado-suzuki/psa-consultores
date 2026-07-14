// Gera docs/rls/mapa-do-banco.md a partir de src/integrations/supabase/types.ts
// Uso: node scripts/gen-mapa-banco.mjs   (rodar da raiz do repo)
// Regenerar sempre que o schema do Supabase mudar (types.ts é autogerado).
import fs from 'fs';

const SRC = 'src/integrations/supabase/types.ts';
const OUT = 'docs/rls/mapa-do-banco.md';
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);

const TABLE_RE = /^      ("[^"]+"|[\w]+): \{$/;

function simplifyType(t) {
  t = t.trim();
  const nullable = / \| null$/.test(t);
  t = t.replace(/ \| null$/, '');
  if (t.length > 60 && t.includes(' | ')) t = t.split(' | ').slice(0, 3).join('|') + '|…';
  return t + (nullable ? '?' : '');
}

// ---- parse Tables ----
const tStart = lines.findIndex(l => /^    Tables: \{/.test(l));
let tEnd = lines.length;
for (let i = tStart + 1; i < lines.length; i++) {
  if (/^    (Views|Functions|Enums|CompositeTypes): \{/.test(lines[i])) { tEnd = i; break; }
}

const tables = [];
let i = tStart + 1;
while (i < tEnd) {
  const m = lines[i].match(TABLE_RE);
  if (!m) { i++; continue; }
  const name = m[1].replace(/"/g, '');
  const table = { name, cols: [], fks: [] };
  i++;
  while (i < tEnd && !/^        Row: \{/.test(lines[i]) && !TABLE_RE.test(lines[i])) i++;
  if (/^        Row: \{/.test(lines[i])) {
    i++;
    while (i < tEnd && !/^        \}/.test(lines[i])) {
      const c = lines[i].match(/^          ("?[^":]+"?): (.+)$/);
      if (c) table.cols.push({ name: c[1].replace(/"/g, ''), type: simplifyType(c[2]) });
      i++;
    }
  }
  while (i < tEnd && !/^        Relationships: /.test(lines[i]) && !TABLE_RE.test(lines[i])) i++;
  if (/^        Relationships: \[/.test(lines[i])) {
    let depth = 0, cur = null;
    for (; i < tEnd; i++) {
      const l = lines[i];
      if (l.includes('[')) depth += (l.match(/\[/g) || []).length;
      if (l.includes('{') && depth > 0) cur = cur || {};
      const cm = l.match(/columns: \[(.*?)\]/);
      const rr = l.match(/referencedRelation: "(.*?)"/);
      const rc = l.match(/referencedColumns: \[(.*?)\]/);
      if (cur) {
        if (cm) cur.columns = cm[1].replace(/"/g, '');
        if (rr) cur.rel = rr[1];
        if (rc) cur.rcols = rc[1].replace(/"/g, '');
      }
      if (l.includes('}') && cur && cur.rel) { table.fks.push(cur); cur = null; }
      if (l.includes(']')) { depth -= (l.match(/\]/g) || []).length; if (depth <= 0) { i++; break; } }
    }
  }
  tables.push(table);
}

// ---- parse Enums ----
const enums = [];
const eStart = lines.findIndex(l => /^    Enums: \{/.test(l));
if (eStart >= 0) {
  let eEnd = lines.length;
  for (let k = eStart + 1; k < lines.length; k++) {
    if (/^    (CompositeTypes|Functions|Views|Tables): \{/.test(lines[k]) || /^  \}/.test(lines[k])) { eEnd = k; break; }
  }
  for (let k = eStart + 1; k < eEnd; k++) {
    const m = lines[k].match(/^      (\w+):\s*(.*)$/);
    if (m) {
      let vals = (m[2] || '').trim();
      let j = k + 1;
      while (j < eEnd && /^        \|/.test(lines[j])) { vals += ' ' + lines[j].trim(); j++; }
      const clean = vals.replace(/\|/g, ' ').replace(/"/g, '').split(/\s+/).filter(Boolean).join(', ');
      if (clean) enums.push({ name: m[1], values: clean });
      k = j - 1;
    }
  }
}

// ---- classify ----
const isJunk = t => /(^_bkp|_bkp_|backup|snapshot|_old\b|_tmp\b|_dump)/i.test(t.name);
const real = tables.filter(t => !isJunk(t)).sort((a, b) => a.name.localeCompare(b.name));
const junk = tables.filter(isJunk);

// funções SECURITY DEFINER (checagem de acesso) — mais usadas em RLS
const authFns = ['has_role', 'has_role_or_higher', 'is_project_member', 'is_area_member', 'is_membro_digital',
  'can_perform', 'can_view_contribuinte', 'can_view_org_project', 'can_view_ticket', 'cliente_visivel_para',
  'resolve_user_cliente_id', 'resolve_user_cluster_ids', 'get_clusters_do_cliente_atual', 'mapa_cluster_visivel',
  'mapa_cluster_gerenciavel', 'org_task_visivel', 'sprint_visivel', 'user_estrutura_area_ids', 'user_estrutura_equipe_ids'];

const flags = t => {
  const f = [];
  if (t.cols.some(c => c.name === 'ambiente')) f.push('ambiente');
  if (t.cols.some(c => c.name === 'excluido')) f.push('excluido');
  if (t.cols.some(c => c.name === 'deleted_at')) f.push('deleted_at');
  return f;
};
function dedupeFks(fks) {
  const byCol = new Map();
  for (const f of fks) {
    if (!byCol.has(f.columns)) byCol.set(f.columns, new Map());
    byCol.get(f.columns).set(f.rel, f.rcols);
  }
  const out = [];
  for (const [col, rels] of byCol) {
    if (rels.has('profiles') && rels.has('profiles_safe')) rels.delete('profiles_safe');
    for (const [rel, rcols] of rels) out.push({ columns: col, rel, rcols });
  }
  return out;
}
const fkTargets = t => [...new Set(dedupeFks(t.fks).map(f => f.rel))];

// ---- render ----
let md = `# Mapa do Banco — PSA Consultores

> **Gerado automaticamente** a partir de \`${SRC}\` (autogerado pelo Supabase).
> Não editar \`types.ts\` à mão. Regenerar este mapa: \`node scripts/gen-mapa-banco.mjs\`.
> **Regra:** para consultar o schema, use ESTE arquivo — **nunca** leia \`types.ts\` inteiro.

**${real.length} tabelas** de negócio · ${junk.length} de backup (ignorar) · ${enums.length} enums.
Tipos são TS (\`string\`/\`number\`/\`boolean\`/\`Json\`); \`?\` = nullable.

## Convenções (do CLAUDE.md)
- **Multi-ambiente:** tabelas com flag \`ambiente\` exigem \`.eq('ambiente', currentAmbiente)\`.
- **Soft delete:** tabelas com flag \`excluido\` exigem \`.eq('excluido', false)\` na leitura.
- **Papéis (roles):** vivem SÓ em \`user_roles\` — nunca em \`profiles\` nem storage local.
- **FK:** referencie \`profiles.id\` como proxy de usuário — nunca \`auth.users\` direto.

## Funções SECURITY DEFINER (checagem de acesso em RLS)
Use em políticas/queries em vez de reimplementar regra de acesso:
${authFns.map(f => '`' + f + '()`').join(' · ')}

_(lista completa: \`git grep "CREATE OR REPLACE FUNCTION" supabase/migrations\`)_

---

## Índice de tabelas

| Tabela | Cols | Flags | Referencia (FK →) |
|---|---|---|---|
`;
for (const t of real) {
  md += `| [\`${t.name}\`](#${t.name.replace(/_/g, '')}) | ${t.cols.length} | ${flags(t).join(', ') || '—'} | ${fkTargets(t).join(', ') || '—'} |\n`;
}

md += `\n---\n\n## Detalhe por tabela\n\n`;
for (const t of real) {
  md += `### <a id="${t.name.replace(/_/g, '')}"></a>\`${t.name}\`\n`;
  const fl = flags(t);
  if (fl.length) md += `**Flags:** ${fl.join(', ')}\n\n`;
  md += t.cols.map(c => `\`${c.name}\` ${c.type}`).join(' · ') + '\n';
  const fks = dedupeFks(t.fks);
  if (fks.length) md += `\n**FK:** ` + fks.map(f => `\`${f.columns}\`→${f.rel}.${f.rcols}`).join(' · ') + '\n';
  md += '\n';
}

if (enums.length) {
  md += `---\n\n## Enums\n\n`;
  for (const e of enums) md += `- \`${e.name}\`: ${e.values}\n`;
  md += '\n';
}
if (junk.length) {
  md += `---\n\n## Tabelas de backup (ignorar em código novo)\n\n`;
  md += junk.map(t => `\`${t.name}\``).join(' · ') + '\n';
}
md += `\n---\n_Doc gerado por \`scripts/gen-mapa-banco.mjs\`. Regenerar após mudanças de schema._\n`;

fs.writeFileSync(OUT, md);
console.log(`OK: ${OUT} — ${md.split('\n').length} linhas, ${real.length} tabelas, ${enums.length} enums`);
