/**
 * ia-mascot.js — JotAI widget flotante
 * Fase 2 v2: conversación en texto libre + typewriter effect
 * Fase 1 v2: mascot vivo (blink, look-around, cursor tracking, CSS states)
 * Fase 3:    motor de embeddings via Web Worker (@huggingface/transformers)
 */

import { IAAssistant } from './ia-assistant.js';
import { IaTour }      from './ia-tour.js';

/* ── CONFIGURACIÓN ────────────────────────────────────────────── */

const MASCOT_NAME    = 'JotAI';
const TYPEWRITER_MS  = 14;   // ms por carácter en el efecto de escritura

/**
 * MASCOT_RENDER — cambia aquí para alternar entre modos:
 *   'image'  → robot 3D (WebP/PNG, fondo transparente) + overlays vectoriales
 *   'svg'    → blob vectorial puro (fallback sin asset externo)
 */
const MASCOT_RENDER = 'image';

/* ── SVG DEL MASCOT ───────────────────────────────────────────── */

/** Dispatcher — selecciona render según MASCOT_RENDER */
function _buildSVG(prefix) {
  return MASCOT_RENDER === 'image'
    ? _buildSVGImage(prefix)
    : _buildSVGVector(prefix);
}

/* ── MODO IMAGE: robot 3D + overlays animados ─────────────────── */
// Robot: 307×660px → viewBox 200×200 (xMidYMid meet)
// Renderiza 93×200, x-offset 53.5 — calibrar posiciones tras prueba visual

function _buildSVGImage(prefix) {
  const p = prefix || 'j';

  // Geometría de los ojos sobre la pantalla del robot — CALIBRAR
  const EL = { cx: 86,  cy: 42 };  // ojo izquierdo
  const ER = { cx: 114, cy: 42 };  // ojo derecho
  const ER_SCLERA = 11;            // radio sclera
  const RP        = 6;             // radio pupila

  return `<svg class="jotai-mascot" viewBox="0 0 200 200"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${p}aura" cx="50%" cy="48%" r="55%">
      <stop offset="0%"   stop-color="var(--color-accent,#06ffa5)" stop-opacity=".55"/>
      <stop offset="60%"  stop-color="var(--color-accent,#06ffa5)" stop-opacity=".12"/>
      <stop offset="100%" stop-color="var(--color-accent,#06ffa5)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}eye" cx="40%" cy="36%" r="65%">
      <stop offset="0%"   stop-color="#e8f4ff"/>
      <stop offset="100%" stop-color="var(--color-secondary,#b14eff)" stop-opacity=".5"/>
    </radialGradient>
  </defs>

  <!-- Aura centrada en el torso del robot -->
  <circle class="jotai-aura" cx="100" cy="110" r="74" fill="url(#${p}aura)"/>

  <!-- Motes orbitando -->
  <g class="jotai-motes">
    <circle cx="100" cy="26"  r="2.6" fill="var(--color-accent,#06ffa5)" opacity=".9"/>
    <circle cx="176" cy="120" r="2"   fill="var(--color-secondary,#b14eff)" opacity=".8"/>
  </g>
  <g class="jotai-motes-2">
    <circle cx="26"  cy="118" r="2.2" fill="var(--color-accent,#06ffa5)" opacity=".7"/>
  </g>

  <g class="jotai-creature">
    <g class="jotai-tilt">

      <!-- Cuerpo (imagen con fondo transparente) -->
      <image class="jotai-body-img"
             href="public/images/jotai/body.png"
             x="0" y="0" width="200" height="200"
             preserveAspectRatio="xMidYMid meet"/>

      <!-- Orejas invisibles — preservan el contrato CSS de estados animados -->
      <path class="jotai-ear jotai-ear-l" opacity="0"
            d="M83 92 C72 77 70 53 77 41 C84 49 88 73 88 91 Z"/>
      <path class="jotai-ear jotai-ear-r" opacity="0"
            d="M117 92 C128 77 130 53 123 41 C116 49 112 73 112 91 Z"/>

      <!-- Ojo izquierdo sobre la pantalla del robot -->
      <g>
        <ellipse cx="${EL.cx}" cy="${EL.cy}" rx="${ER_SCLERA}" ry="${ER_SCLERA}"
                 fill="url(#${p}eye)" opacity=".4"/>
        <g class="jotai-pupil-grp">
          <circle cx="${EL.cx}"     cy="${EL.cy}"     r="${RP}"   fill="var(--bg-primary,#0a1430)" opacity=".85"/>
          <circle cx="${EL.cx - 2}" cy="${EL.cy - 2}" r="1.8"    fill="#fff"/>
          <circle cx="${EL.cx+1.5}" cy="${EL.cy + 2}" r="1.1"    fill="var(--color-accent,#06ffa5)"/>
        </g>
        <ellipse class="jotai-lid"
                 cx="${EL.cx}" cy="${EL.cy}" rx="${ER_SCLERA+1}" ry="${ER_SCLERA+1}"
                 fill="var(--bg-secondary,#1a2540)"/>
      </g>

      <!-- Ojo derecho -->
      <g>
        <ellipse cx="${ER.cx}" cy="${ER.cy}" rx="${ER_SCLERA}" ry="${ER_SCLERA}"
                 fill="url(#${p}eye)" opacity=".4"/>
        <g class="jotai-pupil-grp">
          <circle cx="${ER.cx}"     cy="${ER.cy}"     r="${RP}"   fill="var(--bg-primary,#0a1430)" opacity=".85"/>
          <circle cx="${ER.cx - 2}" cy="${ER.cy - 2}" r="1.8"    fill="#fff"/>
          <circle cx="${ER.cx+1.5}" cy="${ER.cy + 2}" r="1.1"    fill="var(--color-accent,#06ffa5)"/>
        </g>
        <ellipse class="jotai-lid"
                 cx="${ER.cx}" cy="${ER.cy}" rx="${ER_SCLERA+1}" ry="${ER_SCLERA+1}"
                 fill="var(--bg-secondary,#1a2540)"/>
      </g>

      <!-- Boca (d cambia por JS según estado) -->
      <path class="jotai-mouth-path"
            d="M91 56 Q100 62 109 56"
            fill="none"
            stroke="var(--bg-primary,#0a1430)"
            stroke-width="2.8"
            stroke-linecap="round"/>

      <!-- Think-dots (is-thinking) — zona superior derecha del robot -->
      <g class="jotai-think-dots">
        <circle cx="138" cy="20" r="3.2" fill="var(--color-accent,#06ffa5)"/>
        <circle cx="149" cy="14" r="3.2" fill="var(--color-accent,#06ffa5)"/>
        <circle cx="160" cy="10" r="3.2" fill="var(--color-accent,#06ffa5)"/>
      </g>

      <!-- Spark (is-success) -->
      <path class="jotai-spark"
            d="M154 6 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5 z"
            fill="var(--color-accent,#06ffa5)"/>

      <!-- Signo de pregunta (is-confused) -->
      <text class="jotai-qmark" x="143" y="24"
            font-size="20" font-weight="800" font-family="monospace"
            fill="var(--color-accent,#06ffa5)">?</text>

    </g>
  </g>
</svg>`;
}

/* ── MODO SVG: blob vectorial (fallback sin asset externo) ────── */

function _buildSVGVector(prefix) {
  const p = prefix || 'j';
  return `<svg class="jotai-mascot" viewBox="0 0 200 200"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${p}aura" cx="50%" cy="48%" r="55%">
      <stop offset="0%"   stop-color="var(--color-accent,#06ffa5)" stop-opacity=".55"/>
      <stop offset="60%"  stop-color="var(--color-accent,#06ffa5)" stop-opacity=".12"/>
      <stop offset="100%" stop-color="var(--color-accent,#06ffa5)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${p}body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--color-accent,#06ffa5)" stop-opacity=".55"/>
      <stop offset="100%" stop-color="var(--bg-secondary,#110330)"/>
    </linearGradient>
    <radialGradient id="${p}eye" cx="42%" cy="38%" r="70%">
      <stop offset="0%"   stop-color="#f1f8ff"/>
      <stop offset="100%" stop-color="var(--color-secondary,#b14eff)" stop-opacity=".6"/>
    </radialGradient>
  </defs>

  <!-- Aura de fondo -->
  <circle class="jotai-aura" cx="100" cy="104" r="74" fill="url(#${p}aura)"/>

  <!-- Motes (partículas orbitando) -->
  <g class="jotai-motes">
    <circle cx="100" cy="26"  r="2.6" fill="var(--color-accent,#06ffa5)"         opacity=".9"/>
    <circle cx="176" cy="120" r="2"   fill="var(--color-secondary,#b14eff)"      opacity=".8"/>
  </g>
  <g class="jotai-motes-2">
    <circle cx="26"  cy="118" r="2.2" fill="var(--color-accent,#06ffa5)"         opacity=".7"/>
  </g>

  <!-- Criatura (recibe breathe) -->
  <g class="jotai-creature">
    <!-- Tilt (recibe poses de estado) -->
    <g class="jotai-tilt">

      <!-- Antena -->
      <line x1="100" y1="74" x2="100" y2="56"
            stroke="var(--color-accent,#06ffa5)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      <circle cx="100" cy="53" r="3.4" fill="var(--color-accent,#06ffa5)"/>

      <!-- Oreja izquierda -->
      <path class="jotai-ear jotai-ear-l"
            d="M83 92 C72 77 70 53 77 41 C84 49 88 73 88 91 Z"
            fill="var(--bg-secondary,#110330)"
            stroke="var(--color-accent,#06ffa5)" stroke-width="1.2"/>
      <path class="jotai-ear jotai-ear-l"
            d="M83 89 C76 78 75 60 79 50 C83 56 85 73 85 88 Z"
            fill="var(--color-accent,#06ffa5)" opacity=".28"/>

      <!-- Oreja derecha -->
      <path class="jotai-ear jotai-ear-r"
            d="M117 92 C128 77 130 53 123 41 C116 49 112 73 112 91 Z"
            fill="var(--bg-secondary,#110330)"
            stroke="var(--color-accent,#06ffa5)" stroke-width="1.2"/>
      <path class="jotai-ear jotai-ear-r"
            d="M117 89 C124 78 125 60 121 50 C117 56 115 73 115 88 Z"
            fill="var(--color-accent,#06ffa5)" opacity=".28"/>

      <!-- Cuerpo -->
      <ellipse cx="100" cy="122" rx="45" ry="41" fill="url(#${p}body)"/>
      <ellipse cx="84"  cy="100" rx="20" ry="14" fill="#fff" opacity=".08"/>
      <ellipse cx="100" cy="122" rx="45" ry="41" fill="none"
               stroke="var(--color-accent,#06ffa5)" stroke-width="1.4" opacity=".45"/>

      <!-- Ojo izquierdo -->
      <g>
        <ellipse cx="82" cy="116" rx="15.5" ry="17.5" fill="url(#${p}eye)"/>
        <g class="jotai-pupil-grp">
          <circle cx="82"   cy="118" r="7"   fill="var(--bg-primary,#0a1430)"/>
          <circle cx="79.5" cy="115" r="2.3" fill="#fff"/>
          <circle cx="84.5" cy="121" r="1.2" fill="var(--color-accent,#06ffa5)"/>
        </g>
        <ellipse class="jotai-lid" cx="82" cy="116" rx="16.5" ry="18.5"
                 fill="var(--bg-secondary,#110330)"/>
      </g>

      <!-- Ojo derecho -->
      <g>
        <ellipse cx="118" cy="116" rx="15.5" ry="17.5" fill="url(#${p}eye)"/>
        <g class="jotai-pupil-grp">
          <circle cx="118"   cy="118" r="7"   fill="var(--bg-primary,#0a1430)"/>
          <circle cx="115.5" cy="115" r="2.3" fill="#fff"/>
          <circle cx="120.5" cy="121" r="1.2" fill="var(--color-accent,#06ffa5)"/>
        </g>
        <ellipse class="jotai-lid" cx="118" cy="116" rx="16.5" ry="18.5"
                 fill="var(--bg-secondary,#110330)"/>
      </g>

      <!-- Boca (d se cambia por JS según estado) -->
      <path class="jotai-mouth-path"
            d="M89 141 Q100 150 111 141"
            fill="none"
            stroke="var(--bg-primary,#0a1430)"
            stroke-width="3.4"
            stroke-linecap="round"/>

      <!-- Think-dots (visibles en .is-thinking) -->
      <g class="jotai-think-dots">
        <circle cx="142" cy="74" r="3.2" fill="var(--color-accent,#06ffa5)"/>
        <circle cx="153" cy="68" r="3.2" fill="var(--color-accent,#06ffa5)"/>
        <circle cx="164" cy="64" r="3.2" fill="var(--color-accent,#06ffa5)"/>
      </g>

      <!-- Spark (visible en .is-success) -->
      <path class="jotai-spark"
            d="M150 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z"
            fill="var(--color-accent,#06ffa5)"/>

      <!-- Signo de pregunta (visible en .is-confused) -->
      <text class="jotai-qmark"
            x="148" y="70"
            font-size="22" font-weight="800"
            fill="var(--color-accent,#06ffa5)"
            font-family="monospace">?</text>

    </g>
  </g>
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
          _setStatus(data.fromCache ? 'Listo (caché ⚡)' : 'Listo para responder');
          // Restablece el texto normal después de 3s
          setTimeout(() => _setStatus('Listo para responder'), 3000);
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
          <div class="jotai-header-avatar">${_buildSVG('p')}</div>
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

        <p class="jotai-hint" id="jotai-hint">
          Escribe en lenguaje natural — p. ej. «¿qué ha hecho en ciberseguridad?»
        </p>

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
        ${_buildSVG('b')}
      </button>
    `;

    document.body.appendChild(widget);

    _panel   = widget.querySelector('#jotai-panel');
    _trigger = widget.querySelector('#jotai-trigger');
    _chat    = widget.querySelector('#jotai-chat');
    _input   = widget.querySelector('#jotai-input');
    _sendBtn = widget.querySelector('#jotai-send');

    /* Arranca la vida de ambos mascots */
    const bubbleSvg = _trigger.querySelector('.jotai-mascot');
    const panelSvg  = widget.querySelector('.jotai-header-avatar .jotai-mascot');
    _startLife(bubbleSvg);
    _startLife(panelSvg);
    _initCursorTracking(panelSvg);

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
    _typewriterBotMessage(_getGreeting()).then(() => {
      _setState('idle');
      _input.focus();
    });
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

  let _typeAbort = false;

  /* Mensaje bot instantáneo (para HTML rico: tarjetas de proyecto/skill) */
  function _addBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    msg.innerHTML = `<div class="jotai-msg__bubble">${html}</div>`;
    _chat.appendChild(msg);
    _chat.scrollTop = _chat.scrollHeight;
  }

  /* Efecto de escritura carácter a carácter para texto plano */
  function _typewriterBotMessage(text) {
    _typeAbort = false;
    const msg    = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    const bubble = document.createElement('div');
    bubble.className = 'jotai-msg__bubble';
    msg.appendChild(bubble);
    _chat.appendChild(msg);
    _chat.scrollTop = _chat.scrollHeight;

    // Sin animación si prefers-reduced-motion
    if (_reduced) {
      bubble.innerHTML = _md(text);
      return Promise.resolve();
    }

    return new Promise(res => {
      let i = 0;
      const iv = setInterval(() => {
        if (_typeAbort || i >= text.length) {
          clearInterval(iv);
          bubble.innerHTML = _md(text); // render markdown completo al terminar
          _chat.scrollTop  = _chat.scrollHeight;
          res();
          return;
        }
        bubble.textContent = text.slice(0, ++i);
        _chat.scrollTop    = _chat.scrollHeight;
      }, TYPEWRITER_MS);
    });
  }

  /* Oculta el hint de texto libre tras el primer mensaje */
  function _hideHint() {
    document.getElementById('jotai-hint')?.classList.add('gone');
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
          _setState('talking');
          _typewriterBotMessage('¡Tour completado! ¿Tienes alguna pregunta sobre el portfolio?')
            .then(() => { _setState('success'); setTimeout(() => _setState('idle'), 2000); });
        }, 300);
      },
    });
  }

  /* ── QUERY HANDLING ─────────────────────────────────────────── */

  async function _handleSend() {
    const val = _input.value.trim();
    if (!val || _sendBtn.disabled) return;
    _input.value    = '';
    _sendBtn.disabled = true;
    _typeAbort      = true; // interrumpe cualquier typewriter en curso

    _addUserMessage(val);
    _hideHint();
    _setState('thinking');
    _setStatus('Pensando…');
    _addLoadingDots();

    // 1. Keywords / intent (síncrono, siempre disponible)
    const kwResult  = IAAssistant.query(val);
    const isSpecial = kwResult?.type === 'special';
    let finalResult = kwResult;

    if (!isSpecial && _workerReady) {
      // 2. Semántica via worker
      const semResults = await _semanticQuery(val);
      const topSem     = semResults.find(r => r.score >= SEMANTIC_THRESHOLD);
      if (topSem) finalResult = { type: topSem.type, data: topSem.data };
    } else if (!isSpecial && !_workerReady) {
      await new Promise(r => setTimeout(r, 420 + Math.random() * 250));
    }

    _removeLoadingDots();

    if (finalResult) {
      if (finalResult.type === 'special') {
        // Texto plano (perfil, listas, contacto) → typewriter
        _setState('talking');
        await _typewriterBotMessage(finalResult.text);
        _setState('success');
      } else {
        // Tarjeta rica (proyecto / skill) → HTML instantáneo
        _addBotMessage(_buildResultHTML(finalResult));
        _setState('success');
      }
    } else {
      _setState('talking');
      await _typewriterBotMessage(
        'No encontré resultados. Prueba con un proyecto (UBApp, LLM Observatory…) ' +
        'o una tecnología (Django, React, Docker…).'
      );
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

  /* ── VIDA DEL MASCOT ────────────────────────────────────────── */

  const _ALL_STATES = ['idle','greeting','listening','thinking','talking','success','confused','pointing'];

  // Mouth path por estado
  const _MOUTH = {
    success:  'M85 138 Q100 156 115 138',
    confused: 'M93 144 Q100 139 107 144',
    thinking: 'M93 143 L107 143',
    _default: 'M89 141 Q100 150 111 141',
  };

  function _blink(el) {
    if (_reduced || !el) return;
    el.classList.add('is-blinking');
    setTimeout(() => el.classList.remove('is-blinking'), 150);
    // Doble parpadeo ocasional (22 %)
    if (Math.random() < 0.22) {
      setTimeout(() => {
        el.classList.add('is-blinking');
        setTimeout(() => el.classList.remove('is-blinking'), 150);
      }, 260);
    }
  }

  function _setLook(el, x, y) {
    if (!el) return;
    el.querySelectorAll('.jotai-pupil-grp').forEach(g => {
      g.style.setProperty('--px', x + 'px');
      g.style.setProperty('--py', y + 'px');
    });
  }

  function _startLife(el) {
    if (_reduced || !el) return;

    // Parpadeo aleatorio con doble parpadeo ocasional
    (function blinkLoop() {
      const t = 2200 + Math.random() * 4200;
      setTimeout(() => { _blink(el); blinkLoop(); }, t);
    })();

    // Mirada errante en reposo
    (function lookLoop() {
      const t = 2400 + Math.random() * 2600;
      setTimeout(() => {
        const widget = document.getElementById('jotai-widget');
        const isIdle = !widget || widget.dataset.jotaiState === 'idle';
        if (isIdle && !el._tracking) {
          const x = +(Math.random() * 5 - 2.5).toFixed(1);
          const y = +(Math.random() * 4 - 2).toFixed(1);
          _setLook(el, x, y);
          setTimeout(() => {
            if (!widget || widget.dataset.jotaiState === 'idle') _setLook(el, 0, 0);
          }, 1100);
        }
        lookLoop();
      }, t);
    })();
  }

  function _initCursorTracking(svgEl) {
    if (!_panel || !svgEl) return;
    _panel.addEventListener('pointermove', e => {
      if (_reduced) return;
      svgEl._tracking = true;
      const r  = svgEl.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height * 0.45;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const max = 3.4, f = Math.min(1, dist / 130);
      _setLook(svgEl, (dx / dist) * max * f, (dy / dist) * max * f);
    }, { passive: true });
    _panel.addEventListener('pointerleave', () => {
      svgEl._tracking = false;
      _setLook(svgEl, 0, 0);
    });
  }

  /* ── STATE MACHINE (CSS classes) ──────────────────────────── */

  function _setState(state) {
    _state = state;
    const widget = document.getElementById('jotai-widget');
    if (!widget) return;

    // CSS state classes → afectan ambas instancias del mascot
    _ALL_STATES.forEach(s => widget.classList.remove('is-' + s));
    widget.classList.add('is-' + state);
    widget.setAttribute('data-jotai-state', state);

    // Actualiza boca en todas las instancias
    const d = _MOUTH[state] || _MOUTH._default;
    widget.querySelectorAll('.jotai-mouth-path').forEach(m => m.setAttribute('d', d));
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

    // Termina el worker limpiamente al salir de la página
    window.addEventListener('beforeunload', () => {
      _worker?.terminate();
    });
  }

  return { init, openPanel, closePanel, setState: _setState };
})();
