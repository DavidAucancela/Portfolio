/* ============================================================
   IA TOKENS WIDGET — Total de tokens de LLM Observatory (modo .ia)

   Dos estados (data-widget-state en #ia-tokens):
   - collapsed: solo el total de tokens (cara compacta)
   - expanded : desglose por proyecto de IA con sus tokens

   La transición reproduce una animación de red neuronal
   "mini → macro" (_runIntro) que resuelve en los nodos/proyectos.
   ============================================================ */

import { navigateToProject } from './app.js';
import { LangSwitcher } from './lang.js';

// Subset de SLUG_MAP (js/projects.js) — solo los ids de ia-projects.json
// que no traen `slug` explícito en el JSON. Mantener en sync si cambian.
const SLUG_MAP = {
  'project-001': 'ubapp',
  'project-003': 'anaos',
  'project-008': 'llm-observatory',
};

const INTRO_MS = 1300;

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function _locale() {
  return LangSwitcher.getLang() === 'es' ? 'es-EC' : 'en-US';
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _monthLabel(dateStr) {
  const [y, m] = (dateStr || '').split('-');
  const months = LangSwitcher.getLang() === 'es' ? MONTHS_ES : MONTHS_EN;
  const idx = Number(m) - 1;
  return Number.isInteger(idx) && months[idx] ? `${months[idx]} ${y}` : '';
}

function _countUp(el, to, suffix = '', duration = 1200) {
  const from = 0;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value.toLocaleString(_locale()) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Compacta: 128430 → "128,4K tokens". Fallback simple si Intl no soporta 'compact'.
function _formatTokens(n) {
  const suffix = ' ' + LangSwitcher.t('iaw.tokensSuffix');
  try {
    return new Intl.NumberFormat(_locale(), { notation: 'compact', maximumFractionDigits: 1 })
      .format(n) + suffix;
  } catch {
    return n.toLocaleString(_locale()) + suffix;
  }
}

export const IaTokensWidget = (() => {
  const _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let _loaded = false;
  let _historyLoaded = false;
  let _introTimer = null;
  // Desglose por proyecto (GET /api/llm-stats → projects[]), llenado en _onEnterIa().
  // Cada entrada: { name: token_name en Observatory, totalTokens }.
  let _projectBreakdown = [];
  // Estado del status pill (clave i18n) + total en vivo para re-formatear al
  // cambiar de idioma sin re-disparar la animación de count-up.
  let _statusKey = 'iaw.status.connecting';
  let _totalTokens = null;

  /** Reaplica el texto del status pill según el idioma activo. */
  function _applyStatus() {
    const statusEl = document.getElementById('ia-tokens-status');
    if (!statusEl) return;
    statusEl.removeAttribute('data-i18n');
    statusEl.textContent = LangSwitcher.t(_statusKey);
  }

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'ia') {
        _collapse();
        _onEnterIa();
      }
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'ia' && !_loaded) {
        _onEnterIa();
      }
    }, 120);

    document.getElementById('ia-tokens-summary')
      ?.addEventListener('click', _expand);
    document.getElementById('ia-tokens-more-btn')
      ?.addEventListener('click', _collapse);
    document.getElementById('ia-tokens')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') _collapse();
      });

    // Re-render de las partes dinámicas al cambiar de idioma (los <span>
    // estáticos los reetiqueta LangSwitcher vía data-i18n).
    window.addEventListener('portfolio:langChange', () => {
      _applyStatus();
      const valueEl = document.getElementById('ia-tokens-value');
      if (valueEl && Number.isFinite(_totalTokens)) {
        valueEl.textContent = _totalTokens.toLocaleString(_locale());
      }
      if (_historyLoaded) _loadProjectHistory();
    });
  }

  /* ── Estados ──────────────────────────────────────── */
  function _expand() {
    const root = document.getElementById('ia-tokens');
    if (!root || root.dataset.widgetState === 'expanded') return;
    root.dataset.widgetState = 'expanded';
    document.getElementById('ia-tokens-summary')
      ?.setAttribute('aria-expanded', 'true');

    const reveal = () => {
      if (!_historyLoaded) {
        _historyLoaded = true;
        _loadProjectHistory();
      }
    };

    if (_reduced) { reveal(); return; }
    _runIntro(reveal);
  }

  function _collapse() {
    const root = document.getElementById('ia-tokens');
    if (!root) return;
    root.dataset.widgetState = 'collapsed';
    document.getElementById('ia-tokens-summary')
      ?.setAttribute('aria-expanded', 'false');
    _clearIntro();
  }

  /* ── Animación de intro: red neuronal mini → macro ── */
  function _runIntro(done) {
    const intro = document.getElementById('ia-tokens-intro');
    if (!intro) { done(); return; }

    // Nodos pseudo-aleatorios + aristas hacia los vecinos más cercanos.
    const W = 200, H = 120;
    const nodes = Array.from({ length: 11 }, (_, i) => ({
      x: 18 + Math.round(((i * 53) % (W - 36))),
      y: 16 + Math.round(((i * 37) % (H - 32))),
    }));
    const edges = [];
    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach((b, j) => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 62) edges.push([i, i + 1 + j]);
      });
    });

    const edgeEls = edges.map(([a, b], k) =>
      `<line class="it-edge" style="animation-delay:${0.05 * k}s"
             x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}"/>`
    ).join('');
    const nodeEls = nodes.map((n, k) =>
      `<circle class="it-node" style="animation-delay:${0.4 + 0.045 * k}s"
               cx="${n.x}" cy="${n.y}" r="${k % 3 === 0 ? 4.2 : 2.8}"/>`
    ).join('');

    intro.innerHTML = `
      <svg class="it-intro__net" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <g class="it-intro__edges">${edgeEls}</g>
        <g class="it-intro__nodes">${nodeEls}</g>
      </svg>
    `;
    intro.classList.add('is-playing');

    _introTimer = setTimeout(() => {
      _clearIntro();
      done();
    }, INTRO_MS);
  }

  function _clearIntro() {
    clearTimeout(_introTimer);
    _introTimer = null;
    const intro = document.getElementById('ia-tokens-intro');
    if (intro) {
      intro.classList.remove('is-playing');
      intro.innerHTML = '';
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
        list.innerHTML = `<li class="ia-tokens__history-empty">${LangSwitcher.t('iaw.noProjects')}</li>`;
        return;
      }

      list.innerHTML = items.map((p, idx) => {
        // Match explícito por p.observatoryToken (nombre exacto del token en
        // Observatory) — evita matchear por título, que es frágil y puede
        // pegarle a un proyecto equivocado en silencio. Acepta un nombre único
        // o un array (proyectos que reportan bajo más de un token, ej. uno por
        // provider) — en ese caso suma los tokens de todos los que matcheen.
        const names  = Array.isArray(p.observatoryToken) ? p.observatoryToken : [p.observatoryToken];
        const rows   = names.filter(Boolean)
          .map((name) => _projectBreakdown.find((row) => row.name === name))
          .filter(Boolean);
        const meta = rows.length
          ? _formatTokens(rows.reduce((sum, row) => sum + row.totalTokens, 0))
          : _monthLabel(p.date);

        return `
        <li class="ia-tokens__project-item" style="animation-delay:${0.06 * idx}s">
          <button type="button" class="ia-tokens__project-link" data-slug="${p.slug}">
            <span class="ia-tokens__project-title">${_escapeHtml(p.title)}</span>
            <span class="ia-tokens__project-tokens">${_escapeHtml(meta)}</span>
          </button>
        </li>
      `;
      }).join('');

      list.querySelectorAll('.ia-tokens__project-link').forEach((btn) => {
        btn.addEventListener('click', () => navigateToProject(btn.dataset.slug));
      });
    } catch (err) {
      console.error('[ia-tokens-widget] Error cargando proyectos:', err.message);
      list.innerHTML = `<li class="ia-tokens__history-empty">${LangSwitcher.t('iaw.offline')}</li>`;
    }
  }

  async function _onEnterIa() {
    if (_loaded) return;
    _loaded = true;

    const valueEl = document.getElementById('ia-tokens-value');
    if (!valueEl) return;

    try {
      const res  = await fetch('/api/llm-stats');
      const data = (await res.json()) || {};

      if (Array.isArray(data.projects)) _projectBreakdown = data.projects;

      if (data.mock || !Number.isFinite(data.totalTokens)) {
        valueEl.textContent = '···';
        valueEl.classList.remove('ia-tokens__value--live');
        _totalTokens = null;
        _statusKey = 'iaw.status.syncing';
        _applyStatus();
        return;
      }

      valueEl.classList.add('ia-tokens__value--live');
      _totalTokens = data.totalTokens;
      _countUp(valueEl, data.totalTokens);
      _statusKey = 'iaw.status.live';
      _applyStatus();
    } catch (err) {
      console.error('[ia-tokens-widget] Error:', err.message);
      valueEl.textContent = '—';
      valueEl.classList.remove('ia-tokens__value--live');
      _totalTokens = null;
      _statusKey = 'iaw.status.offline';
      _applyStatus();
      _loaded = false; // permite reintentar al reentrar al modo .ia
    }
  }

  return { init };
})();
