// Vercel serverless function (Node runtime, ESM).
// Recibe matches LOCALES de JotAI (sin llamada a LLM) y los reporta a LLM
// Observatory como filas de costo $0 — visibilidad completa del historial de
// JotAI sin inflar métricas de gasto. Los paths ai_fallback/canned_fallback
// YA se reportan automáticamente desde api/jotai-chat.js vía MonitoredOpenAI
// — este endpoint NO debe usarse para esos casos (evitar doble logging).
// Único caller: js/ia-mascot.js (_handleSend, rama de match local).

import { waitUntil } from '@vercel/functions';

const MAX_QUERY_LENGTH = 300;
const MAX_INTENT_LENGTH = 120;
const REQUEST_TIMEOUT_MS = 5000;

function isAllowedOrigin(req) {
  const allowed = process.env.ALLOWED_ORIGIN;
  if (!allowed) return true; // sin configurar, no bloquea (evita romper deploys/previews nuevos)
  const origin = req.headers.origin || req.headers.referer || '';
  return origin.startsWith(allowed);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'forbidden_origin' });
    return;
  }

  const { query, matchedIntent, latencyMs } = req.body || {};
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: 'invalid_query' });
    return;
  }

  const apiUrl = process.env.LLM_OBSERVATORY_API_URL;
  const token  = process.env.LLM_OBSERVATORY_API_TOKEN;

  if (apiUrl && token) {
    const trimmedQuery = query.trim();
    const intent = typeof matchedIntent === 'string' && matchedIntent.trim()
      ? matchedIntent.trim().slice(0, MAX_INTENT_LENGTH)
      : 'unknown';

    const payload = {
      provider: 'openai',            // nominal — el enum lo exige, no hubo llamada real
      model: 'jotai-local-match',    // deliberadamente no-facturable y visible como tal
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      latency_ms: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0,
      status_code: 200,
      prompt_preview: trimmedQuery.slice(0, 200),
      prompt_full: trimmedQuery,
      response_full: intent,
      tags: { source: 'portfolio-jotai', resolved: 'local', intent },
    };

    const post = fetch(`${apiUrl}/api/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => {});

    waitUntil(post);
  }

  // 202: aceptado para procesamiento async — el cliente no espera el reporte.
  res.status(202).json({ ok: true });
}
