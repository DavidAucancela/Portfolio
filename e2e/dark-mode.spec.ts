import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dark Mode — ThemeToggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Limpia localStorage antes de cada test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload();
  });

  test('el botón de tema está presente en la nav', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="modo"]').first();
    await expect(themeBtn).toBeVisible();
  });

  test('al hacer click el tema cambia a dark', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="modo oscuro"]').first();
    await themeBtn.click();
    // La clase "dark" se agrega al <html>
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);
  });

  test('el tema persiste en localStorage', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="modo oscuro"]').first();
    await themeBtn.click();
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });

  test('el tema persiste al recargar la página', async ({ page }) => {
    // Activa dark mode
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);
  });

  test('hacer toggle dos veces vuelve al modo light', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="modo oscuro"]').first();
    await themeBtn.click(); // → dark
    const lightBtn = page.locator('button[aria-label*="modo claro"]').first();
    await lightBtn.click(); // → light
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });

  test('el aria-label del botón cambia según el tema', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="modo"]').first();
    const initialLabel = await themeBtn.getAttribute('aria-label');
    await themeBtn.click();
    const newLabel = await themeBtn.getAttribute('aria-label');
    expect(initialLabel).not.toBe(newLabel);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Command Palette — ⌘K
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Command Palette', () => {
  test('el botón de búsqueda está en la nav desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const searchBtn = page.locator('button[aria-label="Abrir búsqueda"]');
    await expect(searchBtn).toBeVisible();
  });

  test('el command palette se abre con el botón', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const searchBtn = page.locator('button[aria-label="Abrir búsqueda"]');
    await searchBtn.click();
    // El dialog/overlay debe aparecer
    const palette = page.locator('[role="dialog"], [role="combobox"], input[placeholder*="Buscar"]');
    await expect(palette.first()).toBeVisible({ timeout: 2000 });
  });

  test('Escape cierra el command palette', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.click('button[aria-label="Abrir búsqueda"]');
    await page.keyboard.press('Escape');
    // El overlay debe desaparecer
    const overlay = page.locator('[role="dialog"]');
    await expect(overlay).not.toBeVisible({ timeout: 2000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility básica
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Accesibilidad', () => {
  test('las imágenes de proyectos tienen atributo alt', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('main img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(0);
    }
  });

  test('los botones tienen texto accesible (aria-label o texto visible)', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      // Debe tener aria-label o texto no vacío
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });

  test('el nav tiene aria-label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav[aria-label]')).toBeVisible();
  });

  test('existe exactamente un <h1> por página', async ({ page }) => {
    for (const route of ['/', '/projects', '/about', '/contact']) {
      await page.goto(route);
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${route} debería tener exactamente 1 h1`).toBe(1);
    }
  });

  test('los campos de formulario de contacto tienen labels', async ({ page }) => {
    await page.goto('/contact');
    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = (await label.count()) > 0;
          expect(hasLabel || ariaLabel, `Input #${id} debe tener label o aria-label`).toBeTruthy();
        }
      }
    }
  });
});
