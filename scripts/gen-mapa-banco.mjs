// Gera docs/rls/mapa-do-banco.md a partir de src/integrations/supabase/types.ts
// Uso: node scripts/gen-mapa-banco.mjs  (rodar da raiz do repo)
// Inclui coluna "Acesso" (arquetipos de RLS, curados do pg_policies vivo) + legenda.
import fs from 'fs';

const SRC = 'src/integrations/supabase/types.ts';
const OUT = 'docs/rls/mapa-do-banco.md';
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);

const TABLE_RE = /^      ("[^"]+"|[\w]+): \{$/;

function simplifyType(t) {
  t = t.trim(); const nullable = / \| null$/.test(t); t = t.replace(/ \| null$/, '');
  if (t.length > 60 && t.includes(' | ')) t = t.split(' | ').slice(0, 3).join('|') + '|…';
  return t + (nullable ? '?' : '');
}

const publicStart = lines.findIndex(l => /^  public: \{/.test(l));
const tStart = lines.findIndex((l, index) => index > publicStart && /^    Tables: \{/.test(l));
let tEnd = lines.length;
for (let i = tStart + 1; i < lines.length; i++) if (/^    (Views|Functions|Enums|CompositeTypes): \{/.test(lines[i])) { tEnd = i; break; }

const tables = [];
let i = tStart + 1;
while (i < tEnd) {
  const m = lines[i].match(TABLE_RE);
  if (!m) { i++; continue; }
  const name = m[1].replace(/"/g, ''); const table = { name, cols: [], fks: [] }; i++;
  while (i < tEnd && !/^        Row: \{/.test(lines[i]) && !TABLE_RE.test(lines[i])) i++;
  if (/^        Row: \{/.test(lines[i])) { i++;
    while (i < tEnd && !/^        \}/.test(lines[i])) { const c = lines[i].match(/^          ("?[^":]+"?): (.+)$/); if (c) table.cols.push({ name: c[1].replace(/"/g, ''), type: simplifyType(c[2]) }); i++; } }
  while (i < tEnd && !/^        Relationships: /.test(lines[i]) && !TABLE_RE.test(lines[i])) i++;
  if (/^        Relationships: \[/.test(lines[i])) { let depth = 0, cur = null;
    for (; i < tEnd; i++) { const l = lines[i];
      if (l.includes('[')) depth += (l.match(/\[/g) || []).length;
      if (l.includes('{') && depth > 0) cur = cur || {};
      const cm = l.match(/columns: \[(.*?)\]/); const rr = l.match(/referencedRelation: "(.*?)"/); const rc = l.match(/referencedColumns: \[(.*?)\]/);
      if (cur) { if (cm) cur.columns = cm[1].replace(/"/g, ''); if (rr) cur.rel = rr[1]; if (rc) cur.rcols = rc[1].replace(/"/g, ''); }
      if (l.includes('}') && cur && cur.rel) { table.fks.push(cur); cur = null; }
      if (l.includes(']')) { depth -= (l.match(/\]/g) || []).length; if (depth <= 0) { i++; break; } } } }
  tables.push(table);
}

const enums = []; const eStart = lines.findIndex((l, index) => index > publicStart && /^    Enums: \{/.test(l));
if (eStart >= 0) { let eEnd = lines.length;
  for (let k = eStart + 1; k < lines.length; k++) if (/^    (CompositeTypes|Functions|Views|Tables): \{/.test(lines[k]) || /^  \}/.test(lines[k])) { eEnd = k; break; }
  for (let k = eStart + 1; k < eEnd; k++) { const m = lines[k].match(/^      (\w+):\s*(.*)$/);
    if (m) { let vals = (m[2] || '').trim(); let j = k + 1; while (j < eEnd && /^        \|/.test(lines[j])) { vals += ' ' + lines[j].trim(); j++; }
      const clean = vals.replace(/\|/g, ' ').replace(/"/g, '').split(/\s+/).filter(Boolean).join(', '); if (clean) enums.push({ name: m[1], values: clean }); k = j - 1; } } }

const isJunk = t => /(^_bkp|_bkp_|backup|snapshot|_old\b|_tmp\b|_dump)/i.test(t.name);
const real = tables.filter(t => !isJunk(t)).sort((a, b) => a.name.localeCompare(b.name));
const junk = tables.filter(isJunk);

const flags = t => { const f = []; if (t.cols.some(c => c.name === 'ambiente')) f.push('ambiente'); if (t.cols.some(c => c.name === 'excluido')) f.push('excluido'); if (t.cols.some(c => c.name === 'deleted_at')) f.push('deleted_at'); return f; };
function dedupeFks(fks){ const byCol=new Map(); for(const f of fks){ if(!byCol.has(f.columns)) byCol.set(f.columns,new Map()); byCol.get(f.columns).set(f.rel,f.rcols);} const out=[]; for(const [col,rels] of byCol){ if(rels.has('profiles')&&rels.has('profiles_safe')) rels.delete('profiles_safe'); for(const[rel,rcols] of rels) out.push({columns:col,rel,rcols}); } return out; }
const fkTargets = t => [...new Set(dedupeFks(t.fks).map(f => f.rel))];

// ---- ARQUETIPOS DE ACESSO (RLS) — curado a partir do pg_policies vivo ----
const ARQ_LEGENDA = {
  'interno': 'time interno (team_member ou acima) ve e opera; admin gerencia. Externos nao acessam.',
  'cluster-cliente': 'isolado por cluster do cliente (`cliente_visivel_para`).',
  'cluster-fiscal': 'escopo por contribuinte (`can_view_contribuinte`).',
  'cluster-mapa': 'isolado por cluster de processos/OSG (`mapa_cluster_visivel` / `resolve_user_cluster_ids`).',
  'projeto': 'membros do projeto/area (`is_project_member` / `can_view_org_project` / `org_task_visivel`).',
  'sprint': 'conforme a sprint/cluster (`sprint_visivel` / `is_membro_digital`).',
  'desempenho': 'modulo de avaliacao: lider gerencia, membro ve o que lhe cabe.',
  'chamados': 'chamado: interno + o cliente do chamado (`can_view_ticket`; `tickets` tambem role `client`).',
  'proprio-usuario': 'cada usuario so as proprias linhas (`auth.uid()`); admin quando aplicavel.',
  'catalogo': 'catalogo/estrutura: leitura interna ampla; escrita restrita (admin/lider).',
  'publico': 'aberto a nao autenticados (ex.: formulario de contato).',
  'admin': 'somente admin.',
};

const ACESSO = {
  access_change_log:'interno', administracao:'interno', analises_semestrais:'desempenho', area_servicos:'catalogo',
  atualizacoes_meta:'desempenho', audit_logs:'interno', bem:'cluster-cliente', capital_integralizacao:'cluster-cliente',
  cartorio:'interno', catalog_clients:'interno', centros_custo:'catalogo', checklist_cliente_item:'cluster-cliente',
  checklist_item_padrao:'interno', ciclos_avaliacao:'desempenho', client_documents:'interno', client_visible_projects:'interno',
  cliente:'cluster-cliente', cliente_clusters:'catalogo', codigo_receita:'catalogo', comentarios_avaliacao:'desempenho',
  contatos:'publico', contribuinte:'cluster-cliente', contribuinte_bal_config:'interno', correcoes_icms:'cluster-fiscal',
  daily_standups:'sprint', dashboard_cliente_access:'interno', dashboard_cluster_access:'interno', dashboards:'interno',
  dcomp:'cluster-fiscal', deliverable_attachments:'sprint', demand_items:'sprint', difal_decisao:'cluster-cliente',
  difal_sessao:'cluster-cliente', distribuicao_dcomp:'cluster-fiscal', distribuicao_receita:'cluster-cliente',
  documento_arquivo:'interno', documento_gerado:'interno', documento_horas_historico:'interno',
  documento_notificacao_visto:'proprio-usuario', documento_override:'interno', documentos_processo:'cluster-mapa',
  documents:'interno', efd_correcoes:'cluster-cliente', estrutura_areas:'catalogo', estrutura_clusters:'catalogo',
  estrutura_equipe_membros:'catalogo', estrutura_equipes:'catalogo', etapa_documentos:'cluster-mapa',
  etapa_responsaveis:'cluster-mapa', etapa_sistemas:'cluster-mapa', exploracao_rural:'cluster-cliente',
  export_profiles:'proprio-usuario', feedbacks:'desempenho', gargalo_etapas:'cluster-mapa', gargalo_melhorias:'cluster-mapa',
  gargalo_processos:'cluster-mapa', gargalo_responsaveis:'cluster-mapa', gargalos:'cluster-mapa', grupo_tributo:'catalogo',
  impedimento:'interno', improvement_savings_details:'interno', improvement_team_members:'interno',
  inscricao_contribuinte:'cluster-fiscal', itens_acao_1a1:'desempenho', job_roles:'catalogo', kpis_meta:'desempenho',
  matricula:'cluster-cliente', melhoria_acoes_td:'cluster-mapa', melhoria_processos:'cluster-mapa',
  melhoria_responsaveis:'cluster-mapa', melhoria_sistemas:'cluster-mapa', metas:'desempenho', novidades:'interno',
  ordem_servico:'cluster-cliente', org_project_members:'projeto', org_projects:'projeto', org_task_comments:'projeto',
  org_tasks:'projeto', os_produtos_contratados:'cluster-cliente', page_permissions:'catalogo', parentesco:'cluster-cliente',
  per:'cluster-fiscal', per_situacao:'cluster-fiscal', performance_preferencias:'proprio-usuario', pessoa:'cluster-cliente',
  pis_cofins_class:'catalogo', pis_cofins_regra:'catalogo', ppr_regras_ciclo:'desempenho', procedimentos:'interno',
  process_improvements:'cluster-mapa', process_scenarios:'interno', process_stages:'cluster-mapa', processes:'cluster-mapa',
  produto_segmento:'catalogo', produto_servico:'catalogo', profiles:'proprio-usuario', project_documents:'interno',
  project_processes:'interno', project_servicos:'interno', projects:'interno', projeto_flag_valor:'interno',
  projeto_justificativas:'cluster-mapa', quadro_societario:'cluster-cliente', relatorios_gerados:'interno',
  representante:'interno', reunioes_1a1:'desempenho', rls_precheck_allowed_tables:'catalogo', roi_snapshots:'interno',
  routines:'sprint', servicos_prestados:'catalogo', setor_cliente:'catalogo', sistema_clusters:'cluster-mapa',
  sistema_responsaveis:'cluster-mapa', sistemas_processo:'cluster-mapa', sprint_backlog_items:'sprint',
  sprint_deliverables:'sprint', sprint_events:'sprint', sprint_metrics:'sprint', sprints:'sprint', task_comments:'interno',
  tasks:'interno', ticket_attachments:'chamados', ticket_messages:'chamados', tickets:'chamados', titularidade:'cluster-cliente',
  tmpl_bloco:'interno', tmpl_bloco_flag:'interno', tmpl_bloco_versao:'interno', tmpl_documento:'interno',
  tmpl_documento_bloco:'interno', tmpl_flag:'interno', tool_area_access:'interno', tools:'interno',
  user_page_access:'proprio-usuario', user_roles:'proprio-usuario',
};
const acc = t => ACESSO[t] || 'interno';

const authFns = ['has_role','has_role_or_higher','is_project_member','is_area_member','is_membro_digital','can_perform','can_view_contribuinte','can_view_org_project','can_view_ticket','cliente_visivel_para','resolve_user_cliente_id','resolve_user_cluster_ids','get_clusters_do_cliente_atual','mapa_cluster_visivel','mapa_cluster_gerenciavel','org_task_visivel','sprint_visivel','user_estrutura_area_ids','user_estrutura_equipe_ids'];

let md = `# Mapa do Banco — PSA Consultores

> **Gerado automaticamente** a partir de \`${SRC}\` (autogerado pelo Supabase).
> Nao editar \`types.ts\` a mao. Regenerar este mapa: \`node scripts/gen-mapa-banco.mjs\`.
> **Regra:** para consultar o schema, use ESTE arquivo — **nunca** leia \`types.ts\` inteiro.
> **Acesso (RLS):** a coluna "Acesso" resume "quem acessa" via arquetipos (ver legenda). Reconstruido do \`pg_policies\` vivo; para o texto exato de uma policy, ver \`supabase/migrations\`.

**${real.length} tabelas** de negocio · ${junk.length} de backup (ignorar) · ${enums.length} enums.
Tipos sao TS (\`string\`/\`number\`/\`boolean\`/\`Json\`); \`?\` = nullable.

## Convencoes (do CLAUDE.md)
- **Multi-ambiente:** tabelas com flag \`ambiente\` exigem \`.eq('ambiente', currentAmbiente)\`.
- **Soft delete:** tabelas com flag \`excluido\` exigem \`.eq('excluido', false)\` na leitura.
- **Papeis (roles):** vivem SO em \`user_roles\` — nunca em \`profiles\` nem storage local.
- **FK:** referencie \`profiles.id\` como proxy de usuario — nunca \`auth.users\` direto.

## Acesso (RLS) — legenda dos arquetipos
${Object.entries(ARQ_LEGENDA).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

## Funcoes SECURITY DEFINER (checagem de acesso em RLS)
${authFns.map(f => '`' + f + '()`').join(' · ')}

---

## Indice de tabelas

| Tabela | Cols | Flags | Acesso | Referencia (FK →) |
|---|---|---|---|---|
`;
for (const t of real) md += `| [\`${t.name}\`](#${t.name.replace(/_/g, '')}) | ${t.cols.length} | ${flags(t).join(', ') || '—'} | ${acc(t.name)} | ${fkTargets(t).join(', ') || '—'} |\n`;

md += `\n---\n\n## Detalhe por tabela\n`;
for (const t of real) {
  const fl = flags(t); const fks = dedupeFks(t.fks);
  md += `\n### <a id="${t.name.replace(/_/g, '')}"></a>\`${t.name}\`\n`;
  md += `**Acesso:** ${acc(t.name)}` + (fl.length ? ` · **Flags:** ${fl.join(', ')}` : '') + '\n';
  md += t.cols.map(c => `\`${c.name}\` ${c.type}`).join(' · ') + (fks.length ? `  ·  **FK:** ` + fks.map(f => `\`${f.columns}\`→${f.rel}.${f.rcols}`).join(' · ') : '') + '\n';
}

if (enums.length) { md += `\n---\n\n## Enums\n\n`; for (const e of enums) md += `- \`${e.name}\`: ${e.values}\n`; }
if (junk.length) { md += `\n---\n\n## Tabelas de backup (ignorar em codigo novo)\n\n` + junk.map(t => `\`${t.name}\``).join(' · ') + '\n'; }
md += `\n---\n_Doc gerado por \`scripts/gen-mapa-banco.mjs\`. Regenerar apos mudancas de schema._\n`;

fs.writeFileSync(OUT, md);
console.log(`OK: ${md.split('\n').length} linhas, ${real.length} tabelas, ${enums.length} enums`);
