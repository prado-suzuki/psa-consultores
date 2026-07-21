import { test, expect } from '@playwright/test';
import { installWriteGuard } from './writeGuard';

/**
 * Interações sem mutação: botões que só mexem em UI (abrir/fechar modais).
 * Prova que o wiring botão → estado → modal sobreviveu à refatoração.
 * writeGuard instalado por segurança — nada deve escrever, e se tentar, é bloqueado.
 */

test.describe('interações sem mutação', () => {
  test('Projetos: botão "Novo Projeto" abre e fecha o modal', async ({ page }) => {
    const writes = await installWriteGuard(page);
    await page.goto('/equipe/projetos');
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.getByRole('button', { name: /Novo Projeto/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Criar Novo Projeto')).toBeVisible();
    await expect(dialog.locator('#name')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    expect(writes, 'abrir/fechar modal não pode gerar escrita').toEqual([]);
  });

  test('Processos: botão "Novo Processo" abre o modal', async ({ page }) => {
    const writes = await installWriteGuard(page);
    await page.goto('/equipe/processos');
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.getByRole('button', { name: /Novo Processo/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    expect(writes, 'abrir modal não pode gerar escrita').toEqual([]);
  });
});
