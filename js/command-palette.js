/**
 * command-palette.js
 * Buscador global estilo Spotlight / VS Code.
 * Atajo: Cmd+K (Mac) · Ctrl+K (Windows/Linux)
 */

import { navigateToProject } from './app.js';

/* ─────────────────────────────────────────────────────────
   COMANDOS
───────────────────────────────────────────────────────── */
const ALL_COMMANDS = [
  // Navegación
  { id: 'nav-about',    icon: '👤', label: 'Sobre mí',       sub: 'Ir a la sección',    group: 'Navegación',
    keys: 'sobre bio about me perfil',                         action: () => _scrollTo('#about') },
  { id: 'nav-projects', icon: '💻', label: 'Proyectos',      sub: 'Ir a la sección',    group: 'Navegación',
    keys: 'proyectos projects portfolio trabajo apps',         action: () => _scrollTo('#projects') },
  { id: 'nav-skills',   icon: '⚡', label: 'Skills',         sub: 'Stack técnico',      group: 'Navegación',
    keys: 'skills habilidades stack tecnologias tech herramientas', action: () => _scrollTo('#skills') },
  { id: 'nav-contact',  icon: '✉️', label: 'Contacto',       sub: 'Formulario y redes', group: 'Navegación',
    keys: 'contacto contact email mensaje formulario',         action: () => _scrollTo('#contact') },

  // Modos
  { id: 'mode-dev', icon: '⚙️', label: 'Modo .dev', sub: 'Software Engineering',    group: 'Modo',
    keys: 'dev software fullstack desarrollo programacion',    action: () => _setMode('dev') },
  { id: 'mode-ia',  icon: '🤖', label: 'Modo .ia',  sub: 'Inteligencia Artificial', group: 'Modo',
    keys: 'ia inteligencia artificial llm rag ml embeddings',  action: () => _setMode('ia') },
  { id: 'mode-sec', icon: '🔒', label: 'Modo .sec', sub: 'Ciberseguridad',          group: 'Modo',
    keys: 'sec seguridad hacker pentest owasp ctf red team',   action: () => _setMode('sec') },

  // Proyectos
  { id: 'proj-mindlog', icon: '📔', label: 'MindLog', sub: 'React Native · FastAPI · Claude',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'mindlog diario react native expo mobile fastapi claude ia streaming sse',
    action: () => _openProject('mindlog', 'dev') },
  { id: 'proj-ubapp', icon: '📦', label: 'UBApp — Universal Box', sub: 'Django · Angular · pgvector',
    group: 'Proyectos', preferredMode: 'ia',
    keys: 'ubapp universal box django angular semantica embeddings envios openai',
    action: () => _openProject('ubapp', 'ia') },
  { id: 'proj-llm', icon: '📊', label: 'LLM Observatory', sub: 'React · Node.js · Claude API',
    group: 'Proyectos', preferredMode: 'ia',
    keys: 'llm observatory observabilidad claude tokens websocket socket dashboard',
    action: () => _openProject('llm-observatory', 'ia') },
  { id: 'proj-anaos', icon: '🏦', label: 'AnaOS', sub: 'ASP.NET · React · SaaS',
    group: 'Proyectos', preferredMode: 'ia',
    keys: 'anaos saas cooperativa aspnet react csharp railway multitenant',
    action: () => _openProject('anaos', 'ia') },
  { id: 'proj-ideancestral', icon: '🎨', label: 'Ideancestral', sub: 'Vue.js · Node.js · i18n',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'ideancestral vue artesanias ecuatorianas pinia i18n freelance',
    action: () => _openProject('ideancestral', 'dev') },
  { id: 'proj-securabank', icon: '🔐', label: 'SecuraBank', sub: 'Node.js · OWASP Top 10',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'securabank node seguridad owasp jwt bcrypt banca transacciones',
    action: () => _openProject('securabank', 'dev') },
  { id: 'proj-mapcriminals', icon: '🗺️', label: 'MapCriminals', sub: 'Leaflet · FBI API',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'mapcriminals mapa fbi api criminales leaflet google trends',
    action: () => _openProject('mapcriminals', 'dev') },
  { id: 'proj-equity', icon: '🔄', label: 'Equity', sub: 'Python · Django · ETL',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'equity etl pipeline python django json datos limpieza',
    action: () => _openProject('equity', 'dev') },
  { id: 'proj-conquito', icon: '🏛️', label: 'ConQuito — Fundaciones', sub: 'Leaflet · Datos Abiertos',
    group: 'Proyectos', preferredMode: 'dev',
    keys: 'conquito fundaciones quito leaflet datos abiertos visualizacion mapa',
    action: () => _openProject('conquito-fundaciones', 'dev') },

  // Acciones
  { id: 'action-cv', icon: '📄', label: 'Descargar CV', sub: 'Hoja de vida en PDF',
    group: 'Acciones', keys: 'cv curriculum resume descargar pdf hoja vida',
    action: () => _downloadCV() },
  { id: 'action-email', icon: '📋', label: 'Copiar email', sub: 'jonathan_jd@outlook.com',
    group: 'Acciones', keys: 'email correo copiar contacto',
    action: () => _copyEmail() },
  { id: 'action-linkedin', icon: '💼', label: 'LinkedIn', sub: 'Ver perfil profesional',
    group: 'Acciones', keys: 'linkedin perfil profesional red trabajo',
    action: () => _openLink('https://www.linkedin.com/in/jonathan-david-aucancela/') },
  { id: 'action-github', icon: '🐙', label: 'GitHub', sub: 'Ver repositorios',
    group: 'Acciones', keys: 'github repositorios codigo open source',
    action: () => _openLink('https://github.com/DavidAucancela') },
  { id: 'action-trayectoria', icon: '🗓️', label: 'Ver Trayectoria', sub: 'Timeline de experiencia',
    group: 'Acciones', keys: 'trayectoria timeline experiencia jonathan historia',
    action: () => _openTrayectoria() },
];

/* ─────────────────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────────────────── */
let _el        = null;
let _inputEl   = null;
let _resultsEl = null;
let _isOpen    = false;
let _activeIdx = -1;
let _filtered  = [];

/* ─────────────────────────────────────────────────────────
   API PÚBLICA
───────────────────────────────────────────────────────── */
export const CommandPalette = { init };

function init() {
  _inject();
  _bindGlobalKeys();
  window.addEventListener('command-palette:open', open);
  _addNavTrigger();
}

/* ─────────────────────────────────────────────────────────
   INYECCIÓN DEL DOM
───────────────────────────────────────────────────────── */
function _inject() {
  if (_el) return;

  _el = document.createElement('div');
  _el.id        = 'cmd-palette';
  _el.className = 'cmd-overlay';
  _el.setAttribute('aria-hidden', 'true');
  _el.setAttribute('role', 'dialog');
  _el.setAttribute('aria-modal', 'true');
  _el.setAttribute('aria-label', 'Buscador de comandos');

  _el.innerHTML = `
    <div class="cmd-backdrop"></div>
    <div class="cmd-modal">
      <div class="cmd-header">
        <svg class="cmd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="cmd-input" class="cmd-input"
               placeholder="Buscar secciones, proyectos, acciones..."
               autocomplete="off" autocorrect="off" spellcheck="false"
               role="searchbox" aria-label="Buscar comando"
               aria-autocomplete="list" aria-controls="cmd-results" />
        <kbd class="cmd-esc-hint">esc</kbd>
      </div>
      <div id="cmd-results" class="cmd-results" role="listbox" aria-label="Resultados"></div>
      <div class="cmd-footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
        <span><kbd>↵</kbd> seleccionar</span>
        <span><kbd>esc</kbd> cerrar</span>
      </div>
    </div>
  `;

  document.body.appendChild(_el);

  _inputEl   = _el.querySelector('#cmd-input');
  _resultsEl = _el.querySelector('#cmd-results');

  _el.querySelector('.cmd-backdrop').addEventListener('click', close);
  _inputEl.addEventListener('input', _onInput);
  _inputEl.addEventListener('keydown', e => {
    if (['ArrowDown','ArrowUp','Enter'].includes(e.key)) e.preventDefault();
  });

  _render('');
}

/* ─────────────────────────────────────────────────────────
   BOTÓN DE ACCESO EN EL NAVBAR
───────────────────────────────────────────────────────── */
function _addNavTrigger() {
  const actions = document.querySelector('.navbar__actions');
  if (!actions) return;

  const btn = document.createElement('button');
  btn.className = 'cmd-nav-trigger';
  btn.id        = 'cmd-palette-btn';
  btn.title     = 'Buscador global';
  btn.setAttribute('aria-label', 'Abrir buscador (⌘K)');
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <span class="cmd-kbd-label">⌘K</span>
  `;
  btn.addEventListener('click', toggle);

  const hamburger = actions.querySelector('.navbar__hamburger');
  hamburger ? actions.insertBefore(btn, hamburger) : actions.appendChild(btn);
}

/* ─────────────────────────────────────────────────────────
   ABRIR / CERRAR
───────────────────────────────────────────────────────── */
function open() {
  if (_isOpen) return;
  _isOpen = true;
  _el.setAttribute('aria-hidden', 'false');
  _el.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  _inputEl.value = '';
  _activeIdx = -1;
  _render('');
  requestAnimationFrame(() => _inputEl.focus());
}

function close() {
  if (!_isOpen) return;
  _isOpen = false;
  _el.setAttribute('aria-hidden', 'true');
  _el.classList.remove('is-open');
  document.body.style.overflow = '';
  _activeIdx = -1;
}

function toggle() { _isOpen ? close() : open(); }

/* ─────────────────────────────────────────────────────────
   TECLADO
───────────────────────────────────────────────────────── */
function _bindGlobalKeys() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggle();
      return;
    }
    if (!_isOpen) return;
    if (e.key === 'Escape')    { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); _moveActive(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); _moveActive(-1); }
    if (e.key === 'Enter')     { e.preventDefault(); _selectActive(); }
  });
}

function _moveActive(dir) {
  if (_filtered.length === 0) return;
  _activeIdx = (_activeIdx + dir + _filtered.length) % _filtered.length;
  _updateActiveClass();
  _resultsEl.querySelector('.cmd-item.is-active')?.scrollIntoView({ block: 'nearest' });
}

function _selectActive() {
  if (_activeIdx >= 0 && _activeIdx < _filtered.length) _run(_filtered[_activeIdx]);
}

function _updateActiveClass() {
  _resultsEl.querySelectorAll('.cmd-item').forEach((el, i) => {
    el.classList.toggle('is-active', i === _activeIdx);
    el.setAttribute('aria-selected', i === _activeIdx ? 'true' : 'false');
  });
}

/* ─────────────────────────────────────────────────────────
   BÚSQUEDA Y RENDER
───────────────────────────────────────────────────────── */
function _onInput(e) {
  _activeIdx = -1;
  _render(e.target.value.trim());
}

function _score(cmd, query) {
  if (!query) return 1;
  const q    = query.toLowerCase();
  const lbl  = cmd.label.toLowerCase();
  const sub  = (cmd.sub  || '').toLowerCase();
  const keys = (cmd.keys || '').toLowerCase();
  if (lbl.startsWith(q))  return 10;
  if (lbl.includes(q))    return 7;
  if (sub.includes(q))    return 5;
  if (keys.includes(q))   return 3;
  return 0;
}

function _render(query) {
  const scored = ALL_COMMANDS
    .map(cmd => ({ cmd, score: _score(cmd, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  _filtered = scored.map(x => x.cmd);

  if (_filtered.length === 0) {
    _resultsEl.innerHTML = `
      <div class="cmd-empty">
        <span aria-hidden="true">⌕</span>
        <p>Sin resultados para "<em>${_esc(query)}</em>"</p>
      </div>`;
    return;
  }

  // Agrupar por grupo
  const groups = {};
  _filtered.forEach((cmd, idx) => {
    (groups[cmd.group] = groups[cmd.group] || []).push({ cmd, idx });
  });

  _resultsEl.innerHTML = Object.entries(groups).map(([group, items]) => `
    <div class="cmd-group">
      <div class="cmd-group-label" aria-hidden="true">${_esc(group)}</div>
      ${items.map(({ cmd, idx }) => `
        <button class="cmd-item" data-idx="${idx}" role="option"
                aria-selected="false" tabindex="-1" data-cmd-id="${_esc(cmd.id)}">
          <span class="cmd-item-icon" aria-hidden="true">${cmd.icon}</span>
          <span class="cmd-item-text">
            <span class="cmd-item-label">${_esc(cmd.label)}</span>
            <span class="cmd-item-sub">${_esc(cmd.sub || '')}</span>
          </span>
          ${cmd.group === 'Modo' ? `<span class="cmd-item-badge">${_esc(cmd.id.replace('mode-','.'))}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `).join('');

  _resultsEl.querySelectorAll('.cmd-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      if (!isNaN(idx)) _run(_filtered[idx]);
    });
    el.addEventListener('mouseenter', () => {
      _activeIdx = parseInt(el.dataset.idx, 10);
      _updateActiveClass();
    });
  });
}

function _run(cmd) {
  close();
  setTimeout(() => cmd.action(), 80);
}

/* ─────────────────────────────────────────────────────────
   ACCIONES
───────────────────────────────────────────────────────── */
function _scrollTo(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const style = getComputedStyle(document.documentElement);
  const navH  = (parseInt(style.getPropertyValue('--nav-height')) || 70) +
                (parseInt(style.getPropertyValue('--mode-bar-height')) || 32);
  window.scrollTo({
    top:      el.getBoundingClientRect().top + window.scrollY - navH - 16,
    behavior: 'smooth',
  });
}

function _setMode(mode) {
  window.dispatchEvent(new CustomEvent('portfolio:modeChange', { detail: { mode } }));
}

function _openProject(slug, preferredMode) {
  const currentMode = document.body.getAttribute('data-theme') || 'dev';
  if (currentMode !== preferredMode) {
    _setMode(preferredMode);
    setTimeout(() => navigateToProject(slug), 750);
  } else {
    navigateToProject(slug);
  }
}

function _downloadCV() {
  const a    = document.createElement('a');
  a.href     = 'public/Hoja de vida - Jonathan Aucancela.pdf';
  a.download = 'Jonathan Aucancela - CV.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function _copyEmail() {
  const email = 'jonathan_jd@outlook.com';
  navigator.clipboard.writeText(email)
    .then(()  => _showToast('✓ Email copiado al portapapeles'))
    .catch(()  => _showToast('jonathan_jd@outlook.com'));
}

function _openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function _openTrayectoria() {
  document.getElementById('jonathan-panel-btn')?.click();
}

function _showToast(msg) {
  document.querySelector('.cmd-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'cmd-toast';
  toast.textContent = msg;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
