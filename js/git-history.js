/* ============================================================
   GIT HISTORY — Actividad de GitHub (modo .dev)

   Panel tipo "instrumento": franja con LED + nombre + fuente, una cifra
   grande (commits de las últimas 12 semanas, la misma suma que pinta el
   heatmap) con su línea de tendencia semanal, y el detalle debajo.
   Dos estados (data-widget-state en #git-activity):
   - collapsed: franja + cifra + tendencia
   - expanded : además el heatmap por día y los PRs mergeados
   ============================================================ */

import { LangSwitcher } from './lang.js';

const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];
const MONTH_LABELS_EN = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function _monthLabels() {
  return LangSwitcher.getLang() === 'es' ? MONTH_LABELS_ES : MONTH_LABELS_EN;
}

function _isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** "5 sep 2026" — usado en el tooltip de celda del heatmap */
function _fmtDate(d) {
  return `${d.getDate()} ${_monthLabels()[d.getMonth()]} ${d.getFullYear()}`;
}

function _timeAgo(isoDate) {
  const es = LangSwitcher.getLang() === 'es';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / DAY_MS);
  if (days <= 0) return LangSwitcher.t('gitw.today');
  if (days === 1) return LangSwitcher.t('gitw.yesterday');
  if (days < 30) return es ? `hace ${days}d` : `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return es ? `hace ${months}m` : `${months}mo ago`;
  const years = Math.floor(months / 12);
  return es ? `hace ${years}a` : `${years}y ago`;
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Bucket de intensidad 0-4 según cantidad de commits/contribuciones del día,
 * relativo al máximo del propio rango mostrado (como GitHub, que calcula
 * cuartiles sobre los datos del usuario en vez de usar umbrales fijos —
 * con umbrales fijos, un usuario con días de 10-20 contribuciones termina
 * con casi toda la grilla en el nivel más alto y no se distinguen los
 * días de más/menos actividad entre sí).
 */
function _levelFor(count, max) {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export const GitHistory = (() => {
  let _fetched = false;
  let _data = null;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'dev') {
        _setState('collapsed');
        _onEnterDev();
      }
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'dev' && !_fetched) {
        _onEnterDev();
      }
    }, 120);

    document.getElementById('git-activity-toggle')?.addEventListener('click', () => {
      const root = document.getElementById('git-activity');
      _setState(root?.dataset.widgetState === 'expanded' ? 'collapsed' : 'expanded');
    });
    document.getElementById('git-activity')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') _setState('collapsed');
      });

    // Re-render de las partes dinámicas al cambiar de idioma (los <span>
    // estáticos los reetiqueta LangSwitcher vía data-i18n).
    window.addEventListener('portfolio:langChange', () => {
      if (_data) _renderAll();
    });

    _bindCellTooltip();
  }

  /* ── Tooltip de celda del heatmap ─────────────────────
     Delegado en el grid (las celdas se recrean en cada _renderHeatmap,
     un listener por celda se perdería en cada re-render). */
  function _bindCellTooltip() {
    const grid  = document.getElementById('git-activity-grid');
    const tip   = document.getElementById('git-activity-tip');
    const chart = document.querySelector('.git-activity__chart');
    if (!grid || !tip || !chart) return;

    const show = (cell) => {
      if (!cell.dataset.date) return;
      const [y, m, d] = cell.dataset.date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      tip.innerHTML = `<strong>${cell.dataset.count} ${cell.dataset.noun}</strong><br>${_fmtDate(date)} · ${_timeAgo(cell.dataset.date)}`;

      const chartBox = chart.getBoundingClientRect();
      const cellBox  = cell.getBoundingClientRect();
      tip.style.left = `${cellBox.left - chartBox.left + cellBox.width / 2}px`;
      tip.style.top  = `${cellBox.top  - chartBox.top}px`;
      tip.classList.add('is-visible');
      tip.setAttribute('aria-hidden', 'false');
    };
    const hide = () => {
      tip.classList.remove('is-visible');
      tip.setAttribute('aria-hidden', 'true');
    };

    grid.addEventListener('pointerover', (e) => {
      const cell = e.target.closest('.git-activity__day');
      if (cell && !cell.classList.contains('git-activity__day--empty')) show(cell);
    });
    grid.addEventListener('pointerout', (e) => {
      const cell = e.target.closest('.git-activity__day');
      if (cell && !cell.contains(e.relatedTarget)) hide();
    });
    grid.addEventListener('pointerleave', hide);
  }

  /* ── Estados ──────────────────────────────────────── */
  function _setState(state) {
    const root = document.getElementById('git-activity');
    if (!root) return;
    root.dataset.widgetState = state;
    document.getElementById('git-activity-toggle')
      ?.setAttribute('aria-expanded', String(state === 'expanded'));
  }

  /* ── Fetch de datos (al entrar al modo .dev) ──────── */
  async function _onEnterDev() {
    if (_fetched) return;
    _fetched = true;

    try {
      // Lo local primero: la cara y el heatmap se pintan sin esperar a /api
      // (en dev sin `vercel dev` el proxy tarda varios segundos en fallar).
      const ghReq    = fetch('/api/github-contributions').catch(() => null);
      const statsReq = fetch('/api/github-stats').catch(() => null);
      const localRes = await fetch('data/git-history.json');
      if (!localRes.ok) throw new Error(`data/git-history.json respondió ${localRes.status}`);
      _data = { local: await localRes.json(), gh: null, stats: null };
      _renderAll();

      const [ghRes, statsRes] = await Promise.all([ghReq, statsReq]);
      const gh    = ghRes?.ok    ? await ghRes.json().catch(() => null)    : null;
      const stats = statsRes?.ok ? await statsRes.json().catch(() => null) : null;
      if (gh || stats) {
        _data = { ..._data, gh, stats };
        _renderAll();
      }
    } catch (err) {
      console.error('[git-history] Error:', err.message);
      _fetched = false; // permite reintentar si el usuario vuelve a entrar a .dev
    }
  }

  /* ── Render: cara + heatmap + PRs (todo junto — es barato) ── */
  function _renderAll() {
    if (!_data) return;
    const useGh = _data.gh && !_data.gh.mock && Array.isArray(_data.gh.days) && _data.gh.days.length;
    const source = useGh ? 'github' : 'local';
    const range = _renderHeatmap({
      days: useGh ? _data.gh.days : _data.local.days,
      source,
      username: _data.gh?.username,
    });

    const liveStats = _data.stats && !_data.stats.mock ? _data.stats : null;
    const prs = liveStats?.totalMerged ?? _data.local.prs?.length ?? null;
    _renderFace({
      total:    range.total,
      weekly:   range.weekly,
      source,
      allTime:  liveStats?.totalCommits ?? _data.local.totalCommitsAllTime ?? null,
      prs:      Number.isFinite(prs) ? `${prs}${liveStats ? '' : '+'}` : null,
      projects: _data.local.totalProjects ?? null,
    });
    _renderPrHistory();
  }

  function _renderFace({ total, weekly, source, allTime, prs, projects }) {
    const big  = document.getElementById('git-activity-big');
    const unit = document.getElementById('git-activity-unit');
    const sub  = document.getElementById('git-activity-sub');
    if (big) big.textContent = String(total);
    if (unit) {
      unit.dataset.i18n = source === 'github' ? 'gitw.unitContribs' : 'gitw.unitCommits';
      unit.textContent = LangSwitcher.t(unit.dataset.i18n);
    }
    if (sub) {
      sub.removeAttribute('data-i18n');
      const parts = [];
      if (Number.isFinite(allTime)) parts.push(`${allTime} ${LangSwitcher.t('gitw.allTime')}`);
      if (prs) parts.push(`${prs} PRs`);
      if (Number.isFinite(projects)) parts.push(`${projects} ${LangSwitcher.t('gitw.projects')}`);
      sub.textContent = parts.join(' · ');
    }
    _renderSpark(weekly);
  }

  /** Línea de tendencia: commits por semana, con el último punto marcado. */
  function _renderSpark(weekly) {
    const svg = document.getElementById('git-activity-spark');
    if (!svg || weekly.length < 2) return;
    const W = 300, H = 40;
    const max = Math.max(1, ...weekly);
    const step = W / (weekly.length - 1);
    const pts = weekly.map((v, i) => [i * step, H - 3 - (v / max) * (H - 8)]);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const [lx, ly] = pts[pts.length - 1];
    svg.innerHTML = `
      <line class="git-activity__spark-base" x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}"/>
      <path class="git-activity__spark-area" d="${d} L${W} ${H} L0 ${H} Z"/>
      <path class="git-activity__spark-line" d="${d}"/>
      <circle class="git-activity__spark-dot" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3"/>`;
  }

  function _renderPrHistory() {
    const list = document.getElementById('git-activity-pr-list');
    if (!list) return;

    const prs = _data?.stats && !_data.stats.mock && Array.isArray(_data.stats.prs)
      ? _data.stats.prs.slice(0, 8)
      : [];

    if (prs.length === 0) {
      list.innerHTML = `<li class="git-activity__history-empty">${LangSwitcher.t('gitw.noActivity')}</li>`;
      return;
    }

    // `pr.repo` viene como "owner/name" (PRs de todos los repos de proyectos,
    // no solo este) — se muestra solo el nombre del repo.
    list.innerHTML = prs.map((pr) => {
      const repoName = pr.repo ? pr.repo.split('/').pop() : '';
      return `
      <li class="git-activity__pr-item">
        <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="git-activity__pr-link">
          <span class="git-activity__pr-num">#${pr.number}</span>
          <span class="git-activity__pr-title">${_escapeHtml(pr.title)}</span>
          <span class="git-activity__pr-meta">${repoName ? `${_escapeHtml(repoName)} · ` : ''}${_timeAgo(pr.mergedAt)}</span>
        </a>
      </li>
    `;
    }).join('');
  }

  /** Pinta el heatmap y devuelve { total, weekly } del rango mostrado. */
  function _renderHeatmap(data) {
    const grid   = document.getElementById('git-activity-grid');
    const months = document.getElementById('git-activity-months');
    const range  = document.getElementById('git-activity-range');
    const label  = document.getElementById('git-activity-heatmap-label');
    const out = { total: 0, weekly: [] };
    if (!grid) return out;

    const counts = new Map((data.days || []).map((d) => [d.date, d.count]));

    // Grilla de 7 filas (dom-sáb) x WEEKS columnas: la última columna es la
    // semana de hoy (los días que faltan quedan vacíos). Antes se restaban
    // WEEKS*7-1 días y después se retrocedía al domingo, y la grilla
    // terminaba el sábado anterior: los últimos días no se veían.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

    // Máximo dentro del rango mostrado — base para los cuartiles de _levelFor.
    const maxCount = Math.max(0, ...Array.from(counts.values()));

    grid.innerHTML = '';
    months.innerHTML = '';
    let lastMonth = null;

    for (let col = 0; col < WEEKS; col++) {
      const colStartDay = new Date(start.getTime() + col * 7 * DAY_MS);
      const month = colStartDay.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        const m = document.createElement('span');
        m.className = 'git-activity__month-label';
        m.style.gridColumn = String(col + 1);
        m.textContent = _monthLabels()[month];
        months.appendChild(m);
      }

      let week = 0;
      for (let row = 0; row < 7; row++) {
        const day = new Date(start.getTime() + (col * 7 + row) * DAY_MS);
        const cell = document.createElement('span');
        cell.style.gridColumn = String(col + 1);
        cell.style.gridRow    = String(row + 1);

        if (day > today) {
          cell.className = 'git-activity__day git-activity__day--empty';
        } else {
          const iso   = _isoDate(day);
          const count = counts.get(iso) || 0;
          const one   = count === 1;
          const noun  = data.source === 'github'
            ? LangSwitcher.t(one ? 'gitw.contribSingular' : 'gitw.contribPlural')
            : LangSwitcher.t(one ? 'gitw.commitSingular' : 'gitw.commitPlural');
          week += count;
          cell.className = `git-activity__day git-activity__day--l${_levelFor(count, maxCount)}`;
          // Sin `title`: el tooltip nativo del navegador duplicaría al
          // custom de _bindCellTooltip. aria-label mantiene el dato
          // accesible para lectores de pantalla.
          cell.dataset.date  = iso;
          cell.dataset.count = String(count);
          cell.dataset.noun  = noun;
          cell.setAttribute('aria-label', `${_fmtDate(day)}: ${count} ${noun}`);
        }
        grid.appendChild(cell);
      }
      out.weekly.push(week);
      out.total += week;
    }

    if (range) {
      const ml = _monthLabels();
      range.textContent = `${ml[start.getMonth()]} → ${ml[today.getMonth()]}`;
    }
    if (label) {
      label.removeAttribute('data-i18n');
      label.textContent = data.source === 'github' && data.username
        ? `${LangSwitcher.t('gitw.byDay')} · @${data.username}`
        : LangSwitcher.t('gitw.byDay');
    }
    return out;
  }

  return { init };
})();
