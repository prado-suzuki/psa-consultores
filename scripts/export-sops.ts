#!/usr/bin/env bun
/**
 * Extrai SOPs em Markdown (As-Is + To-Be) e Diagramas (.mmd) direto do banco,
 * sem abrir o app. Reusa os MESMOS módulos puros do front (buildSopMarkdown,
 * buildProcessDiagram, enrichEtapas, buildEtapasComFicou), então o conteúdo é
 * idêntico ao que o app gera.
 *
 * Uso (precisa de JWT + ANON no ambiente — mesmo padrão dos dumps em _roi_dump):
 *   JWT=... ANON=... bun scripts/export-sops.ts [--cluster=ID] [--project=ID] [--process=ID] [--out=DIR]
 *
 * Sem filtro → exporta todos os processos. Saída padrão: _sops_export/
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Processo, Projeto, Documento, Sistema, Responsavel, Gargalo, Melhoria, AcaoTd,
} from '@/types';
import { buildEtapasComFicou, type EtapaDbRow } from '@/utils/etapaHydrate';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { buildSopMarkdown } from '@/utils/pdf/sopMarkdown';
import { buildProcessDiagram } from '@/utils/processDiagram';
import { slugFilename } from '@/utils/slugify';

const BASE = process.env.SUPABASE_URL || 'https://zwoainzzqhudmmknuycq.supabase.co/rest/v1';
const JWT = process.env.JWT;
const ANON = process.env.ANON;

if (!JWT || !ANON) {
  console.error('Faltam credenciais: defina JWT e ANON no ambiente.');
  process.exit(1);
}

function parseArgs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs();
const OUT = args.out || '_sops_export';

async function get<T = Record<string, unknown>>(table: string, query: string): Promise<T[]> {
  const url = `${BASE}/${table}?${query}${query.includes('limit=') ? '' : '&limit=10000'}`;
  const res = await fetch(url, {
    headers: { apikey: ANON!, Authorization: `Bearer ${JWT}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET ${table} → ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json() as Promise<T[]>;
}

const pluck = <T>(arr: Array<Record<string, unknown>> | null | undefined, key: string): T[] =>
  (arr ?? []).map(o => o[key]).filter((v): v is T => v != null);

async function main() {
  // Processos (com filtros opcionais)
  let procQuery = 'select=id,name,description,deliverable,frequency,complexity_level,project_id,cluster_id&order=order_index';
  if (args.process) procQuery += `&id=eq.${args.process}`;
  if (args.project) procQuery += `&project_id=eq.${args.project}`;
  if (args.cluster) procQuery += `&cluster_id=eq.${args.cluster}`;
  const procsRaw = await get<Processo & { cluster_id?: string }>('processes', procQuery);
  if (procsRaw.length === 0) { console.log('Nenhum processo encontrado para o filtro.'); return; }
  const procIds = procsRaw.map(p => p.id);
  const inList = `(${procIds.join(',')})`;

  // Dicionários globais
  const [projetosRaw, documentos, sistemas, responsaveis, gargalosRaw, melhoriasRaw, stageRows] = await Promise.all([
    get<Record<string, unknown>>('projects', 'select=id,name,estrutura_clusters(name)'),
    get<Documento>('documentos_processo', 'select=id,nome,tipo,origem,formato'),
    get<Sistema>('sistemas_processo', 'select=id,nome,descricao'),
    get<Responsavel>('job_roles', 'select=id,name,level,hourly_rate'),
    get<Record<string, unknown>>('gargalos', 'select=id,nome,descricao,origem,gargalo_processos(processo_id)'),
    get<Record<string, unknown>>('process_improvements', 'select=id,improvement_description,improvement_status,melhoria_processos(processo_id),melhoria_acoes_td(acao_td)'),
    get<EtapaDbRow>('process_stages', `select=*,etapa_documentos(documento_id,sentido,volume),etapa_sistemas(sistema_id,rateio),etapa_responsaveis(responsavel_id,papel,horas),gargalo_etapas(gargalo_id)&process_id=in.${inList}&scenario=in.(AS-IS,TO-BE)&order=stage_order`),
  ]);

  const projetos: Projeto[] = projetosRaw.map(r => ({
    ...(r as unknown as Projeto),
    clusterName: (r.estrutura_clusters as { name?: string } | null)?.name,
  }));
  const gargalos: Gargalo[] = gargalosRaw.map(r => ({
    id: r.id as string,
    nome: r.nome as string,
    descricao: (r.descricao as string) ?? '',
    origem: (r.origem as string) ?? undefined,
    processos: pluck<string>(r.gargalo_processos as Array<Record<string, unknown>>, 'processo_id'),
    etapasOrigem: [],
  }));
  const melhorias: Melhoria[] = melhoriasRaw.map(r => ({
    id: r.id as string,
    improvement_description: r.improvement_description as string,
    improvement_status: (r.improvement_status as Melhoria['improvement_status']) ?? null,
    processos: pluck<string>(r.melhoria_processos as Array<Record<string, unknown>>, 'processo_id'),
    sistemas: [],
    executadoPor: [],
    acoesTd: pluck<AcaoTd>(r.melhoria_acoes_td as Array<Record<string, unknown>>, 'acao_td'),
  }));

  // Etapas hidratadas + enriquecidas (nomes resolvidos)
  const allEtapas = enrichEtapas(buildEtapasComFicou(stageRows), documentos, sistemas, responsaveis);

  mkdirSync(OUT, { recursive: true });
  let count = 0;
  for (const processo of procsRaw) {
    const etapas = allEtapas.filter(e => e.process_id === processo.id);
    const projeto = projetos.find(p => p.id === processo.project_id) || null;
    const projSlug = slugFilename(projeto?.name || 'sem-projeto', processo.project_id || 'sem-projeto');
    const procSlug = slugFilename(processo.name, processo.id);
    const dir = join(OUT, projSlug);
    mkdirSync(dir, { recursive: true });

    const common = { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto };
    writeFileSync(join(dir, `${procSlug}__SOP_as-is.md`), buildSopMarkdown({ ...common, mode: 'era' }), 'utf-8');
    if (etapas.some(e => e.ficou)) {
      writeFileSync(join(dir, `${procSlug}__SOP_to-be.md`), buildSopMarkdown({ ...common, mode: 'ficou' }), 'utf-8');
    }
    writeFileSync(join(dir, `${procSlug}__Diagrama.mmd`), buildProcessDiagram(common), 'utf-8');
    count++;
    console.log(`✓ ${projSlug}/${procSlug} (${etapas.length} etapas)`);
  }
  console.log(`\nPronto: ${count} processo(s) exportado(s) em ${OUT}/`);
}

main().catch(err => { console.error(err); process.exit(1); });
