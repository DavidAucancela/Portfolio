/**
 * gam-jotai.js — JotAI como personaje 3D del cuarto de .gam (Fase 1 de
 * docs/gam-jotai-plan.md).
 *
 * Todo el modelo sale de código (mismo criterio que el resto del diorama),
 * calcado del render de referencia `public/images/jotai/body.png`: cabeza
 * cuadrada con ojos LED en aro, cuello de resorte, torso con placa "JotAI",
 * brazos segmentados (azul/naranja) y piernas cortas que terminan en RUEDAS
 * — se desplaza rodando, así que no hace falta ciclo de caminata.
 *
 * Rig = jerarquía de Groups con nombre (`JOINTS`). Las animaciones son poses
 * por articulación (`{ shoulderR: [rx, ry, rz] }`) mezcladas con
 * amortiguación exponencial, y clips = secuencias de poses con tiempos. Por
 * encima de la pose se aplican capas de "vida": parpadeo, respiración,
 * antena, mirada (a un objetivo o errante) y caras por estado (las mismas
 * del widget de ia-mascot.js + `sleeping`).
 *
 * Convención local: origen en el piso entre las dos ruedas, frente a +z.
 * La izquierda del personaje (sufijo L) está en +x.
 *
 * Locomoción (Fase 2): `followPath(puntos, { facing })` recorre un camino
 * de gam-jotai-nav.js rodando — gira en el lugar, acelera, frena antes de
 * los quiebres, inclina el torso y hace girar las ruedas por la distancia
 * recorrida — y al final se alinea con `facing`. Con reduced-motion corta
 * directo al destino.
 *
 * API: createJotai({ reducedMotion, lite, scale }) →
 *   { root, meshes, setFace(name, holdMs?), play(clip) → Promise,
 *     setLookTarget(vec3|null), setTalking(bool), headTop(out?),
 *     headWorld(out?), followPath(pts, { facing }) → Promise<bool>,
 *     faceTo(rad) → Promise<bool>, slideTo({x,z}, ms, heading) → Promise<bool>,
 *     stop(), setPose(name), play(clip, { loop }), stopClip(), moving, busy,
 *     face, update(now, dt), dispose() }
 *
 * Fase 3: poses `sit` / `type` / `sleepDesk` / `crouch`, clips `stretch`
 * (cuello de resorte al máximo) / `typing` (loop) / `pet` / `startle`, cara
 * `yawn`. `slideTo` = tramos cortos fuera de la grilla (subirse a la silla).
 *
 * Fase 4 (estaciones): poses `pianoSit` / `chessSit` / `chin` / `guitarHold`
 * / `juggle` / `ride` / `fallSit`, clips `reachL/R`, `scratch`, `strum`,
 * `juggleHands` (loop), `pointL/R`, `salute`, `bob` (loop), `hop`, `wobble`,
 * `dust`. `setPose(name, { hipsY })` sienta a otra altura y `handsWorld()`
 * da las palmas en el mundo.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORS = {
  silver: 0xbac0c8,
  head:   0x8f959d,
  dark:   0x2c3036,
  blue:   0x2f6fd0,
  orange: 0xf07b2a,
  wood:   0xa0673a,
  tire:   0x1c1e22,
  led:    0x38c8ff,
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
/** Diferencia angular más corta b→a, en (−π, π]. */
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/* LOCOMOCIÓN — rueda, no camina. Velocidades en unidades del mundo por
   segundo. Antes de rodar gira sobre sí mismo hacia el tramo; en tramos
   seguidos casi rectos (< SHARP rad de quiebre) no frena, en quiebres
   fuertes frena hasta casi 0 y vuelve a girar. */
const MOVE = { vmax: 1.3, vmin: 0.12, accel: 2.4, decel: 2.2, turnRate: 5.5, sharp: 0.6 };
const WHEEL_R = 0.07;      // radio de la rueda (unidades del modelo)
const WHEEL_TRACK = 0.1;   // media trocha: distancia de cada rueda al centro

/* ────────────────────────────────────────────────────
   POSES — [rx, ry, rz] por articulación; lo que no aparece vale 0.
   Brazos: cuelgan en -y desde el hombro. rz > 0 abre el brazo izquierdo
   (+x) hacia afuera, rz < 0 el derecho; rx < 0 lleva el brazo/antebrazo
   hacia adelante (+z). `hipsY` (número) sube/baja la cadera.
──────────────────────────────────────────────────── */
const STAND_ARMS = {
  shoulderL: [0.05, 0, 0.12], shoulderR: [0.05, 0, -0.12],
  elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0],
};
/* Sentado en la silla del escritorio: muslos adelante, canillas abajo y la
   cadera subida hasta el asiento (≈0.6 u de mundo; ver `chair` en la escena). */
const SIT_LEGS = { hipL: [-1.45, 0, 0], hipR: [-1.45, 0, 0], kneeL: [1.45, 0, 0], kneeR: [1.45, 0, 0], hipsY: 0.285 };
/* Brazos sobre el escritorio (trackpad): el torso se inclina para llegar. */
const TYPE_ARMS = {
  torso: [0.32, 0, 0],
  shoulderL: [-1.22, 0, 0.12], shoulderR: [-1.22, 0, -0.12],
  elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0],
};
/* Frente al piano: brazos adelante y un poco más abajo que `type` (el
   teclado del piano queda más bajo que el escritorio) — de pie, sin banqueta
   todavía (ver Fase 4 §11 del plan). */
const PIANO_ARMS = {
  torso: [0.22, 0, 0],
  shoulderL: [-1.05, 0, 0.15], shoulderR: [-1.05, 0, -0.15],
  elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0],
};
/* `neckS` (número) estira el cuello de resorte: la escala extra en Y. */
const POSES = {
  stand: { ...STAND_ARMS },
  sit: { ...STAND_ARMS, ...SIT_LEGS },
  type: { ...SIT_LEGS, ...TYPE_ARMS },
  piano: { ...PIANO_ARMS },
  // dormido sobre el escritorio: brazos cruzados (antebrazos hacia adentro) y la cabeza encima
  sleepDesk: {
    ...SIT_LEGS,
    torso: [0.55, 0, 0], head: [0.35, 0, 0.18],
    shoulderL: [-1.3, 0, 0.35], shoulderR: [-1.3, 0, -0.35],
    elbowL: [0, 0, -1.35], elbowR: [0, 0, 1.35],
  },
  // agachado junto a Pukis: rodillas flexionadas (la cadera baja para que las ruedas sigan en el piso)
  crouch: {
    ...STAND_ARMS,
    hipL: [-0.6, 0, 0], hipR: [-0.6, 0, 0], kneeL: [1.2, 0, 0], kneeR: [1.2, 0, 0],
    hipsY: -0.055, torso: [0.4, 0, 0],
  },
  /* ── Fase 4: estaciones ── */
  // sentado al piano (banqueta): piernas de `sit` + brazos al teclado; la altura
  // del asiento la pasa la escena (`setPose('pianoSit', { hipsY })`)
  pianoSit: { ...SIT_LEGS, ...PIANO_ARMS },
  // sentado al ajedrez: manos sobre las rodillas, atento al tablero
  chessSit: {
    ...SIT_LEGS, torso: [0.18, 0, 0],
    shoulderL: [-0.75, 0, 0.18], shoulderR: [-0.75, 0, -0.18], elbowL: [-0.55, 0, 0], elbowR: [-0.55, 0, 0],
  },
  // pensando (turno de la IA): mano derecha al mentón
  chin: {
    ...SIT_LEGS, torso: [0.22, 0, 0], head: [0.12, 0, -0.08],
    shoulderL: [-0.75, 0, 0.18], elbowL: [-0.55, 0, 0],
    shoulderR: [-1.15, 0, -0.32], elbowR: [-2.0, 0, 0.35], wristR: [0.4, 0, 0],
  },
  // guitarra en brazos: izquierda arriba en el mástil, derecha cruzada sobre la boca
  guitarHold: {
    torso: [0.08, 0, 0],
    shoulderL: [-1.0, 0, 0.75], elbowL: [-0.9, 0, 0], wristL: [0, 0, 0.2],
    shoulderR: [-0.75, 0, -0.1], elbowR: [-1.35, 0, 0.5],
  },
  // malabares: antebrazos adelante y arriba, manos separadas
  juggle: {
    shoulderL: [-0.3, 0, 0.3], shoulderR: [-0.3, 0, -0.3],
    elbowL: [-1.15, 0, 0], elbowR: [-1.15, 0, 0], head: [-0.2, 0, 0],
  },
  // sobre la patineta: rodillas un poco flexionadas y brazos abiertos para el equilibrio
  ride: {
    hipL: [-0.3, 0, 0], hipR: [-0.3, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0],
    shoulderL: [0, 0, 1.25], shoulderR: [0, 0, -1.25], elbowL: [0, 0, 0.25], elbowR: [0, 0, -0.25],
    torso: [0.12, 0, 0],
  },
  // se cayó sentado al piso (la cadera baja hasta casi tocar el suelo)
  fallSit: {
    hipL: [-1.45, 0, 0.15], hipR: [-1.45, 0, -0.15], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [0.5, 0, 0.5], shoulderR: [0.5, 0, -0.5], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0],
    torso: [-0.2, 0, 0], hipsY: -0.27,
  },
};

/* CLIPS — [ms, pose] ; `{}` = volver a la pose base. Se interpolan con
   smoothstep entre claves y terminan siempre en la pose base (salvo los que
   se tocan en loop, cuya última clave es igual a la primera). Las
   articulaciones que un clip no nombra siguen la pose base, y `hipsY` /
   `neckS` de un clip se SUMAN a los de la base: así saludar o reírse
   sentado no lo baja de la silla.
   Saludo: brazo derecho afuera (hombro rz −1.9 ≈ un poco sobre la horizontal)
   y el antebrazo apuntando arriba (codo rz ≈ −π − hombro), oscilando a los
   lados de la vertical. rx < 0 lo adelanta un poco para que no quede detrás
   del torso visto desde la cámara isométrica. */
const WAVE_UP = { shoulderR: [-0.35, 0, -1.9], head: [0, 0, 0.12] };
const STRETCH_UP = {
  shoulderL: [-0.25, 0, 2.75], shoulderR: [-0.25, 0, -2.75], elbowL: [0, 0, 0], elbowR: [0, 0, 0],
  torso: [-0.12, 0, 0], head: [-0.3, 0, 0], neckS: 1.4, hipsY: 0.02,
};
const TYPE_KEYS = { shoulderL: TYPE_ARMS.shoulderL, shoulderR: TYPE_ARMS.shoulderR };
const PET_A = { shoulderR: [-0.95, 0, -0.18], elbowR: [-0.4, 0, 0] };
const PET_B = { shoulderR: [-1.25, 0, -0.18], elbowR: [-0.1, 0, 0] };
const CLIPS = {
  wave: [
    [0, {}],
    [280, { ...WAVE_UP, elbowR: [0, 0, -1.55] }],
    [560, { ...WAVE_UP, elbowR: [0, 0, -0.85] }],
    [840, { ...WAVE_UP, elbowR: [0, 0, -1.55] }],
    [1120, { ...WAVE_UP, elbowR: [0, 0, -0.85] }],
    [1400, { ...WAVE_UP, elbowR: [0, 0, -1.3] }],
    [1850, {}],
  ],
  nod: [
    [0, {}],
    [180, { head: [0.22, 0, 0] }],
    [360, { head: [-0.05, 0, 0] }],
    [540, { head: [0.18, 0, 0] }],
    [800, {}],
  ],
  // cosquillas: se encoge, brazos al pecho y se sacude
  giggle: [
    [0, {}],
    [160, { shoulderL: [-0.9, 0, 0.35], shoulderR: [-0.9, 0, -0.35], elbowL: [-1.5, 0, 0], elbowR: [-1.5, 0, 0], torso: [0.1, 0.18, 0], hipsY: -0.03 }],
    [300, { shoulderL: [-0.9, 0, 0.35], shoulderR: [-0.9, 0, -0.35], elbowL: [-1.5, 0, 0], elbowR: [-1.5, 0, 0], torso: [0.1, -0.18, 0], hipsY: -0.03 }],
    [440, { shoulderL: [-0.9, 0, 0.35], shoulderR: [-0.9, 0, -0.35], elbowL: [-1.5, 0, 0], elbowR: [-1.5, 0, 0], torso: [0.1, 0.18, 0], hipsY: -0.03 }],
    [580, { shoulderL: [-0.9, 0, 0.35], shoulderR: [-0.9, 0, -0.35], elbowL: [-1.5, 0, 0], elbowR: [-1.5, 0, 0], torso: [0.1, -0.18, 0], hipsY: -0.03 }],
    [720, { shoulderL: [-0.9, 0, 0.35], shoulderR: [-0.9, 0, -0.35], elbowL: [-1.5, 0, 0], elbowR: [-1.5, 0, 0], torso: [0.1, 0.1, 0], hipsY: -0.02, head: [0, 0, 0.2] }],
    [1100, {}],
  ],
  // se estira: brazos arriba, cuello de resorte al máximo, un vaivén a los lados
  stretch: [
    [0, {}],
    [650, STRETCH_UP],
    [1400, { ...STRETCH_UP, torso: [-0.12, 0, 0.1] }],
    [2100, { ...STRETCH_UP, torso: [-0.12, 0, -0.1] }],
    [2600, STRETCH_UP],
    [3200, {}],
  ],
  // teclea: los antebrazos alternan sobre el trackpad (loop; el torso lo pone la pose `type`)
  typing: [
    [0, { ...TYPE_KEYS, elbowL: [-0.62, 0, 0], elbowR: [-0.3, 0, 0], wristL: [0.35, 0, 0] }],
    [170, { ...TYPE_KEYS, elbowL: [-0.3, 0, 0], elbowR: [-0.62, 0, 0], wristR: [0.35, 0, 0] }],
    [340, { ...TYPE_KEYS, elbowL: [-0.62, 0, 0], elbowR: [-0.3, 0, 0], wristL: [0.35, 0, 0] }],
  ],
  // toca una tecla — sin IK: solo la mano del lado que sonó baja un poco (sobre la pose `piano`)
  pianoKeyL: [
    [0, { elbowL: [-0.68, 0, 0], wristL: [0.3, 0, 0] }],
    [140, {}],
  ],
  pianoKeyR: [
    [0, { elbowR: [-0.68, 0, 0], wristR: [0.3, 0, 0] }],
    [140, {}],
  ],
  // acaricia con la mano derecha, de adelante hacia atrás (sobre la pose `crouch`)
  pet: [
    [0, {}],
    [350, PET_A], [700, PET_B], [1050, PET_A], [1400, PET_B], [1750, PET_A],
    [2150, {}],
  ],
  /* ── Fase 4: estaciones ── */
  // estira el brazo hacia una pieza del tablero (antes de que se mueva)
  reachL: [[0, {}], [280, { shoulderL: [-1.45, 0, 0.1], elbowL: [-0.15, 0, 0], torso: [0.32, 0, 0] }], [700, { shoulderL: [-1.45, 0, 0.1], elbowL: [-0.15, 0, 0], torso: [0.32, 0, 0] }], [1000, {}]],
  reachR: [[0, {}], [280, { shoulderR: [-1.45, 0, -0.1], elbowR: [-0.15, 0, 0], torso: [0.32, 0, 0] }], [700, { shoulderR: [-1.45, 0, -0.1], elbowR: [-0.15, 0, 0], torso: [0.32, 0, 0] }], [1000, {}]],
  // se rasca la cabeza (perdió)
  scratch: [
    [0, {}],
    [300, { shoulderR: [-0.6, 0, -1.9], elbowR: [0, 0, -1.8], head: [0, 0, 0.18] }],
    [500, { shoulderR: [-0.6, 0, -1.9], elbowR: [0, 0, -2.1], head: [0, 0, 0.18] }],
    [700, { shoulderR: [-0.6, 0, -1.9], elbowR: [0, 0, -1.8], head: [0, 0, 0.18] }],
    [900, { shoulderR: [-0.6, 0, -1.9], elbowR: [0, 0, -2.1], head: [0, 0, 0.18] }],
    [1300, {}],
  ],
  // rasguea: el antebrazo derecho baja y sube sobre la boca de la guitarra
  strum: [[0, {}], [90, { elbowR: [-1.1, 0, 0.75], torso: [0.1, 0.06, 0] }], [220, {}]],
  // malabares (loop): las manos suben y bajan alternadas, como lanzando
  juggleHands: [
    [0, { elbowL: [-1.25, 0, 0], elbowR: [-0.85, 0, 0] }],
    [400, { elbowL: [-0.85, 0, 0], elbowR: [-1.25, 0, 0] }],
    [800, { elbowL: [-1.25, 0, 0], elbowR: [-0.85, 0, 0] }],
  ],
  // señala con el brazo estirado (izquierdo / derecho)
  pointL: [[0, {}], [260, { shoulderL: [-1.4, 0, 0.35], elbowL: [-0.05, 0, 0], head: [0, 0.2, 0] }], [1500, { shoulderL: [-1.4, 0, 0.35], elbowL: [-0.05, 0, 0], head: [0, 0.2, 0] }], [1900, {}]],
  pointR: [[0, {}], [260, { shoulderR: [-1.4, 0, -0.35], elbowR: [-0.05, 0, 0], head: [0, -0.2, 0] }], [1500, { shoulderR: [-1.4, 0, -0.35], elbowR: [-0.05, 0, 0], head: [0, -0.2, 0] }], [1900, {}]],
  // saludo jedi: la mano derecha a la frente, una pequeña reverencia
  salute: [
    [0, {}],
    [300, { shoulderR: [-1.3, 0, -0.9], elbowR: [-1.9, 0, 0.6], head: [0.1, 0, 0] }],
    [900, { shoulderR: [-1.3, 0, -0.9], elbowR: [-1.9, 0, 0.6], head: [0.25, 0, 0], torso: [0.25, 0, 0] }],
    [1500, { shoulderR: [-1.3, 0, -0.9], elbowR: [-1.9, 0, 0.6], head: [0.1, 0, 0] }],
    [1900, {}],
  ],
  // menea la cabeza al ritmo (loop)
  bob: [[0, { head: [0.12, 0, 0.05] }], [300, { head: [-0.04, 0, -0.05] }], [600, { head: [0.12, 0, 0.05] }]],
  // patineta: se agacha y salta… y la tabla no se despega
  hop: [[0, {}], [260, { hipsY: -0.07, torso: [0.3, 0, 0] }], [420, { hipsY: 0.09, shoulderL: [0, 0, 1.6], shoulderR: [0, 0, -1.6] }], [640, { hipsY: -0.04 }], [900, {}]],
  // tambalea con los brazos como hélice
  wobble: [
    [0, {}],
    [180, { torso: [0.05, 0, 0.22], shoulderL: [0, 0, 2.0], shoulderR: [0, 0, -0.6] }],
    [380, { torso: [0.05, 0, -0.22], shoulderL: [0, 0, 0.6], shoulderR: [0, 0, -2.0] }],
    [580, { torso: [0.05, 0, 0.18], shoulderL: [0, 0, 2.0], shoulderR: [0, 0, -0.6] }],
    [780, { torso: [0.05, 0, -0.18], shoulderL: [0, 0, 0.6], shoulderR: [0, 0, -2.0] }],
    [1050, {}],
  ],
  // se sacude el polvo al levantarse
  dust: [[0, {}], [200, { shoulderL: [-0.4, 0, 0.1], elbowL: [-0.6, 0, -0.6], torso: [0.25, 0, 0] }], [400, { shoulderL: [-0.4, 0, 0.1], elbowL: [-0.2, 0, -0.6], torso: [0.25, 0, 0] }], [600, { shoulderL: [-0.4, 0, 0.1], elbowL: [-0.6, 0, -0.6], torso: [0.25, 0, 0] }], [900, {}]],
  // sobresalto: salta, brazos afuera, cabeza atrás
  startle: [
    [0, {}],
    [110, { hipsY: 0.07, shoulderL: [0, 0, 0.95], shoulderR: [0, 0, -0.95], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0], head: [-0.25, 0, 0] }],
    [330, { hipsY: 0.015, shoulderL: [0, 0, 0.7], shoulderR: [0, 0, -0.7], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0], head: [-0.1, 0, 0] }],
    [750, {}],
  ],
};

/* CARAS — mismos estados que el widget (ia-mascot.js) + sleeping.
   eye = apertura del ojo (scaleY), brows = [rotZ izq, rotZ der] y alto extra,
   led = intensidad del aro. */
const FACES = {
  idle:      { mouth: 'smile', eye: 1,    brows: [0, 0],        browY: 0,     led: 2.2 },
  greeting:  { mouth: 'grin',  eye: 1.08, brows: [0.12, -0.12], browY: 0.012, led: 2.8 },
  listening: { mouth: 'smile', eye: 1.05, brows: [0.08, -0.08], browY: 0.006, led: 2.4 },
  thinking:  { mouth: 'flat',  eye: 0.9,  brows: [0.25, 0.1],   browY: 0.004, led: 1.9 },
  talking:   { mouth: 'smile', eye: 1,    brows: [0.05, -0.05], browY: 0.004, led: 2.4 },
  success:   { mouth: 'grin',  eye: 0.55, brows: [0.18, -0.18], browY: 0.01,  led: 3.0 },
  confused:  { mouth: 'wavy',  eye: 1,    brows: [-0.35, 0.3],  browY: 0.006, led: 2.0 },
  pointing:  { mouth: 'smile', eye: 1,    brows: [0.1, -0.1],   browY: 0.006, led: 2.4 },
  sleeping:  { mouth: 'o',     eye: 0.1,  brows: [-0.12, 0.12], browY: -0.006, led: 0.6 },
  yawn:      { mouth: 'open',  eye: 0.3,  brows: [-0.15, 0.15], browY: -0.004, led: 1.5 },
};

/** Boca LED en canvas (transparente, trazo cian como los ojos) — se repinta al
 *  cambiar de forma. Oscura se perdía sobre la cara gris con la luz del cuarto. */
function makeMouth() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  let current = null;
  function paint(shape) {
    if (shape === current) return;
    current = shape;
    g.clearRect(0, 0, 128, 64);
    g.strokeStyle = g.fillStyle = '#6fdcff';
    g.lineWidth = 13;   // grueso a propósito: la boca mide ~0.12 u en el mundo
    g.lineCap = 'round';
    g.beginPath();
    switch (shape) {
      case 'grin':
        g.moveTo(24, 20); g.quadraticCurveTo(64, 70, 104, 20); g.closePath(); g.fill();
        break;
      case 'flat':
        g.moveTo(40, 34); g.lineTo(88, 34); g.stroke();
        break;
      case 'wavy':
        g.moveTo(30, 36);
        g.bezierCurveTo(44, 22, 54, 48, 64, 34);
        g.bezierCurveTo(74, 20, 84, 48, 98, 32);
        g.stroke();
        break;
      case 'o':
        g.ellipse(64, 34, 9, 7, 0, 0, Math.PI * 2); g.fill();
        break;
      case 'open':
        g.ellipse(64, 32, 22, 16, 0, 0, Math.PI * 2); g.fill();
        break;
      case 'openSmall':
        g.ellipse(64, 30, 16, 9, 0, 0, Math.PI * 2); g.fill();
        break;
      default: // smile
        g.moveTo(30, 22); g.quadraticCurveTo(64, 58, 98, 22); g.stroke();
    }
    texture.needsUpdate = true;
  }
  return { texture, paint };
}

/** Placa del pecho: "JotAI" en azul sobre aluminio + filete. */
function makeChestTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 112;
  const g = c.getContext('2d');
  g.fillStyle = '#c3c8cf';
  g.fillRect(0, 0, 256, 112);
  g.strokeStyle = '#2f6fd0';
  g.lineWidth = 5;
  g.strokeRect(10, 10, 236, 92);
  g.fillStyle = '#2458b8';
  g.font = 'bold 60px "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('JotAI', 128, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSerialTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2d33';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#e8ecf2';
  g.font = 'bold 15px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('MODEL: JOTAI · S/N 001', 128, 17);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Hélice del cuello de resorte. */
class Helix extends THREE.Curve {
  constructor(r, h, turns) { super(); this.r = r; this.h = h; this.turns = turns; }
  getPoint(t, out = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    return out.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r);
  }
}

export function createJotai({ reducedMotion = false, lite = false, scale = 0.92 } = {}) {
  const seg = lite ? 12 : 20;
  const root = new THREE.Group();
  root.name = 'jotai';
  root.scale.setScalar(scale);
  const meshes = [];

  /* ── Materiales compartidos ── */
  const mats = new Map();
  function mat(color, extra = {}) {
    const key = `${color}|${JSON.stringify(extra)}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.45, ...extra }));
    return mats.get(key);
  }
  const ledMat = new THREE.MeshStandardMaterial({ color: COLORS.led, emissive: COLORS.led, emissiveIntensity: FACES.idle.led, roughness: 0.3 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x0b2a44, emissive: 0x2a8ee0, emissiveIntensity: 0.55, roughness: 0.3 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x03070c });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 1.6, roughness: 0.4 });
  const mouth = makeMouth();
  const mouthMat = new THREE.MeshBasicMaterial({ map: mouth.texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  mouthMat.color.setScalar(1.3);   // > 1: brilla un poco con el bloom, como los ojos

  const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) * 0.45));
  const cyl = (r, h, rb = r) => new THREE.CylinderGeometry(r, rb, h, seg);
  const sph = (r) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));

  function part(parent, geometry, material, x = 0, y = 0, z = 0, shadow = false) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.userData.jotai = true;
    parent.add(m);
    meshes.push(m);
    return m;
  }
  function joint(name, parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  /* ── Esqueleto + piezas (unidades del modelo: ~1.15 de alto antes de `scale`) ── */
  const J = {};
  J.hips = joint('hips', root, 0, 0.40, 0);
  part(J.hips, box(0.26, 0.07, 0.15), mat(COLORS.dark), 0, 0, 0);

  // Piernas → ruedas
  [['L', 1], ['R', -1]].forEach(([s, sx]) => {
    const hip = J[`hip${s}`] = joint(`hip${s}`, J.hips, sx * 0.09, -0.02, 0);
    part(hip, box(0.075, 0.15, 0.085), mat(COLORS.silver), 0, -0.075, 0, true);
    part(hip, cyl(0.042, 0.095), mat(COLORS.blue), 0, -0.14, 0).rotation.z = Math.PI / 2;
    const knee = J[`knee${s}`] = joint(`knee${s}`, hip, 0, -0.135, 0);
    part(knee, box(0.07, 0.12, 0.08), mat(COLORS.silver), 0, -0.06, 0, true);
    part(knee, box(0.076, 0.026, 0.086, 0.01), mat(COLORS.orange), 0, -0.035, 0);
    part(knee, box(0.1, 0.04, 0.11), mat(COLORS.dark), 0, -0.125, 0);
    const wheel = J[`wheel${s}`] = joint(`wheel${s}`, knee, sx * 0.012, -0.175, 0.01);
    const tire = part(wheel, cyl(0.07, 0.05), mat(COLORS.tire, { roughness: 0.85, metalness: 0 }), 0, 0, 0, true);
    tire.rotation.z = Math.PI / 2;
    const hub = part(wheel, cyl(0.036, 0.056), mat(COLORS.orange), 0, 0, 0);
    hub.rotation.z = Math.PI / 2;
    // radios: dan lectura de giro cuando rueda
    for (let i = 0; i < 3; i++) {
      const spoke = part(wheel, box(0.058, 0.012, 0.012, 0.004), mat(COLORS.silver), sx * 0.029, 0, 0);
      spoke.rotation.x = (i / 3) * Math.PI;
      spoke.rotation.y = Math.PI / 2;
    }
  });

  // Torso
  J.torso = joint('torso', J.hips, 0, 0.04, 0);
  part(J.torso, box(0.32, 0.3, 0.2, 0.04), mat(COLORS.silver), 0, 0.17, 0, true);
  part(J.torso, new THREE.PlaneGeometry(0.22, 0.096), new THREE.MeshStandardMaterial({ map: makeChestTexture(), roughness: 0.45, metalness: 0.3 }), 0, 0.19, 0.1015);
  part(J.torso, new THREE.PlaneGeometry(0.16, 0.02), new THREE.MeshStandardMaterial({ map: makeSerialTexture(), roughness: 0.5 }), 0, 0.105, 0.1015);
  part(J.torso, box(0.3, 0.03, 0.18, 0.01), mat(COLORS.wood, { roughness: 0.7, metalness: 0 }), 0, 0.325, 0);
  part(J.torso, cyl(0.06, 0.03), mat(COLORS.blue), 0, 0.345, 0);
  [-1, 1].forEach((sx) => part(J.torso, sph(0.012), mat(COLORS.dark), sx * 0.13, 0.05, 0.101)); // tornillos

  // Brazos: hombro → codo → muñeca → pinza
  [['L', 1], ['R', -1]].forEach(([s, sx]) => {
    const sh = J[`shoulder${s}`] = joint(`shoulder${s}`, J.torso, sx * 0.195, 0.27, 0);
    part(sh, sph(0.045), mat(COLORS.blue), 0, 0, 0, true);
    part(sh, cyl(0.03, 0.13), mat(COLORS.silver), 0, -0.08, 0, true);
    part(sh, cyl(0.033, 0.028), mat(COLORS.blue), 0, -0.04, 0);
    const el = J[`elbow${s}`] = joint(`elbow${s}`, sh, 0, -0.155, 0);
    part(el, sph(0.032), mat(COLORS.dark), 0, 0, 0);
    part(el, cyl(0.028, 0.12), mat(COLORS.silver), 0, -0.07, 0, true);
    part(el, cyl(0.031, 0.03), mat(COLORS.orange), 0, -0.025, 0);
    part(el, cyl(0.032, 0.02), mat(COLORS.wood, { roughness: 0.7, metalness: 0 }), 0, -0.118, 0);
    const wr = J[`wrist${s}`] = joint(`wrist${s}`, el, 0, -0.135, 0);
    part(wr, box(0.05, 0.035, 0.045, 0.01), mat(COLORS.dark), 0, -0.015, 0);
    [-0.017, 0.017].forEach((fx) => part(wr, box(0.012, 0.05, 0.02, 0.005), mat(COLORS.silver), fx, -0.055, 0.004));
    part(wr, box(0.012, 0.035, 0.018, 0.005), mat(COLORS.silver), 0, -0.045, 0.024).rotation.x = -0.4; // pulgar
  });

  // Cuello de resorte
  J.neck = joint('neck', J.torso, 0, 0.355, 0);
  const spring = part(J.neck, new THREE.TubeGeometry(new Helix(0.028, 0.07, 5), lite ? 40 : 80, 0.0065, 6, false), mat(COLORS.silver, { metalness: 0.8, roughness: 0.25 }), 0, 0, 0);

  // Cabeza
  J.head = joint('head', J.neck, 0, 0.075, 0);
  part(J.head, box(0.36, 0.27, 0.25, 0.055), mat(COLORS.head, { metalness: 0.5 }), 0, 0.135, 0, true);
  part(J.head, box(0.31, 0.22, 0.02, 0.03), mat(0x9ba1a9, { metalness: 0.45 }), 0, 0.14, 0.118); // placa de la cara
  const eyes = [];
  const pupils = [];
  [-1, 1].forEach((sx) => {
    const eye = joint(`eye${sx < 0 ? 'R' : 'L'}`, J.head, sx * 0.078, 0.15, 0.131);
    part(eye, new THREE.TorusGeometry(0.05, 0.011, 10, lite ? 24 : 36), ledMat, 0, 0, 0);
    part(eye, new THREE.CircleGeometry(0.045, lite ? 20 : 32), irisMat, 0, 0, -0.001);
    const pupil = joint('pupil', eye, 0, 0, 0);
    part(pupil, new THREE.CircleGeometry(0.02, 20), pupilMat, 0, 0, 0.001);
    part(pupil, new THREE.CircleGeometry(0.006, 10), glintMat, 0.009, 0.009, 0.002);
    eyes.push(eye);
    pupils.push(pupil);
  });
  const brows = [-1, 1].map((sx) => part(J.head, box(0.085, 0.017, 0.014, 0.006), mat(COLORS.blue), sx * 0.078, 0.228, 0.13));
  const mouthMesh = part(J.head, new THREE.PlaneGeometry(0.13, 0.065), mouthMat, 0, 0.058, 0.1295);
  [-1, 1].forEach((sx) => {
    part(J.head, cyl(0.066, 0.032), mat(COLORS.wood, { roughness: 0.7, metalness: 0 }), sx * 0.19, 0.14, 0).rotation.z = Math.PI / 2;
    part(J.head, cyl(0.034, 0.036), mat(COLORS.dark), sx * 0.19, 0.14, 0).rotation.z = Math.PI / 2;
  });
  J.antenna = joint('antenna', J.head, 0.11, 0.27, -0.05);
  part(J.antenna, cyl(0.006, 0.1), mat(COLORS.dark), 0, 0.05, 0);
  const tip = part(J.antenna, sph(0.017), tipMat, 0, 0.105, 0);
  mouthMesh.castShadow = false;
  spring.castShadow = false;

  /* ── Estado de animación ── */
  const JOINT_NAMES = ['hips', 'torso', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR', 'hipL', 'kneeL', 'hipR', 'kneeR'];
  const cur = {};
  JOINT_NAMES.forEach((n) => { cur[n] = [0, 0, 0]; });
  let curHipsY = 0;
  let curNeck = 0;
  let clockNow = performance.now();   // reloj del loop (el `now` del último update)
  let basePose = POSES.stand;
  let clip = null;          // { keys, t0, resolve, loop }

  let faceName = 'idle';
  let faceUntil = 0;
  const faceCur = { eye: 1, led: FACES.idle.led, browL: 0, browR: 0, browY: 0 };
  let talking = false;
  let talkNext = 0;

  let blinkStart = -1;
  let nextBlink = 1500;
  let pendingDouble = false;

  const lookTarget = new THREE.Vector3();
  let hasTarget = false;
  let gazeYaw = 0, gazePitch = 0;
  let wander = { yaw: 0, pitch: 0, next: 2000 };
  const tmp = new THREE.Vector3();

  function evalClip(now) {
    if (!clip) return null;
    const keys = clip.keys;
    let t = now - clip.t0;
    const end = keys[keys.length - 1][0];
    if (clip.loop) t %= Math.max(1, end);
    else if (t >= end) {
      const r = clip.resolve;
      clip = null;
      r?.();
      return null;
    }
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [ta, pa] = keys[i];
    const [tb, pb] = keys[i + 1];
    return { pa, pb, k: smooth(clamp((t - ta) / Math.max(1, tb - ta), 0, 1)) };
  }

  function poseValue(pose, name) {
    return pose[name] ?? basePose[name] ?? [0, 0, 0];
  }

  function setFace(name, holdMs = 0) {
    if (!FACES[name]) return;
    faceName = name;
    faceUntil = holdMs ? clockNow + holdMs : 0;
    if (!talking) mouth.paint(FACES[name].mouth);
  }

  /** Toca un clip (reemplaza al que estuviera sonando). `loop: true` lo
   *  repite hasta `stopClip()` o el próximo `play()`; la promesa resuelve
   *  al terminar o al ser reemplazado. */
  function play(name, { loop = false } = {}) {
    const keys = CLIPS[name];
    if (!keys || reducedMotion) return Promise.resolve();
    clip?.resolve?.();
    return new Promise((resolve) => { clip = { keys, t0: clockNow, resolve, loop }; });
  }
  function stopClip() {
    const r = clip?.resolve;
    clip = null;
    r?.();
  }

  /** Cambia la pose base (la transición la hace la misma amortiguación).
   *  `over` pisa valores de la pose — ej. `{ hipsY }` para un asiento de
   *  otra altura que la silla (banqueta del piano, banquito del ajedrez). */
  function setPose(name, over = null) {
    if (POSES[name]) basePose = over ? { ...POSES[name], ...over } : POSES[name];
  }

  /** Canal escalar (`hipsY` / `neckS`): el de la base + lo que sume el clip. */
  function channel(c, key) {
    const b = basePose[key] ?? 0;
    return c ? b + (c.pa[key] ?? 0) + ((c.pb[key] ?? 0) - (c.pa[key] ?? 0)) * c.k : b;
  }

  function setLookTarget(v) {
    hasTarget = !!v;
    if (v) lookTarget.copy(v);
  }

  function setTalking(on) {
    if (on === talking) return;
    talking = on;
    if (!on) mouth.paint(FACES[faceName].mouth);
  }

  function headWorld(out = new THREE.Vector3()) {
    return J.head.localToWorld(out.set(0, 0.15, 0.1));
  }
  function headTop(out = new THREE.Vector3()) {
    return J.head.localToWorld(out.set(0, 0.42, 0));
  }
  /** Palmas de las manos en el mundo (malabares, guitarra). */
  function handsWorld(outL = new THREE.Vector3(), outR = new THREE.Vector3()) {
    J.wristL.localToWorld(outL.set(0, -0.05, 0));
    J.wristR.localToWorld(outR.set(0, -0.05, 0));
    return { left: outL, right: outR };
  }

  /* ── Locomoción ──
     move = { pts, i, facing, phase: 'turn' | 'roll' | 'align', resolve }.
     La promesa resuelve true al llegar y false si otro followPath/stop la
     reemplaza — nunca rechaza, así el brain no deja rejections colgadas. */
  let move = null;
  let speed = 0, lastSpeed = 0, lean = 0, rollW = 0, rollDist = 0;

  function finishMove(ok) {
    const r = move?.resolve;
    move = null;
    r?.(ok);
  }

  function followPath(points = [], { facing = null } = {}) {
    if (move) finishMove(false);
    const pts = points.map((p) => ({ x: p.x, z: p.z }));
    if (pts.length && Math.hypot(pts[0].x - root.position.x, pts[0].z - root.position.z) < 0.02) pts.shift();
    if (reducedMotion) {
      // sin rodar: corte directo al destino, ya orientado
      const last = pts[pts.length - 1];
      if (last) {
        const prev = pts[pts.length - 2] || root.position;
        if (facing == null) root.rotation.y = Math.atan2(last.x - prev.x, last.z - prev.z);
        root.position.set(last.x, 0, last.z);
      }
      if (facing != null) root.rotation.y = facing;
      speed = 0;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      move = { pts, i: 0, facing, phase: pts.length ? 'turn' : 'align', resolve };
    });
  }

  const faceTo = (heading) => followPath([], { facing: heading });
  function stop() {
    if (move) { speed = 0; finishMove(false); }
    if (slide) { const r = slide.resolve; slide = null; r(false); }
  }

  /** Gira el cuerpo hacia `want` con la velocidad acotada; las ruedas giran
   *  en sentidos opuestos (giro sobre el eje). Devuelve el error restante. */
  function turnToward(want, dt) {
    const diff = angDiff(want, root.rotation.y);
    const mag = Math.min(Math.abs(diff), Math.max(0.6 * dt, Math.abs(diff) * damp(9, dt)), MOVE.turnRate * dt);
    const step = Math.sign(diff) * mag;
    root.rotation.y += step;
    const spin = step * (WHEEL_TRACK / WHEEL_R);
    J.wheelL.rotation.x -= spin;
    J.wheelR.rotation.x += spin;
    return Math.abs(diff) - mag;
  }

  function updateMove(dt) {
    lastSpeed = speed;
    if (!move) { speed = 0; return; }
    const p = root.position;

    if (move.phase === 'align') {
      if (move.facing == null || turnToward(move.facing, dt) < 0.02) finishMove(true);
      return;
    }

    const pts = move.pts;
    const wp = pts[move.i];
    const dx = wp.x - p.x, dz = wp.z - p.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);

    if (move.phase === 'turn') {
      speed = 0;
      if (dist < 0.01 || turnToward(want, dt) < 0.1) move.phase = 'roll';
      return;
    }

    // Distancia hasta donde tiene que frenar: fin del camino o próximo quiebre fuerte
    let rem = dist, dir = want;
    for (let k = move.i; k < pts.length - 1; k++) {
      const nx = pts[k + 1].x - pts[k].x, nz = pts[k + 1].z - pts[k].z;
      const next = Math.atan2(nx, nz);
      if (Math.abs(angDiff(next, dir)) > MOVE.sharp) break;
      rem += Math.hypot(nx, nz);
      dir = next;
    }
    const target = Math.max(MOVE.vmin, Math.min(MOVE.vmax, Math.sqrt(2 * MOVE.decel * rem)));
    speed = speed < target ? Math.min(target, speed + MOVE.accel * dt) : target;

    turnToward(want, dt);
    const step = Math.min(dist, speed * dt);
    if (dist > 1e-4) { p.x += (dx / dist) * step; p.z += (dz / dist) * step; }
    const roll = step / (WHEEL_R * scale);
    J.wheelL.rotation.x += roll;
    J.wheelR.rotation.x += roll;
    rollDist += step;

    if (dist - step < 0.01) {
      p.x = wp.x; p.z = wp.z;
      move.i++;
      if (move.i >= pts.length) {
        speed = 0;
        move.phase = 'align';
      } else {
        const n = pts[move.i];
        if (Math.abs(angDiff(Math.atan2(n.x - p.x, n.z - p.z), root.rotation.y)) > MOVE.sharp) move.phase = 'turn';
      }
    }
  }

  /* Deslizamiento corto fuera de la grilla (subirse a la silla, arrimarse a
     Pukis): interpola posición y rumbo con smoothstep; las ruedas giran por
     la distancia. Cancela un followPath en curso. */
  let slide = null;   // { fx, fz, tx, tz, fh, th, t0, ms, resolve }

  function slideTo(p, ms = 450, heading = root.rotation.y) {
    if (move) finishMove(false);
    slide?.resolve?.(false);
    if (reducedMotion) {
      slide = null;
      root.position.x = p.x; root.position.z = p.z; root.rotation.y = heading;
      return Promise.resolve(true);
    }
    const fh = root.rotation.y;
    return new Promise((resolve) => {
      slide = { fx: root.position.x, fz: root.position.z, tx: p.x, tz: p.z, fh, th: fh + angDiff(heading, fh), t0: null, ms, resolve };
    });
  }

  function updateSlide(now) {
    if (!slide) return;
    if (slide.t0 === null) slide.t0 = now;
    const u = smooth(clamp((now - slide.t0) / slide.ms, 0, 1));
    const px = root.position.x, pz = root.position.z;
    root.position.x = slide.fx + (slide.tx - slide.fx) * u;
    root.position.z = slide.fz + (slide.tz - slide.fz) * u;
    root.rotation.y = slide.fh + (slide.th - slide.fh) * u;
    const roll = Math.hypot(root.position.x - px, root.position.z - pz) / (WHEEL_R * scale);
    J.wheelL.rotation.x += roll;
    J.wheelR.rotation.x += roll;
    if (u >= 1) { const r = slide.resolve; slide = null; r(true); }
  }

  function update(now, dt) {
    clockNow = now;
    const k = reducedMotion ? 1 : damp(14, dt);
    if (!reducedMotion) { updateMove(dt); updateSlide(now); }

    /* 1. Pose base + clip, amortiguada */
    const c = evalClip(now);
    JOINT_NAMES.forEach((n) => {
      let target;
      if (c) {
        const a = poseValue(c.pa, n), b = poseValue(c.pb, n);
        target = [a[0] + (b[0] - a[0]) * c.k, a[1] + (b[1] - a[1]) * c.k, a[2] + (b[2] - a[2]) * c.k];
      } else {
        target = basePose[n] ?? [0, 0, 0];
      }
      const v = cur[n];
      for (let i = 0; i < 3; i++) v[i] += (target[i] - v[i]) * k;
      J[n].rotation.set(v[0], v[1], v[2]);
    });
    curHipsY += (channel(c, 'hipsY') - curHipsY) * k;
    curNeck += (channel(c, 'neckS') - curNeck) * (reducedMotion ? 1 : damp(8, dt));

    /* 2. Vida continua (respiración, balanceo, antena) */
    const alive = !reducedMotion && faceName !== 'sleeping';
    const breath = reducedMotion ? 0 : Math.sin(now * 0.00175);   // ~3.6 s
    J.hips.position.y = 0.40 + curHipsY;
    J.torso.position.y = 0.04 + breath * 0.004;

    /* 2b. Locomoción: se inclina hacia adelante al acelerar/rodar y hacia
       atrás al frenar; brazos un poco atrás para equilibrarse, y un vaivén
       mínimo de la cadera según la distancia (el piso no es perfecto). */
    if (!reducedMotion) {
      const accel = dt > 0 ? (speed - lastSpeed) / dt : 0;
      const leanTarget = clamp(accel * 0.045, -0.14, 0.12) + speed * 0.05;
      lean += (leanTarget - lean) * damp(7, dt);
      rollW += (speed / MOVE.vmax - rollW) * damp(5, dt);
      J.torso.rotation.x += lean;
      J.head.rotation.x -= lean * 0.6;     // la cabeza compensa: sigue mirando al frente
      J.shoulderL.rotation.x += 0.28 * rollW;
      J.shoulderR.rotation.x += 0.28 * rollW;
      J.shoulderL.rotation.z += 0.1 * rollW;
      J.shoulderR.rotation.z -= 0.1 * rollW;
      J.hips.position.y += Math.sin(rollDist * 26) * 0.004 * rollW;
    }
    // el resorte se estira (neckS) y respira; la cabeza es hija del cuello, así
    // que se contra-escala para que solo suba, sin deformarse
    J.neck.scale.y = (1 + curNeck) * (1 + breath * (faceName === 'sleeping' ? 0.12 : 0.04));
    J.head.scale.y = 1 / J.neck.scale.y;
    if (!reducedMotion) {
      J.hips.rotation.z += Math.sin(now * 0.0006) * 0.012;
      J.antenna.rotation.z = Math.sin(now * 0.0013) * 0.1;
      J.antenna.rotation.x = Math.sin(now * 0.0009 + 1) * 0.06;
      tipMat.emissiveIntensity = 1.4 + Math.sin(now * 0.004) * 0.6;
    }

    /* 3. Mirada: objetivo (cursor / objeto) o deriva errante */
    let wantYaw = 0, wantPitch = 0;
    if (hasTarget) {
      tmp.copy(lookTarget);
      J.neck.worldToLocal(tmp);
      tmp.y -= 0.075 + 0.15;               // desde la altura de los ojos
      wantYaw = Math.atan2(tmp.x, tmp.z);
      wantPitch = -Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z));
    } else if (move) {
      wantPitch = 0.12;                    // rodando: mira por dónde va
    } else if (alive) {
      if (now > wander.next) {
        const back = Math.random() < 0.4;
        wander = { yaw: back ? 0 : (Math.random() - 0.5) * 0.9, pitch: back ? 0 : (Math.random() - 0.5) * 0.3, next: now + 2400 + Math.random() * 2600 };
      }
      wantYaw = wander.yaw;
      wantPitch = wander.pitch;
    }
    if (faceName === 'sleeping') { wantYaw = 0; wantPitch = 0.35; }
    const yaw = clamp(wantYaw, -1.0, 1.0);
    const pitch = clamp(wantPitch, -0.45, 0.5);
    const gk = reducedMotion ? 1 : damp(6, dt);
    gazeYaw += (yaw - gazeYaw) * gk;
    gazePitch += (pitch - gazePitch) * gk;
    J.head.rotation.y += gazeYaw;
    J.head.rotation.x += gazePitch;
    // las pupilas completan lo que el cuello no llega a girar
    const px = clamp((wantYaw - gazeYaw) * 0.03 + wantYaw * 0.008, -0.013, 0.013);
    const py = clamp(-(wantPitch - gazePitch) * 0.03 - wantPitch * 0.008, -0.011, 0.011);
    pupils.forEach((p) => { p.position.x += (px - p.position.x) * gk; p.position.y += (py - p.position.y) * gk; });

    /* 4. Cara: vuelve a idle al vencer, LEDs/cejas/ojos amortiguados, parpadeo */
    if (faceUntil && now > faceUntil) { faceUntil = 0; setFace('idle'); }
    const F = FACES[faceName];
    const fk = reducedMotion ? 1 : damp(10, dt);
    faceCur.eye += (F.eye - faceCur.eye) * fk;
    faceCur.led += (F.led - faceCur.led) * fk;
    faceCur.browL += (F.brows[0] - faceCur.browL) * fk;
    faceCur.browR += (F.brows[1] - faceCur.browR) * fk;
    faceCur.browY += (F.browY - faceCur.browY) * fk;
    ledMat.emissiveIntensity = faceCur.led;
    irisMat.emissiveIntensity = 0.25 + faceCur.led * 0.14;
    brows[0].rotation.z = faceCur.browR;   // brows[0] está en -x (ceja derecha del personaje)
    brows[1].rotation.z = faceCur.browL;
    brows.forEach((b) => { b.position.y = 0.228 + faceCur.browY; });

    let lid = 1;
    if (alive) {
      if (blinkStart < 0 && now > nextBlink) {
        blinkStart = now;
      }
      if (blinkStart >= 0) {
        const p = (now - blinkStart) / 150;
        if (p >= 1) {
          blinkStart = -1;
          if (pendingDouble) { pendingDouble = false; nextBlink = now + 110; }
          else { pendingDouble = Math.random() < 0.22; nextBlink = pendingDouble ? now + 110 : now + 2200 + Math.random() * 4200; }
        } else {
          lid = 1 - Math.sin(Math.PI * p) * 0.92;
        }
      }
    }
    eyes.forEach((e) => { e.scale.y = Math.max(0.06, faceCur.eye * lid); });

    // Boca al hablar: alterna formas mientras el globo escribe
    if (talking && !reducedMotion && now > talkNext) {
      talkNext = now + 80 + Math.random() * 70;
      const shapes = ['open', 'openSmall', 'smile', 'openSmall'];
      mouth.paint(shapes[Math.floor(Math.random() * shapes.length)]);
    }
  }

  function dispose() {
    root.parent?.remove(root);
    root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
    });
  }

  mouth.paint('smile');

  return {
    root, meshes, setFace, play, setLookTarget, setTalking, headTop, headWorld, handsWorld,
    followPath, faceTo, slideTo, stop, setPose, stopClip, update, dispose,
    get moving() { return !!move || !!slide; },
    get busy() { return !!move || !!slide || !!clip; },   // rodando o en medio de un clip
    get face() { return faceName; },
  };
}
