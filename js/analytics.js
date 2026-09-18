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

  // Modo .gam — ver js/gam/gam-loader.js (gam:start, gam:interact) y
  // gam-piano.js/gam-juggling.js (gam:score)
  window.addEventListener('gam:start', () => {
    track('gam_start');
  });

  window.addEventListener('gam:interact', ({ detail }) => {
    if (!detail?.id) return;
    track('gam_interact', { id: detail.id, kind: detail.kind || '' });
  });

  window.addEventListener('gam:score', ({ detail }) => {
    if (!detail?.game) return;
    track('gam_minigame_score', { game: detail.game, score: detail.score ?? 0 });
  });
}

export const Analytics = { init };
