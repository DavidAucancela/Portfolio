import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

function renderWithTheme(initialTheme?: 'light' | 'dark') {
  if (initialTheme) {
    localStorage.setItem('theme', initialTheme);
  }
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renderiza el botón', async () => {
    await act(async () => { renderWithTheme('light'); });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('tiene aria-label "Activar modo oscuro" cuando el tema es light', async () => {
    await act(async () => { renderWithTheme('light'); });
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toBe('Activar modo oscuro');
  });

  it('tiene aria-label "Activar modo claro" cuando el tema es dark', async () => {
    await act(async () => { renderWithTheme('dark'); });
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toBe('Activar modo claro');
  });

  it('al hacer click cambia el aria-label', async () => {
    const user = userEvent.setup();
    await act(async () => { renderWithTheme('light'); });
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toBe('Activar modo oscuro');

    await user.click(btn);
    expect(btn.getAttribute('aria-label')).toBe('Activar modo claro');
  });

  it('el botón tiene texto de screen reader', async () => {
    await act(async () => { renderWithTheme('light'); });
    expect(screen.getByText('Activar modo oscuro')).toBeInTheDocument();
  });

  it('aceptar className adicional', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeToggle className="custom-class" />
        </ThemeProvider>
      );
    });
    const btn = screen.getByRole('button');
    expect(btn.classList.contains('custom-class')).toBe(true);
  });
});
