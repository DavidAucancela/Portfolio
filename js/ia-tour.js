/**
 * ia-tour.js — Tour guiado de JotAI por los 3 MODOS del portfolio
 * Cada paso cambia de modo de verdad y demuestra una funcionalidad en vivo:
 *   .dev → drawer de trayectoria (navbar) · .ia → CV en el visor PDF inline
 *   .sec → terminal interactiva (auto-escribe un comando)
 * Al terminar (o saltar) se restaura el modo que tenía el usuario.
 *
 * API: IaTour.start({ onState, onDone }) · IaTour.isActive()
 */

import { ThemeSwitcher } from './theme-switcher.js';
import { PDFModal }      from './pdf-modal.js';
import { SecTerminal }   from './sec-terminal.js';

const MODE_SETTLE_MS = 650;  // espera tras switchMode a que el DOM se re-renderice
const DEMO_CMD       = 'whoami';

/* ── PASOS ────────────────────────────────────────────────────── */
/* mode: null → el paso restaura el modo inicial del usuario
   enter/exit: abre/cierra la demo · demo/demoDelay: acción retardada extra */

const STEPS = [
  {
    mode:   'dev',
    icon:   '💼',
    title:  'Modo .dev — Trayectoria',
    text:   'Primer modo: desarrollo full-stack. La trayectoria completa de Jonathan ' +
            '— formación, experiencia y proyectos — vive en este drawer, siempre a un clic en la navbar.',
    target: '.jonathan-panel__drawer',
    enter()  { window.dispatchEvent(new CustomEvent('portfolio:syncTrayectoria')); },
    exit()   { document.getElementById('jonathan-panel-close')?.click(); },
  },
  {
    mode:   'ia',
    icon:   '📄',
    title:  'Modo .ia — CV sin descargas',
    text:   'Segundo modo: IA aplicada. El CV se abre aquí mismo en un visor integrado ' +
            '— sin descargar nada ni salir de la página.',
    target: null,
    enter() {
      const btn = document.getElementById('cv-open-btn');
      PDFModal.open(
        btn?.dataset.pdfUrl   || 'public/Hoja%20de%20vida%20-%20Jonathan%20Aucancela.pdf',
        btn?.dataset.pdfLabel || 'CV — Jonathan Aucancela'
      );
    },
    exit()   { PDFModal.close(); },
  },
  {
    mode:   'sec',
    icon:   '🖥️',
    title:  'Modo .sec — Terminal interactiva',
    text:   'Tercer modo: ciberseguridad. Esta terminal responde de verdad — escribí ' +
            '`whoami` por ti; prueba también `help`, `ls projects` o `cat skills.md`.',
    target: '#sec-terminal',
    enter(reduced) {
      document.getElementById('hero')
        ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    },
    demo()     { SecTerminal.demo(DEMO_CMD); },
    demoDelay: 1700, // espera al boot sequence de la terminal
    exit()   {},
  },
  {
    mode:   null,
    icon:   '✨',
    title:  '¡Tour completado!',
    text:   'Esos son los 3 modos del portfolio. Te dejo donde empezaste — cámbialos ' +
            'desde la navbar (.dev / .ia / .sec) y pregúntame lo que quieras en el chat.',
    target: null,
    enter(reduced) {
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    },
    exit()   {},
  },
];

/* ── MÓDULO ───────────────────────────────────────────────────── */

export const IaTour = (() => {
  let _idx         = 0;
  let _onState     = null;
  let _onDone      = null;
  let _overlay     = null;
  let _tip         = null;
  let _active      = false;
  let _reduced     = false;
  let _initialMode = 'dev';
  let _seq         = 0;   // token: invalida callbacks de pasos anteriores
  let _timers      = [];

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

  /* ── INJECT DOM ────────────────────────────────────────────── */

  function _inject() {
    if (document.getElementById('jotai-tour-overlay')) return;

    const wrap = document.createElement('div');
    wrap.id = 'jotai-tour-overlay';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div id="jotai-tour-tip" role="dialog" aria-label="Tour de JotAI" aria-modal="false">
        <div class="jt-header">
          <span class="jt-icon" id="jt-icon">🔮</span>
          <span class="jt-title" id="jt-title"></span>
          <span class="jt-counter" id="jt-counter"></span>
        </div>
        <p class="jt-text" id="jt-text"></p>
        <div class="jt-actions">
          <button class="jt-btn jt-btn--ghost" id="jt-prev" aria-label="Paso anterior">← Anterior</button>
          <button class="jt-btn jt-btn--primary" id="jt-next" aria-label="Siguiente paso">Siguiente →</button>
          <button class="jt-btn jt-btn--skip" id="jt-skip" aria-label="Saltar tour">✕ Saltar</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    _overlay = document.getElementById('jotai-tour-overlay');
    _tip     = document.getElementById('jotai-tour-tip');

    document.getElementById('jt-next').addEventListener('click', _nextStep);
    document.getElementById('jt-prev').addEventListener('click', _prevStep);
    document.getElementById('jt-skip').addEventListener('click', _finish);

    document.addEventListener('keydown', _onKey);
  }

  /* ── HIGHLIGHT ─────────────────────────────────────────────── */

  function _highlight(sel) {
    _clearHighlight();
    if (!sel) return;
    document.querySelector(sel)?.classList.add('jotai-tour-target');
  }

  function _clearHighlight() {
    document.querySelectorAll('.jotai-tour-target').forEach(el => {
      el.classList.remove('jotai-tour-target');
    });
  }

  /* ── RENDER DE PASO ────────────────────────────────────────── */

  function _renderStep(prevIdx = null) {
    _clearTimers();
    if (prevIdx !== null) STEPS[prevIdx]?.exit?.();
    _clearHighlight();

    const step  = STEPS[_idx];
    const total = STEPS.length;

    document.getElementById('jt-icon').textContent    = step.icon;
    document.getElementById('jt-title').textContent   = step.title;
    document.getElementById('jt-text').textContent    = step.text;
    document.getElementById('jt-counter').textContent = `${_idx + 1} / ${total}`;

    const prevBtn = document.getElementById('jt-prev');
    prevBtn.style.visibility = _idx === 0 ? 'hidden' : 'visible';

    const nextBtn = document.getElementById('jt-next');
    nextBtn.textContent = _idx === total - 1 ? 'Finalizar ✓' : 'Siguiente →';

    _onState?.('pointing');

    // Cambio de modo real (el paso final restaura el inicial)
    const targetMode = step.mode || _initialMode;
    const changed    = document.body.dataset.theme !== targetMode;
    if (changed) ThemeSwitcher.switchMode(targetMode);

    // Demo cuando el DOM del modo nuevo está asentado
    const settle = changed ? MODE_SETTLE_MS : 120;
    _later(() => {
      step.enter?.(_reduced);
      _later(() => _highlight(step.target), 200);
    }, settle);
    if (step.demo) _later(() => step.demo(), settle + (step.demoDelay || 0));

    setTimeout(() => document.getElementById('jt-next')?.focus(), 80);
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
    if (e.key === 'ArrowRight' || e.key === 'Enter') _nextStep();
    if (e.key === 'ArrowLeft')  _prevStep();
    if (e.key === 'Escape')     _finish();
  }

  /* ── START / FINISH ────────────────────────────────────────── */

  function start(a, b) {
    // Acepta start({ onState, onDone }) y el legacy start(mode, opts)
    const opts = (a && typeof a === 'object') ? a : (b || {});
    _onState     = opts.onState;
    _onDone      = opts.onDone;
    _idx         = 0;
    _active      = true;
    _reduced     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    _initialMode = document.body.dataset.theme || 'dev';

    _inject();

    _overlay.removeAttribute('aria-hidden');
    _overlay.classList.add('is-active');

    _renderStep();
  }

  function _finish() {
    if (!_active) return;
    _active = false;
    _clearTimers();

    STEPS[_idx]?.exit?.();
    _clearHighlight();

    // Restaura el modo que tenía el usuario antes del tour
    if (document.body.dataset.theme !== _initialMode) {
      ThemeSwitcher.switchMode(_initialMode);
    }

    _overlay?.classList.remove('is-active');
    _overlay?.setAttribute('aria-hidden', 'true');

    _onState?.('idle');
    _onDone?.();
  }

  function isActive() { return _active; }

  return { start, isActive };
})();
