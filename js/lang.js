/**
 * lang.js
 * Cambio de idioma ES ↔ EN para el portfolio.
 * Usa atributos data-i18n en el HTML para identificar elementos.
 */

const TRANSLATIONS = {
  es: {
    // Nav desktop
    'nav.about':      'Sobre mí',
    'nav.skills':     'Habilidades',
    'nav.projects':   'Proyectos',
    'nav.experience': 'Experiencia',
    'nav.contact':    'Contacto',
    'nav.ia':         'Consulta IA',
    // Nav mobile
    'nav.mob.about':      'Sobre mí',
    'nav.mob.projects':   'Proyectos',
    'nav.mob.skills':     'Habilidades',
    'nav.mob.ia':         'Consulta IA',
    'nav.mob.contact':    'Contacto',
    'nav.mob.mode':       'MODO ACTIVO',
    // Hero
    'hero.badge':     '⚡ Software Engineering',
    'hero.tagline':   'Building robust systems & scalable applications',
    'hero.cta1':      'Ver proyectos',
    'hero.cta2':      'Contactar',
    // About
    'about.label':    '// sobre mí',
    'about.title':    'Conóceme',
    'about.cv':       'Ver mi CV',
    'about.connect':  'Conecta conmigo',
    'about.open':     'Siempre abierto a nuevas oportunidades, proyectos interesantes y colaboraciones de impacto real.',
    // Skills
    'skills.label':   '// habilidades',
    'skills.title':   'Stack técnico',
    'skills.desc':    'Tecnologías y herramientas que uso para construir soluciones.',
    // Projects
    'projects.label': '// proyectos',
    'projects.title': 'Soluciones implementadas',
    'projects.desc':  'Sistemas y aplicaciones construidos con énfasis en calidad y arquitectura.',
    'projects.demo':  'Ver demo',
    'projects.code':  'Código',
    'projects.process': 'Proceso',
    'projects.writeup': 'Writeup',
    'projects.private': 'Repositorio privado',
    'projects.featured': 'Destacado',
    'projects.pwned':    'Machine Pwned',
    'projects.techniques': 'Técnicas:',
    'projects.topics':     'Temas:',
    'projects.cert':       'Certificación',
    'projects.practice':   'Prácticas',
    'projects.completed':  'Completado',
    'projects.certified':  'Certificado',
    'projects.certificate': 'Certificado',
    'projects.prev':  'Anterior',
    'projects.next':  'Siguiente',
    'projects.filterAll': 'Todos',
    // IA assistant
    'ia.label':       '// sistemas ia',
    'ia.title':       'Consulta mi experiencia',
    'ia.desc':        'Escribe un área tecnológica o stack y te respondo si Jonathan tiene experiencia real en eso.',
    'ia.placeholder': 'Busca proyectos, tecnologías, contacto...',
    'ia.disclaimer':  'Respuestas basadas en el perfil real de Jonathan · Motor NLP local',
    'ia.sug1':        '¿Qué proyectos tienes?',
    'ia.sug2':        '¿Cómo contactarlo?',
    // Experience / Panel
    'exp.label':      '// experiencia',
    'exp.title':      'Trayectoria',
    'exp.desc':       'Proyectos reales, formación y trabajo independiente.',
    'panel.label':    '// trayectoria',
    'panel.sub':      'Proyectos reales, formación y trabajo independiente.',
    'panel.close':    'Cerrar panel',
    // Contact
    'contact.label':  '// contacto',
    'contact.title':  'Hablemos',
    'contact.desc':   '¿Tienes un proyecto, una oportunidad o quieres conversar? Escríbeme.',
    'contact.connect': 'Conecta conmigo',
    'contact.open':   'Siempre abierto a nuevas oportunidades, proyectos interesantes y colaboraciones de impacto real.',
    'contact.copy':   'Copiar',
    'contact.copied': '✓ Copiado',
    'contact.name':   'Nombre *',
    'contact.email':  'Email *',
    'contact.subject':'Asunto',
    'contact.message':'Mensaje *',
    'contact.send':   'Enviar mensaje',
    'contact.name.ph':    'Tu nombre completo',
    'contact.email.ph':   'tu@email.com',
    'contact.subject.ph': '¿De qué trata tu mensaje?',
    'contact.message.ph': 'Cuéntame sobre tu proyecto, idea u oportunidad...',
    // Contact availability by mode
    'contact.avail.dev': 'Disponible para proyectos fullstack y oportunidades remotas',
    'contact.avail.ia':  'Disponible para proyectos de IA y consultoría de sistemas inteligentes',
    'contact.avail.sec': 'Disponible para auditorías de seguridad y análisis de vulnerabilidades',
    // Form feedback
    'form.sending':      'Enviando...',
    'form.success':      '✅ ¡Mensaje enviado! Te responderé pronto.',
    'form.error.fields': '⚠️ Por favor completa los campos obligatorios (nombre, email y mensaje).',
    'form.error.email':  '⚠️ Ingresa un email válido.',
    'form.error.mailto': '⚠️ Redirigiendo a tu cliente de email como alternativa.',
    // Footer
    'footer.copy':    '© 2026 Jonathan Aucancela.',
    'footer.mode':    'Modo:',
    // Mode bar
    'modebar.label':      '3 modos',
    'modebar.aria':       'Selector de modo — 3 modos disponibles',
    'modebar.dev.aria':   '.dev — Modo desarrollador: proyectos full-stack',
    'modebar.ia.aria':    '.ia — Modo inteligencia artificial: proyectos con LLMs y ML',
    'modebar.sec.aria':   '.sec — Modo ciberseguridad: labs y pentesting',
    // Hero · widget de actividad de Git (modo .dev)
    'gitw.aria':          'Actividad de Git',
    'gitw.summaryLabel':  'Pull requests',
    'gitw.more':          'Ver más',
    'gitw.less':          'Ver menos',
    'gitw.heatmapLabel':  'Commits por semana · últimas 12 semanas',
    'gitw.statPrs':       'Pull requests',
    'gitw.statCommits':   'Commits',
    'gitw.statProjects':  'Proyectos',
    'gitw.loading':       'Cargando…',
    'gitw.prHistory':     'Historial de pull requests',
    'gitw.day.mon':       'Lun',
    'gitw.day.wed':       'Mié',
    'gitw.day.fri':       'Vie',
    'gitw.noActivity':    'Sin actividad reciente disponible',
    'gitw.today':         'hoy',
    'gitw.yesterday':     'ayer',
    'gitw.contribsSuffix':      'contribuciones',
    'gitw.commitsRepoSuffix':   'commits (solo este repo)',
    'gitw.weeksSuffix':        'últimas 12 semanas',
    'gitw.contribSingular':    'contribución',
    'gitw.contribPlural':      'contribuciones',
    'gitw.commitSingular':     'commit',
    'gitw.commitPlural':       'commits',
    // Hero · widget de tokens de LLM Observatory (modo .ia)
    'iaw.aria':           'Tokens procesados por LLM Observatory',
    'iaw.label':          'Tokens procesados · total (todos los proyectos)',
    'iaw.more':           'Ver más',
    'iaw.less':           'Ver menos',
    'iaw.projectsLabel':  'Proyectos de IA · tokens por proyecto',
    'iaw.loading':        'Cargando…',
    'iaw.status.connecting': 'conectando…',
    'iaw.status.syncing':    'sincronizando…',
    'iaw.status.live':       'en vivo · LLM Observatory',
    'iaw.status.offline':    'sin conexión',
    'iaw.noProjects':     'Sin proyectos disponibles',
    'iaw.offline':        'Sin conexión',
    'iaw.tokensSuffix':   'tokens',
    // Hero · compuerta de la terminal (modo .sec)
    'secterm.aria':       'Terminal interactiva',
    'secterm.gatePre':    'Click',
    'secterm.gatePost':   'para acceder',
    // Gallery / detalle de proyecto
    'gallery.closeAria':  'Cerrar galería',
    'gallery.pdfTitle':   'Documento PDF',
    'gallery.thumb':      'Miniatura',
    'gallery.imgAlt':     'imagen',
    'detail.closeAria':   'Cerrar detalle del proyecto',
    // Lang button
    'lang.btn':       'EN',
  },
  en: {
    // Nav desktop
    'nav.about':      'About',
    'nav.skills':     'Skills',
    'nav.projects':   'Projects',
    'nav.experience': 'Experience',
    'nav.contact':    'Contact',
    'nav.ia':         'Ask AI',
    // Nav mobile
    'nav.mob.about':      'About',
    'nav.mob.projects':   'Projects',
    'nav.mob.skills':     'Skills',
    'nav.mob.ia':         'Ask AI',
    'nav.mob.contact':    'Contact',
    'nav.mob.mode':       'ACTIVE MODE',
    // Hero
    'hero.badge':     '⚡ Software Engineering',
    'hero.tagline':   'Building robust systems & scalable applications',
    'hero.cta1':      'View projects',
    'hero.cta2':      'Contact me',
    // About
    'about.label':    '// about me',
    'about.title':    'Get to know me',
    'about.cv':       'View my CV',
    'about.connect':  'Connect with me',
    'about.open':     'Always open to new opportunities, interesting projects and real-impact collaborations.',
    // Skills
    'skills.label':   '// skills',
    'skills.title':   'Tech stack',
    'skills.desc':    'Technologies and tools I use to build solutions.',
    // Projects
    'projects.label': '// projects',
    'projects.title': 'Implemented solutions',
    'projects.desc':  'Systems and applications built with emphasis on quality and architecture.',
    'projects.demo':  'Live demo',
    'projects.code':  'Code',
    'projects.process': 'Process',
    'projects.writeup': 'Writeup',
    'projects.private': 'Private repository',
    'projects.featured': 'Featured',
    'projects.pwned':    'Machine Pwned',
    'projects.techniques': 'Techniques:',
    'projects.topics':     'Topics:',
    'projects.cert':       'Certification',
    'projects.practice':   'Internship',
    'projects.completed':  'Completed',
    'projects.certified':  'Certified',
    'projects.certificate': 'Certificate',
    'projects.prev':  'Previous',
    'projects.next':  'Next',
    'projects.filterAll': 'All',
    // IA assistant
    'ia.label':       '// ia systems',
    'ia.title':       'Ask about my experience',
    'ia.desc':        'Type a technology area or stack and I\'ll tell you if Jonathan has real experience with it.',
    'ia.placeholder': 'Search projects, technologies, contact...',
    'ia.disclaimer':  'Responses based on Jonathan\'s real profile · Local NLP engine',
    'ia.sug1':        'What projects do you have?',
    'ia.sug2':        'How to contact?',
    // Experience / Panel
    'exp.label':      '// experience',
    'exp.title':      'Timeline',
    'exp.desc':       'Real projects, education and freelance work.',
    'panel.label':    '// timeline',
    'panel.sub':      'Real projects, education and freelance work.',
    'panel.close':    'Close panel',
    // Contact
    'contact.label':  '// contact',
    'contact.title':  'Let\'s talk',
    'contact.desc':   'Have a project, an opportunity, or just want to chat? Write to me.',
    'contact.connect': 'Connect with me',
    'contact.open':   'Always open to new opportunities, interesting projects and real-impact collaborations.',
    'contact.copy':   'Copy',
    'contact.copied': '✓ Copied',
    'contact.name':   'Name *',
    'contact.email':  'Email *',
    'contact.subject':'Subject',
    'contact.message':'Message *',
    'contact.send':   'Send message',
    'contact.name.ph':    'Your full name',
    'contact.email.ph':   'your@email.com',
    'contact.subject.ph': 'What is your message about?',
    'contact.message.ph': 'Tell me about your project, idea or opportunity...',
    // Contact availability by mode
    'contact.avail.dev': 'Available for fullstack projects and remote opportunities',
    'contact.avail.ia':  'Available for AI projects and intelligent systems consulting',
    'contact.avail.sec': 'Available for security audits and vulnerability analysis',
    // Form feedback
    'form.sending':      'Sending...',
    'form.success':      '✅ Message sent! I\'ll get back to you soon.',
    'form.error.fields': '⚠️ Please fill in the required fields (name, email and message).',
    'form.error.email':  '⚠️ Please enter a valid email address.',
    'form.error.mailto': '⚠️ Redirecting to your email client as a fallback.',
    // Footer
    'footer.copy':    '© 2026 Jonathan Aucancela.',
    'footer.mode':    'Mode:',
    // Mode bar
    'modebar.label':      '3 modes',
    'modebar.aria':       'Mode selector — 3 modes available',
    'modebar.dev.aria':   '.dev — Developer mode: full-stack projects',
    'modebar.ia.aria':    '.ia — Artificial intelligence mode: LLM and ML projects',
    'modebar.sec.aria':   '.sec — Cybersecurity mode: labs and pentesting',
    // Hero · Git activity widget (.dev mode)
    'gitw.aria':          'Git activity',
    'gitw.summaryLabel':  'Pull requests',
    'gitw.more':          'See more',
    'gitw.less':          'See less',
    'gitw.heatmapLabel':  'Commits per week · last 12 weeks',
    'gitw.statPrs':       'Pull requests',
    'gitw.statCommits':   'Commits',
    'gitw.statProjects':  'Projects',
    'gitw.loading':       'Loading…',
    'gitw.prHistory':     'Pull request history',
    'gitw.day.mon':       'Mon',
    'gitw.day.wed':       'Wed',
    'gitw.day.fri':       'Fri',
    'gitw.noActivity':    'No recent activity available',
    'gitw.today':         'today',
    'gitw.yesterday':     'yesterday',
    'gitw.contribsSuffix':      'contributions',
    'gitw.commitsRepoSuffix':   'commits (this repo only)',
    'gitw.weeksSuffix':        'last 12 weeks',
    'gitw.contribSingular':    'contribution',
    'gitw.contribPlural':      'contributions',
    'gitw.commitSingular':     'commit',
    'gitw.commitPlural':       'commits',
    // Hero · LLM Observatory tokens widget (.ia mode)
    'iaw.aria':           'Tokens processed by LLM Observatory',
    'iaw.label':          'Tokens processed · total (all projects)',
    'iaw.more':           'See more',
    'iaw.less':           'See less',
    'iaw.projectsLabel':  'AI projects · tokens per project',
    'iaw.loading':        'Loading…',
    'iaw.status.connecting': 'connecting…',
    'iaw.status.syncing':    'syncing…',
    'iaw.status.live':       'live · LLM Observatory',
    'iaw.status.offline':    'offline',
    'iaw.noProjects':     'No projects available',
    'iaw.offline':        'No connection',
    'iaw.tokensSuffix':   'tokens',
    // Hero · terminal gate (.sec mode)
    'secterm.aria':       'Interactive terminal',
    'secterm.gatePre':    'Click',
    'secterm.gatePost':   'to enter',
    // Gallery / project detail
    'gallery.closeAria':  'Close gallery',
    'gallery.pdfTitle':   'PDF document',
    'gallery.thumb':      'Thumbnail',
    'gallery.imgAlt':     'image',
    'detail.closeAria':   'Close project detail',
    // Lang button
    'lang.btn':       'ES',
  },
};

let currentLang = localStorage.getItem('portfolio-lang') || 'es';

/** Devuelve la traducción para una clave. Fallback: la propia clave. */
function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? key;
}

/** Devuelve el idioma activo ('es' | 'en'). */
function getLang() {
  return currentLang;
}

/**
 * Resuelve un campo de datos que puede venir como string plano o como
 * objeto bilingüe { es: ..., en: ... }. Soporta también valores no-string
 * (arrays de puntos: { es: [...], en: [...] }). Fallback: idioma activo →
 * español → inglés → el valor tal cual.
 */
function L(val) {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val[currentLang] ?? val.es ?? val.en ?? '';
  }
  return val;
}

function _apply(lang) {
  const dict = TRANSLATIONS[lang];
  if (!dict) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!dict[key]) return;

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = dict[key];
    } else {
      el.textContent = dict[key];
    }
  });

  // Placeholders con data-i18n-ph
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (dict[key]) el.placeholder = dict[key];
  });

  // aria-label con data-i18n-aria
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  document.documentElement.lang = lang;
}

function toggle() {
  currentLang = currentLang === 'es' ? 'en' : 'es';
  localStorage.setItem('portfolio-lang', currentLang);
  _apply(currentLang);

  const btn = document.getElementById('lang-btn');
  if (btn) btn.textContent = TRANSLATIONS[currentLang]['lang.btn'];

  window.dispatchEvent(new CustomEvent('portfolio:langChange', { detail: { lang: currentLang } }));
}

function init() {
  _apply(currentLang);

  const btn = document.getElementById('lang-btn');
  if (btn) {
    btn.textContent = TRANSLATIONS[currentLang]['lang.btn'];
    btn.addEventListener('click', toggle);
  }
}

export const LangSwitcher = { init, toggle, t, getLang, L };
