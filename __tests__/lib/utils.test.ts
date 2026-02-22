import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateRange } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// cn() — combina clases con clsx
// ─────────────────────────────────────────────────────────────────────────────
describe('cn()', () => {
  it('combina clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('omite valores falsy (undefined, null, false)', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('acepta objetos condicionales', () => {
    expect(cn({ active: true, hidden: false })).toBe('active');
  });

  it('combina strings y objetos', () => {
    expect(cn('base', { extra: true })).toBe('base extra');
  });

  it('retorna string vacío sin argumentos', () => {
    expect(cn()).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDate() — formato es-ES
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDate()', () => {
  // Usamos el día 15 para evitar timezone-shift (UTC ± offset puede cambiar el día 1)
  it('formatea septiembre en español', () => {
    const result = formatDate('2025-09-15');
    expect(result).toContain('2025');
    expect(result.toLowerCase()).toContain('septiembre');
  });

  it('formatea enero correctamente', () => {
    const result = formatDate('2026-01-15');
    expect(result.toLowerCase()).toContain('enero');
    expect(result).toContain('2026');
  });

  it('formatea diciembre correctamente', () => {
    const result = formatDate('2025-12-15');
    expect(result.toLowerCase()).toContain('diciembre');
  });

  it('incluye el año en el resultado', () => {
    expect(formatDate('2024-06-15')).toContain('2024');
    expect(formatDate('2025-06-15')).toContain('2025');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDateRange() — rango de fechas
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDateRange()', () => {
  it('muestra "Presente" cuando no hay fecha de fin', () => {
    const result = formatDateRange('2025-09-15');
    expect(result).toContain('Presente');
    expect(result).toContain('2025');
  });

  it('muestra rango completo cuando hay fecha de fin', () => {
    // Usar día 15 para evitar timezone-shift
    const result = formatDateRange('2025-09-15', '2026-01-15');
    expect(result).toContain('2025');
    expect(result).toContain('2026');
    expect(result).toContain(' - ');
    expect(result).not.toContain('Presente');
  });

  it('el inicio siempre aparece antes del fin', () => {
    const result = formatDateRange('2025-01-01', '2025-12-31');
    const parts = result.split(' - ');
    expect(parts).toHaveLength(2);
    expect(parts[0]).not.toBe(parts[1]);
  });
});
