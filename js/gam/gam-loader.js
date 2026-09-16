/**
 * gam-loader.js — Orquestador del modo .gam
 *
 * Phaser (~1MB+ minificado) NO se descarga al entrar a .gam — recién al
 * hacer click en "Click para comenzar" de la TV (gam-tv.js). Entrar al modo
 * solo prende la estática; el juego se destruye al salir del modo para
 * liberar el canvas y los listeners de teclado.
 */
import { ThemeSwitcher } from '../theme-switcher.js';
import { LangSwitcher } from '../lang.js';
import { ProjectGallery } from '../project-gallery.js';
import { GamTV } from './gam-tv.js';

let _game            = null;
let _booting         = false;
let _hotspotsPromise = null;
let _lastNonGamMode  = null;
let _panelSeq        = 0; // invalida renders async (fetch de lista) de un panel ya cerrado
let _minigameUnmount = null; // cleanup del minijuego montado en #gam-modal-list (piano/malabares/patineta)

const GAME_WIDTH  = 800;
const GAME_HEIGHT = 600;

const _projectsCache = {};
let _skillsPromise = null;

/* ────────────────────────────────────────────────────
   PROGRESO — cuántos de los 10 objetos interactuables ya se exploraron,
   persistido entre visitas (localStorage, no depende de terminar el
   juego de una sentada). La puerta ('exit') no cuenta como objeto.
──────────────────────────────────────────────────── */
const DISCOVER_KEY = 'gam-discovered';
const DISCOVERABLE_IDS = [
  'piano', 'desk', 'juggling', 'diplomas', 'bed',
  'reading', 'terminal', 'skateboard', 'bookshelf', 'pukis',
];

function _loadDiscovered() {
  try { return new Set(JSON.parse(localStorage.getItem(DISCOVER_KEY) || '[]')); }
  catch { return new Set(); }
}
function _saveDiscovered() {
  try { localStorage.setItem(DISCOVER_KEY, JSON.stringify([..._discovered])); } catch { /* privado/lleno: sin progreso persistido, no rompe el juego */ }
}

let _discovered = _loadDiscovered();
let _celebrated = false; // no repetir el aviso de "recorriste todo" dentro de la misma sesión

function _updateProgressUI() {
  const el = document.getElementById('gam-progress');
  if (!el) return;
  el.hidden = _discovered.size === 0;
  el.textContent = `🔎 ${_discovered.size}/${DISCOVERABLE_IDS.length}`;
}

function _markDiscovered(id) {
  if (!DISCOVERABLE_IDS.includes(id) || _discovered.has(id)) return;
  _discovered.add(id);
  _saveDiscovered();
  _updateProgressUI();
  if (_discovered.size === DISCOVERABLE_IDS.length) _celebrateComplete();
}

/** Toast breve en el mismo lugar del contador — no compite con el panel
 *  que ya se está abriendo para el objeto que completó la ronda. */
function _celebrateComplete() {
  if (_celebrated) return;
  _celebrated = true;
  const el = document.getElementById('gam-progress');
  if (!el) return;
  el.classList.add('is-complete');
  const prev = el.textContent;
  el.textContent = LangSwitcher.getLang() === 'en' ? '🎉 Found them all!' : '🎉 ¡Encontraste todo!';
  setTimeout(() => {
    el.classList.remove('is-complete');
    el.textContent = prev;
  }, 4000);
}

function _esc(s) {
  return String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _loadHotspots() {
  if (!_hotspotsPromise) {
    _hotspotsPromise = fetch('data/gam-hotspots.json')
      .then(res => (res.ok ? res.json() : []))
      .catch(() => []);
  }
  return _hotspotsPromise;
}

/** Mismo patrón que projects.js: fetch de data/<mode>-projects.json, cacheado por modo. */
function _loadProjects(mode) {
  if (!_projectsCache[mode]) {
    _projectsCache[mode] = fetch(`data/${mode}-projects.json`)
      .then(res => (res.ok ? res.json() : []))
      .catch(() => []);
  }
  return _projectsCache[mode];
}

function _loadSkills() {
  if (!_skillsPromise) {
    _skillsPromise = fetch('data/skills.json')
      .then(res => (res.ok ? res.json() : []))
      .catch(() => []);
  }
  return _skillsPromise;
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
      // FIT: resolución lógica fija (800x600) escalada al contenedor real
      // (pantalla completa en desktop, ancho completo apilado en mobile —
      // ver .gam-tv__screen en css/gam-tv.css) sin distorsionar el aspect
      // ratio ni depender de max-width/max-height en CSS.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
    });

    GamTV.onBooted();
    window.dispatchEvent(new CustomEvent('gam:start'));
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
   PANEL DE OBJETOS — varias variantes sobre el mismo <div id="gam-modal">:
   texto simple (bed/pukis/reading, sin contenido real todavía), lista de
   proyectos (desk/bookshelf/terminal), o un minijuego montado dentro de
   #gam-modal-list (piano/malabares/patineta — ver gam-piano.js,
   gam-juggling.js, gam-skateboard.js). La trayectoria (diplomas) no usa
   este modal — abre el drawer que ya existe en el resto del sitio.
   Todas pausan la escena de Phaser mientras están abiertas.
──────────────────────────────────────────────────── */

/** Limpia cualquier minijuego montado — timers/audio/listeners propios. */
function _teardownMinigame() {
  _minigameUnmount?.();
  _minigameUnmount = null;
}

function _setCardVariant(variant) {
  const card = document.getElementById('gam-modal-card');
  card?.classList.remove('gam-modal__card--list', 'gam-modal__card--wide');
  if (variant) card?.classList.add(variant);
}

function _openTextPanel(detail) {
  ++_panelSeq;
  _teardownMinigame();
  const modal   = document.getElementById('gam-modal');
  const iconEl  = document.getElementById('gam-modal-icon');
  const titleEl = document.getElementById('gam-modal-title');
  const textEl  = document.getElementById('gam-modal-text');
  const listEl  = document.getElementById('gam-modal-list');
  if (!modal || !iconEl || !titleEl || !textEl) return;

  const content = detail.content || {};
  iconEl.textContent  = content.icon || '🚧';
  titleEl.textContent = LangSwitcher.L(content.title) || detail.label || 'Próximamente';
  textEl.textContent  = LangSwitcher.L(content.message) || 'Este objeto todavía está en construcción.';
  textEl.hidden = false;

  _setCardVariant(null);
  if (listEl) listEl.hidden = true;

  modal.hidden = false;
  // Sin esto el jugador se sigue moviendo (y puede volver a disparar E)
  // detrás del modal — la escena queda "viva" aunque no se vea.
  _game?.scene.pause('GamScene');
}

function _openListPanel(detail) {
  const seq = ++_panelSeq;
  _teardownMinigame();
  const modal   = document.getElementById('gam-modal');
  const iconEl  = document.getElementById('gam-modal-icon');
  const titleEl = document.getElementById('gam-modal-title');
  const textEl  = document.getElementById('gam-modal-text');
  const listEl  = document.getElementById('gam-modal-list');
  if (!modal || !listEl) return;

  const content = detail.content || {};
  const mode    = content.projectMode || 'dev';

  iconEl.textContent  = content.icon || '📁';
  titleEl.textContent = LangSwitcher.L(content.title) || detail.label || '';
  const msg = LangSwitcher.L(content.message);
  textEl.textContent = msg;
  textEl.hidden = !msg;

  _setCardVariant('gam-modal__card--list');
  listEl.hidden = false;
  listEl.innerHTML = '';

  const itemsWrap = document.createElement('div');
  itemsWrap.className = 'gam-modal__list-items';
  itemsWrap.innerHTML = '<p class="gam-modal__list-empty">Cargando…</p>';
  listEl.appendChild(itemsWrap);

  modal.hidden = false;
  _game?.scene.pause('GamScene');

  _loadProjects(mode).then(projects => {
    if (seq !== _panelSeq) return; // el panel se cerró (u otro se abrió) mientras cargaba
    _renderProjectItems(itemsWrap, projects, mode);
  });

  if (content.showAiSkills) {
    _loadSkills().then(skills => {
      if (seq !== _panelSeq) return;
      _renderSkillsBlock(listEl, skills);
    });
  }
}

function _renderProjectItems(wrap, projects, mode) {
  if (!projects.length) {
    wrap.innerHTML = '<p class="gam-modal__list-empty">Sin proyectos todavía.</p>';
    return;
  }

  wrap.innerHTML = projects.map((p, i) => `
    <button type="button" class="gam-modal__list-item" data-index="${i}">
      <span class="gam-modal__list-item-title">${_esc(LangSwitcher.L(p.title))}</span>
      <span class="gam-modal__list-item-desc">${_esc(LangSwitcher.L(p.description))}</span>
    </button>
  `).join('');

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.gam-modal__list-item');
    if (!btn) return;
    const p = projects[Number(btn.dataset.index)];
    if (!p) return;
    // Cierra el panel del cuarto antes de abrir la gallery fullscreen —
    // portfolio:projectOpen (disparado por ProjectGallery.open) vuelve a
    // pausar la escena, así que el juego nunca llega a "verse" correr.
    _closeModal();
    ProjectGallery.open(p, mode);
  });
}

function _renderSkillsBlock(listEl, skills) {
  const aiSkills = skills.filter(s => s.category === 'ai');
  if (!aiSkills.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'gam-modal__skills';
  const label = LangSwitcher.getLang() === 'en' ? 'AI tools' : 'Herramientas de IA';
  wrap.innerHTML = `
    <span class="gam-modal__skills-label">${_esc(label)}</span>
    ${aiSkills.map(s => `<span class="gam-modal__skill-chip">${_esc(s.name)}</span>`).join('')}
  `;
  listEl.appendChild(wrap);
}

/**
 * Minijuegos reales montados dentro de #gam-modal-list — cada módulo es
 * autocontenido (DOM propio, sus timers/listeners) y se importa recién al
 * interactuar con el objeto, no al entrar a .gam (mismo criterio de carga
 * perezosa que Phaser). `which` decide qué módulo cargar.
 */
async function _openMinigamePanel(detail, which) {
  const seq = ++_panelSeq;
  _teardownMinigame();
  const modal   = document.getElementById('gam-modal');
  const iconEl  = document.getElementById('gam-modal-icon');
  const titleEl = document.getElementById('gam-modal-title');
  const textEl  = document.getElementById('gam-modal-text');
  const listEl  = document.getElementById('gam-modal-list');
  if (!modal || !listEl) return;

  const content = detail.content || {};
  iconEl.textContent  = content.icon || '🎮';
  titleEl.textContent = LangSwitcher.L(content.title) || detail.label || '';
  textEl.hidden = true;

  _setCardVariant(which === 'skateboard' ? 'gam-modal__card--wide' : 'gam-modal__card--list');
  listEl.hidden = false;
  listEl.innerHTML = '<p class="gam-modal__list-empty">Cargando…</p>';

  modal.hidden = false;
  _game?.scene.pause('GamScene');

  try {
    let unmount;
    if (which === 'piano') {
      const { GamPiano } = await import('./gam-piano.js');
      if (seq !== _panelSeq) return;
      listEl.innerHTML = '';
      unmount = GamPiano.mount(listEl);
    } else if (which === 'juggling') {
      const { GamJuggling } = await import('./gam-juggling.js');
      if (seq !== _panelSeq) return;
      listEl.innerHTML = '';
      unmount = GamJuggling.mount(listEl, { videoUrl: content.videoUrl || null });
    } else if (which === 'skateboard') {
      const { GamSkateboard } = await import('./gam-skateboard.js');
      if (seq !== _panelSeq) return;
      listEl.innerHTML = '';
      unmount = GamSkateboard.mount(listEl);
    }

    if (seq === _panelSeq) {
      _minigameUnmount = unmount;
    } else {
      // El panel se cerró (o se abrió otro) mientras el módulo cargaba
      unmount?.();
    }
  } catch (err) {
    console.warn('[GamLoader] No se pudo cargar el minijuego:', err);
    if (seq === _panelSeq) {
      listEl.innerHTML = '<p class="gam-modal__list-empty">No se pudo cargar. Probá de nuevo.</p>';
    }
  }
}

function _closeModal() {
  ++_panelSeq;
  _teardownMinigame();
  const modal = document.getElementById('gam-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  _setCardVariant(null);
  const listEl = document.getElementById('gam-modal-list');
  if (listEl) { listEl.hidden = true; listEl.innerHTML = ''; }
  _game?.scene.resume('GamScene');
}

function _bindModal() {
  document.getElementById('gam-modal-close')?.addEventListener('click', _closeModal);
  document.getElementById('gam-modal-backdrop')?.addEventListener('click', _closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('gam-modal');
    if (modal && !modal.hidden) _closeModal();
  });
}

/* ────────────────────────────────────────────────────
   TRAYECTORIA — diplomas abre el drawer que ya existe en el resto del
   sitio (mismo evento que dispara project-detail.js/ia-tour.js), no un
   panel propio. Se pausa la escena al abrir; el MutationObserver de más
   abajo la retoma quando el drawer se cierra (backdrop, ✕, o Esc — los
   tres ya manejados por app.js, que solo togglea la clase 'open').
──────────────────────────────────────────────────── */
function _openTrajectory() {
  ++_panelSeq;
  window.dispatchEvent(new CustomEvent('portfolio:syncTrayectoria'));
  _game?.scene.pause('GamScene');
}

function _bindTrajectoryResume() {
  const panel = document.getElementById('jonathan-panel');
  if (!panel || !('MutationObserver' in window)) return;
  const mo = new MutationObserver(() => {
    if (!panel.classList.contains('open')) _game?.scene.resume('GamScene');
  });
  mo.observe(panel, { attributes: true, attributeFilter: ['class'] });
}

/* ────────────────────────────────────────────────────
   INIT — registrado antes de ThemeSwitcher.init() para no perderse
   el primer 'portfolio:modeChange' si el usuario ya estaba en .gam
──────────────────────────────────────────────────── */
function init() {
  GamTV.init();
  GamTV.onStart(_handleStart);
  _bindModal();
  _bindTrajectoryResume();
  _updateProgressUI(); // refleja el progreso de visitas anteriores apenas arranca

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
    const { kind, id } = e.detail;
    if (kind === 'exit') {
      ThemeSwitcher.switchMode(_lastNonGamMode || 'dev');
      return;
    }
    _markDiscovered(id);
    if (kind === 'list') {
      _openListPanel(e.detail);
    } else if (kind === 'trajectory') {
      _openTrajectory();
    } else if (id === 'piano' || id === 'juggling' || id === 'skateboard') {
      _openMinigamePanel(e.detail, id);
    } else {
      _openTextPanel(e.detail);
    }
  });

  // ProjectGallery pausa/retoma la escena si el usuario abrió un proyecto
  // desde la lista del cuarto — no-op en el resto de los modos (_game es
  // null salvo que .gam esté efectivamente jugando).
  window.addEventListener('portfolio:projectOpen',  () => { _game?.scene.pause('GamScene'); });
  window.addEventListener('portfolio:projectClose', () => { _game?.scene.resume('GamScene'); });
}

export const GamLoader = { init };
