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

const GAME_WIDTH  = 800;
const GAME_HEIGHT = 600;

const _projectsCache = {};
let _skillsPromise = null;

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
   PANEL DE OBJETOS — dos variantes sobre el mismo <div id="gam-modal">:
   texto simple (info/video/3d/minigame sin contenido real todavía) o
   lista de proyectos (desk/bookshelf/terminal). La trayectoria (diplomas)
   no usa este modal — abre el drawer que ya existe en el resto del sitio.
   Cualquiera de las tres pausa la escena de Phaser mientras está abierta.
──────────────────────────────────────────────────── */
function _openTextPanel(detail) {
  ++_panelSeq;
  const modal   = document.getElementById('gam-modal');
  const card    = document.getElementById('gam-modal-card');
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

  card?.classList.remove('gam-modal__card--list');
  if (listEl) listEl.hidden = true;

  modal.hidden = false;
  // Sin esto el jugador se sigue moviendo (y puede volver a disparar E)
  // detrás del modal — la escena queda "viva" aunque no se vea.
  _game?.scene.pause('GamScene');
}

function _openListPanel(detail) {
  const seq = ++_panelSeq;
  const modal   = document.getElementById('gam-modal');
  const card    = document.getElementById('gam-modal-card');
  const iconEl  = document.getElementById('gam-modal-icon');
  const titleEl = document.getElementById('gam-modal-title');
  const textEl  = document.getElementById('gam-modal-text');
  const listEl  = document.getElementById('gam-modal-list');
  if (!modal || !card || !listEl) return;

  const content = detail.content || {};
  const mode    = content.projectMode || 'dev';

  iconEl.textContent  = content.icon || '📁';
  titleEl.textContent = LangSwitcher.L(content.title) || detail.label || '';
  const msg = LangSwitcher.L(content.message);
  textEl.textContent = msg;
  textEl.hidden = !msg;

  card.classList.add('gam-modal__card--list');
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

function _closeModal() {
  ++_panelSeq;
  const modal = document.getElementById('gam-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.getElementById('gam-modal-card')?.classList.remove('gam-modal__card--list');
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
    const { kind } = e.detail;
    if (kind === 'exit') {
      ThemeSwitcher.switchMode(_lastNonGamMode || 'dev');
    } else if (kind === 'list') {
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
