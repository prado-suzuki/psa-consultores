#!/usr/bin/env node
/**
 * `bun run e2e:osg` — roda, num comando só e sem ninguém dirigindo o navegador,
 * as duas conferências do fluxo OSG:
 *
 *   1. o ensaio da ALTERAÇÃO CONTRATUAL (`e2e/demos/ac-alteracao-contratual.mjs`),
 *      em modo headless, sem as pausas de plateia;
 *   2. o spec de DOWNLOAD do contrato (`e2e/osgBaixarDocumento.spec.ts`), que
 *      abre o .docx baixado e confere o texto lá dentro.
 *
 * POR QUE ELE SOBE O PRÓPRIO SERVIDOR. O alvo do app é decidido pela branch, em
 * tempo de execução, dentro do `vite.config.ts`: `main` fala com PRODUÇÃO, o
 * resto com o sandbox. Um `bun run dev` já de pé na 8080 pode ter sido iniciado
 * de OUTRO worktree — inclusive do checkout em `main` — e o
 * `reuseExistingServer` do Playwright reusaria esse servidor sem dizer nada. O
 * ensaio da AC escreve (valida versão, registra na junta): reusar o servidor
 * errado seria escrever em produção. Então este script:
 *
 *   - se recusa a rodar em branch de produção;
 *   - usa uma porta própria (8099), fora do caminho do seu `dev`;
 *   - confere, pelo bundle servido, que o app naquela porta aponta mesmo para o
 *     sandbox, e aborta se não apontar.
 *
 * MODOS
 *   (nenhum)        os dois, na ordem: download e depois a AC.
 *   --so-download   só o spec de download.
 *   --so-ac         só o ensaio da alteração contratual.
 *   --porta N       porta do servidor deste script (default 8099).
 *
 * CREDENCIAL. Sai de `e2e/.auth/cred.local` (E2E_EMAIL / E2E_PASSWORD), o mesmo
 * arquivo que o `playwright.config.ts` lê. Se este worktree não tiver o seu — a
 * pasta é gitignored e não acompanha `git worktree add` —, o script procura o do
 * checkout principal e diz que está usando aquele. Variável de ambiente vence o
 * arquivo, como no resto do harness.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import path from 'node:path';

const git = (...args) =>
  spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim() ?? '';

const RAIZ = git('rev-parse', '--show-toplevel');
const BRANCH = git('rev-parse', '--abbrev-ref', 'HEAD');
const BRANCHES_DE_PRODUCAO = ['main'];

const argv = process.argv.slice(2);
const temFlag = (f) => argv.includes(f);
const valorDe = (f, padrao) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : padrao;
};

const PORTA = Number(process.env.E2E_PORT ?? valorDe('--porta', '8099'));
const BASE = `http://localhost:${PORTA}`;
const RODAR_DOWNLOAD = !temFlag('--so-ac');
const RODAR_AC = !temFlag('--so-download');

const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SAIDA = path.join(RAIZ, 'test-results', `osg-${carimbo}`);
mkdirSync(SAIDA, { recursive: true });

const erro = (msg, comoResolver) => {
  console.error(`\n✖ ${msg}`);
  if (comoResolver) console.error(`  ${comoResolver}`);
  process.exit(1);
};

// ─── 1. Branch ─────────────────────────────────────────────────────────────
// A trava é aqui, e não só no aviso: o ensaio da AC escreve de verdade.
if (BRANCHES_DE_PRODUCAO.includes(BRANCH)) {
  erro(
    `este checkout está em "${BRANCH}", que aponta para PRODUÇÃO.`,
    'Rode de um worktree em branch de trabalho (develop, feature/...), onde o app fala com o sandbox.',
  );
}

// ─── 2. Credencial ─────────────────────────────────────────────────────────
function lerPares(arquivo) {
  const pares = {};
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const i = limpa.indexOf('=');
    if (i < 1) continue;
    pares[limpa.slice(0, i).trim()] = limpa.slice(i + 1).trim();
  }
  return pares;
}

function credencial() {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    return { E2E_EMAIL: process.env.E2E_EMAIL, E2E_PASSWORD: process.env.E2E_PASSWORD };
  }
  // O `--git-common-dir` aponta para o .git do checkout principal, mesmo daqui
  // de dentro de um worktree: o diretório acima dele é aquele checkout.
  const principal = path.dirname(path.resolve(RAIZ, git('rev-parse', '--git-common-dir')));
  for (const arquivo of [
    path.join(RAIZ, 'e2e/.auth/cred.local'),
    path.join(principal, 'e2e/.auth/cred.local'),
  ]) {
    if (!existsSync(arquivo)) continue;
    const pares = lerPares(arquivo);
    if (!pares.E2E_EMAIL || !pares.E2E_PASSWORD) continue;
    if (arquivo !== path.join(RAIZ, 'e2e/.auth/cred.local')) {
      console.log(`credencial  ${pares.E2E_EMAIL} (de ${arquivo})`);
    }
    return pares;
  }
  erro(
    'não achei E2E_EMAIL / E2E_PASSWORD.',
    'Crie e2e/.auth/cred.local (duas linhas CHAVE=valor) ou exporte as variáveis. Ver docs/geral/validar-no-app-rodando.md.',
  );
}

const CRED = credencial();

// ─── 3. Servidor ───────────────────────────────────────────────────────────
const SANDBOX = (lerPares(path.join(RAIZ, '.env.sandbox')).VITE_SUPABASE_URL ?? '').trim();
if (!SANDBOX) erro('.env.sandbox não declara VITE_SUPABASE_URL — não sei qual é o sandbox.');

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

async function respondendo() {
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2_000) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Para onde o app SERVIDO naquela porta aponta. Lê do bundle, não do disco: o
 * alvo entra por `define` do Vite quando o servidor sobe, então o arquivo
 * transformado é a única fonte que responde pelo processo que está de pé.
 */
async function alvoDoServidor() {
  const r = await fetch(`${BASE}/src/integrations/supabase/client.ts`, {
    signal: AbortSignal.timeout(5_000),
  });
  const texto = await r.text();
  return [...new Set(texto.match(/https:\/\/[a-z0-9]+\.supabase\.co/g) ?? [])];
}

let servidor = null;

async function garantirServidor() {
  if (await respondendo()) {
    console.log(`servidor    reusando o que já está em ${BASE}`);
  } else {
    const log = path.join(SAIDA, 'dev-server.log');
    const fd = openSync(log, 'a');
    const gerenciador = spawnSync('bun', ['--version']).status === 0 ? 'bun' : 'npm';
    console.log(`servidor    subindo (${gerenciador} run dev --port ${PORTA}) — log em ${log}`);
    servidor = spawn(gerenciador, ['run', 'dev', '--', '--port', String(PORTA), '--strictPort'], {
      cwd: RAIZ,
      stdio: ['ignore', fd, fd],
    });
    const limite = Date.now() + 120_000;
    while (Date.now() < limite) {
      if (servidor.exitCode !== null) erro(`o servidor morreu ao subir. Veja ${log}.`);
      if (await respondendo()) break;
      await dorme(500);
    }
    if (!(await respondendo())) erro(`o servidor não respondeu em ${BASE} em 120s. Veja ${log}.`);
  }

  const alvos = await alvoDoServidor();
  if (alvos.length !== 1 || alvos[0] !== SANDBOX) {
    derrubarServidor();
    erro(
      `o app em ${BASE} aponta para ${alvos.join(', ') || '(não consegui ler)'}, e não para o sandbox (${SANDBOX}).`,
      'Provavelmente há um dev de outro worktree nessa porta. Use --porta N ou derrube aquele servidor.',
    );
  }
  console.log(`banco       ${SANDBOX} (sandbox)`);
}

function derrubarServidor() {
  if (!servidor || servidor.exitCode !== null) return;
  servidor.kill('SIGTERM');
}

// ─── 4. Passos ─────────────────────────────────────────────────────────────
const resultados = [];

function passo(nome, comando, args, env) {
  console.log(`\n─── ${nome} ${'─'.repeat(Math.max(0, 60 - nome.length))}`);
  const r = spawnSync(comando, args, {
    cwd: RAIZ,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  const ok = r.status === 0;
  resultados.push({ nome, ok });
  return ok;
}

// ─── 5. Corrida ────────────────────────────────────────────────────────────
console.log(`branch      ${BRANCH}`);
console.log(`porta       ${PORTA}`);
console.log(`artefatos   ${SAIDA}`);

await garantirServidor();

try {
  if (RODAR_DOWNLOAD) {
    passo('download do contrato (.docx)', 'npx', [
      'playwright', 'test', 'e2e/osgBaixarDocumento.spec.ts', '--reporter=list',
    ], {
      ...CRED,
      E2E_PORT: String(PORTA),
      E2E_AREA: process.env.E2E_AREA ?? 'OSG',
    });
  }

  if (RODAR_AC) {
    passo('ensaio da alteração contratual', 'node', ['e2e/demos/ac-alteracao-contratual.mjs'], {
      AC_URL: BASE,
      AC_HEADLESS: '1',
      AC_EMAIL: CRED.E2E_EMAIL,
      AC_PASSWORD: CRED.E2E_PASSWORD,
      AC_OUT: path.join(SAIDA, 'ac'),
    });
  }
} finally {
  derrubarServidor();
}

console.log('\n─── resumo ───────────────────────────────────────────────────');
for (const r of resultados) console.log(`${r.ok ? '✔' : '✖'}  ${r.nome}`);
console.log(`artefatos em ${SAIDA}`);
process.exit(resultados.every((r) => r.ok) ? 0 : 1);
