import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('autenticar usuario de prueba', async ({ page }) => {
  const email = `e2e-user-${Date.now()}@example.com`;
  const password = '123456';

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Usuario E2E');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Registrarme' }).click();

  await expect(page).toHaveURL('/dashboard');

  // Guarda cookies + localStorage (JWT) en un archivo
  await page.context().storageState({ path: authFile });
});