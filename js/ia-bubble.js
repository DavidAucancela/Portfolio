/**
 * ia-bubble.js — Globo de diálogo efímero de JotAI
 * Componente reutilizable: cola FIFO, typewriter, dismiss y auto-timeout.
 * Se ancla al trigger del widget (instancia única, dentro de #jotai-widget).
 *
 * API:
 *   IaBubble.init(container, hooks)  — hooks: { onTalkStart, onTalkEnd(mood) }
 *   IaBubble.say(text, { duration, persist, mood, replace, onHidden })
 *   IaBubble.dismiss()  · IaBubble.clear()  · IaBubble.isVisible()
 */

const TYPEWRITER_MS    = 16;    // ms por carácter
const DEFAULT_DURATION = 4500;  // ms visible tras terminar de escribir
const QUEUE_MAX        = 3;     // globos máximos en espera

export const IaBubble = (() => {
  let _root      = null;
  let _textEl    = null;
  let _srEl      = null;
  let _queue     = [];
  let _current   = null;
  let _typing    = false;
  let _typeTimer = null;
  let _hideTimer = null;
  let _reduced   = false;
  let _hooks     = {};

  /* ── INIT ───────────────────────────────────────────────────── */

  function init(container, hooks = {}) {
    if (_root) return;
    _hooks   = hooks;
    _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _root = document.createElement('div');
    _root.id = 'jotai-bubble';
    _root.hidden = true;
    _root.setAttribute('role', 'status');
    _root.innerHTML = `
      <span class="jotai-bubble__sr" aria-live="polite"></span>
      <span class="jotai-bubble__text" aria-hidden="true"></span>
      <button class="jotai-bubble__close" type="button" aria-label="Cerrar mensaje">✕</button>
    `;

    // Antes del trigger → en el flex column queda encima del avatar
    const trigger = container.querySelector('#jotai-trigger');
    container.insertBefore(_root, trigger);

    _textEl = _root.querySelector('.jotai-bubble__text');
    _srEl   = _root.querySelector('.jotai-bubble__sr');

    _root.querySelector('.jotai-bubble__close')
      .addEventListener('click', e => { e.stopPropagation(); dismiss(); });

    // Clic fuera del globo → dismiss
    document.addEventListener('pointerdown', e => {
      if (_root.hidden || _root.contains(e.target)) return;
      dismiss();
    });
  }

  /* ── API ────────────────────────────────────────────────────── */

  function say(text, opts = {}) {
    if (!_root || !text) return false;

    const item = {
      text:     String(text),
      duration: opts.duration ?? DEFAULT_DURATION,
      persist:  !!opts.persist,
      mood:     opts.mood || null,
      onHidden: typeof opts.onHidden === 'function' ? opts.onHidden : null,
    };

    if (opts.replace) {
      _queue = [];
      _stopCurrent();
      const old = _current;
      _current = null;
      old?.onHidden?.(); // el globo reemplazado también notifica su cierre
      _show(item);
      return true;
    }

    if (_current) {
      if (_queue.length >= QUEUE_MAX) return false;
      _queue.push(item);
    } else {
      _show(item);
    }
    return true;
  }

  function dismiss() {
    if (!_current) return;
    _stopCurrent();
    _hide();
  }

  function clear() {
    _queue = [];
    dismiss();
  }

  function isVisible() {
    return !!_current;
  }

  /* ── SHOW / HIDE ────────────────────────────────────────────── */

  function _show(item) {
    _current = item;
    clearTimeout(_hideTimer);

    _root.hidden       = false;
    _textEl.textContent = '';
    _srEl.textContent   = item.text; // lectores de pantalla: texto completo de una vez
    requestAnimationFrame(() => _root.classList.add('is-visible'));

    _hooks.onTalkStart?.();

    const done = () => {
      _typing = false;
      _textEl.classList.remove('is-typing');
      _hooks.onTalkEnd?.(item.mood);
      if (!item.persist) {
        _hideTimer = setTimeout(dismiss, item.duration);
      }
    };

    if (_reduced) {
      _textEl.textContent = item.text;
      done();
      return;
    }

    _typing = true;
    _textEl.classList.add('is-typing');
    let i = 0;
    _typeTimer = setInterval(() => {
      if (i >= item.text.length) {
        clearInterval(_typeTimer);
        _typeTimer = null;
        done();
        return;
      }
      _textEl.textContent = item.text.slice(0, ++i);
    }, TYPEWRITER_MS);
  }

  /* Detiene typewriter/timers del globo actual sin ocultarlo */
  function _stopCurrent() {
    clearInterval(_typeTimer);
    clearTimeout(_hideTimer);
    _typeTimer = null;
    if (_typing) {
      _typing = false;
      _textEl.classList.remove('is-typing');
      _hooks.onTalkEnd?.(null); // interrumpido → vuelve a idle
    }
  }

  function _hide() {
    const item = _current;
    _current = null;
    _root.classList.remove('is-visible');
    const finish = () => {
      item?.onHidden?.();
      if (_current) return; // ya hay otro globo mostrándose
      _root.hidden = true;
      _next();
    };
    _reduced ? finish() : setTimeout(finish, 240);
  }

  function _next() {
    if (!_queue.length || _current) return;
    const item = _queue.shift();
    setTimeout(() => { if (!_current) _show(item); }, 250);
  }

  return { init, say, dismiss, clear, isVisible };
})();
