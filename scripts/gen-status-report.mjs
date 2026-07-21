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

  // Texto de roteamento (rotas registradas).
  const routeText =
    readSafe(path.join(REPO_ROOT, "src", "App.tsx")) +
    "\n" +
    readSafe(path.join(REPO_ROOT, "src", "config", "protectedPages.ts"));

  return { fileList, contents, routeText };
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

  return { detected, evidence };
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
    const { detected, evidence } = detectMarco(m, idx);
    return { ...m, detected, evidence, diverge: divergence(m, detected) };
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
        const ev = m.evidence.length ? m.evidence.slice(0, 3).join("; ") : "—";
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

  return { content: L.join("\n"), stamp, sprint };
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
  const { content, stamp, sprint } = buildReport();

  if (DRY_RUN) {
    process.stdout.write(content + "\n");
    console.error(`\n[dry-run] rolling → ${path.join(FERRAMENTAS_DEST, ROLLING_FILE)}`);
    if (ENTREGA)
      console.error(`[dry-run] entrega → ${path.join(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`)}`);
    return;
  }

  // Sempre atualiza o rolling na pasta de ferramentas (pedido original).
  writeFileSafe(FERRAMENTAS_DEST, ROLLING_FILE, content);

  // --entrega: snapshot datado imutável (regra de 03_Entregas).
  if (ENTREGA) {
    writeFileSafe(ENTREGAS_DEST, `Status_Desenvolvimento_${sprint}_${stamp}.md`, content);
  }
}

main();
