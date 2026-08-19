/* ============================================================
   IA TOKENS WIDGET — Total de tokens de LLM Observatory (modo .ia)
   ============================================================ */

import { navigateToProject } from './app.js';

const LLM_OBSERVATORY_REPO = 'DavidAucancela/llm-observatory';

// Subset de SLUG_MAP (js/projects.js) — solo los ids de ia-projects.json
// que no traen `slug` explícito en el JSON. Mantener en sync si cambian.
const SLUG_MAP = {
  'project-001': 'ubapp',
  'project-003': 'anaos',
  'project-008': 'llm-observatory',
};

function _timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}m`;
  return `hace ${Math.floor(months / 12)}a`;
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _monthLabel(dateStr) {
  const [y, m] = (dateStr || '').split('-');
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const idx = Number(m) - 1;
  return Number.isInteger(idx) && MONTHS[idx] ? `${MONTHS[idx]} ${y}` : '';
}

function _countUp(el, to, suffix = '', duration = 1200) {
  const from = 0;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value.toLocaleString('es-EC') + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export const IaTokensWidget = (() => {
  let _loaded = false;
  let _historyLoaded = false;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'ia') _onEnterIa();
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'ia' && !_loaded) {
        _onEnterIa();
      }
    }, 120);

    document.getElementById('ia-tokens-more-btn')
      ?.addEventListener('click', _toggleHistory);
  }

  function _toggleHistory() {
    const btn   = document.getElementById('ia-tokens-more-btn');
    const panel = document.getElementById('ia-tokens-history');
    if (!btn || !panel) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
    btn.querySelector('span:last-child').textContent = expanded ? '▾' : '▴';
    btn.querySelector('span:first-child').textContent = expanded ? 'Ver más' : 'Ver menos';

    if (!expanded && !_historyLoaded) {
      _historyLoaded = true;
      _loadPrHistory();
      _loadProjectHistory();
    }
  }

  async function _loadPrHistory() {
    const list = document.getElementById('ia-tokens-pr-list');
    if (!list) return;

    try {
      const res  = await fetch(`/api/github-stats?repo=${encodeURIComponent(LLM_OBSERVATORY_REPO)}`);
      const data = (await res.json()) || {};
      const prs  = Array.isArray(data.prs) ? data.prs.slice(0, 5) : [];

      if (data.mock || prs.length === 0) {
        list.innerHTML = '<li class="ia-tokens__history-empty">Sin actividad reciente disponible</li>';
        return;
      }

      list.innerHTML = prs.map((pr) => `
        <li class="ia-tokens__pr-item">
          <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="ia-tokens__pr-link">
            <span class="ia-tokens__pr-title">#${pr.number} ${_escapeHtml(pr.title)}</span>
            <span class="ia-tokens__pr-date">${_timeAgo(pr.mergedAt)}</span>
          </a>
        </li>
      `).join('');
    } catch (err) {
      console.error('[ia-tokens-widget] Error cargando PRs:', err.message);
      list.innerHTML = '<li class="ia-tokens__history-empty">Sin conexión</li>';
    }
  }

  async function _loadProjectHistory() {
    const list = document.getElementById('ia-tokens-project-list');
    if (!list) return;

    try {
      const res = await fetch('data/ia-projects.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const projects = await res.json();

      const items = (Array.isArray(projects) ? projects : [])
        .map((p) => ({ ...p, slug: p.slug || SLUG_MAP[p.id] || null }))
        .filter((p) => p.date && p.slug)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      if (items.length === 0) {
        list.innerHTML = '<li class="ia-tokens__history-empty">Sin proyectos disponibles</li>';
        return;
      }

      list.innerHTML = items.map((p) => `
        <li class="ia-tokens__project-item">
          <button type="button" class="ia-tokens__project-link" data-slug="${p.slug}">
            <span class="ia-tokens__project-title">${_escapeHtml(p.title)}</span>
            <span class="ia-tokens__project-date">${_monthLabel(p.date)}</span>
          </button>
        </li>
      `).join('');

      list.querySelectorAll('.ia-tokens__project-link').forEach((btn) => {
        btn.addEventListener('click', () => navigateToProject(btn.dataset.slug));
      });
    } catch (err) {
      console.error('[ia-tokens-widget] Error cargando proyectos:', err.message);
      list.innerHTML = '<li class="ia-tokens__history-empty">Sin conexión</li>';
    }
  }

  async function _onEnterIa() {
    if (_loaded) return;
    _loaded = true;

    const valueEl  = document.getElementById('ia-tokens-value');
    const statusEl = document.getElementById('ia-tokens-status');
    if (!valueEl) return;

    try {
      const res  = await fetch('/api/llm-stats');
      const data = (await res.json()) || {};

      if (data.mock || !Number.isFinite(data.totalTokens)) {
        valueEl.textContent = '···';
        valueEl.classList.remove('ia-tokens__value--live');
        if (statusEl) statusEl.textContent = 'sincronizando…';
        return;
      }

      valueEl.classList.add('ia-tokens__value--live');
      _countUp(valueEl, data.totalTokens);
      if (statusEl) statusEl.textContent = 'en vivo · LLM Observatory';
    } catch (err) {
      console.error('[ia-tokens-widget] Error:', err.message);
      valueEl.textContent = '—';
      valueEl.classList.remove('ia-tokens__value--live');
      if (statusEl) statusEl.textContent = 'sin conexión';
      _loaded = false; // permite reintentar al reentrar al modo .ia
    }
  }

  return { init };
})();
