'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Container from './ui/Container';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/projects', label: 'Proyectos' },
  { href: '/about', label: 'Sobre mí' },
  { href: '/contact', label: 'Contacto' },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md"
      aria-label="Navegación principal"
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-bold text-primary hover:text-primary-dark transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:rounded-md"
            aria-label="Jonathan Aucancela — Inicio"
          >
            Jonathan.dev
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  pathname === item.href
                    ? 'text-primary bg-primary/5 dark:bg-primary/10'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 flex items-center gap-2">
              {/* Command palette trigger */}
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('command-palette:open'))
                }
                className="hidden items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                aria-label="Abrir búsqueda"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Buscar…</span>
                <kbd className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 py-0.5 font-mono text-[10px] leading-none shadow-sm">
                  ⌘K
                </kbd>
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: toggle + menu button */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              className={cn(
                'p-2 rounded-lg text-gray-600 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'active:scale-95 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="border-t border-gray-200 dark:border-gray-800 py-4 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className={cn(
                    'px-3 py-2 rounded-lg text-base font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    pathname === item.href
                      ? 'text-primary bg-primary/5 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Container>
    </nav>
  );
}
