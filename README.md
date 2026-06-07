# Jonathan Aucancela — Portfolio

Portfolio personal de **Jonathan David Aucancela** — Software Engineer · IA Developer · Security Researcher.

**URL:** [davidaucancela-portfolio.vercel.app](https://davidaucancela-portfolio.vercel.app/)

---

## Tres modos, una sola página

El portfolio cambia completamente según el perfil seleccionado:

| Modo | Perfil | Acento |
|------|--------|--------|
| `dev` | Software Engineer — sistemas fullstack, arquitectura, deploy | Azul |
| `ia` | IA Developer — LLMs, RAG, agentes, embeddings | Púrpura |
| `sec` | Security Researcher — pentesting, CTF, ciberseguridad | Verde terminal |

El modo activo persiste en `localStorage` y cambia contenido, colores, proyectos y secciones visibles.

---

## Stack

- **HTML5 + CSS3 + JavaScript vanilla** con ES modules
- **Vite** como bundler (`npm run dev` / `npm run build`)
- **Deploy:** Vercel — auto-deploy en push a `main`
- **Analytics:** `@vercel/analytics` + `@vercel/speed-insights`

---

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:3000 con HMR
npm run build    # build de producción en dist/
npm run preview  # previsualizar el build
```

---

## Proyectos por modo

Los proyectos se cargan con `fetch` desde JSON en runtime:

| Archivo | Modo | Proyectos |
|---------|------|-----------|
| `data/dev-projects.json` | `.dev` | ArtEcuador, Ideancestral, MapCriminals, Notes App, Equity, SecuraBank, Gesture Control, ConQuito, Seres del Pase, DualFace |
| `data/ia-projects.json` | `.ia` | LLM Observatory, UBApp, MindLog, Mare Vitae, Social Media AI Agent, AnaOS, CodeReviewX |
| `data/sec-projects.json` | `.sec` | Labs HTB + prácticas profesionales + certificaciones |

---

## Funcionalidades

- **JotAI** — mascot flotante con chat inteligente, búsqueda semántica con `Xenova/all-MiniLM-L6-v2` (Web Worker + IndexedDB cache) y tour guiado por secciones
- **Command Palette** (`Cmd+K`) — 21 comandos en 4 grupos: navegación, modo, proyectos, acciones
- **Project Gallery** — galería fullscreen con filmstrip, navegación táctil y panel de proceso detallado
- **SecTerminal** — terminal interactiva en modo `.sec` con boot sequence y comandos (`help`, `whoami`, `ls`, `cat`, `ping`, `clear`)
- **PDF Modal** — visor inline del CV sin abrir nueva pestaña
- **Trajectory Drawer** — línea de tiempo interactiva de la trayectoria profesional
- **Scroll-driven Animations** — vía `animation-timeline: view()` con fallback IntersectionObserver
- **Section Canvas** — fondos dinámicos por modo (partículas azules / red neuronal púrpura / matrix verde)
- **Bilingüe ES/EN** — internacionalización completa con `LangSwitcher`

---

## Estructura

```
index.html
css/
  main.css              # Variables, reset, layout, hero
  sections.css          # About, projects, skills, contact
  animations.css        # Keyframes + scroll-driven animations
  polish.css            # Jonathan panel, trayectoria, detalles
  project-gallery.css   # Gallery fullscreen
  project-detail.css    # Panel de detalle de proyecto
  command-palette.css   # Command palette overlay
  ia-mascot.css         # JotAI widget
  sec-terminal.css      # Terminal modo .sec
  pdf-modal.css         # Visor PDF
  trajectory.css        # Drawer de trayectoria
  section-divider.css   # Divisor interactivo hero→about
  themes/
    dev.css | ia.css | sec.css

js/
  main.js               # Entry point Vite
  app.js                # Navbar, scroll, contacto
  theme-switcher.js     # Cambio dev/ia/sec
  sections.js           # Renderizado de secciones
  projects.js           # Renderizado de tarjetas
  project-detail.js     # Panel lateral de detalle
  project-gallery.js    # Gallery fullscreen
  ia-mascot.js          # JotAI widget
  ia-assistant.js       # Motor NLP híbrido + KB dinámica
  ia-worker.js          # Web Worker: MiniLM + IndexedDB
  ia-tour.js            # Tour guiado por secciones
  command-palette.js    # Buscador global Cmd+K
  sec-terminal.js       # Terminal interactiva .sec
  pdf-modal.js          # Visor PDF inline
  trajectory.js         # Drawer de trayectoria
  animations.js         # Hero canvas (partículas/matrix/neural)
  effects.js            # SectionReveal + SectionCanvas
  lang.js               # Internacionalización ES/EN
  section-nav.js        # Dots de navegación lateral
  section-divider.js    # Divisor interactivo

data/
  dev-projects.json
  ia-projects.json
  sec-projects.json
  personal.json
  skills.json

public/
  images/projects/<slug>/   # Screenshots por proyecto
  images/certificados/      # PDFs de certificaciones (modo .sec)
```

---

## CI/CD

- `.github/workflows/deploy.yml` — deploy a Vercel en push a `main`
- `.github/workflows/ci.yml` — pipeline de CI
- `.lighthouserc.json` — Lighthouse CI para seguimiento de performance

---

## Licencia

MIT
