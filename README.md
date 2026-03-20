# Jonathan.dev — Portfolio

Portfolio personal de **Jonathan David Aucancela** — Software Engineer, IA Developer y Security Researcher.

**URL:** [davidaucancela.github.io/Portfolio](https://davidaucancela.github.io/Portfolio/)

## Stack Tecnológico

- **HTML5 + CSS3 + JavaScript vanilla** — sin framework, sin build step
- **Deploy:** Vercel (`@vercel/static`)
- **Fuentes e íconos:** Google Fonts + SVG personalizados

## Ver el proyecto

Abrir `index.html` directamente en el navegador, o usar un servidor estático:

```bash
npx serve .
# o
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

## Modos del portfolio

El portfolio tiene tres modos que cambian contenido, colores y secciones visibles:

| Modo | Foco |
|------|------|
| `dev` | Software Engineer — proyectos y stack técnico |
| `ia` | IA Developer — asistente integrado y proyectos de ML/LLM |
| `sec` | Security Researcher — proyectos y habilidades de ciberseguridad |

## Secciones

- **Hero** — presentación dinámica según modo activo
- **About** — bio, stats, focus card
- **Projects** — grid de proyectos renderizado desde `data/projects.json`
- **Skills** — grid de habilidades técnicas
- **IA Assistant** — chat integrado (solo modo `ia`)
- **Contact** — formulario y redes sociales
- **Jonathan Panel** — drawer lateral con Trayectoria Interactiva (línea de tiempo)

## Licencia

MIT
