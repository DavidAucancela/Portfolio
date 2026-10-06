# KOS → Portfolio: sincronización de proyectos vía GitHub

> **Estado:** diseño, sin implementar. Escrito el 2026-10-06 para aplicarlo más adelante.
> **Objetivo:** que KOS detecte los cambios de cada proyecto en GitHub y mantenga
> actualizado su estado y contenido en el portfolio, sin que el portfolio dependa de KOS
> en tiempo de ejecución.

---

## 1. Contexto

- El portfolio es estático (Vite + Vercel). Los proyectos viven en
  `data/{dev,ia,sec}-projects.json`; la trayectoria en `EXPERIENCE_DATA` (`js/sections.js`).
  Hoy todo se actualiza a mano.
- Ya existe una integración parcial con GitHub: `api/github-stats.js` lee el `repoUrl` de
  cada proyecto y trae PRs mergeados en vivo para el widget del hero (`.dev`).
- **KOS ya no es solo local:** corre en modo administrado (Railway + Supabase + Neo4j Aura
  + R2) con un worker por cron, **así que la API se duerme** entre ejecuciones (arranques en frío).
  Piezas de KOS que se reutilizan:
  - Conector **Git** con *polling sync*
  - **Recommender**: reacciona a cambios del grafo, deduplica por firma, aprende de accept/dismiss
  - Agente **Writing** (puede usar un LLM en la nube si se activa)
  - **MCP**: 16 herramientas, entre ellas GitHub; las de escritura exigen `confirm=true` a
    través de una puerta de permisos real
  - UI con panel de Status y recomendaciones

## 2. Decisión de arquitectura: KOS empuja, el portfolio no pregunta

```
commit / release en un repo de proyecto
  → KOS Git connector (polling) → cambio en el grafo (Neo4j)
  → Recommender: recomendación "portfolio_sync" (deduplicada por firma)
  → Writing: redacta el cambio sobre data/*-projects.json ({es,en})
  → David hace accept en KOS (Status → recomendaciones)
  → herramienta GitHub (confirm=true): rama + commit + PR en DavidAucancela/Portfolio
  → David hace merge → Vercel despliega solo
```

**Por qué no un fetch del portfolio a KOS en cada visita:**
- La API de KOS se duerme, así que la primera visita pagaría el arranque en frío.
- Si se cae Railway, Aura o Supabase, la sección de proyectos queda rota.
- Con PRs, el historial de git audita cada cambio y nada redactado por un LLM se publica sin revisión.
  Va en la misma línea que KOS: el LLM nunca aprueba sus propias escrituras.

**Opción complementaria (opcional):** para datos objetivos que cambian seguido (último
commit, nro. de commits) se puede agregar `api/project-activity.js` en el portfolio,
consultando GitHub directo (no a KOS), con caché CDN
(`s-maxage=3600, stale-while-revalidate`) y respaldo al JSON estático. Mismo patrón que
`api/github-stats.js`.

## 3. Qué detecta y qué propone

| Señal en GitHub | Cambio propuesto en el portfolio |
|---|---|
| Repo archivado | `status` → "Completado" / finalizado |
| Release nuevo (`vX.Y`) | Nota en `process.resultado` / `metricas`; `v1.0` puede proponer "Completado" |
| Actividad sostenida tras inactividad | `status` → "En desarrollo" |
| Cambios en README / docs | Revisión de `description`, `longDescription`, `process.pasos[].puntos` |
| Stack nuevo (package.json, requirements, etc.) | `tags` / `techStack` |
| Repo nuevo con `.portfolio.json` | Borrador de proyecto nuevo + entrada en `EXPERIENCE_DATA` |

### Fuente de `status`
GitHub no tiene un campo de estado. Convención propuesta, en orden de prioridad:
1. **`.portfolio.json` en la raíz de cada repo** (explícito, lo controla David):
   ```json
   { "status": "En desarrollo", "mode": "ia", "featured": true }
   ```
2. Repo archivado → completado.
3. Si no hay ninguno de los dos, KOS lo infiere y lo propone, pero nunca lo aplica sin accept.

## 4. Reglas de escritura (contrato con los JSON)

- Campos traducibles en formato `{ "es": "...", "en": "..." }` (`puntos`: `{ es: [...], en: [...] }`).
- **No traducir ni convertir a objeto:** `title`, `category` y `status` (son claves canónicas; ver CLAUDE.md).
- Mapeo repo ↔ proyecto: por `repoUrl` (normalizado como en `repoSlugFromUrl()` de
  `api/github-stats.js`). KOS debe ingerir **también el repo del portfolio** como fuente para
  conocer los JSON actuales.
- Al agregar un proyecto nuevo: entrada en `data/<modo>-projects.json` **y** en
  `EXPERIENCE_DATA` (`js/sections.js`), y slug en `SLUG_MAP` si no trae `slug` explícito.
- Un PR por recomendación aceptada, con un diff mínimo (no reformatear el JSON entero).
- Rutas de imágenes `public/images/projects/<slug>/*.webp`; KOS no genera imágenes.

## 5. Trabajo pendiente

### En KOS
1. **Verificar si la herramienta MCP de GitHub puede escribir** (crear rama, editar archivo,
   abrir PR). Si solo lee (agente Research), agregar `github_open_pr` detrás de `confirm=true`.
2. Agregar al Recommender el tipo `portfolio_sync`, con firma `repo + tipo_de_cambio + sha/tag`.
3. Agregar a Writing una plantilla con salida bilingüe y respeto de las reglas del §4,
   validada contra un esquema antes de proponer.
4. Configurar el conector Git con la lista de repos: se deriva de los `repoUrl` del
   portfolio, más el propio repo del portfolio.
5. Agregar métricas de negocio: recomendaciones `portfolio_sync` emitidas, aceptadas,
   descartadas y PRs mergeados.

### En el portfolio
1. Agregar `.portfolio.json` a los repos de proyectos (empezar por KOS, UBApp y LLM Observatory).
2. Opcional: un esquema JSON (`data/schema/project.schema.json`) para que KOS valide antes del PR.
3. Opcional: el endpoint `api/project-activity.js` de la opción complementaria del §2.
4. Opcional: un check en `ci.yml` que valide los JSON de `data/` en cada PR (sobre todo en los PRs de KOS).

### Secretos
- Token de GitHub con permisos `contents:write` + `pull_requests:write` **solo** sobre
  `DavidAucancela/Portfolio`: un fine-grained PAT o, mejor, una GitHub App. Se guarda en
  las variables de Railway de KOS, nunca en el portfolio.

## 6. Fases

| Fase | Alcance | Resultado |
|---|---|---|
| 0 | Verificar las capacidades de escritura de GitHub en KOS | Saber si falta `github_open_pr` |
| 1 | Solo `status` (archivado / `.portfolio.json` / release) | PRs chicos y de bajo riesgo |
| 2 | Contenido redactado (descripciones, `puntos`, métricas, tags) | Writing + validación por esquema |
| 3 | Proyectos nuevos de punta a punta (JSON + `EXPERIENCE_DATA`) | Alta completa sin edición manual |
| 4 (opc.) | `api/project-activity.js` para actividad en vivo | "Actualizado hace X días" en las cards |

## 7. Riesgos

- **Alucinaciones del LLM en el contenido:** se mitigan con el PR obligatorio, la evidencia
  (KOS ya exige `evidence[]`) y enlaces a commits/releases en el cuerpo del PR.
- **Ruido** (demasiados PRs): deduplicación por firma, umbral de relevancia y aprendizaje del dismiss.
- **JSON roto:** validación por esquema en KOS + check en CI del portfolio.
- **Token con demasiado alcance:** acotarlo a un solo repo, idealmente con una GitHub App.
