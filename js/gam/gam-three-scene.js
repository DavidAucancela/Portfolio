/**
 * gam-three-scene.js — cuarto de .gam sobre Three.js en vez de Phaser.
 *
 * v2 "diorama" + v3 "habitado" (docs/gam-mode-plan.md § "Pivote a Three.js"):
 * cámara ortográfica isométrica, cuarto cortado tipo maqueta sobre un
 * pedestal de museo (con plaquita `Jonathan.gam`), sol con sombras reales +
 * relleno hemisférico, muebles de bordes redondeados y postprocesado (GTAO +
 * contorno de hover + bloom solo sobre emisivos). A propósito NO hay
 * personaje caminando — la navegación es por selección de objeto:
 * hover/click (o tap), o flechas + Enter / números con teclado. Cada objeto
 * vive en su propio "rincón" del cuarto; enfocar uno es animar
 * `camera.zoom` + el punto al que mira, nunca mover la cámara hacia adelante.
 *
 * Contrato con gam-loader.js: exactamente el mismo que gam-scene.js (Phaser)
 * — dispara `window.dispatchEvent(new CustomEvent('gam:interact', { detail:
 * { id, kind, label, content } }))` por cada objeto. gam-loader.js no sabe
 * (ni le importa) qué motor de render generó el evento; todos los paneles,
 * el progreso y los minijuegos siguen intactos sin tocar ese archivo, salvo
 * por el shim `scene.pause()/resume()` que expone `mount()` — ver `_boot()`
 * en gam-loader.js, que llama `_game?.scene.pause('GamScene')` para congelar
 * el juego detrás de un panel abierto.
 *
 * El evento se dispara recién cuando la cámara TERMINA de llegar al objeto
 * (ver `onComplete` en `startTransition`/`focusFurniture`) — antes se
 * disparaba al toque del click, y el panel (que tapa toda la pantalla) se
 * abría antes de que el viaje de cámara llegara a verse.
 *
 * Deliberadamente NO se toca gam-scene.js (Phaser) — queda intacto en el
 * repo para poder revertir el spike con solo cambiar el import en
 * gam-loader.js si el enfoque no convence.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createHud } from './gam-hud.js';
import { createStations } from './gam-stations.js';

/* ────────────────────────────────────────────────────
   CUARTO — S = lado del piso, H = alto de pared, T = grosor. Piso con la
   cara de arriba en y=0; pared trasera en z=-S/2, izquierda en x=-S/2 (son
   las dos que quedan lejos de la cámara, ubicada en +x,+z). Debajo, un
   pedestal más oscuro (PED_H de alto, sobresale PED_MARGIN por lado).
──────────────────────────────────────────────────── */
const S = 6.8, H = 4.4, T = 0.25;
const HALF = S / 2;
const FLOOR_T = 0.3;
const PED_H = 0.5;
const PED_MARGIN = 0.35;
const FURN_SCALE = 1.15; // muebles más grandes que su diseño base ("se ven chicos")

/* ────────────────────────────────────────────────────
   LAYOUT — mismos 11 objetos, `kind` y `label` que FURNITURE en
   gam-scene.js (contrato de gam-loader.js), repartidos por rincones:
   pared trasera = escritorio (protagonista) + terminal + patineta apoyada;
   pared izquierda = estante + piano + diplomas + puerta; esquina
   frontal-derecha = cama; centro = alfombra con Pukis; frontal-izquierda =
   rincón de lectura.

   Convención local de cada objeto: origen en el piso, centro de su huella,
   frente mirando a +z. `rotY` lo gira en el mundo (π/2 = frente hacia +x,
   para lo que va contra la pared izquierda). `y` opcional = altura del
   origen (diplomas colgados). `scale` (default FURN_SCALE). `zoom` = cuánto
   acerca la cámara al enfocar.

   `interactive: false` (terminal/diplomas) — dejan de ser hotspots
   (no raycast, no click, no entrada en data/gam-hotspots.json ni en
   DISCOVERABLE_IDS de gam-loader.js) pero siguen como ambientación.
──────────────────────────────────────────────────── */
const WALL_FACING = Math.PI / 2;
const FURNITURE = [
  { id: 'piano',      x: -HALF + 0.34, z: 0.85,  rotY: WALL_FACING, color: 0xffb020, label: '🎹 Piano',            kind: 'minigame', zoom: 2.5, viewTilt: 0.45 },
  { id: 'desk',       x: -0.3,         z: -HALF + 0.47, rotY: 0,    color: 0x3b82f6, label: '🖥️ Escritorio',       kind: 'list', zoom: 2.0, artHeight: 1.9 },
  { id: 'juggling',   x: -1.45,        z: 2.35,  rotY: 0,           color: 0xff8a3d, label: '🤹 Malabares',        kind: 'video', zoom: 3, scale: 1.35 },
  { id: 'door',       x: -HALF,        z: 2.55,  rotY: WALL_FACING, color: 0x94a3b8, label: '🚪 Salir',            kind: 'exit', zoom: 2.2, scale: 1 },
  { id: 'skateboard', x: 3.0,          z: -HALF + 0.32, rotY: 0,    color: 0x06ffa5, label: '🛹 Patineta',         kind: '3d', zoom: 2.6 },
  { id: 'window',     x: 2.2,          z: -HALF, y: 0,   rotY: 0,           color: 0x7aa2ff, label: '🪟 Ventana',          kind: 'info', zoom: 3.2, scale: 1, noLift: true },
  { id: 'chess',      x: 0.25,         z: 0.8,    rotY: 0,           color: 0xe8d9b5, label: '♟️ Ajedrez',          kind: 'minigame', zoom: 7.5, elev: 1.15 },
  { id: 'pukis',      x: 1.95,         z: -2.55, rotY: -Math.PI / 2, color: 0xe9dcc0, label: '🐾 Pukis',            kind: 'info', zoom: 4.2, scale: 1.4, view: Math.PI / 2 },
  { id: 'bookshelf',  x: -HALF + 0.24, z: -2.55, rotY: WALL_FACING, color: 0xb14eff, label: '📚 Estante',          kind: 'list', zoom: 2.6, viewTilt: 0.5 },
  { id: 'lumbre',     x: -HALF,        z: -1.25, y: 0,   rotY: WALL_FACING, color: 0xffb020, label: '🕯️ Lumbre',           kind: 'info', zoom: 6.5, scale: 1, noLift: true, viewTilt: 0.5 },
];

/* ── Cámara ortográfica isométrica ──
   La cámara siempre está en `look + dir * CAM_DIST`, con `dir` = ISO_DIR
   (x = z → ángulo isométrico) girado un poco en Y por el parallax/deriva.
   FRUSTUM = alto visible del mundo a zoom 1; ROOM_WORLD_W = ancho que ocupa
   el diorama en pantalla (diagonal del piso + pedestal + margen) — en
   portrait se agranda el frustum para que no se corte a los costados
   (y se multiplica por DEFAULT_ZOOM: el zoom acerca todo por igual). */
const FRUSTUM = 12;
const ROOM_WORLD_W = 11.8;
const ISO_DIR = new THREE.Vector3(20, 16, 20).normalize();
const CAM_DIST = 30;
const DEFAULT_LOOK = new THREE.Vector3(0, 1.7, 0);
const DEFAULT_ZOOM = 1.15;    // acerca el diorama para que ocupe más del encuadre
const FOCUS_ZOOM = 2.4;
const FOCUS_ZOOM_BOOST = 1.35;   // el objeto enfocado pasa a ser el protagonista: más grande
const FRONT_ELEV = 0.65;      // elevación (y de la dirección) de la vista frontal al enfocar un objeto
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const PARALLAX_YAW = 0.03;    // rad (~1.7°) — el diorama "gira" levemente siguiendo el puntero
const PARALLAX_PITCH = 0.02;
const DRIFT_YAW = 0.02;       // deriva autónoma, no depende de mover el mouse
const TRANSITION_MS = 750;
const FOCUS_LERP = 0.07;      // suavizado del dimming al enfocar/desenfocar un objeto
const HOVER_GLOW = 0.22;      // bajo a propósito: no debe pasar el umbral del bloom
const HOVER_LIFT = 0.07;      // cuánto sube el objeto bajo el cursor

// ART REAL — mismo patrón que docs/jotai-renders.md: sin tocar código, basta
// con soltar public/images/gam/<id>.webp (spec/prompts en
// docs/gam-three-art-spec.md). Si no existe, sigue el objeto compuesto.
const ART_BASE = 'public/images/gam/';
const DEFAULT_ART_HEIGHT = 1.6;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ────────────────────────────────────────────────────
   Texturas pintadas en <canvas> — todo el arte del cuarto (piso, ventana,
   neón, pósters, alfombra, plaquita) sale de código: cero archivos nuevos.
──────────────────────────────────────────────────── */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** RNG determinista — las texturas se ven igual en cada visita. */
function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fondo: mismo negro que la página (`#050505`) con un resplandor ámbar muy
 *  apagado detrás del cuarto — el diorama parece iluminado por su propia
 *  luz y el canvas se funde con el sitio. Es `scene.background` (no un
 *  canvas transparente: el bloom rompe la transparencia). `paint(stops)`
 *  lo repinta con 3 colores CSS (centro, medio, borde) — lo usa el ciclo
 *  día/noche de la cama. */
function makeBackground() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  function paint([a, b, d]) {
    const g = ctx.createRadialGradient(256, 230, 20, 256, 256, 360);
    g.addColorStop(0, a);
    g.addColorStop(0.5, b);
    g.addColorStop(1, d);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    texture.needsUpdate = true;
  }
  paint(['#3a2408', '#140d05', '#050505']);
  return { texture, paint };
}

/** Sombra de contacto de la maqueta: mancha oscura difusa bajo el pedestal
 *  — lo que ancla el diorama al "suelo" en vez de dejarlo flotando. */
function makeContactShadow(size) {
  const tex = canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Tablones de madera: 14 hileras con tono/veta variable y juntas de testa. */
function makeFloorTexture(maxAniso) {
  const tex = canvasTexture(1024, 1024, (ctx, w) => {
    const rnd = seeded(11);
    const planks = 14;
    const ph = w / planks;
    for (let r = 0; r < planks; r++) {
      const y = r * ph;
      ctx.fillStyle = `hsl(${26 + rnd() * 6}, ${34 + rnd() * 8}%, ${32 + rnd() * 7}%)`;
      ctx.fillRect(0, y, w, ph);
      for (let g = 0; g < 7; g++) { // veta
        ctx.fillStyle = `rgba(${rnd() > 0.5 ? '0,0,0' : '255,220,170'},${0.04 + rnd() * 0.05})`;
        ctx.fillRect(0, y + rnd() * ph, w, 1 + rnd() * 1.5);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; // junta entre hileras
      ctx.fillRect(0, y, w, 2.5);
      for (let j = 0; j < 2; j++) { // junta de testa
        ctx.fillRect(rnd() * w, y, 2.5, ph);
      }
    }
  });
  tex.anisotropy = maxAniso;
  return tex;
}

/** Cielo de la ventana: cerros + luces de ciudad (Quito de noche) que se
 *  vuelve cielo de día con sol y nubes. `paint(t)`: 0 = día, 0.5 = noche
 *  (el aspecto por defecto), 1 = noche profunda. */
function makeSky() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 400;
  const ctx = c.getContext('2d');
  const w = 512, h = 400;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const col = (n, d, k) => new THREE.Color(n).lerp(new THREE.Color(d), k).getStyle();

  function paint(t) {
    const day = clamp01((0.5 - t) / 0.5);
    const deep = clamp01((t - 0.5) / 0.5);
    const rnd = seeded(5);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, col('#050a1c', '#4a9bff', day));
    sky.addColorStop(0.55, col('#15224e', '#8fc8ff', day));
    sky.addColorStop(1, col('#3b2a4a', '#ffe2b0', day));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46 + deep * 30; i++) { // estrellas
      ctx.fillStyle = `rgba(255,255,255,${(0.3 + rnd() * 0.6) * (1 - day)})`;
      ctx.fillRect(rnd() * w, rnd() * h * 0.5, 1.4, 1.4);
    }
    if (day < 0.95) { // luna
      ctx.globalAlpha = 1 - day;
      const moon = ctx.createRadialGradient(400, 78, 4, 400, 78, 40);
      moon.addColorStop(0, '#fff6d8');
      moon.addColorStop(0.25, '#fff0c0');
      moon.addColorStop(1, 'rgba(255,240,192,0)');
      ctx.fillStyle = moon;
      ctx.fillRect(340, 20, 120, 120);
      ctx.globalAlpha = 1;
    }
    if (day > 0.05) { // sol + nubes
      ctx.globalAlpha = day;
      const sunG = ctx.createRadialGradient(130, 90, 6, 130, 90, 70);
      sunG.addColorStop(0, '#fffbe0');
      sunG.addColorStop(0.3, '#ffe27a');
      sunG.addColorStop(1, 'rgba(255,226,122,0)');
      ctx.fillStyle = sunG;
      ctx.fillRect(40, 0, 180, 180);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[300, 90, 60, 16], [420, 150, 46, 12], [220, 170, 40, 10]].forEach(([x, y, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col('#0a0f20', '#2f5d4a', day); // cerros
    ctx.beginPath();
    ctx.moveTo(0, h);
    [[0, 250], [70, 210], [140, 240], [230, 175], [320, 235], [400, 200], [470, 240], [512, 220]]
      .forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    const colors = ['#ffd27a', '#fff2c4', '#ffb060', '#9fd0ff'];
    for (let i = 0; i < 260; i++) { // luces de la ciudad
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.globalAlpha = (0.55 + rnd() * 0.45) * (1 - day);
      const y = h * 0.68 + rnd() * h * 0.32;
      ctx.fillRect(rnd() * w, y, 1.5 + rnd(), 1.5 + rnd());
    }
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }
  paint(0.5);
  return { texture, paint };
}

/** Letrero de neón `.gam` con halo ámbar (fondo transparente). */
function makeNeonTexture() {
  return canvasTexture(512, 192, (ctx, w, h) => {
    ctx.font = 'bold 132px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffb020';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffd98a';
    ctx.fillText('.gam', w / 2, h / 2 + 6);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff3d0';
    ctx.fillText('.gam', w / 2, h / 2 + 6);
  });
}

/** Pantallas del escritorio: editor de código (barras de sintaxis) o galería
 *  de proyectos (grilla de miniaturas) — legibles como pantallas en vez de
 *  manchas blancas. Se usan como `map` + `emissiveMap`. */
function makeScreenTexture(kind, seed) {
  return canvasTexture(256, 160, (ctx, w, h) => {
    const rnd = seeded(seed);
    ctx.fillStyle = kind === 'code' ? '#0d1117' : kind === 'term' ? '#031008' : '#12141a';
    ctx.fillRect(0, 0, w, h);
    if (kind === 'term') {
      ctx.fillStyle = '#00ff41';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText('$ nmap -sV 10.10.x.x', 12, 24);
      for (let i = 0; i < 9; i++) {
        ctx.globalAlpha = 0.4 + rnd() * 0.5;
        ctx.fillRect(12, 40 + i * 12, 30 + rnd() * 170, 5);
      }
      ctx.globalAlpha = 1;
      ctx.fillRect(12, 148, 9, 3);
    } else if (kind === 'code') {
      const colors = ['#7cc4ff', '#ff7b72', '#d2a8ff', '#7ee787', '#ffa657'];
      for (let i = 0; i < 12; i++) {
        let x = 14 + (i % 4 === 1 || i % 4 === 2 ? 22 : 0);
        for (let seg = 0; seg < 3; seg++) {
          const len = 16 + rnd() * 44;
          ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
          ctx.fillRect(x, 14 + i * 11.5, len, 5);
          x += len + 6;
        }
      }
    } else {
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 3; gy++) {
          ctx.fillStyle = `hsl(${Math.floor(rnd() * 360)}, 60%, ${38 + rnd() * 16}%)`;
          ctx.fillRect(10 + gx * 60, 10 + gy * 48, 54, 40);
        }
      }
    }
  });
}

/** Pelota tejida a mano: bandas de 2–3 colores con puntadas en diagonal. */
function makeYarnTexture(colors, seed) {
  const tex = canvasTexture(256, 128, (ctx, w, h) => {
    const rnd = seeded(seed);
    const bands = colors.length + 1;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(0, (i * h) / bands, w, h / bands + 1);
    }
    // puntadas: pares de trazos oscuro/claro cruzados
    for (let y = 0; y < h; y += 5) {
      for (let x = (y / 5) % 2 ? 0 : 3; x < w; x += 6) {
        const j = rnd() * 1.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y + j); ctx.lineTo(x + 3, y + 4 + j); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.moveTo(x + 3, y + j); ctx.lineTo(x, y + 4 + j); ctx.stroke();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

/** Extras de material para una pantalla con textura emisiva. */
function screenExtra(tex, intensity = 1.1) {
  return { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity };
}

function makePosterSunset() {
  return canvasTexture(256, 352, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1a0f30');
    bg.addColorStop(0.6, '#5a1f4a');
    bg.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createLinearGradient(0, 70, 0, 230);
    sun.addColorStop(0, '#ffd070');
    sun.addColorStop(1, '#ff4f6a');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w / 2, 150, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a1a44'; // cortes de la puesta de sol
    for (let i = 0; i < 6; i++) ctx.fillRect(w / 2 - 80, 150 + i * 13, 160, 2 + i * 1.6);
    ctx.strokeStyle = 'rgba(255,79,138,0.7)'; // grilla en perspectiva
    ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, 232);
      ctx.lineTo(w / 2 + i * 55, h);
      ctx.stroke();
    }
    for (let y = 250; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

/** Grip de la patineta: negro rugoso + logo rasta (3 barras) + ícono de cuadritos dorados. */
function makeGripTexture() {
  return canvasTexture(256, 1024, (ctx, w, h) => {
    const rnd = seeded(77);
    ctx.fillStyle = '#131316';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    ctx.save();
    ctx.translate(w * 0.5, h * 0.4);
    ctx.rotate(-0.12);
    [['#c0392b', -34], ['#f1c40f', 0], ['#27ae60', 34]].forEach(([col, dy], i) => {
      ctx.fillStyle = col;
      ctx.fillRect(-92 + i * 16, dy - 15, 150, 26);
    });
    ctx.restore();
    ctx.fillStyle = '#c9a26a';
    [[0, 0], [30, 14], [60, 0], [30, -14], [30, 42]].forEach(([dx, dy]) => {
      ctx.save();
      ctx.translate(w * 0.5 - 30 + dx, h * 0.62 + dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    });
  });
}

function makeRugTexture() {
  return canvasTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#26344d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8862a';
    ctx.lineWidth = 16;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = '#d9cfa8';
    ctx.lineWidth = 4;
    ctx.strokeRect(38, 38, w - 76, h - 76);
    ctx.fillStyle = 'rgba(217,207,168,0.22)'; // rombos de fondo
    for (let x = 60; x < w - 40; x += 48) {
      for (let y = 60; y < h - 40; y += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y - 14); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 14, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c8862a'; // medallón central
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 62, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26344d';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 46, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makePlaqueTexture() {
  return canvasTexture(512, 80, (ctx, w, h) => {
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,176,32,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb020';
    ctx.fillText('Jonathan.gam', w / 2, h / 2 + 2);
  });
}

/**
 * Monta el cuarto dentro de `container` (el mismo #gam-canvas-root que usaba
 * Phaser). `hotspots` es el array ya fetcheado de data/gam-hotspots.json
 * (mismo shape que recibía `new GamScene(hotspots)`).
 *
 * Devuelve { scene: { pause, resume }, destroy } — shape compatible con lo
 * que gam-loader.js espera de `_game` (ver comentario arriba).
 */
export function mount(container, hotspots) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Táctil = GPU de celular: sin GTAO ni contorno, sombras a 1024 y DPR más bajo.
  const lite = window.matchMedia('(pointer: coarse)').matches;
  const hotspotsById = new Map(hotspots.map(h => [h.id, h]));

  const scene = new THREE.Scene();
  // Glifos flotantes (♪ ❤ z…) van en su propia escena, dibujada DESPUÉS del composer:
  // dentro de la escena principal el pase GTAO los trata como geometría opaca (cuadros negros).
  const overlay = new THREE.Scene();
  const background = makeBackground();
  const bgTexture = background.texture;
  scene.background = bgTexture;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.zoom = DEFAULT_ZOOM;
  const camLook = DEFAULT_LOOK.clone();
  let yaw = 0;
  let pitch = 0;
  const camDir = new THREE.Vector3();
  const baseDir = ISO_DIR.clone(); // dirección base: isométrica en reposo, frontal al enfocar
  function applyCamera() {
    camDir.set(baseDir.x, baseDir.y + pitch, baseDir.z).normalize().applyAxisAngle(Y_AXIS, yaw);
    camera.position.copy(camLook).addScaledVector(camDir, CAM_DIST);
    camera.lookAt(camLook);
  }
  applyCamera();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // (PCFSoftShadowMap ya no existe en esta versión de three)
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;cursor:default;';
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  /* Etiqueta flotante con el nombre del objeto bajo el cursor (DOM, no
     3D: texto nítido y estilo del sitio — ver .gam-label en gam-tv.css). */
  const label = document.createElement('div');
  label.className = 'gam-label';
  label.setAttribute('aria-hidden', 'true');
  container.appendChild(label);

  /* ── Luces: relleno hemisférico suave + sol cálido con sombras reales +
     lámpara del escritorio (posicionada al armar el escritorio) + luz fría
     de la ventana + foco puntual que solo se enciende sobre el objeto
     seleccionado. Los LEDs/pantallas no llevan luz real: emisivo + bloom. ── */
  // Intensidades base — las mueve el ciclo día/noche (`applyEnv`, más abajo)
  const base = { hemi: 0.6, sun: 2.2, lamp: 3, window: 2.2 };
  const FOCUS_MAX = 6;

  const hemiLight = new THREE.HemisphereLight(0xdfe8ff, 0x3a2a20, base.hemi);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffe2c0, base.sun);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const lamp = new THREE.PointLight(0xffa040, base.lamp, 4, 2);
  scene.add(lamp);

  // Luz fría que entra por la ventana — contraste de temperatura con la lámpara cálida.
  const windowLight = new THREE.PointLight(0x7aa2ff, base.window, 6, 2);
  scene.add(windowLight);

  const focusLight = new THREE.PointLight(0xffe9c2, 0, 5, 2);
  scene.add(focusLight);

  /* ── Diorama: pedestal + piso con grosor (tablones) + pared trasera +
     pared izquierda + zócalo + borde claro arriba (aspecto de maqueta) ── */
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 0.9 });
  const slabMat  = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.85 }); // losa: más oscura que la superficie
  const floorTopMat = new THREE.MeshStandardMaterial({ map: makeFloorTexture(maxAniso), roughness: 0.8 });
  const pedMat   = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 });
  const room = new THREE.Group();
  scene.add(room);
  const roomBox = (w, h, d, material, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    room.add(m);
    return m;
  };
  // BoxGeometry: orden de caras +x, -x, +y, -y, +z, -z → la de arriba es la 3ª.
  roomBox(S, FLOOR_T, S, [slabMat, slabMat, floorTopMat, slabMat, slabMat, slabMat], 0, -FLOOR_T / 2, 0);
  const pedSize = S + PED_MARGIN * 2;
  const pedY = -FLOOR_T - PED_H / 2;
  roomBox(pedSize, PED_H, pedSize, pedMat, 0, pedY, 0);
  roomBox(S, H, T, wallMat, 0, H / 2, -HALF - T / 2);              // pared trasera
  roomBox(T, H, S, wallMat, -HALF - T / 2, H / 2, 0);              // pared izquierda
  // El borde va ENCIMA de la pared (no solapado) y con un pequeño voladizo: si comparte
  // planos con la pared hay z-fighting/acné de sombra que titila al derivar la cámara.
  roomBox(S + T + 0.04, 0.08, T + 0.04, trimMat, -T / 2, H + 0.04, -HALF - T / 2);         // borde superior trasero
  roomBox(T + 0.04, 0.079, S, trimMat, -HALF - T / 2, H + 0.0395, 0);                      // borde superior izquierdo
  roomBox(S, 0.15, 0.06, trimMat, 0, 0.075, -HALF + 0.03);         // zócalo trasero
  roomBox(0.06, 0.15, S, trimMat, -HALF + 0.03, 0.075, 0);         // zócalo izquierdo

  // Plaquita de museo en la cara frontal (+z) del pedestal.
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.36),
    new THREE.MeshStandardMaterial({ map: makePlaqueTexture(), roughness: 0.6, metalness: 0.3 })
  );
  plaque.position.set(0, pedY + 0.02, pedSize / 2 + 0.005);
  room.add(plaque);

  const contactShadow = makeContactShadow(pedSize * 2.1);
  contactShadow.position.y = -FLOOR_T - PED_H - 0.02;
  scene.add(contactShadow);

  /* ── Piezas: formas compuestas simples con bordes redondeados. Cada pieza
     tiene su propio material (el hover tiñe solo las del objeto) y guarda su
     emisivo base, así sacar el hover no apaga pantallas/LEDs. ── */
  function mat(color, extra) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, emissive: 0x000000, ...extra });
  }
  function addPart(group, parts, geometry, color, x, y, z, extra) {
    const mesh = new THREE.Mesh(geometry, mat(color, extra));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.baseEmissive = mesh.material.emissive.getHex();
    mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity;
    group.add(mesh);
    parts.push(mesh);
    return mesh;
  }
  const box = (w, h, d) => new RoundedBoxGeometry(w, h, d, 4, Math.min(0.06, Math.min(w, h, d) * 0.3));
  const cyl = (r, h, rb = r, seg = 20) => new THREE.CylinderGeometry(r, rb, h, seg);
  const sph = (r) => new THREE.SphereGeometry(r, 20, 14);
  const glow = (color, intensity = 3) => ({ emissive: color, emissiveIntensity: intensity });

  /** Planta en maceta: hojas = conos inclinados hacia afuera. */
  function addPlant(group, parts, x, y, z, s, leafColor = 0x3fa66b) {
    addPart(group, parts, cyl(0.09 * s, 0.14 * s, 0.065 * s), 0xc2553a, x, y + 0.07 * s, z);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = addPart(group, parts, new THREE.ConeGeometry(0.05 * s, (0.34 + (i % 3) * 0.08) * s, 6), leafColor,
        x + Math.cos(a) * 0.05 * s, y + (0.28 + (i % 3) * 0.04) * s, z + Math.sin(a) * 0.05 * s, { roughness: 0.9 });
      leaf.rotation.x = Math.sin(a) * 0.45;
      leaf.rotation.z = -Math.cos(a) * 0.45;
    }
  }

  /* ── Decoración fija del cuarto (sin hover ni raycast): ventana nocturna,
     neón `.gam`, pósters, reloj, repisas, plantas, alfombra, parlante y
     mochila — el cuarto se siente habitado por acumulación de objetos. ── */
  const decorParts = [];
  let sky = null;      // cielo de la ventana (repintable)
  let neonMat = null;  // material del neón .gam
  const decor = new THREE.Group();
  scene.add(decor);
  const dMesh = (geometry, material, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    decor.add(m);
    return m;
  };

  // Alfombra con patrón bajo Pukis (top con textura, bordes lisos).
  {
    const rugEdge = mat(0x1c2638);
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.03, 1.9),
      [rugEdge, rugEdge, new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 0.95 }), rugEdge, rugEdge, rugEdge]
    );
    rug.position.set(0.2, 0.015, 0.9);
    rug.receiveShadow = true;
    decor.add(rug);
  }

  // Repisa de trofeos sobre el escritorio + tira LED cian.
  {
    const shelfX = -0.3, shelfY = 2.55, shelfZ = -HALF + 0.15;
    addPart(decor, decorParts, box(2.4, 0.05, 0.3), 0xe8e4dc, shelfX, shelfY, shelfZ);
    addPart(decor, decorParts, box(2.3, 0.02, 0.02), 0x00e5ff, shelfX, shelfY - 0.04, shelfZ + 0.13, glow(0x00e5ff));
    const trophy = { metalness: 0.8, roughness: 0.3 };
    [[-0.8, 1], [-0.25, 1.3], [0.3, 0.85], [0.85, 1.1]].forEach(([dx, s]) => {
      const baseY = shelfY + 0.025;
      addPart(decor, decorParts, box(0.14 * s, 0.05 * s, 0.14 * s), 0x2a2a2a, shelfX + dx, baseY + 0.025 * s, shelfZ);
      addPart(decor, decorParts, cyl(0.02 * s, 0.1 * s), 0xffc94a, shelfX + dx, baseY + 0.1 * s, shelfZ, trophy);
      addPart(decor, decorParts, cyl(0.08 * s, 0.14 * s, 0.035 * s), 0xffc94a, shelfX + dx, baseY + 0.22 * s, shelfZ, trophy);
    });
  }

  // Ventana nocturna (pared trasera, sobre la terminal) + luz fría.
  {
    const wx = 2.2, wy = 3.0, ww = 1.2, wh = 1.3, wz = -HALF;
    sky = makeSky();
    const nightTex = sky.texture;
    dMesh(
      new THREE.PlaneGeometry(ww, wh),
      new THREE.MeshStandardMaterial({ color: 0x111111, map: nightTex, emissive: 0xffffff, emissiveMap: nightTex, emissiveIntensity: 1 }),
      wx, wy, wz + 0.012
    );
    windowLight.position.set(wx, wy - 0.1, wz + 1.1);
  }

  // Neón `.gam` (pared izquierda, entre los diplomas y la puerta): color HDR
  // (>1) sobre un MeshBasicMaterial → supera el umbral del bloom y brilla.
  {
    neonMat = new THREE.MeshBasicMaterial({ map: makeNeonTexture(), transparent: true, depthWrite: false });
    neonMat.color.setScalar(1.35);
    dMesh(new THREE.PlaneGeometry(1.35, 0.5), neonMat, -HALF + 0.012, 3.2, 1.15, Math.PI / 2);
  }

  // Pósters + marcos.
  {
    const p1 = new THREE.MeshStandardMaterial({ map: makePosterSunset(), roughness: 0.8 });
    dMesh(new THREE.PlaneGeometry(0.62, 0.86), p1, -2.35, 2.9, -HALF + 0.034);
    addPart(decor, decorParts, box(0.68, 0.92, 0.03), 0x1a1a1a, -2.35, 2.9, -HALF + 0.012);
  }

  // Reloj de pared (la manecilla de segundos anima en el loop).
  let clockSecond = new THREE.Group();
  {
    const cx = 1.25, cy = 3.55, cz = -HALF + 0.04;
    const ring = addPart(decor, decorParts, cyl(0.29, 0.05), 0x2a2a2a, cx, cy, cz);
    ring.rotation.x = Math.PI / 2;
    const face = addPart(decor, decorParts, cyl(0.26, 0.052), 0xf5efe0, cx, cy, cz + 0.002);
    face.rotation.x = Math.PI / 2;
    const now = new Date();
    const hand = (len, w, angle, z) => {
      const g = new THREE.Group();
      g.position.set(cx, cy, cz + z);
      g.rotation.z = -angle;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.008), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      m.position.y = len / 2 - 0.02;
      g.add(m);
      decor.add(g);
      return g;
    };
    hand(0.14, 0.02, ((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6), 0.032);
    hand(0.21, 0.014, now.getMinutes() * (Math.PI / 30), 0.038);
    clockSecond = hand(0.23, 0.007, 0, 0.044);
    clockSecond.children[0].material.color.setHex(0xc0392b);
  }

  // Parlante de piso (junto al escritorio) y guitarra.
  {
    const spk = new THREE.Group();
    spk.position.set(-2.55, 0, -HALF + 0.3);
    spk.rotation.y = 0.35;
    decor.add(spk);
    addPart(spk, decorParts, box(0.34, 0.64, 0.3), 0x16181d, 0, 0.32, 0);
    [[0.2, 0.12], [0.46, 0.07]].forEach(([y, r]) => {
      const cone = addPart(spk, decorParts, cyl(r, 0.03), 0x2a2d35, 0, y + 0.02, 0.15);
      cone.rotation.x = Math.PI / 2;
      const ring = addPart(spk, decorParts, cyl(r * 0.42, 0.034), 0x6b7280, 0, y + 0.02, 0.152);
      ring.rotation.x = Math.PI / 2;
    });

    // Guitarra acústica apoyada contra la pared izquierda (frente hacia +x).
    const guitar = new THREE.Group();
    guitar.position.set(-HALF + 0.3, 0, -1.4);
    guitar.rotation.z = 0.1;
    decor.add(guitar);
    const wood = 0xc98a4b;
    const lower = addPart(guitar, decorParts, cyl(0.17, 0.09), wood, 0, 0.3, 0, { roughness: 0.55 });
    lower.rotation.z = Math.PI / 2;
    const upper = addPart(guitar, decorParts, cyl(0.13, 0.09), wood, 0, 0.55, 0, { roughness: 0.55 });
    upper.rotation.z = Math.PI / 2;
    addPart(guitar, decorParts, box(0.09, 0.14, 0.2), wood, 0, 0.43, 0, { roughness: 0.55 });        // cintura
    const hole = addPart(guitar, decorParts, cyl(0.045, 0.006), 0x1a0f08, 0.047, 0.5, 0);
    hole.rotation.z = Math.PI / 2;
    addPart(guitar, decorParts, box(0.012, 0.03, 0.14), 0x2b1a10, 0.05, 0.22, 0);                     // puente
    addPart(guitar, decorParts, box(0.035, 0.6, 0.05), 0x2b1a10, 0.02, 0.98, 0);                      // mástil
    addPart(guitar, decorParts, box(0.04, 0.16, 0.07), 0x2b1a10, 0.02, 1.34, 0);                      // clavijero
    [-0.02, 0.02].forEach((dz) => addPart(guitar, decorParts, box(0.004, 1.0, 0.004), 0xd8d8d0, 0.05, 0.82, dz)); // cuerdas
  }

  /** Devuelve { group, baseY, parts, lampAnchor?, breathe?, floaters?,
   *  flickers?, rgb?, bulb? } para un objeto de FURNITURE, en coordenadas
   *  locales (ver convención arriba). baseY es la altura (local) a la que la
   *  cámara mira al enfocarlo. Las listas extra alimentan las animaciones en
   *  reposo del loop. */
  function buildFurnitureGroup(f) {
    const group = new THREE.Group();
    const parts = [];
    const add = (...args) => addPart(group, parts, ...args);
    const out = { group, parts, baseY: 0.5, floaters: [], flickers: [], refs: {} };

    switch (f.id) {
      case 'piano': {
        // Teclado eléctrico sobre soporte en X: cuerpo negro con panel de control
        // (parlantes, pantalla, botones), 15 teclas blancas (2 octavas) + negras,
        // soporte cruzado con patas y banqueta al frente.
        const black = 0x15171b;
        const topY = 0.77;
        add(box(1.3, 0.07, 0.36), black, 0, topY - 0.035, 0.02);            // cuerpo
        add(box(1.3, 0.05, 0.17), 0x0f1013, 0, topY + 0.02, -0.1);          // panel de control trasero
        [-0.5, 0.5].forEach(x => add(box(0.22, 0.012, 0.12), 0x07080a, x, topY + 0.05, -0.1)); // parlantes
        add(box(0.2, 0.012, 0.06), 0x1a2a3a, 0, topY + 0.05, -0.1, glow(0x4aa8ff, 0.7)); // pantalla LCD
        [-0.24, -0.17, 0.17, 0.24].forEach((x, k) => add(box(0.045, 0.012, 0.03), k % 2 ? 0xc9c9c9 : 0x8a8f98, x, topY + 0.05, -0.12));
        [-0.11, 0.11].forEach(x => add(cyl(0.02, 0.02), 0x8a8f98, x, topY + 0.055, -0.07));      // perillas
        add(box(1.32, 0.02, 0.03), 0x0b0c0e, 0, topY - 0.005, 0.2);                            // labio frontal

        // 15 teclas blancas (una por nota, ver gam-piano.js) + 10 negras decorativas
        const KEYS = 15, kw = 1.2 / KEYS;
        out.refs.keys = [];
        for (let i = 0; i < KEYS; i++) {
          const key = add(box(kw * 0.94, 0.03, 0.2), 0xf2e6d2, (i - (KEYS - 1) / 2) * kw, topY + 0.015, 0.1);
          key.userData.baseY = topY + 0.015;
          out.refs.keys.push(key);
        }
        [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(i => add(box(kw * 0.56, 0.03, 0.12), 0x0b0b0d, (i - (KEYS - 1) / 2 + 0.5) * kw, topY + 0.035, 0.05));

        // soporte en X: dos barras cruzadas, patas de piso y perilla central
        const dx = 0.5, yTop = topY - 0.075, yBot = 0.03;
        const len = Math.hypot(2 * dx, yTop - yBot), ang = Math.atan2(yTop - yBot, 2 * dx);
        [ang, -ang].forEach(a => {
          const bar = add(box(len, 0.035, 0.035), 0x101114, 0, (yTop + yBot) / 2, 0.02);
          bar.rotation.z = a;
        });
        add(cyl(0.035, 0.05), 0x2a2d35, 0, (yTop + yBot) / 2, 0.045).rotation.x = Math.PI / 2;   // perilla
        [-dx, dx].forEach(x => {
          add(box(0.05, 0.03, 0.36), 0x101114, x, 0.015, 0.02);            // pata de piso
          add(box(0.06, 0.02, 0.06), 0x2a2d35, x, yTop, 0.02);             // soporte del teclado
        });
        add(box(0.8, 0.08, 0.32), 0x3d2a18, 0, 0.46, 0.85);
        [[-0.34, 0.74], [0.34, 0.74], [-0.34, 0.96], [0.34, 0.96]].forEach(([x, z]) => add(cyl(0.025, 0.42), 0x3d2a18, x, 0.21, z));
        out.baseY = 0.8;
        break;
      }

      case 'desk': {
        // El protagonista: escritorio ancho, dos monitores, laptop, teclado
        // con brillo RGB, tapete, cables, lámpara con PointLight real, taza,
        // auriculares y silla gamer (retirada hacia atrás para no tapar las
        // pantallas desde la cámara isométrica).
        const topY = 0.75;
        add(box(2.6, 0.07, 0.8), 0x6b4a30, 0, topY - 0.035, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(box(0.06, topY - 0.07, 0.06), 0x2a2a2a, sx * 1.24, (topY - 0.07) / 2, sz * 0.34));
        add(box(1.5, 0.01, 0.5), 0x1a1d24, 0.1, topY + 0.005, 0.14);                 // tapete
        add(box(1.5, 0.012, 0.02), 0xffb020, 0.1, topY + 0.006, 0.4);                // borde ámbar

        // Mac de escritorio (estilo iMac: aluminio, mentón inferior, pie plano)
        const codeTex = makeScreenTexture('code', 3);
        codeTex.wrapT = THREE.RepeatWrapping;
        out.refs.scrollTex = [codeTex];
        add(box(0.24, 0.014, 0.19), 0xc9ccd2, -0.35, topY + 0.007, -0.24);            // base
        add(box(0.07, 0.3, 0.03), 0xc9ccd2, -0.35, topY + 0.17, -0.3);                // cuello
        add(box(0.96, 0.6, 0.035), 0xd9dce1, -0.35, topY + 0.52, -0.27);              // cuerpo
        out.flickers.push(add(box(0.9, 0.5, 0.01), 0x222222, -0.35, topY + 0.565, -0.25, screenExtra(codeTex)));
        add(box(0.03, 0.03, 0.005), 0x9a9da3, -0.35, topY + 0.26, -0.25);             // logo del mentón

        // monitor secundario, girado hacia el usuario
        const m2 = new THREE.Group();
        m2.position.set(0.72, 0, -0.22);
        m2.rotation.y = -0.32;
        group.add(m2);
        const add2 = (...args) => addPart(m2, parts, ...args);
        add2(box(0.22, 0.02, 0.16), 0x1a1a1a, 0, topY + 0.01, 0);
        add2(box(0.05, 0.28, 0.05), 0x1a1a1a, 0, topY + 0.15, -0.03);
        add2(box(0.72, 0.44, 0.04), 0x151515, 0, topY + 0.44, -0.02);
        out.flickers.push(add2(box(0.66, 0.38, 0.01), 0x222222, 0, topY + 0.44, 0.005, screenExtra(makeScreenTexture('gallery', 9))));

        // trackpad + mouse (sin teclado)
        add(box(0.16, 0.01, 0.12), 0xe6e8ec, -0.2, topY + 0.02, 0.26);
        add(box(0.06, 0.03, 0.1), 0xf5f5f5, 0.42, topY + 0.02, 0.26);

        // lámpara (base, brazo, pantalla, bombilla emisiva) → PointLight real
        add(cyl(0.08, 0.03), 0xf0f0f0, -1.15, topY + 0.015, -0.22);
        add(cyl(0.015, 0.5), 0xf0f0f0, -1.15, topY + 0.25, -0.22);
        add(new THREE.ConeGeometry(0.12, 0.14, 20), 0xf0f0f0, -1.11, topY + 0.55, -0.16);
        out.bulb = add(sph(0.045), 0xffd9a0, -1.11, topY + 0.47, -0.16, glow(0xffd9a0, 1.5));
        out.lampAnchor = new THREE.Vector3(-1.11, topY + 0.4, -0.1);

        // taza + auriculares en su soporte
        add(cyl(0.04, 0.09), 0xf5efe0, -0.72, topY + 0.045, 0.3);
        add(cyl(0.034, 0.006), 0x3a2216, -0.72, topY + 0.087, 0.3, { roughness: 0.3 });   // café
        out.steam = [];
        for (let i = 0; i < 3; i++) {
          const puff = add(sph(0.022), 0xffffff, -0.72, topY + 0.1, 0.3, { transparent: true, opacity: 0.3, roughness: 1, depthWrite: false });
          puff.castShadow = false;
          puff.userData.steam = { base: topY + 0.1, phase: i / 3, x: -0.72, z: 0.3 };
          out.steam.push(puff);
        }
        add(new THREE.TorusGeometry(0.028, 0.008, 8, 12), 0xf5efe0, -0.68, topY + 0.05, 0.3);
        add(cyl(0.05, 0.01), 0x1a1a1a, 1.12, topY + 0.005, 0.1);
        add(cyl(0.01, 0.22), 0x1a1a1a, 1.12, topY + 0.115, 0.1);
        const band = add(new THREE.TorusGeometry(0.09, 0.012, 8, 20, Math.PI), 0x1a1a1a, 1.12, topY + 0.2, 0.1);
        band.rotation.z = 0;
        [-0.09, 0.09].forEach(dx => {
          const cup = add(cyl(0.04, 0.035), 0xffb020, 1.12 + dx, topY + 0.2, 0.1);
          cup.rotation.z = Math.PI / 2;
        });

        // cables: de cada monitor hacia atrás y al piso
        [[-0.35, -0.3], [0.7, -0.28]].forEach(([x, z]) => {
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, topY + 0.2, z - 0.03),
            new THREE.Vector3(x, topY + 0.02, z - 0.1),
            new THREE.Vector3(x + 0.05, 0.5, z - 0.1),
            new THREE.Vector3(x + 0.1, 0.01, z - 0.06),
            new THREE.Vector3(x + 0.35, 0.01, z + 0.05),
          ]);
          add(new THREE.TubeGeometry(curve, 24, 0.012, 6, false), 0x111111, 0, 0, 0);
        });

        // silla gamer (base de 5 patas, asiento, respaldo alto con franjas)
        const chair = new THREE.Group();
        chair.position.set(-0.15, 0, 1.35);
        chair.rotation.y = 0.5;
        group.add(chair);
        const addC = (...args) => addPart(chair, parts, ...args);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const leg = addC(box(0.3, 0.03, 0.05), 0x1a1a1a, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
          leg.rotation.y = -a;
          addC(sph(0.025), 0x0d0d0d, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3);
        }
        addC(cyl(0.035, 0.36), 0x2a2a2a, 0, 0.24, 0);
        addC(box(0.52, 0.1, 0.5), 0x1c1f26, 0, 0.47, 0);
        addC(box(0.5, 0.72, 0.09), 0x1c1f26, 0, 0.88, 0.25);
        addC(box(0.3, 0.16, 0.08), 0x1c1f26, 0, 1.36, 0.25);
        [-0.13, 0.13].forEach(x => addC(box(0.06, 0.6, 0.006), 0xffb020, x, 0.88, 0.298));
        [-0.29, 0.29].forEach(x => {
          addC(box(0.06, 0.03, 0.3), 0x2a2a2a, x, 0.68, 0.02);
          addC(box(0.03, 0.18, 0.03), 0x2a2a2a, x, 0.57, 0.04);
        });
        out.baseY = 1.0;
        break;
      }

      case 'chess': {
        // Mesita con tablero de 8×8 casillas (las piezas las arma la estación).
        const topY = 0.6;
        const cell = 0.08;
        add(box(0.78, 0.05, 0.78), 0x5a3d28, 0, topY - 0.025, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(box(0.05, topY - 0.05, 0.05), 0x3d2a18, sx * 0.34, (topY - 0.05) / 2, sz * 0.34));
        add(box(0.7, 0.02, 0.7), 0x2b1a10, 0, topY + 0.01, 0);
        out.refs.squares = [];
        out.refs.cell = cell;
        out.refs.boardY = topY + 0.02;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const light = (r + c) % 2 === 0;
            const sq = add(box(cell * 0.985, 0.014, cell * 0.985), light ? 0xe0c497 : 0x8b5a3a, (c - 3.5) * cell, topY + 0.02 + 0.007, (r - 3.5) * cell, { roughness: 0.6 });
            sq.userData.sq = r * 8 + c;
            out.refs.squares.push(sq);
          }
        }
        // dos banquitos a los lados de la mesa
        [-0.66, 0.66].forEach((x) => {
          add(cyl(0.15, 0.05), 0x3d2a18, x, 0.36, 0.02);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(cyl(0.02, 0.34), 0x2a1a10, x + sx * 0.09, 0.17, 0.02 + sz * 0.09));
        });
        out.baseY = topY + 0.05;
        break;
      }

      case 'juggling': {
        // Pedestal con las 6 pelotas tejidas a mano: 3 abajo, 2 en medio, 1 arriba.
        add(box(0.4, 0.7, 0.4), 0x3d2a18, 0, 0.35, 0);
        add(box(0.46, 0.04, 0.46), 0x5a3d28, 0, 0.72, 0);
        const r = 0.078;
        const palettes = [
          ['#e8543a', '#ffd23f', '#2a9d8f'],
          ['#ffb020', '#7b2cbf', '#f7f0e0'],
          ['#3a86ff', '#ff7aa2', '#ffd23f'],
          ['#4ade80', '#e8543a', '#f7f0e0'],
          ['#b14eff', '#ffb020', '#2a9d8f'],
          ['#ff7aa2', '#3a86ff', '#4ade80'],
        ];
        const pos = [
          [-0.16, 0.74 + r, 0.0], [0, 0.74 + r, 0.0], [0.16, 0.74 + r, 0.0],
          [-0.08, 0.74 + r * 2.75, 0], [0.08, 0.74 + r * 2.75, 0],
          [0, 0.74 + r * 4.5, 0],
        ];
        out.refs.balls = [];
        pos.forEach(([x, y, z], i) => {
          const tex = makeYarnTexture(palettes[i], 40 + i);
          const ball = add(sph(r), 0xffffff, x, y, z, { roughness: 0.98, map: tex });
          ball.rotation.set(i * 0.7, i * 1.3, 0);
          out.refs.balls.push({ mesh: ball, rest: ball.position.clone() });
        });
        out.baseY = 0.85;
        break;
      }

      case 'window': {
        // Marco de la ventana (el cielo vive en la decoración; ver `sky`) + zona de click invisible.
        const ww = 1.2, wh = 1.3, wy = 3.0, fz = 0.045;
        add(box(ww + 0.16, 0.08, 0.09), 0xe8e4dc, 0, wy + wh / 2 + 0.04, fz);
        add(box(ww + 0.16, 0.08, 0.09), 0xe8e4dc, 0, wy - wh / 2 - 0.04, fz);
        add(box(0.08, wh, 0.09), 0xe8e4dc, -ww / 2 - 0.04, wy, fz);
        add(box(0.08, wh, 0.09), 0xe8e4dc, ww / 2 + 0.04, wy, fz);
        add(box(0.04, wh, 0.05), 0xe8e4dc, 0, wy, fz);
        add(box(ww, 0.04, 0.05), 0xe8e4dc, 0, wy, fz);
      case 'lumbre': {
        // Póster enmarcado de mi juego Lumbre en la pared izquierda (las capturas se cambian en la estación).
        const wy = 2.55, pw = 1.1;
        add(box(pw + 0.12, 0.84, 0.04), 0x1a1410, 0.0, wy - 0.04, 0.02);                         // marco
        const shot = new THREE.TextureLoader().load('public/images/projects/lumbre/lumbre-01.webp');
        shot.colorSpace = THREE.SRGBColorSpace;
        shot.anisotropy = maxAniso;
        const img = add(new THREE.PlaneGeometry(pw, pw / 2.446), 0xffffff, 0, wy + 0.05, 0.043, { map: shot, roughness: 0.6, emissive: 0xffffff, emissiveMap: shot, emissiveIntensity: 0.35 });
        const plate = canvasTexture(512, 64, (ctx, w, h) => {
          ctx.fillStyle = '#120d08'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ffb020'; ctx.font = 'bold 30px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('L U M B R E  ·  Game Jam 2026', w / 2, h / 2 + 2);
        });
        add(new THREE.PlaneGeometry(pw, pw * 0.125), 0xffffff, 0, wy - 0.33, 0.043, { map: plate, roughness: 0.6 });
        out.refs.poster = { img, shot };
        out.baseY = wy;
        break;
      }

        add(box(ww + 0.3, 0.05, 0.18), 0xe8e4dc, 0, wy - wh / 2 - 0.1, 0.09);   // alféizar
        const hit = add(box(ww, wh, 0.1), 0xffffff, 0, wy, 0.05);
        hit.visible = false;   // el raycast no mira `visible`: el cristal (decoración) queda clicable
        out.baseY = wy;
        break;
      }

      case 'door': {
        // Incrustada en la pared izquierda: marco (jambas + dintel), hoja con
        // dos paneles y picaporte. Todo muy delgado — apenas sobresale.
        const wood = 0x6b4a30;
        [-0.54, 0.54].forEach(x => add(box(0.08, 2.2, 0.12), 0xe8e4dc, x, 1.1, 0.02));
        add(box(1.16, 0.08, 0.12), 0xe8e4dc, 0, 2.2, 0.02);
        add(box(1.0, 2.1, 0.06), wood, 0, 1.05, 0.03);
        [0.6, 1.5].forEach(y => add(box(0.72, 0.7, 0.01), 0x5a3d28, 0, y, 0.065));
        add(sph(0.045), 0xffd580, 0.36, 1.0, 0.09, { metalness: 0.8, roughness: 0.3 });
        out.baseY = 1.1;
        break;
      }

      case 'skateboard': {
        // Apoyada contra la pared trasera (parada, tope inclinado hacia la
        // pared, ruedas a cámara). `holder` gira alrededor del centro de la
        // tabla — la estación la despega de la pared y la deja rotar en 3D.
        const holder = new THREE.Group();
        holder.position.set(0, 0.6, 0);
        holder.rotation.order = 'YXZ'; // yaw · pitch · roll sobre el eje largo
        group.add(holder);
        const pivot = new THREE.Group();
        pivot.position.set(0, -0.6, 0);
        pivot.rotation.x = -0.18;
        holder.add(pivot);
        const addP = (...args) => addPart(pivot, parts, ...args);
        addP(box(0.3, 1.15, 0.05), 0xc9a26a, 0, 0.6, 0);                    // madera (canto)
        // cara inferior: foto real de los stickers (public/images/gam/skate-bottom.webp)
        const gfx = new THREE.TextureLoader().load('public/images/gam/skate-bottom.webp');
        gfx.colorSpace = THREE.SRGBColorSpace;
        gfx.anisotropy = maxAniso;
        addP(new THREE.PlaneGeometry(0.29, 1.13), 0xffffff, 0, 0.6, 0.0265, { map: gfx, roughness: 0.55 });
        // cara superior: grip negro con el logo rasta y el ícono de cuadritos
        const gripTex = makeGripTexture();
        const grip = addP(new THREE.PlaneGeometry(0.29, 1.13), 0xffffff, 0, 0.6, -0.0265, { map: gripTex, roughness: 0.95 });
        grip.rotation.y = Math.PI;
        [[0.02, 0.4], [1.18, -0.4]].forEach(([y, tilt]) => {                // nose / tail
          addP(box(0.3, 0.14, 0.05), 0xc9a26a, 0, y + 0.02, 0.01).rotation.x = tilt;
        });
        [0.25, 0.95].forEach((y) => {
          addP(box(0.22, 0.04, 0.05), 0x9aa0a8, 0, y, 0.05, { metalness: 0.6, roughness: 0.4 });
          [-0.12, 0.12].forEach((x) => {
            // eje de la rueda en X (acostada como rueda, no parada como pata)
            addP(cyl(0.045, 0.04), 0x5f646b, x, y, 0.09).rotation.z = Math.PI / 2;
          });
        });
        out.refs.skate = { holder, pivot };
        out.baseY = 0.6;
        break;
      }

      case 'pukis': {
        // Pukis dormida de costado (cruce labrador/shar-pei): pelaje crema, orejas
        // canela, hocico gris oscuro y nariz rosada. Cuerpo "respira" (ver loop);
        // cabeza, orejas y cola responden a las caricias (estación de Pukis).
        const cream = 0xe9dcc0, cream2 = 0xd9c9a6, tan = 0xb87a3e, muzzle = 0x4b4039, nose = 0x8f5d58;
        const fu = { roughness: 0.95 };
        const body = add(sph(0.22), cream, -0.02, 0.17, 0, fu);
        body.scale.set(1.5, 0.78, 1.0);
        body.userData.baseScaleY = 0.78;
        const haunch = add(sph(0.17), cream, -0.24, 0.14, 0.02, fu);
        haunch.scale.set(1.0, 0.85, 1.05);
        add(sph(0.17), cream, 0.2, 0.15, 0, fu).scale.set(1.1, 0.85, 1.0);          // pecho
        // cabeza descansando en el piso, hocico hacia +x
        const head = add(sph(0.13), cream, 0.43, 0.115, 0.05, fu);
        add(sph(0.075), cream2, 0.56, 0.085, 0.06, fu).scale.set(1.35, 0.85, 1.0);   // hocico
        add(sph(0.06), muzzle, 0.55, 0.055, 0.065, fu).scale.set(1.35, 0.6, 1.0);   // mandíbula oscura
        add(sph(0.026), nose, 0.64, 0.095, 0.065, { roughness: 0.6 });               // nariz
        // ojos cerrados + arrugas de shar-pei
        [-1, 1].forEach((sd) => {
          const eye = add(box(0.035, 0.006, 0.006), 0x2a211c, 0.5, 0.15, 0.05 + sd * 0.085);
          eye.rotation.y = sd * 0.25;
          const wr = add(new THREE.TorusGeometry(0.05, 0.007, 6, 14, Math.PI), cream2, 0.47, 0.165, 0.05 + sd * 0.09, fu);
          wr.rotation.y = Math.PI / 2;
        });
        // orejas canela (una arriba, otra contra el piso)
        const ear1 = add(sph(0.06), tan, 0.38, 0.235, 0.0, fu);
        ear1.scale.set(0.8, 0.35, 1.15);
        const ear2 = add(sph(0.06), tan, 0.4, 0.09, 0.19, fu);
        ear2.scale.set(0.8, 0.5, 1.0);
        // patas delanteras estiradas hacia el frente, traseras recogidas
        [[0.42, 0.045, -0.1], [0.4, 0.045, 0.16]].forEach(([x, y, z]) => {
          const leg = add(cyl(0.042, 0.3), cream, x, y, z, fu);
          leg.rotation.z = Math.PI / 2;
          add(sph(0.05), cream, x + 0.15, y, z, fu).scale.set(1.1, 0.8, 1.0);
        });
        [[-0.34, 0.06, 0.18, 0.5], [-0.4, 0.05, -0.05, -0.3]].forEach(([x, y, z, rz]) => {
          const leg = add(cyl(0.04, 0.26), cream, x, y, z, fu);
          leg.rotation.set(0.2, 0, Math.PI / 2 + rz);
          add(sph(0.05), cream, x - 0.12, y, z + 0.02, fu);
        });
        const tail = add(cyl(0.032, 0.32), cream, -0.5, 0.08, -0.03, fu);
        tail.rotation.z = Math.PI / 2;
        out.breathe = body;
        out.refs.pukis = { body, head, tail, ears: [ear1, ear2], all: parts };
        out.baseY = 0.25;
        break;
      }

      case 'bookshelf': {
        const wood = 0x4a3220;
        out.refs.books = [];
        [-0.625, 0.625].forEach(x => add(box(0.05, 2.0, 0.38), wood, x, 1.0, 0));
        [0.025, 0.52, 1.0, 1.48, 1.975].forEach(y => add(box(1.3, 0.05, 0.38), wood, 0, y, 0));
        add(box(1.3, 2.0, 0.02), 0x2e2014, 0, 1.0, -0.18);
        const bookColors = [0xb14eff, 0x06ffa5, 0xffb020, 0xff6b4a, 0x2d6a9f, 0xf2e6d2, 0xc0392b, 0x3fa66b];
        [0.05, 0.545, 1.025, 1.505].forEach((shelfY, row) => {
          let x = -0.56;
          for (let i = 0; i < 8 && x < 0.5; i++) {
            const h = 0.26 + ((i * 7 + row * 3) % 5) * 0.03;
            const bk = add(box(0.08, h, 0.26), bookColors[(i + row * 3) % bookColors.length], x + 0.04, shelfY + h / 2, 0.02);
            bk.userData.baseZ = 0.02;
            bk.userData.baseY = shelfY + h / 2;
            out.refs.books.push({ mesh: bk, row });
            x += 0.1 + ((i + row) % 3 === 0 ? 0.04 : 0);
          }
        });
        out.baseY = 1.0;
        break;
      }

      default:
        add(box(0.8, 0.8, 0.8), f.color, 0, 0.4, 0);
        out.baseY = 0.4;
    }

    return out;
  }

  const textureLoader = new THREE.TextureLoader();

  /** Si existe public/images/gam/<id>.webp, lo monta como sprite (siempre
   *  mirando a cámara) parado sobre el mismo punto que el objeto compuesto,
   *  y esconde ese objeto (sigue existiendo para el raycast/hitbox —
   *  Raycaster ignora `.visible`). Si no existe (404 → onError), no hace
   *  nada. Ojo: un billboard plano puede desentonar con el diorama. */
  function loadArt(root, f) {
    textureLoader.load(
      `${ART_BASE}${f.id}.webp`,
      (texture) => {
        if (destroyed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        const aspect = texture.image.width / texture.image.height;
        const h = f.artHeight || DEFAULT_ART_HEIGHT;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.userData.baseScale = { x: h * aspect, y: h };
        sprite.scale.set(h * aspect, h, 1);
        sprite.position.set(f.x, (f.y || 0) + h / 2 + 0.02, f.z);
        sprite.renderOrder = 5;
        scene.add(sprite);
        root.visible = false;
        root.userData.artSprite = sprite;
      },
      undefined,
      () => { /* sin arte real todavía — docs/gam-three-art-spec.md */ }
    );
  }

  const allMeshes = [];
  const interactiveMeshes = [];
  const breathers = [];
  const floaters = [];
  const flickers = [];
  const rgbStrips = [];
  const steamers = [];
  const lampBulbs = [];
  const objects = new Map(); // id → { root, refs, parts, f } para las estaciones
  FURNITURE.forEach((f) => {
    const built = buildFurnitureGroup(f);
    const { group, baseY, parts } = built;
    const sc = f.scale ?? FURN_SCALE;
    group.position.set(f.x, f.y || 0, f.z);
    group.rotation.y = f.rotY || 0;
    group.scale.setScalar(sc);
    group.updateMatrixWorld(true);
    group.userData.furniture = f;
    group.userData.baseY = (f.y || 0) + baseY * sc;
    group.userData.baseGroupY = f.y || 0;
    group.userData.lift = 0;
    group.userData.labelTop = new THREE.Box3().setFromObject(group).max.y + 0.18;
    group.userData.hoverMeshes = parts;
    parts.forEach((m) => { m.userData.furniture = f; m.userData.rootGroup = group; });
    scene.add(group);
    allMeshes.push(group);
    objects.set(f.id, { root: group, refs: built.refs, parts, f });
    if (built.lampAnchor) lamp.position.copy(group.localToWorld(built.lampAnchor));
    if (built.breathe) breathers.push(built.breathe);
    built.floaters.forEach(fl => floaters.push(fl));
    built.flickers.forEach((m, i) => { m.userData.phase = i * 1.7; flickers.push(m); });
    if (built.rgb) rgbStrips.push(built.rgb);
    built.steam?.forEach(m => steamers.push(m));
    if (built.bulb) lampBulbs.push(built.bulb);
    if (f.interactive !== false) interactiveMeshes.push(group);
    loadArt(group, f);
  });

  /* ── Momento del día: 0 = día · 0.5 = atardecer (el aspecto por defecto) ·
     1 = noche. Lo anima la estación de la cama (`env.animateTo`): mueve el
     sol, el relleno, la luz de la ventana, la lámpara, el neón, el cielo de
     la ventana y el fondo. ── */
  const ENV = {
    day:   { sun: 2.9, sunColor: 0xfff4dc, hemi: 0.95, hemiSky: 0xcfe6ff, lamp: 1.0, win: 0,   neon: 0.6,  exposure: 1.2, sunPos: [5, 11, 3],  bg: ['#8a5c22', '#3a2610', '#0b0704'] },
    dusk:  { sun: 2.2, sunColor: 0xffe2c0, hemi: 0.6,  hemiSky: 0xdfe8ff, lamp: 3.0, win: 2.2, neon: 1.35, exposure: 1.1, sunPos: [6, 10, 4],  bg: ['#3a2408', '#140d05', '#050505'] },
    night: { sun: 1.2, sunColor: 0x7d98ff, hemi: 0.55, hemiSky: 0x5a6cb0, lamp: 4.6, win: 3.2, neon: 1.9,  exposure: 1.0, sunPos: [-4, 9, 5],  bg: ['#111c40', '#0a1024', '#050505'] },
  };
  const envA = new THREE.Color();
  const envB = new THREE.Color();
  let envT = 0.5;
  let envAnim = null;
  function applyEnv(t) {
    envT = t;
    const [a, b, w] = t <= 0.5 ? [ENV.day, ENV.dusk, t / 0.5] : [ENV.dusk, ENV.night, (t - 0.5) / 0.5];
    const mix = (k) => lerp(a[k], b[k], w);
    base.sun = mix('sun'); base.hemi = mix('hemi'); base.lamp = mix('lamp'); base.window = mix('win');
    sun.color.copy(envA.setHex(a.sunColor).lerp(envB.setHex(b.sunColor), w));
    sun.position.set(lerp(a.sunPos[0], b.sunPos[0], w), lerp(a.sunPos[1], b.sunPos[1], w), lerp(a.sunPos[2], b.sunPos[2], w));
    hemiLight.color.copy(envA.setHex(a.hemiSky).lerp(envB.setHex(b.hemiSky), w));
    neonMat.color.setScalar(mix('neon'));
    renderer.toneMappingExposure = mix('exposure');
    sky.paint(t);
    background.paint(a.bg.map((c, i) => new THREE.Color(c).lerp(new THREE.Color(b.bg[i]), w).getStyle()));
  }
  /** Momento del día según la hora local del visitante (0 día · 0.5 atardecer · 1 noche). */
  function envFromClock(d = new Date()) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < 6) return 1;
    if (h < 8) return 1 - (h - 6) / 2;
    if (h < 16) return 0;
    if (h < 18.5) return ((h - 16) / 2.5) * 0.5;
    if (h < 20.5) return 0.5 + ((h - 18.5) / 2) * 0.5;
    return 1;
  }
  let envManual = false;   // el jugador tocó la cama: deja de seguir el reloj
  let envClockAt = 0;
  const env = {
    get t() { return envT; },
    animateTo(target, ms, done) {
      envManual = true;
      envAnim = { from: envT, to: target, start: performance.now(), dur: reducedMotion ? 1 : ms, done };
    },
  };
  applyEnv(envFromClock());

  /* ── Postprocesado: GTAO (oscurece esquinas/contactos) + contorno ámbar
     del objeto bajo el cursor — ambos apagados en táctil — + bloom con
     umbral alto (solo brillan los emisivos) + OutputPass (tone mapping +
     sRGB, que con composer ya no aplica el renderer solo). ── */
  const initW = container.clientWidth || 1;
  const initH = container.clientHeight || 1;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!lite) composer.addPass(new GTAOPass(scene, camera, initW, initH));
  let outlinePass = null;
  if (!lite) {
    outlinePass = new OutlinePass(new THREE.Vector2(initW, initH), scene, camera);
    outlinePass.edgeStrength = 3.5;
    outlinePass.edgeThickness = 1.5;
    outlinePass.edgeGlow = 0.3;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set(0xffb020);
    outlinePass.hiddenEdgeColor.set(0x5a3a08);
    composer.addPass(outlinePass);
  }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.6, 0.4, 0.9));
  /* Desenfoque de fondo al enfocar un objeto: el objeto enfocado se renderiza
     aparte (layer 1) a un RT cuyo alfa es la máscara; este pase difumina todo
     lo que NO es máscara. `amount` = focusT (0 = sin efecto). */
  const FOCUS_LAYER = 1;
  const maskRT = new THREE.WebGLRenderTarget(initW, initH, { type: THREE.UnsignedByteType });
  const blurPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tMask: { value: maskRT.texture },
      texel: { value: new THREE.Vector2(1 / initW, 1 / initH) },
      radius: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tMask;
      uniform vec2 texel; uniform float radius;
      varying vec2 vUv;
      void main() {
        vec4 sharp = texture2D(tDiffuse, vUv);
        float m = texture2D(tMask, vUv).a;
        // borde suave de la máscara
        float ms = m;
        for (int i = 0; i < 4; i++) {
          float a = 1.5708 * float(i);
          ms += texture2D(tMask, vUv + vec2(cos(a), sin(a)) * texel * 2.0).a;
        }
        ms /= 5.0;
        vec3 acc = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < 24; i++) {
          float fi = float(i) + 0.5;
          float r = sqrt(fi / 24.0) * radius;
          float a = fi * 2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
          float w = 1.0 - texture2D(tMask, uv).a; // el objeto enfocado no "sangra" al fondo
          acc += texture2D(tDiffuse, uv).rgb * w; wsum += w;
        }
        vec3 blurred = wsum > 0.001 ? acc / wsum : sharp.rgb;
        gl_FragColor = vec4(mix(blurred, sharp.rgb, clamp(ms * 1.25, 0.0, 1.0)), 1.0);
      }`,
  });
  // ShaderPass clona los uniforms (y las texturas de un RT no se pueden clonar): reasignar la real
  blurPass.uniforms.tMask.value = maskRT.texture;
  blurPass.enabled = false;
  composer.addPass(blurPass);
  composer.addPass(new OutputPass());
  const _clearCol = new THREE.Color();

  /* ── Resize: observa el contenedor, no la ventana (la TV cambia de
     tamaño entre desktop/mobile sin resize de página) ── */
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const aspect = w / h;
    const frustumH = Math.max(FRUSTUM, (ROOM_WORLD_W * DEFAULT_ZOOM) / aspect);
    camera.left = (-frustumH * aspect) / 2;
    camera.right = (frustumH * aspect) / 2;
    camera.top = frustumH / 2;
    camera.bottom = -frustumH / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    const bw = renderer.domElement.width, bh = renderer.domElement.height;
    maskRT.setSize(bw, bh);
    blurPass.uniforms.texel.value.set(1 / bw, 1 / bh);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ── Estado de interacción ── */
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2(0, 0);
  const projected = new THREE.Vector3();
  let pointerParallax = { x: 0, y: 0 };
  let hovered = null;
  let selectedIndex = -1;
  let zoomed = null;       // furniture object actualmente enfocado, o null
  let camAnim = null;      // { fromLook, toLook, fromZoom, toZoom, start, duration, onComplete }
  let focusT = 0;          // 0 = luces normales, 1 = resto del cuarto atenuado
  let paused = false;
  let destroyed = false;
  let lastNow = 0;
  let labelOverride = null; // { text, pos } — etiqueta que pone una estación (ej. libro bajo el cursor)
  let active = null;        // estación activa (la cámara ya llegó y `enter()` corrió)
  let dragging = false;

  /* ── Estaciones: al hacer click la cámara hace zoom y el objeto se vuelve
     dinámico dentro de la escena (gam-stations.js). HUD = barra superior +
     tarjeta + pines (gam-hud.js). ── */
  const hud = createHud(container);
  const stationSys = createStations({
    scene, overlay, camera, container, hud, env, reducedMotion,
    pick: (objs) => {
      raycaster.setFromCamera(pointerNDC, camera);
      return raycaster.intersectObjects(objs, true)[0] || null;
    },
    setOutline: (objs) => { if (outlinePass) outlinePass.selectedObjects = objs; },
    setCursor: (cur) => { renderer.domElement.style.cursor = cur; },
    setLabel: (text, pos) => { labelOverride = text ? { text, pos } : null; },
    leave: () => leaveFocus(),
    hotspotFor: (id) => hotspotsById.get(id),
  }, objects);
  const stations = stationSys.stations;

  /** Objeto compuesto: glow emisivo tenue en las piezas sin emisivo propio;
   *  al sacar el hover cada pieza vuelve a SU emisivo base (pantallas/LEDs
   *  siguen encendidos). El "levantarse" del hover se anima en el loop
   *  (lift) y el contorno lo pinta el OutlinePass. Sprites de arte real: no
   *  responden a luces — scale bump + tinte. */
  function setMeshHoverVisual(root, isHover) {
    const sprite = root.userData.artSprite;
    if (sprite) {
      const s = isHover ? 1.05 : 1;
      sprite.scale.set(sprite.userData.baseScale.x * s, sprite.userData.baseScale.y * s, 1);
      sprite.material.color.setScalar(isHover ? 1.25 : 1);
    } else {
      root.userData.hoverMeshes.forEach((m) => {
        const base = m.userData.baseEmissiveIntensity;
        if (isHover && !base) {
          m.material.emissive.copy(m.material.color);
          m.material.emissiveIntensity = HOVER_GLOW;
        } else {
          m.material.emissive.setHex(m.userData.baseEmissive);
          m.material.emissiveIntensity = base;
        }
      });
    }
  }

  function setHover(root) {
    if (hovered === root) return;
    if (hovered) setMeshHoverVisual(hovered, false);
    hovered = root;
    if (hovered) {
      setMeshHoverVisual(hovered, true);
      renderer.domElement.style.cursor = 'pointer';
      label.textContent = hovered.userData.furniture.label;
      if (outlinePass) outlinePass.selectedObjects = hovered.userData.artSprite ? [] : hovered.userData.hoverMeshes;
    } else {
      renderer.domElement.style.cursor = 'default';
      if (outlinePass) outlinePass.selectedObjects = [];
    }
  }

  function updatePointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerNDC.set(nx, ny);
    pointerParallax.x = nx;
    pointerParallax.y = ny;
  }

  /** recursive: true — cada objeto es un Group de varias partes, el rayo
   *  pega en el mesh hijo concreto; userData.rootGroup lo devuelve al objeto
   *  raíz (mismo que espera setHover/interact/meshById). */
  function pick() {
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(interactiveMeshes, true)[0];
    return hit ? hit.object.userData.rootGroup : null;
  }

  /* Pellizco con dos dedos (táctil): zoom manual sobre el objeto enfocado. */
  const touches = new Map(); // pointerId → { x, y }
  let pinch = null;          // { d0, z0 }
  const pinchState = () => {
    const [a, b] = [...touches.values()];
    const r = renderer.domElement.getBoundingClientRect();
    return {
      d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      ndc: { x: (((a.x + b.x) / 2 - r.left) / r.width) * 2 - 1, y: -((((a.y + b.y) / 2 - r.top) / r.height) * 2 - 1) },
    };
  };

  function onPointerMove(e) {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size >= 2) {
        const st = pinchState();
        setUserZoom(pinch.z0 * (st.d / pinch.d0), st.ndc, false);
        return;
      }
    }
    updatePointer(e);
    if (paused) return;
    if (active) { active.pointerMove?.(pointerNDC, e); return; }
    if (zoomed) return;
    setHover(pick());
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && zoomed && !paused) {
        if (dragging) { dragging = false; active?.pointerUp?.(pointerNDC, e); }
        pinch = { d0: pinchState().d, z0: userZoom };
        return;
      }
      if (pinch) return;
    }
    if (paused || !active) return;
    updatePointer(e);
    dragging = true;
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* sin captura: el arrastre igual funciona dentro del canvas */ }
    active.pointerDown?.(pointerNDC, e);
  }

  function onPointerUp(e) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (!dragging) return;
    dragging = false;
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
    if (active) active.pointerUp?.(pointerNDC, e);
  }

  function startTransition(toLook, toZoom, onComplete, toDir) {
    camAnim = {
      fromLook: camLook.clone(),
      toLook: toLook.clone(),
      fromZoom: camera.zoom,
      toZoom,
      fromDir: baseDir.clone(),
      toDir: (toDir || ISO_DIR).clone(),
      start: performance.now(),
      duration: reducedMotion ? 1 : TRANSITION_MS,
      onComplete: onComplete || null,
    };
  }

  /** Corre la mirada para que el objeto quede a un lado y la tarjeta del HUD
   *  no lo tape: a la izquierda en desktop, arriba en portrait (la tarjeta
   *  va abajo). `shift` es fracción del semi-ancho/alto visible. */
  function shiftLook(look, zoom, shift, dir) {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const out = look.clone();
    // ejes de la cámara de DESTINO (la vista frontal aún no está aplicada)
    const right = new THREE.Vector3().crossVectors(Y_AXIS, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    if (aspect >= 0.9) {
      out.addScaledVector(right, shift * ((camera.right - camera.left) / 2 / zoom));
    } else {
      out.addScaledVector(up, -shift * ((camera.top - camera.bottom) / 2 / zoom));
    }
    return out;
  }

  let zoomedRoot = null;
  let focusView = null;   // { look, zoom, dir } de la vista base del objeto enfocado
  let userZoom = 1;       // zoom extra del usuario (rueda / doble click / +−) sobre focusView.zoom
  const MAX_USER_ZOOM = 3.5;

  /** Zoom manual sobre el objeto enfocado, anclado al punto bajo el cursor (ndc). */
  function setUserZoom(next, ndc, animate) {
    if (!zoomed || !focusView) return;
    next = Math.min(MAX_USER_ZOOM, Math.max(1, next));
    const oldZoom = camera.zoom;
    const newZoom = focusView.zoom * next;
    let look = camLook.clone();
    if (next <= 1.001) {
      look = focusView.look.clone();
    } else if (ndc) {
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const halfW = (camera.right - camera.left) / 2;
      const halfH = (camera.top - camera.bottom) / 2;
      const k = 1 / oldZoom - 1 / newZoom;
      look.addScaledVector(right, ndc.x * halfW * k).addScaledVector(up, ndc.y * halfH * k);
    }
    userZoom = next;
    // Si la cámara aún vuela hacia el objeto, su onComplete (enter() de la estación) no debe perderse.
    const pending = camAnim?.onComplete || null;
    if ((animate && !reducedMotion) || pending) {
      startTransition(look, newZoom, pending, focusView.dir);
    } else {
      camAnim = null;
      camLook.copy(look);
      camera.zoom = newZoom;
      camera.updateProjectionMatrix();
    }
  }

  function onWheel(e) {
    if (!zoomed || paused) return;
    e.preventDefault();
    updatePointer(e);
    const step = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    setUserZoom(userZoom * step, pointerNDC, false);
  }

  function onDblClick(e) {
    if (!zoomed || paused || zoomed.id === 'piano') return;
    updatePointer(e);
    setUserZoom(userZoom > 1.05 ? 1 : 2.4, pointerNDC, true);
  }
  function setFocusLayer(root, on) {
    if (!root) return;
    root.traverse((o) => { if (on) o.layers.enable(FOCUS_LAYER); else o.layers.disable(FOCUS_LAYER); });
  }

  function focusFurniture(root, onArrived) {
    const f = root.userData.furniture;
    let look = new THREE.Vector3(f.x, root.userData.baseY, f.z);
    let zoom = (f.zoom || FOCUS_ZOOM) * FOCUS_ZOOM_BOOST;
    const fx = stations.get(f.id)?.focus?.();
    // Vista frontal: la cámara se coloca delante del objeto (según hacia dónde mira)
    // Ángulo de la cámara: por defecto de frente al objeto (rotY); `view` lo fija a mano y
    // `viewTilt` lo gira hacia la vista isométrica para que se vea la pared/rincón de al lado.
    let ang = f.view ?? (f.rotY || 0);
    if (f.viewTilt) {
      const d = Math.atan2(Math.sin(Math.PI / 4 - ang), Math.cos(Math.PI / 4 - ang));
      ang += Math.max(-f.viewTilt, Math.min(f.viewTilt, d));
    }
    const frontDir = new THREE.Vector3(Math.sin(ang), f.elev ?? FRONT_ELEV, Math.cos(ang)).normalize();
    if (fx) {
      look = fx.look;
      zoom = fx.zoom != null ? fx.zoom * FOCUS_ZOOM_BOOST : zoom;
      if (fx.shift) look = shiftLook(look, zoom, fx.shift, frontDir);
    }
    startTransition(look, zoom, onArrived, frontDir);
    focusView = { look: look.clone(), zoom, dir: frontDir.clone() };
    userZoom = 1;
    setFocusLayer(zoomedRoot, false);
    zoomed = f;
    zoomedRoot = root;
    setFocusLayer(root, true);
    focusLight.position.copy(look).addScaledVector(frontDir, 1.2).add(new THREE.Vector3(0, 0.6, 0));
    setHover(null);
  }

  function returnToDefault() {
    if (!zoomed) return;
    startTransition(DEFAULT_LOOK, DEFAULT_ZOOM, null, ISO_DIR);
    zoomed = null;
    userZoom = 1;
    // la capa de máscara se apaga al terminar de relajar el desenfoque (ver frame)
  }

  /** Sale de la estación (si hay una activa), apaga el HUD y vuelve la cámara. */
  function leaveFocus() {
    if (active) {
      active.exit?.();
      active = null;
    }
    hud.hide();
    labelOverride = null;
    dragging = false;
    if (outlinePass) outlinePass.selectedObjects = [];
    renderer.domElement.style.cursor = 'default';
    returnToDefault();
  }

  /** Cuando la cámara TERMINA de llegar: si el objeto tiene estación se
   *  vuelve interactivo ahí mismo; si no (la puerta), se avisa a gam-loader.js
   *  igual que antes. `gam:interact` se sigue emitiendo para el progreso y la
   *  analítica, con `inScene: true` para que el loader no abra ningún panel. */
  function interact(root) {
    const f = root.userData.furniture;
    const station = stations.get(f.id);
    focusFurniture(root, () => {
      if (zoomed !== f) return; // el usuario ya salió mientras volaba la cámara
      if (station) {
        active = station;
        station.enter();
      }
      window.dispatchEvent(new CustomEvent('gam:interact', {
        detail: { id: f.id, kind: f.kind, label: f.label, content: hotspotsById.get(f.id) || {}, inScene: !!station },
      }));
    });
  }

  // Sin estación activa el click hace el raycast propio (no depende del hover:
  // en táctil no hay pointermove previo al tap). Con estación, las acciones
  // van por pointerdown/up (ver onPointerDown).
  function onClick(e) {
    if (paused || zoomed) return;
    updatePointer(e);
    const root = pick();
    if (root) interact(root);
  }

  const ORDER = FURNITURE.filter(f => f.id !== 'door' && f.interactive !== false).map(f => f.id);
  function meshById(id) { return interactiveMeshes.find(m => m.userData.furniture.id === id); }

  function onKeyDown(e) {
    if (paused) return;
    if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    if (zoomed && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === '+' || e.key === '=') { setUserZoom(userZoom * 1.35, null, true); e.preventDefault(); return; }
      if (e.key === '-' || e.key === '_') { setUserZoom(userZoom / 1.35, null, true); e.preventDefault(); return; }
    }
    if (active) {
      if (e.key === 'Escape') { leaveFocus(); return; }
      if (active.key?.(e)) e.preventDefault();
      return;
    }
    if (zoomed) {
      // la cámara todavía vuela hacia el objeto: Esc cancela y vuelve
      if (e.key === 'Escape') returnToDefault();
      return;
    }
    const digit = e.key >= '1' && e.key <= '9' ? Number(e.key) - 1 : (e.key === '0' ? 9 : -1);
    if (digit >= 0 && digit < ORDER.length) {
      const mesh = meshById(ORDER[digit]);
      if (mesh) interact(mesh);
      return;
    }
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      selectedIndex = (selectedIndex + 1 + ORDER.length) % ORDER.length;
      setHover(meshById(ORDER[selectedIndex]));
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      selectedIndex = (selectedIndex - 1 + ORDER.length) % ORDER.length;
      setHover(meshById(ORDER[selectedIndex]));
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (hovered) { e.preventDefault(); interact(hovered); }
    }
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('dblclick', onDblClick);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  renderer.domElement.style.touchAction = 'none'; // arrastrar (patineta) sin que el navegador haga scroll
  renderer.domElement.tabIndex = 0; // foco de teclado sin depender de un <input>
  window.addEventListener('keydown', onKeyDown);

  // El panel (#gam-modal) puede cerrarse por el botón ✕, el backdrop o Esc
  // (todos manejados por gam-loader.js) — sin acoplarnos a esa lógica,
  // observamos la clase que ya usa para saber cuándo volver la cámara.
  const modalEl = document.getElementById('gam-modal');
  let modalObserver = null;
  if (modalEl && 'MutationObserver' in window) {
    modalObserver = new MutationObserver(() => {
      if (modalEl.hidden && zoomed) returnToDefault();
    });
    modalObserver.observe(modalEl, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* ── Loop ── */
  const rgbColor = new THREE.Color();
  let rafId = null;
  function frame(now) {
    if (destroyed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (paused) return;

    if (camAnim) {
      const t = Math.min(1, (now - camAnim.start) / camAnim.duration);
      const e = easeInOutCubic(t);
      camLook.lerpVectors(camAnim.fromLook, camAnim.toLook, e);
      camera.zoom = camAnim.fromZoom + (camAnim.toZoom - camAnim.fromZoom) * e;
      baseDir.lerpVectors(camAnim.fromDir, camAnim.toDir, e).normalize();
      camera.updateProjectionMatrix();
      if (t >= 1) {
        const onComplete = camAnim.onComplete;
        camAnim = null;
        onComplete?.();
      }
    }

    // Sigue la hora local (cada minuto) mientras el jugador no haya tocado la cama.
    if (!envManual && !envAnim && now - envClockAt > 60000) {
      envClockAt = now;
      applyEnv(envFromClock());
    }

    // Momento del día (estación de la cama)
    if (envAnim) {
      const p = clamp01((now - envAnim.start) / envAnim.dur);
      applyEnv(lerp(envAnim.from, envAnim.to, easeInOutCubic(p)));
      if (p >= 1) {
        const done = envAnim.done;
        envAnim = null;
        done?.();
      }
    }

    // Parallax + deriva: giro sutil del diorama, que vuelve a 0 al enfocar.
    if (!reducedMotion) {
      const idle = !zoomed;
      const yawTarget = idle ? pointerParallax.x * PARALLAX_YAW + Math.sin(now * 0.00018) * DRIFT_YAW : 0;
      const pitchTarget = idle ? -pointerParallax.y * PARALLAX_PITCH : 0;
      yaw += (yawTarget - yaw) * 0.05;
      pitch += (pitchTarget - pitch) * 0.05;

      // Animaciones en reposo — todas apagadas con prefers-reduced-motion.
      breathers.forEach((m) => { m.scale.y = (m.userData.baseScaleY ?? 0.7) + Math.sin(now * 0.0025) * 0.025; });
      floaters.forEach((fl) => { if (fl.mesh.userData.locked) return; fl.mesh.position.y = fl.base + 0.04 + Math.sin(now * 0.002 + fl.phase) * 0.035; });
      flickers.forEach((m) => {
        const drop = Math.random() < 0.004 ? 0.3 : 0;
        m.material.emissiveIntensity = m.userData.baseEmissiveIntensity * (1 + 0.05 * Math.sin(now * 0.0031 + m.userData.phase) - drop);
      });
      steamers.forEach((m) => {
        const st = m.userData.steam;
        const k = (now * 0.00035 + st.phase) % 1;
        m.position.set(st.x + Math.sin(k * 6 + st.phase * 9) * 0.012, st.base + k * 0.17, st.z);
        m.scale.setScalar(0.6 + k * 0.9);
        m.material.opacity = 0.32 * Math.sin(Math.PI * k);
      });
      rgbStrips.forEach((m) => {
        rgbColor.setHSL((now * 0.00018) % 1, 1, 0.55);
        m.material.emissive.copy(rgbColor);
        m.material.color.copy(rgbColor);
      });
      const flame = 1 + 0.07 * Math.sin(now * 0.011) + 0.05 * Math.sin(now * 0.0233 + 1.3);
      lamp.intensity = base.lamp * flame * (1 - 0.35 * focusT);
      lampBulbs.forEach((m) => { m.material.emissiveIntensity = m.userData.baseEmissiveIntensity * flame; });
      const s = Math.floor(now / 1000) % 60;
      clockSecond.rotation.z = -s * (Math.PI / 30);
    }
    applyCamera();

    // Hover: el objeto sube un poco; la etiqueta lo sigue en pantalla.
    allMeshes.forEach((root) => {
      const ud = root.userData;
      const target = root === hovered && !root.userData.furniture.noLift ? HOVER_LIFT : 0;
      ud.lift += (target - ud.lift) * (reducedMotion ? 1 : 0.2);
      root.position.y = ud.baseGroupY + ud.lift;
    });
    // Estaciones: solo la activa (o una que todavía termina de animar su salida)
    stations.forEach((st) => { if (st === active || st.busy?.()) st.update(now, dt); });
    stationSys.updateGlyphs(dt);
    if (active) hud.updatePins(camera, container.clientWidth, container.clientHeight);

    if (active && labelOverride) {
      projected.copy(labelOverride.pos).project(camera);
      const px = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const py = (-projected.y * 0.5 + 0.5) * container.clientHeight;
      if (label.textContent !== labelOverride.text) label.textContent = labelOverride.text;
      label.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
      label.classList.add('is-visible');
    } else if (hovered && !zoomed) {
      const f = hovered.userData.furniture;
      projected.set(f.x, hovered.userData.labelTop + hovered.userData.lift, f.z).project(camera);
      const px = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const py = (-projected.y * 0.5 + 0.5) * container.clientHeight;
      label.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
      label.classList.add('is-visible');
    } else {
      label.classList.remove('is-visible');
    }

    // Dimming del resto del cuarto mientras hay un objeto enfocado — se
    // suaviza con FOCUS_LERP en vez de saltar de golpe al terminar el viaje
    // de cámara, así el efecto acompaña la transición en vez de "cortar".
    const focusTarget = zoomed ? 1 : 0;
    focusT += (focusTarget - focusT) * (reducedMotion ? 1 : FOCUS_LERP);
    hemiLight.intensity = base.hemi * (1 - 0.4 * focusT);
    sun.intensity = base.sun * (1 - 0.45 * focusT);
    windowLight.intensity = base.window * (1 - 0.5 * focusT);
    if (reducedMotion) lamp.intensity = base.lamp * (1 - 0.35 * focusT);
    focusLight.intensity = FOCUS_MAX * focusT;

    // Los sprites de arte real no responden a luces (SpriteMaterial no es
    // lit) — el mismo dimming de foco se simula a mano con un tinte, y solo
    // mientras hace falta (zoomed o todavía relajando el lerp de vuelta) para
    // no pisar el tinte que pone el hover cuando no hay nada enfocado.
    if (zoomed || focusT > 0.001) {
      allMeshes.forEach((m) => {
        const sprite = m.userData.artSprite;
        if (!sprite) return;
        const isFocused = zoomed && m.userData.furniture.id === zoomed.id;
        sprite.material.color.setScalar(isFocused ? 1 : 1 - 0.55 * focusT);
      });
    }

    if (zoomedRoot && (zoomed || focusT > 0.001)) {
      // máscara del objeto enfocado (alfa) + desenfoque proporcional a focusT
      const prevBg = scene.background;
      const prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(_clearCol);
      const prevMask = camera.layers.mask;
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
      camera.layers.set(FOCUS_LAYER);
      renderer.setRenderTarget(maskRT);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      camera.layers.mask = prevMask;
      renderer.setClearColor(_clearCol, prevAlpha);
      scene.background = prevBg;
      blurPass.uniforms.radius.value = 6.5 * focusT * (renderer.getPixelRatio() || 1);
      blurPass.enabled = focusT > 0.001;
    } else {
      if (zoomedRoot) { setFocusLayer(zoomedRoot, false); zoomedRoot = null; }
      blurPass.enabled = false;
    }

    composer.render();
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(overlay, camera);
    renderer.autoClear = true;
  }
  rafId = requestAnimationFrame(frame);

  function pause() { paused = true; }
  function resume() { paused = false; }

  function destroy() {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    ro.disconnect();
    modalObserver?.disconnect();
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('click', onClick);
    renderer.domElement.removeEventListener('dblclick', onDblClick);
    renderer.domElement.removeEventListener('wheel', onWheel);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    if (active) active.exit?.();
    stationSys.dispose();
    hud.destroy();
    label.remove();
    // Un solo recorrido: geometrías, materiales y sus texturas (sprites de
    // arte incluidos) — más robusto que mantener listas a mano.
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          m.map?.dispose();
          m.emissiveMap?.dispose();
          m.dispose();
        });
      }
    });
    bgTexture.dispose();
    composer.passes.forEach(p => p.dispose?.());
    composer.dispose();
    renderer.dispose();
    // Libera el contexto WebGL ya — entrar/salir de .gam varias veces no
    // debe acumular contextos hasta que pase el GC.
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  return {
    scene: { pause, resume },
    destroy: () => destroy(),
  };
}

export const GamThreeScene = { mount };
