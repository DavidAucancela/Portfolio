/**
 * gam-tv.js — Prompt "insertar moneda" del modo .gam.
 *
 * La estática ya no vive acá — es el fondo unificado de toda la página
 * (background.js, GamField), que se pausa solo al arrancar el juego (ver
 * el MutationObserver de `.gam-playing` en background.js). Este módulo
 * solo maneja el botón de inicio, el loading y el hint de controles — no
 * sabe nada de Phaser: expone onStart(cb) para que gam-loader.js decida
 * qué pasa al hacer click, y onBooted()/enterMode()/leaveMode() para que
 * ese mismo orquestador le avise en qué momento del ciclo de vida está.
 */

let startBtn, loadingEl, hintEl, screenEl, promptEl;
let _onStartCb = null;

function init() {
  startBtn  = document.getElementById('gam-tv-start');
  loadingEl = document.getElementById('gam-tv-loading');
  hintEl    = document.getElementById('gam-tv-hint');
  screenEl  = document.getElementById('gam-tv-screen');
  promptEl  = document.getElementById('gam-prompt');

  startBtn?.addEventListener('click', () => {
    if (!_onStartCb || startBtn.classList.contains('is-inserting')) return;
    startBtn.classList.add('is-inserting');
    document.getElementById('gam-canvas-root')?.classList.add('is-pre-reveal');
    if (_reduced()) { _launch(); return; }
    // La moneda cae (0.55s) y recién ahí se enciende la pantalla; el boot del
    // cuarto arranca ya, en paralelo, para no sumar espera.
    _onStartCb();
    setTimeout(_launch, 600);
  });
}

let _launched = false;
let _booted = false;

const _coarse = () => window.matchMedia('(pointer: coarse)').matches;

function _reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function _launch() {
  _launched = true;
  startBtn.hidden = true;
  screenEl?.classList.add('is-powering-on');
  setTimeout(() => screenEl?.classList.remove('is-powering-on'), 520);
  if (_reduced()) _onStartCb();
  if (_booted) _reveal();
  else if (loadingEl) loadingEl.hidden = false;
}

/** Sale el loading y se "enciende el tubo" sobre el cuarto ya montado. */
function _reveal() {
  const root = document.getElementById('gam-canvas-root');
  root?.classList.remove('is-pre-reveal');
  if (loadingEl && !loadingEl.hidden) {
    loadingEl.classList.add('is-leaving');
    setTimeout(() => { loadingEl.hidden = true; loadingEl.classList.remove('is-leaving'); }, 350);
  }
  if (root && !_reduced()) {
    root.classList.remove('is-crt-on');
    void root.offsetWidth;
    root.classList.add('is-crt-on');
    setTimeout(() => root.classList.remove('is-crt-on'), 1000);
  }
  if (hintEl) {
    if (_coarse()) hintEl.textContent = 'Toca un objeto · pellizca o toca dos veces para acercar · ← Volver para salir';
    hintEl.hidden = false;
  }
}

function _resetPrompt() {
  _launched = false;
  _booted = false;
  startBtn?.classList.remove('is-inserting');
  document.getElementById('gam-canvas-root')?.classList.remove('is-pre-reveal');
}

/** Registra el callback que arranca el juego real (gam-loader.js). */
function onStart(cb) {
  _onStartCb = cb;
}

/** Entrando a .gam: prompt "insertar moneda" visible. */
function enterMode() {
  _resetPrompt();
  document.getElementById('gam-credits')?.click();
  if (startBtn)  startBtn.hidden  = false;
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = true;
  if (promptEl)  promptEl.hidden  = true;
}

/** Saliendo de .gam: deja el prompt listo para la próxima visita. */
function leaveMode() {
  _resetPrompt();
  document.getElementById('gam-credits')?.click();
  if (startBtn)  startBtn.hidden  = false;
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = true;
  if (promptEl)  promptEl.hidden  = true;
}

/** El juego terminó de montarse — oculta el loading y muestra el hint. */
function onBooted() {
  _booted = true;
  if (_launched) _reveal();
}

const CREDITS = {
  es: {
    title: 'FIN DEL JUEGO',
    groups: [
      ['Diseño y desarrollo', 'Jonathan Aucancela'],
      ['Motor del cuarto', 'Three.js'],
      ['Sonido', 'Web Audio API'],
      ['Mascota', 'JotAI'],
      ['Objetos descubiertos', null],
      ['Gracias por jugar', ''],
    ],
    skip: ['click / Esc para saltar', 'toca para saltar'],
  },
  en: {
    title: 'GAME OVER',
    groups: [
      ['Design & development', 'Jonathan Aucancela'],
      ['Room engine', 'Three.js'],
      ['Sound', 'Web Audio API'],
      ['Mascot', 'JotAI'],
      ['Objects discovered', null],
      ['Thanks for playing', ''],
    ],
    skip: ['click / Esc to skip', 'tap to skip'],
  },
};

/**
 * Créditos a pantalla completa del stage. Resuelve cuando terminan (o el
 * usuario los salta). No toca el modo: quien llama decide qué sigue.
 */
function playCredits({ discovered = 0, total = 0 } = {}) {
  return new Promise((resolve) => {
    if (!screenEl) { resolve(); return; }
    const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
    const c = CREDITS[lang];
    const dur = _reduced() ? 4 : 16;

    const el = document.createElement('div');
    el.id = 'gam-credits';
    el.className = 'gam-credits';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', c.title);
    el.style.setProperty('--credits-dur', dur + 's');

    const roll = document.createElement('div');
    roll.className = 'gam-credits__roll';
    const title = document.createElement('div');
    title.className = 'gam-credits__title';
    title.textContent = c.title;
    roll.append(title);
    for (const [role, name] of c.groups) {
      const g = document.createElement('div');
      g.className = 'gam-credits__group';
      const r = document.createElement('span');
      r.className = 'gam-credits__role';
      r.textContent = role;
      const n = document.createElement('span');
      n.className = 'gam-credits__name';
      n.textContent = name === null ? `${discovered} / ${total}` : name;
      g.append(r);
      if (n.textContent) g.append(n);
      roll.append(g);
    }

    const skip = document.createElement('span');
    skip.className = 'gam-credits__skip';
    skip.textContent = c.skip[_coarse() ? 1 : 0];
    el.append(roll, skip);
    screenEl.append(el);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      el.classList.add('is-leaving');
      setTimeout(() => { el.remove(); resolve(); }, 500);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); finish(); }
    };
    const timer = setTimeout(finish, dur * 1000 + 600);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
  });
}

export const GamTV = { init, onStart, enterMode, leaveMode, onBooted, playCredits };
