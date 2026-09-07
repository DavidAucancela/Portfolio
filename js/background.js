/**
 * background.js — Fondo unificado del portfolio (v2)
 *
 * Un único canvas para toda la página. Reemplaza los dos sistemas anteriores:
 *   · #hero-canvas + HeroAnimations (js/animations.js)
 *   · SectionCanvas (un canvas por sección, en js/effects.js)
 *
 * Diseño:
 * - El canvas es `position: fixed` del tamaño del viewport, pero las partículas
 *   viven en COORDENADAS DE DOCUMENTO y se dibujan restando `scrollY * factor`.
 *   Visualmente equivale a un canvas del alto del documento (parallax real),
 *   sin su costo: un canvas de 10.000px son ~76MB a DPR 1 y repintar 19M px/frame.
 * - Tres capas de profundidad (far/mid/near) con distinto factor de parallax.
 *   La capa `near` (factor 1.0) va pegada al contenido: es la que interactúa
 *   con las cards.
 * - Un solo requestAnimationFrame para toda la página.
 * - Culling por banda de viewport: fuera de pantalla no se integra ni se dibuja.
 * - Calidad adaptativa: si el frame time medio se dispara, baja DPR y densidad.
 */

/* ────────────────────────────────────────────────────
   CONSTANTES
──────────────────────────────────────────────────── */
const LAYER = { far: 0.45, mid: 0.75, near: 1.0 };

const ACCENT = {
  dev: [59, 130, 246],
  ia:  [177, 78, 255],
  sec: [0, 255, 65],
};
const ACCENT2 = {
  ia:  [6, 255, 165],   // teal
  sec: [255, 0, 51],    // rojo de amenaza
  dev: [125, 211, 252], // cian claro para paquetes
};

const CULL_PAD   = 220;   // px de margen fuera del viewport que se sigue simulando
const FADE_MS    = 260;   // crossfade al cambiar de modo
const SLOW_FRAME = 22;    // ms — umbral para degradar calidad
const SLOW_RUN   = 45;    // frames seguidos lentos antes de degradar

/* ────────────────────────────────────────────────────
   ESTADO
──────────────────────────────────────────────────── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarseInput   = window.matchMedia('(hover: none), (pointer: coarse)');

let canvas   = null;
let ctx      = null;
let vw = 0, vh = 0, docH = 0;
let dprBase  = 1;
let dprEff   = 1;
let scrollTop = 0;
let rafId    = null;
let lastT    = 0;
let mode     = 'dev';
let renderer = null;
let nextMode = null;      // modo entrante durante el crossfade
let fade     = 1;         // 1 = opaco, 0 = invisible
let lite     = false;
let density  = 1;         // multiplicador de densidad (calidad adaptativa)
let slowRun  = 0;
let resizeTimer = null;
let zones    = [];

const pointer = { x: -9999, y: -9999, active: false };

/* ────────────────────────────────────────────────────
   UTILIDADES
──────────────────────────────────────────────────── */
const rnd   = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** rgba() a partir de una tripleta de ACCENT */
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

/**
 * Hash espacial: agrupa puntos en celdas para consultar vecinos en ~O(n)
 * en vez del O(n²) que hacían los módulos viejos.
 */
function buildBuckets(items, cell, minY, maxY) {
  const map = new Map();
  for (const it of items) {
    if (it.y < minY || it.y > maxY) continue;
    const k = Math.floor(it.x / cell) + ',' + Math.floor(it.y / cell);
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    arr.push(it);
  }
  return map;
}

/** Vecinos hacia adelante — evita comparar cada par dos veces */
const FWD = [[1, 0], [-1, 1], [0, 1], [1, 1]];

function eachPair(map, cell, fn) {
  for (const [key, list] of map) {
    const [kx, ky] = key.split(',').map(Number);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) fn(list[i], list[j]);
      for (const [dx, dy] of FWD) {
        const other = map.get((kx + dx) + ',' + (ky + dy));
        if (!other) continue;
        for (let j = 0; j < other.length; j++) fn(list[i], other[j]);
      }
    }
  }
}

/** Intensidad del campo según la sección en la que cae un punto del documento */
function zoneIntensity(docY) {
  for (const z of zones) {
    if (docY >= z.top && docY <= z.bottom) return z.intensity;
  }
  return 0.75;
}

/** Rect de un elemento en coordenadas de documento */
function docRect(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + scrollTop, w: r.width, h: r.height };
}

/* ────────────────────────────────────────────────────
   CICLO DE VIDA
──────────────────────────────────────────────────── */
function init() {
  lite = coarseInput.matches;
  mode = document.body.dataset.theme || localStorage.getItem('portfolio-mode') || 'dev';
  scrollTop = window.scrollY;   // la página puede cargar ya scrolleada

  _mount();
  _measure();
  _measureZones();

  renderer = _makeRenderer(mode);
  renderer.init(_view());

  _bindEvents();

  if (reducedMotion.matches) {
    // Un solo frame estático — sin loop, sin movimiento.
    _drawFrame(0);
    return;
  }
  lastT = performance.now();
  rafId = requestAnimationFrame(_tick);
}

function _mount() {
  canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertAdjacentElement('afterbegin', canvas);
  ctx = canvas.getContext('2d', { alpha: true });
  dprBase = Math.min(window.devicePixelRatio || 1, 2);
}

function _measure() {
  vw   = document.documentElement.clientWidth;
  vh   = window.innerHeight;
  docH = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    vh
  );
  dprEff = Math.max(1, dprBase * (density >= 1 ? 1 : density >= 0.7 ? 0.75 : 0.5));

  canvas.width  = Math.round(vw * dprEff);
  canvas.height = Math.round(vh * dprEff);
  canvas.style.width  = vw + 'px';
  canvas.style.height = vh + 'px';
  ctx.setTransform(dprEff, 0, 0, dprEff, 0, 0);
}

/**
 * Cada sección declara cuánta presencia tiene el campo sobre ella.
 * El hero es la zona densa; el resto respira.
 */
const ZONE_INTENSITY = {
  hero: 1.0,
  about: 0.62,
  projects: 0.8,
  skills: 0.6,
  'ia-assistant-section': 0.85,
  contact: 0.55,
};

function _measureZones() {
  zones = [];
  for (const id of Object.keys(ZONE_INTENSITY)) {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    zones.push({
      id,
      top: r.top + scrollTop,
      bottom: r.bottom + scrollTop,
      intensity: ZONE_INTENSITY[id],
    });
  }
}

function _view() {
  return {
    vw, vh, docH, scrollTop, pointer, lite, density,
    top: scrollTop,
    bottom: scrollTop + vh,
  };
}

/* ── Loop ── */
function _tick(now) {
  rafId = requestAnimationFrame(_tick);

  const dt = Math.min((now - lastT) / 16.667, 3); // en "frames de 60fps", con techo
  lastT = now;

  _drawFrame(dt);
  _watchPerf(performance.now() - now);
}

function _drawFrame(dt) {
  ctx.clearRect(0, 0, vw, vh);

  // Crossfade al cambiar de modo
  if (nextMode) {
    fade -= dt * (16.667 / FADE_MS) * 2;
    if (fade <= 0) {
      fade = 0;
      mode = nextMode;
      nextMode = null;
      renderer.destroy && renderer.destroy();
      renderer = _makeRenderer(mode);
      _measureZones();
      renderer.init(_view());
    }
  } else if (fade < 1) {
    fade = Math.min(1, fade + dt * (16.667 / FADE_MS) * 2);
  }

  ctx.globalAlpha = fade;
  renderer.step(dt, ctx, _view());
  ctx.globalAlpha = 1;
}

/**
 * Calidad adaptativa: si el trabajo por frame se pasa de presupuesto de forma
 * sostenida, se baja un escalón (primero DPR, luego densidad de partículas).
 */
function _watchPerf(frameMs) {
  if (frameMs > SLOW_FRAME) slowRun++;
  else slowRun = Math.max(0, slowRun - 2);

  if (slowRun < SLOW_RUN || density <= 0.45) return;
  slowRun = 0;
  density = density >= 1 ? 0.7 : 0.45;
  _measure();
  renderer.init(_view());
}

/* ── Eventos ── */
function _bindEvents() {
  window.addEventListener('scroll', () => { scrollTop = window.scrollY; }, { passive: true });
  scrollTop = window.scrollY;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasLite = lite;
      lite = coarseInput.matches;
      _measure();
      _measureZones();
      if (wasLite !== lite) density = 1;
      renderer.init(_view());
      if (reducedMotion.matches) _drawFrame(0);
    }, 180);
  });

  // El alto del documento cambia al renderizar proyectos, cambiar de modo o de idioma
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      const prev = docH;
      _measure();
      _measureZones();
      if (Math.abs(prev - docH) > 200) renderer.init(_view());
    });
    ro.observe(document.body);
  }

  if (!lite) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId && !reducedMotion.matches) {
      lastT = performance.now();
      rafId = requestAnimationFrame(_tick);
    }
  });

  window.addEventListener('portfolio:modeChange', (e) => {
    const m = e.detail && e.detail.mode;
    if (!m || m === mode || m === nextMode) return;

    if (reducedMotion.matches) {
      // Sin loop activo no hay crossfade que avance: se cambia en seco
      mode = m;
      renderer.destroy && renderer.destroy();
      renderer = _makeRenderer(mode);
      _measureZones();
      renderer.init(_view());
      _drawFrame(0);
      return;
    }
    nextMode = m;
  });

  _bindCards();
}

/**
 * Puente cards ↔ fondo. Listeners delegados: ni projects.js ni
 * project-gallery.js necesitan saber que el fondo existe.
 */
function _bindCards() {
  if (lite) return;

  document.addEventListener('pointerover', (e) => {
    const card = e.target.closest && e.target.closest('.project-card, .lab-card');
    if (!card || !renderer.onCardHover) return;
    renderer.onCardHover(docRect(card), true);
  });

  document.addEventListener('pointerout', (e) => {
    const card = e.target.closest && e.target.closest('.project-card, .lab-card');
    if (!card || !renderer.onCardHover) return;
    if (card.contains(e.relatedTarget)) return;
    renderer.onCardHover(docRect(card), false);
  });

  document.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.project-card, .lab-card');
    if (!card || !renderer.onCardClick) return;
    renderer.onCardClick(docRect(card));
  });

  // La gallery ya emite estos eventos — se aprovechan tal cual
  window.addEventListener('portfolio:projectClose', () => {
    renderer.onCardRelease && renderer.onCardRelease();
  });
}

function _makeRenderer(m) {
  if (m === 'ia')  return IaField;
  if (m === 'sec') return SecField;
  return DevField;
}

/* ══════════════════════════════════════════════════════
   MODO .dev — MALLA DE DATOS
   Retícula técnica con paquetes viajando por las aristas.
   El cursor actúa de router: desvía el tráfico hacia él y
   revela más detalle de la malla a su alrededor.
══════════════════════════════════════════════════════ */
const DevField = (() => {
  const C  = ACCENT.dev;
  const C2 = ACCENT2.dev;

  const PITCH      = 68;    // paso de la retícula principal
  const FAR_MULT   = 2.4;   // la retícula lejana es más abierta
  const REVEAL_R   = 200;   // radio de revelado alrededor del cursor
  const ROUTER_R   = 280;   // radio en el que el cursor desvía paquetes
  const DIRS       = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  let packets = [];
  let pitch   = PITCH;
  let hoverRect = null;

  function init(view) {
    pitch = view.lite ? PITCH * 1.35 : PITCH;
    const target = Math.round((view.lite ? 7 : 16) * view.density);
    packets = [];
    for (let i = 0; i < target; i++) packets.push(_spawn(view));
  }

  function _snap(v) { return Math.round(v / pitch) * pitch; }

  function _spawn(view, atX, atY, dir) {
    const x = atX !== undefined ? _snap(atX) : _snap(rnd(0, view.vw));
    const y = atY !== undefined ? _snap(atY) : _snap(rnd(view.top - 100, view.bottom + 100));
    return {
      ax: x, ay: y,
      dir: dir !== undefined ? dir : Math.floor(Math.random() * 4),
      t: Math.random(),
      speed: rnd(0.010, 0.020),
      bright: Math.random() < 0.3,
    };
  }

  /* Elección de dirección en un nodo. El cursor sesga la decisión. */
  function _nextDir(p, view) {
    const straight = Math.random() > 0.34;
    if (straight) return p.dir;

    const left  = (p.dir + 3) % 4;
    const right = (p.dir + 1) % 4;

    if (view.pointer.active) {
      const sx = p.ax;
      const sy = p.ay - view.scrollTop;
      const d  = Math.hypot(view.pointer.x - sx, view.pointer.y - sy);
      if (d < ROUTER_R) {
        // Girar hacia el cursor: se compara qué opción reduce la distancia
        const score = (dir) => {
          const [dx, dy] = DIRS[dir];
          return Math.hypot(
            view.pointer.x - (sx + dx * pitch),
            view.pointer.y - (sy + dy * pitch)
          );
        };
        return score(left) < score(right) ? left : right;
      }
    }
    return Math.random() < 0.5 ? left : right;
  }

  function step(dt, ctx, view) {
    _drawGrid(ctx, view, LAYER.far, pitch * FAR_MULT, 0.030, false);
    _drawGrid(ctx, view, LAYER.near, pitch, 0.055, true);
    if (!view.lite && view.pointer.active) _drawReveal(ctx, view);
    if (hoverRect) _drawCardGrid(ctx, view);
    _drawPackets(dt, ctx, view);
  }

  /* ── Retícula ── */
  function _drawGrid(ctx, view, factor, step_, baseAlpha, dots) {
    const off  = view.scrollTop * factor;
    const kMin = Math.floor(off / step_) - 1;
    const kMax = Math.ceil((off + view.vh) / step_) + 1;
    const midIntensity = zoneIntensity(view.scrollTop + view.vh / 2);
    const a = baseAlpha * (0.55 + midIntensity * 0.65);

    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(C, a);
    ctx.beginPath();

    for (let k = kMin; k <= kMax; k++) {
      const y = k * step_ - off;
      ctx.moveTo(0, y);
      ctx.lineTo(view.vw, y);
    }
    for (let x = 0; x <= view.vw + step_; x += step_) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, view.vh);
    }
    ctx.stroke();

    if (!dots || view.lite) return;

    // Nodos en las intersecciones
    ctx.fillStyle = rgba(C, a * 2.6);
    for (let k = kMin; k <= kMax; k++) {
      const y = k * step_ - off;
      if (y < -4 || y > view.vh + 4) continue;
      for (let x = 0; x <= view.vw + step_; x += step_) {
        ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      }
    }
  }

  /* ── Revelado alrededor del cursor ── */
  function _drawReveal(ctx, view) {
    const { x: mx, y: my } = view.pointer;
    const off = view.scrollTop * LAYER.near;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, REVEAL_R, 0, Math.PI * 2);
    ctx.clip();

    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, REVEAL_R);
    grd.addColorStop(0, rgba(C, 0.16));
    grd.addColorStop(0.5, rgba(C, 0.06));
    grd.addColorStop(1, rgba(C, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(mx - REVEAL_R, my - REVEAL_R, REVEAL_R * 2, REVEAL_R * 2);

    ctx.strokeStyle = rgba(C, 0.20);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const kMin = Math.floor((my - REVEAL_R + off) / pitch);
    const kMax = Math.ceil((my + REVEAL_R + off) / pitch);
    for (let k = kMin; k <= kMax; k++) {
      const y = k * pitch - off;
      ctx.moveTo(mx - REVEAL_R, y);
      ctx.lineTo(mx + REVEAL_R, y);
    }
    for (let x = _snap(mx - REVEAL_R); x <= mx + REVEAL_R; x += pitch) {
      ctx.moveTo(x, my - REVEAL_R);
      ctx.lineTo(x, my + REVEAL_R);
    }
    ctx.stroke();

    // El nodo bajo el cursor se enciende
    const nx = _snap(mx);
    const ny = _snap(my + off) - off;
    ctx.fillStyle = rgba(C2, 0.85);
    ctx.beginPath();
    ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ── La card se apoya sobre la malla: se ilumina su parcela ── */
  function _drawCardGrid(ctx, view) {
    const r  = hoverRect;
    const sy = r.y - view.scrollTop;
    if (sy > view.vh || sy + r.h < 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x - 10, sy - 10, r.w + 20, r.h + 20);
    ctx.clip();
    ctx.strokeStyle = rgba(C, 0.17);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const off = view.scrollTop;
    for (let k = Math.floor((sy - 10 + off) / pitch); k <= Math.ceil((sy + r.h + 10 + off) / pitch); k++) {
      const y = k * pitch - off;
      ctx.moveTo(r.x - 10, y);
      ctx.lineTo(r.x + r.w + 10, y);
    }
    for (let x = _snap(r.x - 10); x <= r.x + r.w + 10; x += pitch) {
      ctx.moveTo(x, sy - 10);
      ctx.lineTo(x, sy + r.h + 10);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ── Paquetes ── */
  function _drawPackets(dt, ctx, view) {
    for (const p of packets) {
      p.t += p.speed * dt * (0.6 + zoneIntensity(p.ay) * 0.8);

      while (p.t >= 1) {
        p.t -= 1;
        const [dx, dy] = DIRS[p.dir];
        p.ax += dx * pitch;
        p.ay += dy * pitch;
        p.dir = _nextDir(p, view);
      }

      const [dx, dy] = DIRS[p.dir];
      const x  = p.ax + dx * pitch * p.t;
      const y  = p.ay + dy * pitch * p.t;
      const sy = y - view.scrollTop;

      // Reciclar los que se alejan demasiado del viewport
      if (x < -pitch || x > view.vw + pitch || sy < -CULL_PAD || sy > view.vh + CULL_PAD) {
        Object.assign(p, _spawn(view));
        continue;
      }

      const col   = p.bright ? C2 : C;
      const alpha = p.bright ? 0.9 : 0.62;

      // Estela
      const tail = 30;
      const grd = ctx.createLinearGradient(x - dx * tail, sy - dy * tail, x, sy);
      grd.addColorStop(0, rgba(col, 0));
      grd.addColorStop(1, rgba(col, alpha * 0.55));
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - dx * tail, sy - dy * tail);
      ctx.lineTo(x, sy);
      ctx.stroke();

      // Halo + cabeza
      const halo = ctx.createRadialGradient(x, sy, 0, x, sy, 9);
      halo.addColorStop(0, rgba(col, alpha * 0.35));
      halo.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, sy, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(col, alpha);
      ctx.beginPath();
      ctx.arc(x, sy, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── API de interacción ── */
  function onCardHover(rect, on) { hoverRect = on ? rect : null; }

  function onCardClick(rect) {
    // Salen paquetes desde el borde de la card hacia fuera
    const view = _view();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const emit = [
      [cx, rect.y, 3],
      [cx, rect.y + rect.h, 1],
      [rect.x, cy, 2],
      [rect.x + rect.w, cy, 0],
    ];
    for (const [ex, ey, dir] of emit) {
      const p = _spawn(view, ex, ey, dir);
      p.bright = true;
      p.speed  = rnd(0.028, 0.040);
      packets.push(p);
    }
    // No dejar crecer el array indefinidamente
    const cap = Math.round((lite ? 7 : 16) * density) + 8;
    while (packets.length > cap) packets.shift();
  }

  function destroy() { packets = []; hoverRect = null; }

  return { init, step, onCardHover, onCardClick, destroy };
})();

/* ══════════════════════════════════════════════════════
   MODO .ia — RED QUE SE TEJE BAJO EL CURSOR
   Las conexiones no son estáticas: nacen donde pasa el
   puntero y se disuelven al alejarse. Al abrir un proyecto,
   los nodos se reclutan sobre el borde de la card — la
   respuesta se "genera" desde la red.
══════════════════════════════════════════════════════ */
const IaField = (() => {
  const C  = ACCENT.ia;
  const C2 = ACCENT2.ia;

  const AREA_PER_NODE = 26000;
  const LINK_BASE = 108;   // radio de conexión en reposo
  const LINK_MAX  = 252;   // radio de conexión bajo el cursor
  const CURSOR_R  = 310;   // alcance de la influencia del puntero
  const MAX_SPEED = 0.85;
  const CAPTURE_N = 18;

  let nodes   = [];
  let far     = [];
  let signals = [];
  let capture = null;   // { rect, strength, pulse }
  let visible = [];     // buffer reutilizado — evita un filter() por frame

  function init(view) {
    const n = Math.round((view.vw * view.docH) / AREA_PER_NODE * view.density * (view.lite ? 0.45 : 1));
    nodes = [];
    for (let i = 0; i < n; i++) {
      nodes.push({
        x: rnd(0, view.vw),
        y: rnd(0, view.docH),
        vx: rnd(-0.22, 0.22),
        vy: rnd(-0.22, 0.22),
        r: rnd(1.6, 3.6),
        major: Math.random() < 0.22,
        teal: Math.random() < 0.35,
        pulse: rnd(0, Math.PI * 2),
        ps: rnd(0.02, 0.05),
        cap: 0, tx: 0, ty: 0, capIdx: -1,
      });
    }

    far = [];
    const fn = Math.round(n * 0.5);
    for (let i = 0; i < fn; i++) {
      far.push({
        x: rnd(0, view.vw),
        y: rnd(0, view.docH),
        r: rnd(0.8, 1.8),
        a: rnd(0.10, 0.26),
      });
    }

    signals = [];
    capture = null;
  }

  /* Punto del perímetro de un rect para s ∈ [0,1) */
  function _perimeter(rect, s) {
    const per = 2 * (rect.w + rect.h);
    let d = s * per;
    if (d < rect.w) return [rect.x + d, rect.y];
    d -= rect.w;
    if (d < rect.h) return [rect.x + rect.w, rect.y + d];
    d -= rect.h;
    if (d < rect.w) return [rect.x + rect.w - d, rect.y + rect.h];
    d -= rect.w;
    return [rect.x, rect.y + rect.h - d];
  }

  function step(dt, ctx, view) {
    const minY = view.top - CULL_PAD;
    const maxY = view.bottom + CULL_PAD;

    _drawFar(ctx, view);
    _update(dt, view, minY, maxY);

    visible.length = 0;
    for (const n of nodes) {
      if (n.y >= minY && n.y <= maxY) visible.push(n);
    }
    if (!view.lite) _drawLinks(dt, ctx, view, visible);
    _drawSignals(dt, ctx, view);
    if (capture) _drawCaptureRing(ctx, view);
    _drawNodes(ctx, view, visible);
  }

  /* ── Capa lejana: puntos que apenas se mueven, dan profundidad ── */
  function _drawFar(ctx, view) {
    const off = view.scrollTop * LAYER.far;
    for (const p of far) {
      const sy = p.y - off;
      if (sy < -20 || sy > view.vh + 20) continue;
      ctx.fillStyle = rgba(C, p.a * 0.55);
      ctx.beginPath();
      ctx.arc(p.x, sy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Integración ── */
  function _update(dt, view, minY, maxY) {
    const mx = view.pointer.x;
    const my = view.pointer.y + view.scrollTop;   // cursor en coords de documento

    for (const n of nodes) {
      // Fuera de la banda visible no se simula, salvo si está reclutado
      if (n.cap <= 0 && (n.y < minY || n.y > maxY)) continue;

      if (n.capIdx >= 0 && capture) {
        // Reclutado por una card: interpolación hacia su sitio en el borde
        const [tx, ty] = _perimeter(capture.rect, n.capIdx / CAPTURE_N);
        n.tx = tx; n.ty = ty;
        n.cap = Math.min(capture.strength, n.cap + 0.045 * dt);
        n.x += (n.tx - n.x) * 0.12 * n.cap * dt;
        n.y += (n.ty - n.y) * 0.12 * n.cap * dt;
        continue;
      }

      if (n.cap > 0) {
        // Liberado: vuelve al campo con inercia
        n.cap = Math.max(0, n.cap - 0.02 * dt);
      }

      if (view.pointer.active && !view.lite) {
        const dx = mx - n.x;
        const dy = my - n.y;
        const d  = Math.hypot(dx, dy);
        if (d < CURSOR_R && d > 1) {
          // Atracción suave: la red se acerca a quien la mira
          const f = (1 - d / CURSOR_R) * 0.014;
          n.vx += (dx / d) * f * dt;
          n.vy += (dy / d) * f * dt;
        }
      }

      n.vx *= 0.995; n.vy *= 0.995;
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > MAX_SPEED) { n.vx = n.vx / sp * MAX_SPEED; n.vy = n.vy / sp * MAX_SPEED; }

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.pulse += n.ps * dt;

      if (n.x < 0)  { n.x = 0;  n.vx *= -1; }
      if (n.x > view.vw) { n.x = view.vw; n.vx *= -1; }
      if (n.y < 0)  { n.y = 0;  n.vy *= -1; }
      if (n.y > view.docH) { n.y = view.docH; n.vy *= -1; }
    }
  }

  /* ── Conexiones reactivas al cursor ── */
  function _drawLinks(dt, ctx, view, visible) {
    const mx = view.pointer.x;
    const my = view.pointer.y + view.scrollTop;
    const active = view.pointer.active;

    const map = buildBuckets(visible, LINK_MAX, view.top - CULL_PAD, view.bottom + CULL_PAD);
    ctx.lineWidth = 1;

    eachPair(map, LINK_MAX, (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > LINK_MAX * LINK_MAX) return;

      const d = Math.sqrt(d2);

      // Influencia del cursor medida en el punto medio de la arista
      let m = 0;
      if (active) {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        m = clamp(1 - Math.hypot(mx - cx, my - cy) / CURSOR_R, 0, 1);
        m = m * m;   // la red se teje de forma más marcada justo bajo el puntero
      }

      const reach = LINK_BASE + m * (LINK_MAX - LINK_BASE);
      if (d > reach) return;

      const near = Math.max(a.cap, b.cap);
      const alpha = ((1 - d / reach) * (0.045 + m * 0.42) + near * 0.35)
                    * (0.5 + zoneIntensity(a.y) * 0.6);
      if (alpha < 0.012) return;

      ctx.strokeStyle = rgba(m > 0.45 || near > 0 ? C2 : C, alpha);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - view.scrollTop);
      ctx.lineTo(b.x, b.y - view.scrollTop);
      ctx.stroke();

      // Chispa ocasional viajando por una arista tensada
      if (m > 0.5 && signals.length < 26 && Math.random() < 0.004 * dt) {
        signals.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0, sp: rnd(0.02, 0.05), teal: Math.random() < 0.5 });
      }
    });
  }

  function _drawSignals(dt, ctx, view) {
    if (signals.length && Math.random() < 0.02) signals.shift();

    signals = signals.filter(s => s.t < 1);
    for (const s of signals) {
      s.t += s.sp * dt;
      const x  = s.ax + (s.bx - s.ax) * s.t;
      const y  = s.ay + (s.by - s.ay) * s.t - view.scrollTop;
      if (y < -20 || y > view.vh + 20) continue;
      const a  = Math.sin(s.t * Math.PI) * 0.9;
      const col = s.teal ? C2 : C;

      const halo = ctx.createRadialGradient(x, y, 0, x, y, 10);
      halo.addColorStop(0, rgba(col, a * 0.32));
      halo.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Nodos ── */
  function _drawNodes(ctx, view, visible) {
    const mx = view.pointer.x;
    const my = view.pointer.y + view.scrollTop;
    const active = view.pointer.active;

    for (const n of visible) {
      const sy = n.y - view.scrollTop;
      const near = active
        ? clamp(1 - Math.hypot(mx - n.x, my - n.y) / CURSOR_R, 0, 1)
        : 0;
      const boost = Math.max(near, n.cap);
      const r = n.r * (1 + Math.sin(n.pulse) * 0.16 + boost * 0.5);
      const col = n.teal ? C2 : C;
      const a = (0.34 + Math.sin(n.pulse) * 0.12 + boost * 0.55)
                * (0.55 + zoneIntensity(n.y) * 0.55);

      const halo = ctx.createRadialGradient(n.x, sy, 0, n.x, sy, r * (3.5 + boost * 3));
      halo.addColorStop(0, rgba(col, a * 0.34));
      halo.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(n.x, sy, r * (3.5 + boost * 3), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.arc(n.x, sy, r, 0, Math.PI * 2);
      ctx.fill();

      if (n.major || boost > 0.4) {
        ctx.strokeStyle = rgba(col, Math.min(1, a + 0.25));
        ctx.lineWidth = boost > 0.4 ? 1.4 : 0.9;
        ctx.stroke();
      }
    }
  }

  /* ── Anillo de la card: el borde se dibuja uniendo los nodos reclutados ── */
  function _drawCaptureRing(ctx, view) {
    const cap = capture;
    cap.pulse = (cap.pulse + 0.011) % 1;

    const ring = nodes.filter(n => n.capIdx >= 0).sort((a, b) => a.capIdx - b.capIdx);
    if (ring.length < 3) return;

    const settle = ring.reduce((s, n) => s + n.cap, 0) / ring.length;

    ctx.beginPath();
    ring.forEach((n, i) => {
      const y = n.y - view.scrollTop;
      i === 0 ? ctx.moveTo(n.x, y) : ctx.lineTo(n.x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = rgba(C2, 0.28 * settle);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Pulso recorriendo el perímetro
    const [px, py] = _perimeter(cap.rect, cap.pulse);
    const sy = py - view.scrollTop;
    const grd = ctx.createRadialGradient(px, sy, 0, px, sy, 46);
    grd.addColorStop(0, rgba(C2, 0.42 * settle));
    grd.addColorStop(1, rgba(C2, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(px, sy, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── API de interacción ── */
  function _recruit(rect, strength) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const pool = nodes
      .map(n => ({ n, d: Math.hypot(n.x - cx, n.y - cy) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, CAPTURE_N);

    nodes.forEach(n => { n.capIdx = -1; });
    pool.forEach((p, i) => { p.n.capIdx = i; });
    capture = { rect, strength, pulse: 0 };
  }

  function _sameRect(a, b) {
    return a && b && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
  }

  function onCardHover(rect, on) {
    if (!on) {
      // Solo suelta si sigue siendo la card que tomó los nodos: al pasar
      // rápido de una card a otra, el pointerout de la primera llega
      // después del pointerover de la segunda.
      if (capture && capture.strength < 0.6 && _sameRect(capture.rect, rect)) onCardRelease();
      return;
    }
    if (capture && capture.strength >= 0.6) return;   // hay una captura fuerte activa
    _recruit(rect, 0.45);
  }

  function onCardClick(rect) { _recruit(rect, 1); }

  function onCardRelease() {
    nodes.forEach(n => {
      if (n.capIdx < 0) return;
      n.capIdx = -1;
      // Al soltarse salen despedidos suavemente hacia fuera
      n.vx += rnd(-0.5, 0.5);
      n.vy += rnd(-0.5, 0.5);
    });
    capture = null;
  }

  function destroy() { nodes = []; far = []; signals = []; visible = []; capture = null; }

  return { init, step, onCardHover, onCardClick, onCardRelease, destroy };
})();

/* ══════════════════════════════════════════════════════
   MODO .sec — LLUVIA ATENUADA + VIRUS
   La matriz baja de contraste hasta ser textura, para que
   los virus destaquen. Huyen del cursor y se desintegran
   si los alcanzas.
══════════════════════════════════════════════════════ */
const SecField = (() => {
  const C  = ACCENT.sec;
  const C2 = ACCENT2.sec;

  const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/\\|{}[]!@#$%^&*';
  const GLYPH = '☣✖⌁⍜⏣⎔';
  const FS       = 14;      // tamaño de fuente de la lluvia principal
  const FS_FAR   = 10;
  const RAIN_F   = LAYER.mid;
  const FAR_F    = LAYER.far;
  const FLEE_R   = 150;     // el virus huye a partir de aquí
  const KILL_R   = 55;      // y se desintegra aquí
  const MAX_VIRUS = 5;

  let cols = [];
  let farCols = [];
  let virus = [];
  let debris = [];
  let flash = [];
  let spawnT = 0;

  const chr = () => CHARS[(Math.random() * CHARS.length) | 0];

  function init(view) {
    const step = (view.lite ? 22 : 16) / Math.max(0.5, view.density);
    cols = _mkCols(view, step, FS, 0.08, 0.20);
    farCols = view.lite ? [] : _mkCols(view, step * 2.4, FS_FAR, 0.04, 0.09);
    virus = [];
    debris = [];
    flash = [];
    spawnT = 90;
  }

  function _mkCols(view, step, fs, aMin, aMax) {
    const out = [];
    const n = Math.max(6, Math.floor(view.vw / step));
    for (let i = 0; i < n; i++) {
      out.push({
        x: (i + 0.5) * (view.vw / n),
        y: view.scrollTop * RAIN_F + rnd(-view.vh, view.vh),
        sp: rnd(0.28, 0.85),
        len: 6 + ((Math.random() * 18) | 0),
        a: rnd(aMin, aMax),
        fs,
        fade: 1,
        chars: Array.from({ length: 30 }, chr),
        glitch: Math.random() < 0.08,
      });
    }
    return out;
  }

  function step(dt, ctx, view) {
    _rain(dt, ctx, view, farCols, FAR_F, 0.6);
    _rain(dt, ctx, view, cols, RAIN_F, 1);
    _flash(dt, ctx, view);
    if (!view.lite) {
      _virus(dt, ctx, view);
      _debris(dt, ctx, view);
    }
  }

  /* ── Lluvia ── */
  function _rain(dt, ctx, view, list, factor, mult) {
    const off = view.scrollTop * factor;
    if (!list.length) return;
    ctx.textAlign = 'center';

    ctx.font = `${list[0].fs}px 'Fira Code', 'Courier New', monospace`;

    for (const col of list) {
      col.y += col.sp * dt;
      let sy = col.y - off;

      // Reciclado: siempre debe haber lluvia dentro del viewport.
      // Se reparte por TODA la banda visible, no solo por encima de ella: al
      // scrollear rápido se recicla media pantalla de columnas de golpe, y
      // si todas nacen arriba tardan cientos de frames en volver a entrar
      // (a ~0.5px/frame), dejando la pantalla vacía. El fade tapa la
      // aparición a media altura.
      if (sy - col.len * col.fs > view.vh + 200 || sy < -600) {
        col.y = off + rnd(-col.len * col.fs, view.vh);
        col.sp = rnd(0.28, 0.85);
        col.glitch = Math.random() < 0.08;
        col.fade = 0;
        sy = col.y - off;
      }
      if (col.fade < 1) col.fade = Math.min(1, col.fade + 0.045 * dt);

      if (Math.random() < 0.045 * dt) {
        col.chars[(Math.random() * col.chars.length) | 0] = chr();
      }

      const inten = 0.55 + zoneIntensity(col.y) * 0.6;

      for (let i = 0; i < col.len; i++) {
        const y = sy - i * col.fs;
        if (y < -col.fs || y > view.vh + col.fs) continue;
        const fade = 1 - i / col.len;
        const a = col.a * fade * mult * inten * col.fade;

        if (i === 0) ctx.fillStyle = `rgba(190,255,190,${Math.min(0.5, col.a * 2.1 * mult) * col.fade})`;
        else if (col.glitch && i < 2) ctx.fillStyle = rgba(C2, a * 0.9);
        else ctx.fillStyle = rgba(C, a);

        ctx.fillText(col.chars[i % col.chars.length], col.x, y);
      }
    }
  }

  /* ── Virus ── */
  function _virus(dt, ctx, view) {
    spawnT -= dt;
    if (spawnT <= 0 && virus.length < MAX_VIRUS) {
      spawnT = rnd(360, 660);   // ~6–11s a 60fps
      virus.push({
        x: rnd(60, view.vw - 60),
        y: view.scrollTop * RAIN_F + rnd(80, view.vh - 80),
        vx: rnd(-0.25, 0.25),
        vy: rnd(-0.18, 0.18),
        r: rnd(9, 14),
        phase: rnd(0, Math.PI * 2),
        glyph: GLYPH[(Math.random() * GLYPH.length) | 0],
        born: 0,
      });
    }

    const off = view.scrollTop * RAIN_F;

    for (let i = virus.length - 1; i >= 0; i--) {
      const v = virus[i];
      v.born = Math.min(1, v.born + 0.02 * dt);
      v.phase += 0.09 * dt;

      const sy = v.y - off;

      // Fuera de la banda visible: se retira sin ruido
      if (sy < -CULL_PAD || sy > view.vh + CULL_PAD) {
        virus.splice(i, 1);
        spawnT = Math.min(spawnT, 120);
        continue;
      }

      if (view.pointer.active) {
        const dx = v.x - view.pointer.x;
        const dy = sy - view.pointer.y;
        const d  = Math.hypot(dx, dy);

        if (d < KILL_R) {
          _kill(v, v.x, v.y);
          virus.splice(i, 1);
          spawnT = rnd(240, 480);
          continue;
        }
        if (d < FLEE_R && d > 0) {
          const f = (1 - d / FLEE_R) * 0.55;
          v.vx += (dx / d) * f * dt;
          v.vy += (dy / d) * f * dt;
        }
      }

      // Deriva errática
      v.vx += rnd(-0.02, 0.02) * dt;
      v.vy += rnd(-0.02, 0.02) * dt;
      v.vx *= 0.965; v.vy *= 0.965;
      const sp = Math.hypot(v.vx, v.vy);
      if (sp > 3.2) { v.vx = v.vx / sp * 3.2; v.vy = v.vy / sp * 3.2; }
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (v.x < 30) { v.x = 30; v.vx = Math.abs(v.vx); }
      if (v.x > view.vw - 30) { v.x = view.vw - 30; v.vx = -Math.abs(v.vx); }

      _drawVirus(ctx, v, v.x, v.y - off);
    }
  }

  function _drawVirus(ctx, v, x, y) {
    const puls = 1 + Math.sin(v.phase) * 0.18;
    const a = v.born;

    const halo = ctx.createRadialGradient(x, y, 0, x, y, v.r * 3.4 * puls);
    halo.addColorStop(0, rgba(C2, 0.30 * a));
    halo.addColorStop(0.55, rgba(C2, 0.10 * a));
    halo.addColorStop(1, rgba(C2, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, v.r * 3.4 * puls, 0, Math.PI * 2);
    ctx.fill();

    // Cúmulo glitcheado alrededor del núcleo
    ctx.font = `10px 'Fira Code', 'Courier New', monospace`;
    ctx.textAlign = 'center';
    for (let k = 0; k < 4; k++) {
      const ang = v.phase * (k % 2 ? -1 : 1) + (k * Math.PI) / 2;
      const rr  = v.r * (1.1 + 0.25 * Math.sin(v.phase * 1.7 + k));
      ctx.fillStyle = rgba(k % 2 ? C2 : C, (0.32 + 0.2 * Math.sin(v.phase + k)) * a);
      ctx.fillText(chr(), x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }

    ctx.font = `${Math.round(v.r * 1.5)}px 'Fira Code', 'Courier New', monospace`;
    ctx.fillStyle = rgba(C2, 0.88 * a);
    ctx.fillText(v.glyph, x, y + v.r * 0.5);
  }

  /* ── Desintegración ── */
  function _kill(v, x, y) {
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12 + rnd(-0.3, 0.3);
      const sp  = rnd(1.4, 4.2);
      debris.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        ch: chr(),
      });
    }
    flash.push({ x, y, life: 1 });
  }

  function _debris(dt, ctx, view) {
    const off = view.scrollTop * RAIN_F;
    ctx.font = `11px 'Fira Code', 'Courier New', monospace`;
    ctx.textAlign = 'center';

    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.94; d.vy *= 0.94;
      d.life -= 0.022 * dt;
      if (d.life <= 0) { debris.splice(i, 1); continue; }
      ctx.fillStyle = rgba(i % 3 === 0 ? C : C2, d.life * 0.85);
      ctx.fillText(d.ch, d.x, d.y - off);
    }
  }

  /* ── Fogonazo blanco donde murió el virus ── */
  function _flash(dt, ctx, view) {
    const off = view.scrollTop * RAIN_F;
    for (let i = flash.length - 1; i >= 0; i--) {
      const f = flash[i];
      f.life -= 0.035 * dt;
      if (f.life <= 0) { flash.splice(i, 1); continue; }
      const y = f.y - off;
      const r = 70 * (1 - f.life) + 20;
      const g = ctx.createRadialGradient(f.x, y, 0, f.x, y, r);
      g.addColorStop(0, `rgba(220,255,220,${f.life * 0.30})`);
      g.addColorStop(1, 'rgba(220,255,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function destroy() { cols = []; farCols = []; virus = []; debris = []; flash = []; }

  return { init, step, destroy };
})();

/* ────────────────────────────────────────────────────
   EXPORT
──────────────────────────────────────────────────── */
export const PortfolioBackground = { init };
