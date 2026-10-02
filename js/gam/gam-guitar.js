/**
 * gam-guitar.js — Motor de la guitarra (modo .gam)
 *
 * Solo lógica + audio (Web Audio); no dibuja nada. Las cuerdas son 3D dentro
 * de la escena (ver la estación `guitar` en gam-stations.js) — este módulo
 * avisa con `onStrum` qué cuerdas sonaron para que vibren (y, en la Fase 4,
 * para que JotAI rasguee).
 *
 * Sonido: cuerda pulsada por Karplus–Strong (ruido que se filtra a sí mismo
 * en un bucle del largo del período). Cada nota se calcula una vez a un
 * AudioBuffer y queda cacheada.
 *
 * SONGS: "Tres notas" de AU-D (la de David, acordes del intro/estrofa) + ritmos
 * propios y "Oda a la alegría" (dominio público).
 */
import { getAudioContext } from './gam-audio.js';

const OPEN = [40, 45, 50, 55, 59, 64];          // MIDI de las cuerdas al aire (Mi La Re Sol Si Mi)
const CHORDS = {                                 // una nota por cuerda, null = no suena
  C:  [null, 48, 52, 55, 60, 64],
  G:  [43, 47, 50, 55, 59, 67],
  Am: [null, 45, 52, 57, 60, 64],
  F:  [41, 48, 53, 57, 60, 65],
  Em: [40, 47, 52, 55, 59, 64],
  B:  [null, 47, 54, 59, 63, 66],   // x24442
  'F#': [42, 49, 54, 58, 61, 66],   // 244322
  E:  [40, 47, 52, 56, 59, 64],     // 022100
  Esus4: [40, 47, 52, 57, 59, 64],  // 022200 — la "E con variación" de Tres notas
};
const NOTE_SEC = 1.6;                            // largo de cada buffer
const STRUM_GAP = 0.016;                         // s entre cuerda y cuerda al rasguear

/* Eventos: [tiempo en pulsos, 'chord' | 'note', valor, 'down' | 'up'] */
function strumPattern(chords) {
  const hits = [[0, 'down'], [1, 'down'], [1.5, 'up'], [2.5, 'up'], [3, 'down'], [3.5, 'up']];
  return chords.flatMap((ch, bar) => hits.map(([b, dir]) => [bar * 4 + b, 'chord', ch, dir]));
}
function arpeggio(chords) {
  const order = [1, 3, 4, 5, 4, 3, 2, 3];
  return chords.flatMap((ch, bar) => order.map((s, i) => {
    const v = CHORDS[ch];
    return [bar * 4 + i * 0.5, 'note', v[s] ?? v[s + 1]];
  }));
}
const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];

export const SONGS = [
  // "Tres notas" de AU-D (la que toca David): B – F# – E – E(variación), rasgueada
  { id: 'tresnotas', label: { es: 'Tres notas · AU-D', en: 'Tres notas · AU-D' }, bpm: 92,
    events: strumPattern(['B', 'F#', 'E', 'Esus4', 'B', 'F#', 'E', 'Esus4', 'B', 'F#', 'E', 'E']) },
  { id: 'strum', label: { es: 'Rasgueo', en: 'Strum' }, bpm: 100, events: strumPattern(['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C']) },
  { id: 'arpeggio', label: { es: 'Arpegio', en: 'Arpeggio' }, bpm: 84, events: arpeggio(['Am', 'C', 'G', 'Em', 'Am', 'F', 'G', 'Am']) },
  { id: 'ode', label: { es: 'Oda a la alegría', en: 'Ode to Joy' }, bpm: 120,
    events: ODE.map((m, i) => [i + (i === 14 ? 0.5 : 0), 'note', m]) },
];

const cache = new Map();
function pluckBuffer(ctx, midi) {
  if (cache.has(midi)) return cache.get(midi);
  const sr = ctx.sampleRate;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const period = Math.max(2, Math.round(sr / freq));
  const len = Math.floor(sr * NOTE_SEC);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
  const decay = 0.996;
  for (let i = period; i < len; i++) d[i] = decay * 0.5 * (d[i - period] + d[i - period + 1]);
  // fade-out final para que no haga click al cortarse
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  cache.set(midi, buf);
  return buf;
}

function pluck(ctx, midi, when, gain) {
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(ctx, midi);
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start(when);
}

/** Cuerda donde cae una nota suelta: la más aguda que la alcanza. */
function stringFor(midi) {
  for (let s = OPEN.length - 1; s >= 0; s--) if (midi >= OPEN[s]) return s;
  return 0;
}

/**
 * callbacks: onStrum({ strings, dir }) — sonaron esas cuerdas (0 = la grave)
 *            onEnd(songId) — terminó la canción (no se llama con stop())
 */
export function createGuitar({ onStrum, onEnd } = {}) {
  const timers = [];
  let playing = null;
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function ctxOrNull() {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') ctx.resume();
    return ctx;
  }

  function strum(chord = 'Em', dir = 'down') {
    const v = CHORDS[chord];
    const strings = v.map((m, i) => (m == null ? -1 : i)).filter((i) => i >= 0);
    const ordered = dir === 'up' ? [...strings].reverse() : strings;
    const ctx = ctxOrNull();
    if (ctx) ordered.forEach((s, k) => pluck(ctx, v[s], ctx.currentTime + k * STRUM_GAP, dir === 'up' ? 0.12 : 0.18));
    onStrum?.({ strings, dir });
  }

  function note(midi) {
    const ctx = ctxOrNull();
    if (ctx) pluck(ctx, midi, ctx.currentTime, 0.32);
    onStrum?.({ strings: [stringFor(midi)], dir: 'pick' });
  }

  function play(id) {
    stop();
    const song = SONGS.find((s) => s.id === id) || SONGS[0];
    playing = song.id;
    const beat = 60000 / song.bpm;
    let last = 0;
    song.events.forEach(([b, kind, v, dir]) => {
      last = Math.max(last, b);
      timers.push(setTimeout(() => (kind === 'chord' ? strum(v, dir) : note(v)), b * beat));
    });
    timers.push(setTimeout(() => { playing = null; onEnd?.(song.id); }, (last + 1.5) * beat));
  }

  function stop() {
    clearTimers();
    playing = null;
  }

  return {
    play, stop, strum,
    destroy: stop,
    get playing() { return playing; },
  };
}
