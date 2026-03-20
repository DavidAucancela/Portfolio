/**
 * section-nav.js
 * Navegación por secciones con rueda del mouse.
 *
 * - Scroll normal dentro de cada sección
 * - Al llegar al borde superior/inferior acumula delta y muestra el indicador
 * - Panel derecho: sección actual, flecha, barra de progreso, sección destino
 * - Desactivado en mobile (< 768 px) y con prefers-reduced-motion
 */

/* ── Configuración ───────────────────────────────────────── */
const SECTIONS_BY_MODE = {
  dev: ['hero', 'about', 'projects', 'skills', 'contact'],
  ia:  ['hero', 'about', 'projects', 'skills', 'ia-assistant-section', 'contact'],
  sec: ['hero', 'about', 'projects', 'skills', 'contact'],
};
let SECTION_IDS = SECTIONS_BY_MODE.dev;

const SECTION_LABELS = {
  hero:                  'Inicio',
  about:                 'Sobre mí',
  projects:              'Proyectos',
  skills:                'Habilidades',
  'ia-assistant-section':'Consulta IA',
  contact:               'Contacto',
};

const THRESHOLD   = 260;   // delta acumulado para saltar
const COOLDOWN_MS = 900;   // bloqueo tras salto
const SNAP_ZONE   = 80;    // px desde borde para activar acumulación
const MOBILE_BP   = 768;

/* ── Estado ──────────────────────────────────────────────── */
let currentIndex = 0;
let accumulated  = 0;
let locked       = false;
let enabled      = true;
let direction    = 1; // 1 = down, -1 = up

/* ── Helpers ─────────────────────────────────────────────── */
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < MOBILE_BP;

function _navH() {
  return parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
  ) || 70;
}

function _sectionEl(i) {
  return document.getElementById(SECTION_IDS[i]);
}

function _scrollToSection(i) {
  const el = _sectionEl(i);
  if (!el) return;
  window.scrollTo({
    top:      el.getBoundingClientRect().top + window.scrollY - _navH(),
    behavior: reducedMotion() ? 'instant' : 'smooth',
  });
}

function _detectCurrentFromScroll() {
  const threshold = _navH() + 60;
  let best = 0;
  for (let i = 0; i < SECTION_IDS.length; i++) {
    const el = _sectionEl(i);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= threshold) best = i;
  }
  return best;
}

function _atBoundary(dir) {
  const el = _sectionEl(currentIndex);
  if (!el) return true;
  const scrollY    = window.scrollY;
  const viewBottom = scrollY + window.innerHeight;
  const secTop     = el.offsetTop;
  const secBottom  = secTop + el.offsetHeight;

  return dir > 0
    ? viewBottom >= secBottom - SNAP_ZONE
    : scrollY   <= secTop + _navH() + SNAP_ZONE;
}

/* ══════════════════════════════════════════════════════════
   UI
══════════════════════════════════════════════════════════ */

const container = document.createElement('div');
container.id    = 'sn-panel';
container.setAttribute('aria-hidden', 'true');
container.innerHTML = `
  <div id="sn-from-label" class="sn-label"></div>
  <div id="sn-arrow">↓</div>
  <div id="sn-bar-track">
    <div id="sn-bar-fill"></div>
    <div id="sn-bar-pct"></div>
  </div>
  <div id="sn-to-label" class="sn-label sn-label-to"></div>
`;
document.body.appendChild(container);

const barFill   = container.querySelector('#sn-bar-fill');
const barPct    = container.querySelector('#sn-bar-pct');
const fromLabel = container.querySelector('#sn-from-label');
const toLabel   = container.querySelector('#sn-to-label');
const arrow     = container.querySelector('#sn-arrow');

/* ── Actualizar textos según sección y dirección ─────────── */
function _updateLabels() {
  const next = currentIndex + direction;
  fromLabel.textContent = SECTION_LABELS[SECTION_IDS[currentIndex]] || '';
  toLabel.textContent   = (next >= 0 && next < SECTION_IDS.length)
    ? SECTION_LABELS[SECTION_IDS[next]] || ''
    : '';
  arrow.textContent = direction > 0 ? '↓' : '↑';
  arrow.className   = direction > 0 ? '' : 'sn-arrow-up';
}

function _setBarProgress(ratio) {
  const abs = Math.min(Math.abs(ratio), 1);
  barFill.style.height  = `${abs * 100}%`;
  barPct.textContent    = `${Math.round(abs * 100)}%`;
  container.classList.toggle('sn-active', abs > 0.01);
}

function _resetBar() {
  accumulated = 0;
  _setBarProgress(0);
  container.classList.remove('sn-active');
}

/* ══════════════════════════════════════════════════════════
   WHEEL
══════════════════════════════════════════════════════════ */

window.addEventListener('wheel', (e) => {
  if (!enabled || isMobile() || reducedMotion()) return;
  if (locked) { e.preventDefault(); return; }

  const real = _detectCurrentFromScroll();
  if (real !== currentIndex) {
    currentIndex = real;
    _resetBar();
  }

  if (_isScrollable(e.target)) return;

  const dir = e.deltaY > 0 ? 1 : -1;

  if (!_atBoundary(dir)) {
    _resetBar();
    return;
  }

  e.preventDefault();

  /* Si cambia dirección, reiniciar acumulación */
  if (dir !== direction) {
    direction = dir;
    accumulated = 0;
  }

  accumulated += e.deltaY;
  _updateLabels();
  _setBarProgress(accumulated / THRESHOLD);

  if (Math.abs(accumulated) >= THRESHOLD) {
    const next = currentIndex + dir;
    if (next >= 0 && next < SECTION_IDS.length) {
      currentIndex = next;
      _scrollToSection(next);
    }
    _resetBar();
    _updateLabels();
    locked = true;
    setTimeout(() => { locked = false; }, COOLDOWN_MS);
  }
}, { passive: false });

function _isScrollable(el) {
  while (el && el !== document.body) {
    // Siempre dejar pasar scroll en paneles con contenido propio
    if (el.id === 'ia-assistant-section' || el.id === 'jonathan-panel') return true;
    const ov = getComputedStyle(el).overflowY;
    if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight)
      return true;
    el = el.parentElement;
  }
  return false;
}

/* ── Sync al scrollear libremente ────────────────────────── */
let _syncTick = false;
window.addEventListener('scroll', () => {
  if (_syncTick) return;
  _syncTick = true;
  requestAnimationFrame(() => {
    const real = _detectCurrentFromScroll();
    if (real !== currentIndex) {
      currentIndex = real;
      _updateLabels();
    }
    _syncTick = false;
  });
}, { passive: true });

/* ── Navegación por teclado (↑ ↓) ───────────────────────── */
document.addEventListener('keydown', e => {
  if (!enabled) return;
  // No interferir si hay un input/textarea/select enfocado
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (document.activeElement?.isContentEditable) return;

  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();

  const real = _detectCurrentFromScroll();
  if (real !== currentIndex) { currentIndex = real; _updateLabels(); }

  const dir  = e.key === 'ArrowDown' ? 1 : -1;
  const next = currentIndex + dir;
  if (next >= 0 && next < SECTION_IDS.length) {
    currentIndex = next;
    _scrollToSection(next);
    _updateLabels();
  }
});

/* ── Breakpoint ──────────────────────────────────────────── */
function _checkBreakpoint() {
  enabled = !isMobile();
  container.style.display = enabled ? '' : 'none';
}
window.addEventListener('resize', _checkBreakpoint);

/* ── Sync con cambio de modo ─────────────────────────────── */
window.addEventListener('portfolio:modeChange', e => {
  const mode = e.detail?.mode || 'dev';
  SECTION_IDS = SECTIONS_BY_MODE[mode] || SECTIONS_BY_MODE.dev;
  currentIndex = _detectCurrentFromScroll();
  _resetBar();
  _updateLabels();
});

/* ── Init function ───────────────────────────────────────── */
function _init() {
  _checkBreakpoint();
  _updateLabels();
  _setBarProgress(0);
}

export function initSectionNav() {
  _init();
}
