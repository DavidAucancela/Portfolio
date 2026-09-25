/**
 * gam-jotai-brain.js — comportamiento de JotAI en el cuarto de .gam.
 *
 * Fase 1 de docs/gam-jotai-plan.md: saludo de bienvenida (1×/sesión) y
 * reacción al click (saluda, asiente o, si lo tocan muchas veces seguidas,
 * se ríe de las cosquillas). Las rutinas (noche, estaciones, paseo) llegan
 * en las fases siguientes y se cuelgan de este mismo módulo.
 *
 * Frases bilingües en data/gam-jotai.json (`{es,en}`, resueltas con
 * LangSwitcher.L al momento de hablar). FALLBACK cubre el caso de que el
 * fetch falle.
 */
import { LangSwitcher } from '../lang.js';

const FALLBACK = {
  hello: [{ es: '¡Hola! Soy JotAI y vivo en este cuarto 👀', en: "Hi! I'm JotAI and I live in this room 👀" }],
  poke: [{ es: '¿Sí? 👋', en: 'Yes? 👋' }],
  tickle: [{ es: '¡Me haces cosquillas! 😵‍💫', en: 'That tickles! 😵‍💫' }],
};
const HELLO_KEY = 'gam-jotai-hello';
const HELLO_DELAY = 1600;
const TICKLE_POKES = 4;        // toques dentro de TICKLE_WINDOW → cosquillas
const TICKLE_WINDOW = 4000;

export function createJotaiBrain({ jotai, bubble }) {
  let lines = FALLBACK;
  fetch('data/gam-jotai.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d) lines = { ...FALLBACK, ...d }; })
    .catch(() => { /* se queda con FALLBACK */ });

  let greeted = false;
  try { greeted = sessionStorage.getItem(HELLO_KEY) === '1'; } catch { /* sin storage: saluda igual */ }
  let helloAt = greeted ? 0 : performance.now() + HELLO_DELAY;
  let pokes = [];
  const lastIndex = {};

  function line(key) {
    const arr = lines[key] || FALLBACK[key] || [];
    if (!arr.length) return '';
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && i === lastIndex[key]) i = (i + 1) % arr.length;
    lastIndex[key] = i;
    return LangSwitcher.L(arr[i]);
  }

  function speak(key, face, clip) {
    const text = line(key);
    jotai.setFace(face, 2600);
    if (clip) jotai.play(clip);
    if (text) bubble.say(text, { duration: 2200 + text.length * 40 });
  }

  function markGreeted() {
    greeted = true;
    helloAt = 0;
    try { sessionStorage.setItem(HELLO_KEY, '1'); } catch { /* ignorar */ }
  }

  /** Click / tap / tecla J sobre JotAI. */
  function poke() {
    const now = performance.now();
    pokes = pokes.filter((t) => now - t < TICKLE_WINDOW);
    pokes.push(now);
    if (pokes.length >= TICKLE_POKES) {
      pokes = [];
      speak('tickle', 'confused', 'giggle');
      return;
    }
    if (!greeted) { markGreeted(); speak('hello', 'greeting', 'wave'); return; }
    speak('poke', 'greeting', pokes.length === 1 ? 'wave' : 'nod');
  }

  /** Cada frame, antes de jotai.update(). `zoomed`: hay un objeto enfocado. */
  function update(now, { zoomed }) {
    if (zoomed) {
      bubble.hide();      // con la cámara en un objeto el globo quedaría fuera de cuadro
    } else if (helloAt && now > helloAt) {
      markGreeted();
      speak('hello', 'greeting', 'wave');
    }
    jotai.setTalking(bubble.typing);
  }

  return { poke, update };
}
