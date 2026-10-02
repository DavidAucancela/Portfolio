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
 * Fase 4: las estaciones. Al enfocar un objeto con papel propio (`ROLES`)
 * va a su spot, se sienta si hace falta (banqueta del piano: `props.seats`) y queda "de servicio" (`duty`): las estaciones le
 * avisan qué pasa con `cue(evento, datos)` (tecla del piano, jugada de la IA,
 * truco de patineta…) y él reacciona. Al salir del zoom se levanta y vuelve a
 * lo suyo. Mientras está de servicio puede hablar aunque haya zoom.
 *
 * La mirada también se decide acá: lo que mira en la rutina/estación >
 * objeto enfocado > cursor > deriva propia (null).
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

/* Fase 4 (estaciones): qué hace al enfocar cada objeto — en vez del
   apartarse genérico (`makeRoom` en `onZoom`) va a su spot y:
     seat  → se sienta en ese asiento (`props.seats[seat]`)
     pose  → pose base mientras está de servicio
     face  → cara al llegar · clip/loop → gesto al llegar
     near  → se arrima hacia lo que mira (0..1 del camino spot → look)
     faceCam → al llegar se gira hacia la cámara de la estación (toca de frente)
     point → señala lo que mira al llegar
     line  → frase (1×/sesión por clave) */
const ROLES = {
  piano:      { seat: 'bench', pose: 'pianoSit', face: 'greeting' },
  guitar:     { pose: 'guitarHold', face: 'success', faceCam: true, line: 'guitar_intro' },
  chess:      { pose: 'chessStand', face: 'greeting', near: 0.18, line: 'chess_hello' },   // de pie, arrimado a la mesa
  juggling:   { pose: 'juggle', face: 'listening', clip: 'juggleHands', loop: true },
  skateboard: { pose: 'stand', face: 'greeting', line: 'skate_intro' },
  medals:     { pose: 'stand', face: 'success', point: true, line: 'medals_proud' },
  soundbar:   { pose: 'stand', face: 'success', clip: 'bob', loop: true, line: 'music_vibe' },
  starwars:   { pose: 'stand', face: 'greeting', clip: 'salute', line: 'sw_force' },
  pukis:      { pose: 'crouch', face: 'success', near: 0.45, clip: 'pet' },
  bookshelf:  { pose: 'stand', face: 'listening' },
  lumbre:     { pose: 'stand', face: 'success', point: true, line: 'lumbre_brag' },
};
/* Exportado: la escena lo usa para la capa de foco (que no salga desenfocado
   mientras está de servicio junto al objeto enfocado). */
export const STATION_IDS = new Set(Object.keys(ROLES));
/* Prefijo del cue → estación que lo manda. */
const CUE_STATION = {
  piano: 'piano', guitar: 'guitar', chess: 'chess', juggle: 'juggling', skate: 'skateboard',
  medals: 'medals', book: 'bookshelf', lumbre: 'lumbre', pukis: 'pukis',
};

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
  medals:     { face: 'success',   hold: 3400 },
  starwars:   { face: 'greeting',  hold: 3200 },
  guitar:     { face: 'listening', hold: 3200, clip: 'nod' },
  soundbar:   { face: 'success',   hold: 3600, clip: 'nod' },
  home:       { face: 'idle',      hold: 2400 },
};

const rand = ([a, b]) => a + Math.random() * (b - a);

/** Analítica (Fase 5): js/analytics.js traduce `gam:jotai` a track('gam_jotai').
 *  Payload plano (string/number) — lo exige @vercel/analytics. */
function report(action, extra = {}) {
  window.dispatchEvent(new CustomEvent('gam:jotai', { detail: { action, ...extra } }));
}

/**
 * props (opcionales — sin ellos la rutina nocturna se salta esa parte):
 *   chair: { set(k 0..1), seat() → { x, z, heading, side: {x,z} } } — k=1 arrimada al escritorio
 *   seats: { [nombre]: { seat() → { x, z, heading, side: {x,z}, topY } } } — asientos
 *          de estación (banqueta del piano); `topY` = altura
 *          del asiento en el mundo
 *   petPukis(): reacción de Pukis (corazones, cola)
 *   emit(glyph, color, pos, opts): glifo flotante
 * caption: createJotaiCaption(...) de gam-jotai-bubble.js
 * scale: la escala del modelo (createJotai) — para pasar alturas del mundo a `hipsY`
 */
export function createJotaiBrain({
  jotai, bubble, caption = null, nav = null, spots = {}, props = {},
  viewHeading = Math.PI / 4, reducedMotion = false, scale = 0.92,
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

  let duty = null;             // estación donde está "de servicio" (Fase 4) o null
  let perch = null;            // asiento de estación en el que está sentado ('bench')
  let perchHips = 0;           // hipsY de ese asiento
  let riding = false;          // arriba de la patineta (la estación mueve la tabla y él va encima)
  let pianoPhase = 'free';     // momento del Reto del piano (ver gam-piano.js onPhase)
  const said = new Set();      // frases de estación ya dichas en esta sesión

  /* Alturas del mundo → `hipsY` del modelo: la cadera queda ~3 cm sobre el
     asiento (sentado) o las ruedas sobre una superficie (parado encima). */
  const hipsForSeat = (topY) => (topY + 0.03) / scale - 0.40;
  const hipsForStand = (y) => y / scale;

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
    if (text && (!zoomedNow || duty === zoomedNow.id)) bubble.say(text, { duration: 2200 + text.length * 40 });
  }
  /** Frase de estación: una vez por sesión por clave. */
  function sayOnce(key) {
    if (!key || said.has(key)) return;
    said.add(key);
    say(line(key));
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

  /** Corta la rutina en curso y deja el cuerpo en un estado coherente.
   *  `keepPerch`: si está sentado en un asiento de estación, se queda sentado
   *  (al salir de la estación se levanta con calma, ver `leaveStation`); si
   *  no, baja de golpe al costado del asiento. */
  function interrupt(delay = AFTER_POKE, { keepPerch = false } = {}) {
    seq++;
    routine = null;
    target = null;
    gaze = null;
    showCaption(null);
    jotai.stop();
    jotai.stopClip();
    finishAnims();
    if (snap) {
      // estaba subiéndose o bajándose de un asiento: lo termina de golpe
      jotai.root.position.x = snap.x;
      jotai.root.position.z = snap.z;
      jotai.root.rotation.y = snap.heading;
      seated = snap.seated;
      if ('perch' in snap) perch = snap.perch;
      snap = null;
    }
    if (perch && !keepPerch) {
      const s = props.seats?.[perch]?.seat();
      if (s) jotai.root.position.set(s.side.x, 0, s.side.z);
      perch = null;
    }
    if (!keepPerch) { duty = null; riding = false; }
    if (!sleeping) {
      if (perch) jotai.setPose('sit', { hipsY: perchHips });
      else jotai.setPose(seated ? 'sit' : 'stand');
    }
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

  /* ── Asientos de estación (banqueta del piano) ── */
  /** Del spot de la estación al asiento: rueda al costado y se sube. */
  async function sitOn(name, ok) {
    const prop = props.seats?.[name];
    if (!prop) return false;
    const s = prop.seat();
    if (!(await jotai.followPath([s.side], { facing: s.heading })) || !ok()) return false;
    perchHips = hipsForSeat(s.topY);
    snap = { x: s.x, z: s.z, heading: s.heading, seated, perch: name };
    jotai.setPose('sit', { hipsY: perchHips });
    await jotai.slideTo(s, 520, s.heading);
    snap = null;
    if (!ok()) return false;
    perch = name;
    return true;
  }

  /** Se baja del asiento hacia el costado. */
  async function standFrom(ok) {
    const s = props.seats?.[perch]?.seat();
    if (!s) { perch = null; jotai.setPose('stand'); return true; }
    snap = { x: s.side.x, z: s.side.z, heading: s.heading, seated, perch: null };
    jotai.setPose('stand');
    await jotai.slideTo(s.side, 480, s.heading);
    snap = null;
    if (!ok()) return false;
    perch = null;
    return true;
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
    report('routine_night');
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
    report('routine_dawn');
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
    report('skip_scene', { routine: which });
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
      report('wake');
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
      report('tickle');
      speak('tickle', 'confused', 'giggle');
      return;
    }
    if (pokes.length === 1) report('poke');   // 1 por racha de toques, no por cada click
    if (!greeted) { markGreeted(); speak('hello', 'greeting', 'wave'); return; }
    speak('poke', 'greeting', pokes.length === 1 ? 'wave' : 'nod');
  }

  /** Pose base de la estación, a la altura del asiento si está sentado.
   *  `over` pisa articulaciones (ej. el brazo que se estira a una tecla). */
  function dutyPose(name, over = null) {
    const o = { ...(over || {}), ...(perch ? { hipsY: perchHips } : {}) };
    jotai.setPose(name, Object.keys(o).length ? o : null);
  }

  /** Señala `world` con el brazo del lado en que queda y lo mira. */
  function pointAt(world) {
    if (!world) return;
    const local = jotai.root.worldToLocal(world.clone());
    gaze = world;
    gazeUntil = clock + 1900;
    jotai.setFace('pointing', 1900);
    jotai.play(local.x >= 0 ? 'pointL' : 'pointR');
  }

  /** Estación con papel propio (`ROLES`): va a su spot, se sienta o se
   *  arrima si hace falta y queda de servicio. Al salir del zoom,
   *  `leaveStation()` lo levanta y lo devuelve a lo suyo. */
  function enterStation(f) {
    const role = ROLES[f.id];
    interrupt(AFTER_POKE);
    run('station', async (ok) => {
      if (!(await travel(f.id, ok)) || !ok()) return;
      const sp = spots[f.id];
      if (role.seat) {
        if (!(await sitOn(role.seat, ok))) return;
      } else if (role.near && sp?.look) {
        gaze = sp.look;
        gazeUntil = Infinity;
        jotai.setPose(role.pose);
        const near = { x: sp.x + (sp.look.x - sp.x) * role.near, z: sp.z + (sp.look.z - sp.z) * role.near };
        await jotai.slideTo(near, 500, sp.heading);
        if (!ok()) return;
      }
      if (role.faceCam && !(await jotai.faceTo(f.view ?? f.rotY ?? 0))) return;
      if (!ok()) return;
      duty = f.id;
      report('station', { station: f.id });
      pianoPhase = 'free';
      dutyPose(role.pose);
      jotai.setFace(role.face, 1800);
      if (role.clip) jotai.play(role.clip, { loop: !!role.loop });
      if (role.point) pointAt(sp?.look);
      sayOnce(role.line);
    });
  }

  /** Sale del zoom de una estación: se levanta (si estaba sentado) y vuelve. */
  function leaveStation() {
    const wasPerch = perch;
    const was = duty;
    const wasRiding = riding;
    interrupt(AFTER_POKE, { keepPerch: true });
    duty = null;
    riding = false;
    if (wasPerch) run('leave', (ok) => standFrom(ok));
    else if (wasRiding && spots[was]) {
      // se salió montado en la patineta: se baja y vuelve rodando a su lugar
      jotai.setPose('stand');
      run('leave', (ok) => travel(was, ok));
    }
    else if (was && ROLES[was]?.near && spots[was]) {
      // estaba arrimado (Pukis): vuelve a su spot, que está en la grilla
      const sp = spots[was];
      run('leave', () => jotai.slideTo(sp, 450, sp.heading));
    }
  }

  /** Puerta: saluda con la mano antes de irse (no demora el cambio de modo). */
  function farewell(f) {
    if (sleeping) return;
    report('farewell');
    interrupt(AFTER_POKE);
    duty = f.id;   // así el globo no se oculta durante el zoom a la puerta
    faceViewer();
    speak('bye', 'greeting', 'wave');
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
    if (STATION_IDS.has(f.id)) { enterStation(f); return; }
    if (f.kind === 'exit') { farewell(f); return; }
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

  /** Patineta: un truco que nunca le sale (la estación anima la tabla). */
  function skateBail(variant) {
    riding = false;
    report('skate_bail', { variant });
    run('skate', async (ok) => {
      const board = { x: jotai.root.position.x, z: jotai.root.position.z };
      const h = jotai.root.rotation.y;
      if (variant === 'shoot') {
        // la tabla sale disparada y él cae sentado
        jotai.setPose('fallSit');
        jotai.setFace('confused', 2400);
        emit('✦', '#ffd23f', { size: 0.26, rise: 0.4, life: 1.4 });
        await sleep(1400);
        if (!ok()) return;
        jotai.setPose('stand');
        await jotai.play('dust');
      } else if (variant === 'wobble') {
        // tambalea y se baja a tiempo
        await jotai.play('wobble');
        if (!ok()) return;
        jotai.setPose('stand');
        jotai.setFace('confused', 1800);
        emit('💦', '#7ad7ff', { size: 0.24, rise: 0.4, life: 1.3 });
        await sleep(700);
      } else {
        // se agacha, salta… y la tabla no se despega
        await jotai.play('hop');
        if (!ok()) return;
        jotai.setFace('confused', 1800);
        emit('💦', '#7ad7ff', { size: 0.24, rise: 0.4, life: 1.3 });
        await sleep(500);
      }
      if (!ok()) return;
      if (Math.random() < 0.5) say(line('skate_bail'));
      // de vuelta arriba de la tabla
      jotai.setPose('ride', { hipsY: rideHips });
      await jotai.slideTo(board, 300, h);
      if (ok()) riding = true;
    });
  }
  let rideHips = 0;

  /** Eventos de la estación activa (`c.cue` en gam-stations.js). Solo cuenta
   *  si JotAI ya está de servicio en esa estación. */
  function cue(evt, data = {}) {
    const station = CUE_STATION[evt.split(':')[0]];
    if (sleeping || !station || duty !== station) return;
    switch (evt) {
      case 'piano:key': {
        gaze = data.world || null;
        gazeUntil = clock + 600;
        // en el turno del visitante solo mira; en la demo y en Libre "toca":
        // la mano del lado de la tecla se estira hacia ella (sin IK: hombro
        // abierto según qué tan al costado está) y el torso se gira un poco
        if (pianoPhase === 'turn' || !data.world) break;
        const lx = jotai.root.worldToLocal(data.world.clone()).x;   // +x = su izquierda
        const k = Math.max(-1, Math.min(1, lx / 0.55));
        const left = k >= 0;
        const reach = Math.abs(k);
        dutyPose('pianoSit', {
          torso: [0.22, k * 0.35, 0],
          shoulderL: [-1.05 - (left ? reach * 0.2 : 0), 0, 0.15 + (left ? reach * 0.55 : 0)],
          shoulderR: [-1.05 - (!left ? reach * 0.2 : 0), 0, -0.15 - (!left ? reach * 0.55 : 0)],
        });
        jotai.play(left ? 'pianoKeyL' : 'pianoKeyR');
        break;
      }
      case 'piano:phase':
        pianoPhase = data.phase;
        if (data.phase === 'demo') jotai.setFace('thinking', 1500);
        else if (data.phase === 'turn') jotai.setFace('listening', 2500);
        else if (data.phase === 'round') { jotai.setFace('success', 1200); jotai.play('nod'); }
        else if (data.phase === 'end') {
          jotai.setFace(data.score >= 5 ? 'success' : 'confused', 2000);
          if (data.score >= 5) jotai.play('nod');
          say(line(data.score >= 5 ? 'piano_win' : 'piano_fail'));
        }
        break;
      case 'guitar:strum':
        jotai.play('strum');
        break;
      case 'guitar:end':
        jotai.setFace('success', 1600);
        break;
      case 'chess:think':
        dutyPose('chin');
        jotai.setFace('thinking', 0);
        break;
      case 'chess:move':
        dutyPose('chessStand');
        jotai.setFace('idle');
        gaze = data.world || null;
        gazeUntil = clock + 1000;
        jotai.play(data.left ? 'reachL' : 'reachR');
        break;
      case 'chess:end':
        report('chess_end', { winner: data.winner || 'draw' });
        dutyPose('chessStand');
        if (data.winner === 'b') { jotai.setFace('success', 2600); jotai.play('nod'); say(line('chess_win')); }
        else if (data.winner === 'w') { jotai.setFace('confused', 2600); jotai.play('scratch'); say(line('chess_lose')); }
        break;
      case 'juggle:mode':
        if (data.mode === 'watch') { dutyPose('juggle'); jotai.play('juggleHands', { loop: true }); }
        else { jotai.stopClip(); dutyPose('stand'); jotai.setFace('listening', 1500); }
        break;
      case 'juggle:catch':
        jotai.play('nod');
        break;
      case 'juggle:fail':
        jotai.setFace('confused', 1500);
        emit('✦', '#ff8a3d', { size: 0.22, rise: 0.35, life: 1.1 });
        say(line('juggle_drop'));
        break;
      case 'skate:mount':
        rideHips = hipsForStand(data.deckY || 0);
        run('skate', async (ok) => {
          jotai.setPose('ride', { hipsY: rideHips });
          jotai.setFace('greeting', 1500);
          if (!(await jotai.slideTo(data, 600, data.heading)) || !ok()) return;
          riding = true;
        });
        break;
      case 'skate:pos':
        if (riding) {
          jotai.root.position.x = data.x;
          jotai.root.position.z = data.z;
          jotai.root.rotation.y = data.heading;
        }
        break;
      case 'skate:trick':
        if (riding) skateBail(data.variant);
        break;
      case 'skate:dismount': {
        riding = false;
        const sp = spots.skateboard;
        run('skate', async () => {
          jotai.setPose('stand');
          if (sp) await jotai.slideTo(sp, 500, sp.heading);
        });
        break;
      }
      case 'medals:pick':
      case 'book:pick':
        pointAt(data.world);
        break;
      case 'lumbre:shot':
        jotai.play('nod');
        break;
      case 'pukis:pet':
        jotai.setFace('success', 1500);
        if (!jotai.busy) jotai.play('pet');
        break;
      default:
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
      // se sale de una estación con rol propio: se levanta y vuelve a lo suyo
      else if (was && (STATION_IDS.has(was.id) || duty) && !seated && !sleeping) leaveStation();
      else if (was && phase === 'night' && !sleeping) nextAt = Math.max(nextAt, clock + BACK_TO_SLEEP * 0.8);
      showCaption(captionKey);   // se oculta con zoom, vuelve al salir
    }

    if (zoomed && duty !== zoomed.id) {
      bubble.hide();      // con la cámara en un objeto el globo quedaría fuera de cuadro (salvo de servicio ahí)
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
    if (gaze && now < gazeUntil) look = gaze;
    else if (zoomed && focusLook) look = focusLook;
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
    get duty() { return duty; },        // estación donde está de servicio (o null)
    get riding() { return riding; },
    get moving() { return jotai.moving; },
  };
}
