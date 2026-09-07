/* ============================================================
   GIT HISTORY — Heatmap de actividad + stats (modo .dev)

   Dos estados (data-widget-state en #git-activity):
   - collapsed: solo el nº de Pull requests (cara compacta)
   - expanded : heatmap ("mapa de PR") + stats + historial de PRs

   La transición reproduce una animación tipo "commit → cloud →
   monitoreo" (_runIntro) antes de revelar el cuerpo.
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

const INTRO_MS = 1200;

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
  const _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let _fetched = false;
  let _data = null;
  let _expandRendered = false;
  let _introTimer = null;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'dev') {
        _collapse();
        _onEnterDev();
      }
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'dev' && !_fetched) {
        _onEnterDev();
      }
    }, 120);

    document.getElementById('git-activity-summary')
      ?.addEventListener('click', _expand);
    document.getElementById('git-activity-more-btn')
      ?.addEventListener('click', _collapse);
    document.getElementById('git-activity')
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') _collapse();
      });

    // Re-render de las partes dinámicas al cambiar de idioma (los <span>
    // estáticos los reetiqueta LangSwitcher vía data-i18n).
    window.addEventListener('portfolio:langChange', () => {
      if (_data && _expandRendered) _renderDeferred();
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
  function _expand() {
    const root = document.getElementById('git-activity');
    if (!root || root.dataset.widgetState === 'expanded') return;
    root.dataset.widgetState = 'expanded';
    document.getElementById('git-activity-summary')
      ?.setAttribute('aria-expanded', 'true');

    const reveal = () => {
      if (!_expandRendered && _data) {
        _expandRendered = true;
        _renderDeferred();
      }
    };

    if (_reduced || !_data) { reveal(); return; }
    _runIntro(reveal);
  }

  function _collapse() {
    const root = document.getElementById('git-activity');
    if (!root) return;
    root.dataset.widgetState = 'collapsed';
    document.getElementById('git-activity-summary')
      ?.setAttribute('aria-expanded', 'false');
    _clearIntro();
  }

  /* ── Animación de intro: commit → cloud → monitoreo ── */
  function _runIntro(done) {
    const intro = document.getElementById('git-activity-intro');
    if (!intro) { done(); return; }

    intro.innerHTML = `
      <div class="ga-intro__code">
        <span class="ga-intro__line">$ git add --all</span>
        <span class="ga-intro__line">$ git commit -m "feat: ship it"</span>
        <span class="ga-intro__line">$ git push origin main</span>
      </div>
      <svg class="ga-intro__wire" viewBox="0 0 200 44" aria-hidden="true">
        <path class="ga-intro__path" d="M8 34 C 60 34, 90 10, 150 10" fill="none"/>
        <circle class="ga-intro__packet" r="4"/>
        <g class="ga-intro__cloud" transform="translate(150 2)">
          <path d="M4 16 a7 7 0 0 1 3 -13 a9 9 0 0 1 17 3 a6 6 0 0 1 -1 10 z"/>
        </g>
      </svg>
      <div class="ga-intro__monitor"><span></span></div>
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
    const intro = document.getElementById('git-activity-intro');
    if (intro) {
      intro.classList.remove('is-playing');
      intro.innerHTML = '';
    }
  }

  /* ── Fetch de datos (al entrar al modo .dev) ──────── */
  async function _onEnterDev() {
    if (_fetched) {
      if (document.getElementById('git-activity')?.dataset.widgetState === 'expanded') {
        _expandRendered = true;
        _renderDeferred();
      }
      return;
    }
    _fetched = true;

    const el = document.getElementById('git-activity');
    if (!el) return;

    try {
      const [localRes, ghRes, statsRes] = await Promise.all([
        fetch('data/git-history.json'),
        fetch('/api/github-contributions').catch(() => null),
        fetch('/api/github-stats').catch(() => null),
      ]);
      if (!localRes.ok) throw new Error(`data/git-history.json respondió ${localRes.status}`);
      const local = await localRes.json();
      const gh    = ghRes    ? await ghRes.json().catch(() => null)    : null;
      const stats = statsRes ? await statsRes.json().catch(() => null) : null;
      _data = { local, gh, stats };

      const liveStats = _data.stats && !_data.stats.mock ? _data.stats : null;
      _renderStats({
        totalPRs:      liveStats?.totalMerged ?? _data.local.prs?.length ?? null,
        prsIsExact:    Boolean(liveStats),
        totalCommits:  liveStats?.totalCommits ?? _data.local.totalCommitsAllTime ?? null,
        totalProjects: _data.local.totalProjects ?? null,
      });

      // Si el usuario ya expandió antes de que llegaran los datos, renderiza ya.
      if (el.dataset.widgetState === 'expanded' && !_expandRendered) {
        _expandRendered = true;
        _renderDeferred();
      }
    } catch (err) {
      console.error('[git-history] Error:', err.message);
      _fetched = false; // permite reintentar si el usuario vuelve a entrar a .dev
    }
  }

  /* ── Render diferido: heatmap + historial de PRs ──── */
  function _renderDeferred() {
    if (!_data) return;
    const useGh = _data.gh && !_data.gh.mock && Array.isArray(_data.gh.days) && _data.gh.days.length;
    _renderHeatmap(
      useGh
        ? { days: _data.gh.days, total: _data.gh.totalContributions, source: 'github', username: _data.gh.username }
        : { days: _data.local.days, total: _data.local.totalCommits, source: 'local' }
    );
    _renderPrHistory();
  }

  function _renderPrHistory() {
    const list = document.getElementById('git-activity-pr-list');
    if (!list) return;

    const prs = _data?.stats && !_data.stats.mock && Array.isArray(_data.stats.prs)
      ? _data.stats.prs.slice(0, 5)
      : [];

    if (prs.length === 0) {
      list.innerHTML = `<li class="git-activity__history-empty">${LangSwitcher.t('gitw.noActivity')}</li>`;
      return;
    }

    list.innerHTML = prs.map((pr) => `
      <li class="git-activity__pr-item">
        <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="git-activity__pr-link">
          <span class="git-activity__pr-title">#${pr.number} ${_escapeHtml(pr.title)}</span>
          <span class="git-activity__pr-date">${_timeAgo(pr.mergedAt)}</span>
        </a>
      </li>
    `).join('');
  }

  function _renderStats({ totalPRs, prsIsExact, totalCommits, totalProjects }) {
    const faceEl     = document.getElementById('git-activity-face-prs');
    const prsEl      = document.getElementById('git-activity-stat-prs');
    const commitsEl  = document.getElementById('git-activity-stat-commits');
    const projectsEl = document.getElementById('git-activity-stat-projects');

    const prsText = Number.isFinite(totalPRs) ? `${totalPRs}${prsIsExact ? '' : '+'}` : '—';
    if (faceEl) faceEl.textContent = prsText;
    if (prsEl)  prsEl.textContent  = prsText;
    if (commitsEl)  commitsEl.textContent  = Number.isFinite(totalCommits)  ? String(totalCommits)  : '—';
    if (projectsEl) projectsEl.textContent = Number.isFinite(totalProjects) ? String(totalProjects) : '—';
  }

  function _renderHeatmap(data) {
    const grid   = document.getElementById('git-activity-grid');
    const months = document.getElementById('git-activity-months');
    const total  = document.getElementById('git-activity-total');
    const label  = document.getElementById('git-activity-heatmap-label');
    if (!grid) return;

    const counts = new Map((data.days || []).map((d) => [d.date, d.count]));

    // Alinea el inicio al domingo de la semana (WEEKS - 1) atrás, para armar
    // una grilla de 7 filas (dom-sáb) x WEEKS columnas, terminando hoy.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (WEEKS * 7 - 1) * DAY_MS);
    start.setDate(start.getDate() - start.getDay());

    // Máximo dentro del rango mostrado — base para los cuartiles de _levelFor.
    const maxCount = Math.max(0, ...Array.from(counts.values()));

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${WEEKS}, var(--git-cell-size))`;
    grid.style.gridTemplateRows    = `repeat(7, var(--git-cell-size))`;

    months.innerHTML = '';
    months.style.gridTemplateColumns = `repeat(${WEEKS}, var(--git-cell-size))`;
    let lastMonth = null;

    for (let col = 0; col < WEEKS; col++) {
      const colStartDay = new Date(start.getTime() + col * 7 * DAY_MS);
      const month = colStartDay.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        const label = document.createElement('span');
        label.className = 'git-activity__month-label';
        label.style.gridColumn = String(col + 1);
        label.textContent = _monthLabels()[month];
        months.appendChild(label);
      }

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
          cell.className = `git-activity__day git-activity__day--l${_levelFor(count, maxCount)}`;
          // Sin `title`: el tooltip nativo del navegador duplicaría al
          // custom de _bindCellTooltip (ver más abajo) con un delay propio
          // que no se puede sincronizar. aria-label mantiene el dato
          // accesible para lectores de pantalla.
          cell.dataset.date  = iso;
          cell.dataset.count = String(count);
          cell.dataset.noun  = noun;
          cell.setAttribute('aria-label', `${_fmtDate(day)}: ${count} ${noun}`);
        }
        grid.appendChild(cell);
      }
    }

    if (total) {
      total.removeAttribute('data-i18n');
      const suffix = data.source === 'github'
        ? LangSwitcher.t('gitw.contribsSuffix')
        : LangSwitcher.t('gitw.commitsRepoSuffix');
      total.textContent = `${data.total || 0} ${suffix} · ${LangSwitcher.t('gitw.weeksSuffix')}`;
    }

    if (label) {
      label.removeAttribute('data-i18n');
      const es = LangSwitcher.getLang() === 'es';
      label.textContent = data.source === 'github'
        ? (es
            ? `Contribuciones en GitHub (@${data.username}) · por semana`
            : `GitHub contributions (@${data.username}) · per week`)
        : LangSwitcher.t('gitw.heatmapLabel');
    }
  }

  return { init };
})();
