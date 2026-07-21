#!/usr/bin/env node
// @ts-check
/**
 * gen-status-report.mjs
 * -------------------------------------------------------------------------
 * Gera o "Status de Desenvolvimento" comparando o ROADMAP (marcos que a
 * coordenação mantém no Drive) com o CÓDIGO REAL do repo, e grava na pasta
 * usada para montar sprints.
 *
 * A lista de marcos + regras de detecção vive em `status-report.config.mjs`.
 * Este arquivo só executa: indexa `src/`, avalia cada marco, e renderiza.
 *
 * Modos:
 *   node scripts/gen-status-report.mjs             → grava o rolling em 04_Ferramentas
 *   node scripts/gen-status-report.mjs --entrega   → + snapshot datado em 03_Entregas
 *   node scripts/gen-status-report.mjs --dry-run   → imprime, não grava
 *
 * Gatilho automático: hooks git post-commit e post-merge
 *   (instalar: node scripts/install-status-hooks.mjs)
 *
 * IMPORTANTE: também roda no build do Lovable, onde o Drive (G:) não existe.
 * Nesse caso sai com exit 0 sem gravar — nunca quebra commit/build.
 *
 * ⚠️ A detecção é HEURÍSTICA (procura rotas/arquivos/termos no código). Serve
 * para sinalizar "vale conferir", não substitui a leitura humana do status.
 * -------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { META, MARCOS } from "./status-report.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ======================= DESTINOS (edite se mudar de pasta) ===============
// Base do cliente interno OSG no Drive. Sobrescreva com env PSA_OSG_BASE.
const OSG_BASE =
  process.env.PSA_OSG_BASE ||
  "G:\\Drives compartilhados\\PSA Digital\\03_Clientes_Internos\\PSA_OSG";

// Rolling (status vivo, consultado ao montar sprint) — pedido original.
const FERRAMENTAS_DEST = path.join(OSG_BASE, "04_Ferramentas", "PSA WORK", "03_Build");
const ROLLING_FILE = "STATUS_DESENVOLVIMENTO.md";
const JSON_FILE = "status.json";

// Relatório final por sprint (datado, imutável).
const ENTREGAS_DEST = path.join(OSG_BASE, "09_Gerencial", "01_Sprints", "03_Entregas");
// Onde detectar a sprint atual (arquivos NN_Sprint_*).
const EXECUCAO_DIR = path.join(OSG_BASE, "09_Gerencial", "01_Sprints", "02_Execucao");
// ==========================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const ENTREGA = process.argv.includes("--entrega");

const STATUS_META = {
  mvp: { emoji: "🟢", label: "MVP/validação" },
  pronto: { emoji: "🟢", label: "pronto" },
  parcial: { emoji: "🟡", label: "parcial" },
  novo: { emoji: "⚪", label: "a construir" },
};

// ---------------------------- indexação do repo ---------------------------

/** Lê um arquivo, tolerando ausência. */
function readSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** Varre src/ e retorna { fileList: string[], contents: {rel,text}[] }. */
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

  // Docs do repo (planos/tarefas/análises). Sinal SEPARADO — "documentado/planejado",
  // não conta como código construído. Cobre o caso de tarefa salva em docs/ sem código ainda.
  // Excluídos: docs de REFERÊNCIA (não são plano/tarefa) que casariam com tudo.
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

  // Texto de roteamento (rotas registradas).
  const routeText =
    readSafe(path.join(REPO_ROOT, "src", "App.tsx")) +
    "\n" +
    readSafe(path.join(REPO_ROOT, "src", "config", "protectedPages.ts"));

  return { fileList, contents, docsContents, routeText };
}

/** Converte um glob simples (`*`, `**`) em RegExp sobre caminhos com "/". */
function globToRegex(glob) {
  // Escapa os especiais de regex, MENOS o "*" (que vira curinga de glob).
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const re = esc.replace(/\*\*/g, "§DS§").replace(/\*/g, "[^/]*").replace(/§DS§/g, ".*");
  return new RegExp("^" + re + "$");
}

/** Avalia a detecção de um marco contra o índice do repo. */
function detectMarco(marco, idx) {
  const d = marco.detect || {};
  const evidence = [];

  const routesFound = (d.routes || []).filter((r) => idx.routeText.includes(r));
  routesFound.forEach((r) => evidence.push(`rota \`${r}\``));

  const fileMatchers = (d.files || []).map((g) => ({ g, re: globToRegex(g) }));
  const filesFound = [];
  for (const { g, re } of fileMatchers) {
    const hit = idx.fileList.find((f) => re.test(f));
    if (hit) {
      filesFound.push(hit);
      evidence.push(`\`${hit}\``);
    } else {
      // registra o padrão não encontrado só internamente (não vira evidência)
    }
  }

  const keywordsFound = [];
  for (const kw of d.keywords || []) {
    const hit = idx.contents.find((c) => c.text.includes(kw));
    if (hit) {
      keywordsFound.push(kw);
      evidence.push(`termo \`${kw}\` em \`${hit.rel}\``);
    }
  }

  let detected;
  if (routesFound.length || filesFound.length) detected = "encontrado";
  else if (keywordsFound.length) detected = "parcial";
  else detected = "ausente";

  // Sinal SEPARADO: docs/planos/tarefas que mencionam este marco (NÃO é código).
  // Casa por keyword do manifesto (preciso) OU por termos distintivos declarados
  // em `detect.docTerms` (opcional, p/ pegar plano descrito em prosa).
  const docTerms = [...new Set([...(d.keywords || []), ...(d.docTerms || [])])];
  const docsFound = [];
  for (const c of idx.docsContents || []) {
    if (docsFound.length >= 5) break;
    if (docTerms.length && docTerms.some((t) => c.text.includes(t)) && !docsFound.includes(c.rel)) {
      docsFound.push(c.rel);
    }
  }

  return { detected, evidence, filesFound, routesFound, keywordsFound, docsFound };
}

const DETECTED_META = {
  encontrado: { emoji: "✅", label: "evidência no código" },
  parcial: { emoji: "🟨", label: "sinais parciais" },
  ausente: { emoji: "⬜", label: "sem evidência" },
};

/** Divergência entre o status declarado no roadmap e o detectado. */
function divergence(marco, detected) {
  const declaredGreen = marco.statusRoadmap === "mvp" || marco.statusRoadmap === "pronto";
  const declaredNovo = marco.statusRoadmap === "novo";
  if (declaredGreen && detected === "ausente")
    return "⚠️ roadmap diz pronto/validação, mas o código não mostra evidência — conferir";
  if (declaredNovo && detected === "encontrado")
    return "ℹ️ roadmap diz 'a construir', mas já há código — talvez adiantado";
  return "";
}

// ---------------------------- utilidades ----------------------------------

function pad2(n) {
  return String(n).padStart(2, "0");
}

function lastCommits(n) {
  try {
    // Separador %x1f (unit separator): não é metacaractere de shell — evita que
    // o cmd.exe (usado pelo execSync no Windows) interprete "|" como pipe.
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

// ---------------------- helpers do status.json (SPEC) ----------------------

/** Maior número de sprint num rótulo tipo "S13-S15" → 15; "—" → null. */
function sprintMaxNum(s) {
  const nums = (String(s || "").match(/\d+/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}

/** Status do roadmap (config) → enum do JSON. */
function roadmapToJson(sr) {
  if (sr === "mvp" || sr === "pronto") return "no_ar";
  if (sr === "parcial") return "parcial";
  return "novo";
}

/** Quantidade de pendências abertas declaradas no marco (número ou lista). */
function pendenciasCount(m) {
  if (Array.isArray(m.pendencias)) return m.pendencias.length;
  if (typeof m.pendencias === "number") return m.pendencias;
  return 0;
}

/** Estado de código (SPEC §2): no_ar | ajuste | parcial | sem_evidencia. */
function codigoState(detected, pend) {
  if (detected === "encontrado") return pend > 0 ? "ajuste" : "no_ar";
  if (detected === "parcial") return "parcial";
  return "sem_evidencia";
}

/** ISO local com offset (ex.: 2026-07-20T20:00:00-04:00). */
function isoWithOffset(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const local = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return `${local}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/**
 * Mapa arquivo→data(YYYY-MM-DD) do último commit que o tocou.
 * UMA passada de `git log --name-only` (rápido). Como o log vem em ordem
 * reversa, a 1ª ocorrência de cada arquivo é o commit mais recente.
 */
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
    /* sem git → mapa vazio */
  }
  return map;
}

/** Data mais recente entre os arquivos (usando o mapa). */
function maxDate(files, dateMap) {
  let best = null;
  for (const f of files || []) {
    const d = dateMap.get(f);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

/** Acha o arquivo de página OSG cujo nome casa com o último segmento da rota. */
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

/** Rotas OSG presentes no repo que NENHUM marco cobre (SPEC extras_fora_do_roadmap). */
function buildExtras(idx) {
  const routeSet = new Set();
  const re = /\/equipe\/osg\/[a-z0-9/-]+/g;
  let mm;
  while ((mm = re.exec(idx.routeText))) routeSet.add(mm[0].replace(/\/+$/, ""));
  const coveredTokens = MARCOS.flatMap((m) => (m.detect && m.detect.routes) || []);
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

// ------------------------------ render -------------------------------------

function buildReport() {
  const idx = indexRepo();
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const timeStamp = `${stamp} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const sprint = detectCurrentSprint();
  const commits = lastCommits(8);

  // Avalia todos os marcos.
  const evaluated = MARCOS.map((m) => {
    const { detected, evidence, filesFound, docsFound } = detectMarco(m, idx);
    return { ...m, detected, evidence, filesFound, docsFound, diverge: divergence(m, detected) };
  });

  const totals = {
    total: evaluated.length,
    encontrado: evaluated.filter((m) => m.detected === "encontrado").length,
    parcial: evaluated.filter((m) => m.detected === "parcial").length,
    ausente: evaluated.filter((m) => m.detected === "ausente").length,
  };
  const divergencias = evaluated.filter((m) => m.diverge);

  const L = [];
  L.push(`# 📈 Status de Desenvolvimento — ${META.tool}`);
  L.push("");
  L.push(`> ⚙️ **Arquivo gerado automaticamente** — não edite à mão (será sobrescrito).`);
  L.push(`> Compara o **roadmap** (marcos curados no Drive) com o **código** do repo \`psa-consultores\`.`);
  L.push(`> Sprint atual detectada: **${sprint}** · Gerado em **${timeStamp}**`);
  if (commits[0]) L.push(`> Último commit: \`${commits[0].hash}\` — ${commits[0].subject} (${commits[0].date})`);
  L.push("");
  L.push(
    `> ⚠️ A coluna **"Código"** é uma detecção **heurística** (procura rotas/arquivos/termos). ` +
      `Use como alerta de "vale conferir", não como verdade final — a leitura de status continua sua.`
  );
  L.push("");

  // Resumo
  L.push("## 🎯 Resumo");
  L.push("");
  L.push("| Indicador | Valor |");
  L.push("|---|---:|");
  L.push(`| Marcos acompanhados | ${totals.total} |`);
  L.push(`| ✅ com evidência no código | ${totals.encontrado} |`);
  L.push(`| 🟨 sinais parciais | ${totals.parcial} |`);
  L.push(`| ⬜ sem evidência | ${totals.ausente} |`);
  L.push(`| Cobertura (com evidência) | ${progressBar(totals.encontrado, totals.total)} |`);
  L.push(`| ⚠️ divergências roadmap × código | ${divergencias.length} |`);
  L.push("");

  // Divergências (o mais acionável)
  L.push("## ⚠️ Divergências para conferir");
  L.push("");
  if (divergencias.length === 0) {
    L.push("_Nenhuma divergência entre o status do roadmap e o que o código mostra._");
  } else {
    L.push("| Projeto | Marco | Roadmap | Código | Observação |");
    L.push("|---|---|:--:|:--:|---|");
    for (const m of divergencias) {
      const sr = STATUS_META[m.statusRoadmap] || { emoji: "?" };
      const dm = DETECTED_META[m.detected];
      L.push(`| ${m.projeto} | ${m.marco} | ${sr.emoji} | ${dm.emoji} | ${m.diverge} |`);
    }
  }
  L.push("");

  // Por plataforma → projeto
  const plataformas = [...new Set(MARCOS.map((m) => m.plataforma))];
  for (const plat of plataformas) {
    L.push(`## 🧭 ${plat}`);
    L.push("");
    const projetos = [...new Set(evaluated.filter((m) => m.plataforma === plat).map((m) => m.projeto))];
    for (const proj of projetos) {
      const rows = evaluated.filter((m) => m.plataforma === plat && m.projeto === proj);
      const ok = rows.filter((r) => r.detected === "encontrado").length;
      L.push(`### ${proj} — ${ok}/${rows.length} com evidência`);
      L.push("");
      L.push("| Sprint | Marco | Dono | Roadmap | Código | Evidência |");
      L.push("|:--:|---|:--:|:--:|:--:|---|");
      for (const m of rows) {
        const sr = STATUS_META[m.statusRoadmap] || { emoji: "?" };
        const dm = DETECTED_META[m.detected];
        let ev = m.evidence.length ? m.evidence.slice(0, 3).join("; ") : "—";
        if (m.docsFound && m.docsFound.length) ev += ` · 📄 ${m.docsFound.slice(0, 2).join(", ")}`;
        L.push(
          `| ${m.sprint || "—"} | ${m.marco} | ${m.dono || "—"} | ${sr.emoji} | ${dm.emoji} | ${ev} |`
        );
      }
      L.push("");
    }
  }

  // Atividade recente (frescor)
  L.push("## 🔧 Atividade recente no repo");
  L.push("");
  if (commits.length === 0) {
    L.push("_Sem histórico git disponível._");
  } else {
    for (const c of commits) L.push(`- \`${c.hash}\` ${c.subject} — ${c.date}`);
  }
  L.push("");

  // Rodapé
  L.push("---");
  L.push("");
  L.push("### Como este relatório funciona");
  L.push("");
  L.push("- **Fonte do roadmap:** marcos curados em `03_Roadmap_e_Backlog/Roadmap_Visual` (P1–P5).");
  L.push("- **Fonte do código:** varredura de `src/` do repo `psa-consultores`.");
  L.push("- **Lista de marcos e regras de detecção:** `scripts/status-report.config.mjs` (atualize quando o roadmap mudar).");
  L.push("- **Gatilho:** hooks git `post-commit` e `post-merge`. Manual: `node scripts/gen-status-report.mjs`.");
  L.push("");
  L.push(`_Legenda — Roadmap: 🟢 pronto/validação · 🟡 parcial · ⚪ a construir. ` +
    `Código: ✅ evidência · 🟨 parcial · ⬜ sem evidência._`);
  L.push("");

  // ------------------------ saída máquina: status.json ------------------------
  const curNum = sprintMaxNum(sprint);
  const fileDateMap = buildFileDateMap();
  const marcosJson = evaluated.map((m) => {
    const pend = pendenciasCount(m);
    const codigo = codigoState(m.detected, pend);
    const roadmap = roadmapToJson(m.statusRoadmap);
    const deadline = sprintMaxNum(m.sprint);
    // atraso: sprint-alvo já passou E sem evidência — nunca p/ estudos (detectavel:false).
    const atraso =
      !!m.detectavel && codigo === "sem_evidencia" && deadline != null && curNum != null && deadline < curNum;
    const hasCode = codigo === "no_ar" || codigo === "ajuste";
    const divergencia = (roadmap === "no_ar" && codigo === "sem_evidencia") || (roadmap === "novo" && hasCode);
    const docs = m.docsFound || [];
    let acao = null;
    if (atraso) acao = `atraso: sprint-alvo ${m.sprint} passou sem evidência no código`;
    else if (divergencia && roadmap === "novo") acao = "roadmap diz 'novo', mas há código — atualizar p/ parcial ou ajuste";
    else if (divergencia && roadmap === "no_ar") acao = "roadmap diz 'no ar', mas sem evidência no código — conferir";
    else if (codigo === "sem_evidencia" && docs.length) acao = "documentado em docs/ (plano/tarefa), mas ainda sem código";
    return {
      id: m.id,
      projeto: String(m.id).split("-")[0],
      sprint_alvo: m.sprint && m.sprint !== "—" ? m.sprint : null,
      titulo: m.marco,
      dono: m.dono || null,
      tipo: m.tipo,
      roadmap,
      codigo,
      detectavel: !!m.detectavel,
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
    novo: cnt("sem_evidencia"), // "novo" = sem evidência de código (chaves da SPEC §3)
    cobertura_pct: marcosJson.length
      ? Math.round(((cnt("no_ar") + cnt("ajuste")) / marcosJson.length) * 100)
      : 0,
    atrasos: marcosJson.filter((x) => x.atraso).length,
    divergencias: marcosJson.filter((x) => x.divergencia).length,
    documentados: marcosJson.filter((x) => x.documentos_relacionados.length).length,
    extras: extras.length,
  };

  const json = {
    gerado_em: isoWithOffset(now),
    sprint_atual: sprint,
    commit: (commits[0] && commits[0].hash) || null,
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
  const { content, json, stamp, sprint } = buildReport();
  const jsonStr = JSON.stringify(json, null, 2);

  if (DRY_RUN) {
    // --dry-run + --json → imprime só o JSON (facilita inspeção); senão imprime o .md.
    if (process.argv.includes("--json")) process.stdout.write(jsonStr + "\n");
    else process.stdout.write(content + "\n");
    console.error(`\n[dry-run] rolling → ${path.join(FERRAMENTAS_DEST, ROLLING_FILE)} (+ ${JSON_FILE})`);
    if (ENTREGA)
      console.error(`[dry-run] entrega → ${path.join(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`)} (+ .json)`);
    return;
  }

  // Sempre atualiza o rolling na pasta de ferramentas (pedido original): .md (humano) + .json (máquina).
  writeFileSafe(FERRAMENTAS_DEST, ROLLING_FILE, content);
  writeFileSafe(FERRAMENTAS_DEST, JSON_FILE, jsonStr);

  // --entrega: snapshots datados imutáveis (regra de 03_Entregas).
  if (ENTREGA) {
    writeFileSafe(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`, content);
    writeFileSafe(ENTREGAS_DEST, `status_${sprint}_${stamp}.json`, jsonStr);
  }
}

main();
