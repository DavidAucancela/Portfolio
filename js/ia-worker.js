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

env.allowLocalModels = false;

/* ── ESTADO ──────────────────────────────────────────────── */

let _extractor = null;
let _docs      = [];
let _vecs      = [];

/* ── HELPERS ─────────────────────────────────────────────── */

function _dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function _embed(text) {
  const out = await _extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

/* ── INDEXEDDB CACHE ─────────────────────────────────────── */
// Clave: hash FNV-1a de los textos de la KB.
// Al segunda visita los embeddings ya están — sin recomputar.

const IDB_NAME  = 'jotai-emb-cache';
const IDB_STORE = 'vecs';

function _hash(docs) {
  const s = docs.map(d => d.id + '|' + d.text.slice(0, 120)).join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function _idbOpen() {
  return new Promise((res, rej) => {
    const req = self.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function _idbGet(key) {
  try {
    const db = await _idbOpen();
    return new Promise(res => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = e => res(e.target.result ?? null);
      req.onerror   = () => res(null);
    });
  } catch { return null; }
}

async function _idbSet(key, value) {
  try {
    const db = await _idbOpen();
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
  } catch { /* quota exceeded — ignorar */ }
}

/* ── INIT: carga modelo + KB (con cache IDB) ─────────────── */

async function _init(docs) {
  _docs = docs;
  const cacheKey = _hash(docs);

  // ── Intentar leer vectores cacheados ──
  const cached = await _idbGet(cacheKey);
  if (cached) {
    _vecs = cached;
    // Modelo sí necesita cargarse igual (para queries), pero la KB ya está lista
    self.postMessage({ type: 'progress', stage: 'model', pct: 0 });
    const fileProgress = {};
    _extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        progress_callback: info => {
          if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
            fileProgress[info.file] = info.progress;
            const avg = Object.values(fileProgress).reduce((s, v) => s + v, 0) / Object.values(fileProgress).length;
            self.postMessage({ type: 'progress', stage: 'model', pct: Math.round(avg) });
          }
        },
      }
    );
    self.postMessage({ type: 'ready', fromCache: true });
    return;
  }

  // ── Sin cache: cargar modelo + computar embeddings ──
  const fileProgress = {};
  _extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    {
      progress_callback: info => {
        if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
          fileProgress[info.file] = info.progress;
          const avg = Object.values(fileProgress).reduce((s, v) => s + v, 0) / Object.values(fileProgress).length;
          self.postMessage({ type: 'progress', stage: 'model', pct: Math.round(avg), file: info.file });
        }
      },
    }
  );

  _vecs = [];
  for (let i = 0; i < _docs.length; i++) {
    _vecs.push(await _embed(_docs[i].text));
    if (i % 5 === 0 || i === _docs.length - 1) {
      self.postMessage({
        type: 'progress', stage: 'indexing',
        pct: Math.round(((i + 1) / _docs.length) * 100),
        current: i + 1, total: _docs.length,
      });
    }
  }

  // Guardar en IDB para próximas visitas
  await _idbSet(cacheKey, _vecs);
  self.postMessage({ type: 'ready', fromCache: false });
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
