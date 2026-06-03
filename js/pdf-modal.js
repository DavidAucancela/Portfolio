const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export const PDFModal = (() => {
  let _el        = null;
  let _iframe    = null;
  let _titleEl   = null;
  let _dlBtn     = null;
  let _prevFocus = null;

  function _inject() {
    _el = document.createElement('div');
    _el.className = 'pdf-modal';
    _el.setAttribute('role', 'dialog');
    _el.setAttribute('aria-modal', 'true');
    _el.setAttribute('aria-labelledby', 'pdf-modal-title');
    _el.setAttribute('tabindex', '-1');
    _el.hidden = true;

    _el.innerHTML = `
      <div class="pdf-modal__header">
        <span class="pdf-modal__title" id="pdf-modal-title"></span>
        <div class="pdf-modal__actions">
          <a class="pdf-modal__download" id="pdf-modal-dl" href="#" download aria-label="Descargar PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Descargar</span>
          </a>
          <button class="pdf-modal__close" id="pdf-modal-close" aria-label="Cerrar visor">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      ${_isIOS
        ? `<div class="pdf-modal__ios-fallback" id="pdf-modal-body">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
               <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
               <polyline points="14 2 14 8 20 8"/>
             </svg>
             <p>Safari no soporta la vista previa de PDF.<br>Usa el botón Descargar para abrir el documento.</p>
           </div>`
        : `<iframe class="pdf-modal__iframe" id="pdf-modal-frame" title="Visor de PDF"></iframe>`
      }
    `;

    document.body.appendChild(_el);

    _titleEl = _el.querySelector('#pdf-modal-title');
    _dlBtn   = _el.querySelector('#pdf-modal-dl');
    _iframe  = _el.querySelector('#pdf-modal-frame') || null;

    document.getElementById('pdf-modal-close').addEventListener('click', close);

    // Cerrar al hacer clic en el overlay (fuera del contenido)
    _el.addEventListener('click', e => {
      if (e.target === _el) close();
    });

    // Cerrar con Esc
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !_el.hidden) close();
    });
  }

  function init() {
    _inject();
  }

  function open(url, label = 'Documento') {
    if (!_el) _inject();

    _prevFocus = document.activeElement;
    _titleEl.textContent = label;
    _dlBtn.href     = url;
    _dlBtn.download = label;

    if (_iframe) _iframe.src = url;

    _el.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => _el.querySelector('#pdf-modal-close')?.focus(), 50);
  }

  function close() {
    if (_el.hidden) return;
    _el.hidden = true;
    if (_iframe) _iframe.src = '';
    document.body.style.overflow = '';
    if (_prevFocus) _prevFocus.focus();
  }

  return { init, open };
})();
