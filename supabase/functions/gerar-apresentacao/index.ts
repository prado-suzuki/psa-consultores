// Edge Function: gerar-apresentacao (v2 — Patrimonial + Organograma + Quadro)
//
// Auth: JWT + role team_member+ + isolamento por cluster (intersecao entre
//   resolve_user_cluster_ids(auth.uid()) e cliente_clusters).
// Templates: bucket privado `osg-templates` (TEMPLATE_PATRIMONIAL.pptx / TEMPLATE_SOCIETARIA.pptx).
//
// Saida: PERSISTE, desde 21/09/2026. Cada deck vira um arquivo em
//   `osg-apresentacoes` e uma linha em `osg_apresentacao`, com versao, checksum do
//   arquivo, checksum do molde, versao do gerador, os problemas congelados e o
//   SNAPSHOT do conteudo. O front recebe URL assinada, nao mais bytes em base64.
//
//   Antes disto a geracao nao deixava rastro: baixava e pronto. Nao havia como
//   dizer o que foi entregue a um cliente, nem quando, nem de qual molde — e
//   regerar depois dava outro arquivo, porque o cadastro anda.
//
//   Continua NAO mexendo em `documento_gerado`/`documento_arquivo`: aquelas tem
//   `checklist_item_id` e `triado_em`, e a apresentacao apareceria no checklist do
//   cliente como documento que ele deve entregar. A fronteira e antiga e vale.
//
// A sequencia de gravar (validar → versionar → subir → registrar → assinar) NAO
//   mora aqui: e a casca `_shared/apresentacao/registrar.ts`, compartilhada com o
//   `gerar-slides-tributarios`. O que e da OSG entra por parametro — a ancora
//   `cliente_id` + `tipo`, o bucket, o nome do arquivo e o snapshot.
//
// Contrato:
//   POST { clienteId: string, tipo: 'ambas' | 'patrimonial' | 'societaria' }
//   → { arquivos: [{ tipo, nome, url, apresentacaoId, versao }],
//       erros?: [...], problemas?: [...] }
//
// `erros` e `problemas` NAO sao a mesma coisa:
//   erros    — excecao num deck (template ausente, PPTX invalido, erro de query).
//              Custa o arquivo inteiro; aquele deck nao vem.
//   problemas — buraco de cadastro. O .pptx SAI, e sai faltando coisa: empresa fora
//              do quadro, bem sem sociedade de destino, titular em placeholder.
//              Ate 09/2026 isso ia calado, e quem apresentava descobria na reuniao.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { falhou, registrarApresentacao } from "../_shared/apresentacao/registrar.ts";
import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
import { unpackPptx, packPptx, readText, writeText, listPaths, type PptxParts } from "../_shared/ooxml/zip.ts";
import { parseXml, serializeXml, qsa } from "../_shared/ooxml/xml.ts";
import { applyTokensToSlideXml, applyTokensToNode, stripRemainingTokens, type Tokens } from "../_shared/ooxml/runs.ts";
import { stripTiming } from "../_shared/ooxml/timing.ts";
import { validatePptx } from "../_shared/ooxml/validate.ts";
import { duplicateSlide, removeSlide, slideDoToken } from "../_shared/ooxml/slide.ts";
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
  type ProblemaDoDeck,
} from "./data.ts";
import { anota, ONDE } from "../_shared/apresentacao-osg/regras.ts";
/* A aritmetica da paginacao mora em `_shared` porque la ela tem teste: e a conta
   que fazia o deck perder socio, e este arquivo o vitest nao alcanca. */
import {
  cabemQuantasLinhas, estimarAltura, repartirLinhas,
  QUADRO_PAD_H, QUADRO_ROW_H, QUADRO_TOP_0, QUADRO_TOP_MAX,
} from "../_shared/apresentacao-osg/paginacao.ts";

type DeckTipo = "patrimonial" | "societaria";

/**
 * O que um gerador devolve: os bytes, as contagens e o SNAPSHOT.
 *
 * O snapshot e o modelo de conteudo que virou aquele .pptx — o retorno das
 * funcoes puras do `conteudo.ts`, que ja e JSON e ja tem gabarito. Vai para
 * `osg_apresentacao.snapshot_dados` porque a ancora desta tabela e o CLIENTE, e o
 * cadastro anda: sem gravar o que o deck afirmou, um mes depois ninguem sabe.
 *
 * Nao e dump de tabela. Linha crua teria de ser reinterpretada para dizer algo; o
 * modelo montado JA e a resposta — quais sociedades, quais linhas do quadro, quais
 * faixas do organograma, quem era o titular.
 */
interface DeckMontado {
  bytes: Uint8Array;
  contagens: Record<string, number>;
  snapshot: Record<string, unknown>;
}

const TEMPLATE_PATHS: Record<DeckTipo, string> = {
  patrimonial: "TEMPLATE_PATRIMONIAL.pptx",
  societaria: "TEMPLATE_SOCIETARIA.pptx",
};

/* O nome que entra no arquivo gravado: `PSA_<rotulo>_<cliente>_v<n>.pptx`. */
const ROTULO_DO_ARQUIVO: Record<DeckTipo, string> = {
  patrimonial: "Patrimonial",
  societaria: "Societaria",
};

const TIPOS = Object.keys(TEMPLATE_PATHS) as DeckTipo[];
const ehTipo = (t: unknown): t is DeckTipo => typeof t === "string" && (TIPOS as string[]).includes(t);

/**
 * Os decks pedidos: `tipos` (a lista marcada) ou `tipo` do contrato antigo, em que `ambas` e so
 * patrimonial e societaria.
 */
function decksPedidos(body: { tipo?: unknown; tipos?: unknown }): DeckTipo[] | null {
  if (Array.isArray(body?.tipos)) {
    const unicos = [...new Set(body.tipos)];
    return unicos.length > 0 && unicos.every(ehTipo) ? unicos : null;
  }
  if (body?.tipo === "ambas") return ["patrimonial", "societaria"];
  return ehTipo(body?.tipo) ? [body.tipo] : null;
}

const BUCKET_TEMPLATES = "osg-templates";
/* Provisionado em 14/08/2026 e vazio ate agora: a geracao nao persistia nada. */
const BUCKET_SAIDA = "osg-apresentacoes";
/* Muda quando a forma de montar o slide muda, e fica gravado na apresentacao. */
const VERSAO_DO_GERADOR = "1.0";

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

// Molde patrimonial: as paginas se acham pelo token (`slideDoToken`); a de sociedade se duplica por
// sociedade e clona uma linha por matricula.
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

/** Como o `slideDoToken`, mas a pagina e obrigatoria: molde sem ela nao gera. */
function slideObrigatorio(parts: PptxParts, token: string, pagina: string): string {
  const sp = slideDoToken(parts, token);
  if (!sp) throw new Error(`O modelo em uso não tem a página ${pagina} (falta o campo {{${token}}}).`);
  return sp;
}

async function gerarPatrimonial(
  admin: ReturnType<typeof createClient>,
  bytesDoMolde: Uint8Array,
  clienteId: string,
  clienteNome: string,
  probs?: ProblemaDoDeck[],
): Promise<DeckMontado> {
  const parts = unpackPptx(bytesDoMolde);

  const sociedades = await carregarPatrimonial(admin, clienteId, probs);

  const TEMPLATE = slideObrigatorio(parts, "PROP", "das sociedades");
  if (sociedades.length === 0) {
    // Sem sociedades: mantem a pagina vazia, tira row-template pra nao ficar com token cru.
    const xml = readText(parts, TEMPLATE);
    const doc = parseXml(xml);
    const gf = listGraphicFrames(doc).find((g) => graphicFrameContainsToken(g, "PROP"));
    if (gf) {
      const tr = listRows(gf).find((r) => rowContainsToken(r, "PROP"));
      if (tr) removeRow(tr);
      const tot = listRows(gf).find((r) => rowContainsToken(r, "TOT_AREA"));
      if (tot) removeRow(tot);
    }
    applyTokensToNode(doc, { SOCIEDADE: "—" } as Tokens);
    stripRemainingTokens(doc);
    writeText(parts, TEMPLATE, serializeXml(doc));
  } else {
    // Paginacao conservadora: titular longo (>30 chars) conta como 2 linhas visuais;
    // teto ~9 linhas visuais por slide pra nunca transbordar.
    const MAX_LINHAS_VISUAIS = 9;
    const custoVisual = (l: SociedadePatrimonial["linhas"][number]) =>
      (l.propriedade && l.propriedade.length > 30) ? 2 : 1;
    type Chunk = { nome: string; linhas: SociedadePatrimonial["linhas"] };
    const chunks: Chunk[] = [];
    for (const s of sociedades) {
      if (s.linhas.length === 0) { chunks.push({ nome: s.nome, linhas: [] }); continue; }
      let buf: SociedadePatrimonial["linhas"] = [];
      let peso = 0;
      for (const linha of s.linhas) {
        const c = custoVisual(linha);
        if (buf.length > 0 && peso + c > MAX_LINHAS_VISUAIS) {
          chunks.push({ nome: s.nome, linhas: buf });
          buf = [];
          peso = 0;
        }
        buf.push(linha);
        peso += c;
      }
      if (buf.length > 0) chunks.push({ nome: s.nome, linhas: buf });
    }
    const paths = [TEMPLATE];
    for (let i = 1; i < chunks.length; i++) {
      const dup = duplicateSlide(parts, TEMPLATE);
      paths.push(dup.newPath);
    }
    for (let i = 0; i < chunks.length; i++) {
      const ultimaDaSociedade = i === chunks.length - 1 || chunks[i + 1].nome !== chunks[i].nome;
      renderPatrimonialSlide(
        parts, paths[i], { nome: chunks[i].nome, linhas: chunks[i].linhas },
        ultimaDaSociedade ? totais.get(chunks[i].nome) ?? null : null,
      );
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
  return {
    bytes: packPptx(parts),
    contagens: { sociedades: sociedades.length },
    snapshot: { sociedades },
  };
}

// ============================================================================
// ORGANOGRAMA (pagina {{ORG_ITEM}} da societaria) — 4 faixas horizontais de {{ORG_ITEM}}
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

/**
 * Crava sz (em centesimos de pt) no <a:rPr> de todos os runs do shape.
 * Necessario porque Google Slides IGNORA <a:normAutofit/>: sem sz explicito,
 * nomes longos vazam para fora da caixa.
 */
function fixRunFontSize(sp: Element, label: string): void {
  const len = label.length;
  const sz = len <= 18 ? 1200 : len <= 28 ? 1100 : len <= 40 ? 900 : 800;
  const runs = qsa(sp, "a:r");
  for (const r of runs) {
    let rPr = qsa(r, "a:rPr")[0];
    if (!rPr) {
      const doc = r.ownerDocument!;
      rPr = doc.createElementNS("http://schemas.openxmlformats.org/drawingml/2006/main", "a:rPr");
      r.insertBefore(rPr, r.firstChild);
    }
    rPr.setAttribute("sz", String(sz));
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
    fixRunFontSize(clone, labels[i]);
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
// QUADRO SOCIETARIO (pagina {{SOCIO}} da societaria) — 1 tabela por empresa
// ============================================================================

// Layout: 2 colunas × N linhas por slide. Ao esgotar altura, duplicar slide.
// Constantes em EMU (1" = 914400).
const QUADRO_COL_W = 5212080;   // 5.7"
const QUADRO_GAP_H = 274320;    // 0.3"
const QUADRO_LEFT_0 = 548640;   // 0.6"
const QUADRO_LEFT_1 = QUADRO_LEFT_0 + QUADRO_COL_W + QUADRO_GAP_H;
const QUADRO_LEFT_CENTER = 2971800; // 3.25" (1 empresa)



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

/**
 * Desenha a tabela de UMA empresa numa posicao do slide.
 *
 * `fechaOTotal` diz se esta e a ultima parte da empresa. Quando a tabela e
 * partida entre paginas, so a ultima leva a linha de TOTAL: o `preencherTotal`
 * escreve o total da EMPRESA INTEIRA e um "100,00%" fixo, entao repeti-lo em cada
 * pedaco faria quatro paginas dizerem 100% com treze socios cada — e nenhuma
 * delas fecharia com as proprias linhas.
 */
function renderQuadroTable(
  spTree: Element,
  templateGf: Element,
  idCounter: { next: number },
  empresa: QuadroEmpresa,
  x: number,
  y: number,
  fechaOTotal = true,
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
  if (fechaOTotal) {
    preencherTotal(clone, empresa.totalQuotas, empresa.totalValor);
  } else {
    // Pedaco intermediario: a linha de TOTAL sai, e volta na ultima pagina.
    const todas = listRows(clone);
    const ultima = todas[todas.length - 1];
    if (ultima) removeRow(ultima);
  }

  // Escalar <a:gridCol> para somar QUADRO_COL_W — senao a tabela renderiza
  // pela largura do template (~6,83") e invade a coluna vizinha no layout 2-col.
  const gridCols = qsa(clone, "a:gridCol");
  if (gridCols.length) {
    let total = 0;
    for (const gc of gridCols) total += Number(gc.getAttribute("w") ?? "0");
    if (total > 0) {
      const scale = QUADRO_COL_W / total;
      for (const gc of gridCols) {
        const w = Number(gc.getAttribute("w") ?? "0");
        gc.setAttribute("w", String(Math.round(w * scale)));
      }
    }
  }

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

  /** Desenha o que couber e devolve as linhas que sobraram da mesma empresa. */
  const desenharAteCaber = (
    emp: QuadroEmpresa, left: number, top: number,
  ): QuadroEmpresa | null => {
    const { aqui, resto } = repartirLinhas(emp.linhas, top);
    if (aqui.length === 0) return emp; // nem os cabecalhos cabem: vai inteira
    renderQuadroTable(
      spTree, gf, idCounter, { ...emp, linhas: aqui }, left, top,
      resto.length === 0, // so o pedaco final fecha o TOTAL
    );
    return resto.length === 0 ? null : { ...emp, linhas: resto };
  };

  if (validas.length === 1) {
    // Tabela unica, centralizada. TAMBEM parte: antes esta ramificacao nao tinha
    // checagem de altura nenhuma, e uma empresa grande transbordava para fora do
    // slide — nao sumia do deck, mas saia ilegivel na apresentacao.
    const sobrou = desenharAteCaber(validas[0], QUADRO_LEFT_CENTER, QUADRO_TOP_0);
    if (sobrou) restantes.push(sobrou);
  } else {
    const tops = [QUADRO_TOP_0, QUADRO_TOP_0];
    const lefts = [QUADRO_LEFT_0, QUADRO_LEFT_1];
    for (let i = 0; i < validas.length; i++) {
      const col = i % 2;
      const emp = validas[i];
      const h = estimarAltura(emp.linhas.length);
      if (tops[col] + h <= QUADRO_TOP_MAX) {
        renderQuadroTable(spTree, gf, idCounter, emp, lefts[col], tops[col]);
        tops[col] += h;
        continue;
      }
      // Nao cabe inteira: desenha o pedaco que cabe e manda o resto adiante,
      // junto com as empresas seguintes, preservando a ordem.
      const sobrou = desenharAteCaber(emp, lefts[col], tops[col]);
      if (sobrou) restantes.push(sobrou);
      restantes.push(...validas.slice(i + 1));
      break;
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
  bytesDoMolde: Uint8Array,
  clienteId: string,
  clienteNome: string,
  probs?: ProblemaDoDeck[],
): Promise<DeckMontado> {
  const parts = unpackPptx(bytesDoMolde);

  const [bands, empresas, titular] = await Promise.all([
    carregarOrganograma(admin, clienteId, probs),
    carregarQuadro(admin, clienteId, probs),
    resolverTitular(admin, clienteId, probs),
  ]);

  // Organograma e quadro, cada um pelo token que so a pagina dele tem.
  const SLIDE_ORGANOGRAMA = slideObrigatorio(parts, "ORG_ITEM", "do organograma");
  const SLIDE_QUADRO = slideObrigatorio(parts, "SOCIO", "do quadro societário");
  renderOrganograma(parts, SLIDE_ORGANOGRAMA, bands, titular);

  // Quadro (a pagina do molde + duplicatas)
  if (empresas.length === 0) {
    removeSlide(parts, SLIDE_QUADRO);
  } else {
    let restantes = renderQuadroSlide(parts, SLIDE_QUADRO, empresas);

    /*
      A PAGINACAO PARAVA EM 20 PAGINAS E DESCARTAVA O RESTO EM SILENCIO.

      O laco tinha `guardBail < 20` e ninguem conferia `restantes` no fim: quem
      nao coubesse simplesmente nao ia para o deck. Medido em 21/09 no cliente de
      teste com 41 socios — 24 nao apareciam, e nada na tela dizia. Um consultor
      apresentaria o quadro de uma holding mostrando 17 de 41.

      Duas correcoes. A guarda agora e de PROGRESSO, nao de contagem: o laco para
      quando uma volta deixa de reduzir o que falta, que e o unico jeito de travar
      laco infinito sem inventar um teto. E o que sobrar, se sobrar, vira aviso —
      o deck sai, e quem gera fica sabendo.

      O molde tambem deixou de ser rebaixado a cada volta. Eram ate 20 downloads
      de 1,5 MB por geracao; os bytes ja estao na mao desde o inicio.
     */
    const moldeLimpo = readText(unpackPptx(bytesDoMolde), SLIDE_QUADRO);
    /* Conta LINHAS, e nao empresas: agora que uma empresa pode ser partida entre
       paginas, o numero de empresas pendentes fica igual enquanto as linhas
       diminuem — medir empresa daria falso "nao avancou" na primeira volta. */
    const linhasDe = (es: QuadroEmpresa[]) => es.reduce((n, e) => n + e.linhas.length, 0);
    let antes = linhasDe(restantes);
    while (restantes.length > 0) {
      const dup = duplicateSlide(parts, SLIDE_QUADRO);
      writeText(parts, dup.newPath, moldeLimpo);
      restantes = renderQuadroSlide(parts, dup.newPath, restantes);
      const agora = linhasDe(restantes);
      if (agora >= antes) break; // nao avancou: para, e relata abaixo
      antes = agora;
    }
    if (restantes.length > 0) {
      anota(
        probs,
        ONDE.quadro,
        `${restantes.length === 1 ? "1 empresa nao coube" : `${restantes.length} empresas nao couberam`} no quadro societario e ficaram fora do deck.`,
        "formatacao",
      );
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
  return {
    bytes: packPptx(parts),
    contagens: { empresas: empresas.length },
    snapshot: { organograma: bands, quadro: empresas, titular },
  };
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
    const decks = decksPedidos(body);
    if (!clienteId || !decks) {
      return json({ error: `clienteId e tipos obrigatorios (tipos ⊂ ${TIPOS.join("|")}; ou tipo = ambas)` }, 400);
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

    const arquivos: Array<{
      tipo: DeckTipo;
      nome: string;
      url: string | null;
      apresentacaoId: string;
      versao: number;
    }> = [];
    const erros: Array<{ tipo: DeckTipo; message: string }> = [];

    /*
     * UM `problemas` POR DECK, e nao um acumulador da chamada inteira.
     *
     * Antes era um só, compartilhado pelos dois geradores, porque a resposta
     * também era uma só. Agora cada deck vira uma LINHA em `osg_apresentacao` com
     * os seus problemas congelados — e misturar faria o registro do patrimonial
     * carregar buraco que é do organograma. Quem quer os dois juntos é a tela, e
     * ela soma o que voltou.
     */
    const problemasDeTodos: ProblemaDoDeck[] = [];

    for (const tipo of decks) {
      try {
        const problemas: ProblemaDoDeck[] = [];

        /*
         * A CASCA COMPARTILHADA assume daqui: baixar o molde, validar o pacote,
         * versionar, subir, gravar a linha e assinar a URL são a mesma sequência
         * do gerador tributário, e a ordem carrega as decisões (ver o cabeçalho
         * de `_shared/apresentacao/registrar.ts`).
         *
         * O que é da OSG entra por parâmetro: a âncora é `cliente_id` + `tipo`,
         * porque um cliente tem dois decks distintos e cada um versiona sozinho.
         * E o `snapshot` é a coluna que só esta tabela tem — o tributário aponta
         * para revisão imutável e ganha o retrato de graça; aqui o cadastro anda.
         *
         * QUEM GRAVA É A CONEXÃO DO USUÁRIO, sob RLS, mesmo o resto da função
         * lendo com `admin`: a policy de INSERT exige team_member+ e a de SELECT
         * passa pelo `cliente_visivel_para`. Gravar com `admin` puraria a linha
         * por fora da regra que a própria migration escreveu.
         */
        const registrada = await registrarApresentacao({
          admin,
          db: userClient,
          molde: { bucket: BUCKET_TEMPLATES, nome: TEMPLATE_PATHS[tipo] },
          registro: {
            tabela: "osg_apresentacao",
            ancora: { cliente_id: clienteId, tipo },
            bucketSaida: BUCKET_SAIDA,
            pasta: clienteId,
            nomeArquivo: (versao) =>
              `PSA_${ROTULO_DO_ARQUIVO[tipo]}_${slugify(cli.nome)}_v${versao}.pptx`,
          },
          montar: async (bytesDoMolde) => {
            const montado = tipo === "patrimonial"
              ? await gerarPatrimonial(admin, bytesDoMolde, clienteId, cli.nome, problemas)
              : await gerarSocietaria(admin, bytesDoMolde, clienteId, cli.nome, problemas);
            /* Os avisos ficam vazios de proposito: o que esta geracao tem a dizer
               ja entrou no `problemas`, com `onde` e causa, pelas regras puras. */
            return { bytes: montado.bytes, avisos: [], snapshot: montado.snapshot };
          },
          problemas,
          versaoDoGerador: VERSAO_DO_GERADOR,
        });

        if (falhou(registrada)) {
          erros.push({ tipo, message: registrada.erro });
          continue;
        }

        problemasDeTodos.push(...registrada.problemas);
        arquivos.push({
          tipo,
          nome: registrada.nomeArquivo,
          url: registrada.url,
          apresentacaoId: registrada.apresentacaoId,
          versao: registrada.versao,
        });
      } catch (e: any) {
        erros.push({ tipo, message: String(e?.message ?? e) });
      }
    }

    if (arquivos.length === 0) return json({ error: "Falha ao gerar", detalhes: erros }, 500);
    return json({
      arquivos,
      erros: erros.length ? erros : undefined,
      problemas: problemasDeTodos.length ? problemasDeTodos : undefined,
    });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
