#!/usr/bin/env node
// @ts-check
/**
 * install-status-hooks.mjs
 * -------------------------------------------------------------------------
 * Instala os hooks git que atualizam o Status de Desenvolvimento:
 *   - post-commit : dispara quando você faz um commit local
 *   - post-merge  : dispara quando o GitHub Desktop puxa (pull) commits do
 *                   Lovable (merge/fast-forward) — sem isso, metade das
 *                   atualizações passaria batido.
 *
 * Os hooks NUNCA bloqueiam a operação do git (sempre exit 0) e não fazem
 * nada se o `node` não estiver no PATH ou se o Drive não estiver montado.
 *
 * Uso: node scripts/install-status-hooks.mjs
 * -------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function gitHooksDir() {
  try {
    const gitDir = execSync("git rev-parse --git-dir", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const abs = path.isAbsolute(gitDir) ? gitDir : path.join(REPO_ROOT, gitDir);
    return path.join(abs, "hooks");
  } catch {
    return path.join(REPO_ROOT, ".git", "hooks");
  }
}

const HOOK_BODY = `#!/bin/sh
# >>> PSA status-report (auto-gerado por scripts/install-status-hooks.mjs) >>>
# Atualiza o STATUS_DESENVOLVIMENTO no Drive. NUNCA bloqueia o git.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0
command -v node >/dev/null 2>&1 || exit 0
node scripts/gen-status-report.mjs || true
exit 0
# <<< PSA status-report <<<
`;

function installHook(hooksDir, name) {
  const target = path.join(hooksDir, name);
  // Se já existe um hook do usuário sem nossa marca, avisa e não sobrescreve.
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, "utf8");
    if (!existing.includes("PSA status-report")) {
      console.error(
        `⚠️  Já existe um hook '${name}' que NÃO é nosso. Não sobrescrevi.\n` +
          `   Adicione manualmente esta linha a ${target}:\n` +
          `     node scripts/gen-status-report.mjs || true`
      );
      return;
    }
  }
  fs.writeFileSync(target, HOOK_BODY, "utf8");
  try {
    fs.chmodSync(target, 0o755);
  } catch {
    /* Windows pode ignorar chmod; git ainda executa via shebang */
  }
  console.log(`✅ Hook instalado: ${target}`);
}

function main() {
  const hooksDir = gitHooksDir();
  fs.mkdirSync(hooksDir, { recursive: true });
  installHook(hooksDir, "post-commit");
  installHook(hooksDir, "post-merge");
  console.log(
    "\nPronto. A cada commit local (post-commit) e a cada pull do Lovable (post-merge),\n" +
      "o relatório é regenerado em 04_Ferramentas/PSA WORK/03_Build/STATUS_DESENVOLVIMENTO.md.\n" +
      "Gerar o relatório final da sprint (03_Entregas): node scripts/gen-status-report.mjs --entrega"
  );
}

main();
