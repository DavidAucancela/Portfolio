/**
 * gam-juggling.js — Motor del reto de malabares (modo .gam)
 *
 * Solo lógica; no dibuja nada (la pelota y la zona de atrape son 3D dentro de
 * la escena — ver la estación `juggling` en gam-stations.js).
 *
 * Reflejos simples: una pelota sube y baja; hay que atraparla (click/tap/
 * Espacio) justo cuando pasa por la "zona de atrape" de abajo. Cada atrape
 * acelera un poco la pelota. Un fallo termina la ronda. Récord en
 * localStorage.
 */
import { getAudioContext, envelope } from './gam-audio.js';

const BEST_KEY = 'gam-juggling-best';
const ZONE_TOP_PCT = 78;   // % del recorrido donde empieza la zona de atrape
const ZONE_BOTTOM_PCT = 94;
const BASE_PERIOD_MS = 1400; // tiempo de una oscilación completa arriba-abajo
const MIN_PERIOD_MS = 550;
const SPEEDUP_MS = 60;     // cuánto se acelera por atrape

/** Centro de la zona de atrape como fracción 0..1 del recorrido (0 = arriba). */
export const ZONE_CENTER = (ZONE_TOP_PCT + ZONE_BOTTOM_PCT) / 200;

function _bestScore() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

/**
 * callbacks: onStatus(html) — mensaje para el HUD
 *            onCatch(score, milestone) — atrape válido (milestone cada 5)
 *            onFail(score, best) — se cayó la pelota
 */
export function createJuggling({ reducedMotion = false, onStatus, onCatch, onFail } = {}) {
  let running = false;
  let period = BASE_PERIOD_MS;
  let startT = 0;
  let score = 0;

  /** 0 = arriba, 1 = abajo (ida y vuelta cada `period`). */
  function ballPct(now) {
    if (reducedMotion) return ZONE_TOP_PCT / 100 + 0.02; // quieta dentro de la zona
    const phase = ((now - startT) % period) / period;
    return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  }

  function inZone(pct) {
    return pct * 100 >= ZONE_TOP_PCT - 6 && pct * 100 <= ZONE_BOTTOM_PCT + 6;
  }

  function start(now) {
    running = true;
    score = 0;
    period = BASE_PERIOD_MS;
    startT = now;
    onStatus?.(`Récord: <strong>${_bestScore()}</strong> — ¡atrápala en la zona!`);
  }

  /** Devuelve el % actual de la pelota, o null si no hay ronda en curso. */
  function pct(now) {
    return running ? ballPct(now) : null;
  }

  function attempt(now) {
    if (!running) return;
    if (inZone(ballPct(now))) {
      score++;
      period = Math.max(MIN_PERIOD_MS, period - SPEEDUP_MS);
      const milestone = score > 0 && score % 5 === 0;
      if (milestone) envelope(getAudioContext(), { freq: 783.99, type: 'triangle', duration: 0.2, gain: 0.12 });
      else envelope(getAudioContext(), { freq: 523.25, type: 'sine', duration: 0.1, gain: 0.08 });
      onStatus?.(`Atrapes: <strong>${score}</strong> — récord ${Math.max(_bestScore(), score)}`);
      onCatch?.(score, milestone);
      startT = now; // reinicia la fase para que la próxima zona sea justa
    } else {
      _fail();
    }
  }

  function _fail() {
    running = false;
    const best = Math.max(_bestScore(), score);
    localStorage.setItem(BEST_KEY, String(best));
    window.dispatchEvent(new CustomEvent('gam:score', { detail: { game: 'juggling', score } }));
    onStatus?.(`Se cayó en ${score} 🎾 — récord <strong>${best}</strong>`);
    onFail?.(score, best);
  }

  function stop() { running = false; }

  /** 0..1 — qué tan rápido va (para calentar el color de la zona). */
  function heat() {
    return (BASE_PERIOD_MS - period) / (BASE_PERIOD_MS - MIN_PERIOD_MS);
  }

  return { start, attempt, pct, stop, heat, isRunning: () => running, best: _bestScore };
}
