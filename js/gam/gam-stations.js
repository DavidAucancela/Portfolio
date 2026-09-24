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
 *   bed         → anochece / amanece (luces, cielo de la ventana, Zzz)
 *   skateboard  → se despega de la pared: arrastrar para girarla en 3D + trucos
 *   juggling    → cascada de 3 pelotas + reto de atrapar en la zona
 *   reading     → el libro se abre y pasa páginas solo
 *   pukis       → acariciarlo: corazones, cola, orejas
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

  const keyWorld = (i) => root.localToWorld(V(-0.56 + i * 0.16, 0.92, 0.36));

  function flash(i) {
    press[i] = 1;
    c.glyphs.emit(i % 2 ? '♫' : '♪', tones[i], keyWorld(i), { rise: 0.75, drift: 0.18, size: 0.26 });
  }

  function pickKey() {
    const hit = c.pick(keys);
    return hit ? keys.indexOf(hit.object) : -1;
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 0.9, 0.35)), zoom: 4.2 }),

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
        hint: 'Haz clic en las teclas · o usa A S D F G H J K',
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
   BED — anochece / amanece: luces, cielo de la ventana, Zzz.
──────────────────────────────────────────────────── */
function bedStation(c) {
  const { root, refs, hud, env } = c;
  let zzzT = 0;
  let target = 1; // 1 = noche, 0 = día

  function goTo(t) {
    target = t;
    hud.setAction('toggle', { disabled: true });
    hud.setStatus(t === 1 ? 'Anocheciendo… 🌙' : 'Amaneciendo… ☀️');
    env.animateTo(t, 4200, () => {
      hud.setStatus(t === 1 ? 'Buenas noches, David 💤' : '¡Buenos días! ☀️ A seguir construyendo');
      hud.setAction('toggle', { disabled: false, label: t === 1 ? '☀️ Despertar' : '🌙 A dormir' });
    });
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0, 0.5, 0)), zoom: 2.5 }),

    enter() {
      hud.show({
        icon: '🛏️',
        title: 'Cama',
        actions: [{ id: 'toggle', label: '☀️ Despertar', onClick: () => goTo(target === 1 ? 0 : 1) }],
        hint: 'Este cuarto también es un cuarto de verdad — acá descansa David entre proyecto y proyecto',
        onBack: c.leave,
      });
      // desde el atardecer (o de día) anochece solo; si ya era de noche, amanece
      goTo(env.t > 0.75 ? 0 : 1);
    },

    exit() { /* el momento del día se queda como el jugador lo dejó */ },

    update(now, dt) {
      const night = env.t > 0.6;
      // la manta respira cuando se duerme
      refs.blanket.scale.y = 1 + (night ? Math.sin(now * 0.0021) * 0.05 : 0);
      zzzT -= dt;
      if (night && zzzT <= 0) {
        zzzT = 1.1;
        c.glyphs.emit('z', '#a5b4ff', root.localToWorld(V(0, 0.75, -0.7)), { size: 0.22 + Math.random() * 0.14, rise: 0.75, drift: 0.15, life: 2.4 });
      }
    },
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
  const SHOW = { pos: V(-0.55, 1.9, 1.7), rotX: Math.PI / 2 }; // libre en el aire, lejos de la pared y la terminal
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
    focus: () => ({ look: root.localToWorld(SHOW.pos.clone()), zoom: 3.0 }),

    enter() {
      active = true;
      hud.show({
        icon: '🛹',
        title: 'Patineta',
        actions: [
          { id: 'kickflip', label: 'Kickflip', onClick: () => doTrick('kickflip') },
          { id: 'shove', label: 'Shove-it', onClick: () => doTrick('shove') },
          { id: 'reset', label: '↺ Reiniciar', onClick: () => { if (!trick) tw.add(500, (() => { const a = holder.rotation.clone(); return (p) => { holder.rotation.set(lerp(a.x, 0, ease(p)), lerp(a.y, 0, ease(p)), 0); }; })()); } },
        ],
        hint: 'Arrastra para girarla en 3D · prueba un truco',
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
        holder.rotation.y += vel.x * dt * 60 + (now > idleAt ? dt * 0.7 : 0);
        holder.rotation.x = clamp(holder.rotation.x + vel.y * dt * 60, -1.2, 1.2);
        vel.x *= 0.92; vel.y *= 0.92;
        if (now > idleAt) holder.rotation.x += (0.12 - holder.rotation.x) * Math.min(1, dt * 1.5);
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
   JUGGLING — cascada de 3 pelotas + reto de atrapar en la zona.
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
      hud.setStatus('Cascada de 3 pelotas tejidas a mano 🧶');
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
        hint: 'Las 3 pelotas las tejió David a mano cuando le enseñaron a hacer malabares',
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
          const phi = (t / P + i / 3) % 1;
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
   READING — el libro se abre y pasa las páginas solo.
──────────────────────────────────────────────────── */
function readingStation(c) {
  const { root, refs, hud } = c;
  const { group: book, flip } = refs.book;
  const tw = createTweens(c.reducedMotion);
  const REST = { y: 0.5, rx: -0.2, s: 1 };
  const UP = { y: 1.0, rx: 0.55, s: 2.6 }; // se levanta, se agranda y se inclina hacia la cámara
  let active = false;
  let flipping = false;
  let flipped = false;
  let flipAt = 0;
  let sparkT = 0;

  function moveBook(to, ms, done) {
    const y0 = book.position.y;
    const r0 = book.rotation.x;
    const s0 = book.scale.x;
    tw.add(ms, (p) => {
      const e = ease(p);
      book.position.y = lerp(y0, to.y, e);
      book.rotation.x = lerp(r0, to.rx, e);
      book.scale.setScalar(lerp(s0, to.s, e));
    }, done);
  }

  function flipPage() {
    if (flipping || !active) return;
    flipping = true;
    const from = flipped ? Math.PI : 0;
    const to = flipped ? 0 : Math.PI;
    envelope(getAudioContext(), { freq: 700, type: 'sine', duration: 0.05, gain: 0.03 });
    tw.add(750, (p) => {
      const e = ease(p);
      flip.rotation.z = lerp(from, to, e);
      flip.position.y = 0.024 + Math.sin(Math.PI * p) * 0.01;
    }, () => { flipped = !flipped; flipping = false; });
  }

  return {
    focus: () => ({ look: root.localToWorld(V(0.02, 0.85, 0.1)), zoom: 3.2, shift: 0.28 }),

    enter() {
      active = true;
      hud.show({
        icon: '📖',
        title: 'Rincón de lectura',
        actions: [{ id: 'flip', label: 'Pasar página ↷', onClick: flipPage }],
        hint: 'El libro se abre solo · o pasa las páginas tú',
        onBack: c.leave,
      });
      const card = el('div', 'gam-card');
      card.innerHTML = `
        <h3 class="gam-card__title">📖 ${esc(L(c.content.title) || 'Rincón de lectura')}</h3>
        <p class="gam-card__text">${esc(L(c.content.message))}</p>
        <p class="gam-card__hint">Aquí irán los libros favoritos de David.</p>`;
      hud.setCard(card);
      moveBook(UP, 900);
      flipAt = performance.now() + 1400;
    },

    exit() {
      active = false;
      tw.clear();
      flipping = false;
      const f0 = flip.rotation.z;
      tw.add(500, (p) => { flip.rotation.z = lerp(f0, 0, ease(p)); flip.position.y = 0.024; });
      flipped = false;
      moveBook(REST, 700);
    },

    busy: () => tw.busy,

    update(now, dt) {
      tw.update(now);
      if (!active) return;
      if (!tw.busy) book.position.y = UP.y + Math.sin(now * 0.002) * 0.02; // flota apenas
      if (now > flipAt && !flipping) { flipPage(); flipAt = now + 2600; }
      sparkT -= dt;
      if (sparkT <= 0) {
        sparkT = 0.7;
        c.glyphs.emit('✦', '#ffd580', book.localToWorld(V((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.15)), { size: 0.16, rise: 0.4, life: 1.8 });
      }
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
    focus: () => ({ look: root.localToWorld(V(0, 0.3, 0.05)), zoom: 3.6 }),

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

const FACTORIES = {
  piano: pianoStation,
  desk: deskStation,
  bookshelf: bookshelfStation,
  bed: bedStation,
  skateboard: skateStation,
  juggling: jugglingStation,
  reading: readingStation,
  pukis: pukisStation,
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
