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
 * API: createJotai({ reducedMotion, lite, scale }) →
 *   { root, meshes, setFace(name, holdMs?), play(clip) → Promise,
 *     setLookTarget(vec3|null), setTalking(bool), headTop(out?),
 *     headWorld(out?), update(now, dt), dispose() }
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

/* ────────────────────────────────────────────────────
   POSES — [rx, ry, rz] por articulación; lo que no aparece vale 0.
   Brazos: cuelgan en -y desde el hombro. rz > 0 abre el brazo izquierdo
   (+x) hacia afuera, rz < 0 el derecho; rx < 0 lleva el brazo/antebrazo
   hacia adelante (+z). `hipsY` (número) sube/baja la cadera.
──────────────────────────────────────────────────── */
const POSES = {
  stand: {
    shoulderL: [0.05, 0, 0.12], shoulderR: [0.05, 0, -0.12],
    elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0],
  },
};

/* CLIPS — [ms, pose] ; `{}` = volver a la pose base. Se interpolan con
   smoothstep entre claves y terminan siempre en la pose base.
   Saludo: brazo derecho afuera (hombro rz −1.9 ≈ un poco sobre la horizontal)
   y el antebrazo apuntando arriba (codo rz ≈ −π − hombro), oscilando a los
   lados de la vertical. rx < 0 lo adelanta un poco para que no quede detrás
   del torso visto desde la cámara isométrica. */
const WAVE_UP = { shoulderR: [-0.35, 0, -1.9], head: [0, 0, 0.12] };
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
  let basePose = POSES.stand;
  let clip = null;          // { keys, t0, resolve }

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
    const t = now - clip.t0;
    const end = keys[keys.length - 1][0];
    if (t >= end) {
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
    faceUntil = holdMs ? performance.now() + holdMs : 0;
    if (!talking) mouth.paint(FACES[name].mouth);
  }

  function play(name) {
    const keys = CLIPS[name];
    if (!keys || reducedMotion) return Promise.resolve();
    clip?.resolve?.();
    return new Promise((resolve) => { clip = { keys, t0: performance.now(), resolve }; });
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

  function update(now, dt) {
    const k = reducedMotion ? 1 : damp(14, dt);

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
    const hy = c ? ((c.pa.hipsY ?? basePose.hipsY ?? 0) + ((c.pb.hipsY ?? basePose.hipsY ?? 0) - (c.pa.hipsY ?? basePose.hipsY ?? 0)) * c.k) : (basePose.hipsY ?? 0);
    curHipsY += (hy - curHipsY) * k;

    /* 2. Vida continua (respiración, balanceo, antena) */
    const alive = !reducedMotion && faceName !== 'sleeping';
    const breath = reducedMotion ? 0 : Math.sin(now * 0.00175);   // ~3.6 s
    J.hips.position.y = 0.40 + curHipsY;
    J.torso.position.y = 0.04 + breath * 0.004;
    J.neck.scale.y = 1 + breath * (faceName === 'sleeping' ? 0.12 : 0.04);
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

  return { root, meshes, setFace, play, setLookTarget, setTalking, headTop, headWorld, update, dispose };
}
