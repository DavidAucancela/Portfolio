// Vercel serverless function (Node runtime, ESM).
// Trae PRs mergeados y el conteo total de commits EN VIVO desde la REST API
// pública de GitHub (Search API + header Link de /commits) — a diferencia de
// contributionsCollection (github-contributions.js), estos endpoints no
// requieren auth para repos públicos, así que funciona sin configurar nada.
// Si se define GITHUB_TOKEN igual se usa, para evitar el rate-limit bajo
// (10 req/min) de la Search API sin autenticar.
// Callers: js/git-history.js (repo default) y js/ia-tokens-widget.js
// (?repo=DavidAucancela/llm-observatory, historial del panel "Ver más").

const REQUEST_TIMEOUT_MS = 6000;
const DEFAULT_REPO = 'DavidAucancela/Portfolio';

// Allow-list — evita que el endpoint se use como proxy abierto hacia
// cualquier repo de GitHub vía ?repo=.
const ALLOWED_REPOS = new Set([
  DEFAULT_REPO,
  'DavidAucancela/llm-observatory',
]);

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const requestedRepo = typeof req.query.repo === 'string' ? req.query.repo : null;
  const repo  = requestedRepo && ALLOWED_REPOS.has(requestedRepo)
    ? requestedRepo
    : (process.env.GITHUB_REPO || DEFAULT_REPO);
  const token = process.env.GITHUB_TOKEN;
  const headers = authHeaders(token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [prsRes, commitsRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} is:pr is:merged`)}&sort=created&order=desc&per_page=10`,
        { signal: controller.signal, headers }
      ),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { signal: controller.signal, headers }),
    ]);

    if (!prsRes.ok) {
      res.status(200).json({ prs: [], totalMerged: null, totalCommits: null, mock: true });
      return;
    }

    const prsData = await prsRes.json();
    const prs = (prsData.items || []).map((it) => ({
      number: it.number,
      title: it.title,
      mergedAt: it.pull_request?.merged_at || it.closed_at,
      url: it.html_url,
    }));

    const totalCommits = commitsRes.ok
      ? (lastPageFromLink(commitsRes.headers.get('link')) ?? 1)
      : null;

    res.status(200).json({
      prs,
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
