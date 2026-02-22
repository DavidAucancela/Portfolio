'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Home,
  FolderOpen,
  User,
  Phone,
  Github,
  Linkedin,
  Mail,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllProjects } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

type Command = {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const projects = getAllProjects();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const closeAndRun = useCallback(
    (action: () => void) => {
      close();
      action();
    },
    [close]
  );

  // --- Command definitions ---
  const navCommands: Command[] = [
    {
      id: 'home',
      label: 'Inicio',
      description: 'Ir a la página principal',
      icon: <Home className="h-4 w-4" />,
      action: () => router.push('/'),
      group: 'Navegación',
    },
    {
      id: 'projects',
      label: 'Proyectos',
      description: 'Ver todos los proyectos',
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => router.push('/projects'),
      group: 'Navegación',
    },
    {
      id: 'about',
      label: 'Sobre mí',
      description: 'Conocer más sobre mí',
      icon: <User className="h-4 w-4" />,
      action: () => router.push('/about'),
      group: 'Navegación',
    },
    {
      id: 'contact',
      label: 'Contacto',
      description: 'Ponerse en contacto',
      icon: <Phone className="h-4 w-4" />,
      action: () => router.push('/contact'),
      group: 'Navegación',
    },
  ];

  const projectCommands: Command[] = projects.map((p: Project) => ({
    id: `project-${p.slug}`,
    label: p.title,
    description: p.description,
    icon: <Code2 className="h-4 w-4" />,
    action: () => router.push(`/projects/${p.slug}`),
    group: 'Proyectos',
  }));

  const socialCommands: Command[] = [
    {
      id: 'github',
      label: 'GitHub',
      description: 'github.com/DavidAucancela',
      icon: <Github className="h-4 w-4" />,
      action: () => window.open('https://github.com/DavidAucancela', '_blank'),
      group: 'Social',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      description: 'linkedin.com/in/jonathan-david-aucancela',
      icon: <Linkedin className="h-4 w-4" />,
      action: () =>
        window.open(
          'https://www.linkedin.com/in/jonathan-david-aucancela/',
          '_blank'
        ),
      group: 'Social',
    },
    {
      id: 'email',
      label: 'Email',
      description: 'jonathan_jd@outlook.com',
      icon: <Mail className="h-4 w-4" />,
      action: () => window.open('mailto:jonathan_jd@outlook.com'),
      group: 'Social',
    },
  ];

  const allCommands = [...navCommands, ...projectCommands, ...socialCommands];

  const filtered = query
    ? allCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
          cmd.group.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Group results preserving order
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  // --- Event listeners ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') close();
    };
    const onCustomOpen = () => setOpen(true);

    document.addEventListener('keydown', onKey);
    window.addEventListener('command-palette:open', onCustomOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('command-palette:open', onCustomOpen);
    };
  }, [close]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter' && flatFiltered[selectedIndex]) {
      closeAndRun(flatFiltered[selectedIndex].action);
    }
  };

  // Flat index counter resets each render automatically (declared in JSX scope)
  let flatIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette panel */}
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[14%] z-[101] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar páginas, proyectos, contacto…"
                className="w-full bg-transparent py-4 text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              <kbd className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-400">
                ESC
              </kbd>
            </div>

            {/* Results list */}
            <div className="max-h-[380px] overflow-y-auto py-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  Sin resultados para &ldquo;{query}&rdquo;
                </div>
              ) : (
                Object.entries(grouped).map(([group, cmds]) => (
                  <div key={group}>
                    <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      {group}
                    </div>
                    {cmds.map((cmd) => {
                      const idx = flatIndex++;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => closeAndRun(cmd.action)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100',
                            isSelected
                              ? 'bg-primary/8 text-primary'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <span
                            className={cn(
                              'shrink-0 transition-colors',
                              isSelected ? 'text-primary' : 'text-gray-400'
                            )}
                          >
                            {cmd.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium leading-tight">
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div className="mt-0.5 truncate text-xs text-gray-400">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.span
                                key="arrow"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.1 }}
                              >
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint bar */}
            <div className="flex items-center gap-5 border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono shadow-sm">
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono shadow-sm">
                  ↵
                </kbd>
                abrir
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono shadow-sm">
                  ESC
                </kbd>
                cerrar
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
