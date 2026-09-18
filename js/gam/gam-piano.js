/**
 * gam-piano.js — Minijuego del piano (modo .gam)
 *
 * Autocontenido: gam-loader.js solo llama mount(container) y guarda el
 * cleanup que devuelve para llamarlo al cerrar el panel. No depende de
 * Phaser ni del resto de la escena — es DOM + Web Audio puro, montado
 * dentro de #gam-modal-list como cualquier otro contenido del panel.
 *
 * Dos modos:
 *  - Libre: tocar las 8 notas con el mouse/touch o el teclado (A S D F G H J K)
 *  - Desafío: JotAI... digo, el piano toca una secuencia creciente
 *    (estilo Simon) que hay que repetir. Récord en localStorage.
 *
 * Usa el AudioContext compartido de gam-audio.js (antes tenía uno propio,
 * paralelo al de gam-ambience.js) — un solo contexto real para todo .gam.
 */
import { getAudioContext } from './gam-audio.js';

const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C4..C5
const KEY_BINDINGS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];
const NOTE_LABELS  = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];
const BEST_KEY = 'gam-piano-best';

function _playNote(i) {
  const ctx = getAudioContext();
  if (!ctx) return; // Web Audio no disponible (muy raro) — el juego sigue siendo usable visualmente
  if (ctx.state === 'suspended') ctx.resume();

  const osc  = ctx.createOscillator();
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

function mount(container) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'gam-piano';
  root.innerHTML = `
    <div class="gam-piano__tabs" role="tablist">
      <button type="button" class="gam-piano__tab is-active" data-mode="free">Modo libre</button>
      <button type="button" class="gam-piano__tab" data-mode="challenge">Modo desafío</button>
    </div>
    <div class="gam-piano__status" id="gam-piano-status">Tocá las teclas — mouse, touch o A S D F G H J K</div>
    <div class="gam-piano__keys" id="gam-piano-keys">
      ${NOTES.map((_, i) => `
        <button type="button" class="gam-piano__key" data-i="${i}" aria-label="Nota ${NOTE_LABELS[i]}">
          <span class="gam-piano__key-note">${NOTE_LABELS[i]}</span>
          <span class="gam-piano__key-bind">${KEY_BINDINGS[i]}</span>
        </button>
      `).join('')}
    </div>
    <div class="gam-piano__challenge" id="gam-piano-challenge" hidden>
      <p>Récord: <strong id="gam-piano-best">${_bestScore()}</strong></p>
      <button type="button" class="gam-piano__start" id="gam-piano-start">▶ Empezar secuencia</button>
    </div>
  `;
  container.appendChild(root);

  const keysEl     = root.querySelector('#gam-piano-keys');
  const statusEl   = root.querySelector('#gam-piano-status');
  const challengeEl = root.querySelector('#gam-piano-challenge');
  const startBtn   = root.querySelector('#gam-piano-start');
  const bestEl     = root.querySelector('#gam-piano-best');
  const keyEls     = [...root.querySelectorAll('.gam-piano__key')];

  let mode = 'free';
  let sequence = [];
  let playerStep = 0;
  let accepting = false; // true mientras el jugador puede responder
  const timers = [];

  const setTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function flashKey(i, cls = 'is-active') {
    const el = keyEls[i];
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), reducedMotion ? 0 : 220);
  }

  function press(i) {
    _playNote(i);
    flashKey(i);

    if (mode === 'challenge' && accepting) {
      if (sequence[playerStep] === i) {
        playerStep++;
        if (playerStep === sequence.length) {
          accepting = false;
          statusEl.textContent = `¡Bien! Secuencia de ${sequence.length}. Preparando la siguiente…`;
          setTimer(() => _nextRound(), 700);
        }
      } else {
        _endChallenge();
      }
    }
  }

  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.gam-piano__key');
    if (!btn) return;
    press(Number(btn.dataset.i));
  });

  const keydownHandler = (e) => {
    const idx = KEY_BINDINGS.indexOf(e.key.toUpperCase());
    if (idx === -1) return;
    press(idx);
  };
  window.addEventListener('keydown', keydownHandler);

  root.querySelectorAll('.gam-piano__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.gam-piano__tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      mode = tab.dataset.mode;
      clearTimers();
      accepting = false;
      if (mode === 'challenge') {
        challengeEl.hidden = false;
        statusEl.textContent = 'Escuchá la secuencia y repetila.';
      } else {
        challengeEl.hidden = true;
        statusEl.textContent = 'Tocá las teclas — mouse, touch o A S D F G H J K';
      }
    });
  });

  function _playSequence() {
    statusEl.textContent = `Secuencia de ${sequence.length} — mirá bien…`;
    sequence.forEach((note, i) => {
      setTimer(() => { _playNote(note); flashKey(note); }, i * 550);
    });
    setTimer(() => {
      playerStep = 0;
      accepting = true;
      statusEl.textContent = 'Tu turno.';
    }, sequence.length * 550 + 250);
  }

  function _nextRound() {
    sequence.push(Math.floor(Math.random() * NOTES.length));
    _playSequence();
  }

  function _endChallenge() {
    accepting = false;
    const score = sequence.length - 1;
    const best = Math.max(_bestScore(), score);
    localStorage.setItem(BEST_KEY, String(best));
    bestEl.textContent = String(best);
    window.dispatchEvent(new CustomEvent('gam:score', { detail: { game: 'piano', score } }));
    statusEl.textContent = score > 0
      ? `Se rompió en ${score} 🎹 — ¿otra vuelta?`
      : 'Se rompió en la primera — ¿otra vuelta?';
    sequence = [];
    startBtn.hidden = false;
  }

  startBtn.addEventListener('click', () => {
    clearTimers();
    sequence = [];
    startBtn.hidden = true;
    _nextRound();
  });

  return function unmount() {
    clearTimers();
    window.removeEventListener('keydown', keydownHandler);
    root.remove();
  };
}

export const GamPiano = { mount };
