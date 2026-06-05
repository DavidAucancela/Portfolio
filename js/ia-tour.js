/**
 * ia-tour.js — Tour guiado de JotAI
 * Recorre las secciones del portfolio con tooltips y estado pointing.
 * Funciona en los 3 modos con contenido adaptado.
 *
 * API: IaTour.start(mode, { onState, onDone })
 */

/* ── PASOS POR MODO ───────────────────────────────────────────── */

const STEPS = {
  dev: [
    {
      id:    'about',
      title: 'Sobre Jonathan',
      text:  'Perfil completo del desarrollador: experiencia, stats animados y CV descargable. Todo lo que necesitas saber.',
    },
    {
      id:    'projects',
      title: 'Proyectos .dev',
      text:  'Sistemas full-stack en producción: APIs REST, SaaS multi-tenant, pipelines ETL y catálogos digitales.',
    },
    {
      id:    'skills',
      title: 'Stack técnico',
      text:  'Angular, Vue, React, Django, Node.js, Docker, PostgreSQL... el stack completo con niveles reales.',
    },
    {
      id:    'contact',
      title: '¿Hablamos?',
      text:  '¿Tienes un proyecto en mente? Escríbele aquí directamente o encuéntralo en GitHub y LinkedIn.',
    },
  ],

  ia: [
    {
      id:    'about',
      title: 'IA Aplicada',
      text:  'Jonathan integra LLMs en producción real: RAG, embeddings vectoriales, pgvector y APIs de Claude y OpenAI.',
    },
    {
      id:    'projects',
      title: 'Proyectos IA',
      text:  'LLM Observatory (monitoreo de Claude), UBApp (búsqueda semántica), MindLog (diario con RAG) y más.',
    },
    {
      id:    'skills',
      title: 'Stack de IA',
      text:  'OpenAI API, Claude, embeddings, pgvector, RAG pipelines, FastAPI async y arquitecturas de agentes.',
    },
    {
      id:    'contact',
      title: '¿Integrar IA?',
      text:  '¿Necesitas un asistente, búsqueda semántica o integración con LLMs? Jonathan puede construirlo.',
    },
  ],

  sec: [
    {
      id:    'about',
      title: 'Security Researcher',
      text:  'Prácticas en DETIC-ESPOCH, certificación Cisco NetAcad e IBM SkillsBuild. Security-by-design desde el primer commit.',
    },
    {
      id:    'projects',
      title: 'Writeups & Labs',
      text:  'Máquinas de HackTheBox documentadas y proyectos con OWASP Top 10 implementado (JWT, bcrypt, CSRF, rate limiting).',
    },
    {
      id:    'skills',
      title: 'Herramientas',
      text:  'Análisis de vulnerabilidades, pentesting ético, ISO 27001 y herramientas de seguridad ofensiva/defensiva.',
    },
    {
      id:    'contact',
      title: '¿Auditoría?',
      text:  '¿Necesitas revisar la seguridad de un sistema? Aquí puedes contactar a Jonathan directamente.',
    },
  ],
};

/* ── MÓDULO ───────────────────────────────────────────────────── */

export const IaTour = (() => {
  let _steps    = [];
  let _idx      = 0;
  let _onState  = null;
  let _onDone   = null;
  let _overlay  = null;
  let _tip      = null;
  let _active   = false;
  let _reduced  = false;

  /* ── INJECT DOM ────────────────────────────────────────────── */

  function _inject() {
    if (document.getElementById('jotai-tour-overlay')) return;

    const wrap = document.createElement('div');
    wrap.id = 'jotai-tour-overlay';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div id="jotai-tour-veil"></div>
      <div id="jotai-tour-tip" role="dialog" aria-label="Tour de JotAI" aria-modal="false">
        <div class="jt-header">
          <span class="jt-icon">🔮</span>
          <span class="jt-title" id="jt-title"></span>
          <span class="jt-counter" id="jt-counter"></span>
        </div>
        <p class="jt-text" id="jt-text"></p>
        <div class="jt-actions">
          <button class="jt-btn jt-btn--ghost" id="jt-prev" aria-label="Paso anterior">← Anterior</button>
          <button class="jt-btn jt-btn--primary" id="jt-next" aria-label="Siguiente paso">Siguiente →</button>
          <button class="jt-btn jt-btn--skip" id="jt-skip" aria-label="Saltar tour">✕ Saltar</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    _overlay = document.getElementById('jotai-tour-overlay');
    _tip     = document.getElementById('jotai-tour-tip');

    document.getElementById('jt-next').addEventListener('click', _nextStep);
    document.getElementById('jt-prev').addEventListener('click', _prevStep);
    document.getElementById('jt-skip').addEventListener('click', _finish);

    document.addEventListener('keydown', _onKey);
  }

  /* ── NAVEGACIÓN ────────────────────────────────────────────── */

  function _renderStep() {
    const step = _steps[_idx];
    const total = _steps.length;

    document.getElementById('jt-title').textContent   = step.title;
    document.getElementById('jt-text').textContent    = step.text;
    document.getElementById('jt-counter').textContent = `${_idx + 1} / ${total}`;

    // Botón Anterior: oculto en el paso 0
    const prevBtn = document.getElementById('jt-prev');
    prevBtn.style.visibility = _idx === 0 ? 'hidden' : 'visible';

    // Último paso → "Finalizar"
    const nextBtn = document.getElementById('jt-next');
    nextBtn.textContent = _idx === total - 1 ? 'Finalizar ✓' : 'Siguiente →';

    // Quitar highlight anterior y aplicar al nuevo
    document.querySelectorAll('.jotai-tour-target').forEach(el => {
      el.classList.remove('jotai-tour-target');
    });
    const target = document.getElementById(step.id);
    if (target) {
      target.classList.add('jotai-tour-target');
      target.scrollIntoView({
        behavior: _reduced ? 'instant' : 'smooth',
        block: 'center',
      });
    }

    _onState?.('pointing');

    // Mueve el foco al botón Siguiente para navegación por teclado
    setTimeout(() => document.getElementById('jt-next')?.focus(), 80);
  }

  function _nextStep() {
    if (_idx < _steps.length - 1) {
      _idx++;
      _renderStep();
    } else {
      _finish();
    }
  }

  function _prevStep() {
    if (_idx > 0) {
      _idx--;
      _renderStep();
    }
  }

  function _onKey(e) {
    if (!_active) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') _nextStep();
    if (e.key === 'ArrowLeft')  _prevStep();
    if (e.key === 'Escape')     _finish();
  }

  /* ── START / FINISH ────────────────────────────────────────── */

  function start(mode, { onState, onDone } = {}) {
    _steps   = STEPS[mode] || STEPS.dev;
    _idx     = 0;
    _onState = onState;
    _onDone  = onDone;
    _active  = true;
    _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _inject();

    _overlay.removeAttribute('aria-hidden');
    _overlay.classList.add('is-active');

    _renderStep();
  }

  function _finish() {
    _active = false;

    // Limpia highlight
    document.querySelectorAll('.jotai-tour-target').forEach(el => {
      el.classList.remove('jotai-tour-target');
    });

    _overlay?.classList.remove('is-active');
    _overlay?.setAttribute('aria-hidden', 'true');

    _onState?.('idle');
    _onDone?.();
  }

  function isActive() { return _active; }

  return { start, isActive };
})();
