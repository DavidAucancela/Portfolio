/* ============================================================
   GIT HISTORY — Heatmap de actividad + historial de PRs (modo .dev)
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

/** Bucket de intensidad 0-4 según cantidad de commits del día. */
function _levelFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function _timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'hace 1 día';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'hace 1 mes';
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'hace 1 año' : `hace ${years} años`;
}

export const GitHistory = (() => {
  let _rendered = false;
  let _data = null;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'dev') _onEnterDev();
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'dev' && !_rendered) {
        _onEnterDev();
      }
    }, 120);
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

      const livePRs = liveStats?.prs?.length
        ? liveStats.prs.map((pr) => ({
            number: pr.number,
            title: pr.title,
            date: pr.mergedAt,
            url: pr.url,
          }))
        : (_data.local.prs || []).map((pr) => ({
            number: pr.number,
            title: pr.title,
            date: pr.date,
            url: `https://github.com/DavidAucancela/Portfolio/pull/${pr.number}`,
          }));

      _renderPRs(livePRs);
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
          cell.className = `git-activity__day git-activity__day--l${_levelFor(count)}`;
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

  function _renderPRs(prs) {
    const list = document.getElementById('git-activity-prs');
    if (!list) return;
    list.innerHTML = '';

    if (!prs.length) {
      const li = document.createElement('li');
      li.className = 'git-activity__pr-empty';
      li.textContent = 'Sin historial de PRs disponible.';
      list.appendChild(li);
      return;
    }

    prs.forEach((pr) => {
      const li = document.createElement('li');
      li.className = 'git-activity__pr';

      const a = document.createElement('a');
      a.href = pr.url || `https://github.com/DavidAucancela/Portfolio/pull/${pr.number}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'git-activity__pr-link';

      const num = document.createElement('span');
      num.className = 'git-activity__pr-num';
      num.textContent = `#${pr.number}`;

      const title = document.createElement('span');
      title.className = 'git-activity__pr-title';
      title.textContent = pr.title || '(sin título)';

      const date = document.createElement('span');
      date.className = 'git-activity__pr-date';
      date.textContent = _timeAgo(pr.date);

      a.append(num, title, date);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  return { init };
})();
