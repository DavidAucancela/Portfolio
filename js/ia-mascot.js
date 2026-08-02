/**
 * ia-mascot.js — JotAI widget flotante
 * Presencia: speech bubbles efímeras (ia-bubble.js) — entrada con peek
 *            "solo cabeza" + bienvenida 1×/sesión, nudges contextuales
 *            con cooldown y reacciones a eventos del portfolio.
 * Conversación: panel de chat bajo demanda (clic en el avatar) con
 *            typewriter y motor de embeddings via Web Worker (ia-worker.js).
 * Vida: blink, mirada errante, cursor tracking y 8 estados CSS.
 */

import { IAAssistant } from './ia-assistant.js';
import { IaTour }      from './ia-tour.js';
import { IaBubble }    from './ia-bubble.js';

/* ── CONFIGURACIÓN ────────────────────────────────────────────── */

const MASCOT_NAME    = 'JotAI';
const TYPEWRITER_MS  = 14;   // ms por carácter en el efecto de escritura

/**
 * MASCOT_RENDER — cambia aquí para alternar entre modos:
 *   'image'  → robot 3D (WebP/PNG, fondo transparente) + overlays vectoriales
 *   'svg'    → blob vectorial puro (fallback sin asset externo)
 */
const MASCOT_RENDER = 'image';

/**
 * Renders 3D por modo (accesorio integrado en el render — ver docs/jotai-renders.md).
 * Si el archivo del modo no existe aún, se usa BODY_FALLBACK_SRC + overlays SVG.
 * Mantener la misma pose/encuadre que body.png (307×660) para que los
 * párpados/pupilas/boca vectoriales sigan alineados.
 */
const MODE_BODY_SRC = {
  dev: 'public/images/jotai/body-dev.webp',
  ia:  'public/images/jotai/body-ia.webp',
  sec: 'public/images/jotai/body-sec.webp',
};
const BODY_FALLBACK_SRC = 'public/images/jotai/body.webp';

/* ── SVG DEL MASCOT ───────────────────────────────────────────── */

/** Dispatcher — selecciona render según MASCOT_RENDER */
function _buildSVG(prefix) {
  return MASCOT_RENDER === 'image'
    ? _buildSVGImage(prefix)
    : _buildSVGVector(prefix);
}

/* ── MODO IMAGE: robot 3D con su cara propia (sin overlays de cara) ──
   El PNG ya trae ojos y boca pintados → no se dibujan vectoriales encima.
   Encuadre a CABEZA+TORSO: la imagen se escala 200×430 y el clipPath
   recorta las piernas (viewBox 0 0 200 200). Solo quedan las decoraciones
   de estado (puntos / chispa / ?) junto a la cabeza.
   Geometría del asset: 307×660px. Calibrar `y`/`height` si cambia. */

function _buildSVGImage(prefix) {
  const p = prefix || 'j';

  return `<svg class="jotai-mascot" viewBox="0 0 200 200"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="${p}crop"><rect x="0" y="0" width="200" height="200"/></clipPath>
    <!-- Párpado metálico (tono del entrecejo del render) -->
    <linearGradient id="${p}lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#8c8579"/>
      <stop offset="100%" stop-color="#6e675d"/>
    </linearGradient>
    <!-- Glow de pupila desplazable sobre el LED del ojo -->
    <radialGradient id="${p}pup" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#e8fdff" stop-opacity="0.95"/>
      <stop offset="55%"  stop-color="#9fe8ff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#9fe8ff" stop-opacity="0"/>
    </radialGradient>
    <!-- Parche color cara que enmascara la sonrisa horneada del PNG -->
    <linearGradient id="${p}face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#9a8d80"/>
      <stop offset="100%" stop-color="#877b6e"/>
    </linearGradient>
  </defs>

  <!-- Grupo estático con el recorte: estable aunque la criatura respire/incline -->
  <g clip-path="url(#${p}crop)">
    <g class="jotai-creature">
      <g class="jotai-tilt">

        <!-- Cuerpo 3D con su cara propia. 200×430 → piernas recortadas por el clip -->
        <image class="jotai-body-img"
               href="public/images/jotai/body.webp"
               x="0" y="8" width="200" height="430"
               preserveAspectRatio="xMidYMid meet"/>

        <!-- Orejas invisibles — preservan el contrato CSS de estados animados -->
        <path class="jotai-ear jotai-ear-l" opacity="0"
              d="M83 92 C72 77 70 53 77 41 C84 49 88 73 88 91 Z"/>
        <path class="jotai-ear jotai-ear-r" opacity="0"
              d="M117 92 C128 77 130 53 123 41 C116 49 112 73 112 91 Z"/>

        <!-- ── CARA VIVA (overlays alineados a los ojos del render) ──
             Ojos LED: izq(62,73) der(135,69). Pupilas bajo los párpados;
             los accesorios de modo se dibujan después (encima). -->
        <g class="jotai-face">
          <!-- Glow de pupila — sigue --px/--py (mirada errante / cursor) -->
          <g class="jotai-pupil-grp">
            <circle cx="62" cy="73" r="7.5" fill="url(#${p}pup)"/>
          </g>
          <g class="jotai-pupil-grp">
            <circle cx="135" cy="69" r="7.5" fill="url(#${p}pup)"/>
          </g>

          <!-- Párpados: cerrados = scaleY(1) via .is-blinking (contrato CSS) -->
          <ellipse class="jotai-lid" cx="63.5" cy="74.5" rx="21.5" ry="19.5"
                   fill="url(#${p}lid)" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>
          <ellipse class="jotai-lid" cx="136.5" cy="70.5" rx="21.5" ry="19.5"
                   fill="url(#${p}lid)" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>

          <!-- Boca vectorial sobre la sonrisa horneada (centro ≈ 109,112).
               El parche difuminado (CSS blur) tapa la boca del PNG para que
               los estados (recta/confusa/sonrisa) no se dupliquen. -->
          <ellipse class="jotai-mouth-mask" cx="109.5" cy="112" rx="15" ry="9"
                   fill="url(#${p}face)"/>
          <path class="jotai-mouth-path"
                d="M100 108 Q109 117 119 107"
                fill="none" stroke="#1f1a17" stroke-width="3.4"
                stroke-linecap="round"/>
        </g>

        <!-- Think ring (visible en .is-thinking) -->
        <circle class="jotai-think-ring" cx="100" cy="85" r="55" stroke-width="2" opacity="0.6"/>

        <!-- ── ACCESORIOS POR MODO ────────────────────────────── -->
        <!-- Ojos: izq(62,73) der(135,69) — tilt manual en y, sin transform -->

        <!-- .dev — gafas redondas doradas estilo nerd -->
        <g class="jotai-acc jotai-acc--dev">
          <!-- Patilla izquierda -->
          <line x1="36" y1="71" x2="20" y2="65" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
          <!-- Patilla derecha -->
          <line x1="161" y1="67" x2="177" y2="61" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
          <!-- Lente izquierda -->
          <circle cx="62" cy="73" r="26"
                  fill="rgba(251,191,36,0.38)" stroke="#92400e" stroke-width="5"/>
          <!-- Lente derecha (4px más alto por tilt) -->
          <circle cx="135" cy="69" r="26"
                  fill="rgba(251,191,36,0.38)" stroke="#92400e" stroke-width="5"/>
          <!-- Puente -->
          <path d="M88 71 C93 65 102 63 109 67"
                stroke="#92400e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <!-- Brillo izquierda -->
          <line x1="48" y1="62" x2="60" y2="57" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round"/>
          <!-- Brillo derecha -->
          <line x1="121" y1="58" x2="133" y2="53" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round"/>
        </g>

        <!-- .ia — ojos AI con scan rings + red neural flotante -->
        <g class="jotai-acc jotai-acc--ia">
          <!-- Anillo exterior teal ojo izquierdo -->
          <ellipse cx="62" cy="73" rx="32" ry="29"
                   fill="rgba(6,255,165,0.08)" stroke="#06ffa5" stroke-width="2.5" class="jotai-scan-outer"/>
          <!-- Anillo interior púrpura ojo izquierdo (pulsa) -->
          <ellipse cx="62" cy="73" rx="24" ry="21"
                   fill="rgba(177,78,255,0.32)" stroke="#b14eff" stroke-width="3.5" class="jotai-halo"/>
          <!-- Crosshair ojo izquierdo -->
          <line x1="62" y1="55" x2="62" y2="91" stroke="#06ffa5" stroke-width="1.8" opacity="0.75"/>
          <line x1="44" y1="73" x2="80" y2="73" stroke="#06ffa5" stroke-width="1.8" opacity="0.75"/>

          <!-- Anillo exterior teal ojo derecho -->
          <ellipse cx="135" cy="69" rx="32" ry="29"
                   fill="rgba(6,255,165,0.08)" stroke="#06ffa5" stroke-width="2.5" class="jotai-scan-outer"/>
          <!-- Anillo interior púrpura ojo derecho -->
          <ellipse cx="135" cy="69" rx="24" ry="21"
                   fill="rgba(177,78,255,0.32)" stroke="#b14eff" stroke-width="3.5"/>
          <!-- Crosshair ojo derecho -->
          <line x1="135" y1="51" x2="135" y2="87" stroke="#06ffa5" stroke-width="1.8" opacity="0.75"/>
          <line x1="117" y1="69" x2="153" y2="69" stroke="#06ffa5" stroke-width="1.8" opacity="0.75"/>

          <!-- Red neural flotante sobre la cabeza -->
          <!-- Nodo central -->
          <circle cx="99" cy="28" r="6" fill="#b14eff" stroke="#06ffa5" stroke-width="2"/>
          <!-- Nodos satélite -->
          <circle cx="62"  cy="38" r="4" fill="#06ffa5"/>
          <circle cx="136" cy="35" r="4" fill="#06ffa5"/>
          <circle cx="78"  cy="22" r="3" fill="#b14eff" opacity="0.9"/>
          <circle cx="120" cy="20" r="3" fill="#b14eff" opacity="0.9"/>
          <!-- Conexiones -->
          <line x1="66"  y1="38" x2="93"  y2="30" stroke="#06ffa5" stroke-width="2" opacity="0.7"/>
          <line x1="132" y1="35" x2="105" y2="30" stroke="#06ffa5" stroke-width="2" opacity="0.7"/>
          <line x1="80"  y1="22" x2="93"  y2="26" stroke="#b14eff" stroke-width="1.5" opacity="0.6"/>
          <line x1="118" y1="20" x2="105" y2="26" stroke="#b14eff" stroke-width="1.5" opacity="0.6"/>
          <line x1="64"  y1="36" x2="76"  y2="24" stroke="#06ffa5" stroke-width="1.5" opacity="0.5"/>
          <line x1="134" y1="33" x2="122" y2="21" stroke="#06ffa5" stroke-width="1.5" opacity="0.5"/>
        </g>

        <!-- .sec — Terminator: ojo rojo + vigilancia verde + scan lines -->
        <g class="jotai-acc jotai-acc--sec">

          <!-- Scan lines horizontales estilo CRT/terminal sobre la cara -->
          <line x1="30" y1="50" x2="168" y2="50" stroke="#00ff41" stroke-width="1.5" opacity="0.22"/>
          <line x1="30" y1="60" x2="168" y2="60" stroke="#00ff41" stroke-width="1.5" opacity="0.22"/>
          <line x1="30" y1="70" x2="168" y2="70" stroke="#00ff41" stroke-width="2"   opacity="0.35"/>
          <line x1="30" y1="80" x2="168" y2="80" stroke="#00ff41" stroke-width="2"   opacity="0.35"/>
          <line x1="30" y1="90" x2="168" y2="90" stroke="#00ff41" stroke-width="1.5" opacity="0.22"/>
          <line x1="30" y1="100" x2="168" y2="100" stroke="#00ff41" stroke-width="1.5" opacity="0.18"/>
          <!-- Barra de scan animada -->
          <rect x="30" y="44" width="138" height="6" rx="0"
                fill="rgba(0,255,65,0.18)" class="jotai-scanbar"/>

          <!-- Ojo derecho — TERMINATOR (rojo, concéntrico, crosshair) -->
          <!-- Glow exterior -->
          <circle cx="135" cy="69" r="34"
                  fill="rgba(220,0,0,0.18)" stroke="none"/>
          <!-- Iris rojo -->
          <circle cx="135" cy="69" r="28"
                  fill="rgba(180,0,0,0.82)" stroke="#ff2200" stroke-width="4"/>
          <!-- Iris medio -->
          <circle cx="135" cy="69" r="18"
                  fill="rgba(255,40,0,0.7)" stroke="#ff4400" stroke-width="2"/>
          <!-- Pupila -->
          <circle cx="135" cy="69" r="9"
                  fill="#ff6600" opacity="0.95"/>
          <!-- Crosshair Terminator -->
          <line x1="135" y1="44" x2="135" y2="94" stroke="rgba(255,100,0,0.85)" stroke-width="2"/>
          <line x1="110" y1="69" x2="160" y2="69" stroke="rgba(255,100,0,0.85)" stroke-width="2"/>
          <!-- Anillo de targeting -->
          <circle cx="135" cy="69" r="22"
                  fill="none" stroke="#ff6600" stroke-width="1.5" opacity="0.6"
                  stroke-dasharray="6 4"/>

        </g>

        <!-- Decoraciones de estado, junto a la cabeza (arriba-derecha) -->
        <g class="jotai-think-dots">
          <circle cx="150" cy="30" r="3.4" fill="var(--color-accent,#06ffa5)"/>
          <circle cx="162" cy="23" r="3.4" fill="var(--color-accent,#06ffa5)"/>
          <circle cx="173" cy="18" r="3.4" fill="var(--color-accent,#06ffa5)"/>
        </g>

        <!-- Spark (is-success) -->
        <path class="jotai-spark"
              d="M163 11 l2.8 7 7 2.8 -7 2.8 -2.8 7 -2.8 -7 -7 -2.8 7 -2.8 z"
              fill="var(--color-accent,#06ffa5)"/>

        <!-- Signo de pregunta (is-confused) -->
        <text class="jotai-qmark" x="150" y="38"
              font-size="22" font-weight="800" font-family="monospace"
              fill="var(--color-accent,#06ffa5)">?</text>

      </g>
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

      <!-- Think ring (visible en .is-thinking) -->
      <circle class="jotai-think-ring" cx="100" cy="100" r="60" stroke-width="1.5" opacity="0.6"/>

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

const SEMANTIC_THRESHOLD = 0.10; // piso de inclusión en pool para rankHybrid (Fase C)

/* Bienvenida de entrada — 1× por sesión */
const WELCOME_TEXT = '¡Bienvenido! Soy JotAI y estoy aquí para guiarte.';
const WELCOME_KEY  = 'jotai-welcomed';

/* Nudges contextuales — sutiles, con cooldown y presupuesto por sesión */
const NUDGE_DWELL_MS    = 8000;   // tiempo en una sección antes del tip
const NUDGE_COOLDOWN_MS = 45000;  // silencio mínimo entre globos (global)
const NUDGE_MAX_SESSION = 3;      // tope de nudges por sesión
const NUDGE_SEEN_KEY    = 'jotai-nudge-seen';
const NUDGE_COUNT_KEY   = 'jotai-nudge-count';

const SECTION_TIPS = {
  about:    '¿Quieres el resumen rápido del perfil? Haz clic en mí y pregúntame.',
  projects: 'Haz clic en cualquier card para ver el proceso completo del proyecto.',
  skills:   'Pregúntame por cualquier tecnología y te digo dónde la usó Jonathan.',
  contact:  '¿Un proyecto en mente? El formulario llega directo a Jonathan.',
};

const MODE_HELLO = {
  dev: 'Modo .dev — sistemas full-stack en producción.',
  ia:  'Modo .ia — proyectos con LLMs, RAG y embeddings.',
  sec: 'Modo .sec — labs de HackTheBox y seguridad.',
};

/* Microcopy variado para estado "pensando" (Fase E) */
const THINKING_MESSAGES = [
  'Pensando…',
  'Un momento…',
  'Procesando…',
  'Analizando…',
  'Buscando…',
  'Consultando…',
  'Investigando…',
];

export const IaMascot = (() => {
  /* UI refs */
  let _panel      = null;
  let _trigger    = null;
  let _chat       = null;
  let _input      = null;
  let _sendBtn    = null;
  let _isOpen     = false;
  let _state      = 'idle';
  let _reduced    = false;
  let _hasGreeted = false;
  let _prevFocus  = null;

  /* Contexto de conversación (Fase C) */
  let _context = {
    turns: [],
    lastProjectId: null,
    lastSkillName: null,
    lastCategory: null,
  };
  const CONTEXT_MAX = 3;

  /* Worker state */
  let _worker       = null;
  let _workerReady  = false;
  let _workerInit   = false;
  let _pendingKB    = null;  // KB diferida en touch: se inicia al abrir el chat
  let _queryId      = 0;
  const _pending    = new Map(); // id → { resolve, timer }

  /* Métricas locales (Fase E) — ring-buffer en localStorage */
  const METRICS_KEY = 'jotai-metrics';
  const METRICS_MAX = 200;

  function _logEvent(event) {
    try {
      const metrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
      metrics.push({
        ...event,
        timestamp: new Date().toISOString(),
      });
      // Ring-buffer: mantener solo los últimos METRICS_MAX eventos
      if (metrics.length > METRICS_MAX) {
        metrics.splice(0, metrics.length - METRICS_MAX);
      }
      localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (e) {
      // Ignorar errores de storage
    }
  }

  function _getMetrics() {
    try {
      return JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function _clearMetrics() {
    localStorage.removeItem(METRICS_KEY);
  }

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

  /**
   * Llama a api/jotai-chat.js (Gemini server-side) para generar la respuesta
   * de fallback. Devuelve null ante cualquier error/timeout — el caller cae
   * al mensaje enlatado local (_buildCannedFallback).
   */
  async function _askGeminiFallback(query, fallbackResult) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('/api/jotai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ query, context: fallbackResult }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null;
    } catch {
      return null; // red caída, timeout, JSON inválido, etc.
    } finally {
      clearTimeout(timer);
    }
  }

  /** Mensaje de fallback local (3 niveles) — red de seguridad si Gemini falla. */
  function _buildCannedFallback(fallbackResult, val) {
    if (fallbackResult.level === 1) {
      // Nivel 1: encontró con query expandida
      const best = fallbackResult.candidates[0];
      return `Hmm, no lo encontré literal, pero creo que buscas algo relacionado con **${best.data.name || best.data.title}**. ¿Es eso?`;
    }
    if (fallbackResult.level === 2) {
      // Nivel 2: encontró por categoría/tags
      const cats = fallbackResult.candidates.map(c => c.data.name || c.data.title).join(', ');
      return `No encontré exactamente eso, pero Jonathan trabaja con **${cats}**. ¿Quizás uno de estos?`;
    }
    // Nivel 3: exploratoria (sin candidatos técnicos)
    const projNames = fallbackResult.featuredProjects
      .map(p => p.data.title)
      .join(', ') || 'varios proyectos';
    return `No encontré "**${val}**" en su portfolio. Pero Jonathan trabaja en **${projNames}** y otros. ¿Quieres saber más?`;
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

        <div class="jotai-swipe-handle" aria-hidden="true"></div>

        <div id="jotai-panel-header">
          <button id="jotai-tour-btn" aria-label="Iniciar tour del portfolio">
            Tour 🗺
          </button>
          <button id="jotai-commands-btn" aria-label="Ver lista de comandos">
            Comandos 📋
          </button>
          <button id="jotai-panel-close" aria-label="Cerrar asistente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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

        <div class="jotai-char-counter" id="jotai-char-counter" aria-live="polite"></div>

        <div id="jotai-input-wrap">
          <textarea
            id="jotai-input"
            placeholder="Pregúntame algo…"
            maxlength="200"
            autocomplete="off"
            rows="1"
            aria-label="Escribe tu pregunta para ${MASCOT_NAME}"
          ></textarea>
          <button id="jotai-send" aria-label="Enviar pregunta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <!-- Modal de Comandos con Tabs -->
        <div id="jotai-commands-modal" hidden class="jotai-commands-modal">
          <div class="jotai-commands-content">
            <div class="jotai-commands-header">
              <div class="jotai-commands-tabs">
                <button class="jotai-commands-tab active" data-tab="info" aria-label="Información">Info</button>
                <button class="jotai-commands-tab" data-tab="projects" aria-label="Proyectos">Proyectos</button>
                <button class="jotai-commands-tab" data-tab="skills" aria-label="Skills">Skills</button>
              </div>
              <button id="jotai-commands-close" aria-label="Cerrar comandos">✕</button>
            </div>
            <div class="jotai-commands-list">
              <!-- Tab: Información -->
              <div class="jotai-commands-group active" data-group="info">
                <button class="jotai-command-item" data-cmd="quien eres">quien eres</button>
                <button class="jotai-command-item" data-cmd="experiencia laboral">experiencia laboral</button>
                <button class="jotai-command-item" data-cmd="donde estudias">donde estudias</button>
                <button class="jotai-command-item" data-cmd="como contactar">como contactar</button>
              </div>
              <!-- Tab: Proyectos -->
              <div class="jotai-commands-group hidden" data-group="projects">
                <button class="jotai-command-item" data-cmd="todos los proyectos">todos los proyectos</button>
                <button class="jotai-command-item" data-cmd="ubapp">ubapp</button>
                <button class="jotai-command-item" data-cmd="llm observabilidad">llm observabilidad</button>
                <button class="jotai-command-item" data-cmd="anaos">anaos</button>
                <button class="jotai-command-item" data-cmd="mindlog">mindlog</button>
              </div>
              <!-- Tab: Skills -->
              <div class="jotai-commands-group hidden" data-group="skills">
                <button class="jotai-command-item" data-cmd="que sabes">que sabes</button>
                <button class="jotai-command-item" data-cmd="react">react</button>
                <button class="jotai-command-item" data-cmd="postgres">postgres</button>
                <button class="jotai-command-item" data-cmd="django">django</button>
                <button class="jotai-command-item" data-cmd="docker">docker</button>
                <button class="jotai-command-item" data-cmd="claude">claude</button>
              </div>
            </div>
          </div>
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

    /* Globo de diálogo efímero anclado al trigger */
    IaBubble.init(widget, {
      onTalkStart: () => _setState('talking'),
      onTalkEnd:   mood => {
        if (mood && _ALL_STATES.includes(mood)) {
          _setState(mood);
          setTimeout(() => { if (!_isOpen) _setState('idle'); }, 1800);
        } else {
          _setState('idle');
        }
      },
    });

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
    widget.querySelector('#jotai-commands-btn').addEventListener('click', _toggleCommandsModal);
    widget.querySelector('#jotai-commands-close').addEventListener('click', _closeCommandsModal);
    // Tabs listener
    widget.querySelectorAll('.jotai-commands-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        const targetTab = e.target.getAttribute('data-tab');
        _switchCommandsTab(widget, targetTab);
      });
    });
    // Delegated listener para items de comando
    widget.querySelector('.jotai-commands-list').addEventListener('click', e => {
      if (e.target.classList.contains('jotai-command-item')) {
        const cmd = e.target.getAttribute('data-cmd');
        _closeCommandsModal();
        _handleSend(cmd);
      }
    });
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

    /* Autosize textarea */
    _input.addEventListener('input', () => {
      _input.style.height = 'auto';
      _input.style.height = Math.min(_input.scrollHeight, 80) + 'px';
    });

    /* Char counter */
    _input.addEventListener('input', () => {
      const counter = document.getElementById('jotai-char-counter');
      if (!counter) return;
      const remaining = 200 - _input.value.length;
      if (remaining <= 40) {
        counter.textContent = `${remaining} caracteres restantes`;
        counter.classList.add('is-visible');
        counter.classList.toggle('is-warning', remaining <= 15);
      } else {
        counter.classList.remove('is-visible');
      }
    });

    /* Swipe-to-close mobile */
    let _swipeStartY = 0;
    let _swipeDelta  = 0;
    _panel.addEventListener('touchstart', e => {
      _swipeStartY = e.touches[0].clientY;
      _swipeDelta  = 0;
    }, { passive: true });
    _panel.addEventListener('touchmove', e => {
      _swipeDelta = e.touches[0].clientY - _swipeStartY;
      if (_swipeDelta > 0 && _chat.scrollTop <= 0) {
        const resistance = Math.min(_swipeDelta * 0.45, 70);
        _panel.style.transform = `translateY(${resistance}px)`;
        _panel.style.opacity   = String(Math.max(0.4, 1 - _swipeDelta / 250));
      }
    }, { passive: true });
    _panel.addEventListener('touchend', () => {
      if (_swipeDelta > 80 && _chat.scrollTop <= 0) {
        _panel.style.transform = '';
        _panel.style.opacity   = '';
        closePanel();
      } else {
        _panel.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        _panel.style.transform  = '';
        _panel.style.opacity    = '';
        setTimeout(() => { _panel.style.transition = ''; }, 200);
      }
      _swipeDelta = 0;
    });

    /* Focus trap + Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _isOpen) { closePanel(); return; }
      if (e.key !== 'Tab' || !_isOpen) return;
      const focusables = Array.from(_panel.querySelectorAll(
        'button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

  }

  /* ── PANEL OPEN / CLOSE ─────────────────────────────────────── */

  function _togglePanel() {
    _isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    if (_isOpen) return;
    _isOpen = true;
    if (_pendingKB) {
      _initWorker(_pendingKB); // touch: descarga del modelo diferida hasta aquí
      _pendingKB = null;
    }
    IaBubble.clear(); // la conversación reemplaza a los globos
    _prevFocus = document.activeElement;
    _panel.hidden = false;
    _trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => _scrollToBottom(true));

    if (!_reduced) {
      _panel.classList.remove('is-closing');
      _panel.classList.add('is-opening');
      setTimeout(() => _panel.classList.remove('is-opening'), 360);
    }

    _setState('greeting');
    if (!_hasGreeted) {
      _hasGreeted = true;
      _typewriterBotMessage(_getGreeting()).then(() => {
        _setState('idle');
        _addEmptyStateChips();
        _input.focus();
      });
    } else {
      setTimeout(() => { if (_isOpen && _state === 'greeting') _setState('idle'); }, 900);
      _input.focus();
    }
  }

  function closePanel() {
    if (!_isOpen) return;
    _isOpen = false;
    _trigger.setAttribute('aria-expanded', 'false');
    _setState('idle');

    if (!_reduced) {
      _panel.classList.add('is-closing');
      setTimeout(() => {
        _panel.classList.remove('is-closing');
        if (!_isOpen) _panel.hidden = true; // guarda: pudo reabrirse durante el cierre
      }, 180);
    } else {
      _panel.hidden = true;
    }

    _prevFocus?.focus();
  }

  /* ── COMMANDS MODAL ──────────────────────────────────────────── */

  function _toggleCommandsModal() {
    const modal = document.getElementById('jotai-commands-modal');
    if (modal.hidden) {
      modal.hidden = false;
      modal.focus();
    } else {
      _closeCommandsModal();
    }
  }

  function _closeCommandsModal() {
    const modal = document.getElementById('jotai-commands-modal');
    modal.hidden = true;
  }

  function _switchCommandsTab(widget, tabName) {
    // Desactivar todos los tabs y grupos
    widget.querySelectorAll('.jotai-commands-tab').forEach(t => t.classList.remove('active'));
    widget.querySelectorAll('.jotai-commands-group').forEach(g => g.classList.add('hidden'));
    // Activar el tab seleccionado
    widget.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    widget.querySelector(`[data-group="${tabName}"]`).classList.remove('hidden');
  }

  /* ── GREETING ───────────────────────────────────────────────── */

  function _getGreeting() {
    return `¡Hola! Soy **${MASCOT_NAME}**, el asistente de Jonathan. Puedo contarte sobre sus proyectos, tecnologías y experiencia. ¿Qué quieres saber?`;
  }

  /* ── MESSAGES ───────────────────────────────────────────────── */

  let _typeAbort = false;

  function _scrollToBottom(force = false) {
    if (!_chat) return;
    const nearBottom = (_chat.scrollHeight - _chat.scrollTop - _chat.clientHeight) < 100;
    if (force || nearBottom) _chat.scrollTop = _chat.scrollHeight;
  }

  function _getTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  /* Mensaje bot instantáneo (para HTML rico: tarjetas de proyecto/skill) */
  function _addBotMessage(html) {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    msg.innerHTML = `<div class="jotai-msg__bubble">${html}</div><div class="jotai-msg__time">${_getTimeStr()}</div>`;
    _chat.appendChild(msg);
    _scrollToBottom();
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
    _scrollToBottom();

    // Sin animación si prefers-reduced-motion
    if (_reduced) {
      bubble.innerHTML = _md(text);
      const timeEl = document.createElement('div');
      timeEl.className = 'jotai-msg__time';
      timeEl.textContent = _getTimeStr();
      msg.appendChild(timeEl);
      return Promise.resolve();
    }

    return new Promise(res => {
      let i = 0;
      const iv = setInterval(() => {
        if (_typeAbort || i >= text.length) {
          clearInterval(iv);
          bubble.innerHTML = _md(text);
          const timeEl = document.createElement('div');
          timeEl.className = 'jotai-msg__time';
          timeEl.textContent = _getTimeStr();
          msg.appendChild(timeEl);
          _scrollToBottom();
          res();
          return;
        }
        bubble.textContent = text.slice(0, ++i);
        _scrollToBottom();
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
    msg.innerHTML = `<div class="jotai-msg__bubble">${_esc(text)}</div><div class="jotai-msg__time">${_getTimeStr()}</div>`;
    _chat.appendChild(msg);
    _scrollToBottom();
  }

  function _addLoadingDots() {
    const msg = document.createElement('div');
    msg.className = 'jotai-msg jotai-msg--bot';
    msg.id = 'jotai-loading-msg';
    msg.innerHTML = `<div class="jotai-msg__bubble"><div class="jotai-dots"><span></span><span></span><span></span></div></div>`;
    _chat.appendChild(msg);
    _scrollToBottom();
  }

  function _removeLoadingDots() {
    document.getElementById('jotai-loading-msg')?.remove();
  }

  /* ── QUICK REPLY CHIPS ──────────────────────────────────────── */

  function _removeChips() {
    document.getElementById('jotai-chips')?.remove();
  }

  function _addChips(chips) {
    _removeChips();
    if (!chips?.length) return;
    const container = document.createElement('div');
    container.className = 'jotai-chips';
    container.id = 'jotai-chips';
    chips.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'jotai-chip';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        _removeChips();
        _handleSend(label);
      });
      container.appendChild(btn);
    });
    const inputWrap = document.getElementById('jotai-input-wrap');
    _panel.insertBefore(container, inputWrap);
  }

  function _getSuggestedChips(result) {
    if (!result) return [];

    // Fase D: usar chipContext estructurado si existe
    if (result.chipContext && result.chipContext.chips) {
      return result.chipContext.chips.slice(0, 3);
    }

    if (result.type === 'project') {
      const chips = [];
      if (result.data?.repoUrl) chips.push('Ver repositorio');
      chips.push('¿Qué stack usó?');
      chips.push('¿Cómo contactarlo?');
      return chips.slice(0, 3);
    }
    if (result.type === 'skill') {
      return ['Ver proyectos con esta skill', '¿En qué es pro?'];
    }
    if (result.type === 'special') {
      // Fallback a substrings si no hay chipContext (legacy)
      const t = result.text || '';
      if (t.includes('recientes') || t.includes('reciente')) return ['¿En qué es pro?', '¿Quién es Jonathan?'];
      if (t.includes('destacados') || t.includes('destacado')) return ['Proyectos recientes', '¿En qué es pro?', 'Todos'];
    }
    return [];
  }

  function _getConfusedChips() {
    return ['¿Quién es Jonathan?', 'Ver proyectos recientes', '¿En qué es pro?'];
  }

  function _addEmptyStateChips() {
    if (_chat.querySelectorAll('.jotai-msg--user').length > 0) return;
    const container = document.createElement('div');
    container.className = 'jotai-chips jotai-chips--empty';
    ['¿Quién es Jonathan?', 'Proyectos destacados', '¿En qué es pro?'].forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'jotai-chip';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        container.remove();
        _handleSend(label);
      });
      container.appendChild(btn);
    });
    _chat.appendChild(container);
    _scrollToBottom();
  }

  /* ── TOUR ───────────────────────────────────────────────────── */

  function _startTour() {
    closePanel();
    IaBubble.clear();
    IaTour.start({
      onState: _setState,
      onDone:  () => {
        _setState('idle');
        openPanel();
        setTimeout(() => {
          _setState('talking');
          _typewriterBotMessage('¿Te quedó alguna duda del recorrido? Pregúntame por cualquier proyecto, tecnología o modo.')
            .then(() => { _setState('success'); setTimeout(() => _setState('idle'), 2000); });
        }, 300);
      },
    });
  }

  /* ── QUERY HANDLING ─────────────────────────────────────────── */

  async function _handleSend(prefilledText = null) {
    const val = prefilledText !== null ? prefilledText : _input.value.trim();
    if (!val || _sendBtn.disabled) return;

    if (prefilledText === null) {
      _input.value = '';
      if (_input.tagName === 'TEXTAREA') _input.style.height = 'auto';
      document.getElementById('jotai-char-counter')?.classList.remove('is-visible');
    }
    _sendBtn.disabled = true;
    _typeAbort      = true;
    _removeChips();

    _addUserMessage(val);
    _hideHint();
    _setState('thinking');
    // Microcopy variado (Fase E)
    const thinkingMsg = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
    _setStatus(thinkingMsg);
    _addLoadingDots();

    // 1. Keywords / intent (síncrono, siempre disponible) — pasa contexto
    const kwResult  = IAAssistant.query(val, _context);
    const isSpecial = kwResult?.type === 'special';
    let finalResult = kwResult;

    if (!isSpecial && kwResult?.type === 'search') {
      // 2. Semántica via worker + rankHybrid (Fase C)
      if (_workerReady) {
        // Expandir query con entidades detectadas antes de mandar al worker
        const expandedText = IAAssistant.expandQuery(val);
        const semResults = await _semanticQuery(expandedText);

        // rankHybrid combina keyword candidates + semantic results con pesos
        const rankingResult = IAAssistant.rankHybrid({
          keywordCandidates: kwResult.candidates || [],
          semanticCandidates: semResults.filter(r => r.score >= SEMANTIC_THRESHOLD),
          context: _context,
        });

        if (rankingResult && rankingResult.best) {
          finalResult = { type: rankingResult.best.type, data: rankingResult.best.data };
        } else {
          finalResult = null;
        }
      } else {
        // Fallback a keyword-only si worker no está listo
        if (kwResult.candidates && kwResult.candidates.length > 0) {
          finalResult = { type: kwResult.candidates[0].type, data: kwResult.candidates[0].data };
        } else {
          finalResult = null;
        }
        await new Promise(r => setTimeout(r, 420 + Math.random() * 250));
      }
    }

    _removeLoadingDots();

    // Actualiza contexto conversacional
    _context.turns.push({ role: 'user', text: val });

    if (finalResult) {
      _context.turns.push({ role: 'bot', text: '', result: finalResult });
      if (_context.turns.length > CONTEXT_MAX * 2) _context.turns = _context.turns.slice(-CONTEXT_MAX * 2);

      // Actualizar punteros de continuidad (Fase C)
      _updateContext(finalResult);

      // Loguear evento (Fase E)
      _logEvent({
        query: val,
        matchedIntent: finalResult.type,
        hadResult: true,
        fallbackUsed: false,
      });

      const targetState = finalResult.mood === 'excited' ? 'excited' : 'success';

      if (finalResult.type === 'special') {
        if (finalResult.isHtml) {
          _addBotMessage(finalResult.text);
          _setState(targetState);
          _attachCtaHandlers();
        } else {
          _setState('talking');
          await _typewriterBotMessage(finalResult.text);
          _setState(targetState);
        }
      } else {
        _addBotMessage(_buildResultHTML(finalResult));
        _setState(targetState);
      }
      setTimeout(() => _addChips(_getSuggestedChips(finalResult)), 200);
    } else {
      _context.turns.push({ role: 'bot', text: '', result: null });
      if (_context.turns.length > CONTEXT_MAX * 2) _context.turns = _context.turns.slice(-CONTEXT_MAX * 2);

      // Loguear evento fallback (Fase E)
      _logEvent({
        query: val,
        matchedIntent: 'fallback',
        hadResult: false,
        fallbackUsed: true,
      });

      // Fallback multinivel (Fase D)
      const norm = val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const fallbackResult = IAAssistant.getFallback(norm, kwResult?.entities || []);

      _setState('talking');
      const fallbackMsg = (await _askGeminiFallback(val, fallbackResult))
        || _buildCannedFallback(fallbackResult, val);

      await _typewriterBotMessage(fallbackMsg);
      _setState('confused');
      setTimeout(() => _addChips(_getConfusedChips()), 200);
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

  /* ── CTA HANDLERS (Cambio de contexto desde respuestas) ──────── */

  function _attachCtaHandlers() {
    _chat.querySelectorAll('.jotai-result__cta').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-action');
        if (action === 'scroll-contact') {
          closePanel();
          const contactSection = document.querySelector('#contact');
          if (contactSection) {
            setTimeout(() => {
              contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        }
      });
    });
  }

  /* ── VIDA DEL MASCOT ────────────────────────────────────────── */

  const _ALL_STATES = ['idle','greeting','listening','thinking','talking','success','confused','pointing','excited'];

  // Mouth path por estado — coordenadas distintas según el render activo
  // (en modo image la boca está en la pantalla del robot, y≈56)
  const _MOUTH_VECTOR = {
    success:  'M85 138 Q100 156 115 138',
    confused: 'M93 144 Q100 139 107 144',
    thinking: 'M93 143 L107 143',
    _default: 'M89 141 Q100 150 111 141',
  };
  // Boca real del render: centro ≈ (109,112) — calibrada sobre body.png
  const _MOUTH_IMAGE = {
    success:  'M97 106 Q109 121 121 105',
    confused: 'M103 113 Q109 108 115 113',
    thinking: 'M103 111 L116 110',
    _default: 'M100 108 Q109 117 119 107',
  };
  const _MOUTH = MASCOT_RENDER === 'image' ? _MOUTH_IMAGE : _MOUTH_VECTOR;

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

  /* ── CUERPO POR MODO (render 3D con accesorio integrado) ───── */

  const _bodyProbeCache = new Map(); // src → true (existe) | false (404)

  /**
   * Cambia el asset del cuerpo según el modo. Si el render del modo existe
   * se usa y la clase `jotai-baked` oculta los overlays SVG de accesorios;
   * si no, se mantiene el cuerpo base + overlays (comportamiento anterior).
   */
  function _applyModeBody(mode) {
    if (MASCOT_RENDER !== 'image') return;
    const widget = document.getElementById('jotai-widget');
    if (!widget) return;

    const src  = MODE_BODY_SRC[mode];
    const done = ok => _swapBody(widget, ok ? src : BODY_FALLBACK_SRC, ok);

    if (!src) return done(false);
    if (_bodyProbeCache.has(src)) return done(_bodyProbeCache.get(src));

    const probe = new Image();
    probe.onload  = () => { _bodyProbeCache.set(src, true);  done(true);  };
    probe.onerror = () => { _bodyProbeCache.set(src, false); done(false); };
    probe.src = src;
  }

  function _swapBody(widget, src, baked) {
    widget.classList.toggle('jotai-baked', baked);
    widget.querySelectorAll('.jotai-body-img').forEach(img => {
      if (img.getAttribute('href') === src) return;
      if (_reduced) { img.setAttribute('href', src); return; }
      // Fade-out → swap → fade-in (transiciones en ia-mascot.css)
      img.classList.add('is-swapping');
      setTimeout(() => {
        img.setAttribute('href', src);
        img.classList.remove('is-swapping');
      }, 220);
    });
  }

  /* ── STATE MACHINE (CSS classes) ──────────────────────────── */

  function _emitParticles() {
    if (_reduced || !_trigger) return;
    const container = document.createElement('div');
    container.className = 'jotai-particles';
    for (let i = 0; i < 6; i++) {
      const span = document.createElement('span');
      span.style.setProperty('--angle', `${i * 60}deg`);
      span.style.setProperty('--dist', `${22 + Math.random() * 14}px`);
      span.style.animationDelay = `${i * 45}ms`;
      container.appendChild(span);
    }
    _trigger.style.position = 'relative';
    _trigger.appendChild(container);
    setTimeout(() => container.remove(), 900);
  }

  function _setState(state) {
    _state = state;
    const widget = document.getElementById('jotai-widget');
    if (!widget) return;

    widget.classList.add('is-state-changing');
    requestAnimationFrame(() => {
      _ALL_STATES.forEach(s => widget.classList.remove('is-' + s));
      widget.classList.add('is-' + state);
      widget.setAttribute('data-jotai-state', state);
      const d = _MOUTH[state] || _MOUTH._default;
      widget.querySelectorAll('.jotai-mouth-path').forEach(m => m.setAttribute('d', d));
      if (state === 'success' || state === 'excited') _emitParticles();
      setTimeout(() => widget.classList.remove('is-state-changing'), 80);
    });
  }

  /* ── CONTEXTO CONVERSACIONAL (Fase C) ──── */

  function _updateContext(finalResult) {
    if (!finalResult) return;
    if (finalResult.type === 'project') {
      _context.lastProjectId = finalResult.data.slug || finalResult.data.id;
      _context.lastSkillName = null;
      _context.lastCategory = null;
    } else if (finalResult.type === 'skill') {
      _context.lastSkillName = finalResult.data.name;
      _context.lastCategory = finalResult.data.category;
      _context.lastProjectId = null;
    }
    // Si es special o null, no tocar los punteros (preservar contexto de proyecto/skill previo)
  }

  /* ── ENTRADA: peek "solo cabeza" + bienvenida (1×/sesión) ──── */

  function _welcomed() {
    try { return !!sessionStorage.getItem(WELCOME_KEY); } catch { return false; }
  }
  function _markWelcomed() {
    try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch { /* privado */ }
  }

  /* Entrada: sin animación de asomo — solo el globo de bienvenida (1×/sesión).
     El avatar aparece estático en su sitio. */
  function _entrance() {
    if (_welcomed()) return;
    _markWelcomed();
    setTimeout(() => say(WELCOME_TEXT, { duration: 4500, mood: 'greeting' }), 900);
  }

  /* ── SPEECH BUBBLE (presencia proactiva) ───────────────────── */

  /**
   * Muestra un globo de diálogo efímero anclado al avatar.
   * Suprimido si el panel de chat está abierto o el tour activo.
   * opts: { duration, persist, mood, replace } — ver ia-bubble.js
   */
  function say(text, opts = {}) {
    if (_isOpen || IaTour.isActive()) return false;
    const ok = IaBubble.say(text, opts);
    if (ok) _lastSayAt = Date.now();
    return ok;
  }

  /* ── NUDGES CONTEXTUALES ───────────────────────────────────── */

  let _lastSayAt    = 0;
  const _greetedModes = new Set();
  let _lastProject  = null;

  /* Gallery, PDF modal y palette bloquean el scroll → el globo quedaría tapado */
  function _overlayBlocked() {
    return document.body.style.overflow === 'hidden';
  }

  /**
   * Lanza un nudge si nada lo impide: panel/tour/overlay cerrados, sin globo
   * activo, cooldown global cumplido, presupuesto de sesión disponible y
   * `key` no usado antes en esta sesión.
   */
  function _maybeNudge(key, text, opts = {}) {
    if (!text) return;
    if (_isOpen || IaTour.isActive() || _overlayBlocked()) return;
    if (IaBubble.isVisible()) return; // nunca encadenar globos
    if (Date.now() - _lastSayAt < NUDGE_COOLDOWN_MS) return;

    let seen = [], count = 0;
    try {
      seen  = JSON.parse(sessionStorage.getItem(NUDGE_SEEN_KEY) || '[]');
      count = +sessionStorage.getItem(NUDGE_COUNT_KEY) || 0;
    } catch { /* privado */ }
    if (count >= NUDGE_MAX_SESSION || seen.includes(key)) return;

    if (say(text, { duration: 6000, ...opts })) {
      try {
        sessionStorage.setItem(NUDGE_SEEN_KEY, JSON.stringify([...seen, key]));
        sessionStorage.setItem(NUDGE_COUNT_KEY, String(count + 1));
      } catch { /* privado */ }
    }
  }

  /* Tip de sección tras permanecer NUDGE_DWELL_MS en ella.
     Detección: banda central del viewport (rootMargin -40 %) — funciona
     también con secciones más altas que la pantalla. */
  function _initNudges() {
    if (!('IntersectionObserver' in window)) return;
    const sections = Object.keys(SECTION_TIPS)
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    let dwellTimer = null;
    let currentId  = null;

    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const id = en.target.id;
        if (en.isIntersecting) {
          if (currentId === id) return;
          currentId = id;
          clearTimeout(dwellTimer);
          dwellTimer = setTimeout(() => _maybeNudge(id, SECTION_TIPS[id]), NUDGE_DWELL_MS);
        } else if (currentId === id) {
          currentId = null;
          clearTimeout(dwellTimer);
        }
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

    sections.forEach(s => io.observe(s));
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

    _inject();

    // Inicializa boca en estado neutral al arrancar
    setTimeout(() => _setState('idle'), 0);

    // Asset del cuerpo según el modo guardado (probe = preload)
    _applyModeBody(document.body.dataset.theme || localStorage.getItem('portfolio-mode') || 'dev');

    // Secuencia de entrada: peek + globo de bienvenida (1× por sesión)
    _entrance();

    // Acceso desde consola para QA (solo en dev)
    if (import.meta.env?.DEV) window.IaMascot = { say, openPanel, closePanel, setState: _setState };

    // Cuando IAAssistant termina de cargar la KB → inicia el worker.
    // En dispositivos touch el modelo (~23MB WASM) se difiere hasta que el
    // usuario abra el chat; mientras tanto responde el fallback por keywords.
    window.addEventListener('jotai:kb-ready', ({ detail }) => {
      if (!(detail.kb?.length > 0)) return;
      if (window.matchMedia('(pointer: coarse)').matches && !_isOpen) {
        _pendingKB = detail.kb;
      } else {
        _initWorker(detail.kb);
      }
    });

    // El modo inicial no saluda (ThemeSwitcher emite modeChange al cargar
    // y pisaría al globo de bienvenida)
    _greetedModes.add(document.body.dataset.theme || localStorage.getItem('portfolio-mode') || 'dev');

    // Cambio de modo: cierra el panel + saludo temático (1× por modo)
    window.addEventListener('portfolio:modeChange', ({ detail }) => {
      if (_isOpen) closePanel();
      // El cuerpo cambia siempre — también durante el tour (cambia de modo real)
      if (detail?.mode) _applyModeBody(detail.mode);
      // El tour cambia de modo por su cuenta: ni saludar ni gastar el 1× por modo
      if (IaTour.isActive()) return;
      const mode = detail?.mode;
      if (!mode || !MODE_HELLO[mode] || _greetedModes.has(mode)) return;
      _greetedModes.add(mode);
      setTimeout(() => {
        if (_isOpen || IaTour.isActive() || _overlayBlocked()) return;
        say(MODE_HELLO[mode], { duration: 4000, replace: true });
      }, 500);
    });

    // Command palette: la palette cubre al globo → atención silenciosa
    // ('opened' es la notificación; 'open' es el canal para abrirla)
    window.addEventListener('command-palette:opened', () => {
      IaBubble.dismiss();
      if (_isOpen || IaTour.isActive()) return;
      _setState('listening');
      setTimeout(() => {
        if (_state === 'listening' && !_isOpen) _setState('idle');
      }, 2600);
    });

    // Gallery de proyecto: comentario corto al CERRAR (abierta tapa al globo)
    window.addEventListener('portfolio:projectOpen', ({ detail }) => {
      _lastProject = detail?.project || null;
      IaBubble.dismiss();
    });
    window.addEventListener('portfolio:projectClose', () => {
      const title = _lastProject?.title;
      _lastProject = null;
      if (!title) return;
      setTimeout(() => {
        _maybeNudge('project', `¿Te interesó ${title}? Abre el chat y pregúntame por su stack.`, { mood: 'success' });
      }, 600);
    });

    // Tips contextuales por sección (dwell + cooldown + presupuesto)
    _initNudges();

    // Termina el worker limpiamente al salir de la página
    window.addEventListener('beforeunload', () => {
      _worker?.terminate();
    });
  }

  const api = { init, openPanel, closePanel, setState: _setState, say };

  // Exponer métricas en DEV (Fase E)
  if (import.meta.env.DEV) {
    api.metrics = {
      get: _getMetrics,
      clear: _clearMetrics,
      log: _logEvent,
    };
  }

  return api;
})();
