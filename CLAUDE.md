# Portfolio Project — CLAUDE.md

## Project Overview
Portfolio personal de Jonathan Aucancela. Todo el copy de UI está en **español**.

- **Stack:** HTML5, CSS3, JavaScript vanilla con ES modules
- **Bundler:** Vite (`npm run dev` / `npm run build`)
- **Deploy:** Vercel (auto-deploy en push a `main`)
- **Repo:** `DavidAucancela/Portfolio` en GitHub
- **Path local:** `/Users/david/Documents/Projects/Portfolio/Portfolio`

## Cómo desarrollar
```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo con HMR
npm run build     # build de producción en dist/
npm run preview   # previsualizar el build
```

## Estructura completa
```
index.html                    # Página principal (única)
404.html                      # Página de error
vite.config.js                # Config Vite (publicDir:false, copia public/ → dist/public/)

css/
  main.css                    # Variables CSS, reset, layout base, tipografía, hero
  sections.css                # Estilos de secciones (about, projects, skills, contact)
  animations.css              # Keyframes globales + scroll-driven animations (@supports)
  polish.css                  # jonathan-panel, trayectoria interactiva, detalles visuales
  project-detail.css          # Modal de detalle de proyecto
  trajectory.css              # Estilos del drawer de trayectoria
  command-palette.css         # Command palette (Cmd+K) — overlay, modal, items, toast
  sec-terminal.css            # Terminal interactiva del hero en modo .sec
  themes/
    dev.css                   # Overrides modo .dev (azul, tipografía display)
    ia.css                    # Overrides modo .ia (púrpura, gradientes)
    sec.css                   # Overrides modo .sec (verde terminal, negro puro)

js/
  main.js                     # Punto de entrada Vite — importa módulos y llama init()
  app.js                      # Coordinador: navbar, scroll progress, hamburguesa, contacto
  theme-switcher.js           # Cambio de modo dev/ia/sec, persistencia en localStorage
  sections.js                 # Renderizado de secciones (ABOUT_DATA, EXPERIENCE_DATA, etc.)
  projects.js                 # Renderizado de tarjetas de proyectos por modo
  project-detail.js           # Modal de detalle de proyecto (proceso, métricas, links)
  animations.js               # HeroAnimations: canvas de partículas/matrix/neural por modo
  effects.js                  # SectionReveal (IntersectionObserver), parallax, partículas
  lang.js                     # LangSwitcher — internacionalización ES/EN
  section-nav.js              # Navegación lateral de secciones (dots laterales)
  ia-assistant.js             # IAAssistant — chatbot solo visible en modo .ia
  trajectory.js               # Trajectory — drawer de trayectoria profesional
  command-palette.js          # CommandPalette — buscador global estilo Spotlight/VS Code
  sec-terminal.js             # SecTerminal — terminal interactiva en hero modo .sec

data/
  dev-projects.json           # 8 proyectos del modo .dev
  ia-projects.json            # 4 proyectos del modo .ia
  sec-projects.json           # 7 proyectos del modo .sec
  personal.json               # Bio, email, redes, timeline
  skills.json                 # Skills por categoría

assets/
  images/
    og-preview.svg            # Placeholder og:image (pendiente: reemplazar con PNG real)
  fonts/                      # Fuentes locales

public/                       # Imágenes servidas con prefijo /public/
  Foto principal.jpg          # Foto modo .dev
  personalIA.jpg              # Foto modo .ia
  personalSec.jpg             # Foto modo .sec
  Hoja de vida - Jonathan Aucancela.pdf
  images/projects/<slug>/     # Screenshots de proyectos por slug
```

## Arquitectura & Patrones clave

**Build con Vite + ES modules:** Los JS usan `import/export` estándar. Vite los bundlea.
`vite.config.js` tiene `publicDir: false` y un plugin custom que copia `public/` → `dist/public/`,
por eso las rutas de imágenes son `"public/images/..."` (no `"/images/..."`).

**Patrón de módulos:** IIFE exportado como objeto con API pública:
```js
export const NombreModulo = (() => {
  function init() { ... }
  return { init };
})();
```

**Modos del portfolio:** `dev` | `ia` | `sec` — cambian contenido, estilos y secciones visibles.
El modo activo se guarda en `localStorage('portfolio-mode')` y en `document.body.dataset.theme`.
```js
window.dispatchEvent(new CustomEvent('portfolio:modeChange', { detail: { mode } }));
```

**Eventos custom usados:**
```js
'portfolio:modeChange'      // cambio de modo (dev/ia/sec)
'portfolio:syncTrayectoria' // abrir el panel de trayectoria
'command-palette:open'      // abrir la Command Palette desde código
```

**Scroll-driven Animations (`animations.css`):**
Usa `animation-timeline: view()` para animaciones de entrada de elementos y
`animation-timeline: scroll(root block)` para la barra de progreso.
Envuelto en `@supports` para progressive enhancement (fallback: IntersectionObserver en `effects.js`).
Los keyframes globales son: `sd-up`, `sd-left`, `sd-right`, `sd-scale`, `sd-bar`.

**Command Palette (`command-palette.js` + `command-palette.css`):**
- Atajo: `Cmd+K` / `Ctrl+K`
- 21 comandos en 4 grupos: Navegación, Modo, Proyectos, Acciones
- Búsqueda fuzzy con scoring, navegación ↑↓ Enter Esc
- Botón trigger en la navbar (antes del hamburger)
- `_openProject(slug, preferredMode)` cambia de modo si es necesario y navega al proyecto

**Terminal .sec (`sec-terminal.js` + `sec-terminal.css`):**
- Solo visible en modo `.sec`, posicionada a la derecha del hero (grid 2 col en desktop)
- Boot sequence animado la primera vez que se activa el modo
- Comandos: `help`, `whoami`, `ls [projects]`, `cat <file>.md`, `ping linkedin`, `clear`, `exit`
- Historial de comandos con ↑↓
- El archivo `sec.css` oculta `#hero-bg-text` cuando el terminal está visible

## Secciones en index.html
- `#hero` — presentación con modos + terminal .sec
- `#about` — bio, stats animados, focus card, avatar por modo
- `#projects` — grid de proyectos (renderizado por `projects.js`)
- `#skills` — grid de habilidades técnicas (renderizado por `sections.js`)
- `#ia-assistant-section` — solo visible en modo `.ia`
- `#contact` — formulario Web3Forms + redes sociales
- `#jonathan-panel` — drawer lateral de trayectoria (fuera del `<main>`)

## Datos embebidos en JS
Los JSON de `data/` NO se cargan con fetch en runtime. Los datos están embebidos directamente
en los módulos JS como constantes (`ABOUT_DATA`, `EXPERIENCE_DATA`, `SKILLS_DATA`, etc.).

## SLUG_MAP de proyectos (`projects.js`)
```js
'project-001' → 'ubapp'
'project-002' → 'ideancestral'
'project-003' → 'anaos'
'project-004' → 'equity'
'project-005' → 'securabank'
'project-006' → 'conquito-fundaciones'
'project-007' → 'mapcriminals'
'project-008' → 'llm-observatory'
'project-010' → 'mindlog'
```

## Convenciones CSS
- **Metodología:** BEM-like (`.section__element--modifier`)
- **Variables:** `--color-accent`, `--color-accent-rgb`, `--bg-card`, `--bg-secondary`,
  `--border-color`, `--text-primary`, `--text-muted`, `--font-display`, `--font-mono`
- `--font-mono` no existe como variable global → usar `var(--font-mono, monospace)`
- **IDs de sección:** kebab-case (`jonathan-panel`, `sec-terminal`, `cmd-palette`)
- **Clases de animación:** `animate-on-scroll`, `from-left`, `from-right`, `stagger-item`

## Imágenes
- Las fotos del avatar cambian por modo: `AVATAR_SRC` en `app.js`
- Screenshots de proyectos: `public/images/projects/<slug>/thumbnail.svg` (algunos son placeholders)
- Ruta correcta con Vite: `"public/images/..."` → en prod se sirve desde `/public/images/...`

## Pendientes manuales (no automatizables)
1. **Imágenes reales** para Equity, SecuraBank, ConQuito — reemplazar `thumbnail.svg` en
   `public/images/projects/{equity,securabank,conquito-fundaciones}/`
2. **og:image PNG real** — screenshot 1200×630px del portfolio →
   `assets/images/og-preview.png` → actualizar `og:image` y `twitter:image` en `index.html`
3. **URL canónica** — actualizar `<link rel="canonical">`, `og:url` y JSON-LD `url`
   en `index.html` con el dominio Vercel real (actualmente apunta a GitHub Pages)
