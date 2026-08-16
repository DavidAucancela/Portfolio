# AGENTS.md

Portfolio personal de Jonathan Aucancela. HTML/CSS/JS vanilla + Vite. Todo el copy de UI está en **español**.

## Commands

```bash
npm install          # install deps
npm run dev          # dev server at localhost:3000 (HMR, auto-opens browser)
npm run build        # production build → dist/
npm run preview      # preview the build
```

No tests, no lint, no typecheck. The `.eslintrc.json` is a leftover from a Next.js scaffold — ignore it. CI only runs `npm run build` + Lighthouse.

## Vite gotchas

- `publicDir: false` in `vite.config.js`. A custom plugin copies `data/`, `public/`, and `assets/` into `dist/` at build time.
- Image paths in JS must use `"public/images/..."` prefix (not `"/images/..."`). The dev server and built output both resolve from the project root.
- `optimizeDeps.exclude: ['@huggingface/transformers']` is required for WASM loading in the web worker.
- The build output is a static site — no SSR. The only server-side logic is `api/jotai-chat.js`, a Vercel serverless function (Gemini call for JotAI's fallback response, keeps `GEMINI_API_KEY` off the client).
- To test the serverless function locally: run `vercel dev --listen 3001` in a second terminal alongside `npm run dev` — the Vite proxy forwards `/api/*` to `localhost:3001`.

## Architecture

Three modes (`dev` | `ia` | `sec`) swap content, colors, and visible sections. Active mode stored in `localStorage('portfolio-mode')` and `document.body.dataset.theme`.

Modules follow IIFE-exported-object pattern:
```js
export const ModuleName = (() => { function init() { ... } return { init }; })();
```

Entry: `js/main.js` → imports all modules → calls `.init()` on each.

Project data loaded at runtime via `fetch(`data/${mode}-projects.json`)` — not bundled.

## Adding a project

1. Add entry to the appropriate JSON in `data/` (`dev-projects.json`, `ia-projects.json`, or `sec-projects.json`)
2. Add corresponding entry to `EXPERIENCE_DATA` in `js/sections.js` (powers the trajectory drawer)
3. Screenshots go in `public/images/projects/<slug>/` as WebP (q80, max 1600px wide)
4. Use `_src(path)` helper in `project-gallery.js` to encode paths with special characters

## Deploy

Vercel auto-deploys on push to `main`. Manual deploys via `deploy.yml` workflow. `railway.json` exists as an alternative deploy target.

## Language

All UI text is Spanish. If adding user-facing text, keep it in Spanish. `js/lang.js` handles ES/EN switching.
