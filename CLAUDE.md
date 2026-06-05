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
  project-detail.css          # Panel lateral de detalle (PDM) — ya no se abre desde cards
  project-gallery.css         # Gallery fullscreen (2 col: imagen/PDF izq, info der; docs mode en .sec)
  trajectory.css              # Estilos del drawer de trayectoria
  command-palette.css         # Command palette (Cmd+K) — overlay, modal, items, toast
  sec-terminal.css            # Terminal interactiva del hero en modo .sec
  pdf-modal.css               # Modal fullscreen visor de PDF (CV + links externos)
  ia-mascot.css               # JotAI widget flotante: trigger, panel de chat, tour, estados
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
  project-detail.js           # buildContent(p, mode) + PDM lateral (init/open/close)
  project-gallery.js          # ProjectGallery — gallery fullscreen (open/close)
  animations.js               # HeroAnimations: canvas de partículas/matrix/neural por modo
  effects.js                  # SectionReveal, parallax, partículas, SectionCanvas (fondos dinámicos)
  lang.js                     # LangSwitcher — internacionalización ES/EN
  section-nav.js              # Navegación lateral de secciones (dots laterales)
  ia-assistant.js             # IAAssistant — KB dinámica desde JSON + motor de query (keywords)
  ia-mascot.js                # IaMascot — widget JotAI: SVG vivo (blink/mirada/cursor), CSS states, worker
  ia-worker.js                # Web Worker — embeddings MiniLM + IndexedDB cache + cosine ranking
  ia-tour.js                  # IaTour — tour guiado por secciones (4 pasos x modo dev/ia/sec)
  trajectory.js               # Trajectory — drawer de trayectoria profesional
  command-palette.js          # CommandPalette — buscador global estilo Spotlight/VS Code
  sec-terminal.js             # SecTerminal — terminal interactiva en hero modo .sec
  pdf-modal.js                # PDFModal — visor PDF inline (modal overlay con iframe)

data/
  dev-projects.json           # 7 proyectos del modo .dev (cargados con fetch en runtime)
  ia-projects.json            # 6 proyectos del modo .ia (cargados con fetch en runtime)
  sec-projects.json           # 7 proyectos del modo .sec (cargados con fetch en runtime)
  personal.json               # Bio, email, redes, timeline
  skills.json                 # Skills por categoría

assets/
  images/
    og-preview.svg            # Placeholder og:image (pendiente: reemplazar con PNG real)
  fonts/                      # Fuentes locales

public/                       # Servido con prefijo /public/ en Vite
  Foto principal.jpg          # Foto modo .dev
  personalIA.jpg              # Foto modo .ia
  personalSec.jpg             # Foto modo .sec
  Hoja de vida - Jonathan Aucancela.pdf
  images/projects/<slug>/     # Screenshots de proyectos por slug
  images/certificados/        # PDFs de certificaciones y prácticas (modo .sec)
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

## Datos de proyectos (JSON + fetch en runtime)
Los JSON de `data/` **sí se cargan con `fetch` en runtime** desde `projects.js`:
```js
const res = await fetch(`data/${mode}-projects.json`);
const projects = await res.json();
```
Los datos personales (`ABOUT_DATA`, `EXPERIENCE_DATA`, `SKILLS_DATA`) **sí están embebidos**
como constantes en `sections.js`.

### Campos de proyecto (estructura completa)
```json
{
  "id": "project-001",
  "slug": "ubapp",
  "title": "UBApp",
  "description": "...",
  "longDescription": "...",
  "tags": ["Django", "Angular"],
  "image": "public/images/projects/ubapp/index.png",
  "images": [                         ← array para el gallery (puede estar vacío [])
    "public/images/projects/ubapp/index.png",
    "public/images/projects/ubapp/dashboard.png"
  ],
  "docs": [                           ← solo en proyectos .sec con certificados/evidencia
    { "label": "Certificado", "url": "public/images/certificados/cert.pdf" }
  ],
  "liveUrl": "https://...",
  "repoUrl": "https://github.com/...",
  "featured": true,
  "date": "2026-01",
  "techStack": { "backend": ["Django"], "frontend": ["Angular"] },
  "process": {
    "overview": "...",
    "pasos": [{ "id": "problema", "resumen": "...", "puntos": ["..."] }],
    "resultado": "...",
    "metricas": [{ "label": "Tiempo", "value": "< 20s" }]
  },
  "lab": { ... }                      ← solo en proyectos .sec de HackTheBox
}
```

**Nota sobre rutas de imagen:** usar `_src(path)` en `project-gallery.js` para codificar
paths con espacios o acentos antes de asignar a `img.src`. En HTML estático (`<img src="...">`)
el browser lo codifica solo, pero en JS hay que codificar manualmente.

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
'project-010' → 'mindlog'        ← solo en ia-projects.json
```

## Fondos dinámicos de sección — `SectionCanvas` (`effects.js`)

Módulo #11 en `effects.js`. Crea un `<canvas class="section-bg-canvas">` como primer hijo
de cada sección (`#about`, `#projects`, `#skills`, `#contact`). Solo activo en dispositivos
con puntero fino (`hover: hover and pointer: fine` — no mobile/touch).

### Efectos por modo
| Modo | Partículas | Spotlight |
|------|-----------|-----------|
| `.dev` | Nodos azules flotantes (~35), líneas entre vecinos <115px, se repelen al acercarte | Radial `rgba(59,130,246, 0.10)` |
| `.ia` | Nodos púrpura/teal, pulsos radiales espontáneos (prob. 0.04%/frame) | Radial `rgba(177,78,255, 0.10)` |
| `.sec` | Columnas de chars ASCII/katakana cayendo, aceleran y brillan cerca del cursor | Radial `rgba(0,255,65, 0.10)` |

### Stacking context (patrón idéntico al hero canvas)
```
.section              position: relative; overflow: hidden;
  .section-bg-canvas  position: absolute; z-index: 0;   ← canvas + spotlight
  .container          position: relative; z-index: 1;   ← contenido encima
```

### Suavizado de bordes entre secciones
Dos mecanismos combinados para eliminar el corte duro al cruzar secciones:

1. **`mask-image` en el canvas** — desvanece el canvas en el 8% superior e inferior:
   ```css
   mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
   ```

2. **Vignettes CSS** (`::before` top / `::after` bottom) en `.section` y `.section--alt` —
   funden el color de fondo propio de la sección en 60px en cada borde:
   ```css
   .section::before     { background: linear-gradient(to bottom, var(--bg-primary),   transparent); }
   .section--alt::before { background: linear-gradient(to bottom, var(--bg-secondary), transparent); }
   .section::after      { background: linear-gradient(to bottom, transparent, var(--bg-primary));   }
   .section--alt::after  { background: linear-gradient(to bottom, transparent, var(--bg-secondary)); }
   ```
   Ambos pseudo-elementos tienen `z-index: 0` (bajo el contenido) y `pointer-events: none`.

### Performance
- Loop `requestAnimationFrame` compartido entre todos los canvases
- `ResizeObserver` por sección — reinicializa partículas al cambiar tamaño
- Saltar secciones fuera del viewport (±80px) en cada frame
- Al cambiar modo: `_teardown()` + `_setup()` con 80ms de delay para esperar el DOM

### Colores de acento (hardcoded en `ACCENT_RGB`)
```js
dev: [59, 130, 246]   // azul
ia:  [177, 78, 255]   // púrpura  +  ACCENT2: [6, 255, 165] (teal, 35% de nodos)
sec: [0,  255,  65]   // verde terminal
```

## Convenciones CSS
- **Metodología:** BEM-like (`.section__element--modifier`)
- **Variables:** `--color-accent`, `--color-accent-rgb`, `--bg-card`, `--bg-secondary`,
  `--border-color`, `--text-primary`, `--text-muted`, `--font-display`, `--font-mono`
- `--font-mono` no existe como variable global → usar `var(--font-mono, monospace)`
- **IDs de sección:** kebab-case (`jonathan-panel`, `sec-terminal`, `cmd-palette`)
- **Clases de animación:** `animate-on-scroll`, `from-left`, `from-right`, `stagger-item`
- **`.section-bg-canvas`:** canvas de fondo dinámico — `z-index: 0`, primer hijo de cada sección
- **`.section::before/::after`:** vignettes de transición entre secciones — no usar para otro propósito

## Imágenes
- Las fotos del avatar cambian por modo: `AVATAR_SRC` en `app.js`
- Screenshots de proyectos en `public/images/projects/<slug>/`
- Proyectos sin imágenes reales (Equity, SecuraBank, ConQuito): `"image": null, "images": []`
- Certificados PDF en `public/images/certificados/` — commiteados al repo para que Vercel los sirva
- Ruta correcta con Vite: `"public/images/..."` → en prod se sirve desde `/public/images/...`
- **Evitar espacios y caracteres especiales en nombres de archivo** — macOS guarda screenshots
  con ` ` (narrow no-break space) entre la hora y AM/PM, lo que impide que Vite los sirva.
  Renombrar a `slug-01.png`, `slug-02.png`, etc.

## Gallery fullscreen (`project-gallery.js` + `project-gallery.css`)
- **Trigger:** click en `.card-image-wrap` o en el botón "Ver proceso" de cualquier card
- **Layout desktop:** 2 columnas — izquierda: imagen/PDF+flechas+filmstrip / derecha: panel info
- **Layout mobile (≤768px):** columna única, info debajo
- **z-index:** 9990 (sobre el PDM lateral en 9985 y el navbar)
- **Navegación:** flechas ← →, contador `1/N`, filmstrip de thumbnails, swipe táctil, teclas ← → Esc
- **1 imagen/doc:** flechas y filmstrip ocultos (`[data-count="1"]` via CSS)
- **0 imágenes:** muestra emoji del modo como placeholder; info panel sigue visible
- **Panel info:** reutiliza `ProjectDetail.buildContent(p, mode)` — mismo HTML que el PDM lateral
- **Codificación de rutas:** helper `_src(path)` codifica cada segmento con `encodeURIComponent`

### Modo docs (`.sec` con `docs[]` no vacío)
Cuando `mode === 'sec'` y el proyecto tiene `docs[]`, la gallery entra en **docs mode**:
- La clase `pgal--docs-mode` se agrega a `#pgal`
- El panel izquierdo muestra un `<iframe id="pgal-pdf">` con el PDF en lugar de `<img>`
- El filmstrip muestra **doc tabs** (`.pgal__doc-tab`) con el `label` de cada doc — chips de texto en lugar de thumbnails de imagen
- Flechas ← → y teclas navegan entre documentos del array `docs[]`
- Al cerrar la gallery, `iframe.src` se limpia para detener la carga
- Si el proyecto no tiene `docs[]` o tiene array vacío, se usa el modo imagen normal
- **Links de documentos en el panel info:** los `.pdm__doc-link` tienen `data-doc-index="N"`.
  Un listener delegado en `#pgal-info` intercepta el click y llama `_goTo(N)` — el PDF
  se muestra en el iframe izquierdo **sin abrir nueva pestaña**.

## Panel de detalle (`project-detail.js`)
- `ProjectDetail.buildContent(p, mode)` exportado como API pública — usado por ProjectGallery
- Labels de sección adaptativos por modo (`PANEL_LABELS` / `PANEL_ICONS`):

| Sección    | .dev           | .ia        | .sec          |
|------------|----------------|------------|---------------|
| Overview   | Resumen        | Contexto   | Objetivo      |
| Fases      | ⚙️ Proceso     | 🔬 Pipeline | 🔍 Metodología |
| Métricas   | 📊 Resultados  | 📊 Métricas | 📊 Hallazgos  |
| Tech       | 🛠️ Stack Técnico | 🤖 Stack de IA | 🔧 Herramientas |
| Docs       | 📄 Documentos  | 📄 Documentos | 📄 Documentos |

- **Sin XP/Credits:** eliminado el badge `+150 XP` de los headers de fase
- **Sección Documentos:** renderiza `p.docs[]` como `<a class="pdm__doc-link" data-doc-index="N">`
  sin `target="_blank"`. Cuando está dentro de la gallery, el click navega el iframe interno.
  Cuando está fuera (contexto futuro), `href` sigue siendo la URL del PDF como fallback.

## PDF Modal (`pdf-modal.js` + `pdf-modal.css`)
Visor inline de PDF — modal fullscreen que renderiza el documento en un `<iframe>` sin abrir nueva pestaña.

- **API pública:** `PDFModal.init()` (llamado en `main.js`) · `PDFModal.open(url, label)`
- **Trigger actual:** botón `#cv-open-btn` en la sección `#about` → `app.js` llama `PDFModal.open(...)`
- **Header:** título del documento · botón `⬇ Descargar` (`<a download>`) · botón `✕` cerrar
- **Cierre:** botón ✕ · tecla Esc · clic en el overlay oscuro
- **z-index:** 10500 (sobre gallery en 9990 y command palette)
- **iOS Safari:** no soporta PDF en `<iframe>` — el modal muestra un mensaje de fallback
  con instrucción de usar el botón de descarga
- **Botón CV en `index.html`:** `<button id="cv-open-btn" data-pdf-url="..." data-pdf-label="...">` —
  reemplaza el antiguo `<a download>`. El texto cambió de "Descargar CV" a "Ver CV".

## Responsive Mobile — Projects grid
- **≤480px:** `.projects-grid` usa `repeat(2, 1fr)` con `gap: 0.875rem` (antes era 1 columna)
- **Card internals a ≤480px** (`main.css`): padding reducido en `.card-body`, `.card-links`;
  `.card-description` limitada a 3 líneas con `-webkit-line-clamp`; `.card-btn--process`
  ocupa el 100% del ancho en fila propia (`flex: 0 0 100%`) para evitar desbordamiento
- **Texto de botones** en `projects.js` envuelto en `<span class="card-btn-text">` — permite
  ocultar el texto con CSS en viewports muy pequeños si se necesita en el futuro
- **Gallery mobile:** `.pgal__info` en ≤768px aumentó de `max-height: 32vh` a `42vh`

## Pendientes manuales (no automatizables)
1. **og:image PNG real** — screenshot 1200×630px del portfolio →
   `assets/images/og-preview.png` → actualizar `og:image` y `twitter:image` en `index.html`
2. **URL canónica** — actualizar `<link rel="canonical">`, `og:url` y JSON-LD `url`
   en `index.html` con el dominio Vercel real (actualmente apunta a GitHub Pages)

## JotAI — Mascot Widget (`ia-mascot.js` + `ia-mascot.css` + `ia-worker.js` + `ia-tour.js`)

Widget flotante `position: fixed; bottom: 1.5rem; right: 1.5rem` visible en **todos los modos**.
Los colores heredan las CSS vars del tema activo (`--color-accent`, `--bg-secondary`, etc.)
— sin CSS adicional por modo.

### Arquitectura general

```
IaMascot.init()
  ├─ _inject()              → DOM del widget (2× SVG mascot + panel de chat)
  ├─ _startLife(svgEl)      → timers de parpadeo + mirada errante por instancia
  ├─ _initCursorTracking()  → pointermove en el panel → pupila sigue el cursor
  ├─ jotai:kb-ready event   → _initWorker(docs) → ia-worker.js
  └─ portfolio:modeChange   → closePanel() si estaba abierto

IAAssistant.init()
  └─ _loadData()            → fetch 5 JSONs → _buildKB() → dispatch jotai:kb-ready

ia-worker.js (Web Worker)
  ├─ { type:'init', docs }  → loadModel + IDB cache check + embed KB
  ├─ { type:'query',... }   → embed query → cosine ranking → { type:'result',... }
  └─ IndexedDB cache: key = FNV-1a hash de doc IDs + texts
```

### Nombre del mascot
```js
const MASCOT_NAME = 'JotAI'; // en js/ia-mascot.js — cambiar aquí para renombrar
```

### SVG del personaje (`_buildSVG(prefix)`)
`viewBox="0 0 200 200"`. Dos instancias en el DOM: prefix `'b'` (burbuja) y `'p'` (panel header).
El prefix evita IDs duplicados en los `<defs>` (gradientes `${p}aura`, `${p}body`, `${p}eye`).

Capas del SVG (de abajo hacia arriba):
1. `.jotai-aura` — círculo de fondo con radial gradient que pulsa (`auraPulse`)
2. `.jotai-motes` / `.jotai-motes-2` — partículas que orbitan en sentidos opuestos (`spin`)
3. `.jotai-creature` — grupo que recibe `breathe` (scale sutil 3.6s)
   - `.jotai-tilt` — grupo interior que recibe las poses de estado vía CSS
     - antena (line + circle)
     - `.jotai-ear-l` / `.jotai-ear-r` — dos paths por oreja (exterior + inner glow)
     - cuerpo (ellipse con linear gradient)
     - ojos: sclera (radial gradient) + `.jotai-pupil-grp` (sigue `--px/--py`) + `.jotai-lid`
     - `.jotai-mouth-path` — path único; `d` se actualiza por JS según estado
     - `.jotai-think-dots` — visible en `is-thinking`
     - `.jotai-spark` — visible en `is-success`
     - `.jotai-qmark` — visible en `is-confused`

### Vida continua (independiente del chat)
Funciones invocadas por instancia de SVG desde `_startLife(el)`:

| Comportamiento | Implementación |
|---------------|----------------|
| Float | CSS `jotai-float` en `#jotai-trigger` (translateY ±7px, 4s) |
| Breathe | CSS `jotai-breathe` en `.jotai-creature` (scale 1.032, 3.6s) |
| Ear sway | CSS `jotai-swayL/R` en `.jotai-ear-l/r` (±4°, 5–5.4s) |
| Aura pulse | CSS `jotai-auraPulse` en `.jotai-aura` (scale + opacity, 3.6s) |
| Motes orbit | CSS `jotai-spin` en `.jotai-motes/2` (view-box origin, 9–14s) |
| Parpadeo | JS timer 2.2–6.4s → clase `.is-blinking` → `scaleY(1)` en `.jotai-lid` |
| Doble parpadeo | 22% de probabilidad en cada parpadeo (260ms después del primero) |
| Mirada errante | JS timer 2.4–5s (solo en idle) → `--px/--py` aleatorios → vuelve a 0,0 |
| Cursor tracking | `pointermove` en `#jotai-panel` → `--px/--py` en `.jotai-pupil-grp` |

CSS custom properties para la pupila:
```css
.jotai-pupil-grp { transform: translate(var(--px, 0px), var(--py, 0px)); }
```
Se fijan por JS con `el.style.setProperty('--px', x + 'px')` en cada pupil-grp del SVG.

### 8 estados del mascot (CSS classes en `#jotai-widget`)
Los estados se aplican como clase `is-<estado>` al `#jotai-widget` — afecta **ambas instancias** del SVG (burbuja + panel) simultáneamente. No se usa GSAP para los estados.

| Estado | Cuándo | CSS que activa |
|--------|--------|----------------|
| `idle` | Reposo | Animaciones base (float, breathe, sway) |
| `greeting` | Panel abre | `jotai-greet` en `.jotai-tilt` (bounce + rotación) |
| `listening` | Focus en input | Orejas ±13°, tilt 2° hacia input |
| `thinking` | Procesando query | Ladeo −6°, think-dots, glow-pulse en trigger |
| `talking` | Respuesta escribiéndose | `jotai-bob` en tilt, `jotai-mouthTalk` en boca |
| `success` | Resultado encontrado | `jotai-pop`, spark visible, orejas arriba |
| `confused` | Sin resultado | Rotación 7°, oreja derecha 34°, qmark flotante |
| `pointing` | Tour activo | Oreja derecha 20°, tilt 4° |

Boca: un único `.jotai-mouth-path`; `d` cambia por `setAttribute` desde `_setState`:
- `neutral` → `M89 141 Q100 150 111 141`
- `success` → `M85 138 Q100 156 115 138`
- `confused` → `M93 144 Q100 139 107 144`
- `thinking` → `M93 143 L107 143`

`prefers-reduced-motion`: CSS apaga `.jotai-aura`, `.jotai-motes`, `.jotai-creature`, `.jotai-ear-l/r`
y todos los keyframes de estado. JS no inicia los timers de vida. Transiciones suspendidas.

### Motor NLP híbrido
- **Siempre disponible:** búsqueda por keywords + intent detection (síncrona)
- **Cuando el worker está listo:** búsqueda semántica con `Xenova/all-MiniLM-L6-v2` (384 dims)
- **Umbral semántico:** `score ≥ 0.32` para aceptar resultado del worker
- **Intent detection short-circuits:** `personal`, `contact`, `list_projects`, `list_skills`
  → respuesta inmediata sin semántica
- **Status bar:** muestra progreso real de descarga/indexado; `"Listo (caché ⚡)"` en visitas siguientes

### Knowledge Base
La KB se construye dinámicamente en `ia-assistant.js`:
- `_buildKB()` → fetcha `personal.json`, `dev-projects.json`, `ia-projects.json`,
  `sec-projects.json`, `skills.json` → 20 proyectos + 29 skills + 2 docs especiales
- Docs `project` y `skill` tienen campo `text` para embedding
- Se emite `jotai:kb-ready` con los docs embeddables cuando la carga termina

### Tour guiado (`ia-tour.js`)
- 4 pasos por modo con contenido adaptado (dev/ia/sec)
- Sección destacada con `outline` vía clase `.jotai-tour-target`
- Scroll a la sección con `behavior: 'smooth'` (o `'instant'` si `prefers-reduced-motion`)
- Navegación: botones ← Anterior / Siguiente → / ✕ Saltar + teclas ← → Esc
- Botón "Tour 🗺" siempre visible en el header del panel; al finalizar el tour JotAI reabre el panel

### IndexedDB cache de embeddings
`ia-worker.js` almacena los vectores precomputados en IDB con clave = hash FNV-1a
de los IDs + texto de cada doc. En visitas subsiguientes la KB está lista casi al instante.
El hash cambia automáticamente al añadir proyectos → recomputa sin intervención manual.

### GSAP — CDN (solo para uso futuro / animaciones opcionales)
```html
<!-- en index.html <head> -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
```
Carga sincrónica antes del bundle de Vite. Disponible como `window.gsap` si se necesita.
Los **estados del mascot ya no usan GSAP** — son 100% CSS classes. GSAP queda como opción
para animaciones puntuales que requieran control de timeline (ej: secuencias de onboarding futuras).

### Vite config
`optimizeDeps.exclude: ['@huggingface/transformers']` — necesario para que los
archivos WASM de ONNX Runtime se resuelvan correctamente en el worker.
Worker bundleado en `dist/assets/ia-worker-*.js` (~519KB).
WASM del runtime en `dist/assets/ort-wasm-simd-threaded.asyncify-*.wasm` (~23MB, cacheado).
