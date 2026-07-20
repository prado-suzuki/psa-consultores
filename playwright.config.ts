import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke e2e read-only para validar a refatoração da camada de dados.
 * Não faz mutations — apenas navega pelas rotas tocadas e verifica que
 * renderizam sem crash (ErrorBoundary / exceção não capturada).
 *
 * Credenciais vêm de env (E2E_EMAIL / E2E_PASSWORD) — nunca commitadas.
 */
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
