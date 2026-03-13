/**
 * lang.js
 * Cambio de idioma ES ↔ EN para el portfolio.
 * Usa atributos data-i18n en el HTML para identificar elementos.
 */

const LangSwitcher = (() => {

  const TRANSLATIONS = {
    es: {
      // Nav
      'nav.about':      'Sobre mí',
      'nav.skills':     'Habilidades',
      'nav.projects':   'Proyectos',
      'nav.experience': 'Experiencia',
      'nav.contact':    'Contacto',
      // Hero
      'hero.badge':     '⚡ Software Engineering',
      'hero.tagline':   'Building robust systems & scalable applications',
      'hero.cta1':      'Ver proyectos',
      'hero.cta2':      'Contactar',
      // About
      'about.label':    '// sobre mí',
      'about.title':    'Conóceme',
      'about.cv':       'Descargar CV',
      // Skills
      'skills.label':   '// habilidades',
      'skills.title':   'Stack técnico',
      'skills.desc':    'Tecnologías y herramientas que uso para construir soluciones.',
      // Projects
      'projects.label': '// proyectos',
      'projects.title': 'Soluciones implementadas',
      'projects.desc':  'Sistemas y aplicaciones construidos con énfasis en calidad y arquitectura.',
      // IA assistant
      'ia.label':       '// sistemas ia',
      'ia.title':       'Consulta mi experiencia',
      'ia.desc':        'Escribe un área tecnológica o stack y te respondo si Jonathan tiene experiencia real en eso.',
      'ia.placeholder': 'Ej: experiencia con OpenAI, RAG, Django...',
      'ia.disclaimer':  'Beta — respuestas basadas en el perfil real de Jonathan. No conectado a un modelo externo.',
      // Experience
      'exp.label':      '// experiencia',
      'exp.title':      'Trayectoria',
      'exp.desc':       'Proyectos reales, formación y trabajo independiente.',
      // Contact
      'contact.label':  '// contacto',
      'contact.title':  'Hablemos',
      'contact.name':   'Nombre *',
      'contact.email':  'Email *',
      'contact.subject':'Asunto',
      'contact.message':'Mensaje *',
      'contact.send':   'Enviar mensaje',
      // Footer
      'footer.copy':    '© 2026 Jonathan Aucancela.',
      // Lang button
      'lang.btn':       'EN',
    },
    en: {
      // Nav
      'nav.about':      'About',
      'nav.skills':     'Skills',
      'nav.projects':   'Projects',
      'nav.experience': 'Experience',
      'nav.contact':    'Contact',
      // Hero
      'hero.badge':     '⚡ Software Engineering',
      'hero.tagline':   'Building robust systems & scalable applications',
      'hero.cta1':      'View projects',
      'hero.cta2':      'Contact me',
      // About
      'about.label':    '// about me',
      'about.title':    'Get to know me',
      'about.cv':       'Download CV',
      // Skills
      'skills.label':   '// skills',
      'skills.title':   'Tech stack',
      'skills.desc':    'Technologies and tools I use to build solutions.',
      // Projects
      'projects.label': '// projects',
      'projects.title': 'Implemented solutions',
      'projects.desc':  'Systems and applications built with emphasis on quality and architecture.',
      // IA assistant
      'ia.label':       '// ia systems',
      'ia.title':       'Ask about my experience',
      'ia.desc':        'Type a technology area or stack and I\'ll tell you if Jonathan has real experience with it.',
      'ia.placeholder': 'e.g: experience with OpenAI, RAG, Django...',
      'ia.disclaimer':  'Beta — responses based on Jonathan\'s real profile. Not connected to an external model.',
      // Experience
      'exp.label':      '// experience',
      'exp.title':      'Timeline',
      'exp.desc':       'Real projects, education and freelance work.',
      // Contact
      'contact.label':  '// contact',
      'contact.title':  'Let\'s talk',
      'contact.name':   'Name *',
      'contact.email':  'Email *',
      'contact.subject':'Subject',
      'contact.message':'Message *',
      'contact.send':   'Send message',
      // Footer
      'footer.copy':    '© 2026 Jonathan Aucancela.',
      // Lang button
      'lang.btn':       'ES',
    },
  };

  let currentLang = localStorage.getItem('portfolio-lang') || 'es';

  function _apply(lang) {
    const t = TRANSLATIONS[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (!t[key]) return;

      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    });

    // Actualizar lang del documento
    document.documentElement.lang = lang;
  }

  function toggle() {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('portfolio-lang', currentLang);
    _apply(currentLang);

    // Actualizar botón
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = TRANSLATIONS[currentLang]['lang.btn'];
  }

  function init() {
    _apply(currentLang);

    const btn = document.getElementById('lang-btn');
    if (btn) {
      btn.textContent = TRANSLATIONS[currentLang]['lang.btn'];
      btn.addEventListener('click', toggle);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { toggle };
})();
