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

import { Trajectory } from './trajectory.js';
import { LangSwitcher } from './lang.js';

  /* ════════════════════════════════════════════════════════════
     DATOS: ABOUT
  ════════════════════════════════════════════════════════════ */
  const ABOUT_DATA = {
    dev: {
      headline:    { es: 'Software Engineer & Fullstack Developer',        en: 'Software Engineer & Fullstack Developer' },
      text1:       {
        es: 'Construyo sistemas pensando en quien los va a mantener el día de mañana (probablemente yo mismo). Priorizo claridad sobre complejidad, y escalabilidad sobre atajos.',
        en: 'I build systems with whoever\'s going to maintain them tomorrow in mind (probably myself). I prioritize clarity over complexity, and scalability over shortcuts.',
      },
      focusCard: {
        icon:  '🏗️',
        title: { es: 'Arquitectura & Sistemas',    en: 'Architecture & Systems' },
        desc:  { es: 'Diseño sistemas desacoplados y escalables aplicando principios SOLID y patrones de arquitectura REST.',
                 en: 'I design decoupled, scalable systems applying SOLID principles and REST architecture patterns.' },
        tags:  ['Fullstack', 'REST API', 'Docker', 'PostgreSQL', 'CI/CD'],
      },
      stats: [
        { target: 9, suffix: '+', label: { es: 'Proyectos',      en: 'Projects'     } },
        { target: 3, suffix: '',  label: { es: 'Especialidades', en: 'Specialties'  } },
        { target: 2, suffix: '+', label: { es: 'Años exp.',      en: 'Yrs exp.'     } },
      ],
    },
    ia: {
      headline:    { es: 'IA Developer & AI Systems Builder', en: 'IA Developer & AI Systems Builder' },
      text1:       {
        es: 'Integro IA de punta a punta en producción, no como feature decorativa sino como núcleo del sistema. Me interesa lo que pasa después del prompt: retrieval, costos, latencia, observabilidad.',
        en: 'I integrate AI end-to-end in production, not as a decorative feature but as the system\'s core. I care about what happens after the prompt: retrieval, cost, latency, observability.',
      },
      focusCard: {
        icon:  '🧠',
        title: { es: 'IA Aplicada & LLMs', en: 'Applied AI & LLMs' },
        desc:  { es: 'Construyo sistemas que usan IA como núcleo: RAG pipelines, embeddings, agentes y prompt engineering avanzado.',
                 en: 'I build systems that use AI as their core: RAG pipelines, embeddings, agents and advanced prompt engineering.' },
        tags:  ['OpenAI API', 'RAG', 'Embeddings', 'pgvector', 'Prompt Eng.'],
      },
      stats: [
        { target: 4, suffix: '',  label: { es: 'Proyectos IA',     en: 'AI Projects'   } },
        { target: 2, suffix: '',  label: { es: 'LLMs integrados',  en: 'LLMs integrated' } },
        { target: 0, suffix: '',  label: { es: 'PII expuesto',     en: 'PII exposed'   } },
      ],
    },
    sec: {
      headline:    { es: 'Security Researcher & Ethical Hacker', en: 'Security Researcher & Ethical Hacker' },
      text1:       {
        es: 'Pienso como atacante para defender mejor: el primer paso para proteger un sistema es saber exactamente cómo romperlo.',
        en: 'I think like an attacker to defend better: the first step to protecting a system is knowing exactly how to break it.',
      },
      focusCard: {
        icon:  '🔒',
        title: { es: 'Security by Design', en: 'Security by Design' },
        desc:  { es: 'Implemento el OWASP Top 10 desde el diseño: autenticación robusta, validación de entradas, HTTPS, CSP y auditoría completa.',
                 en: 'I implement OWASP Top 10 from design: robust authentication, input validation, HTTPS, CSP and full audit coverage.' },
        tags:  ['OWASP Top 10', 'Pentesting', 'JWT', 'Helmet.js', 'Auditoría'],
      },
      stats: [
        { target: 6,   suffix: '/10', label: { es: 'OWASP cubiertos',    en: 'OWASP covered'    } },
        { target: 5,   suffix: '',    label: { es: 'Capas de seguridad', en: 'Security layers'  } },
        { target: 100, suffix: '%',   label: { es: 'Auditoría cobertura', en: 'Audit coverage'  } },
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
      summary: { es: 'Stack fullstack para sistemas web y APIs robustas', en: 'Fullstack stack for web systems and robust APIs' },
      icon:    '⚡',
      categories: [
        {
          id:    'frontend',
          title: { es: 'Frontend', en: 'Frontend' },
          skills: [
            { name: 'Angular',    type: 'devicon', icon: 'devicon-angularjs-plain colored' },
            { name: 'Vue.js',     type: 'devicon', icon: 'devicon-vuejs-plain colored' },
            { name: 'React',      type: 'devicon', icon: 'devicon-react-original colored' },
            { name: 'Next.js',    type: 'devicon', icon: 'devicon-nextjs-original colored', invertDark: true },
            { name: 'TypeScript', type: 'devicon', icon: 'devicon-typescript-plain colored' },
            { name: 'JavaScript', type: 'devicon', icon: 'devicon-javascript-plain colored' },
            { name: 'Tailwind',   type: 'devicon', icon: 'devicon-tailwindcss-original colored' },
            { name: 'HTML5',      type: 'devicon', icon: 'devicon-html5-plain colored' },
            { name: 'CSS3',       type: 'devicon', icon: 'devicon-css3-plain colored' },
            { name: 'Vite',       type: 'devicon', icon: 'devicon-vitejs-plain colored' },
          ],
        },
        {
          id:    'backend',
          title: { es: 'Backend', en: 'Backend' },
          skills: [
            { name: 'Python',     type: 'devicon', icon: 'devicon-python-plain colored' },
            { name: 'Django',     type: 'devicon', icon: 'devicon-django-plain colored' },
            { name: 'FastAPI',    type: 'devicon', icon: 'devicon-fastapi-plain colored' },
            { name: 'Node.js',    type: 'devicon', icon: 'devicon-nodejs-plain colored' },
            { name: 'Express',    type: 'devicon', icon: 'devicon-express-original colored', invertDark: true },
            { name: 'PostgreSQL', type: 'devicon', icon: 'devicon-postgresql-plain colored' },
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
          title: { es: 'DevOps & Deploy', en: 'DevOps & Deploy' },
          skills: [
            { name: 'Docker',  type: 'devicon', icon: 'devicon-docker-plain colored' },
            { name: 'Git',     type: 'devicon', icon: 'devicon-git-plain colored' },
            { name: 'GitHub',  type: 'devicon', icon: 'devicon-github-original colored', invertDark: true },
            { name: 'Nginx',   type: 'devicon', icon: 'devicon-nginx-plain colored' },
            { name: 'Linux',   type: 'devicon', icon: 'devicon-linux-plain colored',   invertDark: true },
            { name: 'Vercel',  type: 'devicon', icon: 'devicon-vercel-original colored', invertDark: true },
            { name: 'Railway', type: 'emoji',   icon: '🚂' },
          ],
        },
      ],
    },
    ia: {
      summary: { es: 'Stack para sistemas que integran inteligencia artificial', en: 'Stack for systems integrating artificial intelligence' },
      icon:    '🧠',
      categories: [
        {
          id:    'frontend',
          title: { es: 'Interfaces IA', en: 'AI Interfaces' },
          skills: [
            { name: 'React',        type: 'devicon', icon: 'devicon-react-original colored' },
            { name: 'Next.js',      type: 'devicon', icon: 'devicon-nextjs-original colored', invertDark: true },
            { name: 'Vue.js',       type: 'devicon', icon: 'devicon-vuejs-plain colored' },
            { name: 'TypeScript',   type: 'devicon', icon: 'devicon-typescript-plain colored' },
            { name: 'Streaming UI', type: 'svg', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
            { name: 'Chat UI',      type: 'emoji', icon: '💬' },
          ],
        },
        {
          id:    'backend',
          title: { es: 'Modelos & IA', en: 'Models & AI' },
          skills: [
            { name: 'OpenAI API',  type: 'svg', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.28 9.53a5.37 5.37 0 00-.46-4.4 5.43 5.43 0 00-5.84-2.6A5.37 5.37 0 0012 .5a5.43 5.43 0 00-5.18 3.77 5.37 5.37 0 00-3.58 2.6 5.43 5.43 0 00.67 6.35 5.38 5.38 0 00.46 4.4 5.43 5.43 0 005.84 2.6A5.37 5.37 0 0012 23.5a5.43 5.43 0 005.18-3.77 5.37 5.37 0 003.58-2.6 5.43 5.43 0 00-.48-6.6z"/></svg>` },
            { name: 'Claude API',  type: 'emoji', icon: '🤖' },
            { name: 'RAG',         type: 'emoji', icon: '📚' },
            { name: 'Embeddings',  type: 'emoji', icon: '🔢' },
            { name: 'pgvector',    type: 'devicon', icon: 'devicon-postgresql-plain colored' },
            { name: 'Prompt Eng.', type: 'emoji', icon: '✍️' },
            { name: 'n8n',         type: 'emoji', icon: '⚙️' },
            { name: 'Ollama',      type: 'emoji', icon: '🦙' },
          ],
        },
        {
          id:    'tools',
          title: { es: 'Infraestructura', en: 'Infrastructure' },
          skills: [
            { name: 'Python',     type: 'devicon', icon: 'devicon-python-plain colored' },
            { name: 'FastAPI',    type: 'devicon', icon: 'devicon-fastapi-plain colored' },
            { name: 'Node.js',    type: 'devicon', icon: 'devicon-nodejs-plain colored' },
            { name: 'Django',     type: 'devicon', icon: 'devicon-django-plain colored' },
            { name: 'PostgreSQL', type: 'devicon', icon: 'devicon-postgresql-plain colored' },
            { name: 'Docker',     type: 'devicon', icon: 'devicon-docker-plain colored' },
            { name: 'Socket.io',  type: 'emoji',   icon: '⚡' },
            { name: 'Git',        type: 'devicon', icon: 'devicon-git-plain colored' },
          ],
        },
      ],
    },
    sec: {
      summary: { es: 'Arsenal de seguridad ofensiva y defensiva', en: 'Offensive and defensive security arsenal' },
      icon:    '🔐',
      categories: [
        {
          id:    'recon',
          title: { es: 'Reconocimiento', en: 'Reconnaissance' },
          skills: [
            { name: 'OSINT',       type: 'emoji', icon: '🔍' },
            { name: 'Nmap',        type: 'emoji', icon: '🌐' },
            { name: 'Burp Suite',  type: 'emoji', icon: '🕷️' },
            { name: 'Wireshark',   type: 'emoji', icon: '🦈' },
            { name: 'Kali Linux',  type: 'devicon', icon: 'devicon-linux-plain colored', invertDark: true },
          ],
        },
        {
          id:    'offensive',
          title: { es: 'Seguridad Web', en: 'Web Security' },
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
          title: { es: 'Defensa & Hardening', en: 'Defense & Hardening' },
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
      date:      'Jul 2026 — Presente',
      title:     'KOS — Motor de Conocimiento',
      role:      'Desarrollador Full Stack + IA · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'inkos',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Motor de conocimiento independiente donde Obsidian es solo uno de los conectores. Ingesta múltiples fuentes, construye un grafo de conocimiento y razona sobre él con agentes de IA coordinados.',
              en: 'Independent knowledge engine where Obsidian is just one of the connectors. Ingests multiple sources, builds a knowledge graph and reasons over it with coordinated AI agents.' },
      tags:      ['FastAPI', 'React', 'Neo4j', 'PostgreSQL', 'AI Agents', 'LLM'],
      icon:      '🧠',
      highlights: { es: [
        'Grafo con 9 tipos de entidad (Person, Project, Technology, Concept, Document, Task, Organization, Event, Skill)',
        'Ingesta y embeddings locales con Ollama + bge-m3; chat con respuestas citadas por fuente',
        'Editor de grafo con corrección de relaciones mal etiquetadas y panel de latencia por servicio',
      ], en: [
        '9-entity-type graph (Person, Project, Technology, Concept, Document, Task, Organization, Event, Skill)',
        'Local ingestion and embeddings with Ollama + bge-m3; chat with answers cited by source',
        'Graph editor with correction of mislabeled relationships and a per-service latency panel',
      ] },
      metricas: [
        { label: { es: 'Entidades', en: 'Entities' }, value: { es: '9 tipos', en: '9 types' } },
        { label: { es: 'Embeddings', en: 'Embeddings' }, value: { es: 'Locales', en: 'Local' } },
        { label: { es: 'Estado', en: 'Status' }, value: { es: 'En desarrollo', en: 'In development' } },
      ],
      github: 'https://github.com/DavidAucancela/KOS',
    },
    {
      date:      'May 2026 — Presente',
      title:     'Universidad Tecnológica Equinoccial (UTE)',
      role:      'Junior Developer · Dirección de Sistemas Digitales',
      org:       'UTE · Quito, Ecuador',
      completed: true,
      type:      'experience',
      typeLabel: 'Trabajo fijo',
      desc: { es: 'Desarrollo backend y optimización de procesos académico-administrativos sobre Banner ERP: reportes en .NET conectados a Oracle Database, tuning de consultas SQL/PL-SQL y mantenimiento de sistemas legacy.',
              en: 'Backend development and optimization of academic-administrative processes on Banner ERP: .NET reports connected to Oracle Database, SQL/PL-SQL query tuning and legacy system maintenance.' },
      tags:      ['.NET', 'C#', 'ASP.NET Core', 'Oracle', 'PL/SQL', 'Banner ERP'],
      icon:      '🏫',
      highlights: { es: [
        'Desarrollo de funcionalidades y reportes en .NET (C#/ASP.NET Core) conectados a Oracle Database para automatizar procesos académico-administrativos en Banner ERP',
        'Optimización de consultas SQL y procedimientos PL/SQL (BULK COLLECT, window functions) para mejorar el rendimiento de reportes críticos',
        'Debugging y mantenimiento de sistemas legacy que soportan la operación diaria de la universidad',
      ], en: [
        'Built features and .NET (C#/ASP.NET Core) reports connected to Oracle Database to automate academic-administrative processes in Banner ERP',
        'Optimized SQL queries and PL/SQL procedures (BULK COLLECT, window functions) to improve critical report performance',
        'Debugging and maintenance of legacy systems supporting the university\'s daily operations',
      ] },
      metricas: [
        { label: { es: 'Sistemas automatizados', en: 'Systems automated' }, value: '2' },
        { label: { es: 'Stack', en: 'Stack' }, value: '.NET + Oracle' },
        { label: { es: 'Rol', en: 'Role' }, value: 'Junior Dev' },
      ],
    },
    {
      date:      'Mar 2026 — Presente',
      title:     'ZeroDay — Fitness Game',
      role:      'Desarrollador Mobile + IA · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'zeroday-fitnessgame',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'App gamificada que mide el fitness real del usuario con visión por computadora y lo confronta con escenarios de supervivencia tipo apocalipsis zombie.',
              en: 'Gamified app that measures the user\'s real fitness with computer vision and pits it against zombie-apocalypse survival scenarios.' },
      tags:      ['AI Vision', 'Gamification', 'Fitness', 'ML', 'Mobile'],
      icon:      '🧟',
      highlights: { es: [
        'Medición de ejercicio con MediaPipe y modelos ML propios, sin entrada manual de datos',
        'Gamificación: el rendimiento físico real alimenta escenarios de supervivencia',
        'Enfoque mobile-first sobre los mismos fundamentos de pose detection que Rep-Counter',
      ], en: [
        'Exercise measurement with MediaPipe and custom ML models, with no manual data entry',
        'Gamification: real physical performance drives survival scenarios',
        'Mobile-first approach built on the same pose-detection foundations as Rep-Counter',
      ] },
      metricas: [
        { label: { es: 'Visión', en: 'Vision' }, value: 'MediaPipe' },
        { label: { es: 'Plataforma', en: 'Platform' }, value: 'Mobile' },
        { label: { es: 'Estado', en: 'Status' }, value: { es: 'En desarrollo', en: 'In development' } },
      ],
      github: 'https://github.com/DavidAucancela/ZeroDay-FitnessGame',
    },
    {
      date:      'Jul 2026',
      title:     'whisperX — Local AI Service',
      role:      'Desarrollador Backend · Open Source',
      org:       'Proyecto open source · Remoto',
      slug:      'whisperx',
      completed: true,
      type:      'project',
      typeLabel: 'Open Source',
      desc: { es: 'Microservicio FastAPI que centraliza transcripción, traducción y diarización de audio, y generación de embeddings vía OpenAI — consumido por otros proyectos (Next.js, NestJS, n8n) en lugar de llamar a OpenAI directamente.',
              en: 'FastAPI microservice that centralizes audio transcription, translation and diarization, plus embedding generation via OpenAI — consumed by other projects (Next.js, NestJS, n8n) instead of calling OpenAI directly.' },
      tags:      ['FastAPI', 'OpenAI API', 'pyannote.audio', 'Docker', 'Embeddings'],
      icon:      '🎙️',
      highlights: { es: [
        'Diarización local de hablantes con pyannote.audio, sin depender de un servicio externo',
        'Caché por hash de audio + rate limiting + API key propia + 39 tests con OpenAI mockeado',
        'Imagen Docker multi-stage con usuario no-root; observabilidad de costo/tokens/latencia integrada con LLM Observatory',
      ], en: [
        'Local speaker diarization with pyannote.audio, with no dependency on an external service',
        'Cache by audio hash + rate limiting + its own API key + 39 tests with OpenAI mocked',
        'Multi-stage Docker image with a non-root user; cost/token/latency observability integrated with LLM Observatory',
      ] },
      metricas: [
        { label: { es: 'Tests', en: 'Tests' }, value: '39' },
        { label: { es: 'Fases', en: 'Phases' }, value: '7' },
        { label: { es: 'Endpoints', en: 'Endpoints' }, value: '6+' },
      ],
      github: 'https://github.com/DavidAucancela/whisperX',
    },
    {
      date:      'Jul 2026',
      title:     'Visual QC Inspector',
      role:      'Desarrollador Python + IA · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'visual-qc-inspector',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Sistema de inspección de calidad visual en tiempo real: la webcam captura frames, Claude Vision los evalúa contra criterios de inspección escritos en YAML, y emite veredictos PASS/WARN/FAIL con evidencia auditable.',
              en: 'Real-time visual quality-inspection system: the webcam captures frames, Claude Vision evaluates them against inspection criteria written in YAML, and issues PASS/WARN/FAIL verdicts with auditable evidence.' },
      tags:      ['Claude Vision', 'Python', 'OpenCV', 'SQLite', 'YAML'],
      icon:      '🔍',
      highlights: { es: [
        'Criterios de inspección 100% en lenguaje natural (perfiles YAML) — agregar un producto nuevo no requiere tocar código',
        'Evidencia auditable: frames guardados + registro en SQLite + reporte HTML por sesión',
        'Modo interactivo con hotkeys: disparo manual, cambio de perfil, screenshot y reporte on-demand',
      ], en: [
        '100% natural-language inspection criteria (YAML profiles) — adding a new product requires no code changes',
        'Auditable evidence: saved frames + SQLite log + per-session HTML report',
        'Interactive mode with hotkeys: manual trigger, profile switch, screenshot and on-demand report',
      ] },
      metricas: [
        { label: { es: 'Veredictos', en: 'Verdicts' }, value: 'PASS/WARN/FAIL' },
        { label: { es: 'Perfiles', en: 'Profiles' }, value: 'YAML' },
        { label: { es: 'Evidencia', en: 'Evidence' }, value: { es: 'Auditable', en: 'Auditable' } },
      ],
      github: 'https://github.com/DavidAucancela/visual-qc-inspector',
    },
    {
      date:      'Jun 2026 — Jul 2026',
      title:     'XV Años — Tammy',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'xv-tammy',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Sistema de invitaciones digitales con QR y control de acceso en tiempo real para una quinceañera: landing con countdown y galería, invitación personalizada por token, escáner QR para staff y dashboard de check-in en vivo.',
              en: 'Digital QR-based invitation system with real-time access control for a quinceañera: landing page with countdown and gallery, per-token personalized invitation, QR scanner for staff and a live check-in dashboard.' },
      tags:      ['Next.js', 'Supabase', 'Tailwind', 'Framer Motion'],
      icon:      '🎉',
      highlights: { es: [
        'Invitación personalizada por token con QR generado server-side',
        'Scanner QR (html5-qrcode) + dashboard de check-in en tiempo real vía Supabase Realtime',
        'Login de staff por magic link (email OTP), sin contraseñas',
      ], en: [
        'Per-token personalized invitation with a server-side generated QR code',
        'QR scanner (html5-qrcode) + real-time check-in dashboard via Supabase Realtime',
        'Passwordless staff login via magic link (email OTP)',
      ] },
      metricas: [
        { label: { es: 'Rutas', en: 'Routes' }, value: '7' },
        { label: { es: 'Auth', en: 'Auth' }, value: 'Magic link' },
        { label: { es: 'Realtime', en: 'Realtime' }, value: { es: 'Sí', en: 'Yes' } },
      ],
      github: 'https://github.com/DavidAucancela/XV-Tammy',
      demo:   'https://xv-tammy-production.up.railway.app/',
    },
    {
      date:      'Jun 2026',
      title:     'Portfolio Trimodal',
      role:      'Desarrollador Frontend · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'portfolio-trimodal',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Portfolio personal con tres modos de presentación (dev / ia / sec), canvas de partículas por modo, asistente de IA con embeddings semánticos y galería fullscreen de proyectos.',
              en: 'Personal portfolio with three presentation modes (dev / ia / sec), a per-mode particle canvas, an AI assistant with semantic embeddings and a fullscreen project gallery.' },
      tags:      ['HTML5', 'CSS3', 'JavaScript', 'Vite', 'Vercel'],
      icon:      '🌐',
      highlights: { es: [
        'Sistema trimodal: contenido, paleta y animaciones cambian según el perfil',
        'Widget de IA (JotAI) con búsqueda semántica MiniLM en Web Worker',
        'Deploy automático en Vercel vía GitHub Actions',
      ], en: [
        'Three-mode system: content, palette and animations change with the active profile',
        'AI widget (JotAI) with MiniLM semantic search running in a Web Worker',
        'Automatic deploy to Vercel via GitHub Actions',
      ] },
      metricas: [
        { label: { es: 'Modos', en: 'Modes' }, value: '3' },
        { label: { es: 'Módulos JS', en: 'JS modules' }, value: '18' },
        { label: { es: 'Proyectos', en: 'Projects' }, value: '20+' },
      ],
      github: 'https://github.com/DavidAucancela/Portfolio',
      demo:   'https://davidaucancela.github.io/Portfolio/',
    },
    {
      date:      'Jun 2026',
      title:     'Nunna',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'nunna',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Catálogo digital + experiencia inmersiva sobre los personajes tradicionales de los pases riobambeños — Diablo Huma, Curiquingue, Sacha Runa y más. Monorepo Turborepo con Next.js 15, NestJS, Directus y Supabase.',
              en: 'Digital catalog + immersive experience about the traditional characters of Riobamba\'s processions — Diablo Huma, Curiquingue, Sacha Runa and more. Turborepo monorepo with Next.js 15, NestJS, Directus and Supabase.' },
      tags:      ['Next.js', 'NestJS', 'Directus', 'Supabase', 'Turborepo'],
      icon:      '🏛️',
      highlights: { es: [
        'Monorepo Turborepo + pnpm workspaces: web (Next.js SSR) + api (NestJS)',
        'Directus como CMS headless — gestión del contenido cultural sin código',
        'Búsqueda semántica sobre el patrimonio riobambeño',
      ], en: [
        'Turborepo monorepo + pnpm workspaces: web (Next.js SSR) + api (NestJS)',
        'Directus as a headless CMS — no-code management of the cultural content',
        'Semantic search over Riobamba\'s heritage',
      ] },
      metricas: [
        { label: { es: 'Apps monorepo', en: 'Monorepo apps' }, value: '2' },
        { label: { es: 'Packages', en: 'Packages' }, value: '3' },
        { label: { es: 'CMS', en: 'CMS' }, value: 'Directus' },
      ],
      github: 'https://github.com/DavidAucancela/Nunna',
    },
    {
      date:      'Jun 2026',
      title:     'DualFace',
      role:      'Desarrollador Frontend · Cliente',
      org:       'Cliente institucional · Remoto',
      slug:      'dualface',
      completed: true,
      type:      'project',
      typeLabel: 'Cliente',
      desc: { es: 'Experiencia web inmersiva de preservación cultural sobre el Diablo Huma y el Cucurucho. Scroll narrativo estilo Persepolis con GSAP ScrollTrigger y audio ambiental por universo con Tone.js.',
              en: 'Immersive cultural-preservation web experience about the Diablo Huma and the Cucurucho. Persepolis-style narrative scroll with GSAP ScrollTrigger and ambient audio per universe with Tone.js.' },
      tags:      ['HTML5', 'CSS3', 'GSAP', 'ScrollTrigger', 'Tone.js'],
      icon:      '🎭',
      highlights: { es: [
        'Sistema de temas dual: dos universos comparten el HTML, un toggle cambia todo',
        'GSAP ScrollTrigger con capítulos narrativos y parallax en 3 capas',
        'Audio ambiental diferenciado por universo con Tone.js — cero frameworks',
      ], en: [
        'Dual-theme system: two universes share the same HTML, a single toggle switches everything',
        'GSAP ScrollTrigger with narrative chapters and 3-layer parallax',
        'Ambient audio differentiated per universe with Tone.js — zero frameworks',
      ] },
      metricas: [
        { label: { es: 'Universos', en: 'Universes' }, value: '2' },
        { label: { es: 'Capítulos', en: 'Chapters' }, value: '8' },
        { label: { es: 'Frameworks', en: 'Frameworks' }, value: '0' },
      ],
      github: 'https://github.com/DavidAucancela/DualFace',
    },
    {
      date:      'May 2026',
      title:     'CodeReviewX',
      role:      'Desarrollador Backend + IA · Open Source',
      org:       'Proyecto open source · Remoto',
      slug:      'codereviewx',
      completed: true,
      type:      'project',
      typeLabel: 'Open Source',
      desc: { es: 'GitHub App de revisión de código automatizada. Analiza diffs con Ruff/ESLint y Claude Sonnet, y publica comentarios inline en el PR — sin intervención humana.',
              en: 'Automated code-review GitHub App. Analyzes diffs with Ruff/ESLint and Claude Sonnet, and posts inline comments on the PR — with no human intervention.' },
      tags:      ['Claude API', 'FastAPI', 'GitHub App', 'Ruff', 'ESLint'],
      icon:      '🔍',
      highlights: { es: [
        'Webhook con firma HMAC-SHA256 verificada y respuesta 200 OK en <200ms',
        'Análisis en background con asyncio: estático (Ruff/ESLint) + semántico (Claude)',
        'Comentarios inline por línea publicados directamente en el PR',
      ], en: [
        'Webhook with verified HMAC-SHA256 signature and a 200 OK response in <200ms',
        'Background analysis with asyncio: static (Ruff/ESLint) + semantic (Claude)',
        'Inline per-line comments posted directly on the PR',
      ] },
      metricas: [
        { label: { es: 'Modelo IA', en: 'AI model' }, value: 'Claude Sonnet' },
        { label: { es: 'Webhook', en: 'Webhook' }, value: '<200ms' },
        { label: { es: 'Lenguajes', en: 'Languages' }, value: 'Py + JS/TS' },
      ],
      github: 'https://github.com/DavidAucancela/CodeReviewX-',
    },
    {
      date:      'May 2026',
      title:     'Gesture Control',
      role:      'Desarrollador Python · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'gesture-control',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Detección de gestos de mano en tiempo real vía webcam que mapea gestos a atajos de teclado, clics de ratón y acciones de sistema. Clasificador híbrido rule-based + ML sklearn.',
              en: 'Real-time hand-gesture detection via webcam that maps gestures to keyboard shortcuts, mouse clicks and system actions. Hybrid rule-based + sklearn ML classifier.' },
      tags:      ['Python', 'MediaPipe', 'OpenCV', 'pynput', 'sklearn'],
      icon:      '🖐️',
      highlights: { es: [
        '21 landmarks por mano detectados en cada frame con MediaPipe Hands',
        'Clasificador híbrido: reglas geométricas + RandomForest entrenable',
        'Gestos personalizados configurables vía YAML — sin tocar código',
      ], en: [
        '21 landmarks per hand detected on every frame with MediaPipe Hands',
        'Hybrid classifier: geometric rules + a trainable RandomForest',
        'Custom gestures configurable via YAML — no code changes needed',
      ] },
      metricas: [
        { label: { es: 'Gestos base', en: 'Base gestures' }, value: '9' },
        { label: { es: 'Landmarks', en: 'Landmarks' }, value: '21' },
        { label: { es: 'Config', en: 'Config' }, value: 'YAML' },
      ],
      github: 'https://github.com/DavidAucancela/Gesture-control',
    },
    {
      date:      'Abr 2026 — May 2026',
      title:     'Curso Certificado de Ciberseguridad — IBM',
      role:      'Estudiante · IBM SkillsBuild',
      org:       'IBM SkillsBuild',
      completed: true,
      type:      'cert',
      typeLabel: 'Certificación',
      desc: { es: 'Programa completo de ciberseguridad de IBM SkillsBuild con 8 módulos certificados: fundamentos, GRC, gestión de vulnerabilidades, seguridad de redes y sistemas, operaciones SOC, respuesta a incidentes, forense digital y seguridad en la nube.',
              en: 'Full IBM SkillsBuild cybersecurity program with 8 certified modules: fundamentals, GRC, vulnerability management, network and system security, SOC operations, incident response, digital forensics and cloud security.' },
      tags:      ['IBM', 'SOC', 'GRC', 'Cloud Security', 'Incident Response', 'Forensics', 'Vulnerability Management'],
      icon:      '📚',
      highlights: { es: [
        'Cybersecurity Fundamentals — IBM SkillsBuild (29 abr 2026)',
        'Governance, Risk, Compliance & Data Privacy — IBM SkillsBuild (29 abr 2026)',
        'Vulnerability Management — IBM SkillsBuild (1 may 2026)',
        'System and Network Security — IBM SkillsBuild (23 may 2026)',
        'Security Operations and Management — IBM SkillsBuild (24 may 2026)',
        'Incident Response and Systems Forensics — IBM SkillsBuild (24 may 2026)',
        'Cloud Security — IBM SkillsBuild (24 may 2026)',
        'IBM SkillsBuild Cybersecurity Certificate — Certificado principal (24 may 2026)',
      ], en: [
        'Cybersecurity Fundamentals — IBM SkillsBuild (Apr 29, 2026)',
        'Governance, Risk, Compliance & Data Privacy — IBM SkillsBuild (Apr 29, 2026)',
        'Vulnerability Management — IBM SkillsBuild (May 1, 2026)',
        'System and Network Security — IBM SkillsBuild (May 23, 2026)',
        'Security Operations and Management — IBM SkillsBuild (May 24, 2026)',
        'Incident Response and Systems Forensics — IBM SkillsBuild (May 24, 2026)',
        'Cloud Security — IBM SkillsBuild (May 24, 2026)',
        'IBM SkillsBuild Cybersecurity Certificate — Main certificate (May 24, 2026)',
      ] },
      metricas: [
        { label: { es: 'Módulos', en: 'Modules' }, value: '8' },
        { label: { es: 'Emisor', en: 'Issuer' }, value: 'IBM' },
        { label: { es: 'Estado', en: 'Status' }, value: { es: 'Obtenida', en: 'Earned' } },
      ],
    },
    {
      date:      'Mar 2026 — May 2026',
      title:     'MindLog — Diario Personal con IA',
      role:      'Desarrollador Full Stack Mobile · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'mindlog',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Primera app móvil del portfolio. Expo SDK 54 + FastAPI async. Claude Haiku detecta el mood de cada entrada, Sonnet responde con contexto del historial vía RAG + embeddings. Streaming SSE real implementado vía XHR en React Native.',
              en: 'First mobile app in the portfolio. Expo SDK 54 + async FastAPI. Claude Haiku detects the mood of each entry, Sonnet replies with history context via RAG + embeddings. Real SSE streaming implemented via XHR in React Native.' },
      tags:      ['React Native', 'Expo', 'FastAPI', 'Claude API', 'TypeScript', 'PostgreSQL'],
      icon:      '🧠',
      highlights: { es: [
        'Streaming SSE en tiempo real vía XHR — workaround para EventSource ausente en Expo',
        'RAG semántico: embeddings OpenAI + similitud coseno sobre entradas del propio usuario',
        'Perfil acumulativo: Haiku actualiza users.context al cerrar cada sesión de chat',
      ], en: [
        'Real-time SSE streaming via XHR — a workaround for EventSource being absent in Expo',
        'Semantic RAG: OpenAI embeddings + cosine similarity over the user\'s own entries',
        'Cumulative profile: Haiku updates users.context when each chat session ends',
      ] },
      metricas: [
        { label: { es: 'Modelos Claude', en: 'Claude models' }, value: '2' },
        { label: { es: 'Streaming', en: 'Streaming' }, value: { es: 'SSE real', en: 'Real SSE' } },
        { label: { es: 'Plataforma', en: 'Platform' }, value: 'iOS + Android' },
      ],
      github: 'https://github.com/DavidAucancela/MindLog',
    },
    {
      date:      'Abr 2026',
      title:     'Notes App',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'notes-app',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Aplicación full-stack de notas con arquitectura por capas (View → Service → Repository → ORM), JWT con blacklist en logout y deploy en Vercel + Railway.',
              en: 'Full-stack notes app with a layered architecture (View → Service → Repository → ORM), JWT with a logout blacklist and deployment on Vercel + Railway.' },
      tags:      ['Django', 'React', 'JWT', 'PostgreSQL', 'Railway', 'Docker'],
      icon:      '📝',
      highlights: { es: [
        'Arquitectura estricta en 4 capas: View → Service → Repository → ORM',
        'JWT con blacklist de refresh tokens en logout (djangorestframework-simplejwt)',
        'Frontend React 18 en Vercel, backend Django en Railway con PostgreSQL',
      ], en: [
        'Strict 4-layer architecture: View → Service → Repository → ORM',
        'JWT with a refresh-token blacklist on logout (djangorestframework-simplejwt)',
        'React 18 frontend on Vercel, Django backend on Railway with PostgreSQL',
      ] },
      metricas: [
        { label: { es: 'Capas', en: 'Layers' }, value: '4' },
        { label: { es: 'Endpoints', en: 'Endpoints' }, value: '13' },
        { label: { es: 'Auth', en: 'Auth' }, value: 'JWT + Blacklist' },
      ],
      demo: 'https://aucancela-35ab41.vercel.app',
    },
    {
      date:      'Abr 2026',
      title:     'ArtEcuador — Catálogo de Artesanías',
      role:      'Desarrollador Frontend · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'artecuador',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Catálogo web estático de artesanías ecuatorianas en un único index.html con CSS y JS inline. Sin frameworks ni dependencias de build. Docker + nginx:alpine en Railway.',
              en: 'Static web catalog of Ecuadorian handicrafts in a single index.html with inline CSS and JS. No frameworks, no build dependencies. Docker + nginx:alpine on Railway.' },
      tags:      ['HTML', 'CSS', 'JavaScript', 'Docker', 'nginx', 'Railway'],
      icon:      '🎨',
      highlights: { es: [
        'Single-file: todo el proyecto en un único index.html con CSS y JS inline',
        'Sistema de diseño propio con CSS custom properties y grid responsive 4→1 columna',
        'Docker + nginx:alpine en Railway — cero dependencias npm',
      ], en: [
        'Single-file: the entire project in one index.html with inline CSS and JS',
        'Custom design system with CSS custom properties and a responsive 4→1 column grid',
        'Docker + nginx:alpine on Railway — zero npm dependencies',
      ] },
      metricas: [
        { label: { es: 'Archivos', en: 'Files' }, value: '1 HTML' },
        { label: { es: 'Deps npm', en: 'npm deps' }, value: '0' },
        { label: { es: 'Secciones', en: 'Sections' }, value: '8' },
      ],
      github: 'https://github.com/DavidAucancela/ArtEcuador',
      demo:   'https://artecuador-production.up.railway.app/',
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
      desc: { es: 'Dashboard open-source de observabilidad para la API de Claude. Monitorea tokens, latencia, costos y calidad de respuestas en tiempo real con Socket.io.',
              en: 'Open-source observability dashboard for the Claude API. Monitors tokens, latency, cost and response quality in real time with Socket.io.' },
      tags:      ['React', 'Node.js', 'PostgreSQL', 'Socket.io'],
      icon:      '🔭',
      highlights: { es: [
        'Monitoreo en tiempo real de tokens, latencia y costos vía Socket.io',
        'Dashboard con métricas históricas y comparativas de modelos',
        'Open source — contribuciones de la comunidad bienvenidas',
      ], en: [
        'Real-time monitoring of tokens, latency and cost via Socket.io',
        'Dashboard with historical metrics and model comparisons',
        'Open source — community contributions welcome',
      ] },
      metricas: [
        { label: { es: 'Tiempo real', en: 'Real-time' }, value: '✓' },
        { label: { es: 'Stack', en: 'Stack' }, value: 'React + Node' },
        { label: { es: 'Open Source', en: 'Open Source' }, value: '✓' },
      ],
      github: 'https://github.com/DavidAucancela/llm-observatory',
      demo:   'https://llm-web-production.up.railway.app/settings',
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
      desc: { es: 'Catálogo digital de artesanías ecuatorianas con soporte multiidioma (ES/EN/PT), panel administrativo, carrito con pedidos por WhatsApp y modo oscuro/claro.',
              en: 'Digital catalog of Ecuadorian handicrafts with multilingual support (ES/EN/PT), an admin panel, a WhatsApp-based order cart and dark/light mode.' },
      tags:      ['Vue.js', 'Node.js', 'PostgreSQL', 'Pinia', 'i18n', 'Vercel'],
      icon:      '🎨',
      highlights: { es: [
        'SPA multiidioma (ES/EN/PT) con vue-i18n y Pinia para estado global',
        'Panel admin CRUD de productos, categorías y usuarios',
        'Carrito con generación de pedido en mensaje WhatsApp',
      ], en: [
        'Multilingual SPA (ES/EN/PT) with vue-i18n and Pinia for global state',
        'Admin panel with CRUD for products, categories and users',
        'Cart that generates an order as a WhatsApp message',
      ] },
      metricas: [
        { label: { es: 'Idiomas', en: 'Languages' }, value: '3' },
        { label: { es: 'Productos', en: 'Products' }, value: '+100' },
        { label: { es: 'Seguridad', en: 'Security' }, value: { es: '4 capas', en: '4 layers' } },
      ],
      github: 'https://github.com/DavidAucancela/IDEANCESTRAL',
      demo:   'https://ideancestral-production.up.railway.app/',
    },
    {
      date:      'Sep 2025 — Feb 2026',
      title:     'Prácticas — ESPOCH DETIC',
      role:      'Practicante de Seguridad Informática · Prácticas',
      org:       'ESPOCH · DETIC · Riobamba, Ecuador',
      completed: true,
      type:      'experience',
      typeLabel: 'Prácticas',
      desc: { es: 'Diagnóstico de sistemas institucionales para inventario de activos y servicios activos. Análisis con herramientas de seguridad y verificación de cumplimiento de controles ISO 27001.',
              en: 'Assessment of institutional systems for asset and active-service inventory. Analysis with security tooling and verification of ISO 27001 control compliance.' },
      tags:      ['ISO 27001', 'Auditoría', 'Análisis de Vulnerabilidades', 'Hardening', 'Linux'],
      icon:      '🛡️',
      highlights: { es: [
        'Inventario de activos de hardware y software en la red institucional',
        'Análisis de vulnerabilidades con herramientas de seguridad sobre sistemas internos',
        'Gap analysis de controles ISO 27001 e informe de recomendaciones',
      ], en: [
        'Inventory of hardware and software assets on the institutional network',
        'Vulnerability analysis with security tooling over internal systems',
        'ISO 27001 control gap analysis and a recommendations report',
      ] },
      metricas: [
        { label: { es: 'Norma', en: 'Standard' }, value: 'ISO 27001' },
        { label: { es: 'Duración', en: 'Duration' }, value: { es: '6 meses', en: '6 months' } },
        { label: { es: 'Área', en: 'Department' }, value: 'DETIC' },
      ],
    },
    {
      date:      'Ene 2026',
      title:     'Lumbre',
      role:      'Desarrollador de Videojuegos · Game Jam',
      org:       'Lager · Game Jam',
      slug:      'lumbre',
      completed: true,
      type:      'project',
      typeLabel: 'Game Jam',
      desc: { es: 'Juego de terror 2D en Unity 6. Un niño explora la casa de su abuela de noche con una caja de fósforos limitada: cada fósforo da luz para explorar, pero acerca a algo.',
              en: '2D horror game in Unity 6. A boy explores his grandmother\'s house at night with a limited box of matches: each match gives light to explore but draws something closer.' },
      tags:      ['Unity', 'C#', 'Game Dev', 'Horror', 'WebGL'],
      icon:      '🕯️',
      highlights: { es: [
        'Mecánica central de recurso limitado: la luz que te deja avanzar es la misma que te expone',
        'Terror atmosférico construido sobre iluminación y sonido, sin jumpscares',
        'Publicado y jugable en navegador vía WebGL en itch.io',
      ], en: [
        'Core limited-resource mechanic: the light that lets you move forward is the same light that exposes you',
        'Atmospheric horror built on lighting and sound, with no jumpscares',
        'Published and playable in-browser via WebGL on itch.io',
      ] },
      metricas: [
        { label: { es: 'Motor', en: 'Engine' }, value: 'Unity 6' },
        { label: { es: 'Build', en: 'Build' }, value: 'WebGL' },
        { label: { es: 'Publicado', en: 'Published' }, value: 'itch.io' },
      ],
      github: 'https://github.com/Lager-GJ/main',
      demo:   'https://lager.itch.io/lumbre',
    },
    {
      date:      'Ene 2026',
      title:     'Rep-Counter',
      role:      'Desarrollador TypeScript + ML · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'rep-counter',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Librería TypeScript puro para contar repeticiones de ejercicio (abdominales, flexiones) usando MediaPipe BlazePose. Spike de 2 semanas, extensible y portable.',
              en: 'Pure-TypeScript library for counting exercise reps (sit-ups, push-ups) using MediaPipe BlazePose. A 2-week spike, extensible and portable.' },
      tags:      ['TypeScript', 'MediaPipe', 'ML Vision', 'React Native', 'Pose Detection'],
      icon:      '🏋️',
      highlights: { es: [
        'Núcleo en TypeScript puro, sin dependencias de framework — portable entre web y móvil',
        'Conteo por pose detection con MediaPipe BlazePose, extensible a ejercicios nuevos',
        'Adaptadores para React y React Native pensados para integrarse en apps de fitness',
      ], en: [
        'Pure-TypeScript core with no framework dependencies — portable across web and mobile',
        'Rep counting via pose detection with MediaPipe BlazePose, extensible to new exercises',
        'React and React Native adapters designed to plug into fitness apps',
      ] },
      metricas: [
        { label: { es: 'Duración', en: 'Duration' }, value: { es: '2 semanas', en: '2 weeks' } },
        { label: { es: 'Núcleo', en: 'Core' }, value: { es: 'TS puro', en: 'Pure TS' } },
        { label: { es: 'Adaptadores', en: 'Adapters' }, value: 'React / RN' },
      ],
      github: 'https://github.com/DavidAucancela/Abs-PushUp-Counter',
    },
    {
      date:      'Feb 2025 — Ene 2026',
      title:     'UBApp — Universal Box',
      role:      'Desarrollador Full Stack · Titulación',
      org:       'Universidad / Universal Box · Quito',
      slug:      'ubapp',
      completed: true,
      type:      'project',
      typeLabel: 'Titulación',
      desc: { es: 'Sistema integral de gestión de envíos con búsqueda semántica impulsada por IA. Django REST + Angular + PostgreSQL + pgvector + Docker. Proyecto de grado con distinción.',
              en: 'Comprehensive shipment management system with AI-powered semantic search. Django REST + Angular + PostgreSQL + pgvector + Docker. Thesis project graded with distinction.' },
      tags:      ['Django', 'Angular', 'OpenAI', 'pgvector', 'Docker', 'PostgreSQL'],
      icon:      '🚀',
      highlights: { es: [
        'Búsqueda semántica con embeddings OpenAI — reduce tiempo de 4 min a 20 s',
        'CRUD completo con carga masiva Excel y generación de recibos PDF',
        'Control de acceso por roles (RBAC) + JWT + Docker Compose 4 servicios',
      ], en: [
        'Semantic search with OpenAI embeddings — cuts time from 4 min to 20 s',
        'Full CRUD with bulk Excel import and PDF receipt generation',
        'Role-based access control (RBAC) + JWT + a 4-service Docker Compose setup',
      ] },
      metricas: [
        { label: { es: 'Mejora eficiencia', en: 'Efficiency gain' }, value: '90%' },
        { label: { es: 'Módulos', en: 'Modules' }, value: '7' },
        { label: { es: 'Tiempo búsqueda', en: 'Search time' }, value: '<20s' },
      ],
      github: 'https://github.com/DavidAucancela/UBAppV2',
      demo:   'https://frontend-angular-production.up.railway.app/login',
    },
    {
      date:      '2024 — 2026',
      title:     'HackTheBox — Starting Point & Labs',
      role:      'Hacker Ético · Plataforma CTF',
      org:       'HackTheBox',
      completed: true,
      type:      'lab',
      typeLabel: 'Laboratorio HTB',
      desc: { es: 'Máquinas resueltas en HackTheBox: explotación de servicios FTP, SMB, Redis y captura de paquetes con Wireshark. Práctica de enumeración, escalación de privilegios y análisis de tráfico en entornos reales.',
              en: 'Machines solved on HackTheBox: exploitation of FTP, SMB and Redis services, plus packet capture with Wireshark. Practice in enumeration, privilege escalation and traffic analysis on real environments.' },
      tags:      ['HackTheBox', 'Pentesting', 'Linux', 'Windows', 'Nmap', 'FTP', 'SMB', 'Redis'],
      icon:      '⚔️',
      highlights: { es: [
        'Meow — Very Easy · Linux · Telnet no autenticado → root (100% owned)',
        'Fawn — Very Easy · Linux · FTP anonymous login → exfiltración de flag (100% owned)',
        'Dancing — Very Easy · Windows · SMB null session → acceso a share sin credenciales (100% owned)',
        'Redeemer — Very Easy · Linux · Redis sin auth → dump de claves en memoria (100% owned)',
        'Cap — Easy · Linux (Staff Pick) · IDOR en PCAP + SUID python → root',
      ], en: [
        'Meow — Very Easy · Linux · Unauthenticated Telnet → root (100% owned)',
        'Fawn — Very Easy · Linux · FTP anonymous login → flag exfiltration (100% owned)',
        'Dancing — Very Easy · Windows · SMB null session → share access with no credentials (100% owned)',
        'Redeemer — Very Easy · Linux · Unauthenticated Redis → in-memory key dump (100% owned)',
        'Cap — Easy · Linux (Staff Pick) · IDOR in PCAP + SUID python → root',
      ] },
      metricas: [
        { label: { es: 'Máquinas', en: 'Machines' }, value: '5' },
        { label: { es: 'Dificultad', en: 'Difficulty' }, value: 'Easy–Very Easy' },
        { label: { es: 'Owned', en: 'Owned' }, value: '100%' },
      ],
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
      desc: { es: 'Mapa mundial interactivo de criminales más buscados integrando la FBI API en tiempo real, Google Trends y Leaflet.js.',
              en: 'Interactive world map of most-wanted criminals integrating the FBI API in real time, Google Trends and Leaflet.js.' },
      tags:      ['Node.js', 'Leaflet', 'FBI API', 'Google Trends'],
      icon:      '🗺️',
      highlights: { es: [
        'Integración en tiempo real con FBI Most Wanted API',
        'Visualización geoespacial con Leaflet.js y markers dinámicos',
        'Correlación con tendencias de búsqueda Google Trends',
      ], en: [
        'Real-time integration with the FBI Most Wanted API',
        'Geospatial visualization with Leaflet.js and dynamic markers',
        'Correlation with Google Trends search data',
      ] },
      metricas: [
        { label: { es: 'APIs integradas', en: 'APIs integrated' }, value: '2' },
        { label: { es: 'Cobertura', en: 'Coverage' }, value: { es: 'Global', en: 'Global' } },
        { label: { es: 'Tiempo real', en: 'Real-time' }, value: '✓' },
      ],
      github: 'https://github.com/DavidAucancela/MapCriminalsCode',
      demo:   'https://mapcriminalscode-production.up.railway.app/',
    },
    {
      date:      'Nov 2025',
      title:     'NexoCorp — Directorio Telefónico',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'phone-directory',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Sistema de directorio telefónico interno con gestión de extensiones por oficina. Bulk import desde Excel, REST API completa y búsqueda por departamento.',
              en: 'Internal phone-directory system with per-office extension management. Bulk import from Excel, a full REST API and search by department.' },
      tags:      ['C#', 'ASP.NET Core', 'SQL Server', 'Razor Pages', 'Bootstrap'],
      icon:      '📇',
      highlights: { es: [
        'ASP.NET Core 8 + ADO.NET sobre SQL Server, con Razor Pages y Bootstrap 5 en el front',
        'Importación masiva de extensiones desde Excel con ClosedXML',
        'REST API documentada con Swagger/OpenAPI y búsqueda por departamento',
      ], en: [
        'ASP.NET Core 8 + ADO.NET over SQL Server, with Razor Pages and Bootstrap 5 on the front end',
        'Bulk extension import from Excel with ClosedXML',
        'REST API documented with Swagger/OpenAPI and search by department',
      ] },
      metricas: [
        { label: { es: 'Stack', en: 'Stack' }, value: '.NET 8' },
        { label: { es: 'Import', en: 'Import' }, value: { es: 'Excel bulk', en: 'Excel bulk' } },
        { label: { es: 'API', en: 'API' }, value: 'Swagger' },
      ],
      github: 'https://github.com/DavidAucancela/NexoCorp-Directorio',
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
      desc: { es: 'Pipeline ETL (Extract → Transform → Load) que automatiza la población de bases de datos desde archivos JSON con validación de schema, transacciones atómicas y logs de auditoría.',
              en: 'ETL pipeline (Extract → Transform → Load) that automates populating databases from JSON files with schema validation, atomic transactions and audit logs.' },
      tags:      ['Python', 'Django', 'PostgreSQL', 'ETL', 'JSON'],
      icon:      '⚙️',
      highlights: { es: [
        'Pipeline ETL completo con validación de schema antes de cada inserción',
        'Modo dry-run para validar datos sin modificar la base de datos',
        'Logs inmutables de auditoría con niveles INFO / WARNING / ERROR',
      ], en: [
        'Full ETL pipeline with schema validation before every insert',
        'Dry-run mode to validate data without modifying the database',
        'Immutable audit logs with INFO / WARNING / ERROR levels',
      ] },
      metricas: [
        { label: { es: 'Automatización', en: 'Automation' }, value: '100%' },
        { label: { es: 'Dry-run', en: 'Dry-run' }, value: '✓' },
        { label: { es: 'Validación', en: 'Validation' }, value: { es: 'Schema completo', en: 'Full schema' } },
      ],
      github: 'https://github.com/DavidAucancela/App-de-prueba-Equity',
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
      desc: { es: 'Asistente conversacional con IA para gestión de cooperativas financieras. El backend enriquece cada consulta con datos reales antes de llamar a OpenAI, sin exponer datos PII.',
              en: 'AI conversational assistant for managing financial cooperatives. The backend enriches every query with real data before calling OpenAI, without exposing PII.' },
      tags:      ['TypeScript', 'React', 'Node.js', 'OpenAI', 'RAG', 'PostgreSQL'],
      icon:      '🤖',
      highlights: { es: [
        'Patrón RAG: backend consulta BD y enriquece contexto antes de llamar a IA',
        'Streaming de respuestas OpenAI para experiencia de chat fluida',
        '0 datos PII expuestos al modelo — privacidad financiera garantizada',
      ], en: [
        'RAG pattern: the backend queries the DB and enriches context before calling the AI',
        'Streaming OpenAI responses for a fluid chat experience',
        '0 PII data exposed to the model — financial privacy guaranteed',
      ] },
      metricas: [
        { label: { es: 'Módulos IA', en: 'AI modules' }, value: '4' },
        { label: { es: 'TypeScript', en: 'TypeScript' }, value: '100%' },
        { label: { es: 'PII expuesto', en: 'PII exposed' }, value: '0' },
      ],
      github: 'https://github.com/DavidAucancela/AnaOS',
      demo:   'https://frontend-production-cc73.up.railway.app/',
    },
    {
      date:      'Oct 2025',
      title:     'Social Media AI Agent',
      role:      'Automatización + IA · Cliente',
      org:       'Cliente comercial · Remoto',
      slug:      'whatsapp-ai-agent',
      completed: true,
      type:      'project',
      typeLabel: 'Cliente',
      desc: { es: 'Agente conversacional en redes sociales que califica leads automáticamente con Claude Haiku, los registra en Supabase y los sincroniza con Kommo CRM usando n8n Cloud.',
              en: 'Conversational social-media agent that automatically qualifies leads with Claude Haiku, records them in Supabase and syncs them to Kommo CRM using n8n Cloud.' },
      tags:      ['n8n', 'Claude Haiku', 'Supabase', 'Kommo CRM', 'Telegram API'],
      icon:      '💬',
      highlights: { es: [
        'Claude Haiku extrae datos del prospecto: nombre, ciudad, motivo, marca',
        'Conversación persistida en Supabase a medida que avanza el flujo',
        'Lead creado/actualizado en Kommo CRM con todos los campos calificados',
      ], en: [
        'Claude Haiku extracts the prospect\'s data: name, city, reason, brand',
        'Conversation persisted in Supabase as the flow progresses',
        'Lead created/updated in Kommo CRM with every qualified field',
      ] },
      metricas: [
        { label: { es: 'Modelo IA', en: 'AI model' }, value: 'Claude Haiku' },
        { label: { es: 'Motor', en: 'Engine' }, value: 'n8n Cloud' },
        { label: { es: 'Disponibilidad', en: 'Availability' }, value: '24/7' },
      ],
      github: 'https://github.com/DavidAucancela/whatsapp-ai-agent',
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
      desc: { es: 'Herramienta de datos abiertos para el municipio de Quito: visualización interactiva de fundaciones con mapas Leaflet, filtros dinámicos y estadísticas de impacto social.',
              en: 'Open-data tool for the city of Quito: interactive foundation visualization with Leaflet maps, dynamic filters and social-impact statistics.' },
      tags:      ['JavaScript', 'Leaflet', 'Charts.js', 'Datos Abiertos'],
      icon:      '🗺️',
      highlights: { es: [
        'Mapas interactivos Leaflet con markers por tipo de fundación',
        'Filtros dinámicos que actualizan mapa y gráficos simultáneamente',
        'Static site — cero dependencias npm, compatible con cualquier hosting',
      ], en: [
        'Interactive Leaflet maps with markers by foundation type',
        'Dynamic filters that update the map and the charts simultaneously',
        'Static site — zero npm dependencies, compatible with any hosting',
      ] },
      metricas: [
        { label: { es: 'Fundaciones', en: 'Foundations' }, value: '30+' },
        { label: { es: 'Deps npm', en: 'npm deps' }, value: '0' },
        { label: { es: 'Deploy', en: 'Deploy' }, value: { es: 'Static', en: 'Static' } },
      ],
      github: 'https://github.com/DavidAucancela/Proyect_OpenLab',
    },
    {
      date:      'Sep 2025',
      title:     'Mare Vitae',
      role:      'Desarrollador Full Stack · Cliente',
      org:       'Cliente del sector salud · Remoto',
      slug:      'marevitae',
      completed: true,
      type:      'project',
      typeLabel: 'Cliente',
      desc: { es: 'Plataforma LMS para educación médica con transcripción automática de video mediante Whisper y gestión de contenido multirole (admin / instructor / alumno).',
              en: 'LMS platform for medical education with automatic video transcription via Whisper and multi-role content management (admin / instructor / student).' },
      tags:      ['NestJS', 'Next.js', 'Supabase', 'Whisper', 'TypeScript'],
      icon:      '🩺',
      highlights: { es: [
        'OpenAI Whisper transcribe clases en video — subtítulos y texto buscable',
        'Backend NestJS con módulos de cursos, evaluaciones y progreso',
        'Frontend Next.js con SSR; en producción con dominio propio',
      ], en: [
        'OpenAI Whisper transcribes video lessons — subtitles and searchable text',
        'NestJS backend with course, assessment and progress modules',
        'Next.js frontend with SSR; in production on its own domain',
      ] },
      metricas: [
        { label: { es: 'Transcripción', en: 'Transcription' }, value: 'Whisper AI' },
        { label: { es: 'Roles', en: 'Roles' }, value: '3' },
        { label: { es: 'Estado', en: 'Status' }, value: { es: 'Producción', en: 'Production' } },
      ],
      github: 'https://github.com/DavidAucancela/MareVitae',
      demo:   'https://www.marevitaeint.com/',
    },
    {
      date:      'Ene 2025 — Feb 2025',
      title:     'SecuraBank',
      role:      'Desarrollador Full Stack · Personal',
      org:       'Proyecto personal · Remoto',
      slug:      'securabank',
      completed: true,
      type:      'project',
      typeLabel: 'Personal',
      desc: { es: 'Sistema de transacciones bancarias que implementa el OWASP Top 10. JWT (access 15 min + refresh 7d), bcrypt factor 12, Helmet.js, CSRF tokens y auditoría inmutable de operaciones.',
              en: 'Banking transaction system implementing the OWASP Top 10. JWT (15 min access + 7-day refresh), bcrypt factor 12, Helmet.js, CSRF tokens and an immutable operations audit log.' },
      tags:      ['Node.js', 'Express', 'JWT', 'bcrypt', 'OWASP', 'PostgreSQL'],
      icon:      '🔒',
      highlights: { es: [
        '6 categorías del OWASP Top 10 implementadas desde el diseño inicial',
        'JWT access 15min + refresh 7d con rotación automática y bcrypt factor 12',
        'Auditoría inmutable: cada transacción registrada con timestamp, IP y usuario',
      ], en: [
        '6 OWASP Top 10 categories implemented from the initial design',
        'JWT 15min access + 7-day refresh with automatic rotation and bcrypt factor 12',
        'Immutable audit log: every transaction recorded with timestamp, IP and user',
      ] },
      metricas: [
        { label: { es: 'OWASP mitigados', en: 'OWASP mitigated' }, value: '6/10' },
        { label: { es: 'Capas seguridad', en: 'Security layers' }, value: '5' },
        { label: { es: 'Auditoría', en: 'Audit coverage' }, value: '100%' },
      ],
      github: 'https://github.com/DavidAucancela/SecuraBank',
    },
    {
      date:      'May 2024',
      title:     'Introduction to Cybersecurity — Cisco',
      role:      'Certificación · Cisco Networking Academy',
      org:       'Cisco Networking Academy',
      completed: true,
      type:      'cert',
      typeLabel: 'Certificación',
      desc: { es: 'Certificación oficial de Cisco sobre fundamentos de ciberseguridad: tipos de amenazas, vectores de ataque, principios de defensa de redes y respuesta a incidentes.',
              en: 'Official Cisco certification on cybersecurity fundamentals: threat types, attack vectors, network defense principles and incident response.' },
      tags:      ['Cisco', 'Fundamentos', 'Threat Analysis', 'Network Security'],
      icon:      '🏅',
      highlights: { es: [
        'Amenazas y vectores de ataque: malware, phishing, DoS/DDoS, MITM',
        'Defensa de redes: firewalls, IDS/IPS, VPN, cifrado',
        'Respuesta a incidentes y gestión de riesgos — certificado Cisco NetAcad',
      ], en: [
        'Threats and attack vectors: malware, phishing, DoS/DDoS, MITM',
        'Network defense: firewalls, IDS/IPS, VPN, encryption',
        'Incident response and risk management — Cisco NetAcad certified',
      ] },
      metricas: [
        { label: { es: 'Emisor', en: 'Issuer' }, value: 'Cisco' },
        { label: { es: 'Año', en: 'Year' }, value: '2024' },
        { label: { es: 'Estado', en: 'Status' }, value: { es: 'Obtenida', en: 'Earned' } },
      ],
    }
  ];

  /* ════════════════════════════════════════════════════════════
     RENDERIZADORES
  ════════════════════════════════════════════════════════════ */

  /* ─── ABOUT ──────────────────────────────────────────────── */
  function renderAbout(mode) {
    const data = ABOUT_DATA[mode] || ABOUT_DATA.dev;
    const lang = LangSwitcher.getLang();

    const headline = typeof data.headline === 'object' ? (data.headline[lang] || data.headline.es) : data.headline;
    const text1    = typeof data.text1    === 'object' ? (data.text1[lang]    || data.text1.es)    : data.text1;

    // Actualizar headline
    const headlineEl = document.getElementById('about-headline');
    if (headlineEl) _fadeSwap(headlineEl, headline);

    // Texto — con efecto decode en modo sec
    const text1El = document.getElementById('about-mode-text');
    if (text1El) {
      if (mode === 'sec') {
        _decodeText(text1El, text1);
      } else {
        _fadeSwap(text1El, text1);
      }
    }

    // Focus card
    const cardEl = document.getElementById('about-focus-card');
    if (cardEl) {
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'translateY(8px)';
      setTimeout(() => {
        cardEl.innerHTML = _buildFocusCard(data.focusCard, lang);
        cardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'translateY(0)';
      }, 200);
    }

    // Stats con animación de contador
    _animateStats(data.stats, lang);
  }

  function _buildFocusCard(card, lang) {
    const l      = lang || LangSwitcher.getLang();
    const title  = typeof card.title === 'object' ? (card.title[l] || card.title.es) : card.title;
    const desc   = typeof card.desc  === 'object' ? (card.desc[l]  || card.desc.es)  : card.desc;
    const tagsHTML = card.tags
      .map(t => `<span class="focus-card-tag">${t}</span>`)
      .join('');

    return `
      <div class="focus-card-icon" aria-hidden="true">${card.icon}</div>
      <div class="focus-card-body">
        <div class="focus-card-title">${title}</div>
        <p class="focus-card-desc">${desc}</p>
        <div class="focus-card-tags">${tagsHTML}</div>
      </div>
    `;
  }

  function _animateStats(stats, lang) {
    const l = lang || LangSwitcher.getLang();
    stats.forEach((stat, idx) => {
      const valueEl = document.getElementById(`stat-value-${idx}`);
      const labelEl = document.getElementById(`stat-label-${idx}`);
      if (!valueEl) return;

      const label = typeof stat.label === 'object' ? (stat.label[l] || stat.label.es) : stat.label;
      if (labelEl) labelEl.textContent = label;

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
    const lang = LangSwitcher.getLang();

    const summary = typeof data.summary === 'object' ? (data.summary[lang] || data.summary.es) : data.summary;

    // Actualizar el summary del stack técnico
    const summaryEl = document.getElementById('skills-mode-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <span class="skills-mode-summary-icon" aria-hidden="true">${data.icon}</span>
        <span><strong>${_getModeLabel(mode)}</strong> — ${summary}</span>
      `;
    }

    // Obtener el contenedor de categorías
    const gridEl = document.getElementById('skills-grid');
    if (!gridEl) return;

    // Limpiar y reconstruir categorías como acordeón
    gridEl.innerHTML = '';
    data.categories.forEach((cat) => {
      const catTitle = typeof cat.title === 'object' ? (cat.title[lang] || cat.title.es) : cat.title;

      const catWrap = document.createElement('div');
      catWrap.className = 'skill-category-wrap';

      const header = document.createElement('div');
      header.className = 'skill-category-header';
      header.innerHTML = `
        <h3 class="skill-category-title">${catTitle}</h3>
        <span class="skill-count-badge">${cat.skills.length}</span>
      `;

      const pillsWrap = document.createElement('div');
      pillsWrap.className = 'skill-pills-wrap';

      cat.skills.forEach(skill => {
        const pill = document.createElement('span');
        pill.className = 'skill-pill';
        pill.innerHTML = _buildPillIcon(skill) + `<span>${skill.name}</span>`;
        pillsWrap.appendChild(pill);
      });

      catWrap.appendChild(header);
      catWrap.appendChild(pillsWrap);
      gridEl.appendChild(catWrap);
    });

    _refreshObservers();
  }

  function _buildPillIcon(skill) {
    if (skill.type === 'devicon') {
      const inv = skill.invertDark ? ' skill-icon--invert' : '';
      return `<i class="${skill.icon}${inv}" aria-hidden="true"></i>`;
    }
    if (skill.type === 'svg') {
      return `<span class="skill-pill-svg" aria-hidden="true">${skill.icon}</span>`;
    }
    // emoji
    return `<span class="skill-pill-emoji" aria-hidden="true">${skill.icon}</span>`;
  }

  function _getModeLabel(mode) {
    return { dev: 'Software Engineering', ia: 'IA & ML', sec: 'Cybersecurity' }[mode] || mode;
  }

  /* ─── EXPERIENCE — Timeline horizontal ──────────────────── */

  /* typeLabel es una clave fija en español; el mapa solo traduce la etiqueta visible */
  const TYPE_LABEL_EN = {
    'Personal':         'Personal',
    'Trabajo fijo':     'Full-time',
    'Open Source':      'Open Source',
    'Cliente':          'Client',
    'Certificación':    'Certification',
    'Freelance':        'Freelance',
    'Prácticas':        'Internship',
    'Game Jam':         'Game Jam',
    'Titulación':       'Thesis',
    'Laboratorio HTB':  'HTB Lab',
    'Hackathon':        'Hackathon',
  };
  function _typeLabel(tl) {
    return LangSwitcher.getLang() === 'en' ? (TYPE_LABEL_EN[tl] || tl) : tl;
  }

  /* date es texto libre en español ("Jul 2026 — Presente", "2024 — 2026"); se
     traduce por regex en vez de duplicar el dato — sin tocar EXPERIENCE_DATA */
  const MONTH_ABBR_EN = {
    Ene: 'Jan', Feb: 'Feb', Mar: 'Mar', Abr: 'Apr', May: 'May', Jun: 'Jun',
    Jul: 'Jul', Ago: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dic: 'Dec',
  };
  function _localizeExpDate(date) {
    if (LangSwitcher.getLang() !== 'en' || !date) return date;
    return date
      .replace(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\b/g, m => MONTH_ABBR_EN[m])
      .replace(/Presente/g, 'Present');
  }

  /* Resuelve date/typeLabel/desc/highlights/metricas al idioma activo.
     title/role/org quedan en español: el drawer solo muestra el texto antes
     del " — " del title (ver trajectory.js _buildItem) y role/org no se renderizan. */
  function _localizedExperience() {
    return EXPERIENCE_DATA
      .filter(e => e.completed !== false)
      .map(e => ({
        ...e,
        date:      _localizeExpDate(e.date),
        typeLabel: _typeLabel(e.typeLabel),
        desc:      LangSwitcher.L(e.desc),
        highlights: (LangSwitcher.L(e.highlights) || []).map(h => LangSwitcher.L(h)),
        metricas:  (e.metricas || []).map(m => ({
          label: LangSwitcher.L(m.label),
          value: LangSwitcher.L(m.value),
        })),
      }));
  }

  function renderExperience(mode) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.dataset.mode = mode;
    _buildTimeline(container);
  }

  function _buildTimeline(container) {
    Trajectory.render(container, _localizedExperience());
  }

  /* ─── CONTACT ────────────────────────────────────────────── */
  function renderContact(mode) {
    // Actualizar el texto de disponibilidad según el modo
    const availEl = document.getElementById('contact-availability-text');
    if (availEl) {
      const key = `contact.avail.${mode}`;
      _fadeSwap(availEl, LangSwitcher.t(key) || LangSwitcher.t('contact.avail.dev'));
    }

    // Actualizar botón de copiar email (sólo si existe)
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
      copyBtn.textContent = LangSwitcher.t('contact.copy');
      copyBtn.onclick = () => {
        navigator.clipboard.writeText('jonathan_jd@outlook.com').then(() => {
          copyBtn.textContent = LangSwitcher.t('contact.copied');
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = LangSwitcher.t('contact.copy');
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
   * Usa _decodeAnimId para cancelar animaciones previas al cambiar de modo.
   */
  function _decodeText(el, finalText) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      _fadeSwap(el, finalText);
      return;
    }

    const animId  = ++_decodeAnimId;
    const chars   = '!@#$%^&*<>[]{}|\\/01アイウエオカキ';
    const steps   = 2;
    const delay   = 12;
    const stepMs  = 40;

    // Cada índice escribe solo su propia posición — evita que el orden real
    // de ejecución de los setTimeout (no garantizado entre espacios y letras
    // con distinto offset) corrompa el string compartido.
    const display = finalText.split('');
    function render() {
      if (animId !== _decodeAnimId) return;
      el.textContent = display.join('');
    }

    el.style.opacity = '0';
    setTimeout(() => {
      if (animId !== _decodeAnimId) return;
      el.style.opacity = '1';

      finalText.split('').forEach((char, i) => {
        if (char === ' ' || char === '\n') return; // ya está correcto en `display`, nada que animar

        for (let s = 0; s < steps; s++) {
          setTimeout(() => {
            if (animId !== _decodeAnimId) return;
            display[i] = chars[Math.floor(Math.random() * chars.length)];
            render();
          }, i * delay + s * stepMs);
        }

        setTimeout(() => {
          if (animId !== _decodeAnimId) return;
          display[i] = char;
          render();
        }, i * delay + steps * stepMs);
      });
    }, 150);
  }

  /* ════════════════════════════════════════════════════════════
     INTERSECTION OBSERVER (re-registrar tras renderizado dinámico)
  ════════════════════════════════════════════════════════════ */
  let _decodeAnimId   = 0;
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
  let _currentMode = localStorage.getItem('portfolio-mode') || 'dev';

  window.addEventListener('portfolio:modeChange', (e) => {
    _currentMode = e.detail.mode;
    render(_currentMode);
  });

  /* ─── Re-renderizar al cambiar idioma ───────────────────── */
  window.addEventListener('portfolio:langChange', () => {
    render(_currentMode);
  });

  /* syncTrayectoria lo gestiona trajectory.js (Trajectory.init) */

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
