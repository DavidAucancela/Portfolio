# Portfolio Project (PP) — CLAUDE.md

## Project Overview
Personal portfolio website for Jonathan Aucancela. All UI copy is in **Spanish**.

- **Framework:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Framer Motion
- **Path:** `C:\Users\david\Personal\PP`

## Commands
```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Project Structure
```
app/                    # Next.js App Router
  layout.tsx            # Root layout (Navigation, Footer, CommandPalette, ScrollProgress)
  page.tsx              # Home (Hero, Featured Projects, Skills)
  projects/page.tsx     # Projects listing with category filters
  projects/[slug]/page.tsx  # Dynamic project detail page
  about/page.tsx
  contact/page.tsx
components/             # Reusable components (PascalCase)
  Navigation.tsx        # Sticky nav with mobile menu & ⌘K search trigger
  CommandPalette.tsx    # Ctrl+K / ⌘K command palette
  ScrollProgress.tsx    # Fixed top glowing scroll progress bar
  ProjectCard.tsx
  sections/Hero.tsx, Projects.tsx, Skills.tsx
  ui/Button.tsx, Card.tsx, Container.tsx
data/
  projects.json         # 6 projects (ubapp, ideancestral, anaos, equity, securabank, conquistador)
  personal.json         # Name, bio, email, social links
  skills.json           # 35 skills across 6 categories
lib/
  api.ts                # Data access (getAllProjects, getProjectBySlug, etc.)
  utils.ts              # cn(), formatDate(), formatDateRange()
types/index.ts          # Project, Skill, PersonalInfo interfaces
public/images/projects/ # Local project screenshots
```

## Architecture & Key Patterns

**Server vs Client Components:**
- Default: server components (layout, pages, Footer)
- Mark with `'use client'` when needed (Navigation, CommandPalette, ScrollProgress, interactive sections)

**Data Flow:**
- Static JSON → `lib/api.ts` → Components (all build-time bundled, no API calls)
- Import JSON directly in client components (bundled at build time)

**Custom Event Decoupling:**
```ts
// Fire from Navigation button to open CommandPalette without direct coupling
window.dispatchEvent(new CustomEvent('command-palette:open'))
```

**Dynamic Routes:**
- `[slug]` pages use `generateStaticParams()` for static generation

**Animations:** Framer Motion throughout — `motion` components, `AnimatePresence`, `whileInView`, `initial/animate/exit`

## Design System
- **Primary color:** `#0066FF` (Tailwind: `primary`, CSS var: `--color-primary`)
- **Secondary:** `#1A1A1A`
- **Fonts:** Inter (body), Poppins (display)
- **Tailwind custom classes:** `text-primary`, `bg-primary`, `hover:bg-primary-dark`

## Project Categories
- `P1` — Principal/Destacado (featured)
- `P2` — Proyecto (secondary)
- `P3` — Práctica (learning)

## TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Key interfaces: `Project`, `Skill`, `PersonalInfo`, `SkillCategory`
- Component prop interfaces suffixed with `Props`

## Naming Conventions
- **Components:** PascalCase (`ProjectCard.tsx`)
- **Pages:** lowercase (`page.tsx`, `[slug]`)
- **Utilities/data:** lowercase (`api.ts`, `projects.json`)
- **Custom events:** kebab-case with namespace (`command-palette:open`)

## Images
- Local: `/public/images/projects/<project-name>/`
- External domains configured in `next.config.js`: `images.unsplash.com`, `via.placeholder.com`

## No Tests
No Jest/Vitest configured. Use `npm run lint` and TypeScript strict mode for validation.
