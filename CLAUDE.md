# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Portfolio personal de Jonathan Aucancela. Todo el copy de UI está en **español**.

- **Stack:** HTML5, CSS3, JavaScript vanilla con ES modules
- **Bundler:** Vite (`npm run dev` / `npm run build`)
- **Deploy:** Vercel (auto-deploy en push a `main`)
- **Repo:** `DavidAucancela/Portfolio` en GitHub
- **Path local:** `/Users/david/Documents/Projects/Portfolio`

## Cómo desarrollar
```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo con HMR — http://localhost:3000
npm run build     # build de producción en dist/
npm run preview   # previsualizar el build
```

## Tests & Linting
No hay tests ni linting activo. `.eslintrc.json` existe pero es un artefacto heredado (extiende `next/core-web-vitals`) — ignorar.

## CI/CD
- `.github/workflows/deploy.yml` — deploy automático a Vercel en push a `main`
- `.github/workflows/ci.yml` — pipeline de CI
- `.lighthouserc.json` — Lighthouse CI para seguimiento de performance

## Estructura completa
```
index.html                    # Página principal (única)
404.html                      # Página de error
vite.config.js                # Config Vite (publicDir:false, copia public/ → dist/public/)

css/
  main.css                    # Variables CSS, reset, layout base, tipografía, hero
  sections.css                # Estilos de secciones (about, projects, skills, contact)
  animations.css              # Keyframes globales + scroll-driven animations (@supports)
  background.css              # Canvas global (#bg-canvas) + superficies glass
  polish.css                  # jonathan-panel, trayectoria interactiva, detalles visuales
  project-detail.css          # Panel lateral de detalle (PDM) — ya no se abre desde cards
  project-gallery.css         # Gallery fullscreen (2 col: imagen/PDF izq, info der; docs mode en .sec)
  trajectory.css              # Estilos del drawer de trayectoria
  command-palette.css         # Command palette (Cmd+K) — overlay, modal, items, toast
  sec-terminal.css            # Terminal interactiva del hero en modo .sec
  pdf-modal.css               # Modal fullscreen visor de PDF (CV + links externos)
  ia-mascot.css               # JotAI widget flotante: trigger, panel de chat, tour, estados
  section-divider.css         # Divisor animado entre secciones (partículas + glow al hover)
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
  background.js               # PortfolioBackground: fondo unificado de toda la página (1 canvas)
  effects.js                  # SectionReveal, parallax, cursor, scramble, contadores
  lang.js                     # LangSwitcher — internacionalización ES/EN
  section-nav.js              # Navegación lateral de secciones (dots laterales)
  ia-assistant.js             # IAAssistant — KB dinámica desde JSON + motor de query (keywords)
  ia-mascot.js                # IaMascot — widget JotAI: SVG vivo (blink/mirada/cursor), CSS states, worker
  ia-bubble.js                # IaBubble — globos de diálogo efímeros: cola, typewriter, dismiss
  ia-worker.js                # Web Worker — embeddings MiniLM + IndexedDB cache + cosine ranking
  ia-tour.js                  # IaTour — tour guiado por secciones (4 pasos x modo dev/ia/sec)
  trajectory.js               # Trajectory — drawer de trayectoria profesional
  command-palette.js          # CommandPalette — buscador global estilo Spotlight/VS Code
  sec-terminal.js             # SecTerminal — terminal interactiva en hero modo .sec
  pdf-modal.js                # PDFModal — visor PDF inline (modal overlay con iframe)
  section-divider.js          # SectionDivider — divisor animado entre secciones (canvas partículas)
  analytics.js                 # Analytics — sink de eventos custom hacia Vercel Analytics

data/
  dev-projects.json           # 11 proyectos del modo .dev (cargados con fetch en runtime)
  ia-projects.json            # 7 proyectos del modo .ia (cargados con fetch en runtime)
  sec-projects.json           # 7 proyectos del modo .sec (labs HTB + prácticas + certs)
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

**Vercel Analytics:** `@vercel/analytics` y `@vercel/speed-insights` inyectados en `js/main.js` (`injectAnalytics()`/`injectSpeedInsights()`). No eliminar — registran métricas de producción en el dashboard de Vercel (eventos custom requieren plan Pro para verse ahí). `ia-mascot.js` manda el evento `track('jotai_query', { resolved: 'local' | 'ai_fallback' | 'canned_fallback' })` junto a cada `_logEvent` — da el ratio real de cuántas queries resuelve la búsqueda local sin necesitar el fallback de IA.

**`js/analytics.js`:** sink centralizado de observabilidad de interacción — escucha los `CustomEvent`s ya emitidos por otros módulos (ver "Eventos custom usados" abajo) y los traduce a `track()` de Vercel Analytics, sin importar/acoplarse a esos módulos:
```js
'mode_change'          // portfolio:modeChange        → { mode }
'project_open'         // portfolio:projectOpen       → { project, mode }
'command_palette_open' // command-palette:opened      → (sin payload)
'section_dwell'        // portfolio:sectionDwell      → { section, mode }
```
Además, tracking inline en su módulo de origen (un solo consumer, no amerita evento propio):
`jotai_panel_open` (`ia-mascot.js` `openPanel()`), `cv_view` (`app.js`, botón CV), `contact_submit` (`app.js`, submit exitoso del form).

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
'command-palette:opened'    // notificación: la palette se abrió (teclado/botón/evento)
'portfolio:projectOpen'     // gallery de proyecto abierta  → detail: { project, mode }
'portfolio:projectClose'    // gallery de proyecto cerrada → detail: { project, mode }
'portfolio:sectionDwell'    // 8s+ de permanencia en una sección → detail: { section, mode }
                             // (ia-mascot.js _initNudges — incondicional, no gateado por
                             // el presupuesto/cooldown de los nudges de UI)
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

## Widgets del hero — `.git-activity` / `.ia-tokens` / `.sec-terminal`

Tres paneles, uno por modo (`git-history.js`+`.css`, `ia-tokens-widget.js`+`.css`,
`sec-terminal.js`+`.css`), anclados arriba a la derecha del hero en desktop. Cada uno
tiene dos estados en `data-widget-state` (`collapsed`/`expanded`, toggle vía el botón
"Ver más"/compuerta) más una mini-animación de intro (~1.2s: commit→cloud en `.dev`,
red neuronal mini→macro en `.ia`) antes de revelar el cuerpo expandido.

**El panel es un flotante independiente — nunca un grid con `.hero-content`.**
Hasta hace poco `#hero .container` pasaba a `display:grid; grid-template-columns:1fr
auto` en cada modo, metiendo el widget en la misma fila que `.hero-content`. Eso
acoplaba el estado del widget al layout del hero por dos vías a la vez: la columna
`1fr` se encogía (y el texto del hero se re-envolvía) cada vez que el panel crecía de
`collapsed` a `expanded`, y si el panel expandido resultaba más alto que
`.hero-content`, la fila del grid crecía con él y agrandaba **todo** `.hero-section`,
empujando el resto de la página hacia abajo. El fix: `#hero .container` vuelve a ser
un contenedor normal (`position:relative`, sin grid) y cada widget es
`position:absolute; top:0; right:0;` dentro de él — crece sobre un punto fijo
(alineado con el top de `.hero-content`, mismo resultado visual que el `align-items:
start` del grid viejo) sin tocar el tamaño de nada más. Techo propio con scroll
interno (`max-height: min(640px, calc(100vh - 200px)); overflow-y:auto`) para que
tampoco dependa del alto de `.hero-section` para caber. Ahora que expandir/colapsar
es un cambio aislado, el ancho anima con `transition: width .45s …` sin miedo a que
el resto de la página salte en cada frame.
**≤960px** el flotante vuelve al flujo normal (`position:static`, ancho 100%,
apilado debajo de `.hero-content`) — el patrón absoluto es cosa de escritorio; en
mobile no hay columna de grid que proteger y el stack vertical ya es examen estándar.
**Al tocar el layout de un widget nuevo, replicar este patrón — nunca volver a meter
el panel en el grid del `.container`.**

**Detalle en el estado expandido:**
- `.git-activity` — el heatmap reemplazó el `title` nativo del navegador por un
  tooltip propio (`.git-activity__tip`, delegado en `#git-activity-grid`, un solo
  listener para las ~84 celdas que se recrean en cada render): fecha completa +
  cantidad exacta + tiempo relativo, con el mismo estilo del panel en vez del
  tooltip genérico del SO. Oculto en `pointer:coarse` (no hay hover que lo dispare).
- `.ia-tokens` — cada proyecto de la lista lleva una barra de peso relativo
  (`.ia-tokens__project-bar-fill`, gradiente púrpura→teal) escalada contra el
  proyecto con más tokens de las 5 filas mostradas — lectura visual inmediata del
  peso, no solo el número. Se oculta cuando el proyecto no matcheó ningún token en
  Observatory (fallback a mes: no hay magnitud real que barra).

**Terminal .sec (`sec-terminal.js` + `sec-terminal.css`):**
- Solo visible en modo `.sec`, flotante arriba a la derecha del hero (mismo patrón
  que el resto de los widgets — ver arriba)
- Boot sequence animado la primera vez que se activa el modo
- Comandos: `help`, `whoami`, `ls [projects]`, `cat <file>.md`, `ping linkedin`, `clear`, `exit`
- Historial de comandos con ↑↓
- `SecTerminal.demo(cmd)` — API pública: teclea el comando en el input real
  (85ms/char; instantáneo con reduced-motion) y lo ejecuta. Sin uso actual
  (el tour de JotAI la usó; quedó disponible)
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
como constantes en `sections.js`. `EXPERIENCE_DATA` alimenta el drawer de trayectoria
(22 items: proyectos + prácticas + certificaciones); al agregar un proyecto a los JSON
hay que añadirlo también ahí para que aparezca en la trayectoria.

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
Es un **fallback**: solo se aplica si el proyecto del JSON no trae `slug` explícito
(`if (!p.slug && p.id) p.slug = SLUG_MAP[p.id]`). Ojo: `project-009` está reutilizado —
en `dev-projects.json` trae `slug: 'artecuador'` explícito; el map lo resuelve a
`marevitae` para `ia-projects.json`.
```js
'project-001' → 'ubapp'              'project-009' → 'marevitae'
'project-002' → 'ideancestral'       'project-010' → 'mindlog'
'project-003' → 'anaos'              'project-011' → 'whatsapp-ai-agent'
'project-004' → 'equity'             'project-012' → 'gesture-control'
'project-005' → 'securabank'         'project-013' → 'nunna'
'project-006' → 'conquito-fundaciones' 'project-014' → 'dualface'
'project-007' → 'mapcriminals'       'project-015' → 'codereviewx'
'project-008' → 'llm-observatory'    'project-016' → 'portfolio-trimodal'
```

## Fondo unificado — `PortfolioBackground` (`js/background.js` + `css/background.css`)

**Un solo canvas para toda la página.** Sustituye a los dos sistemas anteriores, que ya
no existen: `#hero-canvas` + `HeroAnimations` (`js/animations.js`, eliminado) y
`SectionCanvas` (un canvas por sección, módulo #11 de `effects.js`, eliminado).

### Parallax real sin canvas gigante
Las partículas viven en **coordenadas de documento** y se dibujan restando
`scrollTop * factor`, sobre un canvas `position: fixed` del tamaño del viewport.
Visualmente equivale a un canvas del alto del documento (el campo scrollea contigo),
sin su costo: un canvas de 10.000px son ~76MB a DPR 1 y repintar 19M px por frame.
**No sustituir esto por un canvas de altura real** — además, un canvas de viewport
permite lo que uno gigante no: capas a distinta velocidad.

```js
const LAYER = { far: 0.45, mid: 0.75, near: 1.0 };
```
La capa `near` (factor 1.0) va pegada al contenido: es la única en la que un efecto
puede quedar alineado con una card mientras se scrollea.

### Efectos por modo
| Modo | Campo | Interacción con el cursor | Interacción con cards |
|------|-------|---------------------------|----------------------|
| `.dev` | Retícula técnica (paso 68px) + paquetes viajando por las aristas | Router: desvía los paquetes hacia él y revela más malla en un radio de 200px | Hover ilumina la parcela bajo la card; el click emite 4 paquetes desde su borde |
| `.ia` | Nodos púrpura/teal en deriva + señales por las aristas | Las conexiones **nacen bajo el puntero y se disuelven al alejarse** (radio 108px en reposo → 252px bajo el cursor); los nodos se acercan a él | Al abrir un proyecto, 18 nodos se reclutan sobre el perímetro de la card y un pulso lo recorre — la respuesta "se genera" de la red. `portfolio:projectClose` los suelta |
| `.sec` | Lluvia de chars atenuada (opacidad 0.08–0.20; antes llegaba a 0.45) + virus | Los virus huyen a <150px y se desintegran a <55px, con estallido de debris y fogonazo en la columna | — |

Acentos hardcoded en `ACCENT` / `ACCENT2` (mismo criterio que tenía `SectionCanvas`):
```js
dev: [59, 130, 246]   + [125, 211, 252] (paquetes brillantes)
ia:  [177, 78, 255]   + [6, 255, 165]   (teal)
sec: [0, 255, 65]     + [255, 0, 51]    (rojo de amenaza — virus)
```

### Zonas
Cada sección declara su intensidad en `ZONE_INTENSITY`; el campo es continuo pero
modula densidad/brillo según en qué sección cae cada punto. El hero es solo la zona
más intensa (1.0), no un fondo aparte.

### Stacking
```
html                background-color: var(--bg-primary)   ← el color base subió aquí
  body              background: transparent               ← si es opaco, tapa el canvas
    #bg-canvas      position: fixed; z-index: 0
    main, .footer   position: relative; z-index: 1
```
`.section--alt` usa `--bg-section-alt` (rgba con alfa ~0.30), no un color sólido.
Los vignettes `.section::before/::after` y el `mask-image` del canvas por sección
**se eliminaron**: existían solo para disimular la costura entre fondos independientes.

### Superficies glass
`--bg-card` sigue siendo **opaco** (lo usan dropdowns y menús flotantes, que no deben
transparentarse sobre el contenido). Las tarjetas usan variables aparte:
`--bg-glass`, `--bg-glass-hover`, `--bg-glass-input`, `--glass-blur`, `--glass-sat`,
definidas por tema. `background.css` las aplica a una lista explícita de superficies
(`.about-stat`, `.skill-card`, `.lab-card`, `.about-focus-card`, `.contact-link-item`,
`.social-link`, `.form-input`…) con `backdrop-filter`. Nunca a `.section` — sería un
blur a pantalla completa. `.sec` lleva más alfa y menos blur: sobre negro puro el
verde de la lluvia vibra detrás del texto.

### Performance
- Un único `requestAnimationFrame` para toda la página
- Culling por banda de viewport (±220px): fuera de ella no se integra ni se dibuja
- Hash espacial para las conexiones de `.ia` (`buildBuckets` + `eachPair`) — el
  código viejo hacía O(n²) *por sección*
- **Calidad adaptativa:** si el frame time medio supera 22ms durante 45 frames,
  baja un escalón (DPR → 0.75×, luego densidad 0.7 → 0.45). La densidad llega a
  todos los renderers, incluido el espaciado de columnas de `.sec` (el `fillText`
  de la lluvia es lo que domina el coste en ese modo)
- Pausa con `document.hidden`; `prefers-reduced-motion` dibuja **un solo frame** estático
- `vw` se mide con `documentElement.clientWidth` (excluye la barra de scroll, a
  diferencia de `innerWidth`)
- En táctil corre en modo **lite** (densidad reducida, sin conexiones dinámicas, sin
  `backdrop-filter`). Antes `SectionCanvas` simplemente no arrancaba en móvil; ahora
  este es el único fondo, así que apagarlo dejaría el hero plano

### Trampas conocidas
- **La lluvia de `.sec` se reparte por toda la banda visible al reciclarse**, no solo
  por encima. Al scrollear rápido se recicla media pantalla de columnas de golpe; si
  todas nacen arriba tardan cientos de frames en volver a entrar (~0.5px/frame) y la
  pantalla se queda vacía. El `col.fade` tapa la aparición a media altura.
- `scrollTop` se lee **antes** de medir las zonas en `init()`: la página puede cargar
  ya scrolleada y los rects saldrían desplazados.

## Convenciones CSS
- **Metodología:** BEM-like (`.section__element--modifier`)
- **Variables:** `--color-accent`, `--color-accent-rgb`, `--bg-card`, `--bg-secondary`,
  `--border-color`, `--text-primary`, `--text-muted`, `--font-display`, `--font-mono`
- `--font-mono` no existe como variable global → usar `var(--font-mono, monospace)`
- **IDs de sección:** kebab-case (`jonathan-panel`, `sec-terminal`, `cmd-palette`)
- **Clases de animación:** `animate-on-scroll`, `from-left`, `from-right`, `stagger-item`
- **`#bg-canvas`:** canvas único del fondo global — `position: fixed`, `z-index: 0`,
  primer hijo de `<body>`. No añadir fondos propios por sección: rompen la continuidad
- **`--bg-glass*` vs `--bg-card`:** glass para tarjetas, opaco para menús flotantes

## Imágenes
- Las fotos del avatar cambian por modo: `AVATAR_SRC` en `app.js`
- Screenshots de proyectos en `public/images/projects/<slug>/` — **formato WebP**
  (q80, máx. 1600px de ancho). Al agregar screenshots nuevos, convertirlos:
  `npx sharp-cli -i in.png -o out.webp -f webp -q 80 resize 1600 --withoutEnlargement`
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

- **API pública:** `PDFModal.init()` (llamado en `main.js`) · `PDFModal.open(url, label)` · `PDFModal.close()`
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

## JotAI — Mascot Widget (`ia-mascot.js` + `ia-bubble.js` + `ia-mascot.css` + `ia-worker.js` + `ia-tour.js`)

Widget flotante `position: fixed; bottom: 1.5rem; right: 1.5rem` visible en **todos los modos**.
Los colores heredan las CSS vars del tema activo (`--color-accent`, `--bg-secondary`, etc.)
— sin CSS adicional por modo.

### Arquitectura general

```
IaMascot.init()
  ├─ _inject()              → DOM del widget (2× SVG mascot + panel de chat)
  ├─ IaBubble.init()        → globo de diálogo anclado al trigger (ia-bubble.js)
  ├─ _entrance()            → peek "solo cabeza" + globo de bienvenida (1×/sesión)
  ├─ _startLife(svgEl)      → timers de parpadeo + mirada errante por instancia
  ├─ _initCursorTracking()  → pointermove en el panel → pupila sigue el cursor
  ├─ _initNudges()          → tips por sección (IntersectionObserver + dwell)
  ├─ jotai:kb-ready event   → _initWorker(docs) → ia-worker.js
  ├─ portfolio:modeChange   → closePanel() + saludo temático (1× por modo)
  ├─ command-palette:opened → estado listening (sin globo) + dismiss del globo
  └─ portfolio:projectClose → comentario corto del proyecto (via _maybeNudge)

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

Boca: un único `.jotai-mouth-path`; `d` cambia por `setAttribute` desde `_setState`.
Hay **dos juegos de coordenadas** según `MASCOT_RENDER` (`_MOUTH_IMAGE` sobre la boca
real del render 3D, centro ≈ (109,112) / `_MOUTH_VECTOR` para el blob, y≈141):
- `neutral` → `M100 108 Q109 117 119 107` (image) / `M89 141 Q100 150 111 141` (vector)
- `success`, `confused`, `thinking` — variantes en ambos juegos

### Cara viva en modo image (`.jotai-face`)
El render 3D trae la cara pintada, pero encima van **overlays vectoriales calibrados**
a los ojos LED del PNG — izq (62,73), der (135,69), boca (109,112):
- `.jotai-pupil-grp` — glow de pupila (radial gradient) que sigue `--px/--py`
  → parpadeo, mirada errante y cursor-tracking funcionan igual que en modo vector
- `.jotai-lid` — párpados metálicos (elipses, `scaleY(0)→1` con `.is-blinking`)
- `.jotai-mouth-mask` — parche color cara con `blur(1.4px)` (CSS) que tapa la
  sonrisa horneada del PNG para que los estados de boca no se dupliquen
Los accesorios de modo se dibujan **después** (encima) de la cara viva.

### Cuerpo por modo (renders 3D intercambiables)
`MODE_BODY_SRC` en `ia-mascot.js` mapea modo → `public/images/jotai/body-<modo>.webp`.
Al iniciar y en cada `portfolio:modeChange`, `_applyModeBody(mode)` hace un probe
(`new Image()`, resultado cacheado): si el render del modo existe se intercambia el
`href` con fade-out/in (clase `.is-swapping`) y `#jotai-widget.jotai-baked` oculta
los overlays SVG de accesorios; si no existe (404), fallback a `body.webp` + overlays.
Specs y prompts para generar los renders: `docs/jotai-renders.md`. Los renders nuevos
deben mantener la misma pose/encuadre que `body.png` (ojos y boca en las mismas coords).

`prefers-reduced-motion`: CSS apaga `.jotai-aura`, `.jotai-motes`, `.jotai-creature`, `.jotai-ear-l/r`
y todos los keyframes de estado. JS no inicia los timers de vida. Transiciones suspendidas.

### Presencia proactiva — speech bubbles (`ia-bubble.js`)

JotAI vive en la página y habla con **globos efímeros** anclados al trigger;
el chat solo se abre al hacer clic en el avatar (conversación bajo demanda).

**API:** `IaMascot.say(text, { duration, persist, mood, replace, onHidden })`
- Globo único con cola FIFO (máx. 3 en espera); `replace: true` descarta todo y muestra el nuevo
- Typewriter a 16ms/carácter con caret; instantáneo con `prefers-reduced-motion`
- Dismiss: botón ✕, clic fuera, o auto-timeout (`duration`, default 4500ms; `persist` lo desactiva)
- A11y: `role="status"` + texto completo en span `aria-live` oculto (el typewriter visible va `aria-hidden`)
- Suprimido si el panel está abierto o `IaTour.isActive()`; `mood` final (success/confused/…) 1.8s → idle
- En dev (`import.meta.env.DEV`): `window.IaMascot` expuesto para QA desde consola

**Entrada — peek "solo cabeza" (1×/sesión, `sessionStorage('jotai-welcomed')`):**
el trigger emerge con slide-up mostrando solo la cabeza del robot — clase `is-peeking`,
zoom CSS del mismo SVG (`scale(3.3) translateY(33%)` + `overflow: hidden`, calibrar ahí) —
y lanza el globo de bienvenida; al ocultarse el globo (`onHidden`) → encuadre normal + idle.
Reduced motion: sin peek ni slide, globo con texto instantáneo.

**Nudges contextuales (`_maybeNudge(key, text)`):** tip de sección tras **8s** de permanencia.
Detección por banda central del viewport (`rootMargin: '-40% 0px -40% 0px'` — funciona con
secciones más altas que la pantalla). Guardas anti-molestia:
- Cooldown global **45s** entre globos (`_lastSayAt` — la bienvenida también cuenta)
- Máx. **3 nudges/sesión** + 1 vez por `key` (sessionStorage `jotai-nudge-*`)
- Nunca con globo visible, panel abierto, tour activo u overlay
  (`body.style.overflow === 'hidden'` — gallery, PDF modal y palette lo activan)

**Reacciones a eventos:**
- `portfolio:modeChange` → saludo temático del modo, 1× por modo y por carga;
  el modo **inicial no saluda** (ThemeSwitcher emite modeChange al cargar)
- `command-palette:opened` → estado `listening` 2.6s sin globo + dismiss del activo
- `portfolio:projectOpen/Close` (emitidos por ProjectGallery) → comentario corto
  **al cerrar** la gallery (abierta tapa al globo: z 9990 > widget 9940)

### Panel de chat (bajo demanda)

Se abre **solo al hacer clic en el avatar**. El saludo se escribe únicamente en la
**primera apertura**; las siguientes conservan el historial y enfocan el input directo.
Nota CSS: `#jotai-panel[hidden] { display: none; }` es necesario — el `display: flex`
del ID le gana al `[hidden]` del UA stylesheet.

**Entrada:** campo de texto libre con placeholder. Sin chips de sugerencias predefinidas.

**Hint de ejemplo** — `<p class="jotai-hint" id="jotai-hint">`:
- Desaparece con transición suave (`opacity + max-height`) al primer mensaje enviado
- Se oculta añadiendo la clase `.gone`; función `_hideHint()` lo llama desde `_handleSend`

**Typewriter effect** — `_typewriterBotMessage(text)`:
- Escribe carácter a carácter a `TYPEWRITER_MS = 14ms` usando `textContent`
- Al terminar (o al ser abortado) convierte con `_md(text)` para renderizar markdown
- `_typeAbort = true` al enviar nuevo mensaje → termina instantáneamente el typewriter anterior
- `prefers-reduced-motion` → renderizado instantáneo sin animación

| Tipo de respuesta | Modo de renderizado |
|------------------|---------------------|
| Saludo (solo 1ª apertura) | Typewriter → `idle` + focus al terminar |
| Intent especial (perfil, listas, contacto) | Typewriter → `success` |
| Tarjeta proyecto / skill (HTML rico) | HTML instantáneo → `success` |
| Sin resultado | Typewriter → `confused` |
| Fin de tour | Typewriter → `success` |

Estado `talking` activo mientras el typewriter escribe (boca se mueve en CSS).

### Motor NLP híbrido
- **Siempre disponible:** búsqueda por keywords + intent detection (síncrona)
- **Cuando el worker está listo:** búsqueda semántica con `Xenova/all-MiniLM-L6-v2` (384 dims)
- **Umbral semántico:** `SEMANTIC_THRESHOLD = 0.10` en `ia-mascot.js` — piso bajo a propósito,
  es solo para entrar al pool de `rankHybrid`; el filtro real de calidad pasa ahí (ver abajo)
- **Intent detection short-circuits:** `personal`, `contact`, `experience`, `education` siempre;
  `list_projects`/`list_skills` **solo si la query no matchea también una entidad específica del
  KB por keyword** — si matchea (ej. "en qué tecnologías está hecho ubapp?" contiene la frase
  gatillo "que tecnologias"), se prioriza la búsqueda puntual sobre el listado genérico
  (`_query()` en `ia-assistant.js`)
- **Status bar:** muestra progreso real de descarga/indexado; `"Listo (caché ⚡)"` en visitas siguientes

### Ranking híbrido (`rankHybrid()` en `ia-assistant.js`)
Combina `keywordScore` (Jaccard-like, overlap/queryTokens.length + bonus por slug/título exacto),
`semanticScore` (cosine similarity cruda del worker) y `tagScore` (overlap de entidades vs tags),
con pesos **0.45 / 0.30 / 0.15** + `contextBoost` **0.10**. El mejor candidato necesita
`finalScore ≥ 0.15` para aceptarse; si no, devuelve `null` → dispara el fallback de IA.

**Los tres scores se usan tal cual (sin renormalizar min-max dentro del pool).** Hubo un bug
real donde se normalizaba min-max sobre el pool de candidatos antes de aplicar los pesos — con
pools chicos (2-5 candidatos, el caso típico) eso manda siempre al mejor candidato a ~1.0 sin
importar qué tan débil sea en términos absolutos, así que un query sin relación real con el KB
(ruido semántico ~0.2-0.35 de similitud cruda) terminaba "ganándole" al umbral de aceptación
solo por ser el menos malo del lote. No reintroducir esa normalización.

**Trampas del matching por keyword** (`_scoreKeywordCandidates` + `_matchAny`), ya corregidas —
tenerlas presentes al tocar esta lógica:
- `_projectKeywords(p)` **no** indexa `p.description` como keywords — es prosa libre y cualquier
  palabra común no filtrada por `_STOP` (ej. "algo") terminaba siendo un "keyword" que matcheaba
  casi cualquier query. La similitud con la descripción la cubre la búsqueda semántica
  (`_projectEmbedText`), no el índice de keywords.
- `_matchAny(norm, terms)` exige `término.length >= 3` para el match por substring — sin ese piso,
  keywords cortos como `"js"` matcheaban dentro de cualquier token que los contuviera (`"next.js"`
  "contiene" `"js"`, haciendo que esa query devolviera Node.js, Vue.js y otros proyectos ajenos).

### Knowledge Base
La KB se construye dinámicamente en `ia-assistant.js`:
- `_buildKB()` → fetcha `personal.json`, `dev-projects.json`, `ia-projects.json`,
  `sec-projects.json`, `skills.json` → 25 proyectos + 29 skills + 2 docs especiales
- Docs `project` y `skill` tienen campo `text` para embedding
- Se emite `jotai:kb-ready` con los docs embeddables cuando la carga termina

### Fallback de IA (`api/jotai-chat.js`)
Cuando ni keywords ni semántica encuentran nada (`rankHybrid` devuelve `null`), en vez del
mensaje enlatado local (`_buildCannedFallback`) se intenta primero una respuesta generada por
IA — `_askAiFallback(query, fallbackResult)` en `ia-mascot.js` llama a este endpoint server-side
para no exponer la API key al cliente.

- **Proveedor:** OpenAI (`gpt-5.4-mini`) vía `MonitoredOpenAI` de `@llm-observatory/sdk` — key en
  `OPENAI_API_KEY` (Vercel: Production + Preview + **Development**, esta última hace falta
  aparte para que `vercel dev` la levante; también sirve en `.env.local`)
- **Por qué OpenAI y no Gemini:** se intentó primero Gemini, pero en su momento `MonitoredGemini`
  solo existía en el `main` sin publicar de `@llm-observatory/sdk` — ya no aplica (ver nota de
  versión abajo) pero no se reconsideró el proveedor
- **`@llm-observatory/sdk` en `^1.1.0`:** hasta esta versión, el paquete publicado en npm (v1.0.0)
  solo mandaba `prompt_preview` (200 chars) a Observatory — el historial completo
  (`prompt_full`/`system_prompt`/`response_full`/`tool_calls`/`stop_reason`) y `MonitoredGemini`
  solo existían en el `main` del repo del SDK, sin publicar. Se republicó como v1.1.0 (bump desde
  `main`, sin las clases `MonitoredGrok`/`MonitoredKimi` que en ese momento seguían en una branch
  de feature sin mergear) — instalar directo desde GitHub con `github:owner/repo#path:subdir` **no
  funciona en la práctica**: probado en 4 variantes de sintaxis, npm nunca extrae el subdirectorio
  y termina instalando el monorepo completo como si fuera el paquete (bug/limitación real del
  fetch de npm, más allá de que `npm-package-arg` parsee el campo `gitSubdir` correctamente en
  aislado — no usar esa ruta, republicar a npm es la única opción confiable).
- **Observabilidad:** cada llamada reporta tokens/costo/latencia/prompt completo a LLM Observatory
  (mismo backend que lee `api/llm-stats.js` — ver abajo), taggeada
  `{ source: 'portfolio-jotai', resolved: 'ai_fallback' }`. Env vars `LLM_OBSERVATORY_API_URL`/
  `_API_TOKEN` — si faltan, el reporte falla en silencio y la respuesta de OpenAI no se ve
  afectada. Los matches locales de JotAI (sin llamada a LLM) se reportan aparte desde
  `api/jotai-log.js` — ver "Historial de JotAI" abajo
- **Contrato:** `SYSTEM_INSTRUCTION` obliga a responder solo con lo que venga en el `CONTEXTO`
  (candidatos del fallback multinivel) — nunca inventa datos que no estén ahí
- Si Gemini/OpenAI falla o da timeout (8s), cae al mensaje enlatado local — el fallback nunca
  rompe el chat

### Historial de JotAI en LLM Observatory (`api/jotai-log.js`)
Complementa el reporte automático de `api/jotai-chat.js`: cubre el único camino de JotAI que
antes no dejaba rastro en ningún lado — las consultas que `rankHybrid()` resuelve localmente
(keywords/semántica), sin llamar nunca a un LLM. `ia-mascot.js` (`_handleSend`, rama de match
local) manda un POST fire-and-forget con `{ query, matchedIntent, latencyMs }`; el endpoint
relaya server-side a `POST {LLM_OBSERVATORY_API_URL}/api/metrics` con `provider: 'openai'`
(nominal, el enum lo exige) y `model: 'jotai-local-match'` (deliberadamente no-facturable y
distinguible en el dashboard), `cost_usd`/tokens en 0, y `tags: { source: 'portfolio-jotai',
resolved: 'local', intent }`. No se usa para las ramas `ai_fallback`/`canned_fallback` — esas ya
quedan cubiertas por `api/jotai-chat.js` (evita filas duplicadas por una misma consulta).

### `api/llm-stats.js` — widget de tokens del hero (modo `.ia`)
Proxy server-to-server hacia el mismo LLM Observatory (org-wide, no solo JotAI) para el widget
`ia-tokens-widget.js` del hero — trae el total agregado de tokens de todos los proyectos
monitoreados. Sin relación directa con el fallback de JotAI más allá de compartir backend.

### Tour guiado (`ia-tour.js`) — trayectoria + los 3 MODOS
5 pasos globales (no por modo): los pasos de modo **cambian de modo de verdad**
(`ThemeSwitcher.switchMode`) y muestran el grid de proyectos de ese modo:

| Paso | Modo | Demo |
|------|------|------|
| 1 | actual | Drawer de trayectoria — transversal, sin cambio de modo (evento `portfolio:syncTrayectoria`; cierra con clic en `#jonathan-panel-close`) |
| 2 | `.dev` | Scroll a `#projects` + highlight del grid (proyectos full-stack) |
| 3 | `.ia`  | Scroll a `#projects` + highlight del grid (proyectos de IA) |
| 4 | `.sec` | Scroll a `#projects` + highlight del grid (labs y writeups) |
| 5 | —      | Cierre: **restaura el modo inicial** del usuario + invita al chat |

- API: `IaTour.start({ onState, onDone })` (acepta el legacy `start(mode, opts)`)
- Saltar/Esc en cualquier paso → cierra la demo activa y restaura el modo inicial
- Demos asíncronas con token (`_seq`): cambiar de paso rápido no deja callbacks zombis
  (espera `MODE_SETTLE_MS = 650ms` tras cada switchMode)
- **Sin velo**: las demos quedan interactivas; overlay en `z-index: 10600`
  (sobre el PDF modal 10500) con `pointer-events: none` salvo el tooltip
- El handler de teclado ignora eventos con foco en INPUT/TEXTAREA (la terminal usa Enter)
- Los `modeChange` del tour no disparan el saludo temático de JotAI (`IaTour.isActive()`)
- Botón "Tour 🗺" siempre visible en el header del panel; al finalizar JotAI reabre el panel

### IndexedDB cache de embeddings
`ia-worker.js` almacena los vectores precomputados en IDB con clave = hash FNV-1a
de los IDs + texto de cada doc. En visitas subsiguientes la KB está lista casi al instante.
El hash cambia automáticamente al añadir proyectos → recomputa sin intervención manual.

### GSAP — eliminado
GSAP ya **no se carga** (se quitó el CDN de `index.html`). La animación de apertura/cierre
del panel de JotAI — su único uso — ahora es CSS: clases `is-opening`/`is-closing` en
`#jotai-panel` con keyframes `jotai-panelIn/Out` en `ia-mascot.css`. Si se necesita GSAP
en el futuro, instalarlo como dependencia npm en lugar de CDN.

### Carga diferida del worker en touch
En dispositivos `pointer: coarse` el worker de embeddings (~23MB WASM + modelo) **no se
descarga al cargar la página**: `jotai:kb-ready` guarda la KB en `_pendingKB` y
`openPanel()` inicia el worker la primera vez que el usuario abre el chat. Mientras
tanto responde el fallback por keywords. En desktop el comportamiento no cambia.

### Vite config
`optimizeDeps.exclude: ['@huggingface/transformers']` — necesario para que los
archivos WASM de ONNX Runtime se resuelvan correctamente en el worker.
Worker bundleado en `dist/assets/ia-worker-*.js` (~519KB).
WASM del runtime en `dist/assets/ort-wasm-simd-threaded.asyncify-*.wasm` (~23MB, cacheado).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
