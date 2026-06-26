#!/usr/bin/env bun
/**
 * Exporta TODOS os artefatos do MAPA por processo, direto do banco, sem abrir o
 * app. Reusa os MESMOS módulos puros do front (buildSopMarkdown,
 * buildSopComparativoMarkdown, buildProcessDiagram, SopDocument,
 * SopComparativoDocument, calcularRoi, diagnosticarRoi), então o conteúdo é
 * idêntico ao que o app gera.
 *
 * Estrutura de saída:
 *   <OUT>/<projeto>/<processo>/
 *     como-era/      SOP_as-is.md   SOP_as-is.pdf   Diagrama.mmd
 *     como-ficou/    SOP_to-be.md   SOP_to-be.pdf            (só se há cenário projetado)
 *     comparativo/   SOP_comparativo.md  SOP_comparativo.pdf (só se há cenário projetado)
 *
 * Uso (precisa de JWT + ANON no ambiente — mesmo padrão dos dumps em _roi_dump):
 *   JWT=... ANON=... bun scripts/export-sops.ts [--cluster=ID] [--project=ID] [--process=ID] [--out=DIR] [--no-pdf]
 *
 * Sem filtro → exporta todos os processos. Saída padrão: _sops_export/
 * --no-pdf → gera só os .md e .mmd (pula a renderização dos PDFs; iteração rápida).
 */

// O plugin precisa ser registrado ANTES de importar os componentes PDF (que
// fazem `import logo from '*.png'`). Em Node o @react-pdf não resolve um path
// cru do Windows como <Image src>; o plugin troca o import do .png por um
// data-URI, que funciona tanto no browser quanto headless. Por isso os
// componentes PDF são carregados por import dinâmico, mais abaixo.
import { plugin } from 'bun';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
plugin({
  name: 'png-as-dataurl',
  setup(build) {
    build.onLoad({ filter: /\.png$/ }, (args) => ({
      exports: { default: `data:image/png;base64,${readFileSync(args.path).toString('base64')}` },
      loader: 'object',
    }));
  },
});

import { join } from 'node:path';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type {
  Processo, Projeto, Documento, Sistema, Responsavel, Gargalo, Melhoria, AcaoTd,
} from '@/types';
import { buildEtapasComFicou, type EtapaDbRow } from '@/utils/etapaHydrate';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { buildSopMarkdown } from '@/utils/pdf/sopMarkdown';
import { buildSopComparativoMarkdown } from '@/utils/pdf/sopComparativoMarkdown';
import { buildProcessDiagram } from '@/utils/processDiagram';
import { calcularRoi } from '@/utils/roiCalculator';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import { gargalosDoProcesso } from '@/utils/gargaloMelhorias';
import { slugFilename } from '@/utils/slugify';

// Componentes PDF — import dinâmico para o plugin de .png já estar ativo.
const { SopDocument } = await import('@/utils/pdf/SopDocument');
const { SopComparativoDocument } = await import('@/utils/pdf/SopComparativoDocument');

// Aceita SUPABASE_URL com ou sem /rest/v1 (o .env do repo define só o host,
// e o bun auto-carrega o .env — sem isto o script monta .../processes e dá 404).
const RAW_BASE = process.env.SUPABASE_URL || 'https://zwoainzzqhudmmknuycq.supabase.co';
const BASE = /\/rest\/v\d+$/.test(RAW_BASE) ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/rest/v1`;
const JWT = process.env.JWT;
const ANON = process.env.ANON;

if (!JWT || !ANON) {
  console.error('Faltam credenciais: defina JWT e ANON no ambiente.');
  process.exit(1);
}

function parseArgs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? '';
  }
  return out;
}
const args = parseArgs();
const OUT = args.out || '_sops_export';
const NO_PDF = 'no-pdf' in args;

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

/** Renderiza um documento react-pdf em Buffer (headless). */
async function renderPdf(element: React.ReactElement): Promise<Uint8Array> {
  return renderToBuffer(element);
}

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
  let pdfCount = 0;
  for (const processo of procsRaw) {
    const etapas = allEtapas.filter(e => e.process_id === processo.id);
    const projeto = projetos.find(p => p.id === processo.project_id) || null;
    const projSlug = slugFilename(projeto?.name || 'sem-projeto', processo.project_id || 'sem-projeto');
    const procSlug = slugFilename(processo.name, processo.id);
    const procDir = join(OUT, projSlug, procSlug);
    const temFicou = etapas.some(e => e.ficou);

    const common = { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto };

    // ── como-era ── SOP As-Is (md + pdf) + Diagrama As-Is (.mmd)
    const dirEra = join(procDir, 'como-era');
    mkdirSync(dirEra, { recursive: true });
    writeFileSync(join(dirEra, 'SOP_as-is.md'), buildSopMarkdown({ ...common, mode: 'era' }), 'utf-8');
    writeFileSync(join(dirEra, 'Diagrama.mmd'), buildProcessDiagram({ ...common, mode: 'era' }), 'utf-8');
    if (!NO_PDF) {
      writeFileSync(join(dirEra, 'SOP_as-is.pdf'), await renderPdf(createElement(SopDocument, { ...common, mode: 'era' })));
      pdfCount++;
    }

    // ── como-ficou + comparativo ── só quando há cenário projetado
    if (temFicou) {
      const dirFicou = join(procDir, 'como-ficou');
      mkdirSync(dirFicou, { recursive: true });
      writeFileSync(join(dirFicou, 'SOP_to-be.md'), buildSopMarkdown({ ...common, mode: 'ficou' }), 'utf-8');
      writeFileSync(join(dirFicou, 'Diagrama.mmd'), buildProcessDiagram({ ...common, mode: 'ficou' }), 'utf-8');
      if (!NO_PDF) {
        writeFileSync(join(dirFicou, 'SOP_to-be.pdf'), await renderPdf(createElement(SopDocument, { ...common, mode: 'ficou' })));
        pdfCount++;
      }

      // Comparativo — roi/diagnostico computados como na MapearProcessoPage.
      const roi = calcularRoi({ processos: [processo], etapas, responsaveis, sistemas, gargalos, melhorias, projetos });
      const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
      const compInput = {
        processo, etapas, sistemas, responsaveis,
        gargalos: gargalosDoProcesso(gargalos, processo.id),
        melhorias, projeto, roi, diagnostico, horizonteMeses: 24,
      };
      const dirComp = join(procDir, 'comparativo');
      mkdirSync(dirComp, { recursive: true });
      writeFileSync(join(dirComp, 'SOP_comparativo.md'), buildSopComparativoMarkdown(compInput), 'utf-8');
      if (!NO_PDF) {
        writeFileSync(join(dirComp, 'SOP_comparativo.pdf'), await renderPdf(createElement(SopComparativoDocument, compInput)));
        pdfCount++;
      }
    }

    count++;
    console.log(`✓ ${projSlug}/${procSlug} (${etapas.length} etapas${temFicou ? ', +to-be +comparativo' : ''})`);
  }
  console.log(`\nPronto: ${count} processo(s) exportado(s) em ${OUT}/`);
  console.log(NO_PDF ? 'PDFs pulados (--no-pdf): apenas .md e .mmd.' : `PDFs gerados: ${pdfCount}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
