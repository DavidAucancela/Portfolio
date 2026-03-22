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
    {
      date:      'Dic 2025',
      title:     'MapCriminals',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'mapcriminals',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc:      'Mapa mundial interactivo de criminales más buscados integrando la FBI API en tiempo real, Google Trends y Leaflet.js.',
      tags:      ['Node.js', 'Leaflet', 'FBI API', 'Google Trends'],
      icon:      '🗺️',
      highlights: [
        'Integración en tiempo real con FBI Most Wanted API',
        'Visualización geoespacial con Leaflet.js y markers dinámicos',
        'Correlación con tendencias de búsqueda Google Trends',
      ],
      metricas: [
        { label: 'APIs integradas', value: '2' },
        { label: 'Cobertura', value: 'Global' },
        { label: 'Tiempo real', value: '✓' },
      ],
      github: 'https://github.com/DavidAucancela/MapCriminals',
    },
    {
      date:      'Mar 2026',
      title:     'LLM Observatory',
      role:      'Desarrollador Full Stack · Open Source',
      org:       'Proyecto open source · Remoto',
      slug:      'llm-observatory',
      completed: true,
      type:      'project',
      typeLabel: 'Open Source',
      desc:      'Dashboard open-source de observabilidad para la API de Claude. Monitorea tokens, latencia, costos y calidad de respuestas en tiempo real con Socket.io.',
      tags:      ['React', 'Node.js', 'PostgreSQL', 'Socket.io'],
      icon:      '🔭',
      highlights: [
        'Monitoreo en tiempo real de tokens, latencia y costos vía Socket.io',
        'Dashboard con métricas históricas y comparativas de modelos',
        'Open source — contribuciones de la comunidad bienvenidas',
      ],
      metricas: [
        { label: 'Tiempo real', value: '✓' },
        { label: 'Stack', value: 'React + Node' },
        { label: 'Open Source', value: '✓' },
      ],
      github: 'https://github.com/DavidAucancela/LLM-Observatory',
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

  /* ─── EXPERIENCE — Timeline horizontal ──────────────────── */
  const COMPLETED_DATA = EXPERIENCE_DATA.filter(e => e.completed !== false);

  function renderExperience(mode) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.dataset.mode = mode;
    _buildTimeline(container);
  }

  function _buildTimeline(container) {
    container.innerHTML = '';
    const data = COMPLETED_DATA;

    const wrap = document.createElement('div');
    wrap.className = 'traj-wrap';

    const scroll = document.createElement('div');
    scroll.className = 'traj-scroll';
    scroll.setAttribute('aria-label', 'Trayectoria de proyectos');

    const line = document.createElement('div');
    line.className = 'traj-line';
    scroll.appendChild(line);

    data.forEach((item) => {
      const year = item.date.split(' — ').pop().split(' ').pop();
      const shortTitle = item.title.split(' — ')[0];

      const btn = document.createElement('button');
      btn.className = 'traj-item';
      btn.dataset.slug = item.slug || '';
      btn.setAttribute('aria-label', `Ver ${item.title}`);
      btn.innerHTML = `
        <span class="traj-item__year">${year}</span>
        <span class="traj-item__dot">${item.icon}</span>
        <span class="traj-item__title">${shortTitle}</span>
        <span class="traj-item__badge">${item.typeLabel}</span>
      `;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.traj-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (item.slug) {
          window.dispatchEvent(new CustomEvent('portfolio:openProjectDetail', { detail: { slug: item.slug } }));
        }
      });
      scroll.appendChild(btn);
    });

    wrap.appendChild(scroll);
    container.appendChild(wrap);
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
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.querySelectorAll('.traj-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.slug === slug);
    });
    const active = container.querySelector(`.traj-item[data-slug="${slug}"]`);
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
