/**
 * project-detail.js
 * Panel con el proceso de ingeniería de cada proyecto/lab: fases, resultados
 * y stack técnico. Se abre al hacer clic en "Ver Proceso" de cualquier tarjeta.
 */

/* ─────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────── */
const MODE_PILL = { dev: '.dev', ia: '.ia', sec: '.sec' };

/* Metadata por fase: nombre y color de acento — mismo vocabulario en los 3 modos */
const PHASE_META = {
  problema:   { label: 'Contexto',   color: '#f59e0b' },
  analisis:   { label: 'Análisis',   color: '#8b5cf6' },
  diseño:     { label: 'Diseño',     color: '#06b6d4' },
  desarrollo: { label: 'Desarrollo', color: '#10b981' },
  pruebas:    { label: 'Pruebas',    color: '#eab308' },
  mejoras:    { label: 'Mejoras',    color: '#0ea5e9' },
  despliegue: { label: 'Despliegue', color: '#3b82f6' },
  seguridad:  { label: 'Seguridad',  color: '#ef4444' },
};

/* ─────────────────────────────────────────────────────────
   HTML BUILDERS
───────────────────────────────────────────────────────── */
const MAX_PHASE_POINTS = 3;

function _phaseHTML(paso, idx) {
  const meta  = PHASE_META[paso.id] || { label: paso.id, color: 'var(--color-accent)' };
  const color = meta.color;

  const pointsHTML = (paso.puntos || [])
    .slice(0, MAX_PHASE_POINTS)
    .map(pt => `<li class="pdm-phase__point">${_esc(pt)}</li>`)
    .join('');

  return `
    <div class="pdm-phase" style="border-left-color:${color};">
      <div class="pdm-phase__header">
        <span class="pdm-phase__num">0${idx + 1}</span>
        <div class="pdm-phase__info">
          <div class="pdm-phase__name">${_esc(meta.label)}</div>
        </div>
      </div>
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
        `Rating: ${lab.rating}`,
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

/* Un solo vocabulario de secciones — sin variación por modo */
const PANEL_LABELS = {
  overview:   'Resumen del Proyecto',
  phases:     'Proceso',
  metrics:    'Resultados',
  highlights: 'Destacados',
  tech:       'Stack Técnico',
  techFb:     'Tecnologías',
  docs:       'Documentos',
};

/* Estado del proyecto — color por valor de p.status, sin icono */
const STATUS_META = {
  'En producción':  { color: '#22c55e' },
  'Completado':     { color: '#3b82f6' },
  'En desarrollo':  { color: '#f59e0b' },
  'Archivado':      { color: '#6b7280' },
  'Certificado':    { color: '#ffce3d' },
  'Pwned':          { color: '#9fef00', label: 'Resuelto' },
};

function _statusHTML(p) {
  if (!p.status) return '';
  const meta = STATUS_META[p.status] || { color: 'var(--color-accent)' };
  return `
    <span class="pdm__status-badge" style="color:${meta.color};border-color:${meta.color}40;background:${meta.color}18;">
      ${_esc(meta.label || p.status)}
    </span>`;
}

/* Icono por herramienta del stack — solo devicon (logo real); sin logo, sin icono.
   Los nombres reales traen versiones/paréntesis ("PostgreSQL 16", "Claude Vision
   (evaluación de frames)"), así que se resuelve por patrón, no por texto exacto.
   Orden importa: los patrones más específicos van primero. */
const TECH_ICON_RULES = [
  // frontend frameworks
  [/next\.?js/,                 'devicon-nextjs-plain'],
  [/nuxt/,                      'devicon-nuxtjs-plain colored'],
  [/vue/,                       'devicon-vuejs-plain colored'],
  [/react native|expo router|expo sdk/, 'devicon-react-original colored'],
  [/react/,                     'devicon-react-original colored'],
  [/angular/,                   'devicon-angularjs-plain colored'],
  [/svelte/,                    'devicon-svelte-plain colored'],
  [/\baxios\b/,                 'devicon-axios-plain colored'],
  [/\bexpo\b/,                  'devicon-expo-original colored', true],
  [/zustand/,                   'devicon-zustand-plain colored'],
  [/typescript/,                'devicon-typescript-plain colored'],
  [/javascript|vanilla js/,     'devicon-javascript-plain colored'],
  [/html5?\b/,                  'devicon-html5-plain colored'],
  [/css3?\b/,                   'devicon-css3-plain colored'],
  [/tailwind/,                  'devicon-tailwindcss-original colored'],
  [/bootstrap/,                 'devicon-bootstrap-plain colored'],
  [/^vite\b|vite \d/,           'devicon-vitejs-plain colored'],
  [/chart\.?js/,                'devicon-chartjs-plain colored'],
  [/redux/,                     'devicon-redux-original colored'],
  [/d3\.?js/,                   'devicon-d3js-plain colored'],
  [/three\.?js/,                'devicon-threejs-original colored', true],
  // backend
  [/node\.?js/,                 'devicon-nodejs-plain colored'],
  [/express/,                   'devicon-express-original colored', true],
  [/nestjs|nest\.js/,           'devicon-nestjs-original colored'],
  [/django/,                    'devicon-django-plain colored'],
  [/flask/,                     'devicon-flask-original colored', true],
  [/fastapi/,                   'devicon-fastapi-plain colored'],
  [/asp\.net|\.net\b|entity framework/, 'devicon-dotnetcore-plain colored'],
  [/\bc#|csharp/,               'devicon-csharp-plain colored'],
  [/\bpython\b/,                'devicon-python-plain colored'],
  [/\bphp\b/,                   'devicon-php-plain colored'],
  [/\bjava\b/,                  'devicon-java-plain colored'],
  [/socket\.?io/,               'devicon-socketio-original colored', true],
  [/prisma/,                    'devicon-prisma-original colored'],
  [/graphql/,                   'devicon-graphql-plain colored'],
  // data / storage
  [/postgresql|pgvector|\bpg\b/,'devicon-postgresql-plain colored'],
  [/mysql/,                     'devicon-mysql-original colored'],
  [/mongodb/,                   'devicon-mongodb-plain colored'],
  [/sql server|sqlserver/,      'devicon-microsoftsqlserver-plain colored'],
  [/sqlite/,                    'devicon-sqlite-plain colored'],
  [/redis/,                     'devicon-redis-plain colored'],
  [/neo4j/,                     'devicon-neo4j-plain colored'],
  [/supabase/,                  'devicon-supabase-plain colored'],
  [/firebase/,                  'devicon-firebase-plain colored'],
  // ML / data science
  [/opencv/,                    'devicon-opencv-plain colored'],
  [/tensorflow/,                'devicon-tensorflow-original colored'],
  [/pytorch/,                   'devicon-pytorch-original colored'],
  [/sklearn|scikit-?learn/,     'devicon-scikitlearn-plain colored'],
  [/pandas/,                    'devicon-pandas-plain colored'],
  [/numpy/,                     'devicon-numpy-plain colored'],
  [/jupyter/,                   'devicon-jupyter-plain colored'],
  // infra / devops
  [/docker/,                    'devicon-docker-plain colored'],
  [/kubernetes|k8s/,            'devicon-kubernetes-plain colored'],
  [/nginx/,                     'devicon-nginx-original colored'],
  [/git(hub)? actions/,         'devicon-githubactions-plain colored'],
  [/github/,                    'devicon-github-original colored', true],
  [/gitlab/,                    'devicon-gitlab-plain colored'],
  [/\bgit\b/,                   'devicon-git-plain colored'],
  [/vercel/,                    'devicon-vercel-original colored', true],
  [/opentelemetry/,             'devicon-opentelemetry-plain colored'],
  [/prometheus/,                'devicon-prometheus-original colored'],
  [/grafana/,                   'devicon-grafana-plain colored'],
  [/linux/,                     'devicon-linux-plain colored', true],
  [/windows/,                   'devicon-windows8-original colored'],
  [/swagger|openapi/,           'devicon-swagger-plain colored'],
  [/postman/,                   'devicon-postman-plain colored'],
  [/jest\b/,                    'devicon-jest-plain colored'],
  [/eslint/,                    'devicon-eslint-plain colored'],
  [/unity/,                     'devicon-unity-plain colored', true],
];

function _techIconHTML(name) {
  const s = String(name).toLowerCase().trim();
  const rule = TECH_ICON_RULES.find(([re]) => re.test(s));
  if (!rule) return '';
  const [, cls, invert] = rule;
  return `<i class="${cls}${invert ? ' pdm-tech-chip__icon--invert' : ''} pdm-tech-chip__icon" aria-hidden="true"></i>`;
}

function _buildContent(p, mode) {
  const isLab = mode === 'sec' && !!p.lab;

  const lbl = m => PANEL_LABELS[m] || '';

  /* ── Phases ── */
  const pasos = p.process?.pasos?.length > 0
    ? p.process.pasos
    : (isLab ? _labPhases(p) : _syntheticPhases(p));

  const phasesHTML = pasos
    .map((paso, i) => _phaseHTML(paso, i))
    .join('');

  /* ── Overview ── */
  const overview  = p.process?.overview || p.longDescription || p.description || '';
  const resultado = p.process?.resultado || '';
  const overviewHTML = overview ? `
    <p class="pdm__slabel">${lbl('overview')}${_statusHTML(p)}</p>
    <div class="pdm__overview">
      ${_esc(overview)}
      ${resultado ? `<div class="pdm__overview-result">${_esc(resultado)}</div>` : ''}
    </div>` : '';

  /* ── Metrics ── */
  const metricas = p.process?.metricas || [];
  const metricsHTML = metricas.length > 0 ? `
    <p class="pdm__slabel">${lbl('metrics')}</p>
    <div class="pdm-achievements">
      ${metricas.map(m => `
        <div class="pdm-achievement">
          <span class="pdm-achievement__value">${_esc(m.value)}</span>
          <span class="pdm-achievement__label">${_esc(m.label)}</span>
        </div>`).join('')}
    </div>` : '';

  /* ── Highlights ── */
  const highlights = p.highlights || [];
  const highlightsHTML = (!metricas.length && highlights.length > 0) ? `
    <p class="pdm__slabel">${lbl('highlights')}</p>
    <ul class="pdm-highlights">
      ${highlights.map(h => `<li class="pdm-highlight">${_esc(h)}</li>`).join('')}
    </ul>` : '';

  /* ── Tech Stack ── */
  let techHTML = '';
  if (p.techStack && Object.keys(p.techStack).length > 0) {
    const groups = Object.entries(p.techStack)
      .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
      .map(([group, arr]) => `
        <div class="pdm-tech-group">
          <div class="pdm-tech-group__label">${_esc(group)}</div>
          <div class="pdm-tech-chips">
            ${arr.map(t => `<span class="pdm-tech-chip">${_techIconHTML(t)}${_esc(t)}</span>`).join('')}
          </div>
        </div>`).join('');

    if (groups) {
      techHTML = `
        <p class="pdm__slabel">${lbl('tech')}</p>
        ${groups}`;
    }
  } else if ((p.tags || []).length > 0) {
    techHTML = `
      <p class="pdm__slabel">${lbl('techFb')}</p>
      <div class="pdm-tech-group">
        <div class="pdm-tech-chips">
          ${p.tags.map(t => `<span class="pdm-tech-chip">${_techIconHTML(t)}${_esc(t)}</span>`).join('')}
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

  /* ── Documents ── */
  const docs = p.docs || [];
  const docsHTML = docs.length > 0 ? `
    <p class="pdm__slabel">${lbl('docs')}</p>
    <div class="pdm__docs">
      ${docs.map((d, i) => {
        const encodedUrl = d.url.split('/').map(encodeURIComponent).join('/');
        return `
        <a href="${encodedUrl}" class="pdm__doc-link"
           data-doc-index="${i}" data-pdf-url="${encodedUrl}" data-pdf-label="${_esc(d.label)}"
           aria-label="${_esc(d.label)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          ${_esc(d.label)}
        </a>`;
      }).join('')}
    </div>` : '';

  return `
    ${overviewHTML}
    <p class="pdm__slabel">${lbl('phases')}</p>
    ${phasesHTML}
    ${metricsHTML}
    ${highlightsHTML}
    ${techHTML}
    ${docsHTML}
    ${ctaHTML}
  `;
}

/* ─────────────────────────────────────────────────────────
   MODAL DOM
───────────────────────────────────────────────────────── */
let _el        = null;
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
      <div class="pdm__hero" id="pdm-hero" aria-hidden="true">
        <div class="pdm__hero-overlay"></div>
      </div>
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

  /* Hero image */
  const hero = document.getElementById('pdm-hero');
  if (hero) {
    if (p.image) {
      hero.style.backgroundImage = `url(${p.image})`;
      hero.classList.add('pdm__hero--visible');
    } else {
      hero.classList.remove('pdm__hero--visible');
      hero.style.backgroundImage = '';
    }
  }

  /* Header */
  document.getElementById('pdm-mode-pill').textContent = MODE_PILL[mode] || '';
  document.getElementById('pdm-title').textContent     = p.title;
  document.getElementById('pdm-desc').textContent      = p.description || '';

  /* Body */
  const body = document.getElementById('pdm-body');
  body.innerHTML = _buildContent(p, mode);

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

  /* Stagger entrada de secciones del body */
  Array.from(body.children).forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(14px)';
    setTimeout(() => {
      el.style.transition = `opacity 0.3s ease ${i * 55}ms, transform 0.3s ease ${i * 55}ms`;
      el.style.opacity    = '1';
      el.style.transform  = 'translateY(0)';
    }, 80 + i * 55);
  });

  setTimeout(() => document.getElementById('pdm-close')?.focus(), 60);
}


function _close() {
  if (!_el) return;
  _el.classList.remove('is-open');
  _el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  _prevFocus?.focus();
}

/* ─────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────── */
export const ProjectDetail = { init: _inject, open: _open, close: _close, buildContent: _buildContent };
