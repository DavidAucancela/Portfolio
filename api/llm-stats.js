// Vercel serverless function (Node runtime, ESM).
// Proxy server-to-server hacia la API de LLM Observatory: evita exponer el
// token de auth al cliente y evita el 401/CORS al llamar la API directo desde
// el navegador. Único caller: js/ia-tokens-widget.js.
// Configurar en Vercel: LLM_OBSERVATORY_API_URL y (si aplica) LLM_OBSERVATORY_API_TOKEN.

const REQUEST_TIMEOUT_MS = 6000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const apiUrl = process.env.LLM_OBSERVATORY_API_URL;
  if (!apiUrl) {
    res.status(200).json({ totalTokens: null, mock: true });
    return;
  }

  const token = process.env.LLM_OBSERVATORY_API_TOKEN;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      res.status(200).json({ totalTokens: null, mock: true });
      return;
    }

    const data = await response.json();
    const totalTokens = Number(data?.totalTokens ?? data?.total_tokens ?? data?.tokens);

    if (!Number.isFinite(totalTokens)) {
      res.status(200).json({ totalTokens: null, mock: true });
      return;
    }

    res.status(200).json({ totalTokens, mock: false });
  } catch {
    res.status(200).json({ totalTokens: null, mock: true });
  } finally {
    clearTimeout(timeout);
  }
}
