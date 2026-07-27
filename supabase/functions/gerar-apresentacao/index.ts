// Edge Function: gerar-apresentacao (v2 — Patrimonial + Organograma + Quadro)
//
// Auth: JWT + role team_member+ + isolamento por cluster (intersecao entre
//   resolve_user_cluster_ids(auth.uid()) e cliente_clusters).
// Templates: bucket privado `osg-templates` (TEMPLATE_PATRIMONIAL.pptx / TEMPLATE_SOCIETARIA.pptx).
// Saida: bucket privado `osg-apresentacoes`, path estavel `<cliente>/<tipo>.pptx`
//   com upsert=true (nao acumular versoes fisicas). Signed URL 10min.
// Persistencia: `documento_gerado` (versionado; select+update-else-insert por
//   cliente+template) e `documento_arquivo` (idem, apontando pro mesmo path).
//
// Contrato:
//   POST { clienteId: string, tipo: 'ambas' | 'patrimonial' | 'societaria' }
//   → { arquivos: [{ tipo, nome, url }], erros?: [...] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
import { unpackPptx, packPptx, readText, writeText, listPaths, type PptxParts } from "../_shared/ooxml/zip.ts";
import { parseXml, serializeXml, qsa } from "../_shared/ooxml/xml.ts";
import { applyTokensToSlideXml, applyTokensToNode, stripRemainingTokens, type Tokens } from "../_shared/ooxml/runs.ts";
import { stripTiming } from "../_shared/ooxml/timing.ts";
import { validatePptx } from "../_shared/ooxml/validate.ts";
import { duplicateSlide, removeSlide } from "../_shared/ooxml/slide.ts";
import {
  listShapes, getShapeXfrm, setShapeXfrm, shapeContainsToken,
  cloneShapeWithId, removeShape,
} from "../_shared/ooxml/shapes.ts";
import {
  listGraphicFrames, graphicFrameContainsToken, getGraphicFrameBox, setGraphicFrameBox,
  cloneGraphicFrameWithId, listRows, rowContainsToken, cloneRow, removeRow, insertRowBefore,
} from "../_shared/ooxml/table.ts";
import { nextCNvPrId } from "../_shared/ooxml/ids.ts";
import {
  carregarPatrimonial, carregarOrganograma, carregarQuadro, resolverTitular,
  fmtBRL, fmtInt, fmtPct,
  type SociedadePatrimonial, type OrganogramaBands, type QuadroEmpresa,
} from "./data.ts";

type DeckTipo = "patrimonial" | "societaria";
type BodyTipo = DeckTipo | "ambas";

const TEMPLATE_PATHS: Record<DeckTipo, string> = {
  patrimonial: "TEMPLATE_PATRIMONIAL.pptx",
  societaria: "TEMPLATE_SOCIETARIA.pptx",
};
const TEMPLATE_IDS: Record<DeckTipo, string> = {
  patrimonial: "a11a11a1-0000-4000-8000-000000000001",
  societaria: "a11a11a1-0000-4000-8000-000000000002",
};

const BUCKET_TEMPLATES = "osg-templates";
const BUCKET_OUTPUT = "osg-apresentacoes";
const SIGNED_URL_TTL = 600;
const GENERATOR_VERSION = "0.2.0";

// Slide widescreen (16:9) — dimensoes usadas pra distribuicao horizontal e paginacao.
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;

// ============================================================================
// helpers gerais
// ============================================================================

function slugify(s: string): string {
  return (s || "cliente")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "cliente";
}
function dataBR(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ============================================================================
// PATRIMONIAL — 1 slide por sociedade, linhas clonadas por matricula
// ============================================================================

// Template patrimonial:
//   slide1 = capa {{DATA}} {{CLIENTE}}
//   slide2 = divisor
//   slide3 = template repetivel: {{SOCIEDADE}} + tabela com row-template {{PROP}} {{REF}} {{MAT}} {{MUN}} {{VALOR}}
//
// Estrategia: pra cada sociedade em `sociedades[]`, duplicar slide3 → aplicar
// tokens da sociedade + clonar rows. No fim, remover o slide3 original.
function renderPatrimonialSlide(
  parts: PptxParts,
  slidePath: string,
  soc: SociedadePatrimonial,
): void {
  const xml0 = readText(parts, slidePath);
  const doc = parseXml(xml0);

  // 1) Clonar rows para cada linha, ANTES de aplicar tokens no slide inteiro.
  const gfs = listGraphicFrames(doc);
  const gf = gfs.find((g) => graphicFrameContainsToken(g, "PROP"));
  if (gf) {
    const rows = listRows(gf);
    const template = rows.find((r) => rowContainsToken(r, "PROP"));
    if (template) {
      for (const linha of soc.linhas) {
        const clone = cloneRow(template);
        applyTokensToNode(clone, {
          PROP: linha.propriedade,
          REF: linha.referencia,
          MAT: linha.matriculaLabel,
          MUN: linha.municipioUf,
          VALOR: linha.valor,
        });
        insertRowBefore(clone, template);
      }
      removeRow(template);
    }
  }

  // 2) Aplicar {{SOCIEDADE}} (e demais globais) no slide inteiro.
  applyTokensToNode(doc, { SOCIEDADE: soc.nome } as Tokens);
  stripRemainingTokens(doc);
  writeText(parts, slidePath, serializeXml(doc));
}

async function gerarPatrimonial(
  admin: ReturnType<typeof createClient>,
  clienteId: string,
  clienteNome: string,
): Promise<{ bytes: Uint8Array; contagens: Record<string, number> }> {
  const dl = await admin.storage.from(BUCKET_TEMPLATES).download(TEMPLATE_PATHS.patrimonial);
  if (dl.error || !dl.data) throw new Error(`Template ausente: ${TEMPLATE_PATHS.patrimonial}`);
  const parts = unpackPptx(new Uint8Array(await dl.data.arrayBuffer()));

  const sociedades = await carregarPatrimonial(admin, clienteId);

  const TEMPLATE = "ppt/slides/slide3.xml";
  if (sociedades.length === 0) {
    // Sem sociedades: mantem slide3 vazio, tira row-template pra nao ficar com token cru.
    const xml = readText(parts, TEMPLATE);
    const doc = parseXml(xml);
    const gf = listGraphicFrames(doc).find((g) => graphicFrameContainsToken(g, "PROP"));
    if (gf) {
      const tr = listRows(gf).find((r) => rowContainsToken(r, "PROP"));
      if (tr) removeRow(tr);
    }
    applyTokensToNode(doc, { SOCIEDADE: "—" } as Tokens);
    stripRemainingTokens(doc);
    writeText(parts, TEMPLATE, serializeXml(doc));
  } else {
    // Paginacao: cada sociedade quebrada em chunks de LINHAS_POR_SLIDE.
    // 1o chunk da 1a sociedade usa slide3; demais chunks/sociedades duplicam slide3 original.
    const LINHAS_POR_SLIDE = 8;
    type Chunk = { nome: string; linhas: SociedadePatrimonial["linhas"] };
    const chunks: Chunk[] = [];
    for (const s of sociedades) {
      if (s.linhas.length === 0) { chunks.push({ nome: s.nome, linhas: [] }); continue; }
      for (let i = 0; i < s.linhas.length; i += LINHAS_POR_SLIDE) {
        chunks.push({ nome: s.nome, linhas: s.linhas.slice(i, i + LINHAS_POR_SLIDE) });
      }
    }
    const paths = [TEMPLATE];
    for (let i = 1; i < chunks.length; i++) {
      const dup = duplicateSlide(parts, TEMPLATE);
      paths.push(dup.newPath);
    }
    for (let i = 0; i < chunks.length; i++) {
      renderPatrimonialSlide(parts, paths[i], { nome: chunks[i].nome, linhas: chunks[i].linhas });
    }
  }

  // Capa + divisor: aplicar globais
  const globais: Tokens = { CLIENTE: clienteNome, DATA: dataBR() };
  for (const sp of listPaths(parts, "ppt/slides/slide", ".xml")) {
    const xml = readText(parts, sp);
    let out = applyTokensToSlideXml(xml, globais);
    out = stripTiming(out);
    writeText(parts, sp, out);
  }

  const issues = validatePptx(parts);
  if (issues.length > 0) throw new Error(`PPTX inválido: ${JSON.stringify(issues).slice(0, 500)}`);
  return { bytes: packPptx(parts), contagens: { sociedades: sociedades.length } };
}

// ============================================================================
// ORGANOGRAMA (slide3 da societaria) — 4 faixas horizontais de {{ORG_ITEM}}
// ============================================================================

// Faixas Y (EMU) descobertas via debug-tpl no TEMPLATE_SOCIETARIA.pptx slide3:
//   Socios      ≈ 1086890..1101800
//   Controladoras ≈ 1775366..1784807
//   Controladas ≈ 2539632..2558070
//   Rural       ≈ 3149657
// Tolerancia de ±200000 EMU (~0.22") pra agrupar shapes com pequeno desvio.
type Band = "socios" | "controladoras" | "controladas" | "rural";
const BAND_Y: Record<Band, number> = {
  socios: 1090000,
  controladoras: 1780000,
  controladas: 2550000,
  rural: 3150000,
};
const BAND_TOL = 250000;

function bandOf(y: number): Band | null {
  for (const [k, ref] of Object.entries(BAND_Y) as [Band, number][]) {
    if (Math.abs(y - ref) <= BAND_TOL) return k;
  }
  return null;
}

// Faixa horizontal FIXA das 4 bandas do organograma (nao derivar do template).
// LMIN = borda direita dos rotulos "Socios/Controladoras/..." + margem = 1.40"
// RMAX = 12.90". Largura util = 11.5" ≈ 10515600 EMU.
const ORG_LMIN = 1280160;   // 1.40" em EMU
const ORG_RMAX = 11795760;  // 12.90" em EMU
const ORG_GAP = 91440;      // 0.10" em EMU
const ORG_CX_MIN = 500000;  // 0.55" — abaixo disso, colapsa em "+K"

/** Insere <a:normAutofit/> em cada <a:bodyPr> do shape (shrink-to-fit). */
function ensureNormAutofit(sp: Element): void {
  const bodies = qsa(sp, "a:bodyPr");
  for (const bp of bodies) {
    bp.setAttribute("wrap", "square");
    // Se ja tem qq autofit, remove
    for (const tag of ["a:normAutofit", "a:spAutoFit", "a:noAutofit"]) {
      for (const el of qsa(bp, tag)) bp.removeChild(el);
    }
    const doc = bp.ownerDocument!;
    const auto = doc.createElementNS("http://schemas.openxmlformats.org/drawingml/2006/main", "a:normAutofit");
    bp.appendChild(auto);
  }
}

function distribuirShapes(
  spTree: Element,
  templateShape: Element,
  idCounter: { next: number },
  itens: string[],
  y: number,
  cy: number,
): void {
  const xfrm = getShapeXfrm(templateShape);
  if (!xfrm) return;
  const n = itens.length;
  if (n === 0) return;
  const usable = ORG_RMAX - ORG_LMIN;
  let cx = (usable - ORG_GAP * (n - 1)) / n;
  let labels = itens;
  // N extremo: substitui a ultima caixa por marcador "+K".
  if (cx < ORG_CX_MIN && n > 1) {
    let nn = n;
    while (nn > 1 && cx < ORG_CX_MIN) {
      nn--;
      cx = (usable - ORG_GAP * (nn - 1)) / nn;
    }
    const k = n - (nn - 1);
    labels = itens.slice(0, nn - 1).concat([`+${k}`]);
  }
  const nFinal = labels.length;
  cx = (usable - ORG_GAP * (nFinal - 1)) / nFinal;

  for (let i = 0; i < nFinal; i++) {
    const clone = cloneShapeWithId(templateShape, idCounter.next++);
    setShapeXfrm(clone, { x: ORG_LMIN + i * (cx + ORG_GAP), y, cx, cy });
    ensureNormAutofit(clone);
    applyTokensToNode(clone, { ORG_ITEM: labels[i] });
    spTree.appendChild(clone);
  }
}

function renderOrganograma(parts: PptxParts, slidePath: string, bands: OrganogramaBands, titular: string): void {
  const xml0 = readText(parts, slidePath);
  const doc = parseXml(xml0);
  const spTree = qsa(doc, "p:spTree")[0];
  if (!spTree) return;

  // Contador monotonico de cNvPr@id: seed pelo maior id existente ANTES de
  // remover as caixas-modelo (que tem ids altos), + buffer folgado.
  const idCounter = { next: nextCNvPrId(xml0) + 100 };

  // Coleta shapes template por banda, deduplicando (varios shapes por banda no template).
  const templates: Partial<Record<Band, Element>> = {};
  const templateY: Partial<Record<Band, number>> = {};
  const templateCy: Partial<Record<Band, number>> = {};
  const toRemove: Element[] = [];

  for (const sp of listShapes(doc)) {
    if (!shapeContainsToken(sp, "ORG_ITEM")) continue;
    const xfrm = getShapeXfrm(sp);
    if (!xfrm) continue;
    const band = bandOf(xfrm.y);
    if (!band) { toRemove.push(sp); continue; }
    if (!templates[band]) {
      templates[band] = sp;
      templateY[band] = xfrm.y;
      templateCy[band] = xfrm.cy;
    }
    toRemove.push(sp);
  }
  for (const el of toRemove) removeShape(el);

  for (const band of Object.keys(templates) as Band[]) {
    const tpl = templates[band]!;
    const itens = bands[band];
    if (itens.length === 0) continue;
    distribuirShapes(spTree, tpl, idCounter, itens, templateY[band]!, templateCy[band]!);
  }

  applyTokensToNode(doc, { TITULAR: titular || "—" });
  stripRemainingTokens(doc);
  writeText(parts, slidePath, serializeXml(doc));
}

// ============================================================================
// QUADRO SOCIETARIO (slide4 da societaria) — 1 tabela por empresa
// ============================================================================

// Layout: 2 colunas × N linhas por slide. Ao esgotar altura, duplicar slide.
// Constantes em EMU (1" = 914400).
const QUADRO_COL_W = 5212080;   // 5.7"
const QUADRO_GAP_H = 274320;    // 0.3"
const QUADRO_LEFT_0 = 548640;   // 0.6"
const QUADRO_LEFT_1 = QUADRO_LEFT_0 + QUADRO_COL_W + QUADRO_GAP_H;
const QUADRO_LEFT_CENTER = 2971800; // 3.25" (1 empresa)
const QUADRO_TOP_0 = 1417320;   // 1.55"
const QUADRO_TOP_MAX = 6492240; // 7.1"
const QUADRO_ROW_H = 237744;    // 0.26"
const QUADRO_PAD_H = 320040;    // 0.35"

function estimarAltura(rowCount: number): number {
  // header empresa + header colunas + linhas + TOTAL + padding
  return (3 + rowCount) * QUADRO_ROW_H + QUADRO_PAD_H;
}

/**
 * Localiza a row TOTAL (unica remanescente com celulas de dados apos remover template SOCIO).
 * Preenche os textos sobrescrevendo textContent do 1o <a:t> de cada <a:tc> a partir da col 1.
 */
function preencherTotal(gf: Element, totalQuotas: number, totalValor: number): void {
  const rows = listRows(gf);
  // Ultima row = TOTAL no template.
  const totalRow = rows[rows.length - 1];
  if (!totalRow) return;
  const cells: Element[] = [];
  const ch = totalRow.childNodes;
  for (let i = 0; i < ch.length; i++) {
    const n = ch.item(i) as Element;
    if (n && n.nodeType === 1 && (n.tagName === "a:tc" || n.nodeName === "a:tc")) cells.push(n);
  }
  const vals = ["", fmtInt(totalQuotas), fmtBRL(totalValor), "100,00%"];
  for (let i = 1; i < cells.length && i < vals.length; i++) {
    const t = qsa(cells[i], "a:t")[0];
    if (t) t.textContent = vals[i];
  }
}

function renderQuadroTable(
  spTree: Element,
  templateGf: Element,
  idCounter: { next: number },
  empresa: QuadroEmpresa,
  x: number,
  y: number,
): void {
  const clone = cloneGraphicFrameWithId(templateGf, idCounter.next++);
  // Substituir rows: encontrar row com {{SOCIO}}, clonar por linha.
  const rows = listRows(clone);
  const template = rows.find((r) => rowContainsToken(r, "SOCIO"));
  if (template) {
    for (const l of empresa.linhas) {
      const rClone = cloneRow(template);
      applyTokensToNode(rClone, {
        SOCIO: l.socio,
        QUOTAS: fmtInt(l.quotas),
        VALOR: fmtBRL(l.valor),
        PCT: fmtPct(l.pct),
      });
      insertRowBefore(rClone, template);
    }
    removeRow(template);
  }
  applyTokensToNode(clone, { EMPRESA: empresa.empresa });
  preencherTotal(clone, empresa.totalQuotas, empresa.totalValor);

  const cy = estimarAltura(empresa.linhas.length);
  setGraphicFrameBox(clone, { x, y, cx: QUADRO_COL_W, cy });
  spTree.appendChild(clone);
}

function renderQuadroSlide(parts: PptxParts, slidePath: string, empresas: QuadroEmpresa[]): QuadroEmpresa[] {
  const xml0 = readText(parts, slidePath);
  const doc = parseXml(xml0);
  const spTree = qsa(doc, "p:spTree")[0];
  const gf = listGraphicFrames(doc).find((g) => graphicFrameContainsToken(g, "EMPRESA"));
  if (!spTree || !gf) {
    writeText(parts, slidePath, serializeXml(doc));
    return empresas;
  }

  const idCounter = { next: nextCNvPrId(xml0) + 100 };

  // Pula empresas sem socios.
  const validas = empresas.filter((e) => e.linhas.length > 0);
  const restantes: QuadroEmpresa[] = [];

  if (validas.length === 1) {
    // Centralizar tabela unica.
    renderQuadroTable(spTree, gf, idCounter, validas[0], QUADRO_LEFT_CENTER, QUADRO_TOP_0);
  } else {
    const tops = [QUADRO_TOP_0, QUADRO_TOP_0];
    const lefts = [QUADRO_LEFT_0, QUADRO_LEFT_1];
    for (let i = 0; i < validas.length; i++) {
      const col = i % 2;
      const emp = validas[i];
      const h = estimarAltura(emp.linhas.length);
      if (tops[col] + h > QUADRO_TOP_MAX) {
        // Nao coube — adia esta e todas as demais.
        restantes.push(...validas.slice(i));
        break;
      }
      renderQuadroTable(spTree, gf, idCounter, emp, lefts[col], tops[col]);
      tops[col] += h;
    }
  }

  gf.parentNode?.removeChild(gf);
  stripRemainingTokens(doc);
  writeText(parts, slidePath, serializeXml(doc));
  return restantes;
}

// ============================================================================
// SOCIETARIA — orquestracao
// ============================================================================

async function gerarSocietaria(
  admin: ReturnType<typeof createClient>,
  clienteId: string,
  clienteNome: string,
): Promise<{ bytes: Uint8Array; contagens: Record<string, number> }> {
  const dl = await admin.storage.from(BUCKET_TEMPLATES).download(TEMPLATE_PATHS.societaria);
  if (dl.error || !dl.data) throw new Error(`Template ausente: ${TEMPLATE_PATHS.societaria}`);
  const parts = unpackPptx(new Uint8Array(await dl.data.arrayBuffer()));

  const [bands, empresas, titular] = await Promise.all([
    carregarOrganograma(admin, clienteId),
    carregarQuadro(admin, clienteId),
    resolverTitular(admin, clienteId),
  ]);

  // Organograma (slide3)
  renderOrganograma(parts, "ppt/slides/slide3.xml", bands, titular);

  // Quadro (slide4 + duplicatas)
  const SLIDE_QUADRO = "ppt/slides/slide4.xml";
  if (empresas.length === 0) {
    removeSlide(parts, SLIDE_QUADRO);
  } else {
    let restantes = renderQuadroSlide(parts, SLIDE_QUADRO, empresas);
    // Se sobrou, duplica slide4 (do template original — mas ja foi mutado).
    // Para simplificar: duplicamos slide4.xml antes de mutar. Como ja mutamos,
    // usamos o proprio conteudo original: guardado na variavel below.
    let guardBail = 0;
    while (restantes.length > 0 && guardBail < 20) {
      // Re-download template pra ter graphicFrame limpo com placeholders.
      const dl2 = await admin.storage.from(BUCKET_TEMPLATES).download(TEMPLATE_PATHS.societaria);
      const p2 = unpackPptx(new Uint8Array(await dl2.data!.arrayBuffer()));
      const freshXml = readText(p2, SLIDE_QUADRO);
      // Duplica um novo slide e sobrescreve com XML fresco
      const dup = duplicateSlide(parts, SLIDE_QUADRO);
      writeText(parts, dup.newPath, freshXml);
      restantes = renderQuadroSlide(parts, dup.newPath, restantes);
      guardBail++;
    }
  }

  // Capa + globais
  const globais: Tokens = { CLIENTE: clienteNome, DATA: dataBR() };
  for (const sp of listPaths(parts, "ppt/slides/slide", ".xml")) {
    const xml = readText(parts, sp);
    let out = applyTokensToSlideXml(xml, globais);
    out = stripTiming(out);
    writeText(parts, sp, out);
  }

  const issues = validatePptx(parts);
  if (issues.length > 0) throw new Error(`PPTX inválido: ${JSON.stringify(issues).slice(0, 500)}`);
  return { bytes: packPptx(parts), contagens: { empresas: empresas.length } };
}

// ============================================================================
// Persistencia
// ============================================================================

async function upsertDocumentoGerado(
  admin: ReturnType<typeof createClient>,
  args: {
    clienteId: string; tipo: DeckTipo; caminho: string;
    contagens: Record<string, number>; userId: string;
  },
) {
  // Select-then-update-else-insert: preserva id e evita duplicatas por (cliente, template).
  const { data: existente } = await admin
    .from("documento_gerado")
    .select("id, documento_raiz_id")
    .eq("cliente_id", args.clienteId)
    .eq("documento_template_id", TEMPLATE_IDS[args.tipo])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    cliente_id: args.clienteId,
    documento_template_id: TEMPLATE_IDS[args.tipo],
    caminho_arquivo: `${BUCKET_OUTPUT}/${args.caminho}`,
    snapshot_dados: {
      tipo: args.tipo, contagens: args.contagens,
      versao_gerador: GENERATOR_VERSION, template: TEMPLATE_PATHS[args.tipo],
    },
    snapshot_flags: {},
    snapshot_versoes_blocos: {},
    status: "rascunho",
    gerado_por_id: args.userId,
    gerado_em: new Date().toISOString(),
  };

  if (existente?.id) {
    const { data: upd, error } = await admin
      .from("documento_gerado").update(payload).eq("id", existente.id).select("id").single();
    if (error) throw new Error(`documento_gerado.update: ${error.message}`);
    return upd.id as string;
  }
  const { data: ins, error } = await admin
    .from("documento_gerado").insert(payload).select("id").single();
  if (error) throw new Error(`documento_gerado.insert: ${error.message}`);
  return ins.id as string;
}

async function upsertDocumentoArquivo(
  admin: ReturnType<typeof createClient>,
  args: {
    clienteId: string; tipo: DeckTipo; documentoGeradoId: string;
    caminho: string; nomeArquivo: string; tamanho: number;
  },
) {
  const categoria = args.tipo === "patrimonial" ? "bens_direitos" : "societarios";
  const payload = {
    cliente_id: args.clienteId,
    fonte: "psa" as const,
    area: "osg" as const,
    categoria,
    documento_gerado_id: args.documentoGeradoId,
    nome_original: args.nomeArquivo,
    gcs_uri: `${BUCKET_OUTPUT}/${args.caminho}`,
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    tamanho: args.tamanho,
    status: "ativo" as const,
  };

  const { data: existente } = await admin
    .from("documento_arquivo")
    .select("id")
    .eq("documento_gerado_id", args.documentoGeradoId)
    .eq("excluido", false)
    .limit(1)
    .maybeSingle();

  if (existente?.id) {
    const { error } = await admin.from("documento_arquivo").update(payload).eq("id", existente.id);
    if (error) throw new Error(`documento_arquivo.update: ${error.message}`);
    return;
  }
  const { error } = await admin.from("documento_arquivo").insert(payload);
  if (error) throw new Error(`documento_arquivo.insert: ${error.message}`);
}

// ============================================================================
// serve
// ============================================================================

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const cors = buildCorsHeaders(req);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isInternal =
      roles.has("admin") || roles.has("lider") || roles.has("sublider") || roles.has("team_member");
    if (!isInternal) return json({ error: "Forbidden: requires team_member+" }, 403);

    const body = await req.json().catch(() => ({}));
    const clienteId = String(body?.clienteId ?? "");
    const tipoIn = String(body?.tipo ?? "") as BodyTipo;
    if (!clienteId || !["ambas", "patrimonial", "societaria"].includes(tipoIn)) {
      return json({ error: "clienteId e tipo obrigatorios (tipo ∈ ambas|patrimonial|societaria)" }, 400);
    }

    // Cluster isolation
    const isAdmin = roles.has("admin");
    if (!isAdmin) {
      const [{ data: userClusters }, { data: cliClusters }] = await Promise.all([
        admin.rpc("resolve_user_cluster_ids", { _uid: userId }),
        admin.from("cliente_clusters").select("cluster_id").eq("cliente_id", clienteId),
      ]);
      const userSet = new Set<string>(((userClusters ?? []) as any[]).map(String));
      const inter = ((cliClusters ?? []) as any[]).some((r) => userSet.has(String(r.cluster_id)));
      if (!inter) return json({ error: "Forbidden: cliente fora dos seus clusters" }, 403);
    }

    const { data: cli, error: cliErr } = await admin
      .from("cliente").select("id, nome, excluido").eq("id", clienteId).maybeSingle();
    if (cliErr || !cli || cli.excluido) return json({ error: "Cliente não encontrado" }, 404);

    const decks: DeckTipo[] = tipoIn === "ambas" ? ["patrimonial", "societaria"] : [tipoIn];
    const arquivos: Array<{ tipo: DeckTipo; nome: string; url: string }> = [];
    const erros: Array<{ tipo: DeckTipo; message: string }> = [];

    for (const tipo of decks) {
      try {
        const { bytes, contagens } = tipo === "patrimonial"
          ? await gerarPatrimonial(admin, clienteId, cli.nome)
          : await gerarSocietaria(admin, clienteId, cli.nome);

        const clienteSlug = slugify(cli.nome);
        const tipoLabel = tipo === "patrimonial" ? "Patrimonial" : "Societaria";
        const nomeArquivo = `PSA_${tipoLabel}_${clienteSlug}.pptx`;
        // Path ESTAVEL — upsert=true evita acumular versoes fisicas no storage.
        const caminho = `${clienteId}/${tipo}.pptx`;

        const up = await admin.storage.from(BUCKET_OUTPUT).upload(caminho, bytes, {
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          upsert: true,
        });
        if (up.error) throw new Error(`upload: ${up.error.message}`);

        const documentoGeradoId = await upsertDocumentoGerado(admin, {
          clienteId, tipo, caminho, contagens, userId,
        });
        await upsertDocumentoArquivo(admin, {
          clienteId, tipo, documentoGeradoId, caminho, nomeArquivo, tamanho: bytes.byteLength,
        });

        const { data: signed, error: sErr } = await admin.storage
          .from(BUCKET_OUTPUT).createSignedUrl(caminho, SIGNED_URL_TTL);
        if (sErr || !signed?.signedUrl) throw new Error(`signedUrl: ${sErr?.message ?? "vazio"}`);
        arquivos.push({ tipo, nome: nomeArquivo, url: signed.signedUrl });
      } catch (e: any) {
        erros.push({ tipo, message: String(e?.message ?? e) });
      }
    }

    if (arquivos.length === 0) return json({ error: "Falha ao gerar", detalhes: erros }, 500);
    return json({ arquivos, erros: erros.length ? erros : undefined });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
