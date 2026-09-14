import { test, expect } from '@playwright/test';

test.describe('Flujo completo de negocio', () => {
  test('crear cliente → proyecto → tarea → registrar horas → generar factura', async ({ page }) => {
    // 1. Crear cliente desde el dashboard
    await page.goto('/dashboard');

    const clientName = `Cliente E2E ${Date.now()}`;
    await page.getByLabel('Nombre').fill(clientName);
    await page.getByRole('button', { name: 'Agregar cliente' }).click();

    await expect(page.getByText(clientName)).toBeVisible();

    // 2. Entrar al detalle del cliente
    await page.getByRole('link', { name: clientName }).click();
    await expect(page).toHaveURL(/\/clients\/.+/);
    await expect(page.getByRole('heading', { name: clientName })).toBeVisible();

    // 3. Crear proyecto con tarifa por hora
    const projectName = `Proyecto E2E ${Date.now()}`;
    await page.getByPlaceholder('Nombre del proyecto').fill(projectName);
    await page.getByPlaceholder('Tarifa por hora (opcional)').fill('20');
    await page.getByRole('button', { name: 'Agregar proyecto' }).click();

    await expect(page.getByText(projectName)).toBeVisible();

    // 4. Entrar al detalle del proyecto
    await page.getByRole('link', { name: projectName }).click();
    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    // 5. Crear una tarea
    const taskTitle = `Tarea E2E ${Date.now()}`;
    await page.getByPlaceholder('Nueva tarea').fill(taskTitle);
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText(taskTitle)).toBeVisible();

    // 6. Registrar horas en esa tarea
    const taskItem = page.locator('li', { hasText: taskTitle });
    await taskItem.getByPlaceholder('Horas').fill('5');
    await taskItem.getByRole('button', { name: 'Registrar tiempo' }).click();

    await expect(page.getByText('Se registraron 5 horas correctamente')).toBeVisible();

    // 7. Generar factura y validar el total calculado (5h * $20 = $100)
    await page.getByRole('button', { name: 'Generar factura' }).click();

    await expect(page.getByText(/generada con 5 horas — total: \$100/)).toBeVisible();
  });
});