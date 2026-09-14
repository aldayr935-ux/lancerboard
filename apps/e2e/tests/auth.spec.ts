import { test, expect } from '@playwright/test';

test.describe('Registro', () => {
  test('un usuario nuevo puede registrarse y llega al dashboard', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await page.goto('/register');

    await page.getByLabel('Nombre').fill('Usuario de Prueba');
    await page.getByLabel('Correo').fill(uniqueEmail);
    await page.getByLabel('Contraseña').fill('123456');

    await page.getByRole('button', { name: 'Registrarme' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Hola, Usuario de Prueba' })).toBeVisible();
  });
});

test.describe('Login', () => {
  const email = `login-test-${Date.now()}@example.com`;
  const password = '123456';

  test.beforeAll(async ({ browser }) => {
    // Crea el usuario una sola vez antes de todos los tests de este describe
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByLabel('Nombre').fill('Usuario Login');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page).toHaveURL('/dashboard');
    await page.close();
  });

  test('un usuario existente puede iniciar sesión', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Hola, Usuario Login' })).toBeVisible();
  });

  test('muestra error con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});