/**
 * ia-assistant.js
 * Panel beta de consultas IA — solo visible en modo .ia
 */

const PROFILE = [
  {
    keywords: ['angular', 'angularjs'],
    nivel: 'Avanzado',
    respuesta: `Jonathan trabajó con **Angular** como frontend principal en **UBApp (Universal Box)**, sistema fullstack de gestión de envíos con búsqueda semántica. Desarrolló módulos de inventario, rastreo en tiempo real y panel de administración completo.`,
    proyectos: ['UBApp — Universal Box'],
    tags: ['Angular', 'TypeScript', 'Django', 'PostgreSQL'],
  },
  {
    keywords: ['vue', 'vue.js', 'vuejs'],
    nivel: 'Avanzado',
    respuesta: `Jonathan utilizó **Vue.js 3** en **Ideancestral**, plataforma de catálogo digital multiidioma para artesanos ecuatorianos. Implementó soporte para 3 idiomas (ES/EN/PT), modo oscuro/claro y carrito de compras con integración WhatsApp.`,
    proyectos: ['Ideancestral'],
    tags: ['Vue.js 3', 'i18n', 'Node.js', 'PostgreSQL'],
  },
  {
    keywords: ['react', 'react.js', 'reactjs'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **React** con TypeScript en proyectos de IA. En **AnaOS** construyó la interfaz del asistente financiero con streaming de respuestas en tiempo real y manejo de estado de conversación.`,
    proyectos: ['AnaOS — Asistente Financiero IA'],
    tags: ['React', 'TypeScript', 'Streaming UI', 'Chat UI'],
  },
  {
    keywords: ['next', 'next.js', 'nextjs'],
    nivel: 'Avanzado',
    respuesta: `Jonathan construyó este mismo **portfolio** con **Next.js 14** (App Router), TypeScript estricto, Tailwind CSS y Framer Motion. Implementó rutas dinámicas, generación estática y optimización de imágenes.`,
    proyectos: ['Portfolio — Jonathan.dev'],
    tags: ['Next.js 14', 'TypeScript', 'Tailwind', 'Framer Motion'],
  },
  {
    keywords: ['django', 'python web'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usó **Django** como backend en **UBApp** y en **Equity (ETL)**. En UBApp integró Django con pgvector y OpenAI para búsqueda semántica; en Equity construyó un pipeline ETL con transacciones atómicas y modo dry-run.`,
    proyectos: ['UBApp — Universal Box', 'Equity — Gestor ETL'],
    tags: ['Django', 'PostgreSQL', 'pgvector', 'REST API'],
  },
  {
    keywords: ['fastapi', 'fast api'],
    nivel: 'Intermedio',
    respuesta: `Jonathan tiene experiencia con **FastAPI** para construir APIs asíncronas en Python, especialmente para servicios de IA que requieren alta velocidad de respuesta y documentación automática con OpenAPI.`,
    proyectos: [],
    tags: ['FastAPI', 'Python', 'REST API', 'Async'],
  },
  {
    keywords: ['node', 'node.js', 'nodejs', 'express', 'backend javascript'],
    nivel: 'Avanzado',
    respuesta: `Jonathan tiene sólida experiencia en **Node.js/Express**. En **Ideancestral** construyó la API REST completa y en **SecuraBank** implementó un sistema bancario con security-by-design: Helmet.js, JWT, CSRF tokens y rate limiting.`,
    proyectos: ['Ideancestral', 'SecuraBank'],
    tags: ['Node.js', 'Express', 'JWT', 'Helmet.js', 'bcrypt'],
  },
  {
    keywords: ['openai', 'open ai', 'gpt', 'llm', 'modelos de lenguaje', 'language model'],
    nivel: 'Avanzado',
    respuesta: `Jonathan integró la **API de OpenAI** en dos proyectos: **AnaOS** (asistente financiero con RAG) y **UBApp** (búsqueda semántica con embeddings + pgvector). Redujo el tiempo de búsqueda de 4 minutos a menos de 20 segundos.`,
    proyectos: ['AnaOS — Asistente Financiero IA', 'UBApp — Universal Box'],
    tags: ['OpenAI API', 'Embeddings', 'pgvector', 'RAG', 'Prompt Engineering'],
  },
  {
    keywords: ['rag', 'retrieval augmented', 'retrieval-augmented'],
    nivel: 'Avanzado',
    respuesta: `Jonathan aplicó el patrón **RAG (Retrieval-Augmented Generation)** en **AnaOS**, enriqueciendo el contexto del modelo con datos financieros reales de cooperativas antes de llamar a la IA. Permite respuestas precisas sobre datos propios del cliente.`,
    proyectos: ['AnaOS — Asistente Financiero IA'],
    tags: ['RAG', 'OpenAI API', 'pgvector', 'Embeddings', 'TypeScript'],
  },
  {
    keywords: ['postgresql', 'postgres', 'base de datos', 'database', 'sql'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **PostgreSQL** como base de datos principal en todos sus proyectos. Destaca el uso de **pgvector** para búsqueda semántica vectorial en proyectos de IA, además de modelado relacional complejo y consultas optimizadas.`,
    proyectos: ['UBApp', 'Ideancestral', 'AnaOS', 'Equity'],
    tags: ['PostgreSQL', 'pgvector', 'SQL', 'Vector DB'],
  },
  {
    keywords: ['docker', 'contenedor', 'container', 'containerización'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Docker** para contenerización en todos sus proyectos de producción. Configura docker-compose para orquestar servicios y ha implementado pipelines CI/CD con GitHub Actions.`,
    proyectos: ['UBApp — Universal Box'],
    tags: ['Docker', 'docker-compose', 'GitHub Actions', 'Nginx'],
  },
  {
    keywords: ['seguridad', 'security', 'owasp', 'ciberseguridad', 'cybersecurity', 'pentest'],
    nivel: 'Intermedio-Avanzado',
    respuesta: `Jonathan implementó **security-by-design** en **SecuraBank**: mitigó 6 categorías del OWASP Top 10, aplicó threat modeling antes del desarrollo, usó queries parametrizadas al 100%, bcrypt, rotación de JWT y auditoría inmutable de transacciones.`,
    proyectos: ['SecuraBank'],
    tags: ['OWASP Top 10', 'JWT', 'bcrypt', 'Helmet.js', 'CSRF'],
  },
  {
    keywords: ['typescript', 'ts'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **TypeScript** en modo estricto en todos sus proyectos modernos. En AnaOS implementó TypeScript end-to-end (frontend React + backend Node.js). También lo usa en Next.js con configuración strict y path aliases.`,
    proyectos: ['AnaOS', 'Portfolio'],
    tags: ['TypeScript', 'React', 'Node.js', 'Next.js'],
  },
  {
    keywords: ['etl', 'pipeline', 'ingeniería de datos', 'data engineering'],
    nivel: 'Intermedio',
    respuesta: `Jonathan construyó **Equity**, pipeline ETL automatizado con Python/Django que hace Extract→Transform→Load desde archivos JSON a PostgreSQL. Incluye validación de schemas, transacciones atómicas y modo dry-run.`,
    proyectos: ['Equity — Gestor de Datos ETL'],
    tags: ['Python', 'Django', 'PostgreSQL', 'ETL', 'CRISP-DM'],
  },
  {
    keywords: ['tailwind', 'tailwindcss', 'css', 'diseño'],
    nivel: 'Avanzado',
    respuesta: `Jonathan domina **Tailwind CSS** para diseño de interfaces. Este portfolio y sus proyectos usan Tailwind con clases personalizadas, variables CSS, modo oscuro y diseño responsive completo.`,
    proyectos: ['Portfolio', 'Ideancestral'],
    tags: ['Tailwind CSS', 'CSS3', 'Responsive Design', 'Dark Mode'],
  },
  {
    keywords: ['embedding', 'embeddings', 'vectores', 'vector', 'semantica', 'semántica'],
    nivel: 'Avanzado',
    respuesta: `Jonathan generó y gestionó **embeddings** con la API de OpenAI, almacenándolos en PostgreSQL con la extensión **pgvector** para búsqueda semántica por similitud coseno. Redujo el tiempo de búsqueda de 4 minutos a 20 segundos.`,
    proyectos: ['UBApp — Universal Box'],
    tags: ['Embeddings', 'pgvector', 'OpenAI', 'Búsqueda semántica'],
  },
  {
    keywords: ['fullstack', 'full stack', 'full-stack'],
    nivel: 'Avanzado',
    respuesta: `Jonathan es **desarrollador fullstack** con experiencia end-to-end: UI (Angular, Vue, React, Next.js), APIs REST (Django, Node.js, FastAPI), bases de datos (PostgreSQL, Redis) y DevOps (Docker, GitHub Actions, Vercel).`,
    proyectos: ['UBApp', 'Ideancestral', 'AnaOS'],
    tags: ['Frontend', 'Backend', 'DevOps', 'Bases de datos'],
  },
  {
    keywords: ['git', 'github', 'control de versiones'],
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Git/GitHub** profesionalmente con branching strategies y GitHub Actions para CI/CD automatizado. Todos sus proyectos tienen repositorios públicos documentados.`,
    proyectos: ['Todos los proyectos'],
    tags: ['Git', 'GitHub', 'GitHub Actions', 'CI/CD'],
  },
  {
    keywords: ['leaflet', 'mapas', 'maps', 'geolocalización', 'datos abiertos'],
    nivel: 'Intermedio',
    respuesta: `Jonathan desarrolló **ConQuito**, visualización interactiva de fundaciones de Quito con **Leaflet.js**, markers personalizados, filtros geográficos y gráficos Chart.js. Entregada a ConQuito como herramienta de decisiones.`,
    proyectos: ['ConQuito — Fundaciones'],
    tags: ['Leaflet.js', 'Chart.js', 'JavaScript', 'Datos Abiertos'],
  },
];

const FALLBACK = `No tengo información específica sobre esa área en el perfil de Jonathan. Dado su stack fullstack (Angular, Vue, React, Django, Node.js, PostgreSQL, Docker) y experiencia en IA (OpenAI, RAG, embeddings), es posible que tenga experiencia relacionada. Revisa su GitHub: **github.com/DavidAucancela**`;

function _query(input) {
  const q = input.toLowerCase().trim();
  if (!q) return null;
  for (const entry of PROFILE) {
    if (entry.keywords.some(kw => q.includes(kw))) return entry;
  }
  return null;
}

function _md(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function _typeText(el, text, done) {
  el.innerHTML = '';
  let i = 0;
  const timer = setInterval(() => {
    i++;
    el.innerHTML = _md(text.slice(0, i));
    if (i >= text.length) { clearInterval(timer); if (done) done(); }
  }, 12);
}

function _addMessage(container, role, content, result) {
  const msg = document.createElement('div');
  msg.className = `ia-msg ia-msg--${role}`;

  if (role === 'user') {
    msg.innerHTML = `<span class="ia-msg-text">${content}</span>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  const nivel = result
    ? `<span class="ia-nivel ia-nivel--${result.nivel.toLowerCase().split('-')[0]}">${result.nivel}</span>`
    : '';
  const proyectos = result?.proyectos?.length
    ? `<div class="ia-proyectos"><span>Proyectos:</span> ${result.proyectos.map(p => `<span class="ia-tag">${p}</span>`).join('')}</div>`
    : '';
  const tags = result?.tags?.length
    ? `<div class="ia-tags">${result.tags.slice(0, 5).map(t => `<span class="ia-tag ia-tag--tech">${t}</span>`).join('')}</div>`
    : '';

  msg.innerHTML = `
    <div class="ia-msg-header">
      <span class="ia-avatar">🧠</span>
      ${nivel}
    </div>
    <div class="ia-msg-text"></div>
    ${proyectos}
    ${tags}
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;

  const textEl = msg.querySelector('.ia-msg-text');
  _typeText(textEl, content, () => { container.scrollTop = container.scrollHeight; });
  return msg;
}

function _render() {
  const section = document.getElementById('ia-assistant-section');
  if (!section) return;

  const container = section.querySelector('#ia-chat');
  const input     = section.querySelector('#ia-input');
  const sendBtn   = section.querySelector('#ia-send');
  const examples  = section.querySelectorAll('.ia-example');

  _addMessage(container, 'bot',
    'Hola. Escribe un área tecnológica o stack y te diré si Jonathan tiene experiencia en eso.',
    null
  );

  function send() {
    const val = input.value.trim();
    if (!val) return;

    _addMessage(container, 'user', val, null);
    input.value = '';
    sendBtn.disabled = true;

    const thinking = document.createElement('div');
    thinking.className = 'ia-msg ia-msg--bot ia-thinking';
    thinking.innerHTML = `<span class="ia-avatar">🧠</span><span class="ia-dots"><span></span><span></span><span></span></span>`;
    container.appendChild(thinking);
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
      thinking.remove();
      const result = _query(val);
      _addMessage(container, 'bot', result ? result.respuesta : FALLBACK, result);
      sendBtn.disabled = false;
      input.focus();
    }, 800 + Math.random() * 400);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  examples.forEach(btn => {
    btn.addEventListener('click', () => { input.value = btn.textContent; send(); });
  });
}

function _syncMode(mode) {
  const section = document.getElementById('ia-assistant-section');
  if (!section) return;
  section.style.display = mode === 'ia' ? '' : 'none';
}

function init() {
  _render();
  const initMode = localStorage.getItem('portfolio-mode') || 'dev';
  _syncMode(initMode);
  window.addEventListener('portfolio:modeChange', e => _syncMode(e.detail.mode));
}

export const IAAssistant = { init };
