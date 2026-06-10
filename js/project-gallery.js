import { ProjectDetail } from './project-detail.js';

const MODE_EMOJI = { dev: '⚙️', ia: '🤖', sec: '🔒' };

function _buildPgalPlaceholder(p) {
  const esc  = s => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const title = esc(p?.title);
  const desc  = esc(p?.description);
  const tags  = (p?.tags || []).slice(0, 5).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  return `
    <span class="pgal-ph__bg-text">${title}</span>
    <div class="pgal-ph__content">
      <h2 class="pgal-ph__title">${title}</h2>
      ${desc ? `<p class="pgal-ph__desc">${desc}</p>` : ''}
      ${tags ? `<div class="pgal-ph__tags">${tags}</div>` : ''}
    </div>
  `;
}

/* Encode each path segment to handle spaces and accented chars (é, ú, ñ…) */
function _src(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

export const ProjectGallery = (() => {
  let _el        = null;
  let _images    = [];
  let _docs      = [];
  let _idx       = 0;
  let _p         = null;
  let _mode      = 'dev';
  let _prevFocus = null;
  let _keyHandler = null;
  let _touchStartX = 0;

  function _isDocsMode() {
    return _mode === 'sec' && _docs.length > 0;
  }

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
            <button class="pgal__arrow pgal__arrow--prev" id="pgal-prev" aria-label="Anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div class="pgal__img-wrap">
              <img class="pgal__img" id="pgal-img" src="" alt="" />
              <div class="pgal__placeholder" id="pgal-placeholder" aria-hidden="true"></div>
              <iframe class="pgal__pdf" id="pgal-pdf" src="" title="Documento PDF" loading="lazy"></iframe>
            </div>
            <button class="pgal__arrow pgal__arrow--next" id="pgal-next" aria-label="Siguiente">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div class="pgal__filmstrip" id="pgal-filmstrip" role="tablist" aria-label="Documentos del proyecto"></div>
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

    // Intercept doc-link clicks in the info panel → navigate gallery (docs mode only)
    document.getElementById('pgal-info').addEventListener('click', e => {
      const link = e.target.closest('.pdm__doc-link');
      if (!link || !_isDocsMode()) return;
      e.preventDefault();
      const idx = parseInt(link.dataset.docIndex, 10);
      if (!isNaN(idx)) _goTo(idx);
    });
  }

  /* ── Filmstrip (image mode) ── */
  function _renderFilmstrip() {
    const strip = document.getElementById('pgal-filmstrip');
    if (_images.length <= 1) { strip.innerHTML = ''; return; }

    strip.innerHTML = _images.map((src, i) => `
      <button class="pgal__thumb" role="tab" data-idx="${i}"
              aria-label="Imagen ${i + 1}" aria-selected="false" type="button">
        <img src="${_src(src)}" alt="Miniatura ${i + 1}" loading="lazy"
             onerror="this.closest('.pgal__thumb').classList.add('pgal__thumb--error')" />
      </button>
    `).join('');

    strip.querySelectorAll('.pgal__thumb').forEach(btn => {
      btn.addEventListener('click', () => _goTo(parseInt(btn.dataset.idx, 10)));
    });
  }

  /* ── Doc tabs (sec mode with docs) ── */
  function _renderDocTabs() {
    const strip = document.getElementById('pgal-filmstrip');
    if (_docs.length <= 1) { strip.innerHTML = ''; return; }

    strip.innerHTML = _docs.map((doc, i) => `
      <button class="pgal__thumb pgal__doc-tab" role="tab" data-idx="${i}"
              aria-label="${doc.label}" aria-selected="false" type="button">
        <span>${doc.label}</span>
      </button>
    `).join('');

    strip.querySelectorAll('.pgal__doc-tab').forEach(btn => {
      btn.addEventListener('click', () => _goTo(parseInt(btn.dataset.idx, 10)));
    });
  }

  /* ── Navigate to index ── */
  function _goTo(idx) {
    const img = document.getElementById('pgal-img');
    const ph  = document.getElementById('pgal-placeholder');
    const pdf = document.getElementById('pgal-pdf');

    if (_isDocsMode()) {
      _idx = Math.max(0, Math.min(idx, _docs.length - 1));
      const doc = _docs[_idx];

      img.style.display = 'none';
      ph.style.display  = 'none';
      pdf.style.display = 'block';
      pdf.src = _src(doc.url);

      document.getElementById('pgal-counter').textContent =
        _docs.length > 1 ? `${_idx + 1} / ${_docs.length}` : '';

      const strip = document.getElementById('pgal-filmstrip');
      strip.querySelectorAll('.pgal__doc-tab').forEach((btn, i) => {
        const active = i === _idx;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      strip.querySelector('.pgal__doc-tab.is-active')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

      const prevBtn = document.getElementById('pgal-prev');
      const nextBtn = document.getElementById('pgal-next');
      if (prevBtn) prevBtn.disabled = _idx === 0;
      if (nextBtn) nextBtn.disabled = _idx === _docs.length - 1;
      return;
    }

    /* Image mode */
    pdf.style.display = 'none';

    if (_images.length === 0) {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      ph.innerHTML      = _buildPgalPlaceholder(_p);
      document.getElementById('pgal-counter').textContent = '';
      return;
    }

    _idx = Math.max(0, Math.min(idx, _images.length - 1));
    const src = _images[_idx];

    img.onerror = () => {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      ph.innerHTML      = _buildPgalPlaceholder(_p);
    };
    img.style.display = '';
    ph.style.display  = 'none';
    img.alt           = `${_p?.title || ''} — imagen ${_idx + 1}`;
    img.src           = _src(src);

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
    _docs = (mode === 'sec' && Array.isArray(p.docs) && p.docs.length > 0) ? p.docs : [];
    _images = _isDocsMode()
      ? []
      : (Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : (p.image ? [p.image] : []));

    if (!_el) _inject();

    _prevFocus = document.activeElement;

    document.getElementById('pgal-title').textContent = p.title || '';

    document.getElementById('pgal-info').innerHTML = ProjectDetail.buildContent(p, mode);
    _attachPhaseToggles();

    if (_isDocsMode()) {
      _renderDocTabs();
      _el.dataset.count = _docs.length;
      _el.classList.add('pgal--docs-mode');
    } else {
      _renderFilmstrip();
      _el.dataset.count = _images.length;
      _el.classList.remove('pgal--docs-mode');
    }

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

    window.dispatchEvent(new CustomEvent('portfolio:projectOpen', {
      detail: { project: p, mode },
    }));
  }

  /* ── Close ── */
  function close() {
    if (!_el || !_el.classList.contains('is-open')) return;
    _el.classList.remove('is-open');
    _el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const pdf = document.getElementById('pgal-pdf');
    if (pdf) pdf.src = '';
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
    _prevFocus?.focus();

    window.dispatchEvent(new CustomEvent('portfolio:projectClose', {
      detail: { project: _p, mode: _mode },
    }));
  }

  return { open, close };
})();
