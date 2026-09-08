// Vercel serverless function (Node runtime, ESM).
// Trae PRs mergeados y el conteo total de commits EN VIVO desde la REST API
// pública de GitHub (Search API + header Link de /commits) — a diferencia de
// contributionsCollection (github-contributions.js), estos endpoints no
// requieren auth para repos públicos, así que funciona sin configurar nada.
// Si se define GITHUB_TOKEN igual se usa, para evitar el rate-limit bajo
// (10 req/min) de la Search API sin autenticar.
// Caller: js/git-history.js (stats del panel "Ver más" del modo .dev).
//
// El historial de PRs NO se limita al repo del portfolio: se busca por
// `author:<username>` en toda la cuenta de GitHub y se filtra contra la lista
// de repos declarados en data/{dev,ia}-projects.json (campo `repoUrl`) — así
// el widget muestra los PRs mergeados de TODOS los proyectos del portfolio,
// no solo de este repo. El conteo de commits sigue siendo el del repo default.

import devProjects from '../data/dev-projects.json' with { type: 'json' };
import iaProjects from '../data/ia-projects.json' with { type: 'json' };

const REQUEST_TIMEOUT_MS = 6000;
const DEFAULT_REPO = 'DavidAucancela/Portfolio';
const DEFAULT_USERNAME = 'DavidAucancela';
const PR_HISTORY_LIMIT = 10;

function authHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Extrae el nro. de página de la última entrada del header Link — truco estándar para contar recursos sin traerlos todos. */
function lastPageFromLink(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number(match[1]) : null;
}

/** "https://github.com/Owner/Repo(.git)" → "owner/repo" en minúsculas. */
function repoSlugFromUrl(url) {
  const m = String(url || '').match(/github\.com\/([^/\s]+\/[^/\s#?]+)/i);
  if (!m) return null;
  return m[1].replace(/\.git$/i, '').toLowerCase();
}

/** "https://api.github.com/repos/Owner/Repo" → "owner/repo" en minúsculas. */
function repoSlugFromApiUrl(url) {
  const m = String(url || '').match(/\/repos\/([^/\s]+\/[^/\s]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

// Repos de todos los proyectos del portfolio con `repoUrl` en su JSON.
const PROJECT_REPOS = new Set(
  [...devProjects, ...iaProjects]
    .map((p) => repoSlugFromUrl(p && p.repoUrl))
    .filter(Boolean)
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const repo     = process.env.GITHUB_REPO || DEFAULT_REPO;
  const username = process.env.GITHUB_USERNAME || DEFAULT_USERNAME;
  const token    = process.env.GITHUB_TOKEN;
  const headers  = authHeaders(token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [prsRes, commitsRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`author:${username} is:pr is:merged`)}&sort=created&order=desc&per_page=100`,
        { signal: controller.signal, headers }
      ),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { signal: controller.signal, headers }),
    ]);

    if (!prsRes.ok) {
      res.status(200).json({ prs: [], totalMerged: null, totalCommits: null, mock: true });
      return;
    }

    const prsData = await prsRes.json();
    const prs = (prsData.items || [])
      .map((it) => ({
        number: it.number,
        title: it.title,
        mergedAt: it.pull_request?.merged_at || it.closed_at,
        url: it.html_url,
        repo: repoSlugFromApiUrl(it.repository_url),
      }))
      // Solo PRs de repos que pertenecen a un proyecto del portfolio.
      .filter((pr) => pr.repo && PROJECT_REPOS.has(pr.repo))
      .sort((a, b) => String(b.mergedAt).localeCompare(String(a.mergedAt)));

    const totalCommits = commitsRes.ok
      ? (lastPageFromLink(commitsRes.headers.get('link')) ?? 1)
      : null;

    res.status(200).json({
      prs: prs.slice(0, PR_HISTORY_LIMIT),
      // Total de PRs mergeados por el autor (todas las cuentas/repos) — número
      // honesto para la cara del widget; `prs` de arriba sí va filtrado a los
      // repos de proyectos del portfolio.
      totalMerged: prsData.total_count ?? prs.length,
      totalCommits,
      mock: false,
    });
  } catch (err) {
    console.error('[github-stats] Error:', err.message);
    res.status(200).json({ prs: [], totalMerged: null, totalCommits: null, mock: true });
  } finally {
    clearTimeout(timeout);
  }
}
