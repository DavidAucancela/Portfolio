# Jonathan.dev — Portfolio

Portfolio personal de **Jonathan David Aucancela** — Software Engineer, IA Developer y Security Researcher.

**URL:** [davidaucancela.github.io/Portfolio](https://davidaucancela.github.io/Portfolio/)

## Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript (strict)
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Iconos:** Lucide React + Devicons CDN
- **Analytics:** Vercel Analytics & Speed Insights
- **Deployment:** GitHub Pages / Vercel

## Levantar el servidor

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:3000)
npm run dev
```

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run lint       # ESLint
npm run type-check # TypeScript check
```

## Estructura del proyecto

```
app/                    # Next.js App Router
  layout.tsx            # Layout raíz
  page.tsx              # Home (Hero, Proyectos destacados, Habilidades)
  projects/page.tsx     # Listado de proyectos con filtros
  projects/[slug]/      # Detalle de proyecto
  about/page.tsx
  contact/page.tsx
components/             # Componentes reutilizables
  Navigation.tsx
  CommandPalette.tsx    # Paleta de comandos (Ctrl+K / ⌘K)
  ScrollProgress.tsx
  sections/             # Hero, Projects, Skills
  ui/                   # Button, Card, Container
data/
  projects.json         # Proyectos (ubapp, ideancestral, anaos, etc.)
  personal.json         # Datos personales y redes sociales
  skills.json           # 35+ habilidades en 6 categorías
lib/
  api.ts                # Acceso a datos (getAllProjects, getProjectBySlug…)
  utils.ts              # Utilidades (cn, formatDate…)
types/index.ts          # Interfaces TypeScript
public/images/projects/ # Capturas de proyectos
```

## Categorías de proyectos

| Categoría | Descripción |
|-----------|-------------|
| `P1` | Principal / Destacado |
| `P2` | Proyecto secundario |
| `P3` | Práctica / Aprendizaje |

## Licencia

MIT
