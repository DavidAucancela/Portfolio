# Portfolio Project — CLAUDE.md

## Project Overview
Portfolio personal de Jonathan Aucancela. Todo el copy de UI está en **español**.

- **Stack:** HTML5, CSS3, JavaScript vanilla (sin framework, sin build step)
- **Deploy:** Vercel static (`@vercel/static`)
- **Path:** `C:\Users\david\Portfolio`

## Cómo ver el proyecto
Abrir `index.html` directamente en el navegador, o usar cualquier servidor HTTP estático:
```bash
npx serve .          # con Node instalado
python -m http.server 8080
```

## Estructura
```
index.html            # Página principal (única)
404.html              # Página de error
css/
  main.css            # Variables, reset, layout base, tipografía
  sections.css        # Estilos por sección (hero, about, projects, skills, contact)
  animations.css      # Keyframes y clases de animación
  polish.css          # Detalles visuales, jonathan-panel, trayectoria interactiva
  themes/             # Overrides por modo (dev, ia, sec)
js/
  main.js             # Init global, jonathan-panel, formulario de contacto
  sections.js         # Renderizadores por sección (EXPERIENCE_DATA, ABOUT_DATA, etc.)
  projects.js         # Renderizado de tarjetas de proyectos
  animations.js       # Scroll observer, animaciones de entrada
  effects.js          # Efectos visuales, parallax, partículas
  theme-switcher.js   # Cambio entre modos dev / ia / sec
  lang.js             # Internacionalización ES/EN
  section-nav.js      # Navegación lateral por secciones
  ia-assistant.js     # Asistente IA (solo modo .ia)
data/
  projects.json       # 6 proyectos con proceso, métricas, links
  personal.json       # Nombre, bio, email, redes, timeline
  skills.json         # Skills por categoría
  hero.json           # Contenido del hero por modo
assets/               # Fuentes, íconos SVG
public/               # Imágenes (foto, screenshots de proyectos)
vercel.json           # Config deploy estático
```

## Arquitectura & Patrones clave

**Sin build step:** Todo se carga directamente en el navegador. Los JS se cargan en orden al final del `<body>`.

**Módulo IIFE:** Cada JS usa patrón IIFE con API pública:
```js
const Sections = (function() {
  // ...
  return { init, render, renderExperience };
})();
```

**Modos del portfolio:** `dev` | `ia` | `sec` — cambian contenido, estilos y secciones visibles.
```js
window.dispatchEvent(new CustomEvent('portfolio:modeChange', { detail: { mode } }));
```

**Eventos custom para desacoplamiento:**
```js
window.dispatchEvent(new CustomEvent('portfolio:modeChange', { detail: { mode } }))
window.dispatchEvent(new CustomEvent('command-palette:open'))
```

**Jonathan Panel:** Drawer lateral (derecho) que se abre al clic en "Jonathan" del nav.
Contiene la **Trayectoria Interactiva** — dos columnas: lista de fases (izquierda) + panel de detalle (derecha).

## Secciones en index.html
- `#hero` — presentación con modos
- `#about` — bio, stats, focus card
- `#projects` — grid de proyectos (renderizado por `projects.js`)
- `#skills` — grid de habilidades técnicas
- `#ia-assistant-section` — solo visible en modo `.ia`
- `#contact` — formulario y redes
- `#jonathan-panel` — drawer de trayectoria (fuera del `<main>`)

## Datos
- JSON en `data/` se usan directamente como archivos estáticos (sin fetch en runtime)
- Los datos están embebidos en los JS (`EXPERIENCE_DATA`, `ABOUT_DATA`, `SKILLS_DATA`)

## Convenciones
- **CSS:** BEM-like (`.section__element--modifier`)
- **Variables CSS:** `--color-accent`, `--color-text`, `--bg-card`, `--font-display`, `--font-mono`
- **IDs de sección:** kebab-case (`jonathan-panel`, `timeline-container`)
- **Clases de animación:** `animate-on-scroll`, `from-left`, `from-right`, `stagger-item`

## Imágenes
- Foto de Jonathan: `/public/Foto2.jpeg`
- Screenshots de proyectos: `/public/images/projects/<slug>/`
