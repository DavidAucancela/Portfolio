# Widgets extra en el hero por modo (dev / ia / sec)

PR: [#38](https://github.com/DavidAucancela/Portfolio/pull/38) — rama `feat/hero-mode-widgets`.

Cada modo del hero (`.dev` / `.ia` / `.sec`) tiene ahora un panel adicional, sibling
de `.hero-content` dentro de `#hero .container`, con el mismo lenguaje visual que ya
usaba `.sec-terminal` (barra tipo ventana con puntos de semáforo + título, blur,
mismo ancho/sombra/animación de entrada).

## Estado: hecho

### `.dev` — Git Activity (`js/git-history.js` + `css/git-history.css`)

- Heatmap de commits/contribuciones, 12 semanas, con labels de mes (arriba) y día
  (izquierda) para que se entienda que es una vista semanal.
- 3 cards de stats junto al heatmap: **Pull Requests**, **Commits**, **Proyectos**.
- Historial de PRs recientes debajo, cada uno linkeando al PR real en GitHub.
- Fuente de datos con fallback en 3 niveles:
  1. **Heatmap**: `api/github-contributions.js` (GraphQL `contributionsCollection`,
     requiere `GITHUB_TOKEN`) → si no está configurado o falla, cae a
     `data/git-history.json` (commits locales de este repo, generado en build-time).
  2. **PRs + cards de Commits/PRs**: `api/github-stats.js` (REST Search API +
     header `Link` de `/commits`, **no requiere token** para repos públicos) → si
     falla, cae a los PRs parseados de `git log` local en build-time.
  3. **Card de Proyectos**: siempre desde build-time, cuenta las entradas de
     `data/dev-projects.json` + `ia-projects.json` + `sec-projects.json` (33 hoy).
- `vite.config.js`: plugin `gitHistoryPlugin` corre en `buildStart` (build) y
  `configureServer` (dev) — regenera `data/git-history.json` con commits por día,
  PRs parseados de mensajes `(#N)`/`Merge pull request #N`, conteo total de commits
  (`git rev-list --count HEAD`) y conteo de proyectos.

### `.ia` — Total de tokens (`js/ia-tokens-widget.js` + `css/ia-tokens-widget.css`)

- Panel con el total de tokens procesados por LLM Observatory, contador animado
  tipo odómetro al entrar al modo.
- `api/llm-stats.js`: proxy serverless hacia `LLM_OBSERVATORY_API_URL` (+
  `LLM_OBSERVATORY_API_TOKEN` opcional) — evita CORS/401 de llamar la API real
  directo desde el navegador (confirmado: el endpoint público devuelve 401 sin auth).
- Sin las env vars configuradas, responde `{ totalTokens: null, mock: true }` y el
  widget muestra `···` / "sincronizando…" sin romper el layout.

### `.sec` — Terminal mejorada (`js/sec-terminal.js` + `css/sec-terminal.css`)

- Comandos nuevos: `neofetch`, `history`, `whois`, más entradas en `cat`
  (`skills.md`, `contact.md`).
- Autocompletado con `Tab` sobre comandos y nombres de archivo.
- Cursor con blink más realista vía CSS (`caret-shape: block` + keyframe),
  respeta `prefers-reduced-motion`.

### Correcciones aplicadas tras revisión automática de código

- Guards defensivos: `calendar.weeks`/`contributionDays` pueden venir `undefined`
  desde la API de GitHub (`api/github-contributions.js`); `data` de `/api/llm-stats`
  se normaliza a `{}` antes de leer campos (`js/ia-tokens-widget.js`); `localRes.ok`
  se valida antes de parsear `data/git-history.json` (`js/git-history.js`).
- Todos los bloques `catch` ahora loguean el error real (`console.error`/`console.warn`)
  en vez de tragárselo en silencio — necesario para depurar en los logs de Vercel.
- Se descartaron ~20 hallazgos del bot de revisión por ser falsos positivos: el
  repo usa `"type": "module"` en `package.json` (ESM funciona en `api/*.js` y
  `js/*.js`, patrón ya usado por `api/jotai-chat.js` preexistente), y varias
  observaciones sobre `sec-terminal.js`/`vite.config.js` señalaban código que ya
  tenía el guard correspondiente o era comportamiento intencional documentado
  en comentarios.

**Nota de seguridad:** durante la exploración inicial de este trabajo, un subagente
detectó intentos de inyección de prompt en resultados de herramientas (falsos
"system-reminders" pidiendo ejecutar un comando `graphify` inexistente antes de
cada lectura de archivo). Se ignoraron consistentemente; no afectaron el código
ni las decisiones tomadas.

## Estado: pendiente / a decidir

1. **Commit + push de las correcciones del punto anterior.** Ya están aplicadas
   en el working tree (`api/github-contributions.js`, `api/github-stats.js`,
   `api/llm-stats.js`, `js/git-history.js`, `js/ia-tokens-widget.js`,
   `vite.config.js`, `data/git-history.json` regenerado) pero no están commiteadas
   ni pusheadas al PR #38 todavía.

2. **Configurar en Vercel** (ninguna es bloqueante — todo tiene fallback):
   - `GITHUB_TOKEN` — PAT clásico **sin scopes** (o fine-grained read-only), solo
     para que el heatmap de `.dev` muestre contribuciones de **todo tu perfil**
     de GitHub en vez del fallback local (solo este repo). Opcionalmente
     `GITHUB_USERNAME` si no es `DavidAucancela`.
     - El mismo `GITHUB_TOKEN` (o uno separado) también sirve para
       `api/github-stats.js`, aunque ese endpoint funciona sin token — solo lo
       usa para evitar el rate-limit bajo (10 req/min) de la Search API pública.
     - Opcional: `GITHUB_REPO` si el repo del portfolio cambia de nombre/owner
       (default: `DavidAucancela/Portfolio`).
   - `LLM_OBSERVATORY_API_URL` + `LLM_OBSERVATORY_API_TOKEN` (si aplica) — para
     que el widget de `.ia` muestre el total de tokens real en vez de
     "sincronizando…". Endpoint real de LLM Observatory todavía no confirmado/
     provisto (se probó `https://llm-web-production.up.railway.app/api/stats`,
     devuelve 401 — hace falta el endpoint correcto y su método de auth).

3. **Merge del PR #38** una vez estén las correcciones pusheadas y, si se desea,
   las env vars configuradas (aunque el merge no depende de esto — todo degrada
   con gracia sin ellas).

4. **Pendientes preexistentes del repo** (no relacionados a este trabajo, ya
   documentados en `CLAUDE.md` → sección "Pendientes manuales"): reemplazar
   `assets/images/og-preview.svg` por un PNG real 1200×630, y actualizar la URL
   canónica en `index.html` al dominio real de Vercel.
