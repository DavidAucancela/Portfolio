/**
 * ia-assistant.js
 * Panel de consultas IA — visible en todos los modos via widget flotante
 * Fase 1: Knowledge base construida desde data/*.json (single source of truth)
 */

// ── NLP HELPERS ─────────────────────────────────────────────────────────────

const _STOP = new Set([
  'de','el','la','los','las','en','con','del','al','y','o','a','un','una',
  'es','son','fue','era','tienes','tiene','sabes','sabe','que','como',
  'cual','cuales','has','hay','tu','su','mi','sobre','acerca','por','para',
  'si','no','yo','me','lo','le','se','mas','muy','mucho','tambien',
  'puedes','puede','podrias','tengo','tenemos','existe','conoces','conoce',
  'hablame','dime','cuentame','muestrame','jonathan','proyecto',
  'the','an','in','of','on','is','are','was','were','have','do','does',
  'what','how','when','where','which','tell','about','your','his',
  'with','for','and','or','but','if','then','can','could','would','will',
]);

function _norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s.#]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function _matchAny(norm, terms) {
  return terms.some(t => norm.includes(_norm(t)));
}

// ── STATE ────────────────────────────────────────────────────────────────────

let _personal  = null;
let _projects  = [];
let _skills    = [];
let _kb        = [];
let _ready     = false;

// ── DATA LOADING ─────────────────────────────────────────────────────────────

async function _loadData() {
  try {
    const [personal, dev, ia, sec, skills] = await Promise.all([
      fetch('data/personal.json').then(r => r.json()),
      fetch('data/dev-projects.json').then(r => r.json()),
      fetch('data/ia-projects.json').then(r => r.json()),
      fetch('data/sec-projects.json').then(r => r.json()),
      fetch('data/skills.json').then(r => r.json()),
    ]);
    _personal = personal;
    _projects = [...dev, ...ia, ...sec];
    _skills   = skills;
    _buildKB();
    _ready = true;
  } catch (e) {
    console.error('[IAAssistant] Error cargando KB:', e);
  }
}

// ── KB BUILDER ───────────────────────────────────────────────────────────────

// Spanish/English aliases for tech keywords
const _SKILL_ALIASES = {
  'postgresql':   ['postgres', 'pgvector', 'sql', 'base de datos', 'bd relacional'],
  'nodejs':       ['node.js', 'node', 'express', 'backend js', 'backend javascript'],
  'docker':       ['contenedor', 'contenedores', 'container', 'compose', 'docker compose'],
  'react':        ['reactjs', 'react.js', 'jsx', 'react18'],
  'vuejs':        ['vue', 'vue.js', 'vue3', 'pinia', 'composition api'],
  'angular':      ['angularjs'],
  'aspnetcore':   ['asp.net', 'aspnet', 'csharp', 'c#', 'dotnet', '.net', 'entity framework'],
  'tensorflow':   ['machine learning', 'ml', 'modelos ml', 'aprendizaje automatico'],
  'openaiapi':    ['openai', 'gpt', 'embeddings', 'rag', 'retrieval', 'ada', 'ada-002'],
  'claude':       ['claude api', 'anthropic', 'haiku', 'sonnet', 'opus'],
  'django':       ['python web', 'drf', 'django rest', 'django rest framework'],
  'nestjs':       ['nest.js', 'nest js'],
  'fastapi':      ['fast api'],
  'n8n':          ['automatizacion', 'automatizacion', 'workflow', 'no code'],
  'githubactions':['github actions', 'ci cd', 'cicd', 'pipeline'],
};

function _kwFromText(...texts) {
  const words = new Set();
  texts.forEach(text => {
    if (!text) return;
    text.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !_STOP.has(w))
      .forEach(w => words.add(w));
  });
  return [...words];
}

function _projectKeywords(p) {
  const words = new Set();
  // Slug and squished title (e.g. "llmobservatory" for "LLM Observatory")
  if (p.slug) words.add(p.slug.toLowerCase());
  const titleSquish = (p.title || '').toLowerCase().replace(/\s+/g, '');
  words.add(titleSquish);
  // Title words + description + tags
  _kwFromText(p.title, p.description).forEach(w => words.add(w));
  (p.tags || []).forEach(t => _kwFromText(t).forEach(w => words.add(w)));
  // Add lab fields for .sec projects
  if (p.lab) {
    _kwFromText(p.lab.platform, p.lab.difficulty, p.lab.os).forEach(w => words.add(w));
    (p.lab.techniques || []).forEach(t => _kwFromText(t).forEach(w => words.add(w)));
  }
  return [...words];
}

function _skillKeywords(s) {
  const normKey = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = new Set(_kwFromText(s.name, s.category));
  const aliases = _SKILL_ALIASES[normKey];
  if (aliases) aliases.forEach(a => _kwFromText(a).forEach(w => words.add(w)));
  return [...words];
}

function _skillLevel(level) {
  if (level >= 5) return 'Experto';
  if (level >= 4) return 'Avanzado';
  if (level >= 3) return 'Intermedio-Avanzado';
  if (level >= 2) return 'Intermedio';
  return 'Básico';
}

function _skillProjects(skillName) {
  const norm = skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return _projects
    .filter(p => (p.tags || []).some(t => {
      const tn = t.toLowerCase().replace(/[^a-z0-9]/g, '');
      return tn === norm || tn.includes(norm) || norm.includes(tn);
    }))
    .map(p => p.title);
}

function _buildKB() {
  _kb = [];

  // Personal profile doc
  _kb.push({
    id: 'personal',
    type: 'personal',
    keywords: ['quien', 'jonathan', 'perfil', 'bio', 'sobre', 'presentate',
                'ingeniero', 'espoch', 'ecuador', 'fullstack', 'desarrollador'],
    data: _personal,
  });

  // Contact doc
  _kb.push({
    id: 'contact',
    type: 'contact',
    keywords: ['contacto', 'email', 'correo', 'linkedin', 'github', 'redes',
                'instagram', 'donde', 'comunicar', 'contratar', 'hire'],
    data: _personal,
  });

  // All projects
  _projects.forEach(p => {
    _kb.push({
      id: `project-${p.slug || p.id}`,
      type: 'project',
      keywords: _projectKeywords(p),
      data: p,
    });
  });

  // All skills
  _skills.forEach(s => {
    const projs = _skillProjects(s.name);
    _kb.push({
      id: `skill-${s.name.toLowerCase().replace(/\W+/g, '-')}`,
      type: 'skill',
      keywords: _skillKeywords(s),
      data: {
        name:     s.name,
        category: s.category,
        level:    s.level,
        nivel:    _skillLevel(s.level),
        proyectos: projs,
      },
    });
  });
}

// ── RESPONSE BUILDERS ────────────────────────────────────────────────────────

function _respPersonal() {
  if (!_personal) return 'Un momento, estoy cargando los datos…';
  return `Hola, soy el asistente de **${_personal.name}**. Aquí va su perfil:

**${_personal.name}** — ${_personal.title} · ${_personal.location}
Graduado de la **ESPOCH — Escuela Superior Politécnica de Chimborazo**.

${_personal.bioShort || _personal.bio}

**Áreas de enfoque:** Full Stack · DevOps · Integración IA · Seguridad Informática`;
}

function _respContact() {
  if (!_personal) return 'Un momento, estoy cargando los datos…';
  const s = _personal.social || {};
  return `Puedes contactar a **${_personal.name}** por estos canales:

📧 **Email:** ${_personal.email}
🐙 **GitHub:** ${s.github || ''}
💼 **LinkedIn:** ${s.linkedin || ''}
📸 **Instagram:** ${s.instagram || ''}`;
}

function _respListProjects() {
  if (!_projects.length) return 'Un momento, estoy cargando los datos…';
  const lines = _projects
    .map(p => `**${p.title}** — ${(p.description || '').slice(0, 90)}${(p.description || '').length > 90 ? '…' : ''}`)
    .join('\n');
  return `Jonathan tiene **${_projects.length} proyectos** en su portfolio:\n\n${lines}\n\nPregúntame por cualquiera para ver detalles.`;
}

function _respListSkills() {
  if (!_skills.length) return 'Un momento, estoy cargando los datos…';
  const byCat = {};
  _skills.forEach(s => {
    (byCat[s.category] = byCat[s.category] || []).push(`${s.name} ${'★'.repeat(s.level)}`);
  });
  return `Stack tecnológico de Jonathan:\n\n` +
    Object.entries(byCat)
      .map(([cat, items]) => `**${cat}:** ${items.join(' · ')}`)
      .join('\n');
}

// ── INTENT DETECTION ─────────────────────────────────────────────────────────

function _detectIntent(norm) {
  if (_matchAny(norm, [
    'todos los proyectos', 'lista proyectos', 'que proyectos', 'cuantos proyectos',
    'que trabajos', 'que has hecho', 'que hiciste', 'mostrar proyectos', 'ver proyectos',
    'tu portafolio', 'tu portfolio',
  ])) return 'list_projects';

  if (_matchAny(norm, [
    'tus skills', 'tus habilidades', 'que sabes', 'que tecnologias', 'que dominas',
    'tu stack', 'tecnologias que', 'habilidades tecnicas', 'que conoces',
    'que lenguajes', 'que frameworks',
  ])) return 'list_skills';

  if (_matchAny(norm, [
    'quien es jonathan', 'quien eres', 'presentate', 'sobre ti', 'bio de jonathan',
    'perfil de jonathan', 'sobre jonathan', 'acerca de jonathan', 'te presentes',
  ])) return 'personal';

  if (_matchAny(norm, [
    'contacto', 'email', 'correo', 'linkedin', 'github', 'redes sociales',
    'donde encontrar', 'como contactar', 'instagram',
  ])) return 'contact';

  return 'search';
}

// ── QUERY ENGINE ─────────────────────────────────────────────────────────────

function _query(input) {
  if (!_ready) return {
    type: 'special',
    text: 'Un momento, estoy cargando mis datos… Intenta de nuevo enseguida.',
  };

  const norm   = _norm(input);
  const intent = _detectIntent(norm);

  if (intent === 'list_projects') return { type: 'special', text: _respListProjects() };
  if (intent === 'list_skills')   return { type: 'special', text: _respListSkills() };
  if (intent === 'personal')      return { type: 'special', text: _respPersonal() };
  if (intent === 'contact')       return { type: 'special', text: _respContact() };

  // Keyword search over KB
  for (const doc of _kb) {
    if (doc.type !== 'project' && doc.type !== 'skill') continue;
    if (_matchAny(norm, doc.keywords)) return { type: doc.type, data: doc.data };
  }

  return null;
}

// ── RENDER HELPERS ───────────────────────────────────────────────────────────

function _md(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function _levelBadge(nivel) {
  if (!nivel) return '';
  const n   = nivel.toLowerCase();
  const cls = n.startsWith('avanzado') || n === 'experto' ? 'green'
            : n.startsWith('intermedio')                  ? 'yellow'
            : 'purple';
  return `<span class="ia-badge ia-badge--${cls}">${nivel}</span>`;
}

// ── CARD BUILDER ─────────────────────────────────────────────────────────────

function _buildCard(result) {
  const card = document.createElement('div');

  if (result.type === 'special') {
    card.className = 'ia-result-card ia-result-card--plain';
    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev · Búsqueda</div>
      <div class="ia-result-plain-text">${_md(result.text)}</div>`;
    return card;
  }

  if (result.type === 'project') {
    const p = result.data;
    card.className = 'ia-result-card';

    const metrics  = p.process?.metricas || [];
    const metricsHtml = metrics.length
      ? `<div class="ia-result-row">${metrics.map(m => `<span class="ia-metric">${m.label}: ${m.value}</span>`).join('')}</div>`
      : '';

    const tagsHtml = (p.tags || []).length
      ? `<div class="ia-result-row">${p.tags.map(t => `<span class="ia-tag-tech">${t}</span>`).join('')}</div>`
      : '';

    const linksHtml = (p.repoUrl || p.liveUrl)
      ? `<div class="ia-result-actions">
          ${p.repoUrl ? `<a href="${p.repoUrl}" target="_blank" rel="noopener" class="ia-result-link">GitHub ↗</a>` : ''}
          ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noopener" class="ia-result-link">Demo en vivo ↗</a>` : ''}
        </div>`
      : '';

    // Lab badge for .sec HackTheBox machines
    const labHtml = p.lab
      ? `<div class="ia-result-meta">${p.lab.platform} · ${p.lab.difficulty} · ${p.lab.os} · ${p.lab.status || ''}</div>`
      : (p.date ? `<div class="ia-result-meta">${p.date.replace('-', ' / ')}</div>` : '');

    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev › Proyectos › ${p.title}</div>
      <h3 class="ia-result-title">${p.title}</h3>
      ${labHtml}
      <p class="ia-result-desc">${_md(p.description || '')}</p>
      ${metricsHtml}
      ${tagsHtml}
      ${linksHtml}`;
    return card;
  }

  if (result.type === 'skill') {
    const s = result.data;
    card.className = 'ia-result-card';

    const stars = '★'.repeat(s.level) + '☆'.repeat(5 - s.level);
    const projsHtml = (s.proyectos || []).length
      ? `<div class="ia-result-row">${s.proyectos.map(p => `<span class="ia-metric">${p}</span>`).join('')}</div>`
      : '';

    const projDesc = s.proyectos?.length
      ? `Aparece en: ${s.proyectos.join(', ')}.`
      : 'Conocimiento en esta tecnología.';

    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev › Skills › ${s.name}</div>
      <h3 class="ia-result-title">${s.name} ${_levelBadge(s.nivel)}</h3>
      <div class="ia-result-meta">${stars} · ${s.category}</div>
      <p class="ia-result-desc">Jonathan trabaja con <strong>${s.name}</strong> (nivel ${s.level}/5). ${projDesc}</p>
      ${projsHtml}`;
    return card;
  }

  return card;
}

// ── RESULTS RENDER ───────────────────────────────────────────────────────────

function _showResults(container, result) {
  container.innerHTML = '';

  if (!result) {
    container.innerHTML = `
      <div class="ia-no-results">
        No encontré resultados. Prueba con un proyecto (UBApp, AnaOS, LLM Observatory…)
        o una tecnología (Django, React, Docker, OpenAI, Claude API…).
      </div>`;
    return;
  }

  container.appendChild(_buildCard(result));
}

// ── SECTION RENDER (current search-bar layout — Fase 2 lo reemplaza) ─────────

function _render() {
  const section = document.getElementById('ia-assistant-section');
  if (!section) return;

  const results     = section.querySelector('#ia-results');
  const input       = section.querySelector('#ia-input');
  const sendBtn     = section.querySelector('#ia-send');
  const suggestions = section.querySelectorAll('.ia-suggestion');

  function send() {
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    sendBtn.disabled = true;
    results.innerHTML = `
      <div class="ia-loading">
        <div class="ia-dots"><span></span><span></span><span></span></div>
        Buscando…
      </div>`;
    setTimeout(() => {
      _showResults(results, _query(val));
      sendBtn.disabled = false;
      input.focus();
    }, 400 + Math.random() * 350);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  suggestions.forEach(btn => {
    btn.addEventListener('click', () => { input.value = btn.textContent.trim(); send(); });
  });
}

function _syncMode(mode) {
  const section = document.getElementById('ia-assistant-section');
  if (!section) return;
  section.style.display = mode === 'ia' ? '' : 'none';
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

function init() {
  _render();
  _loadData(); // async — KB estará lista antes de la primera query del usuario
  const initMode = localStorage.getItem('portfolio-mode') || 'dev';
  _syncMode(initMode);
  window.addEventListener('portfolio:modeChange', e => _syncMode(e.detail.mode));
}

// Expone _query y _kb para Fase 3 (worker + embeddings)
export const IAAssistant = { init, query: _query, getKB: () => _kb };
