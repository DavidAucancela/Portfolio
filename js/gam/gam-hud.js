/**
 * gam-hud.js — HUD DOM de las estaciones de .gam (Three.js).
 *
 * Al hacer click en un objeto del cuarto la cámara hace zoom y el objeto se
 * vuelve interactivo DENTRO de la escena (ya no se abre un panel modal). Este
 * módulo dibuja lo que acompaña a esa interacción, encima del canvas:
 *  - barra superior: título, pestañas (ej. Libre/Reto del piano), acciones
 *    (botones) y "← Volver · Esc"
 *  - línea de estado (puntaje, mensajes)
 *  - tarjeta lateral (desktop) / inferior (portrait) con info del objeto
 *  - pines: puntitos sobre partes del objeto con un tooltip al pasar el mouse
 *  - hint de controles
 *
 * No sabe nada de Three.js salvo `updatePins(camera, …)`, que proyecta
 * posiciones de mundo a pantalla. Los estilos viven en css/gam-tv.css
 * (`.gam-hud*`).
 */
export function createHud(container) {
  const root = document.createElement('div');
  root.className = 'gam-hud';
  root.hidden = true;
  root.innerHTML = `
    <div class="gam-hud__bar">
      <div class="gam-hud__title"><span class="gam-hud__icon" aria-hidden="true"></span><span class="gam-hud__name"></span></div>
      <div class="gam-hud__tabs" role="tablist"></div>
      <div class="gam-hud__actions"></div>
      <button type="button" class="gam-hud__back">← Volver <kbd>Esc</kbd></button>
    </div>
    <p class="gam-hud__status" role="status" aria-live="polite"></p>
    <aside class="gam-hud__card" hidden></aside>
    <div class="gam-hud__pins"></div>
    <p class="gam-hud__hint"></p>
  `;
  container.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const iconEl = $('.gam-hud__icon');
  const nameEl = $('.gam-hud__name');
  const tabsEl = $('.gam-hud__tabs');
  const actionsEl = $('.gam-hud__actions');
  const statusEl = $('.gam-hud__status');
  const cardEl = $('.gam-hud__card');
  const pinsEl = $('.gam-hud__pins');
  const hintEl = $('.gam-hud__hint');
  const backBtn = $('.gam-hud__back');

  let onBackCb = null;
  let onTabCb = null;
  let pins = []; // { pos: Vector3, el }
  const projected = { x: 0, y: 0 };

  backBtn.addEventListener('click', () => onBackCb?.());

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.gam-hud__tab');
    if (!btn) return;
    tabsEl.querySelectorAll('.gam-hud__tab').forEach(t => {
      t.classList.toggle('is-active', t === btn);
      t.setAttribute('aria-selected', String(t === btn));
    });
    onTabCb?.(btn.dataset.id);
  });

  actionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.gam-hud__btn');
    if (!btn || btn.disabled) return;
    actionHandlers.get(btn.dataset.id)?.();
  });
  const actionHandlers = new Map();

  function clearPins() {
    pins.forEach(p => p.el.remove());
    pins = [];
  }

  /** cfg: { icon, title, tabs?, active?, onTab?, actions?, hint?, status?, onBack } */
  function show(cfg) {
    iconEl.textContent = cfg.icon || '';
    nameEl.textContent = cfg.title || '';
    onBackCb = cfg.onBack || null;
    onTabCb = cfg.onTab || null;

    tabsEl.textContent = '';
    (cfg.tabs || []).forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gam-hud__tab' + (t.id === cfg.active ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(t.id === cfg.active));
      btn.dataset.id = t.id;
      btn.textContent = t.label;
      tabsEl.appendChild(btn);
    });
    tabsEl.hidden = !(cfg.tabs && cfg.tabs.length);

    actionHandlers.clear();
    actionsEl.innerHTML = '';
    (cfg.actions || []).forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gam-hud__btn';
      btn.dataset.id = a.id;
      btn.textContent = a.label;
      btn.hidden = !!a.hidden;
      actionsEl.appendChild(btn);
      actionHandlers.set(a.id, a.onClick);
    });
    actionsEl.hidden = !(cfg.actions && cfg.actions.length);

    statusEl.innerHTML = cfg.status || '';
    hintEl.textContent = cfg.hint || '';
    setCard(null);
    clearPins();
    root.hidden = false;
    // un frame después: dispara la animación de entrada
    requestAnimationFrame(() => root.classList.add('is-visible'));
  }

  function hide() {
    root.classList.remove('is-visible');
    root.hidden = true;
    onBackCb = null;
    onTabCb = null;
    actionHandlers.clear();
    setCard(null);
    clearPins();
  }

  /** patch: { label?, hidden?, disabled? } */
  function setAction(id, patch) {
    const btn = actionsEl.querySelector(`.gam-hud__btn[data-id="${id}"]`);
    if (!btn) return;
    if (patch.label !== undefined) btn.textContent = patch.label;
    if (patch.hidden !== undefined) btn.hidden = patch.hidden;
    if (patch.disabled !== undefined) btn.disabled = patch.disabled;
  }

  function setStatus(html) { statusEl.innerHTML = html || ''; }
  function setHint(text) { hintEl.textContent = text || ''; }

  /** node: HTMLElement | null */
  function setCard(node) {
    cardEl.innerHTML = '';
    if (node) cardEl.appendChild(node);
    cardEl.hidden = !node;
    cardEl.scrollTop = 0;
  }

  /** list: [{ pos: THREE.Vector3 (mundo), text }] */
  function setPins(list) {
    clearPins();
    pins = list.map(({ pos, text }) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gam-hud__pin';
      el.setAttribute('aria-label', text);
      el.innerHTML = `<span class="gam-hud__pin-dot"></span><span class="gam-hud__pin-tip">${text}</span>`;
      pinsEl.appendChild(el);
      return { pos, el };
    });
  }

  /** Proyecta los pines a pantalla — llamar una vez por frame mientras hay estación. */
  function updatePins(camera, width, height) {
    if (!pins.length) return;
    for (const p of pins) {
      const v = p.pos.clone().project(camera);
      projected.x = (v.x * 0.5 + 0.5) * width;
      projected.y = (-v.y * 0.5 + 0.5) * height;
      p.el.style.transform = `translate(${projected.x.toFixed(1)}px, ${projected.y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  function destroy() { root.remove(); }

  return { show, hide, setAction, setStatus, setHint, setCard, setPins, updatePins, destroy, el: root };
}
