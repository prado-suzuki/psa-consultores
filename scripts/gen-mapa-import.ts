// Gera supabase/migrations/20260603120000_mapa_import_osg.sql a partir dos
// CSVs em C:\Users\Alexandre Silva\Desktop\HERMES_OSG\mapeamento\export\csv\.
//
// Uso: bun run scripts/gen-mapa-import.ts
//
// Estratégia:
//   - IDs de origem (text slugs) viram UUIDs determinísticos via
//     mapa_uuid(slug) = md5('mapa-osg:' || slug)::uuid (definida no SQL).
//   - cluster "PSA OSG" mapeia para o uuid 0523512c-f980-4236-8a7c-53e06c9c7a80.
//   - INSERTs com ON CONFLICT (id) DO NOTHING / UNIQUE DO NOTHING — idempotente.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EXPORT_DIR = String.raw`C:\Users\Alexandre Silva\Desktop\HERMES_OSG\mapeamento\export\csv`;
const OUT_FILE = join(
  'supabase',
  'migrations',
  '20260603120000_mapa_import_osg.sql',
);

const CLUSTER_PSA_OSG = '0523512c-f980-4236-8a7c-53e06c9c7a80';

// Mapeamento manual: slug OSG (resp-osg-*) → job_roles.id existente no Supabase.
// Cargos não listados são PULADOS (suas linhas em etapa_responsaveis também).
const RESPONSAVEL_MAP: Record<string, string> = {
  'resp-osg-assistente':   'aa77a98a-74a3-438d-af72-d2100beb9763', // → Assistente Administrativo
  'resp-osg-senior':       '1bdb36fd-b65b-4503-aadd-e1b04f505e44', // → Analista Fiscal Sr
  'resp-osg-back-office':  'aa77a98a-74a3-438d-af72-d2100beb9763', // → Assistente Administrativo
  'resp-osg-gerente':      'aa53bfa1-f8c5-4509-855c-127698caaaef', // → Gerente (match exato)
  'resp-osg-socio':        '9eac2a09-7527-4d6b-ae65-b5004d76cea4', // → Coordenador
  // resp-osg-cliente, resp-osg-fiscal: PULADOS
};

// ───────────────────────────── CSV parser ─────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  // filtra linhas vazias
  const cleaned = rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (cleaned.length === 0) return [];
  const header = cleaned[0];
  return cleaned.slice(1).map(r => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? '';
    return obj;
  });
}

function loadCsv(name: string): Record<string, string>[] {
  const text = readFileSync(join(EXPORT_DIR, `${name}.csv`), 'utf8');
  return parseCsv(text);
}

// ───────────────────────────── SQL helpers ─────────────────────────────
function sqlText(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}
function sqlNum(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  if (!Number.isFinite(n)) return 'NULL';
  return String(n);
}
function sqlInt(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 'NULL';
  return String(n);
}
function sqlBool(v: boolean): string { return v ? 'TRUE' : 'FALSE'; }
function uuidExpr(slug: string | null | undefined): string {
  if (!slug) return 'NULL';
  return `mapa_uuid(${sqlText(slug)})`;
}

// Converte timestamp do export (ISO ou millis epoch) para timestamptz literal.
function sqlTs(v: string | null | undefined): string {
  if (!v) return 'NULL';
  if (/^\d+$/.test(v)) {
    const ms = Number(v);
    return `to_timestamp(${ms / 1000})`;
  }
  // já é ISO
  return sqlText(v);
}

// ──────────────────────────── geração SQL ────────────────────────────
const out: string[] = [];

out.push(`-- =====================================================================
-- 20260603120000_mapa_import_osg.sql
-- Importa os dados históricos do MAPA (HERMES_OSG/mapeamento/export) para
-- o schema Lovable (Supabase / PostgreSQL).
--
-- Origem: SQLite (TEXT IDs slug) → Destino: Postgres (UUID IDs).
-- IDs traduzidos via mapa_uuid(slug) = md5('mapa-osg:' || slug)::uuid.
--
-- Idempotente: ON CONFLICT DO NOTHING em todos os INSERTs.
-- Envelopado em BEGIN/COMMIT.
--
-- Conteúdo:
--   1. helper mapa_uuid(text)
--   2. projects                 (6 linhas)
--   3. (job_roles PULADO — vínculos resolvidos via mapa manual de slug→uuid existente)
--   4. documentos_processo      (120 linhas)
--   5. sistemas_processo        (16 linhas)
--   6. gargalos                 (91 linhas)
--   7. processes                (32 linhas)
--   8. process_stages           (167 linhas, AS-IS apenas — TO-BE vazio no export)
--   9. etapa_responsaveis       (169/228 linhas — 59 puladas, ver bloco)
--  10. etapa_sistemas           (219 linhas)
--  11. etapa_documentos         (204 linhas)
--  12. gargalo_processos        (91 linhas)
--  13. sistema_clusters         (16 linhas)
--
-- Tabelas puladas (0 linhas no export ou requisitos NOT NULL incompatíveis):
--   melhorias, melhoria_*, gargalo_responsaveis, sistema_responsaveis,
--   projeto_justificativas, documento_horas_historico, cascata_*,
--   process_snapshots (3 linhas placeholder — process_scenarios exige
--   scenario_kind/varied_field/parameters/created_by NOT NULL; recriar pela UI),
--   job_roles (decisão do usuário: usar cargos existentes via mapa manual).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.mapa_uuid(slug text) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$ SELECT md5('mapa-osg:' || slug)::uuid $$;
`);

// ───── 1. projects ─────
{
  const rows = loadCsv('projetos');
  out.push(`\n-- 1. projects (${rows.length} linhas)`);
  out.push(`INSERT INTO public.projects
  (id, name, description, cluster_id, projects_per_year, start_date, end_date, status, area, created_at, updated_at)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.id),
    sqlText(r.nome),
    sqlText(r.descricao),
    sqlText(CLUSTER_PSA_OSG),
    sqlInt(r.projetos_por_ano),
    r.data_inicio ? sqlText(r.data_inicio) : 'NULL',
    r.data_fim ? sqlText(r.data_fim) : 'NULL',
    sqlText(r.status || 'active'),
    `'OSG'`,
    sqlTs(r.created_at),
    sqlTs(r.updated_at),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id) DO NOTHING;`);
}

// ───── 2. job_roles ─────
// PULADO por decisão do usuário. Os vínculos em etapa_responsaveis são
// resolvidos via RESPONSAVEL_MAP (slug OSG → uuid de job_role existente).
out.push(`\n-- 2. job_roles — PULADO. responsavel_id é resolvido contra job_roles existentes:
--    resp-osg-assistente   → Assistente Administrativo (aa77a98a-74a3-438d-af72-d2100beb9763) — 57 vínculos
--    resp-osg-senior       → Analista Fiscal Sr        (1bdb36fd-b65b-4503-aadd-e1b04f505e44) — 99 vínculos
--    resp-osg-back-office  → Assistente Administrativo (aa77a98a-74a3-438d-af72-d2100beb9763) — 5 vínculos
--    resp-osg-gerente      → Gerente                   (aa53bfa1-f8c5-4509-855c-127698caaaef) — 8 vínculos
--    resp-osg-socio        → Coordenador                (9eac2a09-7527-4d6b-ae65-b5004d76cea4) — 8 vínculos
-- PULADOS (vínculos descartados):
--    resp-osg-cliente      — 45 vínculos
--    resp-osg-fiscal       — 6 vínculos
-- Total: 177 / 228 sobrevivem (78%).`);

// ───── 3. documentos_processo ─────
{
  const rows = loadCsv('documentos');
  out.push(`\n-- 3. documentos_processo (${rows.length} linhas)`);
  out.push(`INSERT INTO public.documentos_processo
  (id, nome, tipo, categoria, formato, origem, tempo_minutos, estrutura_entrada, estruturado, canonico_id, created_at, updated_at)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.id),
    sqlText(r.nome),
    sqlText(r.tipo),
    sqlText(r.categoria),
    sqlText(r.formato),
    sqlText(r.origem),
    sqlNum(r.tempo),
    sqlText(r.estrutura_entrada),
    sqlText(r.estruturado),
    uuidExpr(r.canonico_id),
    sqlTs(r.created_at),
    sqlTs(r.updated_at),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id) DO NOTHING;`);
}

// ───── 4. sistemas_processo ─────
{
  const rows = loadCsv('sistemas');
  out.push(`\n-- 4. sistemas_processo (${rows.length} linhas)`);
  out.push(`INSERT INTO public.sistemas_processo
  (id, nome, descricao, tipo, origem, cluster_id, custo_licenca_mensal, custo_variavel_por_uso, custo_por_operacao, custo_setup, obs_licenca, obs_variavel, obs_custo_por_operacao, created_at, updated_at)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.id),
    sqlText(r.nome),
    sqlText(r.descricao),
    sqlText(r.tipo),
    sqlText(r.origem),
    sqlText(CLUSTER_PSA_OSG),
    sqlNum(r.custo_licenca),
    sqlNum(r.custo_variavel),
    sqlNum(r.custo_por_operacao),
    sqlNum(r.custo_setup),
    sqlText(r.obs_licenca),
    sqlText(r.obs_variavel),
    sqlText(r.obs_custo_por_operacao),
    sqlTs(r.created_at),
    sqlTs(r.updated_at),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id) DO NOTHING;`);
}

// ───── 5. gargalos ─────
{
  const rows = loadCsv('gargalos');
  out.push(`\n-- 5. gargalos (${rows.length} linhas)`);
  out.push(`INSERT INTO public.gargalos
  (id, nome, descricao, origem, cluster_id, melhoria_id, horas_gastas, horas_implementacao, taxa_ocorrencia, taxa_captura_apos_melhoria, custo_externo_unico, created_at, updated_at)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.id),
    sqlText(r.nome),
    sqlText(r.descricao),
    sqlText(r.origem),
    sqlText(CLUSTER_PSA_OSG),
    uuidExpr(r.melhoria_id),
    sqlNum(r.horas_gastas),
    sqlNum(r.horas_implementacao),
    sqlNum(r.taxa_ocorrencia),
    sqlNum(r.taxa_captura_apos_melhoria),
    sqlNum(r.custo_externo_unico),
    sqlTs(r.created_at),
    sqlTs(r.updated_at),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id) DO NOTHING;`);
}

// ───── 6. processes ─────
{
  const rows = loadCsv('processos');
  out.push(`\n-- 6. processes (${rows.length} linhas)`);
  out.push(`INSERT INTO public.processes
  (id, project_id, cluster_id, name, description, frequency, complexity_level, stage,
   order_index, deliverable, evaluation_status, training_hours, mapped_at, created_at, updated_at)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.id),
    uuidExpr(r.projeto_id),
    sqlText(CLUSTER_PSA_OSG),
    sqlText(r.nome),
    sqlText(r.descricao),
    sqlText(r.frequencia),
    sqlText(r.complexidade),
    `'discovery'`,
    sqlInt(r.ordem),
    sqlText(r.entregavel),
    sqlText(r.status_avaliacao),
    sqlNum(r.horas_treinamento),
    sqlTs(r.mapeado_em),
    sqlTs(r.created_at),
    sqlTs(r.updated_at),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id) DO NOTHING;`);
}

// ───── 7. process_stages ─────
{
  const rows = loadCsv('etapas');
  out.push(`\n-- 7. process_stages (${rows.length} linhas)`);
  out.push(`INSERT INTO public.process_stages
  (id, scenario, stage_as_is_id, process_id, name, description, execution,
   lead_time_days, volume_per_process, error_rate, rework_rate, error_cost, error_volume,
   stage_order, created_at, updated_at)
VALUES`);
  const values = rows.map(r => {
    const scenario = (r.cenario || 'AS-IS').toUpperCase();
    return `  (${[
      uuidExpr(r.id),
      sqlText(scenario),
      // stage_as_is_id é null para AS-IS; TO-BE referencia a row AS-IS de mesmo id
      scenario === 'TO-BE' ? uuidExpr(r.id) : 'NULL',
      uuidExpr(r.processo_id),
      sqlText(r.nome),
      sqlText(r.descricao),
      sqlText(r.execucao),
      sqlNum(r.lead_time_dias),
      sqlNum(r.volume_por_processo),
      sqlNum(r.taxa_erros),
      sqlNum(r.taxa_retrabalho),
      sqlNum(r.custo_erro),
      sqlNum(r.volume_erros),
      sqlInt(r.ordem),
      sqlTs(r.created_at),
      sqlTs(r.updated_at),
    ].join(', ')})`;
  }).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (id, scenario) DO NOTHING;`);
}

// ───── 8. etapa_responsaveis ─────
{
  const rowsAll = loadCsv('etapa_responsaveis');
  const skipped: Record<string, number> = {};
  const rows = rowsAll.filter(r => {
    if (RESPONSAVEL_MAP[r.responsavel_id]) return true;
    skipped[r.responsavel_id] = (skipped[r.responsavel_id] ?? 0) + 1;
    return false;
  });
  out.push(`\n-- 8. etapa_responsaveis (${rows.length}/${rowsAll.length} linhas, ${rowsAll.length - rows.length} puladas)`);
  if (Object.keys(skipped).length > 0) {
    out.push(`-- Puladas por cargo sem mapeamento:`);
    for (const [slug, count] of Object.entries(skipped).sort((a, b) => b[1] - a[1])) {
      out.push(`--   ${slug}: ${count}`);
    }
  }
  out.push(`INSERT INTO public.etapa_responsaveis
  (etapa_id, scenario, responsavel_id, papel, horas)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.etapa_id),
    sqlText((r.cenario || 'AS-IS').toUpperCase()),
    sqlText(RESPONSAVEL_MAP[r.responsavel_id]),
    sqlText(r.papel),
    sqlNum(r.horas),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT ON CONSTRAINT etapa_responsaveis_uniq DO NOTHING;`);
}

// ───── 9. etapa_sistemas ─────
{
  const rows = loadCsv('etapa_sistemas');
  out.push(`\n-- 9. etapa_sistemas (${rows.length} linhas)`);
  out.push(`INSERT INTO public.etapa_sistemas
  (etapa_id, scenario, sistema_id, rateio)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.etapa_id),
    sqlText((r.cenario || 'AS-IS').toUpperCase()),
    uuidExpr(r.sistema_id),
    sqlNum(r.rateio),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT ON CONSTRAINT etapa_sistemas_uniq DO NOTHING;`);
}

// ───── 10. etapa_documentos ─────
{
  const rows = loadCsv('etapa_documentos');
  out.push(`\n-- 10. etapa_documentos (${rows.length} linhas)`);
  out.push(`INSERT INTO public.etapa_documentos
  (etapa_id, scenario, documento_id, sentido, volume)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.etapa_id),
    sqlText((r.cenario || 'AS-IS').toUpperCase()),
    uuidExpr(r.documento_id),
    sqlText(r.sentido),
    sqlNum(r.volume),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT ON CONSTRAINT etapa_documentos_uniq DO NOTHING;`);
}

// ───── 11. gargalo_processos ─────
{
  const rows = loadCsv('gargalo_processos');
  out.push(`\n-- 11. gargalo_processos (${rows.length} linhas)`);
  out.push(`INSERT INTO public.gargalo_processos
  (gargalo_id, processo_id)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.gargalo_id),
    uuidExpr(r.processo_id),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (gargalo_id, processo_id) DO NOTHING;`);
}

// ───── 12. sistema_clusters ─────
{
  const rows = loadCsv('sistema_clusters');
  out.push(`\n-- 12. sistema_clusters (${rows.length} linhas)`);
  out.push(`INSERT INTO public.sistema_clusters
  (sistema_id, cluster_id, rateio)
VALUES`);
  const values = rows.map(r => `  (${[
    uuidExpr(r.sistema_id),
    sqlText(CLUSTER_PSA_OSG),
    sqlNum(r.rateio),
  ].join(', ')})`).join(',\n');
  out.push(values);
  out.push(`ON CONFLICT (sistema_id, cluster_id) DO NOTHING;`);
}

out.push(`\nCOMMIT;\n\n-- FIM DA MIGRAÇÃO DE IMPORT MAPA\n`);

writeFileSync(OUT_FILE, out.join('\n'), 'utf8');
console.log(`OK -> ${OUT_FILE}`);
