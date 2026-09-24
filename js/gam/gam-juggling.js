/**
 * gam-juggling.js — Minijuego de malabares (modo .gam)
 *
 * Reflejos simples: una pelota sube y baja en un carril; hay que atraparla
 * (click/tap/Espacio) justo cuando pasa por la "zona de atrape" de abajo.
 * Cada atrape acelera un poco la pelota. Un fallo termina la ronda.
 * Récord en localStorage. Autocontenido, mismo patrón que gam-piano.js.
 *
 * Video de ejemplo: si data/gam-hotspots.json trae `videoUrl` para este
 * objeto, se puede ver bajo demanda (sin autoplay) — hoy sigue en null,
 * pendiente de que llegue el link (ver docs/gam-mode-plan.md).
 */
import { getAudioContext, envelope } from './gam-audio.js';

const BEST_KEY = 'gam-juggling-best';
const ZONE_TOP_PCT = 78;   // % del carril donde empieza la zona de atrape
const ZONE_BOTTOM_PCT = 94;
const BASE_PERIOD_MS = 1400; // tiempo de una oscilación completa arriba-abajo
const MIN_PERIOD_MS  = 550;
const SPEEDUP_MS     = 60;   // cuánto se acelera por atrape

function _bestScore() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

function mount(container, { videoUrl } = {}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'gam-juggle';
  root.innerHTML = `
    <p class="gam-juggle__status" id="gam-juggle-status">
      Récord: <strong id="gam-juggle-best">${_bestScore()}</strong> — apretá cuando la pelota entre en la zona
    </p>
    <div class="gam-juggle__track" id="gam-juggle-track">
      <div class="gam-juggle__zone" style="top:${ZONE_TOP_PCT}%; height:${ZONE_BOTTOM_PCT - ZONE_TOP_PCT}%"></div>
      <div class="gam-juggle__ball" id="gam-juggle-ball">🤹</div>
    </div>
    <div class="gam-juggle__controls">
      <button type="button" class="gam-piano__start" id="gam-juggle-start">▶ Empezar</button>
      <button type="button" class="gam-juggle__catch" id="gam-juggle-catch" hidden>¡Atrapar! (Espacio)</button>
    </div>
    ${videoUrl
      ? `<button type="button" class="gam-juggle__video-btn" id="gam-juggle-video">▶ Ver video de ejemplo</button>
         <div class="gam-juggle__video" id="gam-juggle-video-wrap" hidden></div>`
      : `<p class="gam-juggle__video-pending">🎬 Video de ejemplo — pendiente.</p>`
    }
  `;
  container.appendChild(root);

  const trackEl  = root.querySelector('#gam-juggle-track');
  const ballEl   = root.querySelector('#gam-juggle-ball');
  const statusEl = root.querySelector('#gam-juggle-status');
  const bestEl   = root.querySelector('#gam-juggle-best');
  const startBtn = root.querySelector('#gam-juggle-start');
  const catchBtn = root.querySelector('#gam-juggle-catch');

  let running   = false;
  let period    = BASE_PERIOD_MS;
  let startT    = 0;
  let score     = 0;
  let rafId     = null;

  function ballPct(t) {
    // Sube y baja tipo rebote: 0 = arriba, 1 = abajo (ida y vuelta cada `period`)
    const phase = (t % period) / period;
    return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  }

  function inZone(pct) {
    return pct * 100 >= ZONE_TOP_PCT - 6 && pct * 100 <= ZONE_BOTTOM_PCT + 6;
  }

  function tick(now) {
    if (!running) return;
    const t = now - startT;
    const pct = ballPct(t);
    ballEl.style.top = `${pct * 88}%`; // 88% deja margen para el tamaño de la pelota
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    score = 0;
    period = BASE_PERIOD_MS;
    ballEl.style.setProperty('--heat', '0');
    startT = performance.now();
    startBtn.hidden = true;
    catchBtn.hidden = false;
    statusEl.innerHTML = `Récord: <strong id="gam-juggle-best">${_bestScore()}</strong> — ¡atrapala en la zona!`;
    trackEl.classList.remove('is-fail');
    if (reducedMotion) {
      // Sin animación: igual jugable, la pelota "teletransporta" a la zona
      // a un ritmo fijo — conserva la mecánica sin depender de movimiento.
      ballEl.style.top = `${ZONE_TOP_PCT}%`;
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function attemptCatch() {
    if (!running) return;
    const t = performance.now() - startT;
    const pct = reducedMotion ? ZONE_TOP_PCT / 100 : ballPct(t);
    if (inZone(pct)) {
      score++;
      period = Math.max(MIN_PERIOD_MS, period - SPEEDUP_MS);
      ballEl.style.setProperty('--heat', String((BASE_PERIOD_MS - period) / (BASE_PERIOD_MS - MIN_PERIOD_MS)));
      ballEl.classList.add('is-caught');
      setTimeout(() => ballEl.classList.remove('is-caught'), reducedMotion ? 0 : 160);
      if (score > 0 && score % 5 === 0) {
        if (!reducedMotion) {
          ballEl.classList.add('is-milestone');
          setTimeout(() => ballEl.classList.remove('is-milestone'), 420);
        }
        envelope(getAudioContext(), { freq: 783.99, type: 'triangle', duration: 0.2, gain: 0.12 });
      }
      statusEl.innerHTML = `Atrapes: <strong>${score}</strong> — récord ${Math.max(_bestScore(), score)}`;
      startT = performance.now(); // reinicia la fase para que la próxima zona sea justa
    } else {
      _fail();
    }
  }

  function _fail() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    trackEl.classList.add('is-fail');
    const best = Math.max(_bestScore(), score);
    localStorage.setItem(BEST_KEY, String(best));
    bestEl.textContent = String(best);
    window.dispatchEvent(new CustomEvent('gam:score', { detail: { game: 'juggling', score } }));
    statusEl.innerHTML = `Se cayó en ${score} 🎾 — récord <strong id="gam-juggle-best">${best}</strong>`;
    startBtn.hidden = false;
    startBtn.textContent = '↻ Reintentar';
    catchBtn.hidden = true;
  }

  startBtn.addEventListener('click', start);
  catchBtn.addEventListener('click', attemptCatch);
  trackEl.addEventListener('click', attemptCatch);

  const keydownHandler = (e) => {
    if (e.code === 'Space') { e.preventDefault(); attemptCatch(); }
  };
  window.addEventListener('keydown', keydownHandler);

  if (videoUrl) {
    root.querySelector('#gam-juggle-video')?.addEventListener('click', () => {
      const wrap = root.querySelector('#gam-juggle-video-wrap');
      wrap.hidden = false;
      wrap.innerHTML = `<iframe src="${videoUrl}" title="Video de malabares" allow="encrypted-media" allowfullscreen loading="lazy"></iframe>`;
    }, { once: true });
  }

  return function unmount() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', keydownHandler);
    root.remove();
  };
}

export const GamJuggling = { mount };
