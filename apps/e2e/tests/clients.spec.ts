import { test, expect } from '@playwright/test';

test.describe('Clientes', () => {
  test('un usuario autenticado puede crear un cliente', async ({ page }) => {
    await page.goto('/dashboard');

    const clientName = `Cliente Prueba ${Date.now()}`;

    await page.getByLabel('Nombre').fill(clientName);
    await page.getByRole('button', { name: 'Agregar cliente' }).click();

    await expect(page.getByText(clientName)).toBeVisible();
  });
});