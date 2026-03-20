/**
 * main.js — Punto de entrada Vite
 * Importa todos los módulos y los inicializa cuando el DOM está listo.
 */

import { ThemeSwitcher } from './theme-switcher.js';
import { HeroAnimations } from './animations.js';
import { Sections } from './sections.js';
import { Projects } from './projects.js';
import { ProjectDetail } from './project-detail.js';
import { initEffects } from './effects.js';
import { LangSwitcher } from './lang.js';
import { initSectionNav } from './section-nav.js';
import { IAAssistant } from './ia-assistant.js';
import { initApp } from './app.js';

// CSS imports — Vite los bundlea automáticamente
import '../css/main.css';
import '../css/sections.css';
import '../css/polish.css';
import '../css/project-detail.css';

document.addEventListener('DOMContentLoaded', () => {
  ThemeSwitcher.init();
  HeroAnimations.init();
  Sections.init(localStorage.getItem('portfolio-mode') || 'dev');
  Projects.init();
  ProjectDetail.init();
  initEffects();
  LangSwitcher.init();
  initSectionNav();
  IAAssistant.init();
  initApp();
});
