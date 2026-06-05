/**
 * ia-mascot.js — JotAI widget flotante
 * Fase 3: motor de embeddings via Web Worker (@huggingface/transformers)
 *
 * Búsqueda semántica (MiniLM) con fallback a keywords mientras el modelo carga.
 * Importa IAAssistant para KB y query de fallback.
 */

import { IAAssistant } from './ia-assistant.js';
import { IaTour }      from './ia-tour.js';

/* ── CONFIGURACIÓN ────────────────────────────────────────────── */

const MASCOT_NAME = 'JotAI';

const QUICK_CHIPS = [
  '¿Qué proyectos tienes?',
  '¿Quién es Jonathan?',
  'UBApp',
  'LLM Observatory',
  'Stack tecnológico',
  '¿Cómo contactarlo?',
];

/* ── SVG DEL MASCOT ───────────────────────────────────────────── */
// Personaje original: criatura tech flotante con orejas aladas,
// ojos grandes tipo pantalla y trazos de circuito.
// Usa currentColor → hereda var(--color-accent) del botón padre.

function _buildSVG(size = 'full') {
  // size 'full' = vista completa; 'avatar' = versión compacta para el header
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <!-- Sombra flotante -->
    <ellipse id="jotai-shadow" cx="50" cy="85" rx="19" ry="5"
             fill="currentColor" opacity="0.12"/>

    <!-- Orejas aladas izquierda -->
    <g id="jotai-ear-left">
      <path d="M32 46 C15 37 11 61 24 66 C27 60 30 53 32 49 Z"
            fill="var(--bg-secondary,#1a1a2e)" stroke="currentColor" stroke-width="1.4"
            stroke-linejoin="round"/>
      <!-- Inner glow de oreja -->
      <path d="M30 49 C18 42 17 58 25 62 C28 57 30 52 30 50 Z"
            fill="currentColor" opacity="0.2"/>
    </g>

    <!-- Orejas aladas derecha -->
    <g id="jotai-ear-right">
      <path d="M68 46 C85 37 89 61 76 66 C73 60 70 53 68 49 Z"
            fill="var(--bg-secondary,#1a1a2e)" stroke="currentColor" stroke-width="1.4"
            stroke-linejoin="round"/>
      <path d="M70 49 C82 42 83 58 75 62 C72 57 70 52 70 50 Z"
            fill="currentColor" opacity="0.2"/>
    </g>

    <!-- Cuerpo principal (blob redondeado) -->
    <ellipse id="jotai-body" cx="50" cy="55" rx="23" ry="21"
             fill="var(--bg-secondary,#1a1a2e)" stroke="currentColor" stroke-width="1.4"/>

    <!-- Ojo izquierdo -->
    <g id="jotai-eye-left">
      <!-- Cuenca -->
      <ellipse cx="40" cy="52" rx="7" ry="8"
               fill="var(--bg-primary,#0d0221)" stroke="currentColor" stroke-width="0.9"/>
      <!-- Pupila con brillo -->
      <ellipse cx="40" cy="53" rx="4.2" ry="5.2" fill="currentColor" opacity="0.95"/>
      <!-- Reflejo -->
      <ellipse cx="38.2" cy="50.5" rx="1.4" ry="1.4" fill="white" opacity="0.85"/>
    </g>

    <!-- Ojo derecho -->
    <g id="jotai-eye-right">
      <ellipse cx="60" cy="52" rx="7" ry="8"
               fill="var(--bg-primary,#0d0221)" stroke="currentColor" stroke-width="0.9"/>
      <ellipse cx="60" cy="53" rx="4.2" ry="5.2" fill="currentColor" opacity="0.95"/>
      <ellipse cx="58.2" cy="50.5" rx="1.4" ry="1.4" fill="white" opacity="0.85"/>
    </g>

    <!-- Boca (múltiples estados; solo uno visible a la vez) -->
    <g id="jotai-mouth">
      <!-- neutral -->
      <path class="jm-neutral" d="M43 67 Q50 72 57 67"
            fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <!-- sonrisa -->
      <path class="jm-smile" d="M40 66 Q50 75 60 66"
            fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity="0"/>
      <!-- triste/confundido -->
      <path class="jm-sad" d="M43 70 Q50 65 57 70"
            fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0"/>
      <!-- hablando (O) -->
      <ellipse class="jm-open" cx="50" cy="68" rx="4" ry="3.5"
               fill="currentColor" opacity="0" stroke="none"/>
    </g>

    <!-- Trazos de circuito (detalles tech) -->
    <g id="jotai-circuits" opacity="0.2" stroke="currentColor" stroke-width="0.8" fill="none">
      <line x1="34" y1="68" x2="28" y2="68"/>
      <line x1="28" y1="68" x2="28" y2="75"/>
      <circle cx="28" cy="75" r="1.4" fill="currentColor" stroke="none"/>
      <line x1="66" y1="68" x2="72" y2="68"/>
      <line x1="72" y1="68" x2="72" y2="75"/>
      <circle cx="72" cy="75" r="1.4" fill="currentColor" stroke="none"/>
    </g>

    <!-- Brillo de vientre -->
    <ellipse id="jotai-belly" cx="50" cy="63" rx="9" ry="5.5"
             fill="currentColor" opacity="0.06"/>
  </svg>`;
}

/* ── ESTADO INTERNO ───────────────────────────────────────────── */

/* ── CONSTANTES ───────────────────────────────────────────────── */

const SEMANTIC_THRESHOLD = 0.32; // score mínimo para aceptar resultado semántico

export const IaMascot = (() => {
  /* UI refs */
  let _panel      = null;
  let _trigger    = null;
  let _chat       = null;
  let _input      = null;
  let _sendBtn    = null;
  let _isOpen     = false;
  let _state      = 'idle';
  let _gsap       = null;
  let _reduced    = false;
  let _hasGreeted = false;
  let _prevFocus  = null;

  /* Worker state */
  let _worker       = null;
  let _workerReady  = false;
  let _workerInit   = false;
  let _queryId      = 0;
  const _pending    = new Map(); // id → { resolve, timer }

  /* ── WORKER ─────────────────────────────────────────────────── */

  function _initWorker(docs) {
    if (_workerInit) return;
    _workerInit = true;

    _worker = new Worker(
      new URL('./ia-worker.js', import.meta.url),
      { type: 'module' }
    );

    _worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'progress':
          if (data.stage === 'model') {
            _setStatus(`Cargando modelo… ${data.pct}%`);
          } else if (data.stage === 'indexing') {
            _setStatus(`Indexando KB… ${data.current}/${data.total}`);
          }
          break;

        case 'ready':
          _workerReady = true;
          _setStatus('Listo para responder');
          break;

        case 'result': {
          const entry = _pending.get(data.id);
          if (entry) {
            clearTimeout(entry.timer);
            _pending.delete(data.id);
            entry.resolve(data.results);
          }
          break;
        }

        case 'error':
          console.warn('[JotAI Worker]', data.message);
          // Fallback: marca el worker como no listo para seguir con keywords
          _workerReady = false;
          break;
      }
    };

    _worker.postMessage({ type: 'init', docs });
  }

  function _semanticQuery(text) {
    return new Promise(resolve => {
      const id    = ++_queryId;
      const timer = setTimeout(() => {
        _pending.delete(id);
        resolve([]); // timeout → fallback a keywords
      }, 10_000);
      _pending.set(id, { resolve, timer });
      _worker.postMessage({ type: 'query', text, id });
    });
  }

  /* ── DOM INJECTION ──────────────────────────────────────────── */

  function _inject() {
    const widget = document.createElement('div');
    widget.id = 'jotai-widget';
    widget.setAttribute('data-jotai-state', 'idle');

    widget.innerHTML = `
      <!-- Panel de chat -->
      <div id="jotai-panel"
           role="dialog"
           aria-label="Asistente ${MASCOT_NAME}"
           aria-modal="false"
           hidden>

        <div id="jotai-panel-header">
          <div class="jotai-header-avatar">${_buildSVG('avatar')}</div>
          <div class="jotai-header-info">
            <div class="jotai-header-name">${MASCOT_NAME}</div>
            <div class="jotai-header-status">
              <span class="jotai-status-dot"></span>
              <span id="jotai-status-text">Listo para responder</span>
            </div>
          </div>
          <button id="jotai-tour-btn" aria-label="Iniciar tour del portfolio">
            Tour 🗺
          </button>
          <button id="jotai-panel-close" aria-label="Cerrar asistente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="jotai-chat"
             role="log"
             aria-live="polite"
             aria-label="Conversación con ${MASCOT_NAME}"></div>

        <div id="jotai-chips"></div>

        <div id="jotai-input-wrap">
          <input
            id="jotai-input"
            type="text"
            placeholder="Pregúntame algo…"
            maxlength="200"
            autocomplete="off"
            aria-label="Escribe tu pregunta para ${MASCOT_NAME}"
          />
          <button id="jotai-send" aria-label="Enviar pregunta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Burbuja trigger del mascot -->
      <button
        id="jotai-trigger"
        aria-label="Abrir asistente ${MASCOT_NAME}"
        aria-expanded="false"
        aria-controls="jotai-panel">
        ${_buildSVG('full')}
      </button>
    `;

    document.body.appendChild(widget);

    _panel   = widget.querySelector('#jotai-panel');
    _trigger = widget.querySelector('#jotai-trigger');
    _chat    = widget.querySelector('#jotai-chat');
    _input   = widget.querySelector('#jotai-input');
    _sendBtn = widget.querySelector('#jotai-send');

    /* Listeners */
    _trigger.addEventListener('click', _togglePanel);
    widget.querySelector('#jotai-panel-close').addEventListener('click', closePanel);
    widget.querySelector('#jotai-tour-btn').addEventListener('click', _startTour);
    _sendBtn.addEventListener('click', _handleSend);
    _input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _handleSend(); }
    });
    _input.addEventListener('focus', () => {
      if (_state === 'idle') _setState('listening');
    });
    _input.addEventListener('blur', () => {
      if (_state === 'listening') _setState('idle');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _isOpen) closePanel();
    });

    _renderChips();
  }

  /* ── CHIPS ──────────────────────────────────────────────────── */

  function _renderChips() {
    const container = document.getElementById('jotai-chips');
    if (!container) return;
    container.innerHTML = QUICK_CHIPS
      .map(c => `<button class="jotai-chip" type="button">${_esc(c)}</button>`)
      .join('');
    container.querySelectorAll('.jotai-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        _input.value = btn.textContent.trim();
        _handleSend();
      });
    });
  }

  /* ── PANEL OPEN / CLOSE ─────────────────────────────────────── */

  function _togglePanel() {
    _isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    if (_isOpen) return;
    _isOpen = true;
    _prevFocus = document.activeElement;
    _panel.hidden = false;
    _trigger.setAttribute('aria-expanded', 'true');

    if (!_reduced && _gsap) {
      _gsap.fromTo(_panel,
        { opacity: 0, y: 14, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: 'back.out(1.4)' }
      );
    }

    _setState('greeting');
    _addBotMessage(_getGreeting());

    setTimeout(() => {
      _setState('idle');
      _input.focus();
    }, 1800);
  }

  function closePanel() {
    if (!_isOpen) return;
    _isOpen = false;
    _trigger.setAttribute('aria-expanded', 'false');
    _setState('idle');

    if (!_reduced && _gsap) {
      _gsap.to(_panel, {
        opacity: 0, y: 10, scale: 0.95, duration: 0.16, ease: 'power2.in',
        onComplete: () => { _panel.hidden = true; },
      });
    } else {
      _panel.hidden = true;
    }

    _prevFocus?.focus();
  }

  /* ── GREETING ───────────────────────────────────────────────── */

  function _getGreeting() {
    if (!_hasGreeted) {
      _hasGreeted = true;
      return `¡Hola! Soy **${MASCOT_NAME}**, el asistente de Jonathan. Puedo contarte sobre sus proyectos, tecnologías y experiencia. ¿Qué quieres saber?`;
    }
    return `¡De vuelta! ¿En qué puedo ayudarte?`;
  }

  /* ── MESSAGES ───────────────────────────────────────────────── */

  function _addBotMessage(text, isHTML = false) {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    const content = isHTML ? text : _md(text);
    msg.innerHTML = `<div class="jotai-msg__bubble">${content}</div>`;
    _chat.appendChild(msg);
    _chat.scrollTop = _chat.scrollHeight;
  }

  function _addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--user';
    msg.innerHTML = `<div class="jotai-msg__bubble">${_esc(text)}</div>`;
    _chat.appendChild(msg);
    _chat.scrollTop = _chat.scrollHeight;
  }

  function _addLoadingDots() {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    msg.id = 'jotai-loading-msg';
    msg.innerHTML = `<div class="jotai-msg__bubble"><div class="jotai-dots"><span></span><span></span><span></span></div></div>`;
    _chat.appendChild(msg);
    _chat.scrollTop = _chat.scrollHeight;
  }

  function _removeLoadingDots() {
    document.getElementById('jotai-loading-msg')?.remove();
  }

  /* ── TOUR ───────────────────────────────────────────────────── */

  function _startTour() {
    closePanel();
    const mode = document.body.dataset.theme || 'dev';
    IaTour.start(mode, {
      onState: _setState,
      onDone:  () => {
        _setState('idle');
        openPanel();
        setTimeout(() => {
          _addBotMessage('¡Tour completado! ¿Tienes alguna pregunta sobre el portfolio?');
          _setState('success');
          setTimeout(() => _setState('idle'), 2000);
        }, 300);
      },
    });
  }

  /* ── QUERY HANDLING ─────────────────────────────────────────── */

  async function _handleSend() {
    const val = _input.value.trim();
    if (!val || _sendBtn.disabled) return;
    _input.value = '';
    _sendBtn.disabled = true;

    _addUserMessage(val);
    _setState('thinking');
    _setStatus('Pensando…');
    _addLoadingDots();

    // 1. Búsqueda por keywords / intent (síncrona, siempre disponible)
    const kwResult = IAAssistant.query(val);

    // 2. Si el intent es "especial" (listas, perfil, contacto) → respuesta inmediata
    const isSpecial = kwResult?.type === 'special';

    let finalResult = kwResult;

    if (!isSpecial && _workerReady) {
      // 3. Búsqueda semántica via worker
      const semResults = await _semanticQuery(val);
      const topSem     = semResults.find(r => r.score >= SEMANTIC_THRESHOLD);

      if (topSem) {
        // Preferir resultado semántico si supera el umbral
        finalResult = { type: topSem.type, data: topSem.data };
      }
      // Si semántica no supera umbral pero keyword sí matcheó → kwResult gana
    } else if (!isSpecial && !_workerReady) {
      // Worker aún cargando → pequeño delay para sensación de "pensando"
      await new Promise(r => setTimeout(r, 420 + Math.random() * 250));
    }

    _removeLoadingDots();

    if (finalResult) {
      _addBotMessage(_buildResultHTML(finalResult), true);
      _setState('success');
    } else {
      _addBotMessage('No encontré resultados. Prueba con un proyecto (UBApp, LLM Observatory…) o una tecnología (Django, React, Docker…).');
      _setState('confused');
    }

    _setStatus(_workerReady ? 'Listo para responder' : 'Motor semántico cargando…');
    _sendBtn.disabled = false;
    setTimeout(() => _setState('idle'), 2200);
  }

  /* ── RESULT HTML ────────────────────────────────────────────── */

  function _buildResultHTML(result) {
    if (result.type === 'special') {
      return `<div class="jotai-result"><div>${_md(result.text)}</div></div>`;
    }

    if (result.type === 'project') {
      const p     = result.data;
      const tags  = (p.tags || []).slice(0, 5)
        .map(t => `<span class="jotai-result__tag">${_esc(t)}</span>`).join('');
      const links = [
        p.repoUrl ? `<a href="${_esc(p.repoUrl)}" target="_blank" rel="noopener" class="jotai-result__link">GitHub ↗</a>` : '',
        p.liveUrl ? `<a href="${_esc(p.liveUrl)}" target="_blank" rel="noopener" class="jotai-result__link">Demo ↗</a>` : '',
      ].filter(Boolean).join('');
      const meta = p.lab
        ? `${p.lab.platform} · ${p.lab.difficulty} · ${p.lab.status || ''}`
        : (p.date ? p.date.replace('-', ' / ') : '');

      return `<div class="jotai-result">
        <div class="jotai-result__title">${_esc(p.title)}</div>
        ${meta ? `<div class="jotai-result__meta">${_esc(meta)}</div>` : ''}
        <div>${_md(p.description || '')}</div>
        ${tags  ? `<div class="jotai-result__tags">${tags}</div>` : ''}
        ${links ? `<div class="jotai-result__links">${links}</div>` : ''}
      </div>`;
    }

    if (result.type === 'skill') {
      const s     = result.data;
      const stars = '★'.repeat(s.level) + '☆'.repeat(5 - s.level);
      const projs = (s.proyectos || []).slice(0, 4)
        .map(p => `<span class="jotai-result__tag">${_esc(p)}</span>`).join('');
      return `<div class="jotai-result">
        <div class="jotai-result__title">${_esc(s.name)}</div>
        <div class="jotai-result__meta">${stars} · ${_esc(s.nivel)}</div>
        ${projs ? `<div class="jotai-result__tags">${projs}</div>` : ''}
      </div>`;
    }

    return `<div>${_md(result.text || '')}</div>`;
  }

  /* ── STATE MACHINE ──────────────────────────────────────────── */

  function _setState(state) {
    _state = state;
    const widget = document.getElementById('jotai-widget');
    if (widget) widget.setAttribute('data-jotai-state', state);

    _updateMouth(state);

    if (!_reduced && _gsap) _animateState(state);
  }

  function _updateMouth(state) {
    const neutral = _trigger?.querySelectorAll('.jm-neutral');
    const smile   = _trigger?.querySelectorAll('.jm-smile');
    const sad     = _trigger?.querySelectorAll('.jm-sad');
    const open    = _trigger?.querySelectorAll('.jm-open');
    if (!neutral) return;

    const set = (els, val) => els.forEach(el => { el.style.opacity = val; });

    // Reset all
    set(neutral, 0); set(smile, 0); set(sad, 0); set(open, 0);

    switch (state) {
      case 'greeting':
      case 'success':
        set(smile, 1); break;
      case 'confused':
        set(sad, 1); break;
      case 'talking':
        set(open, 1); break;
      default:
        set(neutral, 1); break;
    }
  }

  function _animateState(state) {
    if (!_gsap || !_trigger) return;

    const earL  = _trigger.querySelector('#jotai-ear-left');
    const earR  = _trigger.querySelector('#jotai-ear-right');
    const eyeL  = _trigger.querySelector('#jotai-eye-left');
    const eyeR  = _trigger.querySelector('#jotai-eye-right');
    const body  = _trigger.querySelector('#jotai-body');

    _gsap.killTweensOf([earL, earR, eyeL, eyeR, body, _trigger]);

    switch (state) {
      case 'idle':
        _gsap.to([earL, earR], { y: 0, rotate: 0, duration: 0.5, ease: 'power2.out', svgOrigin: '50 50' });
        _gsap.to([eyeL, eyeR], { scaleY: 1, y: 0, duration: 0.35, ease: 'power2.out', svgOrigin: '50 52' });
        break;

      case 'greeting':
        _gsap.timeline()
          .to(_trigger, { y: -10, duration: 0.18, ease: 'power2.out' })
          .to(_trigger, { y: 0, duration: 0.25, ease: 'bounce.out' })
          .to(_trigger, { y: -6, duration: 0.14, ease: 'power2.out' }, '+=0.05')
          .to(_trigger, { y: 0, duration: 0.2, ease: 'bounce.out' });
        _gsap.to([earL, earR], { y: -5, duration: 0.3, ease: 'back.out(2)', svgOrigin: '50 50' });
        break;

      case 'listening':
        _gsap.to(earL, { y: -6, rotate: -6, duration: 0.35, ease: 'back.out(2)', svgOrigin: '32 55' });
        _gsap.to(earR, { y: -6, rotate:  6, duration: 0.35, ease: 'back.out(2)', svgOrigin: '68 55' });
        _gsap.to([eyeL, eyeR], { scaleY: 1.12, duration: 0.25, ease: 'power1.out', svgOrigin: '50 52' });
        break;

      case 'thinking':
        _gsap.to(eyeL, { y: -2, duration: 0.3 });
        _gsap.to(eyeR, { y: -2, duration: 0.3 });
        _gsap.to(body, {
          rotate: 4, duration: 1.2, ease: 'sine.inOut',
          yoyo: true, repeat: -1, svgOrigin: '50 55',
        });
        break;

      case 'talking':
        _gsap.to([eyeL, eyeR], { scaleY: 1, y: 0, duration: 0.2, svgOrigin: '50 52' });
        break;

      case 'success':
        _gsap.timeline()
          .to(_trigger, { scale: 1.12, duration: 0.15, ease: 'power2.out' })
          .to(_trigger, { scale: 1,    duration: 0.25, ease: 'elastic.out(1, 0.5)' });
        _gsap.to([earL, earR], { y: -4, duration: 0.2, ease: 'back.out(2)', svgOrigin: '50 50' });
        break;

      case 'confused':
        _gsap.timeline()
          .to(_trigger, { rotate: -10, duration: 0.2, ease: 'power2.out' })
          .to(_trigger, { rotate:  8,  duration: 0.18 })
          .to(_trigger, { rotate: -5,  duration: 0.15 })
          .to(_trigger, { rotate:  0,  duration: 0.2, ease: 'power1.out' });
        break;

      case 'pointing':
        _gsap.to(earR, { y: -8, rotate: 12, duration: 0.4, ease: 'back.out(1.5)', svgOrigin: '68 55' });
        _gsap.to(body,  { x: 2, duration: 0.3, ease: 'power2.out', svgOrigin: '50 55' });
        break;
    }
  }

  /* ── STATUS TEXT ────────────────────────────────────────────── */

  function _setStatus(text) {
    const el = document.getElementById('jotai-status-text');
    if (el) el.textContent = text;
  }

  /* ── HELPERS ────────────────────────────────────────────────── */

  function _md(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function _esc(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── INIT ───────────────────────────────────────────────────── */

  function init() {
    _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    _gsap    = window.gsap || null;

    _inject();

    // Inicializa boca en estado neutral al arrancar
    setTimeout(() => _updateMouth('idle'), 0);

    // Cuando IAAssistant termina de cargar la KB → inicia el worker
    window.addEventListener('jotai:kb-ready', ({ detail }) => {
      if (detail.kb?.length > 0) {
        _initWorker(detail.kb);
      }
    });

    // Cierra panel al cambiar de modo
    window.addEventListener('portfolio:modeChange', () => {
      if (_isOpen) closePanel();
    });
  }

  return { init, openPanel, closePanel, setState: _setState };
})();
