/**
 * gam-scene.js — Escena principal del cuarto isométrico (modo .gam)
 *
 * MVP: cuarto navegable + colisiones + hotspots por proximidad.
 * Sin minijuegos reales todavía (ver docs/gam-mode-plan.md) — cada objeto
 * emite 'gam:interact' y gam-loader.js abre un modal placeholder.
 *
 * Truco de renderizado isométrico: toda la lógica (movimiento, colisiones,
 * proximidad) vive en coordenadas cartesianas simples (this._player.x/y,
 * footprints de muebles en x/y/w/h). Solo la posición final en pantalla se
 * proyecta a isométrico con isoProject() — así las colisiones son AABB
 * comunes y no hay que lidiar con geometría isométrica real.
 */
import Phaser from 'phaser';

export const ROOM_W = 600;
export const ROOM_H = 600;

const ISO_X = 0.56;
const ISO_Y = 0.30;
const ORIGIN_X = 400; // debe coincidir con width/2 del Phaser.Game
const ORIGIN_Y = 150;

const PLAYER_SPEED     = 150; // px lógicos / seg
const PLAYER_RADIUS    = 14;
const INTERACT_RADIUS  = 50;

function isoProject(x, y) {
  return {
    sx: ORIGIN_X + (x - y) * ISO_X,
    sy: ORIGIN_Y + (x + y) * ISO_Y,
  };
}

/* ────────────────────────────────────────────────────
   LAYOUT DEL CUARTO (v2) — ver docs/gam-mode-plan.md
   x/y = centro lógico del objeto · w/h = footprint de colisión.
   Distribuidos en anillo parejo alrededor del centro (Pukis) — evita que
   los íconos/etiquetas se pisen entre sí, algo que con el layout v1
   (cuarto más chico, posiciones a mano) se notaba entre terminal/lectura.
──────────────────────────────────────────────────── */
const FURNITURE = [
  { id: 'piano',      x: 150, y: 126, w: 95, h: 40, color: 0x2e2210, label: '🎹 Piano',            kind: 'minigame' },
  { id: 'desk',       x: 267, y: 72,  w: 80, h: 55, color: 0x3b82f6, label: '🖥️ Escritorio',       kind: 'info' },
  { id: 'juggling',   x: 395, y: 91,  w: 40, h: 40, color: 0xff8a3d, label: '🤹 Malabares',        kind: 'video' },
  { id: 'diplomas',   x: 530, y: 300, w: 65, h: 40, color: 0xffd580, label: '🏆 Diplomas',         kind: 'info' },
  { id: 'bed',        x: 493, y: 424, w: 70, h: 50, color: 0xc9a06a, label: '🛏️ Cama',            kind: 'info' },
  { id: 'door',       x: 395, y: 509, w: 55, h: 20, color: 0x94a3b8, label: '🚪 Salir',            kind: 'exit' },
  { id: 'reading',    x: 267, y: 528, w: 60, h: 40, color: 0xc9a06a, label: '📖 Rincón de lectura', kind: 'info' },
  { id: 'terminal',   x: 150, y: 474, w: 65, h: 55, color: 0x00ff41, label: '💚 Terminal',         kind: 'info' },
  { id: 'skateboard', x: 79,  y: 365, w: 65, h: 30, color: 0x06ffa5, label: '🛹 Patineta',         kind: '3d' },
  { id: 'bookshelf',  x: 79,  y: 235, w: 65, h: 65, color: 0xb14eff, label: '📚 Estante',          kind: 'info' },
  { id: 'pukis',      x: 300, y: 300, w: 28, h: 24, color: 0x8b5a2b, label: '🐾 Pukis',            kind: 'info', decorative: true },
];

/* ────────────────────────────────────────────────────
   ÍCONOS "DEFAULT" — dibujados a mano con Phaser Graphics para que cada
   mueble se reconozca (escritorio, piano, cama...) sin depender todavía
   de arte real generado (ver "Riesgo técnico" en docs/gam-mode-plan.md).
   Cada función dibuja centrada en `c` (punto isométrico ya proyectado),
   con hw/hh = medio-ancho/alto del rombo de footprint del objeto.
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

  create() {
    this._keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E');
    this._player = { x: 300, y: 270 };
    this._activeHotspot = null;
    this._touchVec = { x: 0, y: 0 };
    this._touchInteractPressed = false;

    this._promptEl      = document.getElementById('gam-prompt');
    this._promptLabelEl = document.getElementById('gam-prompt-label');

    this._drawFloor();
    this._furnitureObjs = FURNITURE.map(f => this._drawFurniture(f));
    this._playerG = this._drawPlayer();
    this._setupCamera();
    this._initTouchControls();

    // QA desde consola en dev — mismo criterio que window.IaMascot (ver
    // ia-mascot.js): permite inspeccionar this._player sin instrumentar UI.
    if (import.meta.env.DEV) window.__gamScene = this;

    // Limpieza al salir del modo (gam-loader destruye el Game, pero por
    // las dudas si algún día se reutiliza la escena sin destruir el juego)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._hidePrompt());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this._hidePrompt());
  }

  _hidePrompt() {
    if (this._promptEl) this._promptEl.hidden = true;
    if (this._touchWrapEl) this._touchWrapEl.hidden = true;
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

  _drawFloor() {
    const g = this.add.graphics();
    const corners = [
      isoProject(0, 0), isoProject(ROOM_W, 0),
      isoProject(ROOM_W, ROOM_H), isoProject(0, ROOM_H),
    ];
    g.fillStyle(0x2e2210, 1);
    g.beginPath();
    g.moveTo(corners[0].sx, corners[0].sy);
    corners.slice(1).forEach(c => g.lineTo(c.sx, c.sy));
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffb020, 0.25);
    g.strokePath();
    g.setDepth(0);
  }

  _drawFurniture(f) {
    const c  = isoProject(f.x, f.y);
    const hw = (f.w / 2) * ISO_X * 2; // ancho medio del rombo proyectado
    const hh = (f.h / 2) * ISO_Y * 2;
    const depth = f.x + f.y;

    const g = this.add.graphics();

    // Footprint (rombo) sobre el piso — base isométrica de cualquier objeto
    g.fillStyle(f.color, f.decorative ? 0.5 : 0.3);
    g.beginPath();
    g.moveTo(c.sx, c.sy - hh);
    g.lineTo(c.sx + hw, c.sy);
    g.lineTo(c.sx, c.sy + hh);
    g.lineTo(c.sx - hw, c.sy);
    g.closePath();
    g.fillPath();

    // Ícono "default" a medida (ver ICON_DRAWERS) — fallback a un bloque
    // de color liso si el objeto todavía no tiene uno dibujado
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
    g.setDepth(depth);

    const labelOffsetY = f.decorative ? hh * 1.6 : 46;
    const label = this.add.text(c.sx, c.sy - labelOffsetY, f.label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f5e9d6',
    }).setOrigin(0.5, 1).setDepth(depth + 0.1);

    return { ...f, depth, _g: g, _label: label };
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
    const minY = Math.min(...ys) - 60; // margen para etiquetas sobre los muebles
    const maxY = Math.max(...ys);
    this.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY + 60);
    this.cameras.main.startFollow(this._playerG, true, 0.08, 0.08);
  }

  _drawPlayer() {
    const g = this.add.graphics();
    g.fillStyle(0xffb020, 1);
    g.fillCircle(0, 0, PLAYER_RADIUS);
    g.fillStyle(0x1a1206, 0.85);
    g.fillCircle(0, -PLAYER_RADIUS * 0.4, PLAYER_RADIUS * 0.35);
    return g;
  }

  update(_time, deltaMs) {
    // Cualquier excepción sin capturar acá mata el loop de Phaser entero
    // (el juego "se cuelga" y ya no responde a nada, ni siquiera el
    // movimiento) — se atrapa y se loguea en vez de tirar todo abajo.
    try {
      this._updateFrame(deltaMs);
    } catch (err) {
      console.error('[GamScene] Error en update():', err);
    }
  }

  _updateFrame(deltaMs) {
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

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      // El teclado siempre da len >= 1 (incluso diagonal, tras dividir por
      // len de abajo), así que este clamp solo atenúa al joystick táctil
      // cuando el tilt es parcial.
      const speed = PLAYER_SPEED * Math.min(1, len);
      this._tryMove((dx / len) * speed * dt, 0);
      this._tryMove(0, (dy / len) * speed * dt);
    }

    const proj = isoProject(this._player.x, this._player.y);
    this._playerG.setPosition(proj.sx, proj.sy);
    this._playerG.setDepth(this._player.x + this._player.y);

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
    window.dispatchEvent(new CustomEvent('gam:interact', {
      detail: {
        id:      f.id,
        kind:    f.kind,
        label:   f.label,
        content: this._hotspotContent.get(f.id) || null,
      },
    }));
  }
}
