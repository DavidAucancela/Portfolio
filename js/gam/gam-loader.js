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
let _sceneInstance   = null; // referencia directa a la GamScene activa — usada por _celebrateComplete()
let _booting         = false;
let _hotspotsPromise = null;
let _lastNonGamMode  = null;
let _panelSeq        = 0; // invalida renders async (fetch de lista) de un panel ya cerrado
let _modalCloseTimer = null;

const MODAL_FADE_MS = 180; // debe coincidir con la transición de .gam-modal en css/gam-tv.css

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
// terminal/diplomas salieron de la lista — son solo objetos decorativos del
// cuarto (ver FURNITURE en gam-three-scene.js, `interactive: false`). El
// estante volvió: ahora es una estación (libros de proyectos de IA).
const DISCOVERABLE_IDS = [
  'piano', 'desk', 'juggling', 'bed', 'reading', 'skateboard', 'pukis', 'bookshelf',
];

function _loadDiscovered() {
  // Filtrado contra DISCOVERABLE_IDS: visitas previas pueden traer ids que
  // ya no son hotspots (terminal/bookshelf/diplomas) y el contador marcaba 10/7.
  try { return new Set(JSON.parse(localStorage.getItem(DISCOVER_KEY) || '[]').filter(id => DISCOVERABLE_IDS.includes(id))); }
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
  // try/catch a propósito: esta llamada corre dentro del mismo stack síncrono
  // que _interact()/update() en GamScene (via window.dispatchEvent) — un throw
  // sin capturar acá se propaga hasta el step de Phaser y congela el loop
  // entero (ver el comentario largo en GamScene._interact()). El toast de
  // arriba ya se aplicó y no depende de esto.
  try { _sceneInstance?.celebrateComplete?.(); }
  catch (err) { console.error('[GamLoader] celebrateComplete falló (no fatal):', err); }
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
    // SPIKE (docs/gam-mode-plan.md § Three.js): motor swapeado de Phaser a
    // Three.js para evaluar el enfoque de cámara fija + estaciones sin
    // personaje caminando. gam-scene.js (Phaser) queda intacto sin usarse —
    // revertir el spike es volver a este bloque a su versión con Phaser.
    const [{ GamThreeScene }, hotspots] = await Promise.all([
      import('./gam-three-scene.js'),
      _loadHotspots(),
    ]);

    // Si el usuario salió de .gam mientras el motor cargaba, abortar boot
    if (ThemeSwitcher.getCurrentMode() !== 'gam') { _booting = false; return; }

    _game = GamThreeScene.mount(rootEl, hotspots);
    // celebrateComplete() es Phaser-only (ver _celebrateComplete() más abajo);
    // con _sceneInstance en null esa llamada se salta en silencio (?.), el
    // toast de #gam-progress sigue funcionando igual.
    _sceneInstance = null;

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
  _sceneInstance = null;
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

/** Saca [hidden] y arma la clase is-visible un frame después — dispara el
 *  fade+scale de entrada de .gam-modal (css/gam-tv.css) en vez de saltar
 *  directo a visible. */
function _showModal() {
  clearTimeout(_modalCloseTimer);
  const modal = document.getElementById('gam-modal');
  if (!modal) return;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-visible'));
}

function _setCardVariant(variant) {
  const card = document.getElementById('gam-modal-card');
  card?.classList.remove('gam-modal__card--list', 'gam-modal__card--wide');
  if (variant) card?.classList.add(variant);
}

function _openTextPanel(detail) {
  ++_panelSeq;
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

  _showModal();
  // Sin esto el jugador se sigue moviendo (y puede volver a disparar E)
  // detrás del modal — la escena queda "viva" aunque no se vea.
  _game?.scene.pause('GamScene');
}

function _openListPanel(detail) {
  const seq = ++_panelSeq;
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

  _showModal();
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

function _closeModal() {
  ++_panelSeq;
  const modal = document.getElementById('gam-modal');
  if (!modal || modal.hidden) return;
  _game?.scene.resume('GamScene');

  modal.classList.remove('is-visible');
  const finish = () => {
    modal.hidden = true;
    _setCardVariant(null);
    const listEl = document.getElementById('gam-modal-list');
    if (listEl) { listEl.hidden = true; listEl.innerHTML = ''; }
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) finish();
  else _modalCloseTimer = setTimeout(finish, MODAL_FADE_MS);
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
    // Las estaciones (piano, escritorio, cama…) se vuelven interactivas dentro
    // de la escena (gam-stations.js) — no abren ningún panel.
    if (e.detail.inScene) return;
    if (kind === 'list') {
      _openListPanel(e.detail);
    } else if (kind === 'trajectory') {
      _openTrajectory();
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
