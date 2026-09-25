/**
 * gam-stations.js — estaciones interactivas de .gam (Three.js).
 *
 * Al hacer click en un objeto del cuarto la cámara hace zoom y el objeto pasa
 * a primer plano: cada uno se vuelve dinámico DENTRO de la escena, con su
 * propia interacción y animaciones (ya no se abre un panel modal):
 *
 *   piano       → teclas 3D tocables + pestañas Libre / Reto
 *   desk        → tarjeta con proyectos + pines con detalles + pantallas vivas
 *   bookshelf   → libros que se sacan al pasar el mouse; click = proyecto de IA
 *   window      → anochece / amanece (luces, cielo de la ventana)
 *   skateboard  → se despega de la pared: arrastrar para girarla en 3D + trucos
 *   juggling    → cascada de 6 pelotas + reto de atrapar en la zona
 *   pukis       → acariciarlo: corazones, cola, orejas
 *   chess       → tablero 3D: juegas con blancas contra una IA sencilla
 *   lumbre      → póster de mi juego Lumbre: capturas + enlaces
 *
 * Contrato: `createStations(base, objects)` devuelve Map(id → estación). Una
 * estación es { focus(), enter(), exit(), update(now, dt), busy?(), pointerMove?,
 * pointerDown?, pointerUp?, key? }. `base` lo arma gam-three-scene.js (cámara,
 * HUD, entorno día/noche, raycast, etc.); `objects` trae, por id, el grupo 3D
 * del mueble y las referencias (`refs`) que dejó `buildFurnitureGroup`.
 */
import * as THREE from 'three';
import { getAudioContext, envelope } from './gam-audio.js';
import { createPiano, KEY_BINDINGS } from './gam-piano.js';
import { createJuggling, ZONE_CENTER } from './gam-juggling.js';
import { newGame, legalMoves, applyMove, chooseMove, status as chessStatus, isWhite } from './gam-chess.js';
import { LangSwitcher } from '../lang.js';
import { ProjectGallery } from '../project-gallery.js';

/* ────────────────────────────────────────────────────
   Utilidades compartidas
──────────────────────────────────────────────────── */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/** Animaciones por tiempo (sin librería): fn(p 0..1) cada frame hasta el final. */
function createTweens(reducedMotion) {
  const list = [];
  return {
    add(ms, fn, done) { list.push({ t0: null, dur: reducedMotion ? 1 : ms, fn, done }); },
    update(now) {
      for (let i = list.length - 1; i >= 0; i--) {
        const tw = list[i];
        if (tw.t0 === null) tw.t0 = now;
        const p = clamp((now - tw.t0) / tw.dur, 0, 1);
        tw.fn(p);
        if (p >= 1) { list.splice(i, 1); tw.done?.(); }
      }
    },
    clear() { list.length = 0; },
    get busy() { return list.length > 0; },
  };
}

/** Glifos flotantes (♪ ❤ z ✦ …) como sprites que suben y se desvanecen. */
function createEmitter(scene) {
  const cache = new Map();
  const live = [];

  function texFor(glyph, color) {
    const key = glyph + color;
    let t = cache.get(key);
    if (!t) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.font = 'bold 44px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = color;
      g.shadowBlur = 10;
      g.fillStyle = color;
      g.fillText(glyph, 32, 34);
      t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      cache.set(key, t);
    }
    return t;
  }

  function remove(p) {
    scene.remove(p.sp);
    p.mat.dispose();
  }

  function emit(glyph, color, pos, { size = 0.22, rise = 0.5, drift = 0.1, life = 1.6 } = {}) {
    const mat = new THREE.SpriteMaterial({ map: texFor(glyph, color), transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(size, size, 1);
    sp.position.copy(pos);
    sp.renderOrder = 8;
    scene.add(sp);
    live.push({ sp, mat, life, age: 0, rise, drift: (Math.random() - 0.5) * drift * 2, base: pos.clone() });
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) { remove(p); live.splice(i, 1); continue; }
      p.sp.position.set(p.base.x + p.drift * u, p.base.y + p.rise * u, p.base.z + p.drift * u * 0.5);
      p.mat.opacity = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
    }
  }

  function dispose() {
    live.forEach(remove);
    live.length = 0;
    cache.forEach(t => t.dispose());
    cache.clear();
  }

  return { emit, update, dispose };
}

const _jsonCache = {};
function loadJSON(path) {
  if (!_jsonCache[path]) {
    _jsonCache[path] = fetch(path).then(r => (r.ok ? r.json() : [])).catch(() => []);
  }
  return _jsonCache[path];
}

/** Resuelve un campo bilingüe {es,en} con el idioma activo. */
const L = (v) => LangSwitcher.L(v);

/* ────────────────────────────────────────────────────
   PIANO — teclas 3D tocables. Pestañas Libre / Reto en el HUD.
──────────────────────────────────────────────────── */
function pianoStation(c) {
  const { root, refs, hud } = c;
  const keys = refs.keys;
  const press = new Array(keys.length).fill(0);
  const tones = keys.map((_, i) => `hsl(${28 + i * 22}, 95%, 62%)`);
  let engine = null;
  let hovered = -1;

  const keyWorld = (i) => keys[i].getWorldPosition(new THREE.Vector3()).add(V(0, 0.12, 0));

  function flash(i) {
    press[i] = 1;
    c.glyphs.emit(i % 2 ? '♫' : '♪', tones[i], keyWorld(i), { rise: 0.75, drift: 0.18, size: 0.26 });
  }

  function pickKey() {
    const hit = c.pick(keys);
    return hit ? keys.indexOf(hit.object) : -1;
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 0.8, 0.08)), zoom: 4.6 }),

    enter() {
      engine = createPiano({
        onFlash: flash,
        onStatus: (t) => hud.setStatus(t),
        onEnd: () => hud.setAction('start', { hidden: false, label: '↻ Otra vuelta' }),
        onHot: () => c.glyphs.emit('🔥', '#ffb020', keyWorld(4), { rise: 0.9, size: 0.34 }),
      });
      hud.show({
        icon: '🎹',
        title: 'Piano',
        tabs: [{ id: 'free', label: 'Libre' }, { id: 'challenge', label: 'Reto' }],
        active: 'free',
        onTab: (id) => {
          engine.setMode(id);
          hud.setAction('start', { hidden: id !== 'challenge', label: '▶ Empezar secuencia' });
        },
        actions: [{
          id: 'start', label: '▶ Empezar secuencia', hidden: true,
          onClick: () => { engine.start(); hud.setAction('start', { hidden: true }); },
        }],
        hint: 'Haz clic en las teclas · o usa A S D F G H J K L ; Z X C V B',
        onBack: c.leave,
      });
      engine.setMode('free');
    },

    exit() {
      engine?.destroy();
      engine = null;
      keys.forEach((k, i) => { press[i] = 0; k.position.y = k.userData.baseY; k.rotation.x = 0; k.material.emissive.setHex(0); k.material.emissiveIntensity = 0; });
      c.setOutline([]);
    },

    update(now, dt) {
      keys.forEach((k, i) => {
        press[i] = Math.max(0, press[i] - dt * 5);
        const h = hovered === i ? 0.25 : 0;
        k.position.y = k.userData.baseY - 0.014 * press[i];
        k.rotation.x = 0.09 * press[i];
        k.material.emissive.setHex(0xffb020);
        k.material.emissiveIntensity = Math.max(press[i] * 0.9, h);
      });
    },

    pointerMove() {
      hovered = pickKey();
      c.setCursor(hovered >= 0 ? 'pointer' : 'default');
    },

    pointerDown() {
      const i = pickKey();
      if (i >= 0) engine?.press(i);
    },

    key(e) {
      const idx = KEY_BINDINGS.indexOf(e.key.toUpperCase());
      if (idx === -1 || e.metaKey || e.ctrlKey || e.altKey) return false;
      if (!e.repeat) engine?.press(idx);
      return true;
    },
  };
}

/* ────────────────────────────────────────────────────
   DESK — pantallas vivas, pines con detalles y tarjeta de proyectos.
──────────────────────────────────────────────────── */
const DESK_STACK = ['Django', 'React', 'Angular', 'Node.js', 'PostgreSQL', 'Docker'];

function deskStation(c) {
  const { root, refs, hud } = c;
  let spawnT = 0;
  const monitorTop = () => root.localToWorld(V(-0.35, 1.55, -0.2));

  const pinDefs = [
    [V(-0.35, 1.25, -0.2), 'Monitor principal — el editor siempre abierto ⌨️'],
    [V(0.72, 1.19, -0.15), 'Segundo monitor — galería de proyectos 🖼️'],
    [V(-1.05, 0.98, 0.0), 'Laptop — pruebas rápidas y demos'],
    [V(-0.2, 0.83, 0.24), 'Teclado con luz RGB que cambia de color 🌈'],
    [V(-1.11, 1.25, -0.16), 'Lámpara — de aquí sale la luz cálida del rincón 💡'],
    [V(1.12, 0.98, 0.1), 'Auriculares — lo-fi para compilar 🎧'],
    [V(-0.72, 0.88, 0.3), 'Café: el combustible oficial ☕'],
  ];

  return {
    focus: () => ({ look: root.localToWorld(V(0.05, 1.0, -0.1)), zoom: 2.7, shift: 0.3 }),

    enter() {
      hud.show({
        icon: '🖥️',
        title: 'Escritorio',
        hint: 'Pasa el cursor sobre los puntos ✦ para ver detalles · elige un proyecto en la tarjeta',
        onBack: c.leave,
      });
      // localToWorld muta el vector que recibe — clonar, o la 2ª visita usaría coords de mundo como locales
      hud.setPins(pinDefs.map(([p, text]) => ({ pos: root.localToWorld(p.clone()), text: esc(text) })));

      const card = el('div', 'gam-card');
      card.innerHTML = `
        <h3 class="gam-card__title">🖥️ ${esc(L(c.content.title) || 'Escritorio')}</h3>
        <p class="gam-card__text">${esc(L(c.content.message))}</p>
        <div class="gam-card__chips">${DESK_STACK.map(t => `<span class="gam-card__chip">${esc(t)}</span>`).join('')}</div>
        <p class="gam-card__label">Proyectos</p>
        <div class="gam-card__list"><p class="gam-card__empty">Cargando…</p></div>
      `;
      hud.setCard(card);
      const listEl = card.querySelector('.gam-card__list');
      loadJSON('data/dev-projects.json').then((projects) => {
        if (!listEl.isConnected) return;
        if (!projects.length) { listEl.innerHTML = '<p class="gam-card__empty">Sin proyectos todavía.</p>'; return; }
        listEl.innerHTML = projects.map((p, i) => `
          <button type="button" class="gam-card__item" data-i="${i}">
            <span class="gam-card__item-title">${esc(L(p.title))}</span>
            <span class="gam-card__item-desc">${esc(L(p.description))}</span>
          </button>`).join('');
        listEl.addEventListener('click', (e) => {
          const b = e.target.closest('.gam-card__item');
          if (b) ProjectGallery.open(projects[Number(b.dataset.i)], 'dev');
        });
      });
    },

    exit() {
      refs.scrollTex.forEach(t => { t.offset.y = 0; });
    },

    update(now, dt) {
      // el código "se escribe": la textura de las pantallas se desplaza
      refs.scrollTex.forEach((t, i) => { t.offset.y = ((now * 0.00004 * (i + 1)) % 1); });
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 0.9;
        const glyphs = ['</>', '{ }', 'λ', '=>', '01'];
        c.glyphs.emit(glyphs[Math.floor(Math.random() * glyphs.length)], '#7cc4ff', monitorTop().add(V((Math.random() - 0.5) * 0.4, 0, 0)), { size: 0.3, rise: 0.6, life: 2 });
      }
    },
  };
}

/* ────────────────────────────────────────────────────
   BOOKSHELF — libros de proyectos de IA: salen al pasar el mouse, click = abrir.
──────────────────────────────────────────────────── */
function spineTexture(title, colorHex) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 256;
  const g = cv.getContext('2d');
  const col = `#${colorHex}`;
  g.fillStyle = col;
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(0, 0, 64, 10);
  g.fillRect(0, 246, 64, 10);
  const lum = parseInt(colorHex.slice(0, 2), 16) * 0.3 + parseInt(colorHex.slice(2, 4), 16) * 0.59 + parseInt(colorHex.slice(4, 6), 16) * 0.11;
  g.fillStyle = lum > 140 ? '#1a1206' : '#f8f0dc';
  g.font = 'bold 26px "Courier New", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.translate(32, 128);
  g.rotate(Math.PI / 2);
  g.fillText(title.length > 16 ? `${title.slice(0, 15)}…` : title, 0, 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bookshelfStation(c) {
  const { root, refs, hud } = c;
  const books = refs.books;               // [{ mesh, row }], fila 0 = la de abajo
  let assigned = false;
  let projects = [];
  let bookProject = new Map();            // mesh → proyecto
  let hoveredBook = null;
  let selected = null;
  let card = null;

  function assign() {
    if (assigned) return;
    assigned = true;
    // los proyectos van en las filas de arriba primero
    const order = [...books].reverse();
    projects.forEach((p, i) => {
      const b = order[i];
      if (!b) return;
      const m = b.mesh.material;
      const hex = m.color.getHexString();
      m.map = spineTexture(L(p.title) || '', hex);
      m.color.setHex(0xffffff);
      m.needsUpdate = true;
      bookProject.set(b.mesh, p);
    });
  }

  function showDefaultCard(skills) {
    card = el('div', 'gam-card');
    const chips = (skills || []).filter(s => s.category === 'ai').map(s => `<span class="gam-card__chip">${esc(s.name)}</span>`).join('');
    card.innerHTML = `
      <h3 class="gam-card__title">📚 ${esc(L(c.content.title) || 'Estante')}</h3>
      <p class="gam-card__text">${esc(L(c.content.message))}</p>
      <p class="gam-card__hint">Pasa el cursor sobre un libro y haz clic para abrirlo.</p>
      ${chips ? `<p class="gam-card__label">Herramientas de IA</p><div class="gam-card__chips">${chips}</div>` : ''}
    `;
    hud.setCard(card);
  }

  function showProject(p) {
    const n = el('div', 'gam-card');
    n.innerHTML = `
      <h3 class="gam-card__title">📖 ${esc(L(p.title))}</h3>
      <p class="gam-card__text">${esc(L(p.description))}</p>
      <div class="gam-card__chips">${(p.tags || []).map(t => `<span class="gam-card__chip">${esc(t)}</span>`).join('')}</div>
      <button type="button" class="gam-card__cta">Abrir proyecto →</button>
      <button type="button" class="gam-card__link">← Ver todos los libros</button>
    `;
    n.querySelector('.gam-card__cta').addEventListener('click', () => ProjectGallery.open(p, 'ia'));
    n.querySelector('.gam-card__link').addEventListener('click', () => { selected = null; hud.setCard(card); });
    hud.setCard(n);
  }

  function pickBook() {
    const hit = c.pick(books.map(b => b.mesh));
    return hit && bookProject.has(hit.object) ? hit.object : null;
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 1.15, 0.15)), zoom: 2.6, shift: 0.3 }),

    enter() {
      hud.show({ icon: '📚', title: 'Estante', hint: 'Pasa el cursor sobre un libro · clic para abrirlo', onBack: c.leave });
      showDefaultCard([]);
      Promise.all([loadJSON('data/ia-projects.json'), loadJSON('data/skills.json')]).then(([p, skills]) => {
        projects = p;
        assign();
        if (hud.el.hidden) return;
        if (!selected) showDefaultCard(skills);
      });
    },

    exit() {
      hoveredBook = null;
      selected = null;
      c.setLabel(null);
      c.setOutline([]);
    },

    busy: () => books.some(b => Math.abs(b.mesh.position.z - b.mesh.userData.baseZ) > 0.002),

    update(now, dt) {
      const k = 1 - Math.pow(0.001, dt);
      books.forEach(({ mesh }) => {
        const out = mesh === selected ? 0.2 : mesh === hoveredBook ? 0.1 : 0;
        mesh.position.z += (mesh.userData.baseZ + out - mesh.position.z) * k;
        mesh.position.y += ((mesh.userData.baseY + (mesh === selected ? 0.03 : 0)) - mesh.position.y) * k;
        const glow = mesh === selected ? 0.5 : mesh === hoveredBook ? 0.25 : 0;
        mesh.material.emissive.setHex(0xffb020);
        mesh.material.emissiveIntensity = glow;
      });
    },

    pointerMove() {
      hoveredBook = pickBook();
      c.setCursor(hoveredBook ? 'pointer' : 'default');
      if (hoveredBook) {
        c.setOutline([hoveredBook]);
        c.setLabel(L(bookProject.get(hoveredBook).title), root.localToWorld(hoveredBook.position.clone().add(V(0, 0.28, 0.2))));
      } else {
        c.setOutline([]);
        c.setLabel(null);
      }
    },

    pointerDown() {
      const b = pickBook();
      if (!b) return;
      selected = b;
      showProject(bookProject.get(b));
      envelope(getAudioContext(), { freq: 392, type: 'triangle', duration: 0.12, gain: 0.07 });
    },
  };
}

/* ────────────────────────────────────────────────────
   WINDOW — al hacer click cambia el momento del día (anochece / amanece).
──────────────────────────────────────────────────── */
function windowStation(c) {
  const { root, hud, env } = c;
  let target = 1; // 1 = noche, 0 = día

  function goTo(t) {
    target = t;
    hud.setAction('toggle', { disabled: true });
    hud.setStatus(t === 1 ? 'Anocheciendo… 🌙' : 'Amaneciendo… ☀️');
    env.animateTo(t, 4200, () => {
      hud.setStatus(t === 1 ? 'Ya es de noche 🌙' : '¡Buenos días! ☀️');
      hud.setAction('toggle', { disabled: false, label: t === 1 ? '☀️ Amanecer' : '🌙 Anochecer' });
    });
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 3.0, 0)), zoom: 3.2 }),

    enter() {
      hud.show({
        icon: '🪟',
        title: 'Ventana',
        actions: [{ id: 'toggle', label: '☀️ Amanecer', onClick: () => goTo(target === 1 ? 0 : 1) }],
        hint: 'El cielo cambia con la hora del día',
        onBack: c.leave,
      });
      // desde el atardecer (o de día) anochece solo; si ya era de noche, amanece
      goTo(env.t > 0.75 ? 0 : 1);
    },

    exit() { /* el momento del día se queda como el jugador lo dejó */ },

    update() {},
  };
}

/* ────────────────────────────────────────────────────
   SKATEBOARD — se despega de la pared: arrastrar para girarla en 3D.
──────────────────────────────────────────────────── */
function skateStation(c) {
  const { root, refs, hud } = c;
  const { holder, pivot } = refs.skate;
  const tw = createTweens(c.reducedMotion);
  const REST = { pos: V(0, 0.6, 0), rotX: -0.18 };
  const SHOW = { pos: V(-0.4, 1.3, 1.5), rotX: 0 }; // de pie, la cara de stickers hacia la cámara
  let dragging = false;
  let last = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 };
  let trick = false;
  let idleAt = 0;
  let active = false;

  function moveTo(pos, rotX, ms, done) {
    const p0 = holder.position.clone();
    const r0 = pivot.rotation.x;
    tw.add(ms, (p) => {
      const e = ease(p);
      holder.position.lerpVectors(p0, pos, e);
      pivot.rotation.x = lerp(r0, rotX, e);
    }, done);
  }

  function doTrick(kind) {
    if (trick || !active) return;
    trick = true;
    envelope(getAudioContext(), { freq: 180, type: 'square', duration: 0.07, gain: 0.08 });
    const y0 = holder.position.y;
    const yaw0 = holder.rotation.y;
    tw.add(kind === 'kickflip' ? 850 : 750, (p) => {
      const e = ease(p);
      holder.position.y = y0 + 0.4 * Math.sin(Math.PI * p);
      if (kind === 'kickflip') holder.rotation.z = Math.PI * 2 * e;
      else holder.rotation.y = yaw0 + Math.PI * 2 * e;
    }, () => {
      holder.rotation.z = 0;
      holder.position.y = y0;
      trick = false;
      envelope(getAudioContext(), { freq: 110, type: 'triangle', duration: 0.09, gain: 0.09 });
      c.glyphs.emit('✦', '#06ffa5', root.localToWorld(holder.position.clone()), { size: 0.3, rise: 0.5 });
    });
  }

  return {
    focus: () => ({ look: root.localToWorld(SHOW.pos.clone()), zoom: 3.8 }),

    enter() {
      active = true;
      hud.show({
        icon: '🛹',
        title: 'Patineta',
        actions: [
          { id: 'kickflip', label: 'Kickflip', onClick: () => doTrick('kickflip') },
          { id: 'shove', label: 'Shove-it', onClick: () => doTrick('shove') },
          { id: 'flip', label: '↻ Voltear', onClick: () => { if (!trick) { const y0 = holder.rotation.y; tw.add(700, (p) => { holder.rotation.y = y0 + Math.PI * ease(p); }); idleAt = performance.now() + 2500; } } },
          { id: 'reset', label: '↺ Reiniciar', onClick: () => { if (!trick) tw.add(500, (() => { const a = holder.rotation.clone(); return (p) => { holder.rotation.set(lerp(a.x, 0, ease(p)), lerp(a.y, 0, ease(p)), 0); }; })()); } },
        ],
        hint: 'Arrastra para girarla en 3D · mira los stickers · voltéala para ver el grip',
        status: 'Se despegó de la pared 🛹',
        onBack: c.leave,
      });
      moveTo(SHOW.pos, SHOW.rotX, 900);
    },

    exit() {
      active = false;
      dragging = false;
      trick = false;
      tw.clear();
      const r0 = holder.rotation.clone();
      const p0 = holder.position.clone();
      const rx0 = pivot.rotation.x;
      tw.add(700, (p) => {
        const e = ease(p);
        holder.position.lerpVectors(p0, REST.pos, e);
        pivot.rotation.x = lerp(rx0, REST.rotX, e);
        holder.rotation.set(lerp(r0.x, 0, e), lerp(r0.y, 0, e), lerp(r0.z, 0, e));
      });
      c.setCursor('default');
    },

    busy: () => tw.busy,

    update(now, dt) {
      tw.update(now);
      if (!active) return;
      if (!dragging && !trick) {
        // inercia del arrastre y giro lento de exhibición
        holder.rotation.y += vel.x * dt * 60;
        holder.rotation.x = clamp(holder.rotation.x + vel.y * dt * 60, -1.2, 1.2);
        vel.x *= 0.92; vel.y *= 0.92;
        if (now > idleAt) {
          // reposo: vuelve suave a mirar de frente (stickers) con un leve balanceo, sin girar de espaldas
          const front = Math.round(holder.rotation.y / Math.PI) * Math.PI;
          holder.rotation.y += (front + Math.sin(now * 0.0009) * 0.25 - holder.rotation.y) * Math.min(1, dt * 1.2);
          holder.rotation.x += (0.08 - holder.rotation.x) * Math.min(1, dt * 1.5);
        }
      }
    },

    pointerDown(ndc) {
      dragging = true;
      last = { x: ndc.x, y: ndc.y };
      vel = { x: 0, y: 0 };
      c.setCursor('grabbing');
    },

    pointerMove(ndc) {
      if (!dragging) { c.setCursor('grab'); return; }
      const dx = (ndc.x - last.x) * 3.2;
      const dy = (ndc.y - last.y) * 2.2;
      last = { x: ndc.x, y: ndc.y };
      if (trick) return;
      holder.rotation.y += dx;
      holder.rotation.x = clamp(holder.rotation.x - dy, -1.2, 1.2);
      vel = { x: dx / 4, y: -dy / 4 };
    },

    pointerUp() {
      dragging = false;
      idleAt = performance.now() + 1800;
      c.setCursor('grab');
    },
  };
}

/* ────────────────────────────────────────────────────
   JUGGLING — cascada de 6 pelotas + reto de atrapar en la zona.
──────────────────────────────────────────────────── */
function jugglingStation(c) {
  const { root, refs, hud } = c;
  const balls = refs.balls;               // [{ mesh, rest: Vector3 }]
  const BASE_Y = 0.86;                    // sobre la tapa del pedestal
  const RISE = 0.8;
  const HAND = 0.24;
  const tw = createTweens(c.reducedMotion);
  let mode = 'watch';
  let engine = null;
  let ring = null;
  let ringMat = null;
  let ringFlash = 0;
  let ringColor = 0xffb020;
  let running = false;

  function ballWorld(i) { return root.localToWorld(balls[i].mesh.position.clone()); }

  function buildRing() {
    ringMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 1.2, roughness: 0.4 });
    ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 10, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, BASE_Y + (1 - ZONE_CENTER) * RISE, 0);
    root.add(ring);
  }
  function dropRing() {
    if (!ring) return;
    root.remove(ring);
    ring.geometry.dispose();
    ringMat.dispose();
    ring = ringMat = null;
  }

  function resetBalls() {
    balls.forEach(({ mesh, rest }) => { mesh.position.copy(rest); mesh.userData.locked = false; });
  }

  function setMode(m) {
    mode = m;
    running = false;
    engine?.stop();
    hud.setAction('start', { hidden: m !== 'play', label: '▶ Empezar' });
    hud.setAction('catch', { hidden: true });
    if (m === 'play') {
      if (!ring) buildRing();
      hud.setStatus(`Récord: <strong>${engine.best()}</strong> — pulsa Empezar y atrapa la pelota cuando cruce el aro`);
      balls.forEach(({ mesh, rest }, i) => { mesh.position.copy(rest); });
    } else {
      dropRing();
      hud.setStatus('Cascada de 6 pelotas tejidas a mano 🧶');
    }
  }

  function attempt(now) {
    if (mode === 'play' && running) engine.attempt(now);
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 1.15, 0)), zoom: 3.0 }),

    enter() {
      balls.forEach(({ mesh }) => { mesh.userData.locked = true; });
      engine = createJuggling({
        reducedMotion: c.reducedMotion,
        onStatus: (t) => hud.setStatus(t),
        onCatch: (score, milestone) => {
          ringFlash = 1; ringColor = 0x4ade80;
          c.glyphs.emit(milestone ? '★' : '✦', '#4ade80', ballWorld(0), { size: milestone ? 0.4 : 0.26, rise: 0.5 });
        },
        onFail: () => {
          running = false;
          ringFlash = 1; ringColor = 0xff4d4d;
          hud.setAction('start', { hidden: false, label: '↻ Reintentar' });
          hud.setAction('catch', { hidden: true });
        },
      });
      hud.show({
        icon: '🤹',
        title: 'Malabares',
        tabs: [{ id: 'watch', label: 'Mira' }, { id: 'play', label: 'Reto' }],
        active: 'watch',
        onTab: (id) => setMode(id),
        actions: [
          { id: 'start', label: '▶ Empezar', hidden: true, onClick: () => { running = true; engine.start(performance.now()); hud.setAction('start', { hidden: true }); hud.setAction('catch', { hidden: false }); } },
          { id: 'catch', label: '¡Atrapar! (Espacio)', hidden: true, onClick: () => attempt(performance.now()) },
        ],
        hint: 'Las 6 pelotas las tejió David a mano cuando le enseñaron a hacer malabares',
        onBack: c.leave,
      });
      setMode('watch');
    },

    exit() {
      engine?.stop();
      engine = null;
      running = false;
      dropRing();
      tw.clear();
      resetBalls();
    },

    update(now, dt) {
      tw.update(now);
      if (!engine) return;
      const t = now / 1000;
      if (mode === 'watch') {
        // cascada: cada pelota va y viene entre las dos manos en arcos parabólicos
        const P = 1.6;
        balls.forEach(({ mesh }, i) => {
          const phi = (t / P + i / balls.length) % 1;
          const k = Math.floor(phi * 2);
          const psi = phi * 2 - k;
          const x = (k % 2 === 0 ? 1 : -1) * HAND * (2 * psi - 1);
          mesh.position.set(x, BASE_Y + 0.1 + 4 * 0.5 * psi * (1 - psi) * 1.0, 0);
          mesh.rotation.z = t * 3 + i;
        });
      } else {
        const pct = engine.pct(now);
        const b0 = balls[0].mesh;
        if (pct !== null) b0.position.set(0, BASE_Y + 0.1 + (1 - pct) * RISE, 0);
        if (ring) {
          ringFlash = Math.max(0, ringFlash - dt * 3);
          const heat = engine.heat();
          const col = ringFlash > 0 ? ringColor : new THREE.Color().setHSL(0.11 - heat * 0.11, 1, 0.55).getHex();
          ringMat.emissive.setHex(col);
          ringMat.color.setHex(col);
          ringMat.emissiveIntensity = 1.2 + ringFlash * 2.5;
          ring.scale.setScalar(1 + ringFlash * 0.25);
        }
      }
    },

    busy: () => tw.busy,

    pointerDown() { attempt(performance.now()); },

    key(e) {
      if (e.code === 'Space') { e.preventDefault(); attempt(performance.now()); return true; }
      return false;
    },
  };
}

/* ────────────────────────────────────────────────────
   PUKIS — acariciarlo: corazones, cola y orejas.
──────────────────────────────────────────────────── */
function pukisStation(c) {
  const { root, refs, hud } = c;
  const { head, tail, ears } = refs.pukis;
  const tw = createTweens(c.reducedMotion);
  let pets = 0;
  let active = false;
  let wag = 0;   // 0..1 intensidad de la cola
  let hover = false;

  const STATUS = [
    [0, 'Pukis duerme… 💤'],
    [1, 'Pukis abre un ojo 👀'],
    [3, 'Pukis mueve la cola ❤'],
    [6, 'Pukis está feliz ❤❤'],
    [10, 'Pukis ronca feliz 💤❤'],
  ];
  const statusFor = (n) => STATUS.filter(([min]) => n >= min).pop()[1];

  function pet() {
    pets++;
    wag = 1;
    hud.setStatus(`${statusFor(pets)} <span class="gam-hud__count">×${pets}</span>`);
    const p = root.localToWorld(head.position.clone().add(V(0, 0.2, 0)));
    for (let i = 0; i < 2; i++) c.glyphs.emit('❤', '#ff6b8a', p.clone().add(V((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.15)), { size: 0.24 + Math.random() * 0.1, rise: 0.7, drift: 0.2, life: 1.8 });
    envelope(getAudioContext(), { freq: 520 + Math.random() * 120, type: 'sine', duration: 0.09, gain: 0.05 });
    const s0 = head.scale.x;
    tw.add(320, (t) => { head.scale.setScalar(s0 * (1 + 0.14 * Math.sin(Math.PI * t))); });
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0.2, 0.15, 0.05)), zoom: 4.6 }),

    enter() {
      active = true;
      pets = 0;
      hud.show({
        icon: '🐾',
        title: 'Pukis',
        hint: 'Haz clic sobre Pukis para acariciarlo',
        status: statusFor(0),
        onBack: c.leave,
      });
      const card = el('div', 'gam-card');
      card.innerHTML = `
        <h3 class="gam-card__title">🐾 ${esc(L(c.content.title) || 'Pukis')}</h3>
        <p class="gam-card__text">${esc(L(c.content.message))}</p>`;
      hud.setCard(card);
    },

    exit() {
      active = false;
      tw.clear();
      wag = 0;
      head.scale.setScalar(1);
      tail.rotation.y = 0;
      ears.forEach(e => { e.rotation.z = 0; });
      c.setOutline([]);
      c.setCursor('default');
    },

    busy: () => tw.busy || wag > 0.01,

    update(now, dt) {
      tw.update(now);
      wag = Math.max(0, wag - dt * 0.35);
      tail.rotation.y = Math.sin(now * 0.02) * 0.7 * wag;
      ears.forEach((e, i) => { e.rotation.z = Math.sin(now * 0.012 + i) * 0.35 * wag; });
    },

    pointerMove() {
      const hit = c.pick(refs.pukis.all);
      hover = !!hit;
      c.setCursor(hover ? 'pointer' : 'default');
      c.setOutline(hover ? refs.pukis.all : []);
    },

    pointerDown() {
      if (c.pick(refs.pukis.all)) pet();
    },
  };
}


/* ────────────────────────────────────────────────────
   CHESS — tablero 3D. Blancas = jugador; la IA lleva las negras.
   Las piezas viven siempre sobre el tablero (también fuera de la estación).
──────────────────────────────────────────────────── */
function chessStation(c) {
  const { root, refs, hud } = c;
  const squares = refs.squares;
  const cell = refs.cell;
  const boardY = refs.boardY + 0.014;
  const tw = createTweens(c.reducedMotion);
  const matW = new THREE.MeshStandardMaterial({ color: 0xf1e6cc, roughness: 0.45 });
  const matB = new THREE.MeshStandardMaterial({ color: 0x2a1f1a, roughness: 0.4 });
  const sqPos = (i) => V(((i & 7) - 3.5) * cell, boardY, ((i >> 3) - 3.5) * cell);

  const LATHE = {
    p: [[0.03, 0], [0.03, 0.008], [0.018, 0.016], [0.012, 0.04], [0.02, 0.046]],
    r: [[0.033, 0], [0.033, 0.01], [0.022, 0.02], [0.02, 0.06], [0.03, 0.066], [0.03, 0.09]],
    n: [[0.033, 0], [0.033, 0.01], [0.022, 0.02], [0.02, 0.035]],
    b: [[0.032, 0], [0.032, 0.01], [0.02, 0.02], [0.012, 0.055], [0.022, 0.065], [0.016, 0.09]],
    q: [[0.035, 0], [0.035, 0.01], [0.022, 0.02], [0.014, 0.07], [0.03, 0.085], [0.024, 0.105]],
    k: [[0.035, 0], [0.035, 0.01], [0.022, 0.02], [0.016, 0.075], [0.028, 0.09], [0.02, 0.108]],
  };

  function buildPiece(ch, sq) {
    const white = isWhite(ch);
    const kind = ch.toLowerCase();
    const m = white ? matW : matB;
    const g = new THREE.Group();
    const add = (geo, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    const prof = LATHE[kind].map(([r, y]) => new THREE.Vector2(r, y));
    prof.unshift(new THREE.Vector2(0, 0));
    prof.push(new THREE.Vector2(0, prof[prof.length - 1].y));   // tapa: sin agujero arriba
    add(new THREE.LatheGeometry(prof, 18));
    g.scale.setScalar(0.85);
    if (kind === 'p') add(new THREE.SphereGeometry(0.02, 14, 10), 0, 0.058);
    if (kind === 'b') { add(new THREE.SphereGeometry(0.008, 10, 8), 0, 0.102); }
    if (kind === 'q') { add(new THREE.SphereGeometry(0.012, 10, 8), 0, 0.118); }
    if (kind === 'k') {
      add(new THREE.BoxGeometry(0.008, 0.03, 0.008), 0, 0.128);
      add(new THREE.BoxGeometry(0.024, 0.008, 0.008), 0, 0.132);
    }
    if (kind === 'r') [[-0.02, 0], [0.02, 0], [0, -0.02], [0, 0.02]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.014, 0.014, 0.014), x, 0.097, z));
    if (kind === 'n') {
      const neck = add(new THREE.BoxGeometry(0.03, 0.06, 0.022), 0, 0.06, 0);
      neck.rotation.z = white ? -0.25 : -0.25;
      const head = add(new THREE.BoxGeometry(0.038, 0.026, 0.022), white ? 0.014 : 0.014, 0.093, 0);
      head.rotation.z = -0.1;
      g.rotation.y = white ? 0 : Math.PI;
    }
    g.userData.sq = sq;
    g.userData.ch = ch;
    g.position.copy(sqPos(sq));
    root.add(g);
    return g;
  }

  let gs = newGame();
  let history = [];
  let meshes = new Map(); // casilla → grupo de la pieza
  let selected = -1;
  let targets = [];
  let hovered = -1;
  let thinking = false;
  let over = false;
  let depth = 2;
  let aiTimer = null;
  let markers = [];

  function rebuild() {
    meshes.forEach((g) => { root.remove(g); });
    meshes = new Map();
    gs.b.forEach((ch, i) => { if (ch) meshes.set(i, buildPiece(ch, i)); });
  }
  rebuild();

  function clearMarkers() {
    markers.forEach((mk) => { root.remove(mk); mk.geometry.dispose(); mk.material.dispose(); });
    markers = [];
  }
  function showTargets() {
    clearMarkers();
    targets.forEach((m) => {
      const capture = gs.b[m.to] !== null || m.enPassant;
      const mk = new THREE.Mesh(new THREE.CylinderGeometry(capture ? 0.034 : 0.014, capture ? 0.034 : 0.014, 0.004, 20),
        new THREE.MeshBasicMaterial({ color: capture ? 0xff5a4d : 0x4ade80, transparent: true, opacity: 0.85 }));
      mk.position.copy(sqPos(m.to)).setY(boardY + 0.004);
      root.add(mk);
      markers.push(mk);
    });
  }

  function say(html) { hud.setStatus(html); }

  function statusText() {
    const st = chessStatus(gs);
    if (st === 'checkmate') { over = true; return gs.turn === 'w' ? '☠ <strong>Jaque mate</strong> — ganó la IA' : '🏆 <strong>Jaque mate</strong> — ¡ganaste!'; }
    if (st === 'stalemate') { over = true; return '🤝 <strong>Tablas</strong> por rey ahogado'; }
    if (st === 'draw') { over = true; return '🤝 <strong>Tablas</strong> por material insuficiente'; }
    const chk = st === 'check' ? ' · <strong>¡Jaque!</strong>' : '';
    return (gs.turn === 'w' ? 'Tu turno (blancas)' : 'Piensa la IA…') + chk;
  }

  function move3D(from, to, epSq, rookMove, promo, onDone) {
    const g = meshes.get(from);
    const victimSq = epSq ?? to;
    const victim = meshes.get(victimSq);
    if (victim && victim !== g) {
      meshes.delete(victimSq);
      const s0 = victim.scale.clone();
      tw.add(280, (p) => victim.scale.copy(s0).multiplyScalar(1 - p), () => root.remove(victim));
      c.glyphs.emit('✦', '#ffb020', root.localToWorld(sqPos(victimSq).setY(boardY + 0.09)), { size: 0.2, rise: 0.25 });
    }
    meshes.delete(from);
    meshes.set(to, g);
    g.userData.sq = to;
    const a = sqPos(from), b = sqPos(to);
    const dist = a.distanceTo(b);
    tw.add(c.reducedMotion ? 1 : 160 + dist * 900, (p) => {
      g.position.lerpVectors(a, b, ease(p));
      g.position.y = boardY + Math.sin(Math.PI * p) * Math.min(0.09, 0.02 + dist * 0.25);
    }, () => {
      g.position.copy(b);
      if (promo) {
        root.remove(g);
        const q = buildPiece(gs.b[to], to);
        meshes.set(to, q);
      }
      onDone?.();
    });
    if (rookMove) {
      const rg = meshes.get(rookMove.from);
      if (rg) {
        meshes.delete(rookMove.from);
        meshes.set(rookMove.to, rg);
        rg.userData.sq = rookMove.to;
        const ra = sqPos(rookMove.from), rb = sqPos(rookMove.to);
        tw.add(400, (p) => { rg.position.lerpVectors(ra, rb, ease(p)); rg.position.y = boardY + Math.sin(Math.PI * p) * 0.05; }, () => rg.position.copy(rb));
      }
    }
  }

  function play(m, then) {
    history.push({ gs, });
    const white = gs.turn === 'w';
    const row = white ? 7 : 0;
    const rookMove = m.castle === 'k' ? { from: row * 8 + 7, to: row * 8 + 5 } : m.castle === 'q' ? { from: row * 8, to: row * 8 + 3 } : null;
    const epSq = m.enPassant ? m.to + (white ? 8 : -8) : null;
    gs = applyMove(gs, m);
    move3D(m.from, m.to, epSq, rookMove, !!m.promo, then);
    selected = -1; targets = []; clearMarkers();
    say(statusText());
  }

  function aiMove() {
    if (over || gs.turn !== 'b') return;
    thinking = true;
    aiTimer = setTimeout(() => {
      aiTimer = null;
      const m = chooseMove(gs, depth);
      thinking = false;
      if (!m) return;
      play(m, () => { say(statusText()); });
    }, c.reducedMotion ? 10 : 500);
  }

  function sqFromHit(hit) {
    let o = hit?.object;
    while (o && o.userData.sq === undefined) o = o.parent;
    return o ? o.userData.sq : -1;
  }
  function pickSq() {
    return sqFromHit(c.pick([...squares, ...meshes.values()]));
  }

  function newMatch() {
    clearTimeout(aiTimer); aiTimer = null;
    tw.clear();
    gs = newGame(); history = []; over = false; thinking = false; selected = -1; targets = []; clearMarkers();
    rebuild();
    say(statusText());
  }

  function undo() {
    if (thinking || tw.busy) return;
    // deshace la jugada de la IA y la tuya (o solo la tuya si la IA no llegó a mover)
    const steps = gs.turn === 'w' ? 2 : 1;
    if (history.length < steps) return;
    for (let i = 0; i < steps; i++) gs = history.pop().gs;
    over = false; selected = -1; targets = []; clearMarkers();
    tw.clear();
    rebuild();
    say(statusText());
  }

  function tint(mesh, hex, k) {
    mesh.material.emissive.setHex(hex);
    mesh.material.emissiveIntensity = k;
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, boardY, 0)), zoom: 7.5 }),

    enter() {
      hud.show({
        icon: '♟️',
        title: 'Ajedrez',
        tabs: [{ id: '1', label: 'Fácil' }, { id: '2', label: 'Normal' }, { id: '3', label: 'Difícil' }],
        active: String(depth),
        onTab: (id) => { depth = Number(id); },
        actions: [
          { id: 'undo', label: '↶ Deshacer', onClick: undo },
          { id: 'new', label: '↻ Nueva partida', onClick: newMatch },
        ],
        hint: 'Clic en una pieza blanca y luego en la casilla destino',
        onBack: c.leave,
      });
      say(statusText());
      if (gs.turn === 'b' && !over && !thinking) aiMove();
    },

    exit() {
      selected = -1; targets = []; hovered = -1;
      clearMarkers();
      squares.forEach((s) => tint(s, 0x000000, 1));
      c.setOutline([]);
    },

    busy: () => tw.busy || thinking,

    update(now) {
      tw.update(now);
      squares.forEach((s, i) => {
        if (i === selected) tint(s, 0xffb020, 0.9);
        else if (i === hovered && !thinking) tint(s, 0xffffff, 0.25);
        else tint(s, 0x000000, 1);
      });
    },

    pointerMove() {
      hovered = pickSq();
      const p = hovered >= 0 ? gs.b[hovered] : null;
      const clickable = !thinking && !over && gs.turn === 'w' && hovered >= 0 && ((p && isWhite(p)) || targets.some((m) => m.to === hovered));
      c.setCursor(clickable ? 'pointer' : 'default');
    },

    pointerDown() {
      if (thinking || over || gs.turn !== 'w' || tw.busy) return;
      const sq = pickSq();
      if (sq < 0) return;
      const move = targets.find((m) => m.to === sq);
      if (move) { play(move, aiMove); return; }
      const p = gs.b[sq];
      if (p && isWhite(p)) {
        selected = sq;
        targets = legalMoves(gs).filter((m) => m.from === sq);
        showTargets();
        if (!targets.length) say('Esa pieza no puede moverse ahora');
        else say(statusText());
      } else {
        selected = -1; targets = []; clearMarkers();
      }
    },
  };
}

/* ────────────────────────────────────────────────────
   LUMBRE — póster de mi juego: capturas, descripción y enlaces.
──────────────────────────────────────────────────── */
const LUMBRE_SHOTS = [
  { src: 'public/images/projects/lumbre/lumbre-01.webp', aspect: 2.446 },
  { src: 'public/images/projects/lumbre/lumbre-02.webp', aspect: 1.804 },
  { src: 'public/images/projects/lumbre/lumbre-03.webp', aspect: 1.804 },
  { src: 'public/images/projects/lumbre/lumbre-04.webp', aspect: 1.804 },
];

function lumbreStation(c) {
  const { root, refs, hud } = c;
  const { img } = refs.poster;
  const PW = 1.1;
  const textures = [refs.poster.shot];
  let current = 0;

  function show(i) {
    current = i;
    const { src, aspect } = LUMBRE_SHOTS[i];
    if (!textures[i]) {
      const t = new THREE.TextureLoader().load(src);
      t.colorSpace = THREE.SRGBColorSpace;
      textures[i] = t;
    }
    img.material.map = textures[i];
    img.material.emissiveMap = textures[i];
    img.material.needsUpdate = true;
    img.scale.y = (PW / aspect) / (PW / LUMBRE_SHOTS[0].aspect);
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 2.55, 0)), zoom: 6.5, shift: 0.15 }),

    enter() {
      const ct = c.content;
      hud.show({
        icon: '🕯️',
        title: 'Lumbre',
        tabs: LUMBRE_SHOTS.map((_, i) => ({ id: String(i), label: `${i + 1}` })),
        active: '0',
        onTab: (id) => show(Number(id)),
        actions: [
          { id: 'play', label: '▶ Jugar en itch.io', onClick: () => window.open(ct.liveUrl, '_blank', 'noopener') },
          { id: 'code', label: '</> Código', onClick: () => window.open(ct.repoUrl, '_blank', 'noopener') },
        ],
        hint: 'Cambia de captura con los números',
        onBack: c.leave,
      });
      const card = el('div', 'gam-card');
      card.innerHTML = `
        <h3 class="gam-card__title">🕯️ ${esc(L(ct.title) || 'Lumbre')}</h3>
        <p class="gam-card__text">${esc(L(ct.message))}</p>
        <div class="gam-card__chips">${(ct.tags || []).map(t => `<span class="gam-card__chip">${esc(t)}</span>`).join('')}</div>`;
      hud.setCard(card);
      show(0);
    },

    exit() { show(0); },

    update() {},

    key(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= LUMBRE_SHOTS.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        show(n - 1);
        return true;
      }
      return false;
    },
  };
}

const FACTORIES = {
  piano: pianoStation,
  desk: deskStation,
  bookshelf: bookshelfStation,
  window: windowStation,
  skateboard: skateStation,
  juggling: jugglingStation,
  pukis: pukisStation,
  chess: chessStation,
  lumbre: lumbreStation,
};

/**
 * base: { scene, overlay, camera, container, hud, env, reducedMotion, pick, setOutline,
 *         setCursor, setLabel, leave, hotspotFor(id) }
 * objects: Map(id → { root, refs, parts, f })
 */
export function createStations(base, objects) {
  const glyphs = createEmitter(base.overlay);
  const stations = new Map();
  for (const [id, factory] of Object.entries(FACTORIES)) {
    const o = objects.get(id);
    if (!o) continue;
    stations.set(id, factory({ ...base, ...o, glyphs, content: base.hotspotFor(id) || {} }));
  }
  return {
    stations,
    updateGlyphs: (dt) => glyphs.update(dt),
    dispose: () => glyphs.dispose(),
  };
}
