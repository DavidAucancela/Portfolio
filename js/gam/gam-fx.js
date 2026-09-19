/**
 * gam-fx.js — helpers visuales de Phaser para el modo .gam (partículas +
 * cámara). Separado de gam-scene.js para no seguir engordando ese archivo
 * con utilidades reusables, y separado de gam-audio.js/gam-ambience.js
 * porque estos dependen de la API de Phaser (scene.add/tweens/textures),
 * no de Web Audio.
 *
 * Sin dependencia de arte nuevo: la textura de partícula se genera en
 * código (un punto dibujado con Graphics), nunca se carga un archivo.
 */

const DOT_KEY = 'gam-fx-dot';

/** Genera (una sola vez, cacheada por Phaser) la textura de partícula. */
function ensureDotTexture(scene) {
  if (scene.textures.exists(DOT_KEY)) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(DOT_KEY, 8, 8);
  g.destroy();
}

/**
 * Burst puntual de partículas en (x,y), coords de pantalla. Autodestructivo
 * (no hay que trackearlo aparte) — Phaser limpia timers/emitters propios al
 * destruir la escena, igual que ya pasa con los tweens de _addIdleMotion.
 */
export function burstParticles(scene, x, y, { color = 0xffffff, count = 8, spread = 70, lifespan = 420 } = {}) {
  ensureDotTexture(scene);
  const emitter = scene.add.particles(x, y, DOT_KEY, {
    lifespan,
    speed: { min: spread * 0.4, max: spread },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: color,
    emitting: false,
  });
  emitter.explode(count);
  scene.time.delayedCall(lifespan + 80, () => emitter.destroy());
}

/**
 * Pequeño "punch" de zoom en la cámara principal, siempre relativo a
 * `baseZoom` (default 1, el zoom de reposo real de la cámara de .gam —
 * _setupCamera() nunca lo toca). Importante: leer `cam.zoom` en vivo como
 * base (en vez de un valor fijo) rompe con interacts rápidos seguidos —
 * killTweensOf() corta el tween anterior a mitad de camino, con el zoom
 * todavía elevado, y ese valor quedaba de "base" del siguiente punch. El
 * zoom nunca volvía a 1.0 y se iba trepando con cada interacción. Por eso
 * cada punch fuerza `cam.zoom` a `baseZoom` antes de animar — no acumula
 * sin importar cuán seguido se llame.
 */
export function cameraPunch(scene, { zoom = 1.02, duration = 90, baseZoom = 1 } = {}) {
  const cam = scene.cameras.main;
  scene.tweens.killTweensOf(cam);
  cam.setZoom(baseZoom);
  scene.tweens.add({
    targets: cam,
    zoom: baseZoom * zoom,
    duration,
    yoyo: true,
    ease: 'Sine.easeOut',
  });
}
