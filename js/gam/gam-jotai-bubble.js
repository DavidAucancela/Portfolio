/**
 * gam-jotai-bubble.js — globo de diálogo de JotAI dentro del cuarto de .gam.
 *
 * DOM (no 3D): texto nítido y estilo del sitio, mismo patrón que la etiqueta
 * `.gam-label` de gam-three-scene.js — se proyecta cada frame sobre la cabeza
 * del personaje. Typewriter a 16 ms/carácter como ia-bubble.js; el texto que
 * falta se reserva invisible (`__ghost`) para que el globo no cambie de
 * tamaño mientras escribe. El texto completo va además a un `role="status"`
 * oculto para lectores de pantalla (el visible es `aria-hidden`).
 * Estilos: `.gam-jotai-bubble*` en css/gam-tv.css.
 */
const CHAR_MS = 16;

export function createJotaiBubble(container, { reducedMotion = false } = {}) {
  const el = document.createElement('div');
  el.className = 'gam-jotai-bubble';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="gam-jotai-bubble__text"></span><span class="gam-jotai-bubble__caret"></span><span class="gam-jotai-bubble__ghost"></span>';
  const shownEl = el.querySelector('.gam-jotai-bubble__text');
  const ghostEl = el.querySelector('.gam-jotai-bubble__ghost');
  const sr = document.createElement('p');
  sr.className = 'gam-jotai-bubble__sr';
  sr.setAttribute('role', 'status');
  sr.setAttribute('aria-live', 'polite');
  container.append(el, sr);

  let text = '';
  let shown = 0;
  let t0 = 0;
  let hideAt = 0;
  let visible = false;

  function render(n) {
    shown = n;
    shownEl.textContent = text.slice(0, n);
    ghostEl.textContent = text.slice(n);
    el.classList.toggle('is-typing', n < text.length);
  }

  function say(t, { duration = 3500 } = {}) {
    text = String(t || '');
    t0 = performance.now();
    hideAt = t0 + (reducedMotion ? 0 : text.length * CHAR_MS) + duration;
    render(reducedMotion ? text.length : 0);
    visible = true;
    el.classList.add('is-visible');
    sr.textContent = text;
  }

  function hide() {
    if (!visible) return;
    visible = false;
    el.classList.remove('is-visible', 'is-typing');
  }

  /** anchor: Vector3 de mundo (se proyecta EN SITIO — pasar uno descartable). */
  function update(now, camera, anchor, w, h) {
    if (!visible) return;
    if (now > hideAt) { hide(); return; }
    if (shown < text.length) {
      const n = Math.min(text.length, Math.floor((now - t0) / CHAR_MS));
      if (n !== shown) render(n);
    }
    anchor.project(camera);
    const px = (anchor.x * 0.5 + 0.5) * w;
    const py = (-anchor.y * 0.5 + 0.5) * h;
    // que no se salga por los costados; la colita sigue apuntando a la cabeza
    const half = el.offsetWidth / 2;
    const cx = Math.min(w - half - 8, Math.max(half + 8, px));
    el.style.setProperty('--tail-x', `${(px - cx + half).toFixed(0)}px`);
    el.style.transform = `translate(${cx.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, calc(-100% - 12px))`;
  }

  return {
    say,
    hide,
    update,
    get typing() { return visible && shown < text.length; },
    get visible() { return visible; },
    destroy() { el.remove(); sr.remove(); },
  };
}
