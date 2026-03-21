/**
 * sections.js
 * Renderizado dinámico de todas las secciones del portfolio.
 *
 * Cubre: About · Skills · Experience · Contact
 *
 * Cada sección tiene contenido distinto según el modo activo:
 *  - dev → Software Engineering
 *  - ia  → Inteligencia Artificial
 *  - sec → Ciberseguridad / Pentesting
 */

import { navigateToProject } from './app.js';

  /* ════════════════════════════════════════════════════════════
     DATOS: ABOUT
  ════════════════════════════════════════════════════════════ */
  const ABOUT_DATA = {
    dev: {
      headline:    'Software Engineer & Fullstack Developer',
      text1:       'Ingeniero de software enfocado en construir sistemas robustos y aplicaciones escalables. Especializado en desarrollo fullstack con Django, Angular, Vue.js y Node.js — desde la arquitectura REST hasta el despliegue en contenedores.',
      text2:       'Me apasiona resolver problemas complejos con soluciones elegantes. Cada proyecto es una oportunidad de aplicar buenas prácticas: código limpio, pruebas, CI/CD y seguridad desde el diseño.',
      focusCard: {
        icon:  '🏗️',
        title: 'Arquitectura & Sistemas',
        desc:  'Diseño sistemas desacoplados y escalables aplicando principios SOLID y patrones de arquitectura REST.',
        tags:  ['Fullstack', 'REST API', 'Docker', 'PostgreSQL', 'CI/CD'],
      },
      stats: [
        { target: 6, suffix: '+', label: 'Proyectos' },
        { target: 3, suffix: '',  label: 'Especialidades' },
        { target: 2, suffix: '+', label: 'Años exp.' },
      ],
    },
    ia: {
      headline:    'IA Developer & AI Systems Builder',
      text1:       'Exploro la frontera de la inteligencia artificial aplicada. Trabajo con LLMs, sistemas RAG, embeddings vectoriales y agentes para construir soluciones que piensan, responden y aprenden del contexto.',
      text2:       'Mi enfoque está en la IA aplicada a problemas reales: desde asistentes conversacionales hasta búsqueda semántica con pgvector. No solo uso IA — la integro en arquitecturas de producción.',
      focusCard: {
        icon:  '🧠',
        title: 'IA Aplicada & LLMs',
        desc:  'Construyo sistemas que usan IA como núcleo: RAG pipelines, embeddings, agentes y prompt engineering avanzado.',
        tags:  ['OpenAI API', 'RAG', 'Embeddings', 'pgvector', 'Prompt Eng.'],
      },
      stats: [
        { target: 3, suffix: '',  label: 'Proyectos IA' },
        { target: 2, suffix: '',  label: 'LLMs integrados' },
        { target: 0, suffix: ' PII', label: 'Expuesto a APIs' },
      ],
    },
    sec: {
      headline:    'Security Researcher & Ethical Hacker',
      text1:       'Especialista en ciberseguridad con mentalidad de hacker ético. Analizo, pruebo y protejo sistemas aplicando el OWASP Top 10. El primer paso para defender un sistema es saber exactamente cómo romperlo.',
      text2:       'Diseño la seguridad desde la primera línea de código, no como un parche posterior. Threat modeling, auditorías de código y pentesting en entornos controlados forman parte de mi proceso.',
      focusCard: {
        icon:  '🔒',
        title: 'Security by Design',
        desc:  'Implemento el OWASP Top 10 desde el diseño: autenticación robusta, validación de entradas, HTTPS, CSP y auditoría completa.',
        tags:  ['OWASP Top 10', 'Pentesting', 'JWT', 'Helmet.js', 'Auditoría'],
      },
      stats: [
        { target: 6, suffix: '/10', label: 'OWASP cubiertos' },
        { target: 5, suffix: '',    label: 'Capas de seguridad' },
        { target: 100, suffix: '%', label: 'Auditoría cobertura' },
      ],
    },
  };

  /* ════════════════════════════════════════════════════════════
     DATOS: SKILLS (con clase Devicon o fallback SVG/emoji)
     Tipo "devicon": usa <i class="devicon-...">
     Tipo "svg":     usa SVG inline
     Tipo "emoji":   usa emoji como icono
  ════════════════════════════════════════════════════════════ */
  const SKILLS_DATA = {
    dev: {
      summary: 'Stack fullstack para sistemas web y APIs robustas',
      icon:    '⚡',
      categories: [
        {
          id:    'frontend',
          title: 'Frontend',
          skills: [
            { name: 'Angular',     type: 'devicon', icon: 'devicon-angularjs-plain colored' },
            { name: 'Vue.js',      type: 'devicon', icon: 'devicon-vuejs-plain colored' },
            { name: 'React',       type: 'devicon', icon: 'devicon-react-original colored' },
            { name: 'Next.js',     type: 'devicon', icon: 'devicon-nextjs-plain colored' },
            { name: 'TypeScript',  type: 'devicon', icon: 'devicon-typescript-plain colored' },
            { name: 'JavaScript',  type: 'devicon', icon: 'devicon-javascript-plain colored' },
            { name: 'HTML5',       type: 'devicon', icon: 'devicon-html5-plain colored' },
            { name: 'CSS3',        type: 'devicon', icon: 'devicon-css3-plain colored' },
            { name: 'Tailwind',    type: 'devicon', icon: 'devicon-tailwindcss-plain colored' },
            { name: 'Bootstrap',   type: 'devicon', icon: 'devicon-bootstrap-plain colored' },
            { name: 'Vite',        type: 'devicon', icon: 'devicon-vitejs-plain colored' },
          ],
        },
        {
          id:    'backend',
          title: 'Backend',
          skills: [
            { name: 'Python',     type: 'devicon', icon: 'devicon-python-plain colored' },
            { name: 'Django',     type: 'devicon', icon: 'devicon-django-plain colored' },
            { name: 'FastAPI',    type: 'devicon', icon: 'devicon-fastapi-plain colored' },
            { name: 'Java',       type: 'devicon', icon: 'devicon-java-plain colored' },
            { name: 'Spring Boot',type: 'devicon', icon: 'devicon-spring-plain colored' },
            { name: 'Node.js',    type: 'devicon', icon: 'devicon-nodejs-plain colored' },
            { name: 'Express',    type: 'devicon', icon: 'devicon-express-original colored' },
            { name: 'NestJS',     type: 'devicon', icon: 'devicon-nestjs-plain colored' },
            { name: 'PostgreSQL', type: 'devicon', icon: 'devicon-postgresql-plain colored' },
            { name: 'MySQL',      type: 'devicon', icon: 'devicon-mysql-plain colored' },
            { name: 'MongoDB',    type: 'devicon', icon: 'devicon-mongodb-plain colored' },
            { name: 'Redis',      type: 'devicon', icon: 'devicon-redis-plain colored' },
            { name: 'Prisma',     type: 'devicon', icon: 'devicon-prisma-original colored' },
            { name: 'GraphQL',    type: 'devicon', icon: 'devicon-graphql-plain colored' },
            {
              name: 'REST API', type: 'svg', icon: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>`,
            },
            { name: 'JWT',        type: 'emoji', icon: '🔑' },
          ],
        },
        {
          id:    'tools',
          title: 'DevOps & Tools',
          skills: [
            { name: 'Docker',          type: 'devicon', icon: 'devicon-docker-plain colored' },
            { name: 'Git',             type: 'devicon', icon: 'devicon-git-plain colored' },
            { name: 'GitHub',          type: 'devicon', icon: 'devicon-github-original colored' },
            { name: 'GitHub Actions',  type: 'devicon', icon: 'devicon-githubactions-plain colored' },
            { name: 'Nginx',           type: 'devicon', icon: 'devicon-nginx-plain colored' },
            { name: 'Linux',           type: 'devicon', icon: 'devicon-linux-plain colored' },
            { name: 'Postman',         type: 'devicon', icon: 'devicon-postman-plain colored' },
            { name: 'Vercel',          type: 'devicon', icon: 'devicon-vercel-original colored' },
            { name: 'Render',          type: 'emoji',   icon: '☁️' },
          ],
        },
      ],
    },
    ia: {
      summary: 'Stack para sistemas que integran inteligencia artificial',
      icon:    '🧠',
      categories: [
        {
          id:    'frontend',
          title: 'Interfaces IA',
          skills: [
            { name: 'React',         type: 'devicon', icon: 'devicon-react-original colored' },
            { name: 'Vue.js',        type: 'devicon', icon: 'devicon-vuejs-plain colored' },
            { name: 'Next.js',       type: 'devicon', icon: 'devicon-nextjs-plain colored' },
            { name: 'TypeScript',    type: 'devicon', icon: 'devicon-typescript-plain colored' },
            { name: 'TailwindCSS',   type: 'devicon', icon: 'devicon-tailwindcss-plain colored' },
            { name: 'Streaming UI',  type: 'svg', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
            { name: 'Chat UI',       type: 'emoji', icon: '💬' },
          ],
        },
        {
          id:    'backend',
          title: 'Core IA / ML',
          skills: [
            { name: 'Python',        type: 'devicon', icon: 'devicon-python-plain colored' },
            { name: 'OpenAI API',    type: 'svg', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.53a5.37 5.37 0 00-.46-4.4 5.43 5.43 0 00-5.84-2.6A5.37 5.37 0 0012 .5a5.43 5.43 0 00-5.18 3.77 5.37 5.37 0 00-3.58 2.6 5.43 5.43 0 00.67 6.35 5.38 5.38 0 00.46 4.4 5.43 5.43 0 005.84 2.6A5.37 5.37 0 0012 23.5a5.43 5.43 0 005.18-3.77 5.37 5.37 0 003.58-2.6 5.43 5.43 0 00-.48-6.6z"/></svg>` },
            { name: 'LangChain',     type: 'emoji', icon: '🔗' },
            { name: 'Hugging Face',  type: 'emoji', icon: '🤗' },
            { name: 'Embeddings',    type: 'emoji', icon: '🔢' },
            { name: 'pgvector',      type: 'devicon', icon: 'devicon-postgresql-plain colored' },
            { name: 'RAG',           type: 'emoji', icon: '📚' },
            { name: 'Prompt Eng.',   type: 'emoji', icon: '✍️' },
            { name: 'NLP',           type: 'emoji', icon: '🔤' },
          ],
        },
        {
          id:    'tools',
          title: 'Infraestructura & Código',
          skills: [
            { name: 'PostgreSQL',    type: 'devicon', icon: 'devicon-postgresql-plain colored' },
            { name: 'Docker',        type: 'devicon', icon: 'devicon-docker-plain colored' },
            { name: 'Node.js',       type: 'devicon', icon: 'devicon-nodejs-plain colored' },
            { name: 'FastAPI',       type: 'devicon', icon: 'devicon-fastapi-plain colored' },
            { name: 'Django',        type: 'devicon', icon: 'devicon-django-plain colored' },
            { name: 'Redis',         type: 'devicon', icon: 'devicon-redis-plain colored' },
            { name: 'GitHub Actions',type: 'devicon', icon: 'devicon-githubactions-plain colored' },
            { name: 'Linux',         type: 'devicon', icon: 'devicon-linux-plain colored' },
            { name: 'Nginx',         type: 'devicon', icon: 'devicon-nginx-plain colored' },
            { name: 'REST API',      type: 'svg', icon: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>` },
            { name: 'JWT',           type: 'emoji', icon: '🔑' },
            { name: 'Git',           type: 'devicon', icon: 'devicon-git-plain colored' },
            { name: 'CRISP-DM',      type: 'emoji', icon: '📊' },
            { name: 'Vector DB',     type: 'emoji', icon: '🗄️' },
            { name: 'TypeScript',    type: 'devicon', icon: 'devicon-typescript-plain colored' },
          ],
        },
      ],
    },
    sec: {
      summary: 'Arsenal de seguridad ofensiva y defensiva',
      icon:    '🔐',
      categories: [
        {
          id:    'recon',
          title: 'Reconocimiento',
          skills: [
            { name: 'OSINT',       type: 'emoji', icon: '🔍' },
            { name: 'Nmap',        type: 'emoji', icon: '🌐' },
            { name: 'Burp Suite',  type: 'emoji', icon: '🕷️' },
            { name: 'Wireshark',   type: 'emoji', icon: '🦈' },
            { name: 'Kali Linux',  type: 'devicon', icon: 'devicon-linux-plain colored' },
          ],
        },
        {
          id:    'offensive',
          title: 'Seguridad Web',
          skills: [
            { name: 'OWASP Top 10', type: 'emoji', icon: '🛡️' },
            {
              name: 'SQL Injection', type: 'svg', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>
              </svg>`,
            },
            { name: 'XSS',          type: 'emoji', icon: '💉' },
            { name: 'CSRF',         type: 'emoji', icon: '🔁' },
            { name: 'Auth Bypass',  type: 'emoji', icon: '🚪' },
            { name: 'Path Traversal', type: 'emoji', icon: '📂' },
          ],
        },
        {
          id:    'defensive',
          title: 'Defensa & Hardening',
          skills: [
            { name: 'Node.js',     type: 'devicon', icon: 'devicon-nodejs-plain colored' },
            { name: 'Helmet.js',   type: 'emoji', icon: '⛑️' },
            { name: 'JWT',         type: 'emoji', icon: '🔑' },
            { name: 'bcrypt',      type: 'emoji', icon: '🔐' },
            { name: 'TLS/HTTPS',   type: 'emoji', icon: '🔒' },
            { name: 'CSP',         type: 'emoji', icon: '📋' },
          ],
        },
      ],
    },
  };

  /* ════════════════════════════════════════════════════════════
     DATOS: EXPERIENCE
  ════════════════════════════════════════════════════════════ */
  const EXPERIENCE_DATA = [
    {
      date:      'Feb 2025 — Ene 2026',
      title:     'UBApp — Universal Box',
      role:      'Desarrollador Full Stack · Titulación',
      org:       'Universidad / Universal Box · Quito',
      slug:      'ubapp',
      completed: true,
      type:      'project',
      typeLabel: 'Titulación',
      desc:      'Sistema integral de gestión de envíos con búsqueda semántica impulsada por IA. Django REST + Angular + PostgreSQL + pgvector + Docker. Proyecto de grado con distinción.',
      tags:      ['Django', 'Angular', 'OpenAI', 'pgvector', 'Docker', 'PostgreSQL'],
      icon:      '🚀',
      highlights: [
        'Búsqueda semántica con embeddings OpenAI — reduce tiempo de 4 min a 20 s',
        'CRUD completo con carga masiva Excel y generación de recibos PDF',
        'Control de acceso por roles (RBAC) + JWT + Docker Compose 4 servicios',
      ],
      metricas: [
        { label: 'Mejora eficiencia', value: '90%' },
        { label: 'Módulos', value: '7' },
        { label: 'Tiempo búsqueda', value: '<20s' },
      ],
      github: 'https://github.com/DavidAucancela/UBAppV2',
      demo:   'https://ubapp-frontend.onrender.com',
    },
    {
      date:      'Ene 2026 — Feb 2026',
      title:     'Ideancestral',
      role:      'Desarrollador Full Stack · Freelance',
      org:       'Proyecto independiente · Remoto',
      slug:      'ideancestral',
      completed: true,
      type:      'project',
      typeLabel: 'Freelance',
      desc:      'Catálogo digital de artesanías ecuatorianas con soporte multiidioma (ES/EN/PT), panel administrativo, carrito con pedidos por WhatsApp y modo oscuro/claro.',
      tags:      ['Vue.js', 'Node.js', 'PostgreSQL', 'Pinia', 'i18n', 'Vercel'],
      icon:      '🎨',
      highlights: [
        'SPA multiidioma (ES/EN/PT) con vue-i18n y Pinia para estado global',
        'Panel admin CRUD de productos, categorías y usuarios',
        'Carrito con generación de pedido en mensaje WhatsApp',
      ],
      metricas: [
        { label: 'Idiomas', value: '3' },
        { label: 'Productos', value: '+100' },
        { label: 'Seguridad', value: '4 capas' },
      ],
      github: 'https://github.com/DavidAucancela/IDEANCESTRAL',
      demo:   'https://ideancestral.onrender.com/',
    },
    {
      date:      'Ago 2025 — Nov 2025',
      title:     'AnaOS — Asistente Financiero',
      role:      'Desarrollador Full Stack + IA · Cliente',
      org:       'Cooperativa financiera · Remoto',
      slug:      'anaos',
      completed: true,
      type:      'project',
      typeLabel: 'Cliente',
      desc:      'Asistente conversacional con IA para gestión de cooperativas financieras. El backend enriquece cada consulta con datos reales antes de llamar a OpenAI, sin exponer datos PII.',
      tags:      ['TypeScript', 'React', 'Node.js', 'OpenAI', 'RAG', 'PostgreSQL'],
      icon:      '🤖',
      highlights: [
        'Patrón RAG: backend consulta BD y enriquece contexto antes de llamar a IA',
        'Streaming de respuestas OpenAI para experiencia de chat fluida',
        '0 datos PII expuestos al modelo — privacidad financiera garantizada',
      ],
      metricas: [
        { label: 'Módulos IA', value: '4' },
        { label: 'TypeScript', value: '100%' },
        { label: 'PII expuesto', value: '0' },
      ],
      github: 'https://github.com/DavidAucancela/AnaOS',
    },
    {
      date:      'Jul 2025 — Oct 2025',
      title:     'Fundaciones — ConQuito',
      role:      'Desarrollador Backend · Hackathon',
      org:       'ConQuito · Quito, Ecuador',
      slug:      'conquito-fundaciones',
      completed: true,
      type:      'project',
      typeLabel: 'Hackathon',
      desc:      'Herramienta de datos abiertos para el municipio de Quito: visualización interactiva de fundaciones con mapas Leaflet, filtros dinámicos y estadísticas de impacto social.',
      tags:      ['JavaScript', 'Leaflet', 'Charts.js', 'Datos Abiertos'],
      icon:      '🗺️',
      highlights: [
        'Mapas interactivos Leaflet con markers por tipo de fundación',
        'Filtros dinámicos que actualizan mapa y gráficos simultáneamente',
        'Static site — cero dependencias npm, compatible con cualquier hosting',
      ],
      metricas: [
        { label: 'Fundaciones', value: '30+' },
        { label: 'Deps npm', value: '0' },
        { label: 'Deploy', value: 'Static' },
      ],
      github: 'https://github.com/DavidAucancela/Proyect_OpenLab',
    },
    {
      date:      'Sep 2025 — Nov 2025',
      title:     'Equity — Gestor de Datos',
      role:      'Desarrollador Backend · Cliente',
      org:       'Cliente empresarial · Remoto',
      slug:      'equity',
      completed: true,
      type:      'project',
      typeLabel: 'Cliente',
      desc:      'Pipeline ETL (Extract → Transform → Load) que automatiza la población de bases de datos desde archivos JSON con validación de schema, transacciones atómicas y logs de auditoría.',
      tags:      ['Python', 'Django', 'PostgreSQL', 'ETL', 'JSON'],
      icon:      '⚙️',
      highlights: [
        'Pipeline ETL completo con validación de schema antes de cada inserción',
        'Modo dry-run para validar datos sin modificar la base de datos',
        'Logs inmutables de auditoría con niveles INFO / WARNING / ERROR',
      ],
      metricas: [
        { label: 'Automatización', value: '100%' },
        { label: 'Dry-run', value: '✓' },
        { label: 'Validación', value: 'Schema completo' },
      ],
      github: 'https://github.com/DavidAucancela/App-de-prueba-Equity',
    },
    {
      date:      'Ene 2025 — Feb 2025',
      title:     'SecuraBank',
      role:      'Desarrollador + Seguridad · Práctica',
      org:       'Proyecto educativo · OWASP',
      slug:      'securabank',
      completed: true,
      type:      'project',
      typeLabel: 'Práctica',
      desc:      'Sistema bancario demostrativo que implementa 6 categorías del OWASP Top 10. Node.js + Helmet.js + JWT con rotación. Seguridad diseñada desde el inicio, no como añadido.',
      tags:      ['Node.js', 'OWASP', 'JWT', 'Helmet.js', 'bcrypt', 'PostgreSQL'],
      icon:      '🔒',
      highlights: [
        '6 vulnerabilidades OWASP Top 10 mitigadas: A01, A02, A03, A05, A07',
        'JWT access (15 min) + refresh (7 días) con rotación automática',
        'Auditoría inmutable: cada transacción registrada con timestamp e IP',
      ],
      metricas: [
        { label: 'OWASP mitigados', value: '6/10' },
        { label: 'Capas seguridad', value: '5' },
        { label: 'Auditoría', value: '100%' },
      ],
      github: 'https://github.com/DavidAucancela/SecuraBank',
    },
  ];

  /* ════════════════════════════════════════════════════════════
     RENDERIZADORES
  ════════════════════════════════════════════════════════════ */

  /* ─── ABOUT ──────────────────────────────────────────────── */
  function renderAbout(mode) {
    const data = ABOUT_DATA[mode] || ABOUT_DATA.dev;

    // Actualizar headline
    const headlineEl = document.getElementById('about-headline');
    if (headlineEl) _fadeSwap(headlineEl, data.headline);

    // Texto 1 — con efecto decode en modo sec
    const text1El = document.getElementById('about-mode-text');
    if (text1El) {
      if (mode === 'sec') {
        _decodeText(text1El, data.text1);
      } else {
        _fadeSwap(text1El, data.text1);
      }
    }

    // Texto 2
    const text2El = document.getElementById('about-text2');
    if (text2El) _fadeSwap(text2El, data.text2);

    // Focus card
    const cardEl = document.getElementById('about-focus-card');
    if (cardEl) {
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'translateY(8px)';
      setTimeout(() => {
        cardEl.innerHTML = _buildFocusCard(data.focusCard);
        cardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'translateY(0)';
      }, 200);
    }

    // Stats con animación de contador
    _animateStats(data.stats);
  }

  function _buildFocusCard(card) {
    const tagsHTML = card.tags
      .map(t => `<span class="focus-card-tag">${t}</span>`)
      .join('');

    return `
      <div class="focus-card-icon" aria-hidden="true">${card.icon}</div>
      <div class="focus-card-body">
        <div class="focus-card-title">${card.title}</div>
        <p class="focus-card-desc">${card.desc}</p>
        <div class="focus-card-tags">${tagsHTML}</div>
      </div>
    `;
  }

  function _animateStats(stats) {
    stats.forEach((stat, idx) => {
      const valueEl = document.getElementById(`stat-value-${idx}`);
      const labelEl = document.getElementById(`stat-label-${idx}`);
      if (!valueEl) return;

      if (labelEl) labelEl.textContent = stat.label;

      // Animar el contador solo si es un número > 0
      if (stat.target > 0) {
        _countUp(valueEl, 0, stat.target, stat.suffix, 1200);
      } else {
        valueEl.textContent = stat.target + stat.suffix;
      }
    });
  }

  function _countUp(el, from, to, suffix, duration) {
    const start     = performance.now();
    const range     = to - from;
    const easeOut   = (t) => 1 - Math.pow(1 - t, 3);

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current  = Math.round(from + range * easeOut(progress));
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ─── SKILLS ─────────────────────────────────────────────── */
  function renderSkills(mode) {
    const data = SKILLS_DATA[mode] || SKILLS_DATA.dev;

    // Actualizar el summary del stack técnico
    const summaryEl = document.getElementById('skills-mode-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <span class="skills-mode-summary-icon" aria-hidden="true">${data.icon}</span>
        <span><strong>${_getModeLabel(mode)}</strong> — ${data.summary}</span>
      `;
    }

    // Obtener el contenedor de categorías
    const gridEl = document.getElementById('skills-grid');
    if (!gridEl) return;

    // Limpiar y reconstruir categorías
    gridEl.innerHTML = '';
    data.categories.forEach(cat => {
      const catWrap = document.createElement('div');
      catWrap.className = 'skill-category-wrap animate-on-scroll';
      catWrap.innerHTML = `
        <div class="skill-category-header">
          <h3 class="skill-category-title">${cat.title}</h3>
          <div class="skill-category-line" aria-hidden="true"></div>
          <span class="skill-count-badge">${cat.skills.length}</span>
        </div>
        <div class="skills-grid" id="skills-cat-${cat.id}"></div>
      `;
      gridEl.appendChild(catWrap);

      // Renderizar las skill cards dentro de esta categoría
      const catGrid = catWrap.querySelector(`#skills-cat-${cat.id}`);
      cat.skills.forEach((skill, i) => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.setAttribute('title', skill.name);
        card.style.animationDelay = `${i * 0.04}s`;
        card.innerHTML = _buildSkillIcon(skill) + `
          <span class="skill-name">${skill.name}</span>
        `;
        catGrid.appendChild(card);
      });
    });

    // Re-registrar observador para los nuevos elementos
    _refreshObservers();

    // Animar aparición de cards con stagger
    setTimeout(() => {
      document.querySelectorAll('.skill-card').forEach((card, i) => {
        setTimeout(() => {
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px) scale(0.95)';
          card.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
          });
        }, i * 35);
      });
    }, 80);
  }

  function _buildSkillIcon(skill) {
    if (skill.type === 'devicon') {
      return `<div class="skill-icon-wrap"><i class="${skill.icon}" aria-hidden="true"></i></div>`;
    }
    if (skill.type === 'svg') {
      return `<div class="skill-icon-fallback" aria-hidden="true">${skill.icon}</div>`;
    }
    // emoji
    return `<div class="skill-icon-fallback" aria-hidden="true" style="font-size:1.5rem; background:transparent;">${skill.icon}</div>`;
  }

  function _getModeLabel(mode) {
    return { dev: 'Software Engineering', ia: 'IA & ML', sec: 'Cybersecurity' }[mode] || mode;
  }

  /* ─── EXPERIENCE — Story + Timeline animado ─────────────── */
  let _expIndex   = 0;
  let _expTimer   = null;
  let _expPaused  = false;
  const EXP_DURATION = 4000;

  const COMPLETED_DATA = EXPERIENCE_DATA.filter(e => e.completed !== false);

  function renderExperience(mode) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.dataset.mode = mode;
    _expIndex  = 0;
    _expPaused = false;
    _clearExpTimer();
    _buildStoryLayout(container);
  }

  function _buildStoryLayout(container) {
    container.innerHTML = '';
    const data = COMPLETED_DATA;

    const layout = document.createElement('div');
    layout.className = 'story-layout';

    /* ── Progress strips ── */
    const strips = document.createElement('div');
    strips.className = 'story-strips';
    strips.setAttribute('aria-hidden', 'true');
    data.forEach((_, i) => {
      const strip = document.createElement('div');
      strip.className = 'story-strip';
      strip.dataset.index = i;
      const fill = document.createElement('div');
      fill.className = 'story-strip__fill';
      strip.appendChild(fill);
      strips.appendChild(strip);
    });
    layout.appendChild(strips);

    /* ── Timeline track ── */
    const track = document.createElement('div');
    track.className = 'story-track';
    track.setAttribute('aria-label', 'Línea de tiempo');

    const trackLine = document.createElement('div');
    trackLine.className = 'story-track__line';
    track.appendChild(trackLine);

    const trackProgress = document.createElement('div');
    trackProgress.className = 'story-track__progress';
    trackProgress.id = 'story-track-progress';
    track.appendChild(trackProgress);

    data.forEach((item, i) => {
      const node = document.createElement('button');
      node.className = 'story-node' + (i === 0 ? ' active' : '') + (i < 0 ? ' visited' : '');
      node.dataset.index = i;
      node.setAttribute('aria-label', `Ver ${item.title}`);
      node.innerHTML = `
        <div class="story-node__dot">
          <span class="story-node__icon">${item.icon}</span>
          <span class="story-node__pulse" aria-hidden="true"></span>
        </div>
        <div class="story-node__info">
          <span class="story-node__name">${item.title.split(' — ')[0].split(' ')[0]}</span>
          <span class="story-node__year">${item.date.split(' — ').pop().split(' ').pop()}</span>
        </div>
      `;
      node.addEventListener('click', () => _goToIndex(i, true));
      track.appendChild(node);
    });
    layout.appendChild(track);

    /* ── Slide area ── */
    const slideWrap = document.createElement('div');
    slideWrap.className = 'story-slide-wrap';
    slideWrap.id = 'story-slide-wrap';
    layout.appendChild(slideWrap);

    /* ── Pause on hover ── */
    layout.addEventListener('mouseenter', () => {
      _expPaused = true;
      _pauseStrip();
      _clearExpTimer();
    });
    layout.addEventListener('mouseleave', () => {
      _expPaused = false;
      _resumeStrip();
      _startExpTimer();
    });

    container.appendChild(layout);
    _renderSlide(_expIndex, false);
    _updateTrack();
    _startStrip(_expIndex);
    _startExpTimer();
  }

  /* ── Slide renderer ─────────────────────────────────────── */
  function _renderSlide(index, animated) {
    const wrap = document.getElementById('story-slide-wrap');
    if (!wrap) return;
    const item = COMPLETED_DATA[index];
    if (!item) return;

    const highlightsHTML = (item.highlights || []).slice(0, 3).map(h => `
      <li class="story-highlight">
        <span class="story-highlight__dot story-dot--${item.type}" aria-hidden="true"></span>
        <span>${h}</span>
      </li>`).join('');

    const metricasHTML = (item.metricas || []).slice(0, 3).map(m => `
      <div class="story-metric">
        <span class="story-metric__value">${m.value}</span>
        <span class="story-metric__label">${m.label}</span>
      </div>`).join('');

    const tagsHTML = (item.tags || []).slice(0, 4).map(t =>
      `<span class="story-tag">${t}</span>`).join('');

    const slide = document.createElement('div');
    slide.className = 'story-slide story-slide--' + item.type;
    slide.innerHTML = `
      <div class="story-slide__bg" aria-hidden="true"></div>
      <div class="story-slide__content">
        <div class="story-slide__top">
          <div class="story-slide__icon-wrap" aria-hidden="true">
            <span class="story-slide__icon">${item.icon}</span>
            <span class="story-slide__icon-glow" aria-hidden="true"></span>
          </div>
          <div class="story-slide__header">
            <span class="story-badge story-badge--${item.type}">${item.typeLabel}</span>
            <h3 class="story-slide__title">${item.title}</h3>
            <p class="story-slide__role">${item.role.split(' · ')[0]}</p>
          </div>
        </div>

        ${tagsHTML ? `<div class="story-slide__tags">${tagsHTML}</div>` : ''}

        ${highlightsHTML ? `<ul class="story-slide__highlights">${highlightsHTML}</ul>` : ''}

        ${metricasHTML ? `<div class="story-slide__metrics">${metricasHTML}</div>` : ''}

        <div class="story-slide__footer">
          <button class="story-nav story-nav--prev" id="story-prev" aria-label="Proyecto anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          ${item.slug ? `
          <button class="story-goto" data-slug="${item.slug}" aria-label="Ir al proyecto ${item.title}">
            <span>Ver proyecto</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>` : '<span></span>'}

          <button class="story-nav story-nav--next" id="story-next" aria-label="Siguiente proyecto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    /* Wire navigation */
    slide.querySelector('#story-prev')?.addEventListener('click', () => {
      const prev = (_expIndex - 1 + COMPLETED_DATA.length) % COMPLETED_DATA.length;
      _goToIndex(prev, true);
    });
    slide.querySelector('#story-next')?.addEventListener('click', () => {
      const next = (_expIndex + 1) % COMPLETED_DATA.length;
      _goToIndex(next, true);
    });
    slide.querySelector('.story-goto')?.addEventListener('click', e => {
      const slug = e.currentTarget.dataset.slug;
      if (slug) {
        window.dispatchEvent(new CustomEvent('portfolio:openProjectDetail', { detail: { slug } }));
      }
    });

    if (animated) {
      /* Fade out old → fade in new */
      const old = wrap.querySelector('.story-slide');
      if (old) {
        old.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
        old.style.opacity    = '0';
        old.style.transform  = 'translateY(8px) scale(0.98)';
        setTimeout(() => {
          wrap.innerHTML = '';
          _enterSlide(slide, wrap);
        }, 190);
      } else {
        _enterSlide(slide, wrap);
      }
    } else {
      _enterSlide(slide, wrap);
    }
  }

  function _enterSlide(slide, wrap) {
    slide.style.opacity   = '0';
    slide.style.transform = 'translateY(12px) scale(0.98)';
    wrap.appendChild(slide);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        slide.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.2,0.64,1)';
        slide.style.opacity    = '1';
        slide.style.transform  = 'translateY(0) scale(1)';
      });
    });

    /* Stagger children */
    const children = slide.querySelectorAll(
      '.story-slide__top, .story-slide__tags, .story-slide__highlights, .story-slide__metrics, .story-slide__footer'
    );
    children.forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => {
        el.style.transition = `opacity 0.3s ease ${i * 60}ms, transform 0.3s ease ${i * 60}ms`;
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      }, 80 + i * 60);
    });
  }

  /* ── Go to index ────────────────────────────────────────── */
  function _goToIndex(index, resetTimer) {
    if (index === _expIndex && !resetTimer) return;
    _expIndex = index;
    _clearExpTimer();
    _stopStrip();
    _renderSlide(index, true);
    _updateTrack();
    if (!_expPaused) {
      _startStrip(index);
      _startExpTimer();
    }
  }

  /* ── Track update ───────────────────────────────────────── */
  function _updateTrack() {
    const nodes = document.querySelectorAll('.story-node');
    nodes.forEach((node, i) => {
      node.classList.toggle('active',  i === _expIndex);
      node.classList.toggle('visited', i < _expIndex);
    });

    /* Animate progress line */
    const progressLine = document.getElementById('story-track-progress');
    if (progressLine && nodes.length > 1) {
      const pct = (_expIndex / (COMPLETED_DATA.length - 1)) * 100;
      progressLine.style.width = pct + '%';
    }
  }

  /* ── Progress strip (top bars) ──────────────────────────── */
  function _startStrip(index) {
    /* Mark previous strips as full */
    document.querySelectorAll('.story-strip').forEach((strip, i) => {
      const fill = strip.querySelector('.story-strip__fill');
      if (!fill) return;
      if (i < index) {
        fill.style.transition = 'none';
        fill.style.width = '100%';
      } else if (i === index) {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fill.style.transition = `width ${EXP_DURATION}ms linear`;
            fill.style.width = '100%';
          });
        });
      } else {
        fill.style.transition = 'none';
        fill.style.width = '0%';
      }
    });
  }

  function _stopStrip() {
    const strip = document.querySelector(`.story-strip[data-index="${_expIndex}"] .story-strip__fill`);
    if (!strip) return;
    const computed = getComputedStyle(strip).width;
    strip.style.transition = 'none';
    strip.style.width = computed;
  }

  function _pauseStrip() {
    const strip = document.querySelector(`.story-strip[data-index="${_expIndex}"] .story-strip__fill`);
    if (!strip) return;
    const computed = getComputedStyle(strip).width;
    strip.style.transition = 'none';
    strip.style.width = computed;
  }

  function _resumeStrip() {
    const strip = document.querySelector(`.story-strip[data-index="${_expIndex}"] .story-strip__fill`);
    if (!strip) return;
    const currentW    = parseFloat(strip.style.width) || 0;
    const totalW      = strip.parentElement?.offsetWidth || 100;
    const remaining   = ((totalW - currentW) / totalW) * EXP_DURATION;
    strip.style.transition = `width ${remaining}ms linear`;
    strip.style.width = '100%';
  }

  /* ── Timer ──────────────────────────────────────────────── */
  function _startExpTimer() {
    _clearExpTimer();
    _expTimer = setTimeout(() => {
      if (!_expPaused) {
        const next = (_expIndex + 1) % COMPLETED_DATA.length;
        _goToIndex(next, false);
        _startStrip(next);
        _startExpTimer();
      }
    }, EXP_DURATION);
  }

  function _clearExpTimer() {
    if (_expTimer) { clearTimeout(_expTimer); _expTimer = null; }
  }

  /* ─── CONTACT ────────────────────────────────────────────── */
  function renderContact(mode) {
    // Actualizar el texto de disponibilidad según el modo
    const availEl = document.getElementById('contact-availability-text');
    const texts = {
      dev: 'Disponible para proyectos fullstack y oportunidades remotas',
      ia:  'Disponible para proyectos de IA y consultoría de sistemas inteligentes',
      sec: 'Disponible para auditorías de seguridad y análisis de vulnerabilidades',
    };
    if (availEl) _fadeSwap(availEl, texts[mode] || texts.dev);

    // Actualizar botón de copiar email (sólo si existe)
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText('jonathan_jd@outlook.com').then(() => {
          copyBtn.textContent = '✓ Copiado';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copiar';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      };
    }
  }

  /* ════════════════════════════════════════════════════════════
     EFECTOS DE TEXTO
  ════════════════════════════════════════════════════════════ */

  /** Fade out → swap texto → fade in */
  function _fadeSwap(el, newText) {
    el.style.transition = 'opacity 0.2s ease';
    el.style.opacity    = '0';
    setTimeout(() => {
      el.textContent  = newText;
      el.style.opacity = '1';
    }, 210);
  }

  /**
   * Efecto decode: el texto parece "descifrarse" de izquierda a derecha.
   * Cada caracter comienza siendo un símbolo aleatorio y luego
   * se "resuelve" al caracter final.
   */
  function _decodeText(el, finalText) {
    // Si el usuario prefiere movimiento reducido, usar fade simple
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      _fadeText(el, finalText);
      return;
    }

    const chars   = '!@#$%^&*<>[]{}|\\/01アイウエオカキ';
    const steps   = 2;         // cuántas veces cambia el caracter antes de resolverse
    const delay   = 12;        // ms entre cada caracter (era 30 — ~9s → ~2.5s)
    const stepMs  = 40;        // ms entre cada "scramble step"
    let output    = '';

    // Ocultar brevemente
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.opacity = '1';

      finalText.split('').forEach((char, i) => {
        if (char === ' ' || char === '\n') {
          setTimeout(() => {
            output += char;
            el.textContent = output + finalText.slice(output.length);
          }, i * delay);
          return;
        }

        // Scramble steps
        for (let s = 0; s < steps; s++) {
          setTimeout(() => {
            const randomChar = chars[Math.floor(Math.random() * chars.length)];
            const current    = output + randomChar + finalText.slice(output.length + 1);
            el.textContent   = current;
          }, i * delay + s * stepMs);
        }

        // Resolver al caracter final
        setTimeout(() => {
          output += char;
          el.textContent = output + finalText.slice(output.length);
        }, i * delay + steps * stepMs);
      });
    }, 150);
  }

  /* ════════════════════════════════════════════════════════════
     INTERSECTION OBSERVER (re-registrar tras renderizado dinámico)
  ════════════════════════════════════════════════════════════ */
  let _scrollObserver = null;

  function _setupObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.animate-on-scroll, .timeline-item').forEach(el => {
        el.classList.add('visible');
      });
      return;
    }

    _scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    _registerObserverTargets();
  }

  function _refreshObservers() {
    if (!_scrollObserver) return;
    _registerObserverTargets();
  }

  function _registerObserverTargets() {
    document.querySelectorAll('.animate-on-scroll, .timeline-item').forEach(el => {
      _scrollObserver.observe(el);
    });
  }

  /* ════════════════════════════════════════════════════════════
     BACK TO TOP BUTTON
  ════════════════════════════════════════════════════════════ */
  function _initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ════════════════════════════════════════════════════════════
     INICIALIZACIÓN COMPLETA
  ════════════════════════════════════════════════════════════ */
  function init(mode) {
    _setupObserver();
    _initBackToTop();
    render(mode);
  }

  function render(mode) {
    renderAbout(mode);
    renderSkills(mode);
    renderExperience(mode);
    renderContact(mode);
  }

  /* ─── Escuchar cambios de modo ──────────────────────────── */
  window.addEventListener('portfolio:modeChange', (e) => {
    render(e.detail.mode);
  });

  /* ─── Sincronizar trayectoria cuando se abre un proyecto ── */
  window.addEventListener('portfolio:syncTrayectoria', (e) => {
    const { slug } = e.detail;
    const idx = COMPLETED_DATA.findIndex(item => item.slug === slug);
    if (idx >= 0) _goToIndex(idx, true);
  });

/* ════════════════════════════════════════════════════════════
   EXPORT
════════════════════════════════════════════════════════════ */
export const Sections = {
  init,
  render,
  renderAbout,
  renderSkills,
  renderExperience,
  renderContact,
};
