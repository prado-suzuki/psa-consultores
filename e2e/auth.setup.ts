import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
/** Área usada só para passar pelo login; a maioria das rotas-alvo é Digital. */
const AREA = process.env.E2E_AREA ?? 'Digital';

setup('autenticar via UI e salvar sessão', async ({ page }) => {
  expect(EMAIL, 'defina E2E_EMAIL no ambiente').toBeTruthy();
  expect(PASSWORD, 'defina E2E_PASSWORD no ambiente').toBeTruthy();

  await page.goto('/equipe');

  // Passo 1: selecionar área (Radix Select)
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: AREA, exact: true }).click();

  // Passo 2: credenciais
  await page.locator('#email').fill(EMAIL!);
  await page.locator('#password').fill(PASSWORD!);
  await page.getByRole('button', { name: /Entrar/i }).click();

  // Sucesso => navega para a landing da área (ex.: /equipe/digital).
  // Se der "sem acesso", o toast aparece e a URL continua em /equipe.
  await expect(page, 'login não navegou — verifique credenciais/acesso à área').not.toHaveURL(
    /\/equipe$/,
    { timeout: 20_000 }
  );

  await page.context().storageState({ path: AUTH_FILE });
});
