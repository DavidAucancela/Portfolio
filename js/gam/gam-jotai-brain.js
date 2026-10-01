/**
 * gam-jotai-brain.js — comportamiento de JotAI en el cuarto de .gam.
 *
 * Fase 1 de docs/gam-jotai-plan.md: saludo de bienvenida (1×/sesión) y
 * reacción al click (saluda, asiente o, si lo tocan muchas veces seguidas,
 * se ríe de las cosquillas).
 * Fase 2: paseo autónomo de día — cada 10–20 s sin que lo toquen elige un
 * spot (`spots`, calculados en la escena), va rodando por un camino de
 * gam-jotai-nav.js y hace un gesto corto mirando el objeto (a veces comenta).
 * Fase 3: la noche. Al anochecer (env.t cruza NIGHT_T) deja lo que hacía, se
 * estira, va a acariciar a Pukis, se sienta al escritorio, escribe un rato y
 * se duerme sobre el teclado. Al amanecer (cruza DAY_T) se despierta, se
 * levanta y se estira. Si el cuarto arranca de noche, ya está dormido.
 * Tocarlo o abrir el escritorio lo despierta de un salto; si lo dejan solo,
 * a los pocos segundos se vuelve a dormir. Mientras dura la rutina hay un
 * subtítulo con "Saltar".
 *
 * Rutinas: `run(nombre, fn)` con token `seq` (mismo patrón que `_seq` en
 * ia-tour.js). Cada paso chequea `ok()` al volver de un `await` y, si ya no
 * es la rutina vigente, se corta — sin callbacks zombis. `interrupt()` las
 * corta desde afuera y deja el cuerpo en un estado coherente (termina de
 * sentarse/levantarse de golpe, la silla en su lugar). Las esperas (`sleep`)
 * y animaciones (`anim`) avanzan en `update()` con el reloj del loop: una
 * pausa del cuarto también pausa las rutinas.
 *
 * La mirada también se decide acá: objeto enfocado > lo que mira en la
 * rutina/spot > cursor > deriva propia (null).
 *
 * Frases bilingües en data/gam-jotai.json (`{es,en}`, resueltas con
 * LangSwitcher.L al momento de hablar). FALLBACK cubre el caso de que el
 * fetch falle; las `muse_*` no tienen fallback: sin JSON, no comenta.
 */
import { LangSwitcher } from '../lang.js';

const FALLBACK = {
  hello: [{ es: '¡Hola! Soy JotAI y vivo en este cuarto 👀', en: "Hi! I'm JotAI and I live in this room 👀" }],
  poke: [{ es: '¿Sí? 👋', en: 'Yes? 👋' }],
  tickle: [{ es: '¡Me haces cosquillas! 😵‍💫', en: 'That tickles! 😵‍💫' }],
  night: [{ es: 'Uf… ya es tarde 🥱', en: "Phew… it's late 🥱" }],
  wake: [{ es: '¡Ah! ¡No estaba durmiendo! 😳', en: "Ah! I wasn't sleeping! 😳" }],
  morning: [{ es: '¡Buenos días! ☀️', en: 'Good morning! ☀️' }],
};
const CAPTION = {
  night: { es: 'JotAI se prepara para dormir…', en: 'JotAI is getting ready for bed…' },
  dawn: { es: 'JotAI se despierta…', en: 'JotAI is waking up…' },
  skip: { es: 'Saltar ⏭', en: 'Skip ⏭' },
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

/* Fase 4 (estaciones): objetos donde, al enfocarlos, JotAI va hacia su spot
   y toma un pose propio en vez del apartarse genérico (ver `onZoom`).
   Exportado: gam-three-scene.js lo usa para saber cuándo meterlo en
   FOCUS_LAYER (no desenfocarlo mientras está "de servicio" en la estación). */
export const STATION_POSE = { piano: 'piano' };

const NIGHT_T = 0.75;                  // env.t ≥ esto → noche (histéresis con DAY_T)
const DAY_T = 0.25;
const BACK_TO_SLEEP = 10000;           // de noche, despierto y solo → vuelve a dormirse
const TYPE_MS = 8000;                  // cuánto escribe antes de dormirse
const Z_EVERY = 1700;                  // un glifo "z" cada tanto mientras duerme

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

/**
 * props (opcionales — sin ellos la rutina nocturna se salta esa parte):
 *   chair: { set(k 0..1), seat() → { x, z, heading, side: {x,z} } } — k=1 arrimada al escritorio
 *   petPukis(): reacción de Pukis (corazones, cola)
 *   emit(glyph, color, pos, opts): glifo flotante
 * caption: createJotaiCaption(...) de gam-jotai-bubble.js
 */
export function createJotaiBrain({
  jotai, bubble, caption = null, nav = null, spots = {}, props = {},
  viewHeading = Math.PI / 4, reducedMotion = false,
}) {
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
  let routine = null;          // nombre de la rutina en curso ('stroll', 'night', 'bed', 'dawn', 'goTo')
  let nextAt = clock + rand(FIRST_STROLL);   // próxima acción por iniciativa propia
  let current = 'home';
  let target = null;           // spot hacia el que va rodando
  const recent = ['home'];
  let gaze = null;             // Vector3 que mira en la rutina / el spot
  let gazeUntil = 0;
  let zoomedNow = null;        // objeto enfocado (FURNITURE) o null

  let phase = null;            // 'day' | 'night' (null hasta el primer update)
  let seated = false;          // sentado en la silla del escritorio
  let sleeping = false;
  let chairK = 0;              // 0 = silla en su lugar · 1 = arrimada al escritorio
  let snap = null;             // estado final de un subirse/bajarse de la silla en curso
  let zAt = 0;
  let captionKey = null;       // subtítulo de la rutina en curso ('night' | 'dawn')

  /* ── Tiempo del loop: esperas y animaciones ── */
  const timers = [];
  const sleep = (ms) => new Promise((r) => timers.push({ at: clock + ms, r }));
  const anims = [];
  function anim(ms, fn) {
    return new Promise((r) => anims.push({ t0: clock, ms: reducedMotion ? 1 : ms, fn, r }));
  }
  /** Termina de golpe todas las animaciones en curso (al interrumpir). */
  function finishAnims() {
    anims.splice(0).forEach((a) => { a.fn(1); a.r(); });
  }

  /* ── Frases ── */
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

  function emit(glyph, color, opts) {
    if (!props.emit) return;
    const p = jotai.headTop();
    p.y -= 0.05;
    props.emit(glyph, color, p, opts);
  }

  /* ── Rutinas ── */
  async function run(name, fn) {
    const my = ++seq;
    routine = name;
    const ok = () => my === seq;
    try {
      return await fn(ok);
    } finally {
      if (my === seq) {
        routine = null;
        showCaption(null);
      }
    }
  }

  /** Corta la rutina en curso y deja el cuerpo en un estado coherente. */
  function interrupt(delay = AFTER_POKE) {
    seq++;
    routine = null;
    target = null;
    gaze = null;
    showCaption(null);
    jotai.stop();
    jotai.stopClip();
    finishAnims();
    if (snap) {
      // estaba subiéndose o bajándose de la silla: lo termina de golpe
      jotai.root.position.x = snap.x;
      jotai.root.position.z = snap.z;
      jotai.root.rotation.y = snap.heading;
      seated = snap.seated;
      snap = null;
    }
    if (!sleeping) jotai.setPose(seated ? 'sit' : 'stand');
    nextAt = clock + delay;
  }

  function showCaption(key) {
    captionKey = key;
    if (!caption) return;
    if (key && !zoomedNow) caption.show(LangSwitcher.L(CAPTION[key]), skip, LangSwitcher.L(CAPTION.skip));
    else caption.hide();
  }

  /** De frente a la cámara, para hablarle al visitante (sentado no gira). */
  function faceViewer() {
    if (seated) return;
    const d = Math.atan2(Math.sin(viewHeading - jotai.root.rotation.y), Math.cos(viewHeading - jotai.root.rotation.y));
    if (Math.abs(d) > 0.5) jotai.faceTo(viewHeading);
  }

  /** Va rodando hasta el spot `id` (sin gesto). */
  async function travel(id, ok) {
    const spot = spots[id];
    if (!spot || !nav) return false;
    const path = nav.findPath(jotai.root.position, spot);
    if (!path) return false;
    gaze = null;
    target = id;
    const arrived = await jotai.followPath(path, { facing: spot.heading });
    if (ok()) target = null;
    if (!arrived || !ok()) return false;
    current = id;
    return true;
  }

  /** Gesto al llegar a un spot del paseo. */
  async function gesture(id, ok) {
    recent.push(id);
    if (recent.length > RECENT) recent.shift();
    const act = SPOT_ACTS[id] || SPOT_ACTS.home;
    gaze = spots[id]?.look || null;
    gazeUntil = clock + act.hold;
    jotai.setFace(act.face, act.hold);
    if (act.clip) jotai.play(act.clip);
    if (Math.random() < MUSE_CHANCE) say(line(`muse_${id}`));
    await sleep(act.hold);
    if (ok()) gaze = null;
    return ok();
  }

  function stroll() {
    return run('stroll', async (ok) => {
      const options = Object.keys(spots).filter((id) => id !== current && !recent.includes(id));
      const pool = options.length ? options : Object.keys(spots).filter((id) => id !== current);
      // si el elegido no tiene camino, prueba otro (máx. 3)
      for (let tries = 0; tries < 3 && pool.length; tries++) {
        const id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (!nav.findPath(jotai.root.position, spots[id])) continue;
        if (await travel(id, ok)) await gesture(id, ok);
        break;
      }
      if (ok()) nextAt = clock + rand(STROLL_EVERY);
    });
  }

  /* ── Silla ── */
  function chairTo(k) {
    if (!props.chair) return Promise.resolve();
    const from = chairK;
    return anim(600, (u) => { chairK = from + (k - from) * u; props.chair.set(chairK); });
  }

  /** Del spot del escritorio a la silla: la arrima, se para al costado y se sube. */
  async function sitDown(ok) {
    if (!ok()) return false;
    if (seated) return true;
    if (!props.chair) return false;
    if (!(await travel('desk', ok))) return false;
    await chairTo(1);
    if (!ok()) return false;
    const s = props.chair.seat();
    if (!(await jotai.followPath([s.side], { facing: s.heading })) || !ok()) return false;
    snap = { x: s.x, z: s.z, heading: s.heading, seated: true };
    jotai.setPose('sit');
    await jotai.slideTo(s, 520, s.heading);
    snap = null;
    if (!ok()) return false;
    seated = true;
    return true;
  }

  /** Se baja de la silla hacia el costado y la deja en su lugar. */
  async function getUp(ok) {
    if (!seated) return true;
    const s = props.chair.seat();
    snap = { x: s.side.x, z: s.side.z, heading: s.heading, seated: false };
    jotai.setPose('stand');
    await jotai.slideTo(s.side, 480, s.heading);
    snap = null;
    if (!ok()) return false;
    seated = false;
    await chairTo(0);
    return ok();
  }

  function fallAsleepNow() {
    sleeping = true;
    gaze = null;
    jotai.stopClip();
    jotai.setPose('sleepDesk');
    jotai.setFace('sleeping');
    zAt = clock + 600;
  }

  /** Teclea un rato mirando la pantalla, bosteza y se duerme. */
  async function typeThenSleep(ok, ms) {
    if (!ok()) return false;
    jotai.setPose('type');
    gaze = props.chair?.seat().look || spots.desk?.look || null;
    gazeUntil = Infinity;
    jotai.setFace('thinking');
    jotai.play('typing', { loop: true });
    await sleep(ms);
    if (!ok()) return false;
    jotai.stopClip();
    jotai.setFace('yawn');
    await sleep(1300);
    if (!ok()) return false;
    fallAsleepNow();
    return true;
  }

  /** Anochecer: se estira → Pukis → escritorio → escribe → se duerme. */
  function night() {
    return run('night', async (ok) => {
      showCaption('night');
      if (!seated) {
        jotai.setFace('yawn', 2600);
        say(line('night'));
        await jotai.play('stretch');
        if (!ok()) return;

        const pk = spots.pukis;
        if (pk && props.petPukis && await travel('pukis', ok)) {
          // se agacha, se arrima a la cabeza y la acaricia
          const near = { x: pk.x + (pk.look.x - pk.x) * 0.45, z: pk.z + (pk.look.z - pk.z) * 0.45 };
          gaze = pk.look;
          gazeUntil = Infinity;
          jotai.setPose('crouch');
          await jotai.slideTo(near, 500, pk.heading);
          if (!ok()) return;
          jotai.setFace('success');
          const stroke = jotai.play('pet');
          for (let i = 0; i < 3; i++) {
            await sleep(600);
            if (!ok()) return;
            props.petPukis();
          }
          await stroke;
          if (!ok()) return;
          jotai.setPose('stand');
          jotai.setFace('idle');
          gaze = null;
          await jotai.slideTo(pk, 450, pk.heading);
        }
        if (!ok() || !(await sitDown(ok))) return;
      }
      await typeThenSleep(ok, TYPE_MS);
    });
  }

  /** De noche, despierto y solo: vuelve a la silla y se duerme (versión corta). */
  function bed() {
    return run('bed', async (ok) => {
      if (!seated && !(await sitDown(ok))) return;
      await typeThenSleep(ok, 2500);
    });
  }

  /** Amanecer: se despierta, se estira sentado, se baja y saluda. */
  function dawn() {
    return run('dawn', async (ok) => {
      showCaption('dawn');
      if (sleeping) {
        sleeping = false;
        jotai.setPose(seated ? 'sit' : 'stand');
        jotai.setFace('yawn', 1800);
        await sleep(900);
        if (!ok()) return;
      }
      await jotai.play('stretch');
      if (!ok()) return;
      if (seated && !(await getUp(ok))) return;
      faceViewer();
      speak('morning', 'greeting', 'wave');
      await sleep(1500);
      if (ok()) nextAt = clock + rand(STROLL_EVERY);
    });
  }

  /** Saltar la escena: el estado final, sin la animación. */
  function skip() {
    const which = routine;
    if (which !== 'night' && which !== 'dawn') return;
    interrupt(which === 'dawn' ? rand(STROLL_EVERY) : AFTER_POKE);
    const s = props.chair?.seat();
    if (which === 'night' && s) {
      props.chair.set(chairK = 1);
      jotai.root.position.set(s.x, 0, s.z);
      jotai.root.rotation.y = s.heading;
      seated = true;
      fallAsleepNow();
    } else if (which === 'dawn') {
      sleeping = false;
      if (seated && s) {
        props.chair.set(chairK = 0);
        const d = spots.desk || s.side;
        jotai.root.position.set(d.x, 0, d.z);
        seated = false;
      }
      jotai.setPose('stand');
      jotai.setFace('idle');
    }
  }

  /** Arranque de noche: ya está dormido en el escritorio, sin rutina. */
  function startAsleep() {
    const s = props.chair?.seat();
    if (!s) return;
    props.chair.set(chairK = 1);
    jotai.root.position.set(s.x, 0, s.z);
    jotai.root.rotation.y = s.heading;
    seated = true;
    current = 'desk';
    fallAsleepNow();
  }

  /** Despertarse de un salto (click o escritorio mientras duerme). */
  function wakeStartled() {
    sleeping = false;
    jotai.setPose(seated ? 'sit' : 'stand');
    jotai.setFace('confused', 1400);
    jotai.play('startle');
    emit('!', '#ffd23f', { size: 0.26, rise: 0.35, life: 1.2 });
  }

  function markGreeted() {
    greeted = true;
    helloAt = 0;
    try { sessionStorage.setItem(HELLO_KEY, '1'); } catch { /* ignorar */ }
  }

  /** Click / tap / tecla J sobre JotAI. */
  function poke() {
    const now = performance.now();
    if (sleeping) {
      interrupt(BACK_TO_SLEEP);
      wakeStartled();
      if (!greeted) { markGreeted(); say(line('hello')); } else say(line('wake'));
      return;
    }
    interrupt(phase === 'night' ? BACK_TO_SLEEP : AFTER_POKE);
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

  /** Estación con papel propio (§11 del plan): va a su spot y toma el pose
   *  de `STATION_POSE`; `interrupt()` (poke, otra estación, noche…) revuelve
   *  la pose a `stand`/`sit` sola, así que no hace falta un "salir" explícito. */
  function enterStation(f) {
    interrupt(AFTER_POKE);
    run('station', async (ok) => {
      if (!(await travel(f.id, ok)) || !ok()) return;
      jotai.setPose(STATION_POSE[f.id]);
      jotai.setFace('greeting', 1600);
    });
  }

  /** Al enfocar un objeto. Sentado: solo el escritorio le importa (lo
   *  despierta de un salto y se queda en la silla). De pie: si el objeto
   *  tiene un rol propio (`STATION_POSE`) va hacia él; si no, y está (o va)
   *  al lado del objeto, se aparta a su rincón para no quedar entre la
   *  cámara y el objeto — el ajedrez se ve con zoom 7.5 desde el frente,
   *  justo donde está su spot. */
  function onZoom(f) {
    if (seated) {
      if (f.id === 'desk') {
        const wasAsleep = sleeping;
        interrupt(BACK_TO_SLEEP);
        if (wasAsleep) wakeStartled();
      }
      return;
    }
    if (STATION_POSE[f.id]) { enterStation(f); return; }
    const pos = jotai.root.position;
    const near = (p) => p && Math.hypot(p.x - f.x, p.z - f.z) < CLEARANCE;
    // su spot de ese objeto (el del piano queda a 1.6 u, justo frente a la cámara)
    const atSpot = spots[f.id] && Math.hypot(pos.x - spots[f.id].x, pos.z - spots[f.id].z) < 0.3;
    if (!atSpot && target !== f.id && !near(pos) && !near(spots[target])) return;
    const wasNight = routine === 'night';
    interrupt(STROLL_EVERY[0]);
    if (spots.home && !near(spots.home)) run('goTo', (ok) => travel('home', ok));
    if (wasNight) nextAt = clock + BACK_TO_SLEEP;
  }

  /** Eventos de una estación activa (§11: `cue`) — hoy solo el piano: mueve
   *  la mano del lado que sonó, sin IK, mientras JotAI esté ahí parado. */
  function cue(evt, data) {
    if (evt === 'piano:key' && current === 'piano' && !jotai.moving && !sleeping) {
      jotai.play(data.index % 2 === 0 ? 'pianoKeyL' : 'pianoKeyR');
    }
  }

  /** ¿Cambiar a este momento del día dispara una rutina que conviene ver
   *  desde la vista general? (la estación de la ventana se sale sola) */
  function wantsStage(t) {
    return (phase === 'day' && t >= NIGHT_T) || (phase === 'night' && t <= DAY_T);
  }

  /** Cada frame, antes de jotai.update().
   *  zoomed: objeto de FURNITURE enfocado (o null) · focusLook: su punto de
   *  mirada · cursorLook: punto hacia el que mira si el cursor se movió hace
   *  poco · envT: momento del día (0 día · 0.5 atardecer · 1 noche). */
  function update(now, { zoomed = null, focusLook = null, cursorLook = null, envT = 0.5 }) {
    clock = now;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= now) { timers[i].r(); timers.splice(i, 1); }
    }
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      const u = Math.min(1, Math.max(0, (now - a.t0) / a.ms));
      a.fn(u);
      if (u >= 1) { anims.splice(i, 1); a.r(); }
    }

    // Día / noche (con histéresis: NIGHT_T para dormirse, DAY_T para despertarse)
    if (phase === null) {
      phase = envT >= NIGHT_T ? 'night' : 'day';
      if (phase === 'night') startAsleep();
    } else if (phase === 'day' && envT >= NIGHT_T) {
      phase = 'night';
      interrupt(BACK_TO_SLEEP);
      night();
    } else if (phase === 'night' && envT <= DAY_T) {
      phase = 'day';
      interrupt(rand(STROLL_EVERY));
      dawn();
    }

    if (zoomed !== zoomedNow) {
      const was = zoomedNow;
      zoomedNow = zoomed;
      if (zoomed) onZoom(zoomed);
      // se sale de una estación con rol propio (ej. piano): interrupt() vuelve
      // la pose a stand/sit sola, no hace falta un "salir" a mano por estación
      else if (was && STATION_POSE[was.id] && !seated && !sleeping) interrupt(AFTER_POKE);
      else if (was && phase === 'night' && !sleeping) nextAt = Math.max(nextAt, clock + BACK_TO_SLEEP * 0.8);
      showCaption(captionKey);   // se oculta con zoom, vuelve al salir
    }

    if (zoomed) {
      bubble.hide();      // con la cámara en un objeto el globo quedaría fuera de cuadro
    } else if (helloAt && now > helloAt && !jotai.moving && !sleeping && !routine) {
      markGreeted();
      faceViewer();
      speak('hello', 'greeting', 'wave');
    }

    // Iniciativa propia: de día pasea; de noche, si está despierto, vuelve a dormirse
    if (!zoomed && !routine && !jotai.busy && !bubble.visible && now > nextAt) {
      if (phase === 'day' && nav && !helloAt) stroll();
      else if (phase === 'night' && !sleeping) bed();
    }

    if (sleeping && !zoomed && now > zAt) {
      zAt = now + Z_EVERY;
      emit('z', '#9fd8ff', { size: 0.18 + Math.random() * 0.06, rise: 0.55, drift: 0.2, life: 2.2 });
    }

    let look = null;
    if (zoomed && focusLook) look = focusLook;
    else if (gaze && now < gazeUntil) look = gaze;
    else if (cursorLook && !sleeping) look = cursorLook;
    jotai.setLookTarget(look);
    jotai.setTalking(bubble.typing);
  }

  return {
    poke, update, skip, wantsStage, cue,
    goTo(id) {   // QA desde consola: __gamJotai.brain.goTo('pukis')
      interrupt();
      return run('goTo', async (ok) => (await travel(id, ok)) && gesture(id, ok));
    },
    night: () => { phase = 'night'; interrupt(BACK_TO_SLEEP); return night(); },   // QA
    dawn: () => { phase = 'day'; interrupt(); return dawn(); },                   // QA
    get current() { return current; },
    get routine() { return routine; },
    get seated() { return seated; },
    get sleeping() { return sleeping; },
  };
}
