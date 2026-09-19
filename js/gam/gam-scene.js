/**
 * gam-scene.js — Escena principal del cuarto isométrico (modo .gam)
 *
 * Cuarto navegable + colisiones + hotspots por proximidad + paredes/sombras/
 * piso con textura procedural (profundidad visual) + arte real opcional con
 * fallback automático (ver docs/gam-art-spec.md).
 *
 * Truco de renderizado isométrico: toda la lógica (movimiento, colisiones,
 * proximidad) vive en coordenadas cartesianas simples (this._player.x/y,
 * footprints de muebles en x/y/w/h). Solo la posición final en pantalla se
 * proyecta a isométrico con isoProject() — así las colisiones son AABB
 * comunes y no hay que lidiar con geometría isométrica real.
 *
 * Arte real: preload() intenta cargar un set fijo de imágenes (ver ART_KEYS
 * abajo). El loader de Phaser tolera archivos 404 por-archivo sin romper la
 * cola — this.textures.exists(key) dice si terminó disponible. Cada punto
 * de dibujado (piso/muebles/jugador) rama entre la textura real y el
 * Phaser.Graphics procedural que ya existía (ICON_DRAWERS, grilla de piso,
 * círculos del jugador), que queda como capa de fallback permanente.
 */
import Phaser from 'phaser';
import { getAudioContext, envelope } from './gam-audio.js';
import { startAmbience, stopAmbience, playFootstep, playProximityBlip } from './gam-ambience.js';
import { burstParticles, cameraPunch } from './gam-fx.js';

export const ROOM_W = 600;
export const ROOM_H = 600;

const ISO_X = 0.56;
const ISO_Y = 0.30;
const ORIGIN_X = 400; // debe coincidir con width/2 del Phaser.Game
const ORIGIN_Y = 150;
const WALL_HEIGHT = 70; // alto en pantalla de las paredes traseras nuevas

const PLAYER_SPEED     = 150; // px lógicos / seg
const PLAYER_RADIUS    = 14;
const INTERACT_RADIUS  = 50;
const MUTE_KEY          = 'gam-muted';
const FOOTSTEP_INTERVAL_MS = 350;

function isoProject(x, y) {
  return {
    sx: ORIGIN_X + (x - y) * ISO_X,
    sy: ORIGIN_Y + (x + y) * ISO_Y,
  };
}

/* ────────────────────────────────────────────────────
   ARTE REAL — claves de textura → ruta esperada. Ver docs/gam-art-spec.md
   para specs/prompts completos. Ninguna de estas rutas existe todavía por
   defecto: preload() las intenta cargar igual, y lo que falte cae solo al
   Graphics procedural (ver ICON_DRAWERS y _drawFloorGrid más abajo).
──────────────────────────────────────────────────── */
const ART_KEYS = {
  'gam-floor-tile':         'public/images/gam/floor-tile.webp',
  'gam-furniture-piano':    'public/images/gam/furniture-piano.webp',
  'gam-furniture-desk':     'public/images/gam/furniture-desk.webp',
  'gam-furniture-juggling': 'public/images/gam/furniture-juggling.webp',
  'gam-furniture-diplomas': 'public/images/gam/furniture-diplomas.webp',
  'gam-furniture-bed':      'public/images/gam/furniture-bed.webp',
  'gam-furniture-door':     'public/images/gam/furniture-door.webp',
  'gam-furniture-reading':  'public/images/gam/furniture-reading.webp',
  'gam-furniture-terminal': 'public/images/gam/furniture-terminal.webp',
  'gam-furniture-skateboard': 'public/images/gam/furniture-skateboard.webp',
  'gam-furniture-bookshelf': 'public/images/gam/furniture-bookshelf.webp',
  'gam-pukis':               'public/images/gam/pukis.webp',
  'gam-player-ne':           'public/images/gam/player-ne.webp',
  'gam-player-nw':           'public/images/gam/player-nw.webp',
  'gam-player-se':           'public/images/gam/player-se.webp',
  'gam-player-sw':           'public/images/gam/player-sw.webp',
};

/* ────────────────────────────────────────────────────
   LAYOUT DEL CUARTO (v2) — ver docs/gam-mode-plan.md
   x/y = centro lógico del objeto · w/h = footprint de colisión.
   Distribuidos en anillo parejo alrededor del centro (Pukis) — evita que
   los íconos/etiquetas se pisen entre sí, algo que con el layout v1
   (cuarto más chico, posiciones a mano) se notaba entre terminal/lectura.
──────────────────────────────────────────────────── */
const FURNITURE = [
  { id: 'piano',      x: 150, y: 126, w: 95, h: 40, color: 0x2e2210, label: '🎹 Piano',            kind: 'minigame' },
  { id: 'desk',       x: 267, y: 72,  w: 80, h: 55, color: 0x3b82f6, label: '🖥️ Escritorio',       kind: 'list' },
  { id: 'juggling',   x: 395, y: 91,  w: 40, h: 40, color: 0xff8a3d, label: '🤹 Malabares',        kind: 'video' },
  { id: 'diplomas',   x: 530, y: 300, w: 65, h: 40, color: 0xffd580, label: '🏆 Diplomas',         kind: 'trajectory' },
  { id: 'bed',        x: 493, y: 424, w: 70, h: 50, color: 0xc9a06a, label: '🛏️ Cama',            kind: 'info' },
  { id: 'door',       x: 395, y: 509, w: 55, h: 20, color: 0x94a3b8, label: '🚪 Salir',            kind: 'exit' },
  { id: 'reading',    x: 267, y: 528, w: 60, h: 40, color: 0xc9a06a, label: '📖 Rincón de lectura', kind: 'info' },
  { id: 'terminal',   x: 150, y: 474, w: 65, h: 55, color: 0x00ff41, label: '💚 Terminal',         kind: 'list' },
  { id: 'skateboard', x: 79,  y: 365, w: 65, h: 30, color: 0x06ffa5, label: '🛹 Patineta',         kind: '3d' },
  { id: 'bookshelf',  x: 79,  y: 235, w: 65, h: 65, color: 0xb14eff, label: '📚 Estante',          kind: 'list' },
  { id: 'pukis',      x: 300, y: 300, w: 28, h: 24, color: 0x8b5a2b, label: '🐾 Pukis',            kind: 'info', decorative: true },
];

/* ────────────────────────────────────────────────────
   ÍCONOS "DEFAULT" — dibujados a mano con Phaser Graphics para que cada
   mueble se reconozca (escritorio, piano, cama...) sin depender de arte
   real generado. Capa de fallback permanente: _drawFurniture() la usa
   solo cuando no hay una textura real cargada para ese objeto (ver
   ART_KEYS/docs/gam-art-spec.md). Cada función dibuja centrada en `c`
   (punto isométrico ya proyectado), con hw/hh = medio-ancho/alto del
   rombo de footprint del objeto.
──────────────────────────────────────────────────── */
const ICON_DRAWERS = {
  desk(g, c, hw) {
    const deskH = 22;
    g.fillStyle(0x3b82f6, 0.95);
    g.fillRect(c.sx - hw * 0.65, c.sy - deskH, hw * 1.3, deskH);
    g.lineStyle(1, 0x0a0a1a, 0.4);
    g.strokeRect(c.sx - hw * 0.65, c.sy - deskH, hw * 1.3, deskH);

    const monW = hw * 0.55, monH = 20;
    g.fillStyle(0x0a0a1a, 1);
    g.fillRect(c.sx - monW / 2, c.sy - deskH - monH, monW, monH);
    g.fillStyle(0x60a5fa, 0.9);
    g.fillRect(c.sx - monW / 2 + 2, c.sy - deskH - monH + 2, monW - 4, monH - 6);
    g.fillStyle(0x0a0a1a, 1);
    g.fillRect(c.sx - 3, c.sy - deskH - 4, 6, 4);
  },

  piano(g, c, hw) {
    const bodyH = 26;
    g.fillStyle(0x18100a, 1);
    g.fillRect(c.sx - hw * 0.7, c.sy - bodyH, hw * 1.4, bodyH);
    g.fillStyle(0x241a0e, 1);
    g.fillTriangle(
      c.sx - hw * 0.7, c.sy - bodyH,
      c.sx + hw * 0.7, c.sy - bodyH,
      c.sx + hw * 0.3, c.sy - bodyH - 16
    );
    const keyW = (hw * 1.2) / 7;
    for (let i = 0; i < 7; i++) {
      g.fillStyle(i % 2 === 0 ? 0xf5e9d6 : 0x18100a, 1);
      g.fillRect(c.sx - hw * 0.6 + i * keyW, c.sy - 4, keyW - 1, 6);
    }
  },

  bookshelf(g, c, hw) {
    const shelfH = 30;
    g.fillStyle(0x4a2f14, 1);
    g.fillRect(c.sx - hw * 0.65, c.sy - shelfH, hw * 1.3, shelfH);
    const spineColors = [0xb14eff, 0x06ffa5, 0xffb020, 0xff2ea6, 0x3b82f6];
    const n = 6;
    const spineW = (hw * 1.1) / n;
    for (let i = 0; i < n; i++) {
      const bh = shelfH * (0.55 + (i % 3) * 0.15);
      g.fillStyle(spineColors[i % spineColors.length], 1);
      g.fillRect(c.sx - hw * 0.55 + i * spineW, c.sy - bh, spineW - 2, bh);
    }
  },

  terminal(g, c, hw) {
    const bodyH = 26;
    g.fillStyle(0x00ff41, 0.12);
    g.fillCircle(c.sx, c.sy - bodyH * 0.6, hw * 0.5);
    g.fillStyle(0x0a1a0a, 1);
    g.fillRect(c.sx - hw * 0.6, c.sy - bodyH, hw * 1.2, bodyH);
    g.fillStyle(0x00140a, 1);
    g.fillRect(c.sx - hw * 0.5, c.sy - bodyH + 3, hw, bodyH - 6);
    g.lineStyle(1.5, 0x00ff41, 0.9);
    [0.3, 0.55, 0.4].forEach((t, i) => {
      const ly = c.sy - bodyH + 6 + i * 5;
      g.beginPath();
      g.moveTo(c.sx - hw * 0.42, ly);
      g.lineTo(c.sx - hw * 0.42 + hw * t, ly);
      g.strokePath();
    });
  },

  diplomas(g, c, hw) {
    g.fillStyle(0x5a4520, 1);
    g.fillRect(c.sx - hw * 0.7, c.sy - 34, hw * 1.4, 34);
    const frameW = hw * 0.5;
    [-1, 1].forEach(dir => {
      const fx = c.sx + dir * hw * 0.42 - frameW / 2;
      g.fillStyle(0xffd580, 1);
      g.fillRect(fx, c.sy - 28, frameW, 20);
      g.fillStyle(0xfff7e6, 1);
      g.fillRect(fx + 2, c.sy - 26, frameW - 4, 16);
    });
  },

  juggling(g, c, hw) {
    g.fillStyle(0x5a3a1a, 1);
    g.fillRect(c.sx - hw * 0.5, c.sy - 6, hw, 6);
    const ballColors = [0xff8a3d, 0xffd580, 0xff2ea6];
    [[-0.35, -30], [0, -42], [0.35, -30]].forEach(([ox, oy], i) => {
      g.fillStyle(ballColors[i], 1);
      g.fillCircle(c.sx + ox * hw * 2, c.sy + oy, 7);
    });
  },

  skateboard(g, c, hw) {
    const deckW = hw * 1.4, deckH = 10;
    g.fillStyle(0x06ffa5, 1);
    g.fillRoundedRect(c.sx - deckW / 2, c.sy - deckH / 2 - 4, deckW, deckH, 5);
    g.fillStyle(0x0a0a0a, 1);
    g.fillCircle(c.sx - deckW * 0.32, c.sy + deckH / 2, 3.5);
    g.fillCircle(c.sx + deckW * 0.32, c.sy + deckH / 2, 3.5);
  },

  reading(g, c) {
    g.fillStyle(0x7a5a34, 0.9);
    g.fillEllipse(c.sx, c.sy - 4, 60, 14);
    g.fillStyle(0xf5e9d6, 1);
    g.fillRect(c.sx - 12, c.sy - 14, 24, 14);
    g.lineStyle(1.5, 0x7a5a34, 0.8);
    g.beginPath();
    g.moveTo(c.sx, c.sy - 14);
    g.lineTo(c.sx, c.sy);
    g.strokePath();
  },

  bed(g, c, hw) {
    const bedW = hw * 1.5, bedH = 16;
    g.fillStyle(0xc9a06a, 1);
    g.fillRoundedRect(c.sx - bedW / 2, c.sy - bedH, bedW, bedH, 4);
    g.fillStyle(0xf5e9d6, 1);
    g.fillRoundedRect(c.sx - bedW / 2 + 4, c.sy - bedH - 6, bedW * 0.3, 10, 3);
    g.fillStyle(0xff2ea6, 0.85);
    g.fillRoundedRect(c.sx - bedW / 2, c.sy - bedH * 0.45, bedW, bedH * 0.55, 3);
  },

  pukis(g, c, hw, hh) {
    g.fillStyle(0x8b5a2b, 1);
    g.fillEllipse(c.sx, c.sy, hw * 1.3, hh * 1.1);
    g.fillCircle(c.sx + hw * 0.55, c.sy - hh * 0.3, hh * 0.7);
    g.fillTriangle(
      c.sx + hw * 0.3,  c.sy - hh * 0.8,
      c.sx + hw * 0.45, c.sy - hh * 1.5,
      c.sx + hw * 0.6,  c.sy - hh * 0.8
    );
    g.fillTriangle(
      c.sx + hw * 0.65, c.sy - hh * 0.8,
      c.sx + hw * 0.8,  c.sy - hh * 1.5,
      c.sx + hw * 0.95, c.sy - hh * 0.8
    );
    g.lineStyle(3, 0x8b5a2b, 1);
    g.beginPath();
    g.moveTo(c.sx - hw * 0.6, c.sy);
    g.lineTo(c.sx - hw * 1.1, c.sy - hh * 0.6);
    g.strokePath();
  },

  door(g, c, hw) {
    const doorW = hw * 0.9, doorH = 34;
    g.fillStyle(0x5c4a34, 1);
    g.fillRect(c.sx - doorW / 2, c.sy - doorH, doorW, doorH);
    g.fillStyle(0x94a3b8, 0.25);
    g.fillRect(c.sx - doorW / 2 + 3, c.sy - doorH + 3, doorW - 6, doorH - 6);
    g.fillStyle(0xffd580, 1);
    g.fillCircle(c.sx + doorW * 0.28, c.sy - doorH / 2, 2.5);
  },
};

export class GamScene extends Phaser.Scene {
  /**
   * @param {Array} hotspotContent - contenido de data/gam-hotspots.json (título/mensaje por id)
   */
  constructor(hotspotContent) {
    super('GamScene');
    this._hotspotContent = new Map((hotspotContent || []).map(h => [h.id, h]));
  }

  preload() {
    Object.entries(ART_KEYS).forEach(([key, path]) => this.load.image(key, path));
  }

  create() {
    this._keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E');
    this._player = { x: 300, y: 270, facing: 'se' };
    this._activeHotspot = null;
    this._visitedThisSession = new Set(); // primer interact con cada mueble en esta sesión → efecto más grande
    this._touchVec = { x: 0, y: 0 };
    this._touchInteractPressed = false;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._promptEl      = document.getElementById('gam-prompt');
    this._promptLabelEl = document.getElementById('gam-prompt-label');

    this._footstepAccum = 0;
    let muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* privado/bloqueado: default sin mutear */ }
    this._muted = muted;
    this._audioCtx = getAudioContext();
    this._muteBtn     = document.getElementById('gam-mute');
    this._muteIconEl  = document.getElementById('gam-mute-icon');
    this._bindMute();
    if (!this._muted) this._startAmbienceSafe();

    // Las políticas de autoplay pueden dejar el contexto "suspended" si
    // create() corrió fuera de la pila síncrona del gesto que abrió la TV
    // (queda await-eado detrás del import() dinámico de Phaser) — se
    // reintenta en el primer gesto real dentro de la escena.
    const resumeAudioOnGesture = () => {
      if (this._audioCtx?.state === 'suspended') this._audioCtx.resume();
    };
    window.addEventListener('keydown', resumeAudioOnGesture, { once: true });
    window.addEventListener('pointerdown', resumeAudioOnGesture, { once: true });

    this._drawWalls();
    this._drawFloor();
    this._furnitureObjs = FURNITURE.map(f => this._drawFurniture(f));
    this._playerRoot = this._drawPlayer();
    this._setupCamera();
    this._initTouchControls();
    this._addIdleMotion();

    // QA desde consola en dev — mismo criterio que window.IaMascot (ver
    // ia-mascot.js): permite inspeccionar this._player sin instrumentar UI.
    // El conteo se lee de textures.exists() (la misma fuente que usan las
    // ramas de dibujado), no de eventos 'loaderror' del loader — en
    // `vite dev` (publicDir:false) una ruta sin archivo real cae al
    // fallback de historial de Vite y responde 200 con el HTML de la SPA
    // en vez de un 404 real, así que el loader nunca dispara 'loaderror'
    // aunque el archivo no exista. textures.exists() sigue siendo preciso
    // porque Phaser igual falla al decodificar ese HTML como imagen.
    if (import.meta.env.DEV) {
      window.__gamScene = this;
      const keys = Object.keys(ART_KEYS);
      const found = keys.filter(k => this.textures.exists(k)).length;
      console.log(`[GamScene] Arte real: ${found}/${keys.length} assets`);
    }

    // Limpieza al salir del modo (gam-loader destruye el Game, pero por
    // las dudas si algún día se reutiliza la escena sin destruir el juego)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this._hidePrompt(); stopAmbience(); });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this._hidePrompt(); stopAmbience(); });
  }

  _hidePrompt() {
    if (this._promptEl) this._promptEl.hidden = true;
    if (this._touchWrapEl) this._touchWrapEl.hidden = true;
  }

  _startAmbienceSafe() {
    if (!this._audioCtx) return;
    startAmbience(this._audioCtx);
  }

  /** Botón de mute — persiste en localStorage, usa .onclick (no addEventListener)
   *  para no acumular handlers duplicados si la escena se recrea. */
  _bindMute() {
    if (!this._muteBtn) return;
    this._updateMuteUI();
    this._muteBtn.onclick = () => {
      this._muted = !this._muted;
      try { localStorage.setItem(MUTE_KEY, this._muted ? '1' : '0'); } catch { /* privado/lleno: no persiste, no rompe el juego */ }
      this._updateMuteUI();
      if (this._muted) stopAmbience();
      else this._startAmbienceSafe();
    };
  }

  _updateMuteUI() {
    if (!this._muteBtn) return;
    this._muteBtn.setAttribute('aria-pressed', String(this._muted));
    if (this._muteIconEl) this._muteIconEl.textContent = this._muted ? '🔇' : '🔊';
  }

  /**
   * Joystick virtual + botón "E" — solo en pointer:coarse (móvil/tablet).
   * Vive como DOM plano superpuesto al canvas (mismo criterio que
   * #gam-prompt), no como objetos de Phaser: más simple de tocar con el
   * dedo sin competir con el input del juego.
   */
  _initTouchControls() {
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const wrap  = document.getElementById('gam-touch');
    const stick = document.getElementById('gam-touch-stick');
    const knob  = document.getElementById('gam-touch-knob');
    const btn   = document.getElementById('gam-touch-interact');
    if (!coarse || !wrap || !stick || !knob) return;

    wrap.hidden = false;
    this._touchWrapEl = wrap;

    const MAX_R = 38;
    let activeId = null;

    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };

    const handleMove = (e) => {
      if (e.pointerId !== activeId) return;
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_R) { dx = (dx / dist) * MAX_R; dy = (dy / dist) * MAX_R; }
      setKnob(dx, dy);
      this._touchVec.x = dx / MAX_R;
      this._touchVec.y = dy / MAX_R;
    };

    const handleEnd = (e) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      this._touchVec.x = 0;
      this._touchVec.y = 0;
      setKnob(0, 0);
    };

    stick.addEventListener('pointerdown', (e) => {
      activeId = e.pointerId;
      stick.setPointerCapture(activeId);
      handleMove(e);
    });
    stick.addEventListener('pointermove', handleMove);
    stick.addEventListener('pointerup', handleEnd);
    stick.addEventListener('pointercancel', handleEnd);

    btn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._touchInteractPressed = true;
    });
  }

  _consumeTouchInteract() {
    if (!this._touchInteractPressed) return false;
    this._touchInteractPressed = false;
    return true;
  }

  /**
   * Dos paneles traseros a lo largo de los dos bordes del cuarto que tocan
   * la esquina superior proyectada (x=0,y=0) — le dan volumen real al
   * cuarto en vez de un piso flotando en el vacío. Profundidad fija baja
   * (0.5): por diseño ningún mueble ocupa esa franja de fondo, así que no
   * hace falta que compita en el sorteo de profundidad con FURNITURE.
   */
  _drawWalls() {
    const g = this.add.graphics();
    const topLeft  = isoProject(0, 0);
    const topRight = isoProject(ROOM_W, 0);
    const botLeft  = isoProject(0, ROOM_H);

    g.fillStyle(0x2a2010, 1);
    g.beginPath();
    g.moveTo(topLeft.sx, topLeft.sy - WALL_HEIGHT);
    g.lineTo(topRight.sx, topRight.sy - WALL_HEIGHT);
    g.lineTo(topRight.sx, topRight.sy);
    g.lineTo(topLeft.sx, topLeft.sy);
    g.closePath();
    g.fillPath();

    // Pared izquierda un pelín más oscura — lado opuesto a la ventana
    g.fillStyle(0x221a0c, 1);
    g.beginPath();
    g.moveTo(topLeft.sx, topLeft.sy - WALL_HEIGHT);
    g.lineTo(botLeft.sx, botLeft.sy - WALL_HEIGHT);
    g.lineTo(botLeft.sx, botLeft.sy);
    g.lineTo(topLeft.sx, topLeft.sy);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0xffb020, 0.22);
    [[topLeft, topRight], [topLeft, botLeft]].forEach(([a, b]) => {
      g.beginPath();
      g.moveTo(a.sx, a.sy - WALL_HEIGHT);
      g.lineTo(b.sx, b.sy - WALL_HEIGHT);
      g.strokePath();
    });
    g.setDepth(0.5);

    this._drawWindow();
  }

  /** Ventana en la pared derecha (borde y=0) + pool de luz sobre el piso cercano. */
  _drawWindow() {
    const wc = isoProject(ROOM_W * 0.62, 0);
    const cx = wc.sx, cy = wc.sy - WALL_HEIGHT * 0.55;
    const g = this.add.graphics();

    g.fillStyle(0x0e0a04, 1);
    g.fillRoundedRect(cx - 34, cy - 24, 68, 44, 4);

    const skySteps = [
      { r: 30, color: 0x2a1030, alpha: 0.9 },
      { r: 22, color: 0x4a1550, alpha: 0.9 },
      { r: 14, color: 0xff2ea6, alpha: 0.35 },
      { r: 7,  color: 0xffb020, alpha: 0.55 },
    ];
    skySteps.forEach(s => {
      g.fillStyle(s.color, s.alpha);
      g.fillCircle(cx, cy, s.r);
    });

    [[-18, -10], [16, -14], [-8, 10], [20, 6]].forEach(([ox, oy]) => {
      g.fillStyle(0xfff7e6, 0.8);
      g.fillCircle(cx + ox, cy + oy, 1.4);
    });

    g.lineStyle(2, 0xffb020, 0.4);
    g.strokeRoundedRect(cx - 34, cy - 24, 68, 44, 4);
    g.setDepth(0.52);

    const poolPt = isoProject(ROOM_W * 0.62, 60);
    const pool = this.add.graphics();
    [[90, 0.05], [60, 0.08], [32, 0.1]].forEach(([r, a]) => {
      pool.fillStyle(0xffb020, a);
      pool.fillEllipse(poolPt.sx, poolPt.sy, r * 1.6, r * 0.75);
    });
    pool.setDepth(0.03);

    this._windowGlowPt = { x: cx, y: cy };
  }

  _drawFloor() {
    const corners = [
      isoProject(0, 0), isoProject(ROOM_W, 0),
      isoProject(ROOM_W, ROOM_H), isoProject(0, ROOM_H),
    ];

    if (this.textures.exists('gam-floor-tile')) {
      this._drawFloorTexture(corners);
    } else {
      this._drawFloorGrid();
    }

    const outline = this.add.graphics();
    outline.lineStyle(2, 0xffb020, 0.25);
    outline.beginPath();
    outline.moveTo(corners[0].sx, corners[0].sy);
    corners.slice(1).forEach(c => outline.lineTo(c.sx, c.sy));
    outline.closePath();
    outline.strokePath();
    outline.setDepth(0.01);

    this._drawRug();
  }

  /** Capa de fallback permanente del piso: grilla de rombos chicos alternando tono. */
  _drawFloorGrid() {
    const g = this.add.graphics();
    const N = 6;
    const shades = [0x2e2210, 0x281e0d];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x0 = (i / N) * ROOM_W, x1 = ((i + 1) / N) * ROOM_W;
        const y0 = (j / N) * ROOM_H, y1 = ((j + 1) / N) * ROOM_H;
        const p0 = isoProject(x0, y0), p1 = isoProject(x1, y0);
        const p2 = isoProject(x1, y1), p3 = isoProject(x0, y1);
        g.fillStyle(shades[(i + j) % 2], 1);
        g.beginPath();
        g.moveTo(p0.sx, p0.sy);
        g.lineTo(p1.sx, p1.sy);
        g.lineTo(p2.sx, p2.sy);
        g.lineTo(p3.sx, p3.sy);
        g.closePath();
        g.fillPath();
      }
    }
    g.setDepth(0);
  }

  /** Piso con arte real, recortado al rombo del cuarto con una máscara. */
  _drawFloorTexture(corners) {
    const xs = corners.map(c => c.sx), ys = corners.map(c => c.sy);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const tile = this.add
      .tileSprite(minX, minY, maxX - minX, maxY - minY, 'gam-floor-tile')
      .setOrigin(0, 0);

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.beginPath();
    maskShape.moveTo(corners[0].sx, corners[0].sy);
    corners.slice(1).forEach(c => maskShape.lineTo(c.sx, c.sy));
    maskShape.closePath();
    maskShape.fillPath();
    tile.setMask(maskShape.createGeometryMask());
    tile.setDepth(0);
  }

  _drawRug() {
    const c = isoProject(300, 300);
    const g = this.add.graphics();
    g.fillStyle(0x5a3a1a, 0.55);
    g.fillEllipse(c.sx, c.sy, 96, 40);
    g.fillStyle(0xffb020, 0.15);
    g.fillEllipse(c.sx, c.sy, 70, 28);
    g.setDepth(0.6);
  }

  _drawFurniture(f) {
    const c  = isoProject(f.x, f.y);
    const hw = (f.w / 2) * ISO_X * 2; // ancho medio del rombo proyectado
    const hh = (f.h / 2) * ISO_Y * 2;
    const depth = f.x + f.y;

    const g = this.add.graphics();

    // Sombra de contacto — capa más baja, debajo del footprint y el ícono.
    // Aplica igual tenga o no arte real (ver rama de abajo).
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(c.sx, c.sy + hh * 0.15, hw * 1.5, hh * 0.6);

    // Footprint (rombo) sobre el piso — base isométrica de cualquier objeto
    g.fillStyle(f.color, f.decorative ? 0.5 : 0.3);
    g.beginPath();
    g.moveTo(c.sx, c.sy - hh);
    g.lineTo(c.sx + hw, c.sy);
    g.lineTo(c.sx, c.sy + hh);
    g.lineTo(c.sx - hw, c.sy);
    g.closePath();
    g.fillPath();
    g.setDepth(depth);

    // Arte real si existe (ver docs/gam-art-spec.md) — si no, ÍCONOS
    // "default" a mano (ICON_DRAWERS), y si tampoco hay uno definido, un
    // bloque de color liso.
    const artKey = f.id === 'pukis' ? 'gam-pukis' : `gam-furniture-${f.id}`;
    if (this.textures.exists(artKey)) {
      const img = this.add.image(c.sx, c.sy, artKey).setOrigin(0.5, 1);
      const targetW = Math.max(hw * 2.2, 40);
      img.setScale(targetW / img.width);
      img.setDepth(depth + 0.02);
    } else {
      const draw = ICON_DRAWERS[f.id];
      if (draw) {
        draw(g, c, hw, hh);
      } else if (!f.decorative) {
        const blockH = 24;
        g.fillStyle(f.color, 0.9);
        g.fillRect(c.sx - hw * 0.65, c.sy - blockH, hw * 1.3, blockH);
        g.lineStyle(1, 0x000000, 0.25);
        g.strokeRect(c.sx - hw * 0.65, c.sy - blockH, hw * 1.3, blockH);
      }
    }

    const labelOffsetY = f.decorative ? hh * 1.6 : 46;
    const label = this.add.text(c.sx, c.sy - labelOffsetY, f.label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f5e9d6',
    }).setOrigin(0.5, 1).setDepth(depth + 0.1);

    // Aro de highlight — invisible por defecto (alpha 0), se tween-ea en
    // _playInteractFx() al presionar E. Creado una sola vez acá (patrón del
    // resto del archivo: nunca redibujar Graphics dentro de update()).
    const highlightG = this.add.graphics();
    highlightG.lineStyle(3, f.color, 1);
    highlightG.strokeEllipse(0, 0, hw * 1.7, hh * 1.7);
    highlightG.setPosition(c.sx, c.sy);
    highlightG.setDepth(depth + 0.2);
    highlightG.setAlpha(0);

    return { ...f, depth, _g: g, _label: label, _highlightG: highlightG, _screen: c, _hw: hw, _hh: hh };
  }

  /**
   * Cámara que sigue al personaje, acotada al piso del cuarto. Con el
   * cuarto actual (600x600, cabe entero en los 800x600 lógicos del canvas)
   * el follow apenas se nota — queda listo para cuando el cuarto crezca
   * más allá del viewport sin tener que revisitar esto.
   */
  _setupCamera() {
    const corners = [
      isoProject(0, 0), isoProject(ROOM_W, 0),
      isoProject(ROOM_W, ROOM_H), isoProject(0, ROOM_H),
    ];
    const xs = corners.map(c => c.sx);
    const ys = corners.map(c => c.sy);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // Margen arriba: 60px para etiquetas + WALL_HEIGHT para que la pared/
    // ventana nuevas no queden recortadas por los bounds de cámara.
    const minY = Math.min(...ys) - 60 - WALL_HEIGHT;
    const maxY = Math.max(...ys);
    this.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY + 60);
    this.cameras.main.startFollow(this._playerRoot, true, 0.08, 0.08);
  }

  /**
   * Container con: sombra de contacto + círculos Graphics (fallback,
   * siempre presentes) + Image de arte real (oculta salvo que exista la
   * textura de la dirección actual — ver _applyPlayerFacing()). Un solo
   * setPosition()/setDepth() en el container mueve todo junto.
   */
  _drawPlayer() {
    const root = this.add.container(0, 0);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillEllipse(0, PLAYER_RADIUS * 0.3, PLAYER_RADIUS * 2.1, PLAYER_RADIUS * 0.9);

    const g = this.add.graphics();
    g.fillStyle(0xffb020, 1);
    g.fillCircle(0, 0, PLAYER_RADIUS);
    g.fillStyle(0x1a1206, 0.85);
    g.fillCircle(0, -PLAYER_RADIUS * 0.4, PLAYER_RADIUS * 0.35);

    const sprite = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
    sprite.setDisplaySize(PLAYER_RADIUS * 2.6, PLAYER_RADIUS * 2.6 * 1.3);

    root.add([shadow, g, sprite]);
    this._playerGraphics = g;
    this._playerSprite   = sprite;
    this._applyPlayerFacing();
    return root;
  }

  /** Muestra el sprite real si existe para la dirección actual; si no, los círculos Graphics. */
  _applyPlayerFacing() {
    const key = `gam-player-${this._player.facing}`;
    if (this.textures.exists(key)) {
      this._playerSprite.setTexture(key).setVisible(true);
      this._playerGraphics.setVisible(false);
    } else {
      this._playerSprite.setVisible(false);
      this._playerGraphics.setVisible(true);
    }
  }

  /**
   * Pukis "respira" (halo pulsante, no se escala el dibujo a mano — evita
   * pelearse con que ICON_DRAWERS.pukis dibuja en coordenadas absolutas) +
   * motas de polvo flotando en la luz de la ventana. Gateado por
   * prefers-reduced-motion, mismo criterio que el resto de .gam.
   */
  _addIdleMotion() {
    if (this._reducedMotion) return;

    const pukis = FURNITURE.find(f => f.id === 'pukis');
    if (pukis) {
      const c = isoProject(pukis.x, pukis.y);
      const aura = this.add.graphics();
      aura.setPosition(c.sx, c.sy - 4);
      aura.fillStyle(0xffb020, 0.14);
      aura.fillEllipse(0, 0, 40, 18);
      aura.setDepth(pukis.x + pukis.y - 0.01);
      this.tweens.add({
        targets: aura, scaleX: 1.08, scaleY: 1.2,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    if (this._windowGlowPt) {
      for (let i = 0; i < 4; i++) {
        const mote = this.add.graphics();
        const ox = (Math.random() - 0.5) * 60;
        const oy = (Math.random() - 0.5) * 30;
        const startY = this._windowGlowPt.y + oy + 40;
        mote.setPosition(this._windowGlowPt.x + ox, startY);
        mote.fillStyle(0xffd580, 0.5);
        mote.fillCircle(0, 0, 1.5);
        mote.setDepth(0.53);
        this.tweens.add({
          targets: mote,
          y: startY - 26,
          alpha: 0,
          duration: 3200 + i * 400,
          delay: i * 500,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  update(time, deltaMs) {
    // Cualquier excepción sin capturar acá mata el loop de Phaser entero
    // (el juego "se cuelga" y ya no responde a nada, ni siquiera el
    // movimiento) — se atrapa y se loguea en vez de tirar todo abajo.
    try {
      this._updateFrame(time, deltaMs);
    } catch (err) {
      console.error('[GamScene] Error en update():', err);
    }
  }

  _updateFrame(time, deltaMs) {
    const dt = deltaMs / 1000;
    const k  = this._keys;

    let dx = 0, dy = 0;
    if (this._touchVec.x || this._touchVec.y) {
      // Joystick táctil: vector continuo -1..1 — conserva la magnitud del
      // tilt como velocidad parcial (ver más abajo), no solo la dirección.
      dx = this._touchVec.x;
      dy = this._touchVec.y;
    } else {
      if (k.W.isDown || k.UP.isDown)    dy -= 1;
      if (k.S.isDown || k.DOWN.isDown)  dy += 1;
      if (k.A.isDown || k.LEFT.isDown)  dx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) dx += 1;
    }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      // Dirección encarada = dirección proyectada en pantalla (mismo signo
      // que aplica isoProject), no el dx/dy cartesiano crudo — el personaje
      // tiene que mirar hacia donde se ve que camina, no hacia donde se
      // mueve en el espacio lógico.
      const screenDx = dx - dy;
      const screenDy = dx + dy;
      const facing = screenDx >= 0
        ? (screenDy >= 0 ? 'se' : 'ne')
        : (screenDy >= 0 ? 'sw' : 'nw');
      if (facing !== this._player.facing) {
        this._player.facing = facing;
        this._applyPlayerFacing();
      }

      const len = Math.hypot(dx, dy);
      // El teclado siempre da len >= 1 (incluso diagonal, tras dividir por
      // len de abajo), así que este clamp solo atenúa al joystick táctil
      // cuando el tilt es parcial.
      const speed = PLAYER_SPEED * Math.min(1, len);
      this._tryMove((dx / len) * speed * dt, 0);
      this._tryMove(0, (dy / len) * speed * dt);

      if (!this._muted) {
        this._footstepAccum += deltaMs;
        if (this._footstepAccum >= FOOTSTEP_INTERVAL_MS) {
          this._footstepAccum = 0;
          playFootstep(this._audioCtx);
        }
      }
    } else {
      this._footstepAccum = 0;
    }

    const proj = isoProject(this._player.x, this._player.y);
    // Bobbing vertical barato mientras camina — simula el paso sin
    // necesitar un walk-cycle de varios frames por dirección (ver
    // docs/gam-art-spec.md, "Personaje").
    const bob = moving && !this._reducedMotion ? Math.sin(time * 0.012) * 2 : 0;
    this._playerRoot.setPosition(proj.sx, proj.sy + bob);
    this._playerRoot.setDepth(this._player.x + this._player.y);

    this._updateHotspotProximity();

    if ((Phaser.Input.Keyboard.JustDown(k.E) || this._consumeTouchInteract()) && this._activeHotspot) {
      this._interact(this._activeHotspot);
    }
  }

  _tryMove(dx, dy) {
    const nx = Phaser.Math.Clamp(this._player.x + dx, PLAYER_RADIUS, ROOM_W - PLAYER_RADIUS);
    const ny = Phaser.Math.Clamp(this._player.y + dy, PLAYER_RADIUS, ROOM_H - PLAYER_RADIUS);
    if (!this._collides(nx, ny)) {
      this._player.x = nx;
      this._player.y = ny;
    }
  }

  _collides(x, y) {
    return this._furnitureObjs.some(f => {
      if (f.decorative) return false; // Pukis no bloquea el paso
      const halfW = f.w / 2 + PLAYER_RADIUS * 0.6;
      const halfH = f.h / 2 + PLAYER_RADIUS * 0.6;
      return Math.abs(x - f.x) < halfW && Math.abs(y - f.y) < halfH;
    });
  }

  _updateHotspotProximity() {
    let nearest = null;
    let nearestDist = INTERACT_RADIUS;
    this._furnitureObjs.forEach(f => {
      const d = Phaser.Math.Distance.Between(this._player.x, this._player.y, f.x, f.y);
      if (d < nearestDist) { nearestDist = d; nearest = f; }
    });

    // Blip solo en el flanco ausente→presente — no se repite mientras el
    // jugador se queda cerca del mismo objeto ni al pasar de uno a otro.
    if (nearest && !this._activeHotspot && !this._muted) {
      playProximityBlip(this._audioCtx);
    }
    this._activeHotspot = nearest;

    if (!this._promptEl) return;
    if (nearest) {
      this._promptLabelEl.textContent = nearest.label.replace(/^\S+\s/, '');
      this._promptEl.hidden = false;
    } else {
      this._promptEl.hidden = true;
    }
  }

  _interact(f) {
    const firstVisit = !this._visitedThisSession.has(f.id);
    this._visitedThisSession.add(f.id);
    // try/catch a propósito: esto corre dentro de update() (llamado por el
    // step de Phaser), y Phaser NO envuelve ese step en try/catch — un throw
    // sin capturar acá aborta el frame entero y, como RequestAnimationFrame.js
    // recién agenda el próximo requestAnimationFrame() DESPUÉS de que el
    // callback del frame actual termine sin tirar, el loop completo queda
    // congelado para siempre (hay que recargar la página). El feedback visual
    // es cosmético — nunca debería poder tumbar el juego.
    try {
      this._playInteractFx(f, { big: firstVisit });
    } catch (err) {
      console.error('[GamScene] _playInteractFx falló (no fatal):', err);
    }

    window.dispatchEvent(new CustomEvent('gam:interact', {
      detail: {
        id:      f.id,
        kind:    f.kind,
        label:   f.label,
        content: this._hotspotContent.get(f.id) || null,
      },
    }));
  }

  /**
   * Feedback inmediato al presionar E — hasta ahora _interact() no hacía
   * nada visible antes de que el modal apareciera (~180ms después). Glow +
   * partículas + micro-punch de cámara, más grande la primera vez que se
   * visita cada mueble en la sesión. Gateado en bloque por _reducedMotion
   * (mismo criterio que _addIdleMotion); el chime de audio se gatea aparte
   * solo por _muted, nunca por reduced motion — igual que footstep/blip.
   */
  _playInteractFx(f, { big = false } = {}) {
    if (!this._muted) {
      envelope(this._audioCtx, { freq: big ? 660 : 880, type: 'triangle', duration: big ? 0.18 : 0.12, gain: 0.12 });
    }

    if (this._reducedMotion) return;

    if (f._highlightG) {
      const g = f._highlightG;
      this.tweens.killTweensOf(g);
      g.setAlpha(0.45).setScale(0.7);
      this.tweens.add({ targets: g, alpha: 0, scale: 1.3, duration: 380, ease: 'Sine.easeOut' });
    }

    if (f._screen) {
      burstParticles(this, f._screen.sx, f._screen.sy - f._hh, {
        color: f.color,
        count: big ? 16 : 8,
        spread: big ? 100 : 70,
      });
    }

    cameraPunch(this, { zoom: big ? 1.035 : 1.02, duration: 90 });
    if (big) this.cameras.main.flash(120, 255, 176, 32);
  }

  /**
   * Llamado desde gam-loader.js cuando se descubren los 10/10 hotspots —
   * el toast de texto en la TV queda intacto (sigue accesible con reduced
   * motion); esto es el refuerzo extra en el canvas de Phaser.
   */
  celebrateComplete() {
    if (this._reducedMotion) return;

    const p = isoProject(this._player.x, this._player.y);
    this.cameras.main.flash(280, 255, 176, 32);
    burstParticles(this, p.sx, p.sy, { color: 0xffd580, count: 26, spread: 140, lifespan: 700 });

    if (!this._muted) {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        this.time.delayedCall(i * 90, () => envelope(this._audioCtx, { freq, type: 'triangle', duration: 0.35, gain: 0.14 }));
      });
    }
  }
}
