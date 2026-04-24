/**
 * ia-assistant.js
 * Panel de consultas IA — solo visible en modo .ia
 * Motor NLP client-side con base de conocimiento completa del portfolio
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

// ── KNOWLEDGE BASE: PERSONAL ─────────────────────────────────────────────────

const KB_PERSONAL = {
  name: 'Jonathan Aucancela',
  role: 'Ingeniero de Software',
  university: 'ESPOCH — Escuela Superior Politécnica de Chimborazo',
  location: 'Quito, Ecuador',
  email: 'jonathan_jd@outlook.com',
  github: 'github.com/DavidAucancela',
  linkedin: 'linkedin.com/in/jonathan-david-aucancela/',
  bio: 'Ingeniero de Software fullstack graduado de la ESPOCH. No me ato a una herramienta, me ato al problema. Trabajo con Django, Angular, Vue, React, Node.js, ASP.NET Core y PostgreSQL. Integro IA en mis proyectos (OpenAI, Claude API, RAG, embeddings) y tengo interés creciente en ciberseguridad. He desarrollado sistemas para clientes reales, proyectos de titulación y trabajo freelance.',
  focus: ['Full Stack Development', 'DevOps', 'Integración IA', 'Seguridad Informática'],
};

// ── KNOWLEDGE BASE: PROYECTOS ────────────────────────────────────────────────

const KB_PROJECTS = [
  {
    id: 'ubapp',
    keywords: ['ubapp', 'universal box', 'envios', 'envíos', 'titulacion', 'titulación',
               'paquetes', 'busqueda semantica', 'búsqueda semántica', 'almacenamiento envios'],
    title: 'UBApp — Universal Box',
    role: 'Desarrollador Full Stack · Titulación',
    period: 'Feb 2025 — Ene 2026',
    tipo: 'Proyecto de Titulación',
    respuesta: `**UBApp** es el proyecto de titulación de Jonathan: sistema fullstack de gestión de envíos con **búsqueda semántica por IA**. La empresa operaba con Excel para +5.000 envíos y tardaba hasta 4 minutos en localizar un paquete. La solución redujo ese tiempo a menos de 20 segundos (mejora del 90%). Stack: Django REST + Angular + PostgreSQL/pgvector + OpenAI Embeddings + Docker (Nginx, Gunicorn, Redis).`,
    tags: ['Django', 'Angular', 'PostgreSQL + pgvector', 'OpenAI API', 'Docker', 'Redis', 'Leaflet'],
    metricas: ['< 20s búsqueda', '90% mejora eficiencia', '7 módulos funcionales', '4 servicios Docker'],
    github: 'github.com/DavidAucancela/UBAppV2',
    demo: 'frontend-angular-production.up.railway.app/login',
  },
  {
    id: 'ideancestral',
    keywords: ['ideancestral', 'artesanias', 'artesanías', 'artesanos', 'catalogo digital',
               'catálogo digital', 'multiidioma', 'whatsapp carrito', 'artesanal'],
    title: 'Ideancestral',
    role: 'Desarrollador Full Stack · Freelance',
    period: 'Dic 2025 — Feb 2026',
    tipo: 'Freelance',
    respuesta: `**Ideancestral** es un catálogo digital multiidioma para artesanos ecuatorianos, desarrollado como freelance. **Vue.js 3** con Composition API + Pinia en el frontend; **Node.js/Express + PostgreSQL** en el backend. Soporta 3 idiomas (ES/EN/PT), modo oscuro/claro, carrito de compras con integración WhatsApp y panel admin CRUD completo.`,
    tags: ['Vue.js 3', 'Composition API', 'Pinia', 'Node.js', 'Express', 'PostgreSQL', 'JWT', 'i18n'],
    metricas: ['3 idiomas (ES/EN/PT)', '+100 productos', '2 plataformas deploy', '4 capas seguridad'],
    github: 'github.com/DavidAucancela/IDEANCESTRAL',
    demo: 'ideancestral-production.up.railway.app',
  },
  {
    id: 'anaos',
    keywords: ['anaos', 'ana os', 'saas', 'cooperativas', 'suscripcion', 'suscripción',
               'aspnet', 'asp.net', 'asp net', 'csharp', 'c#', 'multi-tenant', 'multitenant',
               'cooperativa', 'agencias', 'planes'],
    title: 'AnaOS — Plataforma SaaS de Cooperativas',
    role: 'Desarrollador Full Stack · Cliente',
    period: 'Ago 2025 — Nov 2025',
    tipo: 'Proyecto para cliente',
    respuesta: `**AnaOS** es una plataforma **SaaS multi-tenant** para gestión de cooperativas financieras. Jerarquía completa: Cooperativa → Agencias → Usuarios → Cuentas. Tres planes de suscripción (Basic, Professional, Enterprise). Stack: **ASP.NET Core + C# + Entity Framework** en backend, **React + TypeScript** en frontend, SQL Server como BD, Dockerfiles independientes desplegados en Railway.`,
    tags: ['ASP.NET Core', 'C#', 'Entity Framework', 'React', 'TypeScript', 'SQL Server', 'JWT', 'Docker', 'Railway'],
    metricas: ['7 entidades dominio', '3 planes suscripción', '100% TypeScript', 'Multi-tenant'],
    github: 'github.com/DavidAucancela/AnaOS',
    demo: 'frontend-production-cc73.up.railway.app',
  },
  {
    id: 'llm-observatory',
    keywords: ['llm observatory', 'observatory', 'observabilidad', 'claude api', 'anthropic',
               'tokens', 'costos ia', 'sdk wrapper', 'socket.io', 'websocket', 'monitoreo api',
               'llm', 'dashboard claude', 'metricas claude'],
    title: 'LLM Observatory',
    role: 'Desarrollador Full Stack · Open Source',
    period: 'Ene 2026 — Mar 2026',
    tipo: 'Open Source',
    respuesta: `**LLM Observatory** es una herramienta open-source para monitorear el uso de la API de Claude en tiempo real. SDK wrapper drop-in para @anthropic-ai/sdk que intercepta métricas (tokens, costo, latencia) con **cero overhead**. Dashboard React + Recharts con gráficos, alertas de presupuesto y exportación CSV. Backend Express + **Socket.io** emite las métricas en vivo. Desplegable con Docker Compose o Railway.`,
    tags: ['React 18', 'Vite', 'Tailwind', 'Recharts', 'Node.js', 'Express', 'Socket.io', 'PostgreSQL', 'Docker', 'Claude API'],
    metricas: ['0ms overhead latencia', '9 endpoints API', '4 modelos con pricing', '500+ registros demo'],
    github: 'github.com/DavidAucancela/llm-observatory',
    demo: 'llm-web-production.up.railway.app/settings',
  },
  {
    id: 'securabank',
    keywords: ['securabank', 'seguridad bancaria', 'banco', 'owasp', 'bancario', 'transacciones bancarias'],
    title: 'SecuraBank',
    role: 'Desarrollador Backend · Educativo',
    period: 'Ene 2025 — Feb 2025',
    tipo: 'Proyecto educativo',
    respuesta: `**SecuraBank** es un sistema bancario demostrativo construido con Node.js que implementa **security-by-design** desde el primer commit. Mitiga 6 categorías del OWASP Top 10: Helmet.js, JWT (access 15min + refresh 7 días con rotación), bcrypt salt 12, queries parametrizadas al 100%, CSRF tokens y rate limiting. Auditoría inmutable de cada transacción con timestamp e IP.`,
    tags: ['Node.js', 'Express', 'JWT', 'bcrypt', 'Helmet.js', 'PostgreSQL', 'OWASP Top 10'],
    metricas: ['6/10 OWASP mitigados', '5 capas seguridad', '100% auditoría', 'Threat modeling previo'],
    github: 'github.com/DavidAucancela/SecuraBank',
  },
  {
    id: 'equity',
    keywords: ['equity', 'etl', 'pipeline datos', 'gestor datos', 'limpieza datos', 'json a bd', 'dry run'],
    title: 'Equity — Gestor de Datos ETL',
    role: 'Desarrollador Backend · Cliente',
    period: 'Sep 2025 — Nov 2025',
    tipo: 'Proyecto para cliente',
    respuesta: `**Equity** es un pipeline ETL automatizado con Python/Django: Extract (lectura JSON) → Transform (validar + limpiar) → Load (PostgreSQL con transacciones atómicas). Tiene modo **dry-run** para validar sin modificar la BD, logs persistentes de auditoría por nivel (INFO/WARNING/ERROR) y Django Admin para monitoreo en tiempo real. Reemplazó carga manual de datos propensa a errores.`,
    tags: ['Python', 'Django', 'PostgreSQL', 'ETL', 'CRISP-DM', 'Django Admin'],
    metricas: ['100% automatización', 'Schema completo', 'Modo dry-run', 'Logs inmutables'],
    github: 'github.com/DavidAucancela/App-de-prueba-Equity',
  },
  {
    id: 'conquito',
    keywords: ['conquito', 'con quito', 'fundaciones', 'quito mapa', 'datos abiertos',
               'municipio', 'organizaciones sociales', 'visualizacion fundaciones'],
    title: 'Fundaciones — ConQuito',
    role: 'Desarrollador · Hackathon',
    period: 'Jul 2025 — Oct 2025',
    tipo: 'Hackathon / Municipio de Quito',
    respuesta: `**ConQuito — Fundaciones** es una app de datos abiertos para visualizar el ecosistema de fundaciones de Quito, entregada al municipio. JavaScript vanilla + **Leaflet.js** para el mapa interactivo con markers SVG personalizados por tipo de fundación + **Charts.js** para estadísticas. Filtros que actualizan mapa y gráficos simultáneamente. Datos en JSON actualizable sin tocar código.`,
    tags: ['JavaScript Vanilla', 'Leaflet.js', 'Chart.js', 'Datos Abiertos', 'CSS Grid'],
    metricas: ['30+ fundaciones mapeadas', '0 dependencias npm', 'Static site', 'Entregado a ConQuito'],
    github: 'github.com/DavidAucancela/Proyect_OpenLab',
  },
  {
    id: 'mapcriminals',
    keywords: ['mapcriminals', 'map criminals', 'criminales', 'fbi api', 'buscados',
               'crimen mundial', 'google trends criminales', 'buscados fbi'],
    title: 'MapCriminals — Más Buscados del Mundo',
    role: 'Desarrollador Full Stack · Personal',
    period: 'Oct 2025 — Dic 2025',
    tipo: 'Proyecto personal',
    respuesta: `**MapCriminals** es un mapa interactivo de criminales más buscados a nivel mundial. Backend Node.js actúa como proxy inteligente: consume la **FBI API** (paginada, caché 1h) y **Google Trends** (caché 6h), normalizando todo en un esquema único. Frontend JS vanilla + Leaflet con panel por país, filtros avanzados y soporte bilingüe ES/EN. Desplegado en Railway.`,
    tags: ['Node.js', 'Express', 'Leaflet.js', 'JavaScript Vanilla', 'FBI API', 'Google Trends', 'Railway'],
    metricas: ['2 fuentes de datos', 'Caché FBI 1h', 'Caché Trends 6h', 'Bilingüe ES/EN'],
    github: 'github.com/DavidAucancela/MapCriminalsCode',
    demo: 'mapcriminalscode-production.up.railway.app',
  },
  {
    id: 'notes-app',
    keywords: ['notes app', 'notas', 'notes', 'notesapp', 'nota', 'apuntes', 'notes django react'],
    title: 'Notes App',
    role: 'Desarrollador Full Stack · Personal',
    period: '2026',
    tipo: 'Proyecto personal',
    respuesta: `**Notes App** es una aplicación fullstack de notas con autenticación JWT. Frontend: **React 18 + Vite + Axios**. Backend: **Django 4.2 + Django REST Framework + simplejwt** para auth stateless. Base de datos PostgreSQL. CRUD completo de notas con rutas protegidas por token. Desplegado en Railway.`,
    tags: ['React 18', 'Vite', 'Axios', 'Django 4.2', 'DRF', 'simplejwt', 'PostgreSQL', 'Railway'],
    metricas: ['JWT auth', 'CRUD completo', 'Deploy Railway'],
    github: 'github.com/DavidAucancela',
  },
  {
    id: 'artecuador',
    keywords: ['artecuador', 'arte ecuador', 'arte', 'artesanias html', 'catalogo html vanilla'],
    title: 'ArtEcuador — Catálogo de Artesanías',
    role: 'Desarrollador Frontend · Personal',
    period: '2025',
    tipo: 'Proyecto personal',
    respuesta: `**ArtEcuador** es un catálogo de artesanías ecuatorianas construido con **HTML5, CSS3 y JavaScript vanilla**, sin framework. Desplegado en Railway con **Nginx + Docker** como servidor de archivos estáticos. Diseño responsive mobile-first sin dependencias externas de JS.`,
    tags: ['HTML5', 'CSS3', 'JavaScript Vanilla', 'Docker', 'Nginx', 'Railway'],
    metricas: ['0 dependencias JS', 'Docker + Nginx', 'Static site'],
  },
];

// ── KNOWLEDGE BASE: TECNOLOGÍAS ──────────────────────────────────────────────

const KB_TECH = [
  {
    keywords: ['angular', 'angularjs'],
    name: 'Angular',
    nivel: 'Avanzado',
    respuesta: `Jonathan trabajó con **Angular** como frontend principal en **UBApp**: módulos lazy-loaded, route guards, servicios inyectados, Leaflet para mapas en tiempo real, carga masiva Excel (xlsx) y generación de PDFs (jsPDF). Nivel 3/5 en skills — framework del proyecto de titulación.`,
    proyectos: ['UBApp — Universal Box'],
    tags: ['Angular', 'TypeScript', 'Lazy Loading', 'Guards', 'Leaflet', 'jsPDF', 'xlsx'],
  },
  {
    keywords: ['vue', 'vue.js', 'vuejs', 'vue3', 'pinia', 'vue-i18n'],
    name: 'Vue.js',
    nivel: 'Avanzado',
    respuesta: `Jonathan usó **Vue.js 3** (Composition API + Pinia) en **Ideancestral**: composables reutilizables para el catálogo, Pinia stores para carrito/usuario/idioma activo, vue-i18n con JSON de traducción por idioma (ES/EN/PT) y variables CSS para theming dinámico. Nivel 4/5 en skills.`,
    proyectos: ['Ideancestral'],
    tags: ['Vue.js 3', 'Composition API', 'Pinia', 'vue-i18n', 'Axios', 'Vite'],
  },
  {
    keywords: ['react', 'react.js', 'reactjs', 'react18', 'jsx'],
    name: 'React',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **React** en tres proyectos: **AnaOS** (rutas protegidas por rol, páginas de pago independientes por plan, TypeScript estricto), **LLM Observatory** (dashboard en tiempo real con Recharts y Socket.io) y **Notes App** (React 18 + Vite). Nivel 4/5 en skills.`,
    proyectos: ['AnaOS', 'LLM Observatory', 'Notes App'],
    tags: ['React 18', 'TypeScript', 'Vite', 'React Router', 'Recharts', 'Axios'],
  },
  {
    keywords: ['next', 'next.js', 'nextjs', 'next14'],
    name: 'Next.js',
    nivel: 'Intermedio',
    respuesta: `Jonathan tiene experiencia con **Next.js** (App Router, Server/Client Components, rutas dinámicas, generación estática). Lo ha aplicado en proyectos de exploración. Nivel 2/5 en skills — lo conoce pero no es su framework principal.`,
    proyectos: [],
    tags: ['Next.js', 'App Router', 'TypeScript', 'SSR', 'SSG'],
  },
  {
    keywords: ['svelte', 'sveltekit'],
    name: 'Svelte',
    nivel: 'Intermedio',
    respuesta: `Jonathan conoce **Svelte** como framework reactivo sin Virtual DOM. Ha explorado su modelo de reactividad basado en compilación. Nivel 3/5 en skills — parte de su stack de frontend alternativo.`,
    proyectos: [],
    tags: ['Svelte', 'JavaScript', 'Reactivity', 'Compilado'],
  },
  {
    keywords: ['django', 'python web', 'drf', 'django rest', 'django rest framework'],
    name: 'Django / DRF',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Django** como backend principal en múltiples proyectos: en **UBApp** integró pgvector + OpenAI para búsqueda semántica; en **Equity** construyó un pipeline ETL con management commands y transacciones atómicas; en **Notes App** usó DRF + simplejwt. Nivel 4/5 en skills.`,
    proyectos: ['UBApp', 'Equity', 'Notes App'],
    tags: ['Django', 'Django REST Framework', 'Python', 'simplejwt', 'pgvector', 'Management Commands'],
  },
  {
    keywords: ['aspnet', 'asp.net', 'asp net', 'dotnet', '.net', 'csharp', 'c#', 'entity framework', 'ef core'],
    name: 'ASP.NET Core / C#',
    nivel: 'Intermedio-Avanzado',
    respuesta: `Jonathan usó **ASP.NET Core + C#** en **AnaOS** como backend del SaaS multi-tenant. Implementó Entity Framework Code-First con migraciones versionadas, repositorios genéricos, servicios por entidad e inversión de dependencias. AccesoController maneja login, signup, verificación de email y reset de contraseña con tokens de un solo uso.`,
    proyectos: ['AnaOS — Plataforma SaaS de Cooperativas'],
    tags: ['ASP.NET Core', 'C#', 'Entity Framework', 'SQL Server', 'JWT', 'Docker', 'Railway'],
  },
  {
    keywords: ['fastapi', 'fast api'],
    name: 'FastAPI',
    nivel: 'Intermedio',
    respuesta: `Jonathan tiene experiencia con **FastAPI** para APIs asíncronas en Python, especialmente para servicios de IA que requieren alta velocidad y documentación automática OpenAPI/Swagger. Nivel 3/5 en skills.`,
    proyectos: [],
    tags: ['FastAPI', 'Python', 'Async', 'OpenAPI', 'Pydantic'],
  },
  {
    keywords: ['nestjs', 'nest.js', 'nest js'],
    name: 'NestJS',
    nivel: 'Intermedio',
    respuesta: `Jonathan conoce **NestJS** como framework backend Node.js con arquitectura modular y decoradores. Ha trabajado con su sistema de inyección de dependencias y módulos. Nivel 3/5 en skills.`,
    proyectos: [],
    tags: ['NestJS', 'TypeScript', 'Node.js', 'Decoradores', 'DI'],
  },
  {
    keywords: ['node', 'node.js', 'nodejs', 'express', 'backend javascript', 'backend js'],
    name: 'Node.js / Express',
    nivel: 'Avanzado',
    respuesta: `Jonathan tiene sólida experiencia en **Node.js/Express**: API REST completa en **Ideancestral**, security-by-design en **SecuraBank** (Helmet.js, JWT, CSRF, rate limiting), proxy con caché por niveles en **MapCriminals**, y Express + Socket.io para métricas en tiempo real en **LLM Observatory**. Nivel 3/5 en skills.`,
    proyectos: ['Ideancestral', 'SecuraBank', 'LLM Observatory', 'MapCriminals', 'Notes App'],
    tags: ['Node.js', 'Express', 'Socket.io', 'JWT', 'Helmet.js', 'Zod', 'Middleware'],
  },
  {
    keywords: ['openai', 'open ai', 'gpt', 'gpt4', 'gpt-4', 'modelos lenguaje', 'language model', 'openai api'],
    name: 'OpenAI API',
    nivel: 'Avanzado',
    respuesta: `Jonathan integró la **API de OpenAI** en dos proyectos: **UBApp** (embeddings text-embedding-ada-002 + pgvector para búsqueda semántica, redujo 4 min → 20 seg) y **AnaOS** (patrón RAG enriqueciendo el contexto con datos financieros reales antes de llamar al modelo). Nivel 4/5 en skills de IA.`,
    proyectos: ['UBApp — Universal Box', 'AnaOS'],
    tags: ['OpenAI API', 'text-embedding-ada-002', 'pgvector', 'RAG', 'Embeddings', 'Prompt Engineering'],
  },
  {
    keywords: ['claude', 'claude api', 'anthropic', 'claude sonnet', 'claude opus', 'claude haiku', 'anthropic sdk'],
    name: 'Claude API (Anthropic)',
    nivel: 'Avanzado',
    respuesta: `Jonathan construyó **LLM Observatory**, herramienta open-source específica para la **API de Claude**. Creó un SDK wrapper drop-in para @anthropic-ai/sdk que intercepta métricas (tokens, costo, latencia) sin overhead. Implementó pricing real para Opus, Sonnet y Haiku, y soporte para streaming de respuestas. Nivel 3/5 en skills.`,
    proyectos: ['LLM Observatory'],
    tags: ['Claude API', 'Anthropic SDK', 'SDK Wrapper', 'Streaming', 'Tokens', 'Costo por request'],
  },
  {
    keywords: ['rag', 'retrieval augmented', 'retrieval-augmented', 'generacion aumentada', 'generación aumentada'],
    name: 'RAG (Retrieval-Augmented Generation)',
    nivel: 'Avanzado',
    respuesta: `Jonathan aplicó el patrón **RAG** en **AnaOS**, enriqueciendo el contexto del modelo con datos financieros reales de cooperativas antes de llamar a la IA. La base vectorial del RAG en **UBApp** usa embeddings de OpenAI + pgvector para búsqueda semántica por similitud coseno.`,
    proyectos: ['AnaOS', 'UBApp'],
    tags: ['RAG', 'OpenAI API', 'pgvector', 'Embeddings', 'Similitud Coseno', 'Context Enrichment'],
  },
  {
    keywords: ['postgresql', 'postgres', 'base de datos', 'database', 'sql', 'pgvector', 'bd relacional'],
    name: 'PostgreSQL',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **PostgreSQL** como base de datos principal en casi todos sus proyectos. Destaca el uso de **pgvector** para búsqueda semántica vectorial (UBApp), modelado relacional complejo (AnaOS, Ideancestral), pipelines ETL (Equity) y autenticación (SecuraBank, Notes App). Nivel 5/5 en skills — la BD que más domina.`,
    proyectos: ['UBApp', 'Ideancestral', 'AnaOS', 'Equity', 'SecuraBank', 'Notes App'],
    tags: ['PostgreSQL', 'pgvector', 'SQL', 'ORM', 'Migraciones', 'Índices'],
  },
  {
    keywords: ['sql server', 'sqlserver', 'mssql', 'microsoft sql'],
    name: 'Microsoft SQL Server',
    nivel: 'Intermedio',
    respuesta: `Jonathan usó **Microsoft SQL Server** en **AnaOS** gestionado como plugin en Railway con inyección automática de DATABASE_URL. Acceso mediante Entity Framework Code-First con migraciones. Nivel 3/5 en skills.`,
    proyectos: ['AnaOS'],
    tags: ['SQL Server', 'Entity Framework', 'Code-First', 'Railway'],
  },
  {
    keywords: ['mysql'],
    name: 'MySQL',
    nivel: 'Avanzado',
    respuesta: `Jonathan maneja **MySQL** con nivel 4/5 en su stack de bases de datos relacionales, junto a PostgreSQL. Experiencia en consultas optimizadas y modelado de datos.`,
    proyectos: [],
    tags: ['MySQL', 'SQL', 'Base de datos relacional'],
  },
  {
    keywords: ['redis', 'cache', 'caché', 'cola tareas', 'sesiones cache'],
    name: 'Redis',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Redis** en **UBApp** para caché de sesiones JWT y cola de tareas asíncronas. En **MapCriminals** aplicó caché en memoria por niveles (FBI API 1h, Google Trends 6h), con el mismo patrón que Redis. Nivel 4/5 en skills.`,
    proyectos: ['UBApp', 'MapCriminals'],
    tags: ['Redis', 'Caché', 'Colas', 'Sesiones JWT'],
  },
  {
    keywords: ['docker', 'contenedor', 'container', 'docker compose', 'nginx', 'gunicorn', 'contenedores'],
    name: 'Docker',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Docker** en todos sus proyectos de producción. En **UBApp**: Docker Compose con 4 servicios (Nginx, Gunicorn, PostgreSQL+pgvector, Redis). En **AnaOS** y **LLM Observatory**: Dockerfiles multi-stage para backend y frontend independientes. En **ArtEcuador**: Nginx + Docker para static site. Nivel 4/5 en skills.`,
    proyectos: ['UBApp', 'AnaOS', 'LLM Observatory', 'ArtEcuador'],
    tags: ['Docker', 'docker-compose', 'Nginx', 'Gunicorn', 'Multi-stage builds', 'Volumes'],
  },
  {
    keywords: ['railway', 'vercel', 'render', 'deploy', 'despliegue', 'hosting', 'produccion', 'producción', 'ci cd', 'cicd'],
    name: 'Deploy / CI/CD',
    nivel: 'Avanzado',
    respuesta: `Jonathan despliega en **Railway** (AnaOS, LLM Observatory, MapCriminals, Notes App, ArtEcuador), **Vercel** (Ideancestral frontend, este portfolio) y **Render** (Ideancestral backend). Todos sus proyectos tienen HTTPS automático y CI/CD desde GitHub: cada push a main dispara el deploy automáticamente.`,
    proyectos: ['Todos los proyectos'],
    tags: ['Railway', 'Vercel', 'Render', 'Docker', 'GitHub Actions', 'CI/CD'],
  },
  {
    keywords: ['seguridad', 'security', 'owasp', 'ciberseguridad', 'cybersecurity', 'pentest',
               'hacking', 'vulnerabilidades', 'iso 27001', 'helmet', 'jwt seguridad'],
    name: 'Seguridad / Ciberseguridad',
    nivel: 'Intermedio-Avanzado',
    respuesta: `Jonathan aplicó **security-by-design** en **SecuraBank** (6 categorías OWASP Top 10 mitigadas: Helmet.js, JWT, bcrypt, CSRF, rate limiting, auditoría). Realizó prácticas de **Seguridad Informática en el DETIC de la ESPOCH** (diagnóstico, herramientas de análisis, ISO 27001). Tiene **Certificación Cisco NetAcad** en ciberseguridad y está cursando el **programa IBM SkillsBuild** (Mar–May 2026).`,
    proyectos: ['SecuraBank', 'UBApp', 'Ideancestral'],
    tags: ['OWASP Top 10', 'JWT', 'bcrypt', 'Helmet.js', 'CSRF', 'Rate Limiting', 'ISO 27001', 'Cisco NetAcad'],
  },
  {
    keywords: ['typescript', 'ts', 'tipado', 'tipado estatico'],
    name: 'TypeScript',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **TypeScript en modo estricto** en sus proyectos modernos. **AnaOS**: 100% tipado frontend (React) + backend (ASP.NET Core C#). **LLM Observatory**: SDK wrapper con tipos completos para la API de Claude. **Notes App**: React + Vite con TypeScript. Prefiere TypeScript sobre JS en cualquier proyecto de escala media o mayor.`,
    proyectos: ['AnaOS', 'LLM Observatory', 'Notes App'],
    tags: ['TypeScript', 'tsconfig strict', 'React', 'Node.js', 'ASP.NET Core'],
  },
  {
    keywords: ['python', 'scripting python', 'python backend'],
    name: 'Python',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Python** principalmente con Django para backends y pipelines ETL. En **UBApp** y **Equity** aplicó Django con PostgreSQL, management commands y ORM. También lo usa para scripts de automatización, generación de embeddings con OpenAI SDK y procesamiento de datos con CRISP-DM.`,
    proyectos: ['UBApp', 'Equity'],
    tags: ['Python', 'Django', 'ORM', 'Management Commands', 'OpenAI SDK', 'CRISP-DM'],
  },
  {
    keywords: ['etl', 'pipeline datos', 'data engineering', 'ingenieria datos', 'ingeniería datos'],
    name: 'ETL / Ingeniería de Datos',
    nivel: 'Intermedio',
    respuesta: `Jonathan construyó **Equity**, pipeline ETL con Python/Django: Extract (JSON) → Transform (validar/limpiar/normalizar strings/tipos/nulos) → Load (PostgreSQL con bulk_create y transacciones atómicas). Modo dry-run para simular sin insertar. Aplica CRISP-DM en sus proyectos con datos.`,
    proyectos: ['Equity — Gestor de Datos ETL'],
    tags: ['Python', 'Django', 'PostgreSQL', 'ETL', 'CRISP-DM', 'bulk_create', 'dry-run'],
  },
  {
    keywords: ['socket.io', 'websocket', 'tiempo real', 'realtime', 'ws', 'live updates', 'eventos'],
    name: 'WebSockets / Socket.io',
    nivel: 'Avanzado',
    respuesta: `Jonathan integró **Socket.io** en **LLM Observatory**: el backend emite el evento "metric:new" cada vez que una nueva métrica se inserta en PostgreSQL, actualizando todos los dashboards conectados en tiempo real sin recargar la página. Los gráficos Recharts se actualizan automáticamente con cada nuevo request a Claude API.`,
    proyectos: ['LLM Observatory'],
    tags: ['Socket.io', 'WebSocket', 'Node.js', 'React', 'Tiempo real', 'Eventos'],
  },
  {
    keywords: ['tailwind', 'tailwindcss', 'css', 'diseño', 'responsive', 'css3', 'variables css'],
    name: 'CSS / Tailwind CSS',
    nivel: 'Avanzado',
    respuesta: `Jonathan domina **Tailwind CSS** y **CSS3** puro. En **LLM Observatory** usó Tailwind con Recharts; en **Ideancestral** y **ArtEcuador** usó CSS3 con variables CSS para theming dinámico. Este portfolio está construido con CSS vanilla puro (BEM-like) con sistema de modos (dev/ia/sec) y animaciones personalizadas sin ningún framework.`,
    proyectos: ['LLM Observatory', 'Ideancestral', 'ArtEcuador', 'Portfolio'],
    tags: ['Tailwind CSS', 'CSS3', 'Variables CSS', 'Responsive', 'Mobile-first', 'Animaciones'],
  },
  {
    keywords: ['embedding', 'embeddings', 'vectores', 'vector search', 'semantica', 'semántica', 'similitud coseno'],
    name: 'Embeddings / Búsqueda Semántica',
    nivel: 'Avanzado',
    respuesta: `Jonathan generó y gestionó **embeddings** con OpenAI (text-embedding-ada-002), almacenándolos en PostgreSQL con **pgvector** para búsqueda por similitud coseno. Implementa búsqueda tradicional (ILIKE) y semántica en paralelo. Resultado en UBApp: tiempo de búsqueda reducido de 4 minutos a menos de 20 segundos.`,
    proyectos: ['UBApp — Universal Box'],
    tags: ['Embeddings', 'pgvector', 'OpenAI', 'Similitud Coseno', 'ILIKE', 'Búsqueda paralela'],
  },
  {
    keywords: ['leaflet', 'mapas', 'maps', 'geolocalización', 'geolocalizacion', 'mapa interactivo', 'markers'],
    name: 'Leaflet.js / Mapas',
    nivel: 'Intermedio-Avanzado',
    respuesta: `Jonathan usó **Leaflet.js** en tres proyectos: **UBApp** (mapa de ubicaciones de envíos en tiempo real con markers dinámicos por estado), **ConQuito** (markers SVG personalizados por tipo de fundación con filtros geográficos) y **MapCriminals** (mapa mundial con popups de perfil criminal completo y panel lateral por país).`,
    proyectos: ['UBApp', 'ConQuito', 'MapCriminals'],
    tags: ['Leaflet.js', 'GeoJSON', 'Markers SVG', 'Popups', 'Filtros geográficos', 'Capas'],
  },
  {
    keywords: ['git', 'github', 'control versiones', 'github actions', 'versionado'],
    name: 'Git / GitHub',
    nivel: 'Avanzado',
    respuesta: `Jonathan usa **Git/GitHub** profesionalmente en todos sus proyectos con branching strategies. Todos tienen CI/CD desde GitHub: Railway, Vercel y Render detectan los pushes a main y despliegan automáticamente. Conoce GitHub Actions para pipelines avanzados.`,
    proyectos: ['Todos los proyectos'],
    tags: ['Git', 'GitHub', 'GitHub Actions', 'CI/CD', 'Branching', 'Pull Requests'],
  },
  {
    keywords: ['fullstack', 'full stack', 'full-stack', 'stack completo', 'end to end'],
    name: 'Fullstack Development',
    nivel: 'Avanzado',
    respuesta: `Jonathan es **desarrollador fullstack** con experiencia end-to-end real. Frontend: Angular, Vue.js 3, React 18, Svelte. Backend: Django, Node.js/Express, ASP.NET Core, FastAPI, NestJS. Bases de datos: PostgreSQL (★★★★★), MySQL, Redis, SQL Server. DevOps: Docker, Railway, Vercel, GitHub Actions. IA: OpenAI API, Claude API, RAG, Embeddings, pgvector.`,
    proyectos: ['UBApp', 'Ideancestral', 'AnaOS', 'LLM Observatory'],
    tags: ['Frontend', 'Backend', 'Bases de datos', 'DevOps', 'IA'],
  },
  {
    keywords: ['aws', 'amazon web services', 'google cloud', 'gcp', 'azure', 'microsoft azure', 'cloud computing'],
    name: 'Cloud Providers',
    nivel: 'Intermedio',
    respuesta: `Jonathan tiene conocimiento en los 3 principales cloud providers: **AWS** (nivel 3/5), **Google Cloud** (nivel 2/5) y **Microsoft Azure** (nivel 2/5). Para sus proyectos personales y freelance prefiere Railway, Vercel y Render por su DX y CI/CD automático. También conoce **Vercel** (nivel 3/5) para static sites y SPA.`,
    proyectos: [],
    tags: ['AWS', 'Google Cloud', 'Azure', 'Railway', 'Vercel', 'Render'],
  },
  {
    keywords: ['n8n', 'automatizacion', 'automatización', 'workflow', 'no code', 'low code'],
    name: 'n8n / Automatización',
    nivel: 'Intermedio',
    respuesta: `Jonathan conoce **n8n** para automatización de workflows sin código, integrando servicios y automatizando tareas repetitivas. Nivel 2/5 en skills — lo usa en el contexto de proyectos de IA y automatización de procesos.`,
    proyectos: [],
    tags: ['n8n', 'Automatización', 'Workflows', 'No-code', 'Integración de servicios'],
  },
  {
    keywords: ['tensorflow', 'keras', 'ml', 'machine learning', 'aprendizaje automatico',
               'aprendizaje máquina', 'inteligencia artificial', 'ia avanzada', 'modelos ml'],
    name: 'Machine Learning / IA',
    nivel: 'Intermedio',
    respuesta: `Jonathan tiene nivel intermedio en **TensorFlow** (nivel 3/5). Su experiencia más profunda en IA es aplicada: RAG, embeddings vectoriales y búsqueda semántica con APIs (OpenAI, Claude), más que entrenamiento de modelos desde cero. También usa **Cursor** (nivel 4/5) como herramienta de desarrollo asistida por IA.`,
    proyectos: ['UBApp', 'AnaOS', 'LLM Observatory'],
    tags: ['TensorFlow', 'OpenAI API', 'Claude API', 'RAG', 'Embeddings', 'Cursor'],
  },
];

// ── RESPUESTAS ESPECIALES ────────────────────────────────────────────────────

const _RESP_PERSONAL = () => `Hola, soy el asistente de **${KB_PERSONAL.name}**. Aquí va su perfil:

**${KB_PERSONAL.name}** — ${KB_PERSONAL.role} · ${KB_PERSONAL.location}
Graduado de la **${KB_PERSONAL.university}**.

${KB_PERSONAL.bio}

**Áreas de enfoque:** ${KB_PERSONAL.focus.join(' · ')}`;

const _RESP_CONTACT = () => `Puedes contactar a **Jonathan Aucancela** por estos canales:

📧 **Email:** ${KB_PERSONAL.email}
🐙 **GitHub:** ${KB_PERSONAL.github}
💼 **LinkedIn:** ${KB_PERSONAL.linkedin}
📸 **Instagram:** ${KB_PERSONAL.instagram}`;

const _RESP_LIST_PROJECTS = () => {
  const lines = KB_PROJECTS.map(p =>
    `**${p.title}** — ${p.tipo} (${p.period})`
  ).join('\n');
  return `Jonathan tiene **${KB_PROJECTS.length} proyectos** en su portfolio:\n\n${lines}\n\nPregúntame por cualquiera de ellos para ver detalles.`;
};

const _RESP_LIST_SKILLS = () =>
  `Stack tecnológico de Jonathan:\n\n` +
  `**Frontend:** Angular · Vue.js 3 · React 18 · Svelte · Next.js\n` +
  `**Backend:** Django · Node.js/Express · ASP.NET Core · FastAPI · NestJS\n` +
  `**Bases de datos:** PostgreSQL ★★★★★ · MySQL ★★★★ · Redis ★★★★ · SQL Server ★★★\n` +
  `**DevOps:** Docker ★★★★ · Railway · Vercel · GitHub Actions\n` +
  `**IA:** OpenAI API ★★★★ · Claude API ★★★ · RAG · pgvector · TensorFlow ★★★\n` +
  `**Ciberseguridad:** OWASP Top 10 · JWT · bcrypt · Helmet.js · ISO 27001`;

// ── MOTOR NLP ────────────────────────────────────────────────────────────────

function _detectIntent(norm) {
  if (_matchAny(norm, [
    'todos los proyectos', 'lista proyectos', 'que proyectos', 'cuantos proyectos',
    'que trabajos', 'que has hecho', 'que hiciste', 'mostrar proyectos', 'ver proyectos',
    'mis proyectos', 'tu portafolio', 'tu portfolio',
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

function _query(input) {
  const norm = _norm(input);
  const intent = _detectIntent(norm);

  if (intent === 'list_projects') return { type: 'special', text: _RESP_LIST_PROJECTS() };
  if (intent === 'list_skills')   return { type: 'special', text: _RESP_LIST_SKILLS() };
  if (intent === 'personal')      return { type: 'special', text: _RESP_PERSONAL() };
  if (intent === 'contact')       return { type: 'special', text: _RESP_CONTACT() };

  // Buscar proyecto
  for (const p of KB_PROJECTS) {
    if (_matchAny(norm, p.keywords)) return { type: 'project', data: p };
  }

  // Buscar tecnología
  for (const t of KB_TECH) {
    if (_matchAny(norm, t.keywords)) return { type: 'tech', data: t };
  }

  return null;
}

// ── RENDER ───────────────────────────────────────────────────────────────────

function _md(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function _levelBadge(nivel) {
  if (!nivel) return '';
  const n = nivel.toLowerCase();
  const cls = n.startsWith('avanzado') ? 'green'
            : n.startsWith('intermedio') ? 'yellow'
            : 'purple';
  return `<span class="ia-badge ia-badge--${cls}">${nivel}</span>`;
}

function _buildCard(result) {
  const card = document.createElement('div');

  if (result.type === 'special') {
    card.className = 'ia-result-card ia-result-card--plain';
    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev · Búsqueda</div>
      <div class="ia-result-plain-text">${_md(result.text)}</div>
    `;
    return card;
  }

  if (result.type === 'project') {
    const p = result.data;
    card.className = 'ia-result-card';

    const metricsHtml = p.metricas?.length
      ? `<div class="ia-result-row">${p.metricas.map(m => `<span class="ia-metric">${m}</span>`).join('')}</div>`
      : '';

    const tagsHtml = p.tags?.length
      ? `<div class="ia-result-row">${p.tags.map(t => `<span class="ia-tag-tech">${t}</span>`).join('')}</div>`
      : '';

    const linksHtml = (p.github || p.demo)
      ? `<div class="ia-result-actions">
          ${p.github ? `<a href="https://${p.github}" target="_blank" rel="noopener" class="ia-result-link">GitHub ↗</a>` : ''}
          ${p.demo   ? `<a href="https://${p.demo}"   target="_blank" rel="noopener" class="ia-result-link">Demo en vivo ↗</a>` : ''}
        </div>`
      : '';

    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev › Proyectos › ${p.title}</div>
      <h3 class="ia-result-title">${p.title}</h3>
      <div class="ia-result-meta">${p.role} · ${p.period}</div>
      <p class="ia-result-desc">${_md(p.respuesta)}</p>
      ${metricsHtml}
      ${tagsHtml}
      ${linksHtml}
    `;
    return card;
  }

  if (result.type === 'tech') {
    const t = result.data;
    card.className = 'ia-result-card';

    const proyectosHtml = t.proyectos?.length
      ? `<div class="ia-result-row">${t.proyectos.map(p => `<span class="ia-metric">${p}</span>`).join('')}</div>`
      : '';

    const tagsHtml = t.tags?.length
      ? `<div class="ia-result-row">${t.tags.map(tg => `<span class="ia-tag-tech">${tg}</span>`).join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="ia-result-breadcrumb">jonathan.dev › Skills › ${t.name}</div>
      <h3 class="ia-result-title">${t.name} ${_levelBadge(t.nivel)}</h3>
      <p class="ia-result-desc">${_md(t.respuesta)}</p>
      ${proyectosHtml}
      ${tagsHtml}
    `;
    return card;
  }

  return card;
}

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

// ── INIT ─────────────────────────────────────────────────────────────────────

function _render() {
  const section   = document.getElementById('ia-assistant-section');
  if (!section) return;

  const results   = section.querySelector('#ia-results');
  const input     = section.querySelector('#ia-input');
  const sendBtn   = section.querySelector('#ia-send');
  const suggestions = section.querySelectorAll('.ia-suggestion');

  function send() {
    const val = input.value.trim();
    if (!val) return;

    input.value = '';
    sendBtn.disabled = true;

    // loading
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

function init() {
  _render();
  const initMode = localStorage.getItem('portfolio-mode') || 'dev';
  _syncMode(initMode);
  window.addEventListener('portfolio:modeChange', e => _syncMode(e.detail.mode));
}

export const IAAssistant = { init };
