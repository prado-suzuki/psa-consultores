import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

/**
 * Smoke read-only: navega por cada rota tocada pela refatoração e verifica
 * que a tela renderiza sem crash. NÃO clica em botões que mutam dados.
 *
 * Falha dura em:
 *  - exceção JS não capturada (pageerror)
 *  - ErrorBoundary exibido ("Algo deu errado")
 *
 * Coleta (não falha) console.error para inspeção — ruído de rede é filtrado.
 */

const ERROR_BOUNDARY_TEXT = 'Algo deu errado';
const ACCESS_DENIED_TEXT = 'Você não tem permissão para acessar esta página';

// Ruído benigno que não indica regressão de render.
const CONSOLE_IGNORE = [
  /favicon/i,
  /Failed to load resource/i,
  /ResizeObserver loop/i,
  /React DevTools/i,
  /\[vite\]/i,
  /Download the React DevTools/i,
];

for (const route of ROUTES) {
  test(`render OK: ${route.label} (${route.path})`, async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
      consoleErrors.push(text);
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    // dá tempo para React Query resolver e a UI assentar
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(600);

    const bodyText = (await page.locator('body').innerText().catch(() => '')) ?? '';
    const accessDenied = bodyText.includes(ACCESS_DENIED_TEXT);

    if (accessDenied) {
      testInfo.annotations.push({ type: 'skip-reason', description: 'PageAccessGate: sem permissão' });
      test.skip(true, 'Usuário sem acesso a esta página (não é crash)');
    }

    // 1) nenhuma exceção não capturada
    expect(pageErrors, `Exceções JS em ${route.path}:\n${pageErrors.join('\n')}`).toEqual([]);

    // 2) ErrorBoundary não disparou
    await expect(
      page.getByText(ERROR_BOUNDARY_TEXT, { exact: false }),
      `ErrorBoundary disparou em ${route.path}`
    ).toHaveCount(0);

    // 3) console.error vira anotação (sinal fraco, não quebra o build)
    if (consoleErrors.length) {
      testInfo.annotations.push({
        type: 'console-error',
        description: consoleErrors.slice(0, 10).join(' | '),
      });
    }
  });
}
