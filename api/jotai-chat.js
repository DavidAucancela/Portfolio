// Vercel serverless function (Node runtime, ESM).
// Genera la respuesta de fallback de JotAI vía Gemini, server-side, para no
// exponer GEMINI_API_KEY al cliente. Único caller: js/ia-mascot.js (_askGeminiFallback).

const MODEL = 'gemini-2.5-flash'; // verificar disponibilidad del modelo en la cuenta al desplegar
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_api_key' });
    return;
  }

  const prompt = `${SYSTEM_INSTRUCTION}\n\nCONTEXTO:\n${buildContextBlock(context)}\n\nPREGUNTA DEL USUARIO:\n${query.trim()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 220, temperature: 0.5 },
      }),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'gemini_error' });
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      res.status(502).json({ error: 'empty_response' });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    res.status(502).json({ error: err.name === 'AbortError' ? 'timeout' : 'request_failed' });
  } finally {
    clearTimeout(timeout);
  }
}
