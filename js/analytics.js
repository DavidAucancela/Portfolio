/**
 * analytics.js — sink centralizado de eventos custom hacia Vercel Analytics.
 * Escucha únicamente CustomEvents ya emitidos por otros módulos (mismo patrón
 * documentado en CLAUDE.md "Eventos custom usados") — no importa ni acopla
 * con esos módulos. Los payloads deben ser flat (string/number/boolean):
 * @vercel/analytics valida esto en runtime (throw en dev, strip en prod).
 */
import { track } from '@vercel/analytics';

function init() {
  window.addEventListener('portfolio:modeChange', ({ detail }) => {
    if (!detail?.mode) return;
    track('mode_change', { mode: detail.mode });
  });

  window.addEventListener('portfolio:projectOpen', ({ detail }) => {
    const project = detail?.project?.slug || detail?.project?.title || 'unknown';
    track('project_open', { project, mode: detail?.mode || '' });
  });

  window.addEventListener('command-palette:opened', () => {
    track('command_palette_open');
  });

  window.addEventListener('portfolio:sectionDwell', ({ detail }) => {
    if (!detail?.section) return;
    track('section_dwell', { section: detail.section, mode: detail.mode || '' });
  });
}

export const Analytics = { init };
