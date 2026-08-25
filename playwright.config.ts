import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke e2e read-only para validar a refatoração da camada de dados.
 * Não faz mutations — apenas navega pelas rotas tocadas e verifica que
 * renderizam sem crash (ErrorBoundary / exceção não capturada).
 *
 * ── ONDE FICA A CREDENCIAL ────────────────────────────────────────────
 * `E2E_EMAIL` / `E2E_PASSWORD`, e elas podem vir de DOIS lugares:
 *
 *   1. variável de ambiente (CI);
 *   2. o arquivo `e2e/.auth/cred.local`, lido aqui (máquina de quem desenvolve).
 *
 * O arquivo existe por um motivo prático: sem ele, a credencial tinha que ser
 * digitada a cada vez, em cada sessão — e digitar senha no chat foi o que
 * vazou uma senha do sandbox em 21/08/2026 e obrigou a trocá-la. `e2e/.auth/`
 * está no `.gitignore` (linha 89) desde antes disto, porque já guarda a sessão
 * salva do Playwright; a credencial mora ao lado dela, some do versionamento
 * pelo mesmo caminho, e NUNCA passa por transcrição de conversa.
 *
 * Formato — duas linhas, `CHAVE=valor`, sem aspas:
 *
 *     E2E_EMAIL=alguem@psaconsultores.com.br
 *     E2E_PASSWORD=asenha
 *
 * Variável de ambiente VENCE do arquivo: na CI o segredo vem do cofre, e um
 * arquivo esquecido numa máquina não deve sobrescrever isso.
 */
const ARQUIVO_CRED = 'e2e/.auth/cred.local';
if (existsSync(ARQUIVO_CRED)) {
  // Quebra por LF e `trim()` em cada linha: resolve CRLF sem regex.
  for (const linha of readFileSync(ARQUIVO_CRED, 'utf8').split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const igual = limpa.indexOf('=');
    if (igual < 1) continue;
    const chave = limpa.slice(0, igual).trim();
    const valor = limpa.slice(igual + 1).trim();
    // Só preenche o que está vazio: ambiente ganha do arquivo (ver acima).
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

const PORT = 8080;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'smoke',
      testMatch: /\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
