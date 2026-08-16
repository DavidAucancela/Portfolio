// Vercel serverless function (Node runtime, ESM).
// Proxy server-to-server hacia LLM Observatory: evita exponer el token
// obs_sk_... al cliente. Trae el total agregado de TODOS los proyectos
// monitoreados bajo la org (GET /api/metrics/summary) y el desglose por
// proyecto vía GET /api/metrics/project-breakdown, que agrupa por el nombre
// real del observatory token (token_name) en vez de un tag libre — no
// depende de que cada integración etiquete consistentemente.
// Único caller: js/ia-tokens-widget.js.
// Configurar en Vercel: LLM_OBSERVATORY_API_URL (ej. https://llm-api-production-03b2.up.railway.app)
// y LLM_OBSERVATORY_API_TOKEN (obs_sk_... generado en la UI de LLM Observatory).

const REQUEST_TIMEOUT_MS = 6000;
const RANGE = '90d';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const apiUrl = process.env.LLM_OBSERVATORY_API_URL;
  const token  = process.env.LLM_OBSERVATORY_API_TOKEN;
  if (!apiUrl || !token) {
    res.status(200).json({ totalTokens: null, projects: [], mock: true });
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [summaryRes, breakdownRes] = await Promise.all([
      fetch(`${apiUrl}/api/metrics/summary?range=${RANGE}`, { signal: controller.signal, headers }),
      fetch(`${apiUrl}/api/metrics/project-breakdown?range=${RANGE}`, { signal: controller.signal, headers }),
    ]);

    if (!summaryRes.ok) {
      res.status(200).json({ totalTokens: null, projects: [], mock: true });
      return;
    }

    const summaryData = await summaryRes.json();
    const totalTokens = Number(summaryData?.summary?.total_tokens);

    if (!Number.isFinite(totalTokens)) {
      res.status(200).json({ totalTokens: null, projects: [], mock: true });
      return;
    }

    let projects = [];
    if (breakdownRes.ok) {
      const breakdownData = await breakdownRes.json();
      projects = (breakdownData?.data || [])
        .filter((p) => p.value)
        .map((p) => ({
          name: p.value,
          requests: Number(p.requests) || 0,
          totalTokens: Number(p.total_tokens) || 0,
        }))
        .sort((a, b) => b.totalTokens - a.totalTokens);
    }

    res.status(200).json({ totalTokens, projects, mock: false });
  } catch (err) {
    console.error('[llm-stats] Error:', err.message);
    res.status(200).json({ totalTokens: null, projects: [], mock: true });
  } finally {
    clearTimeout(timeout);
  }
}
