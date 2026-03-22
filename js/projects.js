/**
 * projects.js
 * Carga y renderiza los proyectos desde JSON según el modo activo.
 *
 * Flujo:
 *  1. Escucha portfolio:modeChange
 *  2. fetch('data/{mode}-projects.json')
 *  3. Si hay proyectos → renderCards con stagger
 *  4. Si array vacío  → renderComingSoon con diseño del tema
 */

import { ProjectDetail } from './project-detail.js';

/* ────────────────────────────────────────────────────
   MENSAJES "COMING SOON" POR MODO
──────────────────────────────────────────────────── */
const COMING_SOON = {
  dev: {
    icon:    '🚧',
    title:   'Más proyectos próximamente',
    message: 'Nuevos sistemas en construcción. Stay tuned.',
    badge:   'En desarrollo',
  },
  ia: {
    icon:    '🤖',
    title:   'Proyectos IA en construcción',
    message: 'Sistemas con LLMs, RAG y agentes inteligentes próximamente.',
    badge:   'Entrenando modelos...',
  },
  sec: {
    icon:    '🔒',
    title:   'Proyectos de seguridad próximamente',
    message: 'Reportes de pentest, herramientas y writeups CTF en construcción.',
    badge:   '> scanning for projects...',
  },
};

let currentMode     = 'dev';
let isLoading       = false;
let _allProjects    = [];

const SLUG_MAP = {
  'project-001': 'ubapp',
  'project-002': 'ideancestral',
  'project-003': 'anaos',
  'project-004': 'equity',
  'project-005': 'securabank',
  'project-006': 'conquito-fundaciones',
  'project-007': 'mapcriminals',
  'project-008': 'llm-observatory',
};

/* ────────────────────────────────────────────────────
   CARGA DE PROYECTOS
──────────────────────────────────────────────────── */
async function loadProjects(mode) {
  if (isLoading) return;
  isLoading   = true;
  currentMode = mode;

  const grid = document.getElementById('projects-grid');
  if (!grid) { isLoading = false; return; }

  // Mostrar skeleton
  _renderSkeleton(grid);

  try {
    const res      = await fetch(`data/${mode}-projects.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const projects = await res.json();
    if (Array.isArray(projects)) {
      projects.forEach(p => { if (!p.slug && p.id) p.slug = SLUG_MAP[p.id] || null; });
      _allProjects = projects;
    }

    // Pequeño delay para que el skeleton sea perceptible
    await new Promise(r => setTimeout(r, 300));

    if (!Array.isArray(projects) || projects.length === 0) {
      _renderComingSoon(grid, mode);
    } else {
      _renderCards(grid, projects, mode);
    }

  } catch (err) {
    console.warn('[Projects] No se pudo cargar:', err.message);
    _renderComingSoon(grid, mode);
  } finally {
    isLoading = false;
  }
}

/* ────────────────────────────────────────────────────
   SKELETON LOADING
──────────────────────────────────────────────────── */
function _renderSkeleton(grid) {
  grid.innerHTML = [1, 2, 3].map(() => `
    <div class="project-card skeleton-card" aria-hidden="true">
      <div class="card-image-wrap">
        <div class="skeleton" style="height:100%; border-radius:0;"></div>
      </div>
      <div class="card-body" style="gap:0.6rem;">
        <div class="skeleton" style="height:12px; width:30%; border-radius:100px;"></div>
        <div class="skeleton" style="height:20px; width:65%;"></div>
        <div class="skeleton" style="height:14px; width:100%;"></div>
        <div class="skeleton" style="height:14px; width:80%;"></div>
        <div style="display:flex; gap:0.4rem; margin-top:0.25rem;">
          <div class="skeleton" style="height:22px; width:60px; border-radius:100px;"></div>
          <div class="skeleton" style="height:22px; width:50px; border-radius:100px;"></div>
          <div class="skeleton" style="height:22px; width:70px; border-radius:100px;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ────────────────────────────────────────────────────
   RENDER DE CARDS
──────────────────────────────────────────────────── */
function _renderCards(grid, projects, mode) {
  // Separar featured de los demás
  const featured = projects.filter(p => p.featured);
  const rest      = projects.filter(p => !p.featured);
  const ordered   = [...featured, ...rest];

  grid.innerHTML = '';

  // Ajustar clase del grid si hay proyectos destacados
  grid.className = featured.length > 0
    ? 'projects-grid projects-grid--has-featured'
    : 'projects-grid';

  ordered.forEach((project, i) => {
    const card = _buildCard(project, mode);
    card.style.opacity   = '0';
    card.style.transform = 'translateY(24px) scale(0.97)';
    grid.appendChild(card);

    // Stagger de entrada
    setTimeout(() => {
      card.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      card.style.opacity    = '1';
      card.style.transform  = 'translateY(0) scale(1)';
    }, 60 + i * 80);
  });
}

function _buildCard(p, mode) {
  if (mode === 'sec' && p.lab) return _buildLabCard(p);

  const card = document.createElement('article');
  card.className = `project-card${p.featured ? ' project-card--featured' : ''}`;
  card.setAttribute('aria-label', p.title);

  if (p.id && SLUG_MAP[p.id]) card.dataset.slug = SLUG_MAP[p.id];

  // Imagen o placeholder
  const imgHTML = p.image
    ? `<img src="${p.image}" alt="Captura de ${p.title}" loading="lazy"
            onerror="this.parentElement.innerHTML='<div class=\\'card-image-placeholder\\'>${_getModeEmoji(mode)}</div>'; this.onerror=null;" />`
    : `<div class="card-image-placeholder" aria-hidden="true">${_getModeEmoji(mode)}</div>`;

  // Fecha formateada
  const dateLabel = p.date
    ? (() => {
        const [y, m] = p.date.split('-');
        const mes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m,10)-1] || '';
        return `${mes} ${y}`;
      })()
    : '';

  // Tags (máx 4 visibles)
  const tagsHTML = p.tags.slice(0, 4)
    .map(t => `<span class="tag">${t}</span>`)
    .join('') + (p.tags.length > 4
      ? `<span class="tag tag--more">+${p.tags.length - 4}</span>`
      : '');

  // Badges sobre la imagen
  const featuredBadge = p.featured
    ? `<span class="card-img-badge card-img-badge--featured">
         <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
         </svg>
         Destacado
       </span>`
    : '';

  const dateBadge = dateLabel
    ? `<span class="card-img-badge card-img-badge--date">${dateLabel}</span>`
    : '';

  // Botones
  const liveBtn = p.liveUrl
    ? `<a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer"
          class="card-btn card-btn--primary" aria-label="Ver demo de ${p.title}">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
           <polyline points="15 3 21 3 21 9"/>
           <line x1="10" y1="14" x2="21" y2="3"/>
         </svg>
         Ver demo
       </a>`
    : '';

  const repoBtn = p.repoUrl
    ? `<a href="${p.repoUrl}" target="_blank" rel="noopener noreferrer"
          class="card-btn card-btn--outline" aria-label="Ver código de ${p.title}">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
         </svg>
         Código
       </a>`
    : '';

  const privateNote = !liveBtn && !repoBtn
    ? `<span class="card-private-note">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
           <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
           <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
         </svg>
         Repositorio privado
       </span>`
    : '';

  card.innerHTML = `
    <div class="card-image-wrap">
      ${imgHTML}
      <div class="card-image-overlay" aria-hidden="true"></div>
      <div class="card-img-badges">
        ${featuredBadge}
        ${dateBadge}
      </div>
    </div>
    <div class="card-body">
      <h3 class="card-title">${p.title}</h3>
      <p class="card-description">${p.description}</p>
      <div class="card-tags">${tagsHTML}</div>
    </div>
    <div class="card-links">
      ${liveBtn}
      ${repoBtn}
      ${privateNote}
      <button class="card-btn card-btn--process" aria-label="Ver proceso de ${p.title}" type="button">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 8 12 12 14 14"/>
        </svg>
        Proceso
      </button>
    </div>
  `;

  _addTiltEffect(card);
  _addDetailClick(card, p);
  return card;
}

function _buildLabCard(p) {
  const lab  = p.lab;
  const isHTB = lab.platform === 'HackTheBox';
  const platformColor = isHTB ? '#9fef00' : '#c11111';
  const platformBg    = isHTB ? 'rgba(159,239,0,0.08)' : 'rgba(193,17,17,0.08)';
  const osIcon = lab.os === 'Windows' ? '🪟' : '🐧';

  const diffColor = {
    'Very Easy': '#9fef00',
    'Easy':      '#ffce3d',
    'Medium':    '#ff9f3f',
    'Hard':      '#ff4444',
    'Insane':    '#b14eff',
  }[lab.difficulty] || '#9fef00';

  const techniquesHTML = lab.techniques
    .map(t => `<span class="lab-technique">${t}</span>`)
    .join('');

  const card = document.createElement('article');
  card.className = 'project-card lab-card';
  card.setAttribute('aria-label', `${p.title} — ${lab.platform}`);

  card.innerHTML = `
    <div class="lab-card-header" style="border-bottom: 1px solid var(--border-color);">
      <div class="lab-platform-bar" style="background:${platformColor};"></div>
      <div class="lab-header-content">
        <div class="lab-platform-badge" style="color:${platformColor}; background:${platformBg};">
          ${isHTB
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7L12 4.18z"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>`
          }
          ${lab.platform}
        </div>
        <span class="lab-status">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9fef00" stroke-width="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${lab.status}
        </span>
      </div>
    </div>

    <div class="card-body" style="gap:0.6rem;">
      <div class="lab-meta">
        <span class="lab-os">${osIcon} ${lab.os}</span>
        <span class="lab-diff" style="color:${diffColor}; border-color:${diffColor}33;">
          ${lab.difficulty}
        </span>
        <span class="lab-rating">★ ${lab.rating}</span>
      </div>

      <h3 class="card-title" style="font-size:1.25rem; letter-spacing:0.02em;">
        ${p.title}
        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:400; margin-left:0.4rem; font-family:var(--font-display);">#starting-point</span>
      </h3>

      <p class="card-description">${p.description}</p>

      <div class="lab-techniques">
        <span class="lab-techniques-label">Técnicas:</span>
        ${techniquesHTML}
      </div>
    </div>

    <div class="card-links" style="justify-content:center; gap:0.5rem;">
      <span class="lab-pwned-badge">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Machine Pwned
      </span>
      <button class="card-btn card-btn--process" aria-label="Ver writeup de ${p.title}" type="button">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 8 12 12 14 14"/>
        </svg>
        Writeup
      </button>
    </div>
  `;

  _addTiltEffect(card);
  _addDetailClick(card, p);
  return card;
}

function _getModeEmoji(mode) {
  return { dev: '💻', ia: '🤖', sec: '🔒' }[mode] || '📁';
}

/* ────────────────────────────────────────────────────
   COMING SOON
──────────────────────────────────────────────────── */
function _renderComingSoon(grid, mode) {
  const cs   = COMING_SOON[mode] || COMING_SOON.dev;
  const isSec = mode === 'sec';

  grid.className = 'projects-grid';
  grid.innerHTML = `
    <div class="coming-soon" style="grid-column: 1 / -1;" role="status" aria-live="polite">
      <div class="coming-soon-icon" aria-hidden="true">${cs.icon}</div>
      <h3 class="coming-soon-title">${cs.title}</h3>
      <p class="coming-soon-text">${cs.message}</p>
      <div class="coming-soon-badge${isSec ? ' coming-soon-badge--terminal' : ''}">
        ${isSec ? '' : '🔄 '} ${cs.badge}
      </div>
      ${isSec ? `
      <div style="
        font-family: var(--font-display);
        font-size: 0.75rem;
        color: var(--color-accent);
        margin-top: 1rem;
        opacity: 0.6;
        letter-spacing: 0.08em;
      " aria-hidden="true">
        [ 0 results found — check back soon ]
      </div>` : ''}
    </div>
  `;
}

/* ────────────────────────────────────────────────────
   DETALLE / GAMIFICATION CLICK
──────────────────────────────────────────────────── */
function _addDetailClick(card, p) {
  const btn = card.querySelector('.card-btn--process');
  if (!btn) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    ProjectDetail.open(p, currentMode, _allProjects);
  });
}

/* ────────────────────────────────────────────────────
   EFECTO 3D TILT EN CARDS (mouse tracking)
──────────────────────────────────────────────────── */
function _addTiltEffect(card) {
  // Solo en dispositivos con puntero preciso (desktop)
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const MAX_TILT = 8; // grados máximos de inclinación

  card.addEventListener('mousemove', e => {
    const rect   = card.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) / (rect.width  / 2);
    const dy     = (e.clientY - cy) / (rect.height / 2);
    const tiltX  = -dy * MAX_TILT;
    const tiltY  =  dx * MAX_TILT;

    card.style.transform = `
      translateY(-6px)
      perspective(800px)
      rotateX(${tiltX}deg)
      rotateY(${tiltY}deg)
      scale3d(1.02, 1.02, 1.02)
    `;
    card.style.transition = 'transform 0.1s ease';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform  = '';
    card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  });
}

/* ────────────────────────────────────────────────────
   EVENTOS
──────────────────────────────────────────────────── */
window.addEventListener('portfolio:modeChange', e => {
  loadProjects(e.detail.mode);
});

/* Abrir detalle desde la trayectoria (Jonathan Panel) */
window.addEventListener('portfolio:openProjectDetail', async e => {
  const { slug } = e.detail;
  let project = _allProjects.find(p => p.slug === slug);

  /* Fallback: si no está en el modo actual, buscar en dev-projects.json */
  if (!project) {
    try {
      const res = await fetch('data/dev-projects.json');
      if (res.ok) {
        const devProjects = await res.json();
        devProjects.forEach(p => { if (!p.slug && p.id) p.slug = SLUG_MAP[p.id] || null; });
        project = devProjects.find(p => p.slug === slug);
      }
    } catch (_) {}
  }

  if (project) ProjectDetail.open(project, currentMode, _allProjects);
});

/* ────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────── */
function init() {
  const mode = localStorage.getItem('portfolio-mode') || 'dev';
  loadProjects(mode);
}

/* ────────────────────────────────────────────────────
   EXPORT
──────────────────────────────────────────────────── */
export const Projects = { loadProjects, init };
