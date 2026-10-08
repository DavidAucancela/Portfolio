/* ============================================================
   IA TOKENS WIDGET — Total de tokens de LLM Observatory (modo .ia)

   Panel tipo "instrumento" (piezas compartidas en css/hero-widget.css).
   Dos estados (data-widget-state en #ia-tokens):
   - collapsed: franja + total de tokens (cifra grande) + reparto por proyecto
   - expanded : además la lista de proyectos de IA con sus tokens
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

/** 3812455 → "3,8M": la cifra grande va compacta para que entre a 72px. */
function _compact(n) {
  try {
    return new Intl.NumberFormat(_locale(), { notation: 'compact', maximumFractionDigits: 1 })
      .format(n).replace(/\s/g, '');
  } catch {
    return n.toLocaleString(_locale());
  }
}

function _countUp(el, to, duration = 1200) {
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = _compact(Math.round(to * eased));
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
  let _loaded = false;
  let _historyLoaded = false;
  // Desglose por proyecto (GET /api/llm-stats → projects[]), llenado en _onEnterIa().
  // Cada entrada: { name: token_name en Observatory, totalTokens }.
  let _projectBreakdown = [];
  // Estado del status pill (clave i18n) + total en vivo para re-formatear al
  // cambiar de idioma sin re-disparar la animación de count-up.
  let _statusKey = 'iaw.status.connecting';
  let _totalTokens = null;

  /** Reaplica la línea de estado (total exacto + estado) y el color del LED. */
  function _applyStatus() {
    const statusEl = document.getElementById('ia-tokens-status');
    if (statusEl) {
      statusEl.removeAttribute('data-i18n');
      const exact = Number.isFinite(_totalTokens)
        ? `${_totalTokens.toLocaleString(_locale())} · ` : '';
      statusEl.textContent = exact + LangSwitcher.t(_statusKey);
    }
    const led = document.getElementById('ia-tokens-led');
    if (led) {
      led.classList.toggle('hw__led--wait', /connecting|syncing/.test(_statusKey));
      led.classList.toggle('hw__led--off', _statusKey === 'iaw.status.offline');
    }
  }

  /** Barra apilada: cuánto del total aporta cada proyecto (los 5 mayores + resto). */
  function _renderMix() {
    const mix = document.getElementById('ia-tokens-mix');
    if (!mix) return;
    const rows = _projectBreakdown
      .filter((r) => Number.isFinite(r.totalTokens) && r.totalTokens > 0)
      .sort((a, b) => b.totalTokens - a.totalTokens);
    const total = rows.reduce((s, r) => s + r.totalTokens, 0);
    if (!total) { mix.hidden = true; return; }
    const top = rows.slice(0, 5);
    const rest = total - top.reduce((s, r) => s + r.totalTokens, 0);
    const seg = (name, v, i) =>
      `<span class="ia-tokens__mix-seg" style="flex-grow:${v};--i:${i}" title="${_escapeHtml(name)} · ${_formatTokens(v)}"></span>`;
    mix.innerHTML = top.map((r, i) => seg(r.name, r.totalTokens, i)).join('')
      + (rest > 0 ? seg(LangSwitcher.getLang() === 'es' ? 'otros' : 'others', rest, 5) : '');
    mix.hidden = false;
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

    document.getElementById('ia-tokens-toggle')?.addEventListener('click', () => {
      const root = document.getElementById('ia-tokens');
      if (root?.dataset.widgetState === 'expanded') _collapse();
      else _expand();
    });
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
        valueEl.textContent = _compact(_totalTokens);
      }
      _renderMix();
      if (_historyLoaded) _loadProjectHistory();
    });
  }

  /* ── Estados ──────────────────────────────────────── */
  function _expand() {
    const root = document.getElementById('ia-tokens');
    if (!root || root.dataset.widgetState === 'expanded') return;
    root.dataset.widgetState = 'expanded';
    document.getElementById('ia-tokens-toggle')
      ?.setAttribute('aria-expanded', 'true');

    if (!_historyLoaded) {
      _historyLoaded = true;
      _loadProjectHistory();
    }
  }

  function _collapse() {
    const root = document.getElementById('ia-tokens');
    if (!root) return;
    root.dataset.widgetState = 'collapsed';
    document.getElementById('ia-tokens-toggle')
      ?.setAttribute('aria-expanded', 'false');
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

      // Primera pasada: resuelve el total de tokens por proyecto (cuando hay
      // match en Observatory) — necesario para escalar la barra de todos
      // contra el mismo máximo antes de poder renderizar ninguno.
      const resolved = items.map((p) => {
        // Match explícito por p.observatoryToken (nombre exacto del token en
        // Observatory) — evita matchear por título, que es frágil y puede
        // pegarle a un proyecto equivocado en silencio. Acepta un nombre único
        // o un array (proyectos que reportan bajo más de un token, ej. uno por
        // provider) — en ese caso suma los tokens de todos los que matcheen.
        const names  = Array.isArray(p.observatoryToken) ? p.observatoryToken : [p.observatoryToken];
        const rows   = names.filter(Boolean)
          .map((name) => _projectBreakdown.find((row) => row.name === name))
          .filter(Boolean);
        const tokens = rows.length ? rows.reduce((sum, row) => sum + row.totalTokens, 0) : null;
        const meta   = tokens !== null ? _compact(tokens) : _monthLabel(p.date);
        return { p, tokens, meta };
      });

      const maxTokens = Math.max(0, ...resolved.map((r) => r.tokens || 0));

      list.innerHTML = resolved.map(({ p, tokens, meta }, idx) => {
        // Barra proporcional al total de tokens del proyecto más pesado de
        // la lista — da una lectura visual inmediata del peso relativo,
        // no solo el número. Sin dato de tokens (fallback a mes) no hay
        // barra que dibujar: se oculta en vez de mostrar un 0% engañoso.
        const pct = tokens !== null && maxTokens > 0 ? Math.max(4, Math.round((tokens / maxTokens) * 100)) : 0;

        return `
        <li class="ia-tokens__project-item" style="animation-delay:${0.06 * idx}s">
          <button type="button" class="ia-tokens__project-link" data-slug="${p.slug}">
            <span class="ia-tokens__project-title">${_escapeHtml(LangSwitcher.L(p.title))}</span>
            <span class="ia-tokens__project-bar${pct ? '' : ' is-empty'}"><span class="ia-tokens__project-bar-fill" style="width:${pct}%"></span></span>
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
        _totalTokens = null;
        _statusKey = 'iaw.status.syncing';
        _applyStatus();
        return;
      }

      _totalTokens = data.totalTokens;
      _countUp(valueEl, data.totalTokens);
      _renderMix();
      _statusKey = 'iaw.status.live';
      _applyStatus();
    } catch (err) {
      console.error('[ia-tokens-widget] Error:', err.message);
      valueEl.textContent = '—';
      _totalTokens = null;
      _statusKey = 'iaw.status.offline';
      _applyStatus();
      _loaded = false; // permite reintentar al reentrar al modo .ia
    }
  }

  return { init };
})();
