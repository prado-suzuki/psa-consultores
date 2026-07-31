import { test, expect } from '@playwright/test';

/**
 * Trava do gate de primeiro acesso.
 *
 * Um usuário com `must_change_password = true` é mandado para /primeiro-acesso
 * no login. `ProtectedRoute`, `AdminRoute`, `LiderRoute` e `GestaoAccessGate`
 * repetem essa checagem — mas `PageAccessGate` (o gate da maioria das rotas de
 * área) não. Resultado: a troca de senha obrigatória é contornável por URL,
 * bastando digitar o caminho de qualquer página sob `PageAccessGate`.
 *
 * O teste é read-only: só navega e compara redirecionamento.
 *
 * Precisa de sessão limpa (o login faz parte da prova), então ignora o
 * storageState do projeto.
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const AREA = process.env.E2E_AREA ?? 'Tax';

/** Rotas sob PageAccessGate — nenhuma checa mustChangePassword hoje. */
const ROTAS_PAGE_ACCESS_GATE = [
  '/equipe/tax/projetos/tarefas',
  '/equipe/tax/projetos/cadastro',
  '/equipe/tax/projetos/feed',
];

/** Contraste: rota sob ProtectedRoute, que checa e redireciona. */
const ROTA_PROTECTED_ROUTE = '/equipe/tax';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('gate de primeiro acesso (must_change_password)', () => {
  test('rotas sob PageAccessGate não devem ser alcançáveis antes da troca de senha', async ({
    page,
  }) => {
    test.skip(!EMAIL || !PASSWORD, 'defina E2E_EMAIL/E2E_PASSWORD');

    await page.goto('/equipe');
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: AREA, exact: true }).click();
    await page.locator('#email').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);
    await page.getByRole('button', { name: /Entrar/i }).click();

    // A prova só existe se a conta estiver de fato marcada para trocar senha.
    // Se o flag já foi limpo, o cenário não se aplica — não é falha.
    await page.waitForURL(/\/(primeiro-acesso|equipe\/)/, { timeout: 30_000 });
    test.skip(
      !/\/primeiro-acesso/.test(page.url()),
      'conta de teste não está com must_change_password = true',
    );

    // Referência: ProtectedRoute devolve o usuário ao gate.
    await page.goto(ROTA_PROTECTED_ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/primeiro-acesso/);

    // O que quebra: PageAccessGate renderiza a página da área normalmente.
    for (const rota of ROTAS_PAGE_ACCESS_GATE) {
      await page.goto(rota, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page, `${rota} deveria voltar para /primeiro-acesso`).toHaveURL(
        /\/primeiro-acesso/,
      );
    }
  });
});
