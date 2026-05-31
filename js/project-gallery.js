import { ProjectDetail } from './project-detail.js';

const MODE_EMOJI = { dev: '⚙️', ia: '🤖', sec: '🔒' };

export const ProjectGallery = (() => {
  let _el        = null;
  let _images    = [];
  let _idx       = 0;
  let _p         = null;
  let _mode      = 'dev';
  let _prevFocus = null;
  let _keyHandler = null;
  let _touchStartX = 0;

  /* ── DOM injection ── */
  function _inject() {
    _el = document.createElement('div');
    _el.id = 'pgal';
    _el.setAttribute('aria-hidden', 'true');
    _el.setAttribute('role', 'dialog');
    _el.setAttribute('aria-modal', 'true');
    _el.setAttribute('aria-labelledby', 'pgal-title');

    _el.innerHTML = `
      <div class="pgal__header">
        <span class="pgal__title" id="pgal-title"></span>
        <span class="pgal__counter" id="pgal-counter"></span>
        <button class="pgal__close" id="pgal-close" aria-label="Cerrar galería">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="pgal__body">
        <div class="pgal__left">
          <div class="pgal__main">
            <button class="pgal__arrow pgal__arrow--prev" id="pgal-prev" aria-label="Imagen anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div class="pgal__img-wrap">
              <img class="pgal__img" id="pgal-img" src="" alt="" />
              <div class="pgal__placeholder" id="pgal-placeholder" aria-hidden="true"></div>
            </div>
            <button class="pgal__arrow pgal__arrow--next" id="pgal-next" aria-label="Imagen siguiente">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div class="pgal__filmstrip" id="pgal-filmstrip" role="tablist" aria-label="Miniaturas del proyecto"></div>
        </div>
        <div class="pgal__info" id="pgal-info"></div>
      </div>
    `;

    document.body.appendChild(_el);

    document.getElementById('pgal-close').addEventListener('click', close);
    document.getElementById('pgal-prev').addEventListener('click', _prev);
    document.getElementById('pgal-next').addEventListener('click', _next);

    _el.addEventListener('touchstart', e => {
      _touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    _el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _touchStartX;
      if (Math.abs(dx) > 50) dx < 0 ? _next() : _prev();
    }, { passive: true });

    window.addEventListener('portfolio:modeChange', close);
  }

  /* ── Filmstrip ── */
  function _renderFilmstrip() {
    const strip = document.getElementById('pgal-filmstrip');
    if (_images.length <= 1) { strip.innerHTML = ''; return; }

    strip.innerHTML = _images.map((src, i) => `
      <button class="pgal__thumb" role="tab" data-idx="${i}"
              aria-label="Imagen ${i + 1}" aria-selected="false" type="button">
        <img src="${src}" alt="Miniatura ${i + 1}" loading="lazy"
             onerror="this.closest('.pgal__thumb').classList.add('pgal__thumb--error')" />
      </button>
    `).join('');

    strip.querySelectorAll('.pgal__thumb').forEach(btn => {
      btn.addEventListener('click', () => _goTo(parseInt(btn.dataset.idx, 10)));
    });
  }

  /* ── Navigate to index ── */
  function _goTo(idx) {
    const img = document.getElementById('pgal-img');
    const ph  = document.getElementById('pgal-placeholder');

    if (_images.length === 0) {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      ph.textContent    = MODE_EMOJI[_mode] || '📁';
      document.getElementById('pgal-counter').textContent = '';
      return;
    }

    _idx = Math.max(0, Math.min(idx, _images.length - 1));
    const src = _images[_idx];

    img.style.display = '';
    ph.style.display  = 'none';
    img.alt           = `${_p?.title || ''} — imagen ${_idx + 1}`;
    img.src           = src;
    img.onerror       = () => {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      ph.textContent    = MODE_EMOJI[_mode] || '📁';
    };

    document.getElementById('pgal-counter').textContent =
      _images.length > 1 ? `${_idx + 1} / ${_images.length}` : '';

    /* Filmstrip active state */
    const strip = document.getElementById('pgal-filmstrip');
    strip.querySelectorAll('.pgal__thumb').forEach((btn, i) => {
      const active = i === _idx;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    strip.querySelector('.pgal__thumb.is-active')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    /* Arrow disabled states */
    const prevBtn = document.getElementById('pgal-prev');
    const nextBtn = document.getElementById('pgal-next');
    if (prevBtn) prevBtn.disabled = _idx === 0;
    if (nextBtn) nextBtn.disabled = _idx === _images.length - 1;
  }

  function _prev() { _goTo(_idx - 1); }
  function _next() { _goTo(_idx + 1); }

  /* ── Phase toggles (same accordion logic as project-detail.js) ── */
  function _attachPhaseToggles() {
    const info = document.getElementById('pgal-info');
    if (!info) return;

    info.querySelectorAll('.pdm-phase__header').forEach((header, i) => {
      const phase = header.closest('.pdm-phase');

      header.addEventListener('click', () => {
        const isOpen = phase.classList.contains('is-expanded');
        info.querySelectorAll('.pdm-phase.is-expanded').forEach(ph => {
          ph.classList.remove('is-expanded');
          ph.querySelector('.pdm-phase__header')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          phase.classList.add('is-expanded');
          header.setAttribute('aria-expanded', 'true');
        }
      });

      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });

      if (i === 0) {
        phase.classList.add('is-expanded');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ── Open ── */
  function open(p, mode, startIndex = 0) {
    _p    = p;
    _mode = mode;
    _images = Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p.image ? [p.image] : []);

    if (!_el) _inject();

    _prevFocus = document.activeElement;

    document.getElementById('pgal-title').textContent = p.title || '';

    document.getElementById('pgal-info').innerHTML = ProjectDetail.buildContent(p, mode);
    _attachPhaseToggles();

    _renderFilmstrip();
    _el.dataset.count = _images.length;

    _el.setAttribute('aria-hidden', 'false');
    _el.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    _keyHandler = e => {
      if (!_el.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); _prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); _next(); }
      if (e.key === 'Escape')     close();
    };
    document.addEventListener('keydown', _keyHandler);

    _goTo(startIndex);
    setTimeout(() => document.getElementById('pgal-close')?.focus(), 50);
  }

  /* ── Close ── */
  function close() {
    if (!_el || !_el.classList.contains('is-open')) return;
    _el.classList.remove('is-open');
    _el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
    _prevFocus?.focus();
  }

  return { open, close };
})();
