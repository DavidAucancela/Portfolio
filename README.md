# Jonathan Aucancela — Portfolio

Personal portfolio of **Jonathan David Aucancela** — Software Engineer · AI Developer · Security Researcher.

**Live:** [davidaucancela-portfolio.vercel.app](https://davidaucancela-portfolio.vercel.app/)

## Four modes, one page

The site re-themes itself around the profile you pick. The mode is saved in `localStorage` and changes the content, colors, projects, animated background and the hero widget.

| Mode | Profile | Hero widget |
|------|---------|-------------|
| `dev` | Software Engineer | Git activity: commit heatmap + merged PR history |
| `ia` | AI Developer | LLM token counter from LLM Observatory |
| `sec` | Security Researcher | Interactive terminal (and a "system breach" to repair from it) |
| `gam` | Playable room | "Insert coin" prompt → isometric room with 10 objects and minigames |

## Stack

- Vanilla JavaScript (ES modules) + CSS, bundled with **Vite**
- **Phaser 3** for the `gam` room, lazy-loaded on first click
- **transformers.js** (MiniLM) in a Web Worker for semantic search
- **Vercel** for hosting and serverless functions (`api/`); Vercel Analytics + Speed Insights
- **OpenAI** as JotAI's fallback, reported through `@llm-observatory/sdk`

## Features

- **JotAI** — floating mascot: speech bubbles, section tips, guided tour and a chat backed by local hybrid search (keywords + embeddings), falling back to an LLM
- **Command palette** (`Cmd/Ctrl+K`) — navigation, mode switching, projects, actions
- **Project gallery**, **trajectory drawer** and inline **CV/PDF viewer**
- **One animated canvas** behind the whole page, different per mode and reactive to the cursor
- **ES / EN** interface

## Run locally

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev                  # http://localhost:3000 (Vite takes the next free port if busy)
npm run build                # production build in dist/
```

Vite alone does **not** serve `api/*` — use `vercel dev` when you need JotAI's fallback or the hero widgets' live data.

| Variable | Used by | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | JotAI LLM fallback (`api/jotai-chat.js`) | No — falls back to a canned reply |
| `ALLOWED_ORIGIN` | Restricts who can call `api/jotai-chat.js` | No |
| `LLM_OBSERVATORY_API_URL`, `LLM_OBSERVATORY_API_TOKEN` | Usage reporting + the `ia` token widget | No |
| `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPO` | Full-profile heatmap and PRs in the `dev` widget | No — falls back to local git history |

## Layout

```
index.html        single page
css/              base, sections, per-mode themes (themes/), widgets, background
js/               ES modules; js/gam/ holds the Three.js room, its stations and JotAI in 3D
api/              Vercel serverless functions
data/             projects (dev/ia/sec), skills, personal info — fetched at runtime
public/           images, project screenshots, certificates, CV
docs/             design notes (gam mode, JotAI in the room, hero widgets, JotAI renders)
```

Project cards come from `data/{dev,ia,sec}-projects.json`; text fields can be `{ "es": …, "en": … }`.

## Deploy

Vercel auto-deploys on push to `main` (`.github/workflows/deploy.yml`). CI runs from `ci.yml`; performance is tracked with Lighthouse CI (`.lighthouserc.json`).

Detailed architecture notes and gotchas live in [`CLAUDE.md`](CLAUDE.md).
