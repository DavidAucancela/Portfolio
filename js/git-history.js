/* ============================================================
   GIT HISTORY — Heatmap de actividad + stats (modo .dev)
   ============================================================ */

const WEEKS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function _isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function _timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diffMs / DAY_MS);
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
  let _rendered = false;
  let _data = null;
  let _historyLoaded = false;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'dev') _onEnterDev();
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'dev' && !_rendered) {
        _onEnterDev();
      }
    }, 120);

    document.getElementById('git-activity-more-btn')
      ?.addEventListener('click', _toggleHistory);
  }

  function _toggleHistory() {
    const btn   = document.getElementById('git-activity-more-btn');
    const panel = document.getElementById('git-activity-history');
    if (!btn || !panel) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
    btn.querySelector('span:last-child').textContent = expanded ? '▾' : '▴';
    btn.querySelector('span:first-child').textContent = expanded ? 'Ver más' : 'Ver menos';

    if (!expanded && !_historyLoaded) {
      _historyLoaded = true;
      _renderPrHistory();
    }
  }

  function _renderPrHistory() {
    const list = document.getElementById('git-activity-pr-list');
    if (!list) return;

    const prs = _data?.stats && !_data.stats.mock && Array.isArray(_data.stats.prs)
      ? _data.stats.prs.slice(0, 5)
      : [];

    if (prs.length === 0) {
      list.innerHTML = '<li class="git-activity__history-empty">Sin actividad reciente disponible</li>';
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

  async function _onEnterDev() {
    if (_rendered) return;
    _rendered = true;

    const el = document.getElementById('git-activity');
    if (!el) return;

    try {
      if (!_data) {
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
      }

      const useGh = _data.gh && !_data.gh.mock && Array.isArray(_data.gh.days) && _data.gh.days.length;
      _renderHeatmap(
        useGh
          ? { days: _data.gh.days, total: _data.gh.totalContributions, source: 'github', username: _data.gh.username }
          : { days: _data.local.days, total: _data.local.totalCommits, source: 'local' }
      );

      const liveStats = _data.stats && !_data.stats.mock ? _data.stats : null;

      _renderStats({
        totalPRs:      liveStats?.totalMerged ?? _data.local.prs?.length ?? null,
        prsIsExact:    Boolean(liveStats),
        totalCommits:  liveStats?.totalCommits ?? _data.local.totalCommitsAllTime ?? null,
        totalProjects: _data.local.totalProjects ?? null,
      });
    } catch (err) {
      console.error('[git-history] Error:', err.message);
      _rendered = false; // permite reintentar si el usuario vuelve a entrar a .dev
    }
  }

  function _renderStats({ totalPRs, prsIsExact, totalCommits, totalProjects }) {
    const prsEl      = document.getElementById('git-activity-stat-prs');
    const commitsEl  = document.getElementById('git-activity-stat-commits');
    const projectsEl = document.getElementById('git-activity-stat-projects');

    if (prsEl) {
      prsEl.textContent = Number.isFinite(totalPRs) ? `${totalPRs}${prsIsExact ? '' : '+'}` : '—';
    }
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
        label.textContent = MONTH_LABELS[month];
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
          const noun  = data.source === 'github' ? 'contribución' : 'commit';
          cell.className = `git-activity__day git-activity__day--l${_levelFor(count, maxCount)}`;
          cell.title = `${iso}: ${count} ${noun}${count === 1 ? '' : 's'}`;
        }
        grid.appendChild(cell);
      }
    }

    if (total) {
      const noun = data.source === 'github' ? 'contribuciones' : 'commits (solo este repo)';
      total.textContent = `${data.total || 0} ${noun} · últimas ${WEEKS} semanas`;
    }

    if (label) {
      label.textContent = data.source === 'github'
        ? `Contribuciones en GitHub (@${data.username}) · por semana`
        : 'Commits por semana · últimas 12 semanas';
    }
  }

  return { init };
})();
