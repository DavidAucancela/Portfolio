import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';

// Componente auxiliar para testear el contexto
function TestConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-btn">
        Cambiar tema
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('provee tema inicial "light" (sin preferencia guardada)', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('carga el tema guardado en localStorage ("dark")', async () => {
    localStorage.setItem('theme', 'dark');
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('toggleTheme cambia de light a dark', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme-value').textContent).toBe('light');

    await user.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });

  it('toggleTheme cambia de dark a light', async () => {
    localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');

    await user.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('persiste el tema en localStorage al hacer toggle', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    await user.click(screen.getByTestId('toggle-btn'));
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByTestId('toggle-btn'));
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('agrega la clase "dark" al documentElement cuando el tema es dark', async () => {
    localStorage.setItem('theme', 'dark');
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('remueve la clase "dark" cuando el tema es light', async () => {
    localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );
    });
    await user.click(screen.getByTestId('toggle-btn'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renderiza los children correctamente', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <p data-testid="child">Contenido hijo</p>
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child').textContent).toBe('Contenido hijo');
  });
});
