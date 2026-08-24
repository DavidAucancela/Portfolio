// Vercel serverless function (Node runtime, ESM).
// Genera la respuesta de fallback de JotAI vía OpenAI, server-side, para no
// exponer OPENAI_API_KEY al cliente. Único caller: js/ia-mascot.js (_askGeminiFallback).
//
// La llamada pasa por MonitoredOpenAI (@llm-observatory/sdk ^1.1.0 — desde
// esa versión el SDK manda prompt_full/response_full completos, no solo el
// prompt_preview de 200 chars de la v1.0.0 original) y reporta tokens/costo/
// latencia/prompt completo al mismo LLM Observatory que usa api/llm-stats.js
// (LLM_OBSERVATORY_API_URL / _API_TOKEN), sin exponer nada nuevo al cliente.
// tags.resolved distingue esta rama (ai_fallback) de los matches locales
// (ver api/jotai-log.js, tags.resolved: 'local'). Si el reporte falla, la
// respuesta de OpenAI no se ve afectada (ver waitUntil abajo).

import llmObservatory from '@llm-observatory/sdk';
import { waitUntil } from '@vercel/functions';

const { MonitoredOpenAI } = llmObservatory;

const MODEL = 'gpt-5.4-mini';
const MAX_QUERY_LENGTH = 300;
const REQUEST_TIMEOUT_MS = 8000;

const SYSTEM_INSTRUCTION = `Sos JotAI, el asistente conversacional del portfolio de Jonathan Aucancela.
Respondé SIEMPRE en español, en 2 a 4 frases, con un tono cercano y directo.
Usá EXCLUSIVAMENTE la información del CONTEXTO de abajo — nunca inventes datos que no estén ahí (nombres, tecnologías, enlaces, contacto, cifras, etc.).
Si la pregunta del usuario no tiene relación con el CONTEXTO ni con el portfolio de Jonathan, decilo con amabilidad e invitalo a preguntar sobre sus proyectos, skills o trayectoria en su lugar — no respondas la pregunta ajena al tema.`;

function buildContextBlock(context) {
  const candidates = context?.candidates?.length
    ? context.candidates
    : [...(context?.featuredProjects || []), ...(context?.sampleSkills || [])];

  if (!candidates.length) return 'Sin contexto adicional disponible.';

  const lines = candidates
    .slice(0, 5)
    .map((c) => {
      const d = c?.data || {};
      if (d.title) {
        const tags = Array.isArray(d.tags) ? d.tags.slice(0, 6).join(', ') : '';
        return `- Proyecto "${d.title}": ${d.description || ''}${tags ? ` (tecnologías: ${tags})` : ''}`;
      }
      if (d.name) {
        return `- Skill "${d.name}" (categoría: ${d.category || '?'}, nivel: ${d.nivel || '?'})`;
      }
      return null;
    })
    .filter(Boolean);

  return lines.length ? lines.join('\n') : 'Sin contexto adicional disponible.';
}

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

  const { query, context } = req.body || {};
  if (typeof query !== 'string' || !query.trim() || query.length > MAX_QUERY_LENGTH) {
    res.status(400).json({ error: 'invalid_query' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_api_key' });
    return;
  }

  const prompt = `CONTEXTO:\n${buildContextBlock(context)}\n\nPREGUNTA DEL USUARIO:\n${query.trim()}`;

  const client = new MonitoredOpenAI({
    apiKey,
    observatoryUrl: process.env.LLM_OBSERVATORY_API_URL,
    observatoryToken: process.env.LLM_OBSERVATORY_API_TOKEN,
    tags: { source: 'portfolio-jotai', resolved: 'ai_fallback' },
  });

  const genPromise = client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: 220,
    temperature: 0.5,
  });

  // El POST a LLM Observatory va fire-and-forget dentro del SDK (pensado para
  // servers long-running); en una función serverless el runtime puede
  // congelarla apenas se manda la respuesta. waitUntil + un margen corto le
  // da chance de completar sin bloquear ni condicionar la respuesta al cliente
  // — si igual no llega a tiempo, la request a OpenAI no se ve afectada.
  waitUntil(genPromise.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 400))));

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([genPromise, timeoutPromise]);
    const text = response?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      res.status(502).json({ error: 'empty_response' });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    res.status(502).json({ error: err.message === 'timeout' ? 'timeout' : 'request_failed' });
  }
}
