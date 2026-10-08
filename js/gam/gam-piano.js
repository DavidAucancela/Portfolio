/**
 * gam-piano.js — Motor del piano (modo .gam)
 *
 * Solo lógica + audio (Web Audio); no dibuja nada. Las teclas son 3D dentro
 * de la escena (ver la estación `piano` en gam-stations.js) y el HUD pone las
 * pestañas Libre/Reto — este módulo avisa qué pasa con callbacks.
 *
 * Tres modos:
 *  - Libre: tocar las notas con el mouse/touch o el teclado (una octava por
 *    fila: Z X C V B N M · A S D F G H J · Q W E R T Y U · I)
 *  - Reto: el piano toca una secuencia creciente (estilo Simon) que hay que
 *    repetir. Récord en localStorage.
 *  - Aprender: una canción de LEARN_SONGS en partitura (la dibuja la
 *    estación); hay que tocar la nota marcada para avanzar. Errores →
 *    estrellas, la mejor por canción en localStorage. "Escuchar" la toca sola.
 *
 * Usa el AudioContext compartido de gam-audio.js — un solo contexto real
 * para todo .gam.
 */
import { getAudioContext, envelope } from './gam-audio.js';
import { LangSwitcher } from '../lang.js';

const T = (es, en) => LangSwitcher.L({ es, en });

const NOTES = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88,
  523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77,
  1046.5, 1174.66, 1318.51, 1396.91, 1567.98, 1760.0, 1975.53,
  2093.0,
]; // C4..C7 (teclas blancas, 3 octavas)
const CHALLENGE_NOTES = 8; // el Reto usa solo la primera octava
/* Una octava por fila del teclado, de grave a agudo (Do siempre en la primera
   letra de la fila): abajo Do4–Si4, al medio Do5–Si5, arriba Do6–Si6, y el
   último Do (Do7) en la I. */
export const KEY_BINDINGS = [
  'Z', 'X', 'C', 'V', 'B', 'N', 'M',
  'A', 'S', 'D', 'F', 'G', 'H', 'J',
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U',
  'I',
];
export const NOTE_LABELS = [...Array(3)].flatMap(() => ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']).concat('Do');
const BEST_KEY = 'gam-piano-best';
const LEARN_KEY = 'gam-piano-learn';

/* Canciones para Aprender — solo teclas blancas (el piano no tiene
   sostenidos tocables): "NotaOctava:duración" en negras (1 = negra,
   2 = blanca, 4 = redonda, 0.5 = corchea, 1.5 = negra con puntillo).
   `meter` = tiempos por compás (4 por defecto), `pickup` = anacrusa. */
const SONG_DATA = [
  { id: 'estrellita', title: { es: 'Estrellita', en: 'Twinkle Twinkle' }, bpm: 96,
    notes: 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2' },
  { id: 'mary', title: { es: 'Mary tenía un corderito', en: 'Mary Had a Little Lamb' }, bpm: 104,
    notes: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4' },
  { id: 'alegria', title: { es: 'Himno a la alegría', en: 'Ode to Joy' }, bpm: 100,
    notes: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2' },
  { id: 'jingle', title: { es: 'Jingle Bells', en: 'Jingle Bells' }, bpm: 116,
    notes: 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4 D4 E4:4 F4 F4 F4 F4 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2' },
  { id: 'cumple', title: { es: 'Cumpleaños feliz', en: 'Happy Birthday' }, bpm: 92, meter: 3, pickup: 1,
    notes: 'G4:0.5 G4:0.5 A4 G4 C5 B4:2 G4:0.5 G4:0.5 A4 G4 D5 C5:2 G4:0.5 G4:0.5 G5 E5 C5 B4 A4:2 F5:0.5 F5:0.5 E5 C5 D5 C5:2' },
];
const STEP = 'CDEFGAB';
/** "G4:0.5" → { i: índice de tecla (0 = C4), dur } */
function _parse(tok) {
  const [n, d] = tok.split(':');
  return { i: (Number(n[1]) - 4) * 7 + STEP.indexOf(n[0]), dur: d ? Number(d) : 1 };
}
export const LEARN_SONGS = SONG_DATA.map((s) => ({ ...s, notes: s.notes.split(/\s+/).map(_parse) }));

function _learnBest() {
  try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); } catch { return {}; }
}
/** Mejor puntaje (0–3 estrellas) guardado de cada canción. */
export function learnStars(id) { return _learnBest()[id] || 0; }

export function playNote(i) { _playNote(i); }

function _playNote(i) {
  const ctx = getAudioContext();
  if (!ctx) return; // Web Audio no disponible (muy raro) — sigue usable visualmente
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = NOTES[i];

  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.45);
}

function _bestScore() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

/**
 * callbacks: onFlash(i) — se tocó la nota i (teclado, mouse o secuencia)
 *            onStatus(text) — mensaje para el HUD
 *            onEnd(score, best) — se rompió la racha en modo Reto
 *            onHot() — 5 aciertos seguidos
 *            onPhase(phase, score?) — momento del Reto: 'demo' (el piano toca la
 *              secuencia), 'turn' (te toca), 'round' (la acertaste), 'end'
 *              (se rompió; con el puntaje) o 'free' (modo Libre). Lo usa JotAI.
 *            onLearn(state) — Aprender: { song, step, mistakes, listening,
 *              miss?: índice tocado por error, done?: estrellas al terminar }
 */
export function createPiano({ onFlash, onStatus, onEnd, onHot, onPhase, onLearn }) {
  let mode = 'free';
  let sequence = [];
  let playerStep = 0;
  let accepting = false; // true mientras el jugador puede responder
  let streak = 0;        // aciertos consecutivos en la ronda actual (Reto)
  let song = null;       // Aprender: canción elegida (de LEARN_SONGS)
  let step = 0;          // nota que toca ahora
  let mistakes = 0;
  let listening = false; // "Escuchar": el piano toca la canción solo
  const timers = [];

  const setTimer = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  const learnState = (extra) => ({ song, step, mistakes, listening, ...extra });

  function press(i) {
    _playNote(i);
    onFlash?.(i);

    if (mode === 'learn' && song && !listening && step < song.notes.length) {
      if (song.notes[step].i === i) {
        step++;
        if (step === song.notes.length) _finishSong();
        else onLearn?.(learnState());
      } else {
        mistakes++;
        onLearn?.(learnState({ miss: i }));
      }
      return;
    }

    if (mode === 'challenge' && accepting) {
      if (sequence[playerStep] === i) {
        playerStep++;
        streak++;
        if (streak > 0 && streak % 5 === 0) onHot?.();
        if (playerStep === sequence.length) {
          accepting = false;
          envelope(getAudioContext(), { freq: 660, type: 'sine', duration: 0.15, gain: 0.1 });
          onStatus?.(T(`¡Bien! Secuencia de ${sequence.length}. Preparando la siguiente…`, `Nice! Sequence of ${sequence.length}. Getting the next one ready…`));
          onPhase?.('round');
          setTimer(_nextRound, 700);
        }
      } else {
        streak = 0;
        _endChallenge();
      }
    }
  }

  function setMode(m) {
    mode = m;
    clearTimers();
    accepting = false;
    listening = false;
    sequence = [];
    if (m !== 'challenge') onPhase?.('free');
    if (m === 'learn') { learn(song?.id || LEARN_SONGS[0].id); return; }
    onStatus?.(m === 'challenge'
      ? T(`Récord: <strong>${_bestScore()}</strong> — pulsa Empezar, escucha la secuencia y repítela.`, `Best: <strong>${_bestScore()}</strong> — press Start, listen to the sequence and repeat it.`)
      : '');
  }

  /* ── Aprender ── */
  function learn(id) {
    clearTimers();
    song = LEARN_SONGS.find((s) => s.id === id) || LEARN_SONGS[0];
    step = 0;
    mistakes = 0;
    listening = false;
    onLearn?.(learnState());
  }

  /** Canción siguiente (dir = 1) o anterior (dir = -1). */
  function nextSong(dir) {
    const k = LEARN_SONGS.findIndex((s) => s.id === song?.id);
    learn(LEARN_SONGS[(k + dir + LEARN_SONGS.length) % LEARN_SONGS.length].id);
  }

  /** El piano la toca sola marcando cada nota; al terminar vuelve al inicio. */
  function listen() {
    if (!song) return;
    clearTimers();
    listening = true;
    step = 0;
    mistakes = 0;
    onLearn?.(learnState());
    const beat = 60000 / song.bpm;
    let t = 300;
    song.notes.forEach((n, k) => {
      setTimer(() => { step = k; _playNote(n.i); onFlash?.(n.i); onLearn?.(learnState()); }, t);
      t += n.dur * beat;
    });
    setTimer(() => { listening = false; step = 0; onLearn?.(learnState()); }, t + 200);
  }

  function _finishSong() {
    const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
    const best = _learnBest();
    if (stars > (best[song.id] || 0)) {
      best[song.id] = stars;
      try { localStorage.setItem(LEARN_KEY, JSON.stringify(best)); } catch { /* sin storage: no se guarda */ }
    }
    envelope(getAudioContext(), { freq: 784, type: 'sine', duration: 0.25, gain: 0.08 });
    window.dispatchEvent(new CustomEvent('gam:score', { detail: { game: 'piano_learn', score: stars } }));
    onLearn?.(learnState({ done: stars }));
  }

  function _playSequence() {
    onStatus?.(T(`Secuencia de ${sequence.length} — mira bien…`, `Sequence of ${sequence.length} — watch closely…`));
    onPhase?.('demo');
    sequence.forEach((note, i) => {
      setTimer(() => { _playNote(note); onFlash?.(note); }, i * 550);
    });
    setTimer(() => {
      playerStep = 0;
      accepting = true;
      onStatus?.(T('Tu turno.', 'Your turn.'));
      onPhase?.('turn');
    }, sequence.length * 550 + 250);
  }

  function _nextRound() {
    sequence.push(Math.floor(Math.random() * CHALLENGE_NOTES));
    _playSequence();
  }

  function _endChallenge() {
    accepting = false;
    const score = sequence.length - 1;
    const best = Math.max(_bestScore(), score);
    localStorage.setItem(BEST_KEY, String(best));
    window.dispatchEvent(new CustomEvent('gam:score', { detail: { game: 'piano', score } }));
    onStatus?.(score > 0
      ? T(`Se rompió en ${score} 🎹 — récord <strong>${best}</strong>`, `Broke at ${score} 🎹 — best <strong>${best}</strong>`)
      : T(`Se rompió en la primera — récord <strong>${best}</strong>`, `Broke on the first one — best <strong>${best}</strong>`));
    sequence = [];
    onPhase?.('end', score);
    onEnd?.(score, best);
  }

  function start() {
    clearTimers();
    sequence = [];
    streak = 0;
    _nextRound();
  }

  function destroy() { clearTimers(); }

  return { press, setMode, start, destroy, learn, nextSong, listen };
}
