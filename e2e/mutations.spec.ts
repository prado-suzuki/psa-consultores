import { test, expect } from '@playwright/test';
import { installWriteGuard } from './writeGuard';

/**
 * Wiring de mutação: prova que os botões de criar continuam ligados ao
 * data layer refatorado (botão → hook useDomain* → supabase.from().insert()).
 *
 * Toda escrita é interceptada (writeGuard) — NADA é gravado em produção.
 * A prova é: (1) a requisição correta foi disparada à tabela certa e
 * (2) a UI reagiu com sucesso.
 */

test.describe('wiring de mutação (rede interceptada — zero escrita real)', () => {
  test('Nova Tarefa → dispara POST em tasks', async ({ page }) => {
    const writes = await installWriteGuard(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/equipe/tarefas/nova');
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.locator('#title').fill('E2E smoke — pode ignorar');

    // Cluster (1º combobox do form) — obrigatório
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Frontend' }).click();

    await page.getByRole('button', { name: /Criar Tarefa/i }).click();

    await expect
      .poll(() => writes.filter((w) => w.method === 'POST' && w.table === 'tasks').length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    // UI reagiu (toast de sucesso)
    await expect(page.getByText('Tarefa criada!').first()).toBeVisible({ timeout: 5_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Novo Projeto → dispara POST em projects', async ({ page }) => {
    const writes = await installWriteGuard(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/equipe/projetos');
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.getByRole('button', { name: /Novo Projeto/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Criar Novo Projeto')).toBeVisible();

    await dialog.locator('#name').fill('E2E smoke — pode ignorar');

    // Cluster é obrigatório: seleciona a 1ª opção disponível
    await dialog.getByRole('combobox').first().click();
    const firstOption = page.getByRole('option').first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    await dialog.getByRole('button', { name: /Criar Projeto/i }).click();

    await expect
      .poll(() => writes.filter((w) => w.method === 'POST' && w.table === 'projects').length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
