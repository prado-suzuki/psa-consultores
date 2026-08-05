#!/usr/bin/env node
// @ts-check
/**
 * gen-status-report.mjs
 * -------------------------------------------------------------------------
 * Gera o "Status de Desenvolvimento" comparando o ROADMAP com o CÓDIGO real.
 *
 * FONTE ÚNICA dos marcos: `roadmap.json` no Drive (03_Roadmap_e_Backlog).
 * Este gerador LÊ o roadmap.json e junta, por `id`, as REGRAS DE DETECÇÃO do
 * repo (`status-report.config.mjs`). Duas saídas: `.md` (humano) + `status.json`.
 *
 * Modos:
 *   node scripts/gen-status-report.mjs             → rolling em 04_Ferramentas
 *   node scripts/gen-status-report.mjs --entrega   → + snapshots datados em 03_Entregas
 *   node scripts/gen-status-report.mjs --dry-run [--json]
 *
 * Gatilho: tarefas agendadas (seg = rolling; sex = --entrega) + hooks git.
 *
 * No-op seguro se o Drive (G:) ou o roadmap.json não estiverem disponíveis
 * (ex.: build do Lovable, ou roadmap.json mid-edit) — nunca quebra commit/build
 * e nunca sobrescreve os arquivos bons com uma rodada inválida.
 *
 * ⚠️ Detecção HEURÍSTICA (procura rotas/arquivos/termos). Alerta de "vale
 * conferir", não verdade final.
 * -------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { META, DETECT } from "./status-report.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ======================= DESTINOS / FONTE (edite se mudar de pasta) =======
const OSG_BASE =
  process.env.PSA_OSG_BASE ||
  "G:\\Drives compartilhados\\PSA Digital\\03_Clientes_Internos\\PSA_OSG";

// Fonte única dos marcos.
const ROADMAP_JSON = process.env.PSA_ROADMAP_JSON || path.join(OSG_BASE, "03_Roadmap_e_Backlog", "roadmap.json");

// Pasta única do status (rolling + histórico datado), visível em Insumos Projetos.
const STATUS_DEST = path.join(OSG_BASE, "09_Gerencial", "02_Insumos Projetos", "Status_Desenvolvimento");

// Rolling (status vivo p/ montar sprint).
const FERRAMENTAS_DEST = STATUS_DEST;
const ROLLING_FILE = "STATUS_DESENVOLVIMENTO.md";
const JSON_FILE = "status.json";

// Relatório datado por sprint (mesma pasta do rolling).
const ENTREGAS_DEST = STATUS_DEST;
const EXECUCAO_DIR = path.join(OSG_BASE, "09_Gerencial", "01_Sprints", "02_Execucao");
// ==========================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const ENTREGA = process.argv.includes("--entrega");

const ROADMAP_EMOJI = { no_ar: "🟢", parcial: "🟡", novo: "⚪" };
const DETECTED_META = {
  encontrado: { emoji: "✅", label: "evidência no código" },
  parcial: { emoji: "🟨", label: "sinais parciais" },
  ausente: { emoji: "⬜", label: "sem evidência" },
};

// ---------------------------- indexação do repo ---------------------------

function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** Varre src/ (código) e docs/ (planos), retornando índices para detecção. */
function indexRepo() {
  const SRC = path.join(REPO_ROOT, "src");
  const fileList = [];
  const contents = [];
  const SKIP_DIRS = new Set(["integrations", "node_modules", ".git"]);
  const MAX_BYTES = 400 * 1024;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full);
      } else if (e.isFile()) {
        fileList.push(rel);
        if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
          let size = 0;
          try {
            size = fs.statSync(full).size;
          } catch {
            /* ignore */
          }
          if (size <= MAX_BYTES) contents.push({ rel, text: readSafe(full) });
        }
      }
    }
  };
  walk(SRC);

  // Docs (planos/tarefas). Sinal SEPARADO. Exclui referência que casa com tudo.
  const SKIP_DOCS = new Set(["docs/rls/mapa-do-banco.md", "docs/AI_CONTEXT.md"]);
  const docsContents = [];
  const walkDocs = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      if (e.isDirectory()) walkDocs(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md") && !SKIP_DOCS.has(rel)) {
        docsContents.push({ rel, text: readSafe(full) });
      }
    }
  };
  walkDocs(path.join(REPO_ROOT, "docs"));

  const routeText =
    readSafe(path.join(REPO_ROOT, "src", "App.tsx")) +
    "\n" +
    readSafe(path.join(REPO_ROOT, "src", "config", "protectedPages.ts"));

  return { fileList, contents, docsContents, routeText };
}

/** Glob simples (`*`, `**`) → RegExp sobre caminhos com "/". */
function globToRegex(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const re = esc.replace(/\*\*/g, "§DS§").replace(/\*/g, "[^/]*").replace(/§DS§/g, ".*");
  return new RegExp("^" + re + "$");
}

/** Avalia as regras de detecção (objeto DETECT) contra o índice do repo. */
function detectSignals(detect, idx) {
  const d = detect || {};
  const evidence = [];

  const routesFound = (d.routes || []).filter((r) => idx.routeText.includes(r));
  routesFound.forEach((r) => evidence.push(`rota \`${r}\``));

  const filesFound = [];
  for (const g of d.files || []) {
    const re = globToRegex(g);
    const hit = idx.fileList.find((f) => re.test(f));
    if (hit) {
      filesFound.push(hit);
      evidence.push(`\`${hit}\``);
    }
  }

  for (const kw of d.keywords || []) {
    const hit = idx.contents.find((c) => c.text.includes(kw));
    if (hit) evidence.push(`termo \`${kw}\` em \`${hit.rel}\``);
  }
  const keywordHit = (d.keywords || []).some((kw) => idx.contents.some((c) => c.text.includes(kw)));

  let detected;
  if (routesFound.length || filesFound.length) detected = "encontrado";
  else if (keywordHit) detected = "parcial";
  else detected = "ausente";

  // Sinal SEPARADO: docs/planos que mencionam o marco (NÃO é código).
  const docTerms = [...new Set([...(d.keywords || []), ...(d.docTerms || [])])];
  const docsFound = [];
  for (const c of idx.docsContents || []) {
    if (docsFound.length >= 5) break;
    if (docTerms.length && docTerms.some((t) => c.text.includes(t)) && !docsFound.includes(c.rel)) {
      docsFound.push(c.rel);
    }
  }

  return { detected, evidence, filesFound, docsFound };
}

// ---------------------------- utilidades ----------------------------------

function pad2(n) {
  return String(n).padStart(2, "0");
}

function lastCommits(n) {
  try {
    const out = execSync(`git log -${n} --format=%h%x1f%s%x1f%cd --date=short`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [hash, subject, date] = l.split("\x1f");
        return { hash, subject, date };
      });
  } catch {
    return [];
  }
}

/** Mapa arquivo→data do último commit (1 passada de git log --name-only). */
function buildFileDateMap(limit = 1000) {
  const map = new Map();
  try {
    const out = execSync(`git log -${limit} --date=short --format=\x1e%cd --name-only`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let curDate = null;
    for (const line of out.split("\n")) {
      if (line[0] === "\x1e") {
        curDate = line.slice(1).trim();
        continue;
      }
      const f = line.trim();
      if (f && curDate && !map.has(f)) map.set(f, curDate);
    }
  } catch {
    /* sem git */
  }
  return map;
}

function maxDate(files, dateMap) {
  let best = null;
  for (const f of files || []) {
    const dd = dateMap.get(f);
    if (dd && (!best || dd > best)) best = dd;
  }
  return best;
}

/** Detecta a sprint atual pelo maior prefixo NN_ em 02_Execucao. */
function detectCurrentSprint() {
  let max = 0;
  try {
    for (const name of fs.readdirSync(EXECUCAO_DIR)) {
      const m = name.match(/^(\d{1,2})[_-]?Sprint/i);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  } catch {
    /* Drive ausente */
  }
  return max > 0 ? `S${pad2(max)}` : "S00";
}

function progressBar(done, total, width = 22) {
  if (total === 0) return "—";
  const filled = Math.round((done / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled) + ` ${Math.round((done / total) * 100)}%`;
}

function sprintMaxNum(s) {
  const nums = (String(s || "").match(/\d+/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

/** detectavel derivado do tipo: só obra/ajuste "devem" virar código. */
function detectavelFromTipo(tipo) {
  return tipo === "obra" || tipo === "ajuste";
}

function normStatus(s) {
  return s === "no_ar" || s === "parcial" || s === "novo" ? s : "novo";
}

function pendenciasCount(detect) {
  const p = detect && detect.pendencias;
  if (Array.isArray(p)) return p.length;
  if (typeof p === "number") return p;
  return 0;
}

function codigoState(detected, pend) {
  if (detected === "encontrado") return pend > 0 ? "ajuste" : "no_ar";
  if (detected === "parcial") return "parcial";
  return "sem_evidencia";
}

function isoWithOffset(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const local = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return `${local}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

function findPageFile(fileList, lastSeg) {
  const key = String(lastSeg).replace(/-/g, "").toLowerCase();
  return (
    fileList.find(
      (f) =>
        /^src\/pages\/equipe\/osg\/[^/]+\.tsx$/.test(f) &&
        f.split("/").pop().replace(/-/g, "").toLowerCase().includes(key)
    ) || null
  );
}

/** Rotas OSG no repo que NENHUM marco cobre. */
function buildExtras(idx) {
  const routeSet = new Set();
  const re = /\/equipe\/osg\/[a-z0-9/-]+/g;
  let mm;
  while ((mm = re.exec(idx.routeText))) routeSet.add(mm[0].replace(/\/+$/, ""));
  const coveredTokens = Object.values(DETECT).flatMap((d) => d.routes || []);
  const containers = new Set(["/equipe/osg", "/equipe/osg/work", "/equipe/osg/projetos"]);
  const extras = [];
  for (const route of routeSet) {
    if (containers.has(route)) continue;
    if (coveredTokens.some((t) => route.includes(t))) continue;
    const lastSeg = route.split("/").pop();
    const file = findPageFile(idx.fileList, lastSeg);
    extras.push({
      rota: route.replace(/^\//, ""),
      arquivos: file ? [file.split("/").pop()] : [],
      sugestao: `avaliar virar marco (rota ${route})`,
    });
  }
  extras.sort((a, b) => a.rota.localeCompare(b.rota));
  return extras;
}

/** Carrega o roadmap.json (fonte única). Retorna null se ausente/ inválido. */
function loadRoadmap() {
  try {
    const raw = fs.readFileSync(ROADMAP_JSON, "utf8");
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.marcos)) return null;
    return j;
  } catch {
    return null;
  }
}

function platformOf(code, projetos) {
  const p = (projetos && projetos[code]) || {};
  return p.plataforma || (code === "P1" ? "OSG Projects" : "OSG Work");
}

function projetoLabel(rm, projetos) {
  if (String(rm.id).startsWith("GED")) return "P1 · Recebimento/GED";
  const nome = (projetos && projetos[rm.projeto] && projetos[rm.projeto].nome) || rm.projeto;
  return `${rm.projeto} · ${nome}`;
}

// ------------------------------ render -------------------------------------

function buildReport() {
  const roadmap = loadRoadmap();
  if (!roadmap) return { error: `roadmap.json ausente ou inválido (${ROADMAP_JSON})` };

  const idx = indexRepo();
  const projetos = roadmap.projetos || {};
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const timeStamp = `${stamp} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const sprint = detectCurrentSprint();
  const curNum = sprintMaxNum(sprint);
  const commits = lastCommits(8);
  const fileDateMap = buildFileDateMap();

  // Avalia cada marco da FONTE (roadmap.json) juntando as regras de detecção do repo.
  const evaluated = roadmap.marcos.map((rm) => {
    const detect = DETECT[rm.id] || null;
    const { detected, evidence, filesFound, docsFound } = detectSignals(detect, idx);
    const roadmapStatus = normStatus(rm.status);
    const detectavel = detectavelFromTipo(rm.tipo);
    const declaredGreen = roadmapStatus === "no_ar";
    const declaredNovo = roadmapStatus === "novo";
    let diverge = "";
    if (declaredGreen && detected === "ausente")
      diverge = "⚠️ roadmap diz no ar, mas o código não mostra evidência — conferir";
    else if (declaredNovo && detected === "encontrado")
      diverge = "ℹ️ roadmap diz 'a construir', mas já há código — talvez adiantado";
    return {
      id: rm.id,
      projetoCode: rm.projeto,
      plataforma: platformOf(rm.projeto, projetos),
      grupo: projetoLabel(rm, projetos),
      sprint: rm.sprint || "—",
      marco: rm.titulo,
      dono: rm.dono || "—",
      tipo: rm.tipo,
      depende_de: rm.depende_de || [],
      statusRoadmap: roadmapStatus,
      detectavel,
      detect,
      detected,
      evidence,
      filesFound,
      docsFound,
      diverge,
    };
  });

  const totals = {
    total: evaluated.length,
    encontrado: evaluated.filter((m) => m.detected === "encontrado").length,
    parcial: evaluated.filter((m) => m.detected === "parcial").length,
    ausente: evaluated.filter((m) => m.detected === "ausente").length,
  };
  const divergencias = evaluated.filter((m) => m.diverge);

  // ------------------------------- .md (humano) -------------------------------
  const L = [];
  L.push(`# 📈 Status de Desenvolvimento — ${META.tool}`);
  L.push("");
  L.push(`> ⚙️ **Arquivo gerado automaticamente** — não edite à mão (será sobrescrito).`);
  L.push(`> Fonte única dos marcos: \`roadmap.json\`. Código: repo \`psa-consultores\`.`);
  L.push(`> Sprint atual detectada: **${sprint}** · Gerado em **${timeStamp}**`);
  if (commits[0]) L.push(`> Último commit: \`${commits[0].hash}\` — ${commits[0].subject} (${commits[0].date})`);
  L.push("");
  L.push(
    `> ⚠️ A coluna **"Código"** é uma detecção **heurística** (rotas/arquivos/termos). ` +
      `Alerta de "vale conferir", não verdade final.`
  );
  L.push("");

  L.push("## 🎯 Resumo");
  L.push("");
  L.push("| Indicador | Valor |");
  L.push("|---|---:|");
  L.push(`| Marcos (roadmap.json) | ${totals.total} |`);
  L.push(`| ✅ com evidência no código | ${totals.encontrado} |`);
  L.push(`| 🟨 sinais parciais | ${totals.parcial} |`);
  L.push(`| ⬜ sem evidência | ${totals.ausente} |`);
  L.push(`| Cobertura (com evidência) | ${progressBar(totals.encontrado, totals.total)} |`);
  L.push(`| ⚠️ divergências roadmap × código | ${divergencias.length} |`);
  L.push("");

  L.push("## ⚠️ Divergências para conferir");
  L.push("");
  if (divergencias.length === 0) {
    L.push("_Nenhuma divergência entre o status do roadmap e o que o código mostra._");
  } else {
    L.push("| Marco | id | Roadmap | Código | Observação |");
    L.push("|---|---|:--:|:--:|---|");
    for (const m of divergencias) {
      L.push(`| ${m.marco} | \`${m.id}\` | ${ROADMAP_EMOJI[m.statusRoadmap]} | ${DETECTED_META[m.detected].emoji} | ${m.diverge} |`);
    }
  }
  L.push("");

  const plataformas = [...new Set(evaluated.map((m) => m.plataforma))];
  for (const plat of plataformas) {
    L.push(`## 🧭 ${plat}`);
    L.push("");
    const grupos = [...new Set(evaluated.filter((m) => m.plataforma === plat).map((m) => m.grupo))];
    for (const g of grupos) {
      const rows = evaluated.filter((m) => m.plataforma === plat && m.grupo === g);
      const ok = rows.filter((r) => r.detected === "encontrado").length;
      L.push(`### ${g} — ${ok}/${rows.length} com evidência`);
      L.push("");
      L.push("| Sprint | Marco | Dono | Roadmap | Código | Evidência |");
      L.push("|:--:|---|:--:|:--:|:--:|---|");
      for (const m of rows) {
        let ev = m.evidence.length ? m.evidence.slice(0, 3).join("; ") : "—";
        if (m.docsFound && m.docsFound.length) ev += ` · 📄 ${m.docsFound.slice(0, 2).join(", ")}`;
        L.push(
          `| ${m.sprint} | ${m.marco} | ${m.dono} | ${ROADMAP_EMOJI[m.statusRoadmap]} | ${DETECTED_META[m.detected].emoji} | ${ev} |`
        );
      }
      L.push("");
    }
  }

  L.push("## 🔧 Atividade recente no repo");
  L.push("");
  if (commits.length === 0) L.push("_Sem histórico git disponível._");
  else for (const c of commits) L.push(`- \`${c.hash}\` ${c.subject} — ${c.date}`);
  L.push("");

  L.push("---");
  L.push("");
  L.push("### Como este relatório funciona");
  L.push("");
  L.push("- **Fonte dos marcos:** `03_Roadmap_e_Backlog/roadmap.json` (fonte única — editar lá).");
  L.push("- **Fonte do código:** varredura de `src/` do repo `psa-consultores`.");
  L.push("- **Regras de detecção:** `scripts/status-report.config.mjs` (casadas por `id`).");
  L.push("- **Gatilho:** tarefas agendadas (seg/sex) + hooks git. Manual: `node scripts/gen-status-report.mjs`.");
  L.push("");
  L.push(`_Legenda — Roadmap: 🟢 no ar · 🟡 parcial · ⚪ a construir. Código: ✅ evidência · 🟨 parcial · ⬜ sem evidência._`);
  L.push("");

  // ------------------------------- status.json (máquina) -------------------------------
  const marcosJson = evaluated.map((m) => {
    const pend = pendenciasCount(m.detect);
    const codigo = codigoState(m.detected, pend);
    const deadline = sprintMaxNum(m.sprint);
    const atraso = m.detectavel && codigo === "sem_evidencia" && deadline != null && curNum != null && deadline < curNum;
    const hasCode = codigo === "no_ar" || codigo === "ajuste";
    const divergencia = (m.statusRoadmap === "no_ar" && codigo === "sem_evidencia") || (m.statusRoadmap === "novo" && hasCode);
    const docs = m.docsFound || [];
    let acao = null;
    if (atraso) acao = `atraso: sprint-alvo ${m.sprint} passou sem evidência no código`;
    else if (divergencia && m.statusRoadmap === "novo") acao = "roadmap diz 'novo', mas há código — atualizar p/ parcial ou ajuste";
    else if (divergencia && m.statusRoadmap === "no_ar") acao = "roadmap diz 'no ar', mas sem evidência no código — conferir";
    else if (codigo === "sem_evidencia" && docs.length) acao = "documentado em docs/ (plano/tarefa), mas ainda sem código";
    return {
      id: m.id,
      projeto: m.projetoCode,
      sprint_alvo: m.sprint && m.sprint !== "—" ? m.sprint : null,
      titulo: m.marco,
      dono: m.dono !== "—" ? m.dono : null,
      tipo: m.tipo,
      roadmap: m.statusRoadmap,
      codigo,
      detectavel: m.detectavel,
      depende_de: m.depende_de,
      evidencia: m.evidence.map((e) => e.replace(/`/g, "")).slice(0, 5),
      documentos_relacionados: docs,
      ultimo_commit_evidencia: maxDate(m.filesFound, fileDateMap),
      pendencias_abertas: pend,
      atraso,
      divergencia,
      acao_sugerida: acao,
    };
  });

  const cnt = (s) => marcosJson.filter((x) => x.codigo === s).length;
  const extras = buildExtras(idx);
  const resumo = {
    marcos: marcosJson.length,
    no_ar: cnt("no_ar"),
    ajuste: cnt("ajuste"),
    parcial: cnt("parcial"),
    novo: cnt("sem_evidencia"),
    cobertura_pct: marcosJson.length ? Math.round(((cnt("no_ar") + cnt("ajuste")) / marcosJson.length) * 100) : 0,
    atrasos: marcosJson.filter((x) => x.atraso).length,
    divergencias: marcosJson.filter((x) => x.divergencia).length,
    documentados: marcosJson.filter((x) => x.documentos_relacionados.length).length,
    extras: extras.length,
  };

  const json = {
    gerado_em: isoWithOffset(now),
    sprint_atual: sprint,
    commit: (commits[0] && commits[0].hash) || null,
    fonte: "roadmap.json",
    resumo,
    marcos: marcosJson,
    extras_fora_do_roadmap: extras,
  };

  return { content: L.join("\n"), json, stamp, sprint };
}

// ------------------------------ escrita ------------------------------------

function writeFileSafe(dir, filename, content, mustExist = true) {
  if (mustExist && !fs.existsSync(dir)) {
    console.error(`[status-report] Destino ausente (${dir}); pulado.`);
    return false;
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, filename);
    fs.writeFileSync(target, content, "utf8");
    console.error(`[status-report] Gravado: ${target}`);
    return true;
  } catch (err) {
    console.error(`[status-report] Falha ao gravar em ${dir}: ${err?.message || err}`);
    return false;
  }
}

function main() {
  const res = buildReport();
  if (res.error) {
    // roadmap.json ausente/inválido: não escreve nada (preserva os arquivos bons).
    console.error(`[status-report] ${res.error} — nada gerado.`);
    return;
  }
  const { content, json, stamp, sprint } = res;
  const jsonStr = JSON.stringify(json, null, 2);

  if (DRY_RUN) {
    if (process.argv.includes("--json")) process.stdout.write(jsonStr + "\n");
    else process.stdout.write(content + "\n");
    console.error(`\n[dry-run] rolling → ${path.join(FERRAMENTAS_DEST, ROLLING_FILE)} (+ ${JSON_FILE})`);
    if (ENTREGA)
      console.error(`[dry-run] entrega → ${path.join(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`)} (+ .json)`);
    return;
  }

  writeFileSafe(FERRAMENTAS_DEST, ROLLING_FILE, content);
  writeFileSafe(FERRAMENTAS_DEST, JSON_FILE, jsonStr);

  if (ENTREGA) {
    writeFileSafe(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`, content);
    writeFileSafe(ENTREGAS_DEST, `status_${sprint}_${stamp}.json`, jsonStr);
  }
}

main();
