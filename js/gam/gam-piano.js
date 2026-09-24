/**
 * gam-piano.js — Motor del piano (modo .gam)
 *
 * Solo lógica + audio (Web Audio); no dibuja nada. Las teclas son 3D dentro
 * de la escena (ver la estación `piano` en gam-stations.js) y el HUD pone las
 * pestañas Libre/Reto — este módulo avisa qué pasa con callbacks.
 *
 * Dos modos:
 *  - Libre: tocar las 8 notas con el mouse/touch o el teclado (A S D F G H J K)
 *  - Reto: el piano toca una secuencia creciente (estilo Simon) que hay que
 *    repetir. Récord en localStorage.
 *
 * Usa el AudioContext compartido de gam-audio.js — un solo contexto real
 * para todo .gam.
 */
import { getAudioContext, envelope } from './gam-audio.js';

const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5]; // C4..C6 (teclas blancas)
const CHALLENGE_NOTES = 8; // el Reto usa solo la primera octava
export const KEY_BINDINGS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Z', 'X', 'C', 'V', 'B'];
export const NOTE_LABELS = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
const BEST_KEY = 'gam-piano-best';
const FREE_HINT = 'Toca las teclas — mouse, touch o A S D F G H J K L ; Z X C V B';

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
 */
export function createPiano({ onFlash, onStatus, onEnd, onHot }) {
  let mode = 'free';
  let sequence = [];
  let playerStep = 0;
  let accepting = false; // true mientras el jugador puede responder
  let streak = 0;        // aciertos consecutivos en la ronda actual (Reto)
  const timers = [];

  const setTimer = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function press(i) {
    _playNote(i);
    onFlash?.(i);

    if (mode === 'challenge' && accepting) {
      if (sequence[playerStep] === i) {
        playerStep++;
        streak++;
        if (streak > 0 && streak % 5 === 0) onHot?.();
        if (playerStep === sequence.length) {
          accepting = false;
          envelope(getAudioContext(), { freq: 660, type: 'sine', duration: 0.15, gain: 0.1 });
          onStatus?.(`¡Bien! Secuencia de ${sequence.length}. Preparando la siguiente…`);
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
    sequence = [];
    onStatus?.(m === 'challenge'
      ? `Récord: <strong>${_bestScore()}</strong> — pulsa Empezar, escucha la secuencia y repítela.`
      : FREE_HINT);
  }

  function _playSequence() {
    onStatus?.(`Secuencia de ${sequence.length} — mira bien…`);
    sequence.forEach((note, i) => {
      setTimer(() => { _playNote(note); onFlash?.(note); }, i * 550);
    });
    setTimer(() => {
      playerStep = 0;
      accepting = true;
      onStatus?.('Tu turno.');
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
      ? `Se rompió en ${score} 🎹 — récord <strong>${best}</strong>`
      : `Se rompió en la primera — récord <strong>${best}</strong>`);
    sequence = [];
    onEnd?.(score, best);
  }

  function start() {
    clearTimers();
    sequence = [];
    streak = 0;
    _nextRound();
  }

  function destroy() { clearTimers(); }

  return { press, setMode, start, destroy };
}
