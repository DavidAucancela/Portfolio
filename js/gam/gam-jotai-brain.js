/**
 * gam-jotai-brain.js — comportamiento de JotAI en el cuarto de .gam.
 *
 * Fase 1 de docs/gam-jotai-plan.md: saludo de bienvenida (1×/sesión) y
 * reacción al click (saluda, asiente o, si lo tocan muchas veces seguidas,
 * se ríe de las cosquillas).
 * Fase 2: paseo autónomo — cada 10–20 s sin que lo toquen elige un spot
 * (`spots`, calculados en la escena), va rodando por un camino de
 * gam-jotai-nav.js y hace un gesto corto mirando el objeto (a veces
 * comenta algo). Las rutinas de la noche y las estaciones (fases 3–4) se
 * cuelgan de este mismo módulo.
 *
 * Cancelación: token `seq` (mismo patrón que `_seq` en ia-tour.js). Cada
 * rutina guarda su número al arrancar y se corta sola si al volver de un
 * `await` ya no es la vigente — sin callbacks zombis. Las esperas (`sleep`)
 * se resuelven en `update()` con el reloj del loop, así una pausa del
 * cuarto (panel abierto) también pausa las rutinas.
 *
 * La mirada también se decide acá: objeto enfocado > lo que mira en el
 * spot > cursor > deriva propia (null).
 *
 * Frases bilingües en data/gam-jotai.json (`{es,en}`, resueltas con
 * LangSwitcher.L al momento de hablar). FALLBACK cubre el caso de que el
 * fetch falle; las `muse_*` (comentarios en los spots) no tienen fallback:
 * sin JSON, simplemente no comenta.
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

const STROLL_EVERY = [10000, 20000];   // pausa entre paseos (ms)
const FIRST_STROLL = [8000, 12000];    // el primero, desde que arranca el cuarto
const AFTER_POKE = 9000;               // tras tocarlo se queda un rato atento
const MUSE_CHANCE = 0.3;               // probabilidad de comentar algo al llegar
const RECENT = 3;                      // no repite los últimos N spots
const CLEARANCE = 1.4;                 // a menos de esto del objeto enfocado, se aparta

/* Qué hace al llegar a cada spot: cara, cuánto se queda mirando y un clip opcional. */
const SPOT_ACTS = {
  window:     { face: 'listening', hold: 4200 },
  bookshelf:  { face: 'thinking',  hold: 4000 },
  pukis:      { face: 'success',   hold: 3600, clip: 'nod' },
  desk:       { face: 'thinking',  hold: 4400 },
  piano:      { face: 'greeting',  hold: 3200, clip: 'nod' },
  chess:      { face: 'thinking',  hold: 4200 },
  juggling:   { face: 'listening', hold: 3200 },
  skateboard: { face: 'confused',  hold: 3000 },
  lumbre:     { face: 'success',   hold: 3600 },
  home:       { face: 'idle',      hold: 2400 },
};

const rand = ([a, b]) => a + Math.random() * (b - a);

export function createJotaiBrain({ jotai, bubble, nav = null, spots = {}, viewHeading = Math.PI / 4 }) {
  let lines = FALLBACK;
  fetch('data/gam-jotai.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d) lines = { ...FALLBACK, ...d }; })
    .catch(() => { /* se queda con FALLBACK */ });

  let clock = performance.now();
  let greeted = false;
  try { greeted = sessionStorage.getItem(HELLO_KEY) === '1'; } catch { /* sin storage: saluda igual */ }
  let helloAt = greeted ? 0 : clock + HELLO_DELAY;
  let pokes = [];
  const lastIndex = {};

  let seq = 0;                 // token de la rutina vigente
  let interrupts = 0;          // cuántas veces se cortó una rutina desde afuera
  let strolling = false;
  let nextStrollAt = clock + rand(FIRST_STROLL);
  let current = 'home';
  let target = null;           // spot hacia el que va rodando
  const recent = ['home'];
  let gaze = null;             // Vector3 que mira en el spot
  let gazeUntil = 0;
  let zoomedNow = null;        // objeto enfocado (FURNITURE) o null

  const timers = [];
  const sleep = (ms) => new Promise((r) => timers.push({ at: clock + ms, r }));

  function line(key) {
    const arr = lines[key] || FALLBACK[key] || [];
    if (!arr.length) return '';
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && i === lastIndex[key]) i = (i + 1) % arr.length;
    lastIndex[key] = i;
    return LangSwitcher.L(arr[i]);
  }

  function say(text) {
    if (text && !zoomedNow) bubble.say(text, { duration: 2200 + text.length * 40 });
  }

  function speak(key, face, clip) {
    jotai.setFace(face, 2600);
    if (clip) jotai.play(clip);
    say(line(key));
  }

  /** Corta la rutina en curso (paseo) y lo deja quieto. */
  function interrupt(delay = AFTER_POKE) {
    seq++;
    interrupts++;
    strolling = false;
    gaze = null;
    jotai.stop();
    nextStrollAt = clock + delay;
  }

  /** De frente a la cámara, para hablarle al visitante. */
  function faceViewer() {
    const d = Math.atan2(Math.sin(viewHeading - jotai.root.rotation.y), Math.cos(viewHeading - jotai.root.rotation.y));
    if (Math.abs(d) > 0.5) jotai.faceTo(viewHeading);
  }

  function markGreeted() {
    greeted = true;
    helloAt = 0;
    try { sessionStorage.setItem(HELLO_KEY, '1'); } catch { /* ignorar */ }
  }

  /** Click / tap / tecla J sobre JotAI. */
  function poke() {
    const now = performance.now();
    interrupt();
    faceViewer();
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

  /** Va rodando hasta el spot `id` y hace su gesto. Resuelve true si
   *  terminó, false si lo interrumpieron o no hay camino. */
  async function goTo(id) {
    const spot = spots[id];
    if (!spot || !nav) return false;
    const my = ++seq;
    const path = nav.findPath(jotai.root.position, spot);
    if (!path) return false;
    gaze = null;
    target = id;
    const arrived = await jotai.followPath(path, { facing: spot.heading });
    if (my === seq) target = null;
    if (!arrived || my !== seq) return false;
    current = id;
    recent.push(id);
    if (recent.length > RECENT) recent.shift();

    const act = SPOT_ACTS[id] || SPOT_ACTS.home;
    gaze = spot.look;
    gazeUntil = clock + act.hold;
    jotai.setFace(act.face, act.hold);
    if (act.clip) jotai.play(act.clip);
    if (Math.random() < MUSE_CHANCE) say(line(`muse_${id}`));
    await sleep(act.hold);
    if (my !== seq) return false;
    gaze = null;
    return true;
  }

  async function stroll() {
    strolling = true;
    const gen = interrupts;
    const options = Object.keys(spots).filter((id) => id !== current && !recent.includes(id));
    const pool = options.length ? options : Object.keys(spots).filter((id) => id !== current);
    // si el elegido no tiene camino, prueba otro (máx. 3)
    for (let tries = 0; tries < 3 && pool.length; tries++) {
      const id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const path = nav.findPath(jotai.root.position, spots[id]);
      if (!path) continue;
      await goTo(id);
      break;
    }
    if (gen === interrupts) {   // si lo interrumpieron, interrupt() ya reprogramó
      strolling = false;
      nextStrollAt = clock + rand(STROLL_EVERY);
    }
  }

  /** Al enfocar un objeto: si JotAI está (o va) al lado, se aparta a su
   *  rincón para no quedar entre la cámara y el objeto (el ajedrez se ve con
   *  zoom 7.5 desde el frente, justo donde está su spot). En la Fase 4 las
   *  estaciones lo van a usar en vez de apartarlo. */
  function makeRoom(f) {
    const pos = jotai.root.position;
    const near = (p) => p && Math.hypot(p.x - f.x, p.z - f.z) < CLEARANCE;
    // su spot de ese objeto (el del piano queda a 1.6 u, justo frente a la cámara)
    const atSpot = spots[f.id] && Math.hypot(pos.x - spots[f.id].x, pos.z - spots[f.id].z) < 0.3;
    if (!atSpot && target !== f.id && !near(pos) && !near(spots[target])) return;
    interrupt(STROLL_EVERY[0]);
    if (spots.home && !near(spots.home)) goTo('home');
  }

  /** Cada frame, antes de jotai.update().
   *  zoomed: objeto de FURNITURE enfocado (o null) · focusLook: su punto de
   *  mirada · cursorLook: punto hacia el que mira si el cursor se movió hace poco. */
  function update(now, { zoomed = null, focusLook = null, cursorLook = null }) {
    clock = now;
    if (zoomed && zoomed !== zoomedNow) makeRoom(zoomed);
    zoomedNow = zoomed;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= now) { timers[i].r(); timers.splice(i, 1); }
    }

    if (zoomed) {
      bubble.hide();      // con la cámara en un objeto el globo quedaría fuera de cuadro
    } else if (helloAt && now > helloAt && !jotai.moving) {
      markGreeted();
      faceViewer();
      speak('hello', 'greeting', 'wave');
    }

    // Paseo: solo en vista general, quieto, sin globo y sin otra rutina
    if (nav && !zoomed && !strolling && !jotai.busy && !bubble.visible && !helloAt && now > nextStrollAt) {
      stroll();
    }

    let look = null;
    if (zoomed && focusLook) look = focusLook;
    else if (gaze && now < gazeUntil) look = gaze;
    else if (cursorLook) look = cursorLook;
    jotai.setLookTarget(look);
    jotai.setTalking(bubble.typing);
  }

  return {
    poke, update,
    goTo(id) { interrupt(); return goTo(id); },   // QA desde consola: __gamJotai.brain.goTo('pukis')
    get current() { return current; },
  };
}
