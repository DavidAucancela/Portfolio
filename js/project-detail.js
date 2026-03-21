/**
 * project-detail.js
 * Panel lateral con vista gamificada del proceso de cada proyecto/lab.
 * Se abre al hacer clic en "Ver Proceso" de cualquier tarjeta.
 *
 * Gamificación:
 *  - XP bar + nivel (distinto por modo dev / ia / sec)
 *  - Quest Log: fases colapsables con XP por fase
 *  - Achievements: métricas como logros desbloqueados
 *  - Tech Arsenal: stack como equipamiento
 */

/* ─────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────── */
const XP_PER_TAG   = 25;
const XP_PER_PHASE = 150;
const XP_FEATURED  = 200;
const XP_PER_TECH  = 30;
const XP_MAX       = 2000;

const LEVEL_NAMES = {
  dev: ['Rookie',      'Developer',  'Engineer',    'Architect',     'Mastermind'  ],
  ia:  ['Trainee',     'ML Dev',     'AI Engineer', 'MLOps',         'AI Researcher'],
  sec: ['Script Kiddie','Pentester', 'Red Teamer',  'Threat Hunter', 'Elite Hacker'],
};

const MODE_LABELS = {
  dev: { pill: '⚙️ .dev',  unit: 'XP'          },
  ia:  { pill: '🤖 .ia',   unit: 'Credits'      },
  sec: { pill: '🔒 .sec',  unit: 'CVE Points'   },
};

/* Metadata por fase: icon, label y verbo según modo, XP base */
const PHASE_META = {
  problema: {
    icon:   '🎯',
    labels: { dev: 'Problem Statement', ia: 'Caso de Uso',      sec: 'Scope & Target'  },
    verbs:  { dev: 'Issue Opened',      ia: 'Prompt Defined',   sec: 'Target Locked'   },
    xp: 150,
  },
  analisis: {
    icon:   '🔍',
    labels: { dev: 'Análisis Técnico',  ia: 'Data Analysis',    sec: 'Reconnaissance'  },
    verbs:  { dev: 'Research Done',     ia: 'Epoch 0',          sec: 'OSINT Complete'  },
    xp: 200,
  },
  diseño: {
    icon:   '📐',
    labels: { dev: 'Arquitectura',      ia: 'Model Design',     sec: 'Attack Vector'   },
    verbs:  { dev: 'Blueprint Ready',   ia: 'Architecture Set', sec: 'Vector Found'    },
    xp: 250,
  },
  desarrollo: {
    icon:   '⚙️',
    labels: { dev: 'Desarrollo',        ia: 'Implementación',   sec: 'Exploitation'    },
    verbs:  { dev: 'PR Merged',         ia: 'Training Done',    sec: 'Root Obtained'   },
    xp: 400,
  },
  despliegue: {
    icon:   '🚀',
    labels: { dev: 'Despliegue',        ia: 'Inference Deploy', sec: 'Post-Exploit'    },
    verbs:  { dev: 'Shipped!',          ia: 'Model Live',       sec: 'Pivoted'         },
    xp: 300,
  },
  seguridad: {
    icon:   '🛡️',
    labels: { dev: 'Seguridad',         ia: 'AI Safety',        sec: 'Loot & Report'   },
    verbs:  { dev: 'Hardened',          ia: 'Aligned',          sec: 'Flag Captured'   },
    xp: 200,
  },
};

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function _achievementIcon(label) {
  const l = label.toLowerCase();
  if (l.includes('tiempo') || l.includes('latencia') || l.includes('speed')) return '⚡';
  if (l.includes('usuario') || l.includes('user'))                            return '👥';
  if (l.includes('seguridad') || l.includes('owasp'))                         return '🛡️';
  if (l.includes('módulo') || l.includes('servicio') || l.includes('service'))return '🔧';
  if (l.includes('idioma') || l.includes('lang'))                             return '🌍';
  if (l.includes('deploy') || l.includes('railway') || l.includes('docker')) return '🚀';
  if (l.includes('error') || l.includes('uptime'))                            return '✅';
  if (l.includes('mejora') || l.includes('eficien'))                          return '📈';
  if (l.includes('overhead'))                                                  return '🪶';
  if (l.includes('modelo') || l.includes('model'))                            return '🤖';
  if (l.includes('flag'))                                                      return '🏴';
  if (l.includes('plan') || l.includes('suscri'))                             return '💳';
  if (l.includes('país') || l.includes('pais') || l.includes('country'))      return '🗺️';
  return '🏆';
}

function _calcXP(p) {
  const tagsXP = (p.tags?.length || 0) * XP_PER_TAG;
  const pasos  = p.process?.pasos ?? [];
  const labTec = p.lab?.techniques ?? [];
  const procXP = (pasos.length > 0 ? pasos.length : (labTec.length > 0 ? 3 : 2)) * XP_PER_PHASE;
  const featXP = p.featured ? XP_FEATURED : 0;

  // Count tech stack items
  const techItems = p.techStack
    ? Object.values(p.techStack).flat().length
    : 0;
  const techXP = techItems * XP_PER_TECH;

  const total   = tagsXP + procXP + featXP + techXP;
  const percent = Math.min((total / XP_MAX) * 100, 100);

  const thresholds = [0, 500, 1000, 1500, 2000];
  let levelIdx = 0;
  for (let i = 1; i < thresholds.length; i++) {
    if (total >= thresholds[i]) levelIdx = i;
  }

  return { total, percent, levelIdx };
}

/* ─────────────────────────────────────────────────────────
   HTML BUILDERS
───────────────────────────────────────────────────────── */
function _phaseHTML(paso, idx, mode, unit) {
  const fallback = {
    icon:   '📌',
    labels: { dev: paso.id, ia: paso.id, sec: paso.id },
    verbs:  { dev: 'Complete', ia: 'Done', sec: 'Done' },
    xp: 150,
  };
  const meta  = PHASE_META[paso.id] || fallback;
  const label = meta.labels[mode] || paso.id;
  const verb  = meta.verbs[mode]  || 'Complete';
  const xp    = meta.xp;

  const pointsHTML = (paso.puntos || [])
    .map(pt => `<li class="pdm-phase__point">${_esc(pt)}</li>`)
    .join('');

  return `
    <div class="pdm-phase">
      <button class="pdm-phase__header" type="button"
              aria-expanded="false" aria-label="Expandir fase ${_esc(label)}">
        <span class="pdm-phase__num">0${idx + 1}</span>
        <span class="pdm-phase__icon" aria-hidden="true">${meta.icon}</span>
        <div class="pdm-phase__info">
          <div class="pdm-phase__name">${_esc(label)}</div>
          <div class="pdm-phase__verb">✓ ${_esc(verb)}</div>
        </div>
        <span class="pdm-phase__xp">+${xp} ${unit}</span>
        <svg class="pdm-phase__chevron" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="pdm-phase__body">
        <div class="pdm-phase__body-inner">
          <div class="pdm-phase__content">
            ${paso.resumen ? `<p class="pdm-phase__summary">${_esc(paso.resumen)}</p>` : ''}
            ${pointsHTML   ? `<ul class="pdm-phase__points">${pointsHTML}</ul>`       : ''}
          </div>
        </div>
      </div>
    </div>`;
}

/* Generate synthetic phases for projects without explicit process data */
function _syntheticPhases(p) {
  const desc  = p.longDescription || p.description || '';
  const pasos = [];

  pasos.push({
    id: 'analisis',
    resumen: desc,
    puntos: (p.tags || []).slice(0, 4).map(t => `Tecnología utilizada: ${t}`),
  });

  if ((p.tags || []).length > 0) {
    pasos.push({
      id: 'desarrollo',
      resumen: `Implementado con ${(p.tags || []).slice(0, 3).join(', ')}${(p.tags || []).length > 3 ? ' y más.' : '.'}`,
      puntos: (p.tags || []).map(t => `Stack: ${t}`),
    });
  }

  const items = [];
  if (p.liveUrl) items.push(`Demo en producción disponible`);
  if (p.repoUrl) items.push(`Código disponible en repositorio`);
  if (!items.length) items.push('Proyecto completado');

  pasos.push({
    id: 'despliegue',
    resumen: p.liveUrl ? 'Aplicación desplegada y disponible en producción.' : 'Proyecto finalizado y disponible.',
    puntos: items,
  });

  return pasos;
}

/* Generate CTF attack phases for lab cards */
function _labPhases(p) {
  const lab   = p.lab;
  const techs = lab.techniques || [];

  return [
    {
      id: 'analisis',
      resumen: `Reconocimiento del target. Sistema operativo: ${lab.os}. Enumeración de puertos y servicios con nmap.`,
      puntos: [
        'nmap -sV -sC para detección de servicios y versiones',
        `Sistema operativo: ${lab.os}`,
        'Identificación de superficie de ataque',
      ],
    },
    {
      id: 'desarrollo',
      resumen: `Explotación exitosa mediante ${techs.join(', ')}. Acceso inicial obtenido.`,
      puntos: techs.map(t => `Técnica aplicada: ${t}`),
    },
    {
      id: 'seguridad',
      resumen: `Flag capturada. Máquina pwneada en ${lab.platform}. Dificultad: ${lab.difficulty}.`,
      puntos: [
        `Plataforma: ${lab.platform}`,
        `Dificultad: ${lab.difficulty}`,
        `Rating: ★ ${lab.rating}`,
        'user.txt y root.txt obtenidos',
      ],
    },
  ];
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _buildContent(p, mode) {
  const unit  = MODE_LABELS[mode]?.unit || 'XP';
  const isLab = mode === 'sec' && !!p.lab;

  /* ── Phases ── */
  const pasos = p.process?.pasos?.length > 0
    ? p.process.pasos
    : (isLab ? _labPhases(p) : _syntheticPhases(p));

  const phasesHTML = pasos
    .map((paso, i) => _phaseHTML(paso, i, mode, unit))
    .join('');

  /* ── Overview ── */
  const overview  = p.process?.overview || p.longDescription || p.description || '';
  const resultado = p.process?.resultado || '';
  const overviewHTML = overview ? `
    <p class="pdm__slabel">📋 Overview</p>
    <div class="pdm__overview">
      ${_esc(overview)}
      ${resultado ? `<div class="pdm__overview-result">✅ ${_esc(resultado)}</div>` : ''}
    </div>` : '';

  /* ── Achievements from metricas ── */
  const metricas = p.process?.metricas || [];
  const achievementsHTML = metricas.length > 0 ? `
    <p class="pdm__slabel">🏆 Achievements</p>
    <div class="pdm-achievements">
      ${metricas.map(m => `
        <div class="pdm-achievement">
          <span class="pdm-achievement__icon" aria-hidden="true">${_achievementIcon(m.label)}</span>
          <span class="pdm-achievement__value">${_esc(m.value)}</span>
          <span class="pdm-achievement__label">${_esc(m.label)}</span>
        </div>`).join('')}
    </div>` : '';

  /* ── Highlights list (for projects with highlights but no metricas) ── */
  const highlights = p.highlights || [];
  const highlightsHTML = (!metricas.length && highlights.length > 0) ? `
    <p class="pdm__slabel">✨ Highlights</p>
    <ul class="pdm-highlights">
      ${highlights.map(h => `<li class="pdm-highlight">${_esc(h)}</li>`).join('')}
    </ul>` : '';

  /* ── Tech Arsenal ── */
  let techHTML = '';
  if (p.techStack && Object.keys(p.techStack).length > 0) {
    const groups = Object.entries(p.techStack)
      .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
      .map(([group, arr]) => `
        <div class="pdm-tech-group">
          <div class="pdm-tech-group__label">${_esc(group)}</div>
          <div class="pdm-tech-chips">
            ${arr.map(t => `<span class="pdm-tech-chip">${_esc(t)}</span>`).join('')}
          </div>
        </div>`).join('');

    if (groups) {
      techHTML = `
        <p class="pdm__slabel">⚔️ Tech Arsenal</p>
        ${groups}`;
    }
  } else if ((p.tags || []).length > 0) {
    // Fallback: show tags as tech chips
    techHTML = `
      <p class="pdm__slabel">⚔️ Stack Usado</p>
      <div class="pdm-tech-group">
        <div class="pdm-tech-chips">
          ${p.tags.map(t => `<span class="pdm-tech-chip">${_esc(t)}</span>`).join('')}
        </div>
      </div>`;
  }

  /* ── CTA buttons ── */
  const liveUrl = p.liveUrl || p.links?.demo;
  const repoUrl = p.repoUrl || p.links?.github;
  const ctaHTML = (liveUrl || repoUrl) ? `
    <div class="pdm__cta">
      ${liveUrl ? `
        <a href="${_esc(liveUrl)}" target="_blank" rel="noopener noreferrer"
           class="pdm__cta-btn pdm__cta-btn--primary" aria-label="Ver demo de ${_esc(p.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Ver Demo
        </a>` : ''}
      ${repoUrl ? `
        <a href="${_esc(repoUrl)}" target="_blank" rel="noopener noreferrer"
           class="pdm__cta-btn pdm__cta-btn--outline" aria-label="Ver código de ${_esc(p.title)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Código
        </a>` : ''}
    </div>` : '';

  /* ── Lab pwned banner ── */
  const pwnedBanner = isLab ? `
    <div class="pdm__pwned-banner">
      <span class="pdm__pwned-icon">🏴‍☠️</span>
      <div>
        <div class="pdm__pwned-title">MACHINE PWNED — ${_esc(p.lab.difficulty.toUpperCase())}</div>
        <div class="pdm__pwned-sub">${_esc(p.lab.platform)} · ${_esc(p.lab.os)} · ★ ${_esc(p.lab.rating)}</div>
      </div>
    </div>` : '';

  return `
    ${pwnedBanner}
    ${overviewHTML}
    <p class="pdm__slabel">⚔️ Quest Log</p>
    ${phasesHTML}
    ${achievementsHTML}
    ${highlightsHTML}
    ${techHTML}
    ${ctaHTML}
  `;
}

/* ─────────────────────────────────────────────────────────
   MODAL DOM
───────────────────────────────────────────────────────── */
let _el       = null;
let _prevFocus = null;

function _inject() {
  if (document.getElementById('pdm')) {
    _el = document.getElementById('pdm');
    return;
  }

  _el = document.createElement('div');
  _el.id = 'pdm';
  _el.className = 'pdm';
  _el.setAttribute('aria-hidden', 'true');
  _el.setAttribute('role', 'dialog');
  _el.setAttribute('aria-modal', 'true');
  _el.setAttribute('aria-labelledby', 'pdm-title');

  _el.innerHTML = `
    <div class="pdm__backdrop" id="pdm-backdrop"></div>
    <div class="pdm__panel">
      <header class="pdm__header">
        <div class="pdm__header-top">
          <span class="pdm__mode-pill" id="pdm-mode-pill"></span>
          <button class="pdm__close" id="pdm-close" aria-label="Cerrar detalle del proyecto">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <h2 class="pdm__title" id="pdm-title"></h2>
        <p  class="pdm__desc"  id="pdm-desc"></p>
        <div class="pdm__level-row">
          <span class="pdm__level-badge" id="pdm-level"></span>
          <div class="pdm__xp-wrap">
            <div class="pdm__xp-label">
              <span id="pdm-xp-cur">0 XP</span>
              <span id="pdm-xp-max">/ ${XP_MAX} XP</span>
            </div>
            <div class="pdm__xp-track">
              <div class="pdm__xp-fill" id="pdm-xp-fill"></div>
            </div>
          </div>
        </div>
      </header>
      <div class="pdm__scroll">
        <div class="pdm__body" id="pdm-body"></div>
      </div>
    </div>
  `;

  document.body.appendChild(_el);

  document.getElementById('pdm-close').addEventListener('click', _close);
  document.getElementById('pdm-backdrop').addEventListener('click', _close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _el?.classList.contains('is-open')) _close();
  });
}

/* ─────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────── */
function _open(p, mode) {
  if (!_el) _inject();

  _prevFocus = document.activeElement;

  const xp        = _calcXP(p);
  const ml        = MODE_LABELS[mode] || MODE_LABELS.dev;
  const levels    = LEVEL_NAMES[mode] || LEVEL_NAMES.dev;
  const levelName = levels[xp.levelIdx] ?? levels[0];

  /* Header */
  document.getElementById('pdm-mode-pill').textContent = ml.pill;
  document.getElementById('pdm-title').textContent     = p.title;
  document.getElementById('pdm-desc').textContent      = p.description || '';
  document.getElementById('pdm-level').textContent     = `Lv.${xp.levelIdx + 1} ${levelName}`;
  document.getElementById('pdm-xp-cur').textContent    = `${xp.total} ${ml.unit}`;
  document.getElementById('pdm-xp-max').textContent    = `/ ${XP_MAX} ${ml.unit}`;

  /* Body */
  const body = document.getElementById('pdm-body');
  body.innerHTML = _buildContent(p, mode);

  /* Phase toggle handlers */
  _el.querySelectorAll('.pdm-phase__header').forEach(btn => {
    btn.addEventListener('click', _togglePhase);
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _togglePhase({ currentTarget: btn });
      }
    });
  });

  /* Auto-expand first phase */
  const firstPhase = _el.querySelector('.pdm-phase');
  if (firstPhase) {
    firstPhase.classList.add('is-expanded');
    firstPhase.querySelector('.pdm-phase__header')?.setAttribute('aria-expanded', 'true');
  }

  /* Show */
  _el.setAttribute('aria-hidden', 'false');
  _el.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  /* Sincronizar trayectoria */
  if (p.slug) {
    window.dispatchEvent(new CustomEvent('portfolio:syncTrayectoria', { detail: { slug: p.slug } }));
  }

  /* Scroll to top */
  const scroll = _el.querySelector('.pdm__scroll');
  if (scroll) scroll.scrollTop = 0;

  /* Animate XP bar after paint */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const fill = document.getElementById('pdm-xp-fill');
    if (fill) fill.style.width = `${xp.percent}%`;
  }));

  setTimeout(() => document.getElementById('pdm-close')?.focus(), 60);
}

function _close() {
  if (!_el) return;
  _el.classList.remove('is-open');
  _el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  _prevFocus?.focus();
}

function _togglePhase(e) {
  const header = e.currentTarget;
  const phase  = header.closest('.pdm-phase');
  const isOpen = phase.classList.contains('is-expanded');

  _el.querySelectorAll('.pdm-phase.is-expanded').forEach(ph => {
    ph.classList.remove('is-expanded');
    ph.querySelector('.pdm-phase__header')?.setAttribute('aria-expanded', 'false');
  });

  if (!isOpen) {
    phase.classList.add('is-expanded');
    header.setAttribute('aria-expanded', 'true');
  }
}

/* ─────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────── */
export const ProjectDetail = { init: _inject, open: _open, close: _close };
