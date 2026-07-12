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
let _lexicon   = {};
let _kb        = [];
let _entityIndex = new Map();
let _ready     = false;

// ── DATA LOADING ─────────────────────────────────────────────────────────────

async function _loadData() {
  try {
    const [personal, dev, ia, sec, skills, lexicon] = await Promise.all([
      fetch('data/personal.json').then(r => r.json()),
      fetch('data/dev-projects.json').then(r => r.json()),
      fetch('data/ia-projects.json').then(r => r.json()),
      fetch('data/sec-projects.json').then(r => r.json()),
      fetch('data/skills.json').then(r => r.json()),
      fetch('data/nlp-lexicon.json').then(r => r.json()).catch(() => ({})),
    ]);
    _personal = personal;
    _projects = [...dev, ...ia, ...sec];
    _skills   = skills;
    _lexicon  = lexicon;
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
  // Usar aliases del lexicón si existe, fallback a _SKILL_ALIASES
  const lexiconAliases = _lexicon.aliases && _lexicon.aliases[normKey];
  const aliases = lexiconAliases || _SKILL_ALIASES[normKey];
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
  const highlights = (p.highlights || []).join(' ');
  return [
    p.title,
    p.description,
    p.longDescription,
    (p.tags || []).join(' '),
    tech,
    p.process?.overview,
    lab,
    highlights,
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

  // Build entity index para entity extraction (Fase B)
  _buildEntityIndex();
}

// ── ENTITY INDEX ─────────────────────────────────────────────────────────────

function _buildEntityIndex() {
  _entityIndex.clear();

  // Agregar aliases del lexicón (con normalización inversa)
  if (_lexicon.aliases) {
    Object.entries(_lexicon.aliases).forEach(([canonical, aliasList]) => {
      _entityIndex.set(_norm(canonical), canonical);
      if (Array.isArray(aliasList)) {
        aliasList.forEach(alias => {
          _entityIndex.set(_norm(alias), canonical);
        });
      }
    });
  }

  // Agregar nombres de skills
  _skills.forEach(s => {
    _entityIndex.set(_norm(s.name), s.name);
  });

  // Agregar tags de proyectos
  _projects.forEach(p => {
    (p.tags || []).forEach(tag => {
      _entityIndex.set(_norm(tag), tag);
    });
    // Agregar techStack si existe
    if (p.techStack) {
      Object.values(p.techStack).flat().forEach(tech => {
        if (tech) _entityIndex.set(_norm(tech), tech);
      });
    }
    // Agregar lab.techniques si existe
    if (p.lab && p.lab.techniques) {
      p.lab.techniques.forEach(tech => {
        _entityIndex.set(_norm(tech), tech);
      });
    }
  });
}

// ── ENTITY EXTRACTION (Fase B) ────────────────────────────────────────────────

function _extractEntities(norm) {
  const entities = new Set();
  // Iterar sobre las claves del índice ordenadas por longitud descendente
  // (para que "postgresql" gane sobre "sql" cuando ambos aparecen)
  const sortedTerms = Array.from(_entityIndex.keys()).sort((a, b) => b.length - a.length);

  for (const term of sortedTerms) {
    if (norm.includes(term)) {
      const canonical = _entityIndex.get(term);
      entities.add(canonical);
      // Remover el término encontrado del norm para no duplicar entidades
      norm = norm.replace(term, '');
    }
  }
  return Array.from(entities);
}

function expandQuery(text) {
  const norm = _norm(text);
  const entities = _extractEntities(norm);
  // Si no hay entidades, devolver el texto original
  if (!entities.length) return text;
  // Agregar las entidades canónicas al final del texto para mejorar embeddings
  return `${text} ${entities.join(' ')}`;
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

function _respExperience() {
  if (!_personal || !_personal.timeline) return 'Un momento, estoy cargando los datos…';
  const work = _personal.timeline.filter(t =>
    ['Empleo', 'Freelance', 'Cliente', 'Hackathon', 'Internship'].includes(t.type)
  );
  if (!work.length) return 'Jonathan aún no ha documentado experiencia profesional.';
  const lines = work
    .map(e => `**${e.role}** en ${e.project || 'proyecto'} (${e.period})\n${e.description}`)
    .join('\n\n');
  return `Experiencia profesional de Jonathan:\n\n${lines}`;
}

function _respEducation() {
  if (!_personal || !_personal.timeline) return 'Un momento, estoy cargando los datos…';
  const edu = _personal.timeline.filter(t =>
    ['Titulación', 'Certificación', 'Práctica', 'En Curso'].includes(t.type)
  );
  if (!edu.length) return 'Jonathan aún no ha documentado su formación.';
  const lines = edu
    .map(e => `**${e.role}** — ${e.project || 'programa'} (${e.period})\n${e.description}`)
    .join('\n\n');
  return `Formación y certificaciones de Jonathan:\n\n${lines}`;
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

  // Nuevos intents (Fase B) — después de los 4 legacy
  if (_matchAny(norm, [
    'experiencia laboral', 'donde ha trabajado', 'donde trabajas', 'trabajos anteriores',
    'freelance', 'cliente', 'proyectos profesionales', 'trayectoria profesional',
  ])) return 'experience';

  if (_matchAny(norm, [
    'donde estudias', 'donde estudio', 'educacion', 'formacion',
    'universidad', 'espoch', 'carrera', 'licenciatura', 'grado',
    'certificaciones', 'certificado', 'titulacion',
  ])) return 'education';

  return 'search';
}

// ── SCORING (Fase C) ─────────────────────────────────────────────────────────

function _scoreKeywordCandidates(norm, entities) {
  const candidates = [];
  const queryTokens = norm.split(/\s+/).filter(t => t.length > 1 && !_STOP.has(t));

  for (const doc of _kb) {
    if (doc.type !== 'project' && doc.type !== 'skill') continue;

    // Calcular keywordScore: Jaccard-like sobre tokens
    // overlap / queryTokens.length (no sobre doc.keywords.length, para no penalizar docs con muchos keywords)
    let overlap = 0;
    queryTokens.forEach(token => {
      if (_matchAny(token, doc.keywords)) overlap++;
    });
    const keywordScore = queryTokens.length > 0 ? overlap / queryTokens.length : 0;

    // +1.0 flat si slug o título matchean verbatim (bonus por exactitud)
    const titleSquish = (doc.data.title || '').toLowerCase().replace(/\s+/g, '');
    const slugMatch = (doc.data.slug || '').toLowerCase() === norm.replace(/\s+/g, '');
    const titleMatch = titleSquish === norm.replace(/\s+/g, '');
    if (slugMatch || titleMatch) overlap += 1.0;

    // tagScore: overlap entre entidades extraídas y tags del doc
    const docTags = new Set([
      ...(doc.data.tags || []),
      ...(doc.data.category ? [doc.data.category] : []),
    ].map(t => _norm(t)));
    let tagOverlap = 0;
    entities.forEach(e => {
      if (docTags.has(_norm(e))) tagOverlap++;
    });
    const tagScore = entities.length > 0 ? tagOverlap / entities.length : 0;

    // contextBoost: será calculado en rankHybrid (aquí es 0)
    // pero preparamos el objeto para que rankHybrid lo use

    if (keywordScore > 0 || tagScore > 0) {
      candidates.push({
        id: doc.id,
        type: doc.type,
        data: doc.data,
        keywordScore,
        tagScore,
      });
    }
  }

  // Ordenar por keywordScore descendente (fallback si rankHybrid no lo toca)
  return candidates.sort((a, b) => b.keywordScore - a.keywordScore);
}

function rankHybrid({ keywordCandidates = [], semanticCandidates = [], context = {} }) {
  // Función pura que combina keyword + semantic + tag scores con pesos:
  // keywordScore 0.45, semanticScore 0.30, tagScore 0.15, contextBoost 0.10

  // Unir candidatos de ambas fuentes (keyword ∪ semantic)
  const candidateMap = new Map();

  keywordCandidates.forEach(c => {
    candidateMap.set(c.id, {
      ...c,
      semanticScore: 0,
    });
  });

  semanticCandidates.forEach(c => {
    const existing = candidateMap.get(c.id);
    if (existing) {
      existing.semanticScore = c.score;
    } else {
      candidateMap.set(c.id, {
        id: c.id,
        type: c.type,
        data: c.data,
        keywordScore: 0,
        tagScore: 0,
        semanticScore: c.score,
      });
    }
  });

  const poolCandidates = Array.from(candidateMap.values());
  if (!poolCandidates.length) return null;

  // Normalizar scores min-max dentro del pool (para que sean comparables)
  const normalizeScores = (candidates) => {
    ['keywordScore', 'semanticScore', 'tagScore'].forEach(scoreType => {
      const scores = candidates.map(c => c[scoreType]).filter(s => s > 0);
      if (scores.length === 0) return;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const range = max - min || 1;
      candidates.forEach(c => {
        c[scoreType] = (c[scoreType] - min) / range;
      });
    });
  };

  normalizeScores(poolCandidates);

  // Calcular context boost (0.1 weight)
  poolCandidates.forEach(c => {
    let boost = 0;
    if (context.lastProjectId && c.type === 'project' && c.data.slug === context.lastProjectId) {
      boost = 1.0; // match exacto con último proyecto
    } else if (context.lastSkillName && c.type === 'skill' && c.data.name === context.lastSkillName) {
      boost = 1.0; // match exacto con último skill
    } else if (c.data.featured) {
      boost = 0.3; // desempate suave para proyectos destacados
    }
    c.contextBoost = boost;
  });

  // Aplicar pesos: 0.45 keyword, 0.30 semantic, 0.15 tag, 0.10 context
  poolCandidates.forEach(c => {
    c.finalScore = (
      c.keywordScore * 0.45 +
      c.semanticScore * 0.30 +
      c.tagScore * 0.15 +
      c.contextBoost * 0.10
    );
  });

  // Ordenar por finalScore descendente
  poolCandidates.sort((a, b) => b.finalScore - a.finalScore);

  // Threshold de aceptación: el mejor candidato debe tener score >= 0.15
  // para ser considerado una respuesta válida (no ruido/error)
  if (!poolCandidates[0] || poolCandidates[0].finalScore < 0.15) {
    return null;
  }

  // Devolver el mejor + top-3 para fallback
  return {
    best: poolCandidates[0],
    top3: poolCandidates.slice(0, 3),
  };
}

// ── QUERY ENGINE ─────────────────────────────────────────────────────────────

const _FOLLOWUP_PATTERNS = [
  'que stack usa', 'que tecnologias usa', 'que tecnologia',
  'y el backend', 'y el frontend', 'y la arquitectura',
  'cuentame mas', 'cuéntame más', 'dime mas', 'dime más',
  'en que nivel', 'que tan bueno', 'que tal es',
  'como se construyo', 'como esta hecho',
];

function _query(input, context = {}) {
  if (!_ready) return {
    type: 'special',
    text: 'Un momento, estoy cargando mis datos… Intenta de nuevo enseguida.',
  };

  const norm   = _norm(input);
  const intent = _detectIntent(norm);

  if (intent === 'list_projects') return {
    type: 'special',
    text: _respListProjects(),
    chipContext: { category: 'projects', chips: ['¿En qué es pro?', 'Proyectos por modo'] },
  };
  if (intent === 'list_skills') return {
    type: 'special',
    text: _respListSkills(),
    chipContext: { category: 'skills', chips: ['Ver proyectos', 'Más detalles'] },
  };
  if (intent === 'personal') return {
    type: 'special',
    text: _respPersonal(),
    chipContext: { category: 'profile', chips: ['Experiencia', '¿Cómo contactar?', 'Stack'] },
  };
  if (intent === 'contact') return {
    type: 'special',
    text: _respContact(),
    chipContext: { category: 'contact', chips: ['¿Quién es?', 'Ver proyectos'] },
  };
  if (intent === 'experience') return {
    type: 'special',
    text: _respExperience(),
    chipContext: { category: 'experience', chips: ['Formación', 'Ver proyectos', '¿Quién es?'] },
  };
  if (intent === 'education') return {
    type: 'special',
    text: _respEducation(),
    chipContext: { category: 'education', chips: ['Experiencia profesional', 'Certificaciones', 'Proyectos'] },
  };

  // ── Resolución de continuidad (follow-up questions sobre el contexto anterior)
  // Si el patrón matchea y tenemos contexto, resolver directamente sin pasar por scoring
  const isFollowup = _FOLLOWUP_PATTERNS.some(p => norm.includes(_norm(p)));
  if (isFollowup && context) {
    if (context.lastProjectId) {
      // Buscar el proyecto en _kb por id
      const projDoc = _kb.find(d => d.type === 'project' && d.data.slug === context.lastProjectId);
      if (projDoc) return { type: 'project', data: projDoc.data, isFollowup: true };
    }
    if (context.lastSkillName) {
      // Buscar el skill en _kb por nombre
      const skillDoc = _kb.find(d => d.type === 'skill' && d.data.name === context.lastSkillName);
      if (skillDoc) return { type: 'skill', data: skillDoc.data, isFollowup: true };
    }
  }

  // ── Keyword search + entity extraction (Fase B/C)
  const entities = _extractEntities(norm);
  const candidates = _scoreKeywordCandidates(norm, entities);

  // Devolver el mejor candidato con su score y candidates para rankHybrid (Fase C)
  return { type: 'search', candidates, entities };
}

// ── FALLBACK MULTINIVEL (Fase D) ──────────────────────────────────────────────

function getFallback(norm, entities) {
  // Nivel 1: reintenta con query expandida (detecta más palabras clave)
  const expandedNorm = _norm(expandQuery(norm));
  const expandedEntities = _extractEntities(expandedNorm);
  let candidates = _scoreKeywordCandidates(expandedNorm, expandedEntities);

  // Si hay candidatos con score medio (≥0.3), devolverlos
  if (candidates.some(c => c.keywordScore >= 0.3)) {
    return { level: 1, candidates };
  }

  // Nivel 2: búsqueda por categoría/tags (match parcial flexible)
  if (entities.length > 0) {
    const catCandidates = [];
    _kb.forEach(doc => {
      if (doc.type !== 'project' && doc.type !== 'skill') return;
      const docTags = new Set([
        ...(doc.data.tags || []),
        ...(doc.data.category ? [doc.data.category] : []),
      ].map(t => _norm(t)));

      let overlap = 0;
      entities.forEach(e => {
        if (docTags.has(_norm(e))) overlap++;
      });

      if (overlap > 0) {
        catCandidates.push({
          id: doc.id,
          type: doc.type,
          data: doc.data,
          tagScore: overlap / entities.length,
          keywordScore: 0,
        });
      }
    });

    // Ordenar por tagScore y devolver si hay hits
    catCandidates.sort((a, b) => b.tagScore - a.tagScore);
    if (catCandidates.length > 0) {
      return { level: 2, candidates: catCandidates.slice(0, 3) };
    }
  }

  // Nivel 3: respuesta exploratoria (sin candidatos técnicos)
  // Buscar items destacados o aleatorios por categoría
  const allProjects = _kb.filter(d => d.type === 'project' && d.data.featured);
  const allSkills = _kb.filter(d => d.type === 'skill').slice(0, 3);

  return {
    level: 3,
    suggestion: 'exploratoria',
    featuredProjects: allProjects.slice(0, 2),
    sampleSkills: allSkills,
  };
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

// Expone query() y getKB() para ia-mascot.js, expandQuery para Fase C, rankHybrid para scoring
export const IAAssistant = { init, query: _query, getKB: () => _kb, expandQuery, rankHybrid, getFallback };
