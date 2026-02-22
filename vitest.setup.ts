import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// ── Mock next/image ───────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  default: function MockImage({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    sizes: _sizes,
    className,
    style,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    className?: string;
    style?: React.CSSProperties;
  }) {
    // Devuelve un <img> como React element válido (no DOM node)
    return React.createElement('img', { src, alt, className, style });
  },
}));

// ── Mock next/link ────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: function MockLink({
    children,
    href,
    target,
    rel,
    'aria-label': ariaLabel,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    target?: string;
    rel?: string;
    'aria-label'?: string;
    className?: string;
    onClick?: React.MouseEventHandler;
  }) {
    return React.createElement(
      'a',
      { href, target, rel, 'aria-label': ariaLabel, className, onClick },
      children,
    );
  },
}));

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── matchMedia mock ───────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── IntersectionObserver mock (requerido por Framer Motion whileInView) ────────
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];
  constructor() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// ── ResizeObserver mock (requerido por Framer Motion) ─────────────────────────
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// ── window.dispatchEvent captura ──────────────────────────────────────────────
// Permitir pruebas del custom event command-palette:open
globalThis.dispatchEvent = vi.fn(globalThis.dispatchEvent.bind(globalThis));
