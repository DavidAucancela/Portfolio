'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      className={cn(
        'relative h-9 w-9 rounded-lg flex items-center justify-center',
        'text-gray-600 dark:text-gray-300',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'active:scale-95',
        'transition-all duration-200',
        className
      )}
    >
      <span className="sr-only">
        {theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      </span>
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
