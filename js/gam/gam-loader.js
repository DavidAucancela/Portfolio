/**
 * gam-loader.js — Orquestador del modo .gam
 *
 * Phaser (~1MB+ minificado) NO se descarga al entrar a .gam — recién al
 * hacer click en "Click para comenzar" de la TV (gam-tv.js). Entrar al modo
 * solo prende la estática; el juego se destruye al salir del modo para
 * liberar el canvas y los listeners de teclado.
 */
import { ThemeSwitcher } from '../theme-switcher.js';
import { GamTV } from './gam-tv.js';

let _game            = null;
let _booting         = false;
let _hotspotsPromise = null;
let _lastNonGamMode  = null;

const GAME_WIDTH  = 800;
const GAME_HEIGHT = 600;

function _loadHotspots() {
  if (!_hotspotsPromise) {
    _hotspotsPromise = fetch('data/gam-hotspots.json')
      .then(res => (res.ok ? res.json() : []))
      .catch(() => []);
  }
  return _hotspotsPromise;
}

async function _boot() {
  if (_game || _booting) return;
  _booting = true;

  const rootEl = document.getElementById('gam-canvas-root');
  if (!rootEl) { _booting = false; return; }

  try {
    const [{ default: Phaser }, { GamScene }, hotspots] = await Promise.all([
      import('phaser'),
      import('./gam-scene.js'),
      _loadHotspots(),
    ]);

    // Si el usuario salió de .gam mientras Phaser cargaba, abortar boot
    if (ThemeSwitcher.getCurrentMode() !== 'gam') { _booting = false; return; }

    const scene = new GamScene(hotspots);

    _game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: rootEl,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#050301',
      scene: [scene],
      render: { antialias: true },
    });

    GamTV.onBooted();
  } catch (err) {
    console.warn('[GamLoader] No se pudo iniciar el cuarto:', err);
    // Si Phaser falla, no dejar al usuario atrapado en pantalla completa
    // sin navbar y sin juego — volver al estado "apagado" de la TV.
    document.body.classList.remove('gam-playing');
    GamTV.enterMode();
  } finally {
    _booting = false;
  }
}

function _handleStart() {
  document.body.classList.add('gam-playing');
  _boot();
}

function _destroy() {
  if (_game) {
    _game.destroy(true);
    _game = null;
  }
  document.body.classList.remove('gam-playing');
  _closeModal();
}

/* ────────────────────────────────────────────────────
   MODAL PLACEHOLDER — objetos del cuarto sin minijuego real todavía
──────────────────────────────────────────────────── */
function _openModal(detail) {
  const modal   = document.getElementById('gam-modal');
  const iconEl  = document.getElementById('gam-modal-icon');
  const titleEl = document.getElementById('gam-modal-title');
  const textEl  = document.getElementById('gam-modal-text');
  if (!modal || !iconEl || !titleEl || !textEl) return;

  const content = detail.content || {};
  iconEl.textContent  = content.icon  || '🚧';
  titleEl.textContent = content.title || detail.label || 'Próximamente';
  textEl.textContent  = content.message || 'Este objeto todavía está en construcción.';

  modal.hidden = false;
}

function _closeModal() {
  const modal = document.getElementById('gam-modal');
  if (modal) modal.hidden = true;
}

function _bindModal() {
  document.getElementById('gam-modal-close')?.addEventListener('click', _closeModal);
  document.getElementById('gam-modal-backdrop')?.addEventListener('click', _closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeModal();
  });
}

/* ────────────────────────────────────────────────────
   INIT — registrado antes de ThemeSwitcher.init() para no perderse
   el primer 'portfolio:modeChange' si el usuario ya estaba en .gam
──────────────────────────────────────────────────── */
function init() {
  GamTV.init();
  GamTV.onStart(_handleStart);
  _bindModal();

  window.addEventListener('portfolio:modeChange', (e) => {
    const mode = e.detail.mode;
    if (mode === 'gam') {
      GamTV.enterMode();
    } else {
      _lastNonGamMode = mode;
      _destroy();
      GamTV.leaveMode();
    }
  });

  window.addEventListener('gam:interact', (e) => {
    if (e.detail.kind === 'exit') {
      ThemeSwitcher.switchMode(_lastNonGamMode || 'dev');
    } else {
      _openModal(e.detail);
    }
  });
}

export const GamLoader = { init };
