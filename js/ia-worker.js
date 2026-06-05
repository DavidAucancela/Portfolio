/**
 * ia-worker.js — Web Worker para embeddings semánticos
 * Usa @huggingface/transformers con Xenova/all-MiniLM-L6-v2 (384 dims).
 * Toda la inferencia corre fuera del hilo principal.
 *
 * Protocolo de mensajes:
 *   Main → Worker:  { type: 'init', docs: KBDoc[] }
 *                   { type: 'query', text: string, id: number }
 *   Worker → Main:  { type: 'progress', stage: string, pct: number }
 *                   { type: 'ready' }
 *                   { type: 'result', id: number, results: ScoredDoc[] }
 *                   { type: 'error', message: string }
 */

import { pipeline, env } from '@huggingface/transformers';

// Siempre descargar desde HuggingFace Hub (no usar modelos locales)
env.allowLocalModels = false;

/* ── ESTADO ──────────────────────────────────────────────── */

let _extractor = null;
let _docs      = [];   // KBDoc[] — solo project y skill
let _vecs      = [];   // number[][] — un vector normalizado por doc

/* ── HELPERS ─────────────────────────────────────────────── */

// Dot product = cosine similarity cuando vectores están normalizados
function _dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function _embed(text) {
  const out = await _extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

/* ── INIT: carga modelo + precomputa KB ─────────────────── */

async function _init(docs) {
  _docs = docs;

  // Carga del modelo con progreso por archivo
  const fileProgress = {};
  _extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    {
      progress_callback: info => {
        if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
          fileProgress[info.file] = info.progress;
          const vals  = Object.values(fileProgress);
          const total = vals.reduce((s, v) => s + v, 0) / vals.length;
          self.postMessage({
            type: 'progress',
            stage: 'model',
            pct: Math.round(total),
            file: info.file,
          });
        }
        if (info.status === 'ready') {
          self.postMessage({ type: 'progress', stage: 'model', pct: 100 });
        }
      },
    }
  );

  // Precomputa embeddings de todos los documentos de la KB
  _vecs = [];
  for (let i = 0; i < _docs.length; i++) {
    _vecs.push(await _embed(_docs[i].text));
    // Reporte de progreso cada 5 docs o al final
    if (i % 5 === 0 || i === _docs.length - 1) {
      self.postMessage({
        type: 'progress',
        stage: 'indexing',
        pct: Math.round(((i + 1) / _docs.length) * 100),
        current: i + 1,
        total: _docs.length,
      });
    }
  }

  self.postMessage({ type: 'ready' });
}

/* ── QUERY: embed → rank por similitud coseno ───────────── */

async function _query(text, id) {
  const queryVec = await _embed(text);

  const scored = _docs.map((doc, i) => ({
    doc,
    score: _dot(queryVec, _vecs[i]),
  }));

  scored.sort((a, b) => b.score - a.score);

  self.postMessage({
    type: 'result',
    id,
    // Devuelve top-5; el hilo principal aplica el umbral
    results: scored.slice(0, 5).map(s => ({
      id:    s.doc.id,
      type:  s.doc.type,
      data:  s.doc.data,
      score: s.score,
    })),
  });
}

/* ── RECEPTOR ─────────────────────────────────────────────── */

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init')  await _init(data.docs);
    if (data.type === 'query') await _query(data.text, data.id);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
