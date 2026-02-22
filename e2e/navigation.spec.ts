import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Navegación y rutas
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Navegación principal', () => {
  test('la página de inicio carga correctamente', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jonathan/i);
    // El hero debe estar visible
    await expect(page.locator('section').first()).toBeVisible();
  });

  test('la barra de navegación está siempre visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
  });

  test('navega a /projects correctamente', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/projects"]');
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navega a /about correctamente', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');
  });

  test('navega a /contact correctamente', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/contact"]');
    await expect(page).toHaveURL('/contact');
  });

  test('el link del logo vuelve al inicio', async ({ page }) => {
    await page.goto('/projects');
    await page.click('a[aria-label*="Inicio"]');
    await expect(page).toHaveURL('/');
  });

  test('los proyectos de la home enlazan a sus páginas de detalle', async ({ page }) => {
    await page.goto('/');
    // Click en el primer "Ver detalles"
    const firstDetailsLink = page.locator('a[aria-label^="Ver detalles de"]').first();
    const href = await firstDetailsLink.getAttribute('href');
    await firstDetailsLink.click();
    await expect(page).toHaveURL(href!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proyectos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Página de proyectos', () => {
  test('muestra proyectos en la grid', async ({ page }) => {
    await page.goto('/projects');
    const cards = page.locator('[class*="ProjectCard"], a[aria-label^="Ver detalles"]');
    await expect(cards.first()).toBeVisible();
  });

  test('los filtros de categoría funcionan', async ({ page }) => {
    await page.goto('/projects');
    // Click en el botón P1
    const p1Button = page.locator('button[aria-pressed]').filter({ hasText: /P1|Principal/i });
    if (await p1Button.count() > 0) {
      await p1Button.first().click();
      // Esperar que el conteo de resultados se actualice
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    }
  });

  test('las páginas de detalle de proyectos cargan', async ({ page }) => {
    await page.goto('/projects/ubapp');
    // El título debe estar presente
    await expect(page.locator('h1')).toContainText(/UBApp/i);
  });

  test('el breadcrumb de detalle enlaza de vuelta a proyectos', async ({ page }) => {
    await page.goto('/projects/ubapp');
    const backLink = page.locator('a[href="/projects"]');
    await expect(backLink.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Links externos (no-follows)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Links externos', () => {
  test('los links de GitHub tienen rel=noopener noreferrer', async ({ page }) => {
    await page.goto('/');
    const githubLinks = page.locator('a[href*="github.com"]');
    const count = await githubLinks.count();
    for (let i = 0; i < count; i++) {
      const rel = await githubLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  test('links de GitHub abren en nueva pestaña', async ({ page }) => {
    await page.goto('/projects/ubapp');
    const githubLink = page.locator('a[href*="github.com"]').first();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Footer', () => {
  test('el footer es visible en la home', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('los links sociales del footer tienen aria-label', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').scrollIntoViewIfNeeded();
    const socialLinks = page.locator('footer a[aria-label]');
    await expect(socialLinks.first()).toBeVisible();
  });
});
