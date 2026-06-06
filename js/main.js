/**
 * main.js — Punto de entrada Vite
 * Importa todos los módulos y los inicializa cuando el DOM está listo.
 */

import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { ThemeSwitcher } from './theme-switcher.js';
import { HeroAnimations } from './animations.js';
import { Sections } from './sections.js';
import { Projects } from './projects.js';
import { ProjectDetail } from './project-detail.js';
import { ProjectGallery } from './project-gallery.js';
import { initEffects } from './effects.js';
import { LangSwitcher } from './lang.js';
import { initSectionNav } from './section-nav.js';
import { IAAssistant } from './ia-assistant.js';
import { initApp } from './app.js';
import { Trajectory } from './trajectory.js';
import { CommandPalette } from './command-palette.js';
import { SecTerminal } from './sec-terminal.js';
import { PDFModal } from './pdf-modal.js';
import { IaMascot } from './ia-mascot.js';
import { SectionDivider } from './section-divider.js';

// CSS imports — Vite los bundlea automáticamente
import '../css/main.css';
import '../css/sections.css';
import '../css/polish.css';
import '../css/project-detail.css';
import '../css/project-gallery.css';
import '../css/trajectory.css';
import '../css/command-palette.css';
import '../css/sec-terminal.css';
import '../css/pdf-modal.css';
import '../css/ia-mascot.css';
import '../css/section-divider.css';

// Vercel Analytics y Speed Insights — solo activos en producción
injectAnalytics();
injectSpeedInsights();

document.addEventListener('DOMContentLoaded', () => {
  ThemeSwitcher.init();
  Trajectory.init();
  HeroAnimations.init();
  Sections.init(localStorage.getItem('portfolio-mode') || 'dev');
  Projects.init();
  ProjectDetail.init();
  initEffects();
  LangSwitcher.init();
  initSectionNav();
  IAAssistant.init();
  initApp();
  CommandPalette.init();
  SecTerminal.init();
  PDFModal.init();
  IaMascot.init();
  SectionDivider.init();
});
