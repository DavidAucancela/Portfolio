/**
 * theme-switcher.js
 * Gestiona el cambio entre los 3 modos del portfolio:
 * dev | ia | sec
 *
 * Responsabilidades:
 * - Cambiar el data-theme del body
 * - Animar el sufijo del navbar con efecto typewriter
 * - Cambiar el favicon dinámicamente
 * - Cambiar el title de la pestaña
 * - Persistir el modo en localStorage
 * - Leer el modo desde el hash de la URL (#dev, #ia, #sec)
 * - Emitir eventos para que otros módulos reaccionen
 */

/* ────────────────────────────────────────────────────
   CONFIGURACIÓN DE CADA MODO
──────────────────────────────────────────────────── */
const MODES = {
  dev: {
    suffix:     '.dev',
    title:      'Jonathan.dev — Software Engineer',
    tagline:    'Building robust systems & scalable applications',
    badge:      '⚡ Software Engineering',
    favicon:    'assets/favicons/dev-favicon.svg',
    overlayBg:  'rgba(59, 130, 246, 0.08)',
    aboutText:  'Ingeniero de software enfocado en construir sistemas robustos y aplicaciones escalables. Especializado en desarrollo fullstack con experiencia en arquitecturas REST, contenedores y bases de datos relacionales.',
    projectFile: 'data/dev-projects.json',
    comingSoon: {
      icon:    '🚧',
      title:   'Proyectos en construcción',
      message: 'Más proyectos de software en camino. Stay tuned.',
    },
  },
  ia: {
    suffix:     '.ia',
    title:      'Jonathan.ia — IA Developer',
    tagline:    'Exploring the frontier of AI-powered solutions',
    badge:      '🧠 Inteligencia Artificial',
    favicon:    'assets/favicons/ia-favicon.svg',
    overlayBg:  'rgba(177, 78, 255, 0.08)',
    aboutText:  'Explorador de la frontera de la IA aplicada. Trabajo con LLMs, sistemas RAG, embeddings y agentes para construir soluciones inteligentes que resuelven problemas reales.',
    projectFile: 'data/ia-projects.json',
    comingSoon: {
      icon:    '🤖',
      title:   'Proyectos IA en desarrollo',
      message: 'Sistemas con LLMs, RAG y agentes inteligentes próximamente.',
    },
  },
  sec: {
    suffix:     '.sec',
    title:      'Jonathan.sec — Security Researcher',
    tagline:    'Breaking & securing the digital world',
    badge:      '🔐 Cybersecurity',
    favicon:    'assets/favicons/sec-favicon.svg',
    overlayBg:  'rgba(0, 255, 65, 0.05)',
    aboutText:  'Especialista en ciberseguridad con mentalidad de hacker ético. Realizo auditorías, análisis de vulnerabilidades y CTFs. El primer paso para proteger un sistema es saber cómo romperlo.',
    projectFile: 'data/sec-projects.json',
    comingSoon: {
      icon:    '🔒',
      title:   'Proyectos de seguridad próximamente',
      message: 'Reportes de pentest, herramientas y writeups CTF en construcción.',
    },
  },
};

const VALID_MODES   = Object.keys(MODES);
const STORAGE_KEY   = 'portfolio-mode';
const DEFAULT_MODE  = 'dev';

/* Estado interno */
let currentMode = DEFAULT_MODE;
let isTransitioning = false;

/* ────────────────────────────────────────────────────
   INICIALIZACIÓN
──────────────────────────────────────────────────── */
function init() {
  const mode = _detectInitialMode();
  _applyMode(mode, false); // false = sin animación al cargar
  _bindEvents();
}

/**
 * Detecta el modo inicial en este orden de prioridad:
 * 1. Hash de la URL (#dev, #ia, #sec)
 * 2. localStorage
 * 3. DEFAULT_MODE ('dev')
 */
function _detectInitialMode() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (VALID_MODES.includes(hash)) return hash;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (VALID_MODES.includes(stored)) return stored;

  return DEFAULT_MODE;
}

/* ────────────────────────────────────────────────────
   CAMBIO DE MODO PÚBLICO
──────────────────────────────────────────────────── */
/**
 * Cambia al modo indicado con animación completa.
 * @param {string} newMode - 'dev' | 'ia' | 'sec'
 */
function switchMode(newMode) {
  if (!VALID_MODES.includes(newMode)) return;
  if (newMode === currentMode) return;
  if (isTransitioning) return;

  _applyMode(newMode, true); // true = con animación
}

/**
 * Cicla al siguiente modo en orden: dev → ia → sec → dev
 */
function cycleMode() {
  const idx     = VALID_MODES.indexOf(currentMode);
  const nextIdx = (idx + 1) % VALID_MODES.length;
  switchMode(VALID_MODES[nextIdx]);
}

/* ────────────────────────────────────────────────────
   APLICAR MODO (con o sin animación)
──────────────────────────────────────────────────── */
function _applyMode(mode, animate) {
  isTransitioning = true;

  const config    = MODES[mode];
  const prevMode  = currentMode;
  currentMode     = mode;

  if (animate) {
    _runTransitionAnimation(config, prevMode, () => {
      isTransitioning = false;
    });
  } else {
    _applyImmediate(mode, config);
    isTransitioning = false;
  }

  // Persistir y actualizar URL
  localStorage.setItem(STORAGE_KEY, mode);
  _updateURL(mode);
}

/**
 * Aplica el modo inmediatamente (sin animación, para carga inicial).
 */
function _applyImmediate(mode, config) {
  document.body.dataset.theme = mode;
  _updateFavicon(config.favicon);
  _updateTitle(config.title);
  _updateSuffixText(config.suffix);
  _updateHeroContent(config);
  _emitModeChange(mode, config);
}

/**
 * Secuencia completa de animación al cambiar de modo:
 * 1. Flash overlay
 * 2. Animación del sufijo (borrar + escribir)
 * 3. Cambio de tema CSS
 * 4. Actualización del contenido del hero
 */
function _runTransitionAnimation(config, prevMode, onDone) {
  // 1. Mostrar overlay flash
  const overlay = document.getElementById('theme-overlay');
  if (overlay) {
    overlay.style.background = config.overlayBg;
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 400);
  }

  // 2. Animar el sufijo del navbar
  _animateSuffix(config.suffix, () => {

    // 3. Cambiar el tema CSS (después de que el sufijo termine de borrarse)
    document.body.classList.add('theme-transitioning');
    document.body.dataset.theme = config.mode || currentMode;

    // 4. Actualizar favicon y title
    _updateFavicon(config.favicon);
    _updateTitle(config.title);

    // 5. Actualizar contenido del hero con fade
    _updateHeroContentAnimated(config);

    // 6. Emitir evento para que otros módulos reaccionen
    _emitModeChange(currentMode, config);

    // 7. Limpiar la clase de transición
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
      onDone();
    }, 450);
  });
}

/* ────────────────────────────────────────────────────
   ANIMACIÓN DEL SUFIJO (typewriter delete + write)
──────────────────────────────────────────────────── */
function _animateSuffix(newSuffix, onComplete) {
  const el = document.getElementById('logo-suffix');
  if (!el) { onComplete(); return; }

  const currentText = el.textContent;
  const chars       = currentText.split('');
  let   deleteIdx   = chars.length;

  // Mostrar cursor parpadeante
  el.dataset.animating = 'true';

  // FASE 1: Borrar el sufijo actual, letra por letra
  const deleteInterval = setInterval(() => {
    deleteIdx--;
    el.textContent = currentText.slice(0, Math.max(0, deleteIdx));

    if (deleteIdx <= 0) {
      clearInterval(deleteInterval);
      el.textContent = '';

      // FASE 2: Escribir el nuevo sufijo, letra por letra
      const newChars  = newSuffix.split('');
      let   writeIdx  = 0;

      const writeInterval = setInterval(() => {
        writeIdx++;
        el.textContent = newSuffix.slice(0, writeIdx);

        if (writeIdx >= newChars.length) {
          clearInterval(writeInterval);
          delete el.dataset.animating;

          // Completado — pequeño delay antes del callback
          setTimeout(onComplete, 80);
        }
      }, 60); // velocidad de escritura: 60ms por caracter
    }
  }, 50); // velocidad de borrado: 50ms por caracter
}

/* ────────────────────────────────────────────────────
   ACTUALIZAR CONTENIDO DEL HERO
──────────────────────────────────────────────────── */
function _updateHeroContent(config) {
  _setTextContent('hero-suffix-text', config.suffix);
  _setTextContent('hero-tagline', config.tagline);
  _setTextContent('hero-badge-text', config.badge);
  _setTextContent('about-mode-text', config.aboutText);
}

function _updateHeroContentAnimated(config) {
  const taglineEl = document.getElementById('hero-tagline');
  const badgeEl   = document.getElementById('hero-badge-text');
  const aboutEl   = document.getElementById('about-mode-text');

  // Fade out
  [taglineEl, badgeEl].forEach(el => {
    if (!el) return;
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(10px)';
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  });

  setTimeout(() => {
    // Actualizar texto
    if (taglineEl) taglineEl.textContent = config.tagline;
    if (badgeEl)   badgeEl.textContent   = config.badge;
    if (aboutEl)   aboutEl.textContent   = config.aboutText;

    // Actualizar el sufijo del hero (grande en el título)
    const heroSuffix = document.getElementById('hero-suffix-text');
    if (heroSuffix) heroSuffix.textContent = config.suffix;

    // Fade in
    [taglineEl, badgeEl].forEach(el => {
      if (!el) return;
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    });
  }, 220);
}

/* ────────────────────────────────────────────────────
   FAVICON Y TITLE
──────────────────────────────────────────────────── */
function _updateFavicon(faviconPath) {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconPath;
  link.type = 'image/svg+xml';
}

function _updateTitle(title) {
  document.title = title;
}

/* ────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────── */
function _updateSuffixText(suffix) {
  const el = document.getElementById('logo-suffix');
  if (el) el.textContent = suffix;
}

function _setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _updateURL(mode) {
  // Actualiza el hash sin provocar scroll ni reload
  const newURL = window.location.pathname + window.location.search + '#' + mode;
  window.history.replaceState(null, '', newURL);
}

/* ────────────────────────────────────────────────────
   EVENTOS PERSONALIZADOS
──────────────────────────────────────────────────── */
/**
 * Emite el evento 'portfolio:modeChange' con el modo nuevo y su config.
 * Otros módulos (projects.js, animations.js) escuchan este evento.
 */
function _emitModeChange(mode, config) {
  window.dispatchEvent(new CustomEvent('portfolio:modeChange', {
    detail: { mode, config }
  }));
}

/* ────────────────────────────────────────────────────
   BINDING DE EVENTOS DEL DOM
──────────────────────────────────────────────────── */
function _bindEvents() {
  // Click en el sufijo del logo → abrir dropdown de selección
  const logoSuffix = document.getElementById('logo-suffix');
  if (logoSuffix) {
    logoSuffix.addEventListener('click', _toggleDropdown);
  }

  // Click en cada opción del dropdown
  document.querySelectorAll('[data-mode-option]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.modeOption;
      _closeDropdown();
      switchMode(mode);
    });
  });

  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', (e) => {
    const dropdown    = document.getElementById('mode-dropdown');
    const logoSuffix  = document.getElementById('logo-suffix');
    if (!dropdown || !logoSuffix) return;
    if (!dropdown.contains(e.target) && !logoSuffix.contains(e.target)) {
      _closeDropdown();
    }
  });

  // Teclado: Esc cierra el dropdown
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeDropdown();
  });

  // Cambio de hash en la URL (navegación directa)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (VALID_MODES.includes(hash) && hash !== currentMode) {
      switchMode(hash);
    }
  });

  // Actualizar el indicador activo del dropdown cada vez que cambia el modo
  window.addEventListener('portfolio:modeChange', (e) => {
    _updateDropdownActive(e.detail.mode);
  });
}

function _toggleDropdown() {
  const dropdown = document.getElementById('mode-dropdown');
  if (!dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  isOpen ? _closeDropdown() : _openDropdown();
}

function _openDropdown() {
  const dropdown   = document.getElementById('mode-dropdown');
  const logoSuffix = document.getElementById('logo-suffix');
  if (dropdown) {
    dropdown.classList.add('open');
    dropdown.setAttribute('aria-expanded', 'true');
  }
  if (logoSuffix) logoSuffix.classList.add('open');
}

function _closeDropdown() {
  const dropdown   = document.getElementById('mode-dropdown');
  const logoSuffix = document.getElementById('logo-suffix');
  if (dropdown) {
    dropdown.classList.remove('open');
    dropdown.setAttribute('aria-expanded', 'false');
  }
  if (logoSuffix) logoSuffix.classList.remove('open');
}

function _updateDropdownActive(activeMode) {
  document.querySelectorAll('[data-mode-option]').forEach(btn => {
    const isActive = btn.dataset.modeOption === activeMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

/* ────────────────────────────────────────────────────
   EXPORT
──────────────────────────────────────────────────── */
export const ThemeSwitcher = {
  init,
  switchMode,
  cycleMode,
  getCurrentMode: () => currentMode,
  getModeConfig:  (mode) => MODES[mode || currentMode],
  getValidModes:  () => [...VALID_MODES],
};
