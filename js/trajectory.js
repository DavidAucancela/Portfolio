/**
 * trajectory.js
 * Módulo de línea de tiempo vertical interactiva para el Jonathan Panel.
 *
 * Public API:
 *   init()                  — registra observadores y eventos globales
 *   render(container, data) — construye el DOM del timeline
 */

let _panelBody     = null;
let _scrollHandler = null;

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
function init() {
  const panel = document.getElementById('jonathan-panel');
  if (!panel) return;

  // Enganchar scroll-fill cada vez que el panel se abre
  const mo = new MutationObserver(() => {
    if (panel.classList.contains('open')) _attachScrollFill();
  });
  mo.observe(panel, { attributes: true, attributeFilter: ['class'] });

  // Marcar item activo cuando ProjectDetail sincroniza
  window.addEventListener('portfolio:syncTrayectoria', (e) => {
    _setActiveBySlug(e.detail?.slug);
  });
}

/* ════════════════════════════════════════════════════════════
   RENDER
════════════════════════════════════════════════════════════ */
function render(container, data) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'vtl';

  // Línea vertical de progreso
  const lineEl   = document.createElement('div');
  lineEl.className = 'vtl__line';
  const lineFill = document.createElement('div');
  lineFill.className = 'vtl__line-fill';
  lineFill.id        = 'vtl-line-fill';
  lineEl.appendChild(lineFill);
  root.appendChild(lineEl);

  // Items
  const itemsEl = document.createElement('div');
  itemsEl.className = 'vtl__items';
  data.forEach((item, idx) => itemsEl.appendChild(_buildItem(item, idx)));
  root.appendChild(itemsEl);

  container.appendChild(root);

  // Cachear el cuerpo del panel y arrancar listener de scroll
  _panelBody = document.querySelector('.jonathan-panel__body');
  _attachScrollFill();
}

/* ════════════════════════════════════════════════════════════
   ITEM BUILDER
════════════════════════════════════════════════════════════ */
function _buildItem(item, idx) {
  const article = document.createElement('article');
  article.className = 'vtl__item';
  if (item.slug) article.dataset.slug = item.slug;

  /* ── Conector: dot + pulse ───────────────────────────── */
  const connector = document.createElement('div');
  connector.className = 'vtl__connector';

  const dot = document.createElement('div');
  dot.className = 'vtl__dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = `
    <span class="vtl__icon">${item.icon}</span>
    <div class="vtl__pulse"></div>
  `;
  connector.appendChild(dot);
  article.appendChild(connector);

  /* ── Card ────────────────────────────────────────────── */
  const card   = document.createElement('div');
  card.className = 'vtl__card';

  const bodyId = `vtl-body-${idx}`;
  const shortTitle = item.title.split(' — ')[0];

  // Trigger (header clickeable)
  const trigger = document.createElement('button');
  trigger.className = 'vtl__trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', bodyId);
  trigger.innerHTML = `
    <div class="vtl__header">
      <div class="vtl__header-left">
        <span class="vtl__date">${item.date}</span>
        <h3 class="vtl__title">${shortTitle}</h3>
      </div>
      <div class="vtl__header-right">
        <span class="vtl__badge">${item.typeLabel}</span>
        <svg class="vtl__chevron" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  `;

  // Body (colapsado por defecto)
  const body = document.createElement('div');
  body.className   = 'vtl__body';
  body.id          = bodyId;
  body.hidden      = true;
  body.setAttribute('role', 'region');
  body.setAttribute('aria-label', `Detalle: ${shortTitle}`);
  body.innerHTML   = _buildBodyHTML(item);

  // Botón "Ver detalle" → abre ProjectDetail
  body.querySelectorAll('.vtl__link--detail').forEach(btn => {
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('portfolio:openProjectDetail', {
        detail: { slug: btn.dataset.slug },
      }));
    });
  });

  card.appendChild(trigger);
  card.appendChild(body);
  article.appendChild(card);

  // Toggle expand/collapse
  trigger.addEventListener('click', () => {
    if (trigger.getAttribute('aria-expanded') === 'true') {
      _collapse(article);
    } else {
      _collapseAll();
      _expand(article);
    }
  });

  return article;
}

/* ════════════════════════════════════════════════════════════
   BODY HTML
════════════════════════════════════════════════════════════ */
function _buildBodyHTML(item) {
  const shortTitle = item.title.split(' — ')[0];

  const desc = item.desc
    ? `<p class="vtl__desc">${item.desc}</p>`
    : '';

  const highlights = (item.highlights || []).length
    ? `<ul class="vtl__highlights">${
        item.highlights
          .map(h => `<li class="vtl__highlight">${h}</li>`)
          .join('')
      }</ul>`
    : '';

  const metrics = (item.metricas || []).length
    ? `<div class="vtl__metrics">${
        item.metricas
          .map(m => `
            <div class="vtl__metric">
              <span class="vtl__metric-value">${m.value}</span>
              <span class="vtl__metric-label">${m.label}</span>
            </div>`)
          .join('')
      }</div>`
    : '';

  const tags = (item.tags || []).length
    ? `<div class="vtl__tags">${
        item.tags.map(t => `<span class="vtl__tag">${t}</span>`).join('')
      }</div>`
    : '';

  const links = _buildLinksHTML(item, shortTitle);

  return desc + highlights + metrics + tags + links;
}

function _buildLinksHTML(item, shortTitle) {
  const parts = [];

  if (item.github) {
    parts.push(`
      <a href="${item.github}" class="vtl__link" target="_blank" rel="noopener noreferrer"
         aria-label="Repositorio GitHub de ${shortTitle}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57
            0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695
            -.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99
            .105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225
            -.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405
            c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225
            0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3
            0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      </a>`);
  }

  if (item.demo) {
    parts.push(`
      <a href="${item.demo}" class="vtl__link vtl__link--demo" target="_blank" rel="noopener noreferrer"
         aria-label="Demo en vivo de ${shortTitle}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Demo
      </a>`);
  }

  if (item.slug) {
    parts.push(`
      <button class="vtl__link vtl__link--detail" data-slug="${item.slug}"
              aria-label="Ver detalle completo de ${shortTitle}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Ver detalle
      </button>`);
  }

  return parts.length
    ? `<div class="vtl__links">${parts.join('')}</div>`
    : '';
}

/* ════════════════════════════════════════════════════════════
   EXPAND / COLLAPSE
════════════════════════════════════════════════════════════ */
function _expand(article) {
  const trigger = article.querySelector('.vtl__trigger');
  const body    = article.querySelector('.vtl__body');
  if (!trigger || !body) return;

  body.hidden = false;
  const h = body.scrollHeight;
  body.style.maxHeight  = '0px';
  body.style.overflow   = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      body.style.transition = 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)';
      body.style.maxHeight  = h + 'px';
    });
  });

  body.addEventListener('transitionend', () => {
    body.style.maxHeight  = '';
    body.style.overflow   = '';
    body.style.transition = '';
  }, { once: true });

  trigger.setAttribute('aria-expanded', 'true');
  article.classList.add('vtl__item--active');
}

function _collapse(article) {
  const trigger = article.querySelector('.vtl__trigger');
  const body    = article.querySelector('.vtl__body');
  if (!trigger || !body) return;

  const h = body.scrollHeight;
  body.style.maxHeight  = h + 'px';
  body.style.overflow   = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      body.style.transition = 'max-height 0.28s cubic-bezier(0.4,0,0.2,1)';
      body.style.maxHeight  = '0px';
    });
  });

  body.addEventListener('transitionend', () => {
    trigger.setAttribute('aria-expanded', 'false');
    article.classList.remove('vtl__item--active');
    body.hidden           = true;
    body.style.maxHeight  = '';
    body.style.overflow   = '';
    body.style.transition = '';
  }, { once: true });
}

function _collapseAll() {
  document.querySelectorAll('.vtl__item--active').forEach(_collapse);
}

/* ════════════════════════════════════════════════════════════
   ACTIVE BY SLUG  (llamado desde portfolio:syncTrayectoria)
════════════════════════════════════════════════════════════ */
function _setActiveBySlug(slug) {
  if (!slug) return;
  const target = document.querySelector(`.vtl__item[data-slug="${slug}"]`);
  if (!target || target.classList.contains('vtl__item--active')) return;
  _collapseAll();
  _expand(target);
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

/* ════════════════════════════════════════════════════════════
   SCROLL FILL  (línea vertical se llena con el scroll del panel)
════════════════════════════════════════════════════════════ */
function _attachScrollFill() {
  const body = _panelBody || document.querySelector('.jonathan-panel__body');
  if (!body) return;
  _panelBody = body;

  if (_scrollHandler) body.removeEventListener('scroll', _scrollHandler);

  _scrollHandler = () => {
    const fill = document.getElementById('vtl-line-fill');
    if (!fill) return;
    const max = body.scrollHeight - body.clientHeight;
    const pct = max > 0 ? Math.min(100, (body.scrollTop / max) * 100) : 0;
    fill.style.height = pct + '%';
  };

  body.addEventListener('scroll', _scrollHandler, { passive: true });
  _scrollHandler(); // estado inicial
}

/* ════════════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════════════ */
export const Trajectory = { init, render };
