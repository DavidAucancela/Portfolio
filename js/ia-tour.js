/**
 * ia-tour.js — Tour guiado de JotAI por las secciones del portfolio
 *
 * Pasos: 1) la barra de modos (los modos cambian solos cada 2s), 2) Trabajo
 * seleccionado, 3) el juego de .sec, 4) el cuarto de .gam. Al terminar (o
 * saltar) se restaura el modo que tenía el usuario.
 *
 * Foco: un marco con brillo se desliza hasta la sección de cada paso (la
 * "animación de dónde pertenece") y el resto de la página queda borroso — 4
 * velos con backdrop-filter alrededor del hueco, recalculados en cada frame
 * para seguir el scroll y los elementos fijos. La tarjeta del paso se ubica
 * debajo (o encima) del hueco con una flecha que apunta a la sección.
 *
 * Se abre con /tour en JotAI o con el botón Tour de la navbar (evento
 * `jotai:startTour`, ver ia-mascot.js).
 *
 * API: IaTour.start({ onState, onDone }) · IaTour.isActive()
 */

import { ThemeSwitcher } from './theme-switcher.js';
import { LangSwitcher } from './lang.js';

const MODE_SETTLE_MS = 650;   // espera tras switchMode a que el DOM se re-renderice
const CYCLE_MS       = 2000;  // paso 1: cada cuánto cambia de modo
const PAD            = 10;    // aire entre la sección y el marco
const MODES          = ['dev', 'ia', 'sec', 'gam'];
const T = (es, en) => LangSwitcher.L({ es, en });

function _scrollTo(sel, reduced, block = 'start') {
  if (!sel) {
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    return;
  }
  document.querySelector(sel)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block });
}

/* ── PASOS ────────────────────────────────────────────────────── */
/* mode: modo en el que corre el paso ('initial' = el del usuario; si era .gam,
   que no tiene proyectos, se usa .dev). target: lo que queda enfocado. */

const STEPS = [
  {
    id: 'modes',
    mode: 'initial',
    icon: '◐',
    title: () => T('Modos', 'Modes'),
    text: () => T(
      'El portfolio tiene 4 modos. Cada uno cambia el contenido, los colores y el fondo: .dev (full-stack), .ia (inteligencia artificial), .sec (ciberseguridad) y .gam (un cuarto para jugar). Mira cómo cambian solos.',
      'The portfolio has 4 modes. Each one changes the content, colors and background: .dev (full-stack), .ia (artificial intelligence), .sec (cybersecurity) and .gam (a room to play in). Watch them switch on their own.'
    ),
    target: '#mode-bar .mode-bar__chips',
    enter(tour) {
      _scrollTo(null, tour.reduced);
      document.getElementById('mode-bar')?.classList.add('mode-bar--touring');
      tour.cycleModes();
    },
    exit() {
      document.getElementById('mode-bar')?.classList.remove('mode-bar--touring');
    },
  },
  {
    id: 'work',
    mode: 'initial',
    icon: '▦',
    title: () => T('Trabajo seleccionado', 'Selected work'),
    text: () => T(
      'Los proyectos del modo activo. Cada tarjeta abre su proceso completo: problema, solución, métricas y capturas. Los filtros de arriba los ordenan por categoría.',
      'Projects for the active mode. Each card opens its full process: problem, solution, metrics and screenshots. The filters above sort them by category.'
    ),
    target: '#projects',
    enter(tour) { _scrollTo('#projects', tour.reduced); },
  },
  {
    id: 'sec',
    mode: 'sec',
    icon: '⛨',
    title: () => T('Modo .sec — el juego', '.sec mode — the game'),
    text: () => T(
      'En el fondo aparecen virus. Pasa el cursor (o toca en el celular) para destruirlos antes de que escapen: cada uno que se escapa baja 20% la integridad del sistema. Si llega a 0%, el sitio se apaga y solo puedes repararlo desde esta terminal (nmap, patch, quarantine, block).',
      'Viruses appear in the background. Hover over them (or tap on mobile) to destroy them before they escape: each one that gets away drops system integrity by 20%. At 0% the site shuts down and you can only repair it from this terminal (nmap, patch, quarantine, block).'
    ),
    target: '#sec-terminal',
    enter(tour) { _scrollTo(null, tour.reduced); },
  },
  {
    id: 'gam',
    mode: 'gam',
    icon: '▶',
    title: () => T('Modo .gam — el cuarto', '.gam mode — the room'),
    text: () => T(
      'Inserta una moneda y entras al cuarto de Jonathan en 3D: haz clic en un objeto para acercarte y usarlo — piano, guitarra, ajedrez, malabares, la patineta, los libros… JotAI vive adentro y te acompaña. Sales por la puerta.',
      'Insert a coin to enter Jonathan’s 3D room: click an object to zoom in and use it — piano, guitar, chess, juggling, the skateboard, the books… JotAI lives inside and keeps you company. Leave through the door.'
    ),
    target: '.gam-tv__start',
    enter(tour) { _scrollTo(null, tour.reduced); },
  },
];

/* ── MÓDULO ───────────────────────────────────────────────────── */

export const IaTour = (() => {
  let _idx         = 0;
  let _onState     = null;
  let _onDone      = null;
  let _overlay     = null;
  let _tip         = null;
  let _frame       = null;
  let _veils       = [];
  let _arrow       = null;
  let _active      = false;
  let _reduced     = false;
  let _initialMode = 'dev';
  let _seq         = 0;   // token: invalida callbacks de pasos anteriores
  let _timers      = [];
  let _raf         = 0;
  let _cur         = null;  // rect actual del marco (se desliza hacia el objetivo)

  /* ── TIMERS CON TOKEN ──────────────────────────────────────── */

  function _later(fn, ms) {
    const token = _seq;
    _timers.push(setTimeout(() => {
      if (token === _seq && _active) fn();
    }, ms));
  }

  function _clearTimers() {
    _timers.forEach(clearTimeout);
    _timers = [];
    _seq++;
  }

  /* Paso 1: recorre los 4 modos, uno cada CYCLE_MS */
  function _cycleModes() {
    const tick = () => {
      const cur  = document.body.dataset.theme;
      const next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
      ThemeSwitcher.switchMode(next);
      _later(tick, CYCLE_MS);
    };
    _later(tick, CYCLE_MS);
  }

  const _tourApi = {
    get reduced() { return _reduced; },
    cycleModes: _cycleModes,
  };

  /* ── INJECT DOM ────────────────────────────────────────────── */

  function _inject() {
    if (document.getElementById('jotai-tour-overlay')) return;

    const wrap = document.createElement('div');
    wrap.id = 'jotai-tour-overlay';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div class="jt-veil"></div><div class="jt-veil"></div>
      <div class="jt-veil"></div><div class="jt-veil"></div>
      <div class="jt-frame" aria-hidden="true"><span class="jt-frame__ping"></span></div>
      <div id="jotai-tour-tip" role="dialog" aria-modal="false" aria-labelledby="jt-title">
        <span class="jt-arrow" aria-hidden="true"></span>
        <div class="jt-header">
          <span class="jt-icon" id="jt-icon" aria-hidden="true"></span>
          <span class="jt-title" id="jt-title"></span>
          <span class="jt-counter" id="jt-counter"></span>
        </div>
        <div class="jt-dots" id="jt-dots" aria-hidden="true"></div>
        <p class="jt-text" id="jt-text"></p>
        <div class="jt-actions">
          <button class="jt-btn jt-btn--ghost" id="jt-prev"></button>
          <button class="jt-btn jt-btn--primary" id="jt-next"></button>
          <button class="jt-btn jt-btn--skip" id="jt-skip"></button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    _overlay = wrap;
    _tip     = wrap.querySelector('#jotai-tour-tip');
    _frame   = wrap.querySelector('.jt-frame');
    _arrow   = wrap.querySelector('.jt-arrow');
    _veils   = [...wrap.querySelectorAll('.jt-veil')];

    document.getElementById('jt-next').addEventListener('click', _nextStep);
    document.getElementById('jt-prev').addEventListener('click', _prevStep);
    document.getElementById('jt-skip').addEventListener('click', _finish);

    document.addEventListener('keydown', _onKey);
  }

  /* ── FOCO: marco + velos borrosos ──────────────────────────── */

  function _targetRect() {
    const step = STEPS[_idx];
    const el = step?.target && document.querySelector(step.target);
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') {
      // Sin objetivo visible: un hueco chico en el centro (todo borroso)
      return { x: vw / 2, y: vh / 2, w: 0, h: 0 };
    }
    const r = el.getBoundingClientRect();
    // Recortado al viewport: una sección más alta que la pantalla deja borroso solo lo de fuera
    const x1 = Math.max(4, r.left - PAD), y1 = Math.max(4, r.top - PAD);
    const x2 = Math.min(vw - 4, r.right + PAD), y2 = Math.min(vh - 4, r.bottom + PAD);
    return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
  }

  function _loop() {
    if (!_active) return;
    const t = _targetRect();
    if (!_cur || _reduced) _cur = { ...t };
    else {
      const k = 0.16;   // el marco se desliza hacia la sección nueva
      _cur.x += (t.x - _cur.x) * k; _cur.y += (t.y - _cur.y) * k;
      _cur.w += (t.w - _cur.w) * k; _cur.h += (t.h - _cur.h) * k;
    }
    _layout(_cur);
    _raf = requestAnimationFrame(_loop);
  }

  function _layout(c) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const set = (el, x, y, w, h) => {
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width  = `${Math.max(0, w)}px`;
      el.style.height = `${Math.max(0, h)}px`;
    };
    const [top, bottom, left, right] = _veils;
    set(top, 0, 0, vw, c.y);
    set(bottom, 0, c.y + c.h, vw, vh - c.y - c.h);
    set(left, 0, c.y, c.x, c.h);
    set(right, c.x + c.w, c.y, vw - c.x - c.w, c.h);
    set(_frame, c.x, c.y, c.w, c.h);
    _frame.style.opacity = c.w > 2 ? '1' : '0';

    // Tarjeta: debajo del hueco si entra, si no encima, si no adentro (abajo)
    const tw = _tip.offsetWidth, th = _tip.offsetHeight, gap = 16;
    let ty, side;
    if (c.y + c.h + gap + th < vh - 8)      { ty = c.y + c.h + gap; side = 'top'; }
    else if (c.y - gap - th > 8)            { ty = c.y - gap - th;  side = 'bottom'; }
    else                                     { ty = vh - th - 24;    side = 'none'; }
    const cx = c.x + c.w / 2;
    const tx = Math.min(vw - tw - 12, Math.max(12, cx - tw / 2));
    _tip.style.transform = `translate(${tx}px, ${ty}px)`;
    _tip.dataset.arrow = side;
    _arrow.style.left = `${Math.min(tw - 22, Math.max(14, cx - tx - 7))}px`;
  }

  /* El marco "late" al llegar a cada sección */
  function _ping() {
    const p = _frame.querySelector('.jt-frame__ping');
    p.classList.remove('is-on');
    void p.offsetWidth;
    p.classList.add('is-on');
  }

  /* ── RENDER DE PASO ────────────────────────────────────────── */

  function _renderStep(prevIdx = null) {
    _clearTimers();
    if (prevIdx !== null) STEPS[prevIdx]?.exit?.();

    const step  = STEPS[_idx];
    const total = STEPS.length;

    document.getElementById('jt-icon').textContent    = step.icon;
    document.getElementById('jt-title').textContent   = step.title();
    document.getElementById('jt-text').textContent    = step.text();
    document.getElementById('jt-counter').textContent = `${_idx + 1} / ${total}`;
    document.getElementById('jt-dots').innerHTML =
      STEPS.map((_, i) => `<span class="${i === _idx ? 'is-on' : i < _idx ? 'is-done' : ''}"></span>`).join('');

    const prevBtn = document.getElementById('jt-prev');
    prevBtn.textContent = T('← Anterior', '← Back');
    prevBtn.style.visibility = _idx === 0 ? 'hidden' : 'visible';
    document.getElementById('jt-next').textContent =
      _idx === total - 1 ? T('Finalizar ✓', 'Finish ✓') : T('Siguiente →', 'Next →');
    document.getElementById('jt-skip').textContent = T('Saltar', 'Skip');

    _tip.classList.remove('is-in'); void _tip.offsetWidth; _tip.classList.add('is-in');
    _onState?.('pointing');

    const targetMode = step.mode === 'initial'
      ? (_initialMode === 'gam' ? 'dev' : _initialMode)
      : step.mode;
    const changed = document.body.dataset.theme !== targetMode;
    if (changed) ThemeSwitcher.switchMode(targetMode);

    // switchMode se ignora si otra transición de modo sigue en curso (p. ej.
    // el ciclo del paso 1): se reintenta hasta que el modo quede puesto.
    const run = (tries) => {
      if (document.body.dataset.theme !== targetMode && tries > 0) {
        ThemeSwitcher.switchMode(targetMode);
        _later(() => run(tries - 1), MODE_SETTLE_MS);
        return;
      }
      step.enter?.(_tourApi);
      _later(_ping, 450);
    };
    _later(() => run(4), changed ? MODE_SETTLE_MS : 120);

    setTimeout(() => document.getElementById('jt-next')?.focus({ preventScroll: true }), 80);
  }

  /* ── NAVEGACIÓN ────────────────────────────────────────────── */

  function _nextStep() {
    if (_idx < STEPS.length - 1) {
      const prev = _idx;
      _idx++;
      _renderStep(prev);
    } else {
      _finish();
    }
  }

  function _prevStep() {
    if (_idx > 0) {
      const prev = _idx;
      _idx--;
      _renderStep(prev);
    }
  }

  function _onKey(e) {
    if (!_active) return;
    // No interceptar teclas mientras se escribe (p. ej. en la terminal .sec)
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); _nextStep(); }
    if (e.key === 'ArrowLeft')  _prevStep();
    if (e.key === 'Escape')     _finish();
  }

  /* ── START / FINISH ────────────────────────────────────────── */

  function start(a, b) {
    if (_active) return;
    // Acepta start({ onState, onDone }) y el legacy start(mode, opts)
    const opts = (a && typeof a === 'object') ? a : (b || {});
    _onState     = opts.onState;
    _onDone      = opts.onDone;
    _idx         = 0;
    _active      = true;
    _reduced     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    _initialMode = document.body.dataset.theme || 'dev';
    _cur         = null;

    _inject();

    _overlay.removeAttribute('aria-hidden');
    _overlay.classList.add('is-active');
    document.body.classList.add('is-touring');

    _renderStep();
    _raf = requestAnimationFrame(_loop);
  }

  function _finish() {
    if (!_active) return;
    _active = false;
    _clearTimers();
    cancelAnimationFrame(_raf);

    STEPS[_idx]?.exit?.();

    // Restaura el modo que tenía el usuario antes del tour
    if (document.body.dataset.theme !== _initialMode) {
      ThemeSwitcher.switchMode(_initialMode);
    }

    _overlay?.classList.remove('is-active');
    _overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-touring');

    _onState?.('idle');
    _onDone?.();
  }

  function isActive() { return _active; }

  return { start, isActive };
})();
