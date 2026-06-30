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

// ── TEXT PARA EMBEDDINGS ─────────────────────────────────────────────────────
// Solo para docs project y skill; personal/contact se manejan por intent.

function _projectEmbedText(p) {
  const tech = p.techStack
    ? Object.values(p.techStack).flat().join(' ')
    : '';
  const lab = p.lab
    ? `${p.lab.platform} ${p.lab.difficulty} ${(p.lab.techniques || []).join(' ')}`
    : '';
  return [
    p.title,
    p.description,
    p.longDescription,
    (p.tags || []).join(' '),
    tech,
    p.process?.overview,
    lab,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 600);
}

function _skillEmbedText(s, proyectos) {
  return `${s.name} ${s.category} ${_skillLevel(s.level)} ${proyectos.join(' ')}`.trim();
}

// ── KB BUILDER ───────────────────────────────────────────────────────────────

function _buildKB() {
  _kb = [];

  // Personal profile doc (no text field — no se embede)
  _kb.push({
    id: 'personal',
    type: 'personal',
    keywords: ['quien', 'jonathan', 'perfil', 'bio', 'sobre', 'presentate',
                'ingeniero', 'espoch', 'ecuador', 'fullstack', 'desarrollador'],
    data: _personal,
  });

  // Contact doc (no text field — no se embede)
  _kb.push({
    id: 'contact',
    type: 'contact',
    keywords: ['contacto', 'email', 'correo', 'linkedin', 'github', 'redes',
                'instagram', 'donde', 'comunicar', 'contratar', 'hire'],
    data: _personal,
  });

  // All projects — con texto para embedding
  _projects.forEach(p => {
    _kb.push({
      id: `project-${p.slug || p.id}`,
      type: 'project',
      keywords: _projectKeywords(p),
      text: _projectEmbedText(p),
      data: p,
    });
  });

  // All skills — con texto para embedding
  _skills.forEach(s => {
    const projs = _skillProjects(s.name);
    _kb.push({
      id: `skill-${s.name.toLowerCase().replace(/\W+/g, '-')}`,
      type: 'skill',
      keywords: _skillKeywords(s),
      text: _skillEmbedText(s, projs),
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
  const featured = _projects.filter(p => p.featured);
  const shown = featured.length >= 3 ? featured.slice(0, 6) : _projects.slice(0, 6);
  const lines = shown
    .map(p => `**${p.title}** — ${(p.description || '').slice(0, 80)}…`)
    .join('\n');
  return `Algunos proyectos destacados de Jonathan (${_projects.length} en total):\n\n${lines}\n\nPregúntame por uno específico o escribe "todos" para ver la lista completa.`;
}

function _respAllProjects() {
  if (!_projects.length) return 'Un momento, estoy cargando los datos…';
  const lines = _projects
    .map(p => `**${p.title}** — ${(p.description || '').slice(0, 70)}…`)
    .join('\n');
  return `Los **${_projects.length} proyectos** de Jonathan:\n\n${lines}\n\nPregúntame por cualquiera para ver detalles.`;
}

function _respRecentProjects() {
  const sorted = [..._projects]
    .filter(p => p.date)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 5);
  if (!sorted.length) return _respListProjects();
  const lines = sorted
    .map(p => `**${p.title}** (${p.date}) — ${(p.description || '').slice(0, 70)}…`)
    .join('\n');
  return `Los proyectos más recientes de Jonathan:\n\n${lines}\n\nPregúntame por cualquiera para ver más detalles.`;
}

function _respTopSkills() {
  const top = [..._skills].filter(s => s.level >= 4).sort((a, b) => b.level - a.level);
  if (!top.length) return _respListSkills();
  const list = top
    .map(s => `**${s.name}** — ${'★'.repeat(s.level)}${'☆'.repeat(5 - s.level)} ${_skillLevel(s.level)}`)
    .join('\n');
  return `Las áreas donde Jonathan más destaca:\n\n${list}`;
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

// ── RESPONSE BUILDERS (nuevos intents) ──────────────────────────────────────

function _respThanks() {
  return '¡De nada! Estoy aquí si tienes más preguntas sobre el portafolio de Jonathan.';
}

function _respHelp() {
  return `Puedo ayudarte con esto:\n\n**Proyectos** — "muéstrame UBApp", "¿qué proyectos tiene?"\n**Skills** — "¿qué tecnologías usa?", "cuéntame sobre React"\n**Perfil** — "¿quién es Jonathan?", "preséntate"\n**Contacto** — "¿cómo contactarlo?"\n\nPregunta en lenguaje natural — entiendo español e inglés.`;
}

// ── INTENT DETECTION ─────────────────────────────────────────────────────────

function _detectIntent(norm) {
  // "todos" explícito → lista completa
  if (_matchAny(norm, [
    'todos los proyectos', 'lista completa', 'listar proyectos', 'lista proyectos',
    'cuantos proyectos', 'que proyectos tiene', 'que trabajos tiene',
    'mostrar todos', 'ver todos', 'todos',
  ])) return 'list_all_projects';

  if (_matchAny(norm, [
    'proyectos', 'portafolio', 'portfolio', 'que has hecho', 'que hiciste',
    'mostrar proyectos', 'ver proyectos', 'que trabajo',
  ])) return 'list_projects';

  // Proyectos recientes
  if (_matchAny(norm, [
    'reciente', 'recientes', 'nuevo', 'nuevos', 'lo nuevo', 'ultimo', 'ultimos',
    'lo mas nuevo', 'novedades', 'latest', 'recent', 'recientemente',
  ])) return 'recent_projects';

  // Top skills / especialidades
  if (_matchAny(norm, [
    'en que es pro', 'en que destaca', 'en que sobresale', 'mejor en', 'fuerte en',
    'especialidad', 'especialidades', 'mas fuerte', 'mas avanzado',
    'experto', 'experta', 'avanzado', 'avanzada', 'domina',
  ])) return 'top_skills';

  if (_matchAny(norm, [
    'tus skills', 'tus habilidades', 'que sabes', 'que tecnologias', 'que dominas',
    'tu stack', 'tecnologias que', 'habilidades tecnicas', 'que conoces',
    'que lenguajes', 'que frameworks', 'stack tecnologico',
  ])) return 'list_skills';

  if (_matchAny(norm, [
    'quien es jonathan', 'quien eres', 'presentate', 'sobre ti', 'bio de jonathan',
    'perfil de jonathan', 'sobre jonathan', 'acerca de jonathan', 'te presentes',
  ])) return 'personal';

  if (_matchAny(norm, [
    'contacto', 'email', 'correo', 'linkedin', 'github', 'redes sociales',
    'donde encontrar', 'como contactar', 'instagram',
  ])) return 'contact';

  if (_matchAny(norm, [
    'gracias', 'muchas gracias', 'genial', 'perfecto', 'ok gracias', 'thank you', 'thanks',
    'chevere', 'excelente', 'buenisimo',
  ])) return 'thanks';

  if (_matchAny(norm, [
    'ayuda', 'que puedes hacer', 'que sabes hacer', 'capacidades', 'que puedo preguntar',
    'comandos', 'help', 'opciones disponibles', 'opciones', 'como funciona',
  ])) return 'help';

  if (_matchAny(norm, [
    'cuando fue', 'en que ano', 'fecha del', 'cuando lo hizo', 'cuando hizo',
    'en que fecha', 'que ano', 'cuando fue ese',
  ])) return 'when';

  return 'search';
}

// ── REFERENTIAL RESOLUTION ───────────────────────────────────────────────────

function _detectReferential(norm) {
  const refs = [
    'ese proyecto', 'eso mismo', 'el mismo', 'la misma', 'ese mismo',
    'ese', 'eso', 'el otro', 'mas sobre', 'mas informacion', 'cuentame mas',
    'y ese', 'dime mas', 'que stack', 'que tecnologia uso', 'que uso',
    'proyectos similares', 'parecidos', 'como ese', 'relacionados',
  ];
  return refs.some(r => norm.includes(r));
}

function _resolveWhen(context) {
  for (let i = context.length - 1; i >= 0; i--) {
    const turn = context[i];
    if (turn.role === 'bot' && turn.result?.type === 'project') {
      const d = turn.result.data?.date;
      if (d) return { type: 'special', text: `Ese proyecto fue en **${d.replace('-', ' / ')}**.` };
      return { type: 'special', text: 'No tengo la fecha exacta de ese proyecto.' };
    }
  }
  return { type: 'special', text: '¿A qué proyecto te refieres? Pregúntame por uno específico.' };
}

function _resolveReferential(norm, context) {
  for (let i = context.length - 1; i >= 0; i--) {
    const turn = context[i];
    if (turn.role !== 'bot' || !turn.result) continue;
    const last = turn.result;

    if (_matchAny(norm, ['stack', 'tecnologia', 'que uso', 'que usa', 'que lenguaje', 'herramientas'])) {
      if (last.type === 'project' && last.data?.techStack) {
        const tech = Object.values(last.data.techStack).flat().join(', ');
        return { type: 'special', text: `Stack de **${last.data.title}**: ${tech}.` };
      }
    }

    if (_matchAny(norm, ['similares', 'parecidos', 'como ese', 'relacionados'])) {
      if (last.type === 'project' && last.data?.tags?.length) {
        const tag = last.data.tags[0];
        const similar = _kb.find(doc =>
          doc.type === 'project' &&
          doc.data.slug !== last.data.slug &&
          (doc.data.tags || []).includes(tag)
        );
        if (similar) return { type: 'project', data: similar.data };
      }
    }

    // Follow-up general: devuelve el último resultado
    return { ...last, _referential: true };
  }
  return null;
}

// ── QUERY ENGINE ─────────────────────────────────────────────────────────────

function _query(input, context = []) {
  if (!_ready) return {
    type: 'special',
    text: 'Un momento, estoy cargando mis datos… Intenta de nuevo enseguida.',
  };

  const norm   = _norm(input);
  const intent = _detectIntent(norm);

  if (intent === 'list_all_projects') return { type: 'special', text: _respAllProjects() };
  if (intent === 'list_projects') return { type: 'special', text: _respListProjects() };
  if (intent === 'recent_projects') return { type: 'special', text: _respRecentProjects() };
  if (intent === 'top_skills')    return { type: 'special', text: _respTopSkills() };
  if (intent === 'list_skills')   return { type: 'special', text: _respListSkills() };
  if (intent === 'personal')      return { type: 'special', text: _respPersonal() };
  if (intent === 'contact')       return { type: 'special', text: _respContact() };
  if (intent === 'thanks')        return { type: 'special', text: _respThanks(), mood: 'excited' };
  if (intent === 'help')          return { type: 'special', text: _respHelp() };
  if (intent === 'when')          return _resolveWhen(context);

  // Resolución referencial si hay contexto previo
  if (context.length > 0 && _detectReferential(norm)) {
    const ref = _resolveReferential(norm, context);
    if (ref) return ref;
  }

  // Keyword search over KB
  for (const doc of _kb) {
    if (doc.type !== 'project' && doc.type !== 'skill') continue;
    if (_matchAny(norm, doc.keywords)) return { type: doc.type, data: doc.data };
  }

  return null;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────
// El rendering lo hace ia-mascot.js; aquí solo cargamos la KB.

async function init() {
  await _loadData();
  // Notifica al mascot widget que la KB está lista para enviar al worker
  window.dispatchEvent(new CustomEvent('jotai:kb-ready', {
    detail: { kb: _kb.filter(d => d.text) }, // solo docs con texto para embedding
  }));
}

// Expone query() y getKB() para ia-mascot.js y Fase 3 (embeddings)
export const IAAssistant = { init, query: (input, context) => _query(input, context), getKB: () => _kb };
