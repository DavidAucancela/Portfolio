# Modo `.gam` — Plan de diseño

Cuarto modo del portfolio (junto a `dev`/`ia`/`sec`): un cuarto isométrico
navegable con el personaje de David, homenaje a su mascota **Pukis**, y objetos
interactuables que mezclan proyectos/skills con hobbies reales (piano,
malabares, patineta, lectura). A diferencia de los otros 3 modos, **no es un
cambio de estilo sobre las mismas cards** — es una escena jugable.

## Decisiones tomadas (brainstorm 2026-09-12)

| Decisión | Elegido |
|---|---|
| Estilo visual | Isométrico low-poly |
| Control del personaje | Movimiento libre WASD/flechas + colisiones |
| Profundidad de los objetos | Minijuegos reales (no solo paneles de info) |
| Alcance en la página | ~~Convive — sección nueva en el scroll~~ → **revisado 2026-09-12: vive entero en el hero** (ver "Pivote" abajo) |
| Motor | **Phaser 3**, como dependencia npm, cargado perezosamente solo en `.gam` |
| Origen de los assets | Generados con IA, estilo consistente |
| Personaje | David mismo (referencia: fotos ya existentes en `public/`) |
| Espacios | Un solo cuarto (sin escenas conectadas, al menos en v1) |
| MVP | Cuarto navegable + colisiones + hotspots con placeholder — **sin** mecánica jugable todavía |

## Pivote de arquitectura (2026-09-12, post-MVP)

La primera versión del MVP metía el cuarto en una `<section>` propia debajo
del hero (igual que `about`/`projects`), y dejaba el resto de secciones
visibles. David lo corrigió después de verlo andar: **`.gam` no es una
sección más — es distinto a los otros 3 modos**. Cambios:

- El cuarto **no vive en una sección aparte**: vive **dentro del hero**,
  como una "TV" a la derecha — mismo lugar y mismo patrón `position:absolute`
  que `.git-activity`/`.ia-tokens`/`.sec-terminal` (ver "Widgets del hero" en
  `CLAUDE.md`), pero sin sus estados collapsed/expanded — la TV tiene sus
  propios 2 estados: **estática** (apagada, esperando click) y **jugando**.
- La TV arranca mostrando **ruido de estática** (canvas con píxeles random,
  ver `gam-tv.js`) + botón **"Click para comenzar"**. Al hacer click: flash
  de encendido, se ocultan los botones del hero (`.hero-cta-group`, vía
  clase `body.gam-playing`) y recién ahí se dispara la carga perezosa de
  Phaser — antes el boot pasaba automático al entrar al modo, ahora pasa
  solo con ese gesto explícito del usuario.
- **`.gam` no tiene secciones de scroll**: `#section-divider`, `#about`,
  `#projects`, `#skills` y `#contact` se ocultan por completo en este modo
  (`display:none` vía `[data-theme="gam"]`) — la página es hero + footer,
  nada más. (El footer se dejó visible — no es "contenido" en el mismo
  sentido; si David lo quiere oculto también, es un cambio de una línea.)
- **Lo que se mantiene sin tocar** (pedido explícito): el navbar dual
  (mode-bar + navbar), y el brillo/subrayado degradé bajo "Jonathan" en el
  hero — nada de esto se modificó.

## Integración con el sistema de modos existente

Sigue el patrón descrito en `CLAUDE.md` (`theme-switcher.js`, `data-theme` en
`body`, evento `portfolio:modeChange`):

- `theme-switcher.js`: agregar `'gam'` a los modos válidos + persistencia en
  `localStorage('portfolio-mode')`
- `css/themes/gam.css`: acento ámbar `#ffb020`
- `.gam-tv` en `index.html`, dentro de `#hero .container`: widget nuevo,
  **oculto salvo en `.gam`**, mismo patrón absoluto que los otros widgets del
  hero (ver "Pivote" arriba)
- **`#projects`/`#skills`:** ocultos por completo en `.gam` (ya no aplica el
  placeholder "🚧 Próximamente" que se había armado en la primera pasada del
  MVP, porque esas secciones ya ni se muestran)
- Botón/ícono nuevo en el `theme-switcher` (🎮) + entrada en el Command
  Palette (`command-palette.js`) para saltar directo a `.gam`

## Carga perezosa de Phaser

Mismo criterio que el worker de embeddings de JotAI en táctil (`ia-mascot.js`):
Phaser (~1MB+ minificado) **no se descarga** hasta que el usuario hace click
en "Click para comenzar" dentro de la TV — ni siquiera al entrar al modo
`.gam` (entrar solo prende la estática). `gam-loader.js` dispara el
`import()` dinámico de `phaser` + `gam-scene.js` recién en ese click, y
destruye el `Phaser.Game` (`game.destroy(true)`) al salir del modo.

## Estructura de archivos (actual, post-pivote)

```
js/gam/
  gam-tv.js           # dueño del DOM de la TV: estática (canvas ruido), botón
                       # "Click para comenzar", loading, hint — no sabe nada de Phaser
  gam-loader.js         # orquestador: onStart de la TV → import() dinámico de Phaser
                         # + gam-scene.js, destroy al salir de .gam, modal placeholder,
                         # puerta → ThemeSwitcher.switchMode(modo anterior)
  gam-scene.js           # Phaser.Scene: piso isométrico, colisiones AABB en espacio
                         # lógico, 10 hotspots, proximidad + tecla E

data/
  gam-hotspots.json    # [{ id, icon, title, message, videoUrl?, modelUrl? }, ...]
                        # contenido de cada objeto — fetch en runtime desde gam-loader.js
  gam-projects.json    # [] — placeholder vacío (COMING_SOON.gam en projects.js, aunque
                        # #projects ya ni se muestra en .gam tras el pivote)

css/
  themes/gam.css        # paleta ámbar/magenta del modo
  gam-tv.css             # la TV (frame, estática, botón, prompt), reglas que ocultan
                         # #section-divider/#about/#projects/#skills/#contact en .gam,
                         # y el modal placeholder de los objetos

assets/images/gam/       # fuentes de los sprites (pre-conversión, no se sirven) — pendiente
public/images/gam/        # atlas de producción (spritesheet + json de Phaser) — pendiente
```

## Layout del cuarto (v1)

| Objeto | Tipo | Contenido |
|---|---|---|
| 🖥️ Escritorio + monitores | info → futuro: deep-link | Proyectos `.dev` |
| 📚 Estante técnico / pizarra | info → futuro: deep-link | Proyectos `.ia` + skills |
| 💚 Rincón terminal verde | info → futuro: deep-link | Labs/writeups `.sec` |
| 🏆 Pared de diplomas | info | Certificaciones + trayectoria |
| 🎹 Piano | minijuego | Tocar una melodía simple |
| 🤹 Malabares | minijuego + video | Mantener pelotas en el aire; al interactuar abre un embed de un video de YouTube (ejemplo/tutorial) — mismo patrón de overlay que el resto, pero con `<iframe>` de YouTube en vez de PDF |
| 🛹 Patineta | visor 3D | Objeto clicleable que abre una card al ~75% de la pantalla con un **visor 3D interactivo** (rotar/zoom) del arte de la patineta — ver sección dedicada abajo |
| 📖 Rincón de lectura | info | Libros favoritos (distinto del estante técnico de arriba — este es personal/hobby) |
| 🐾 Pukis (perro) | decorativo/NPC | Mascota de David, homenaje — sprite a generar con referencia de foto real |
| 🚪 Puerta | acción | Volver al modo anterior (dev/ia/sec) |

### Visor 3D de la patineta

Único elemento del cuarto que no es Phaser/2D: una card overlay (mismo patrón
de capa que `pdf-modal.css` — backdrop oscuro + panel centrado, pero
dimensionado a ~75vw/75vh en vez de fullscreen) que monta un **visor 3D real**
del modelo de la patineta (rotable con el mouse/touch, zoom).

- **Librería:** `@google/model-viewer` (web component, MIT) vía npm —
  mismo criterio que Phaser: dependencia agregada solo para este modo,
  **cargada perezosamente** (import dinámico) recién al hacer click en el
  hotspot, no al entrar a `.gam`
- **Asset necesario:** un modelo `.glb`/`.gltf` de la patineta con el arte
  real del deck — **pendiente**: ¿ya existe un modelo 3D, o hay que
  generarlo/modelarlo desde cero? (afecta si esto entra en el MVP o queda
  para después, ya que un modelo 3D con textura de arte custom no es tan
  inmediato de generar como un sprite 2D)
- Cierre: botón ✕ / Esc / click en overlay — mismo criterio que el resto de
  modales del sitio

## Riesgo técnico conocido: consistencia del sprite del personaje

Generar con IA un personaje isométrico con **varias direcciones de caminata**
(mínimo 4: NE/NO/SE/SO) manteniendo el mismo outfit/proporciones/paleta entre
frames es más difícil que un render único (como los de JotAI en
`jotai-renders.md`, que son 1 sola pose por modo). Plan: generar primero una
**hoja de referencia** (turnaround/model sheet) a partir de las fotos reales
de David, y recién ahí generar cada dirección por edición de imagen
(image-to-image) sobre esa referencia — no generar cada dirección desde cero
para evitar que el personaje "cambie" entre frames.

## MVP — alcance exacto

1. Cuarto isométrico estático (tileset + props colocados)
2. Personaje controlable con WASD/flechas, colisión con muebles/paredes
3. Cámara que sigue al personaje (si el cuarto es más grande que el viewport)
4. Hotspots por proximidad: al acercarse a un objeto aparece un prompt
   ("Presiona E"); al interactuar, abre un modal placeholder
   ("🚧 Próximamente") — **sin** mecánica jugable real todavía
5. Puerta funcional: vuelve al modo anterior

No incluye en v1: minijuegos reales, deep-links a proyectos, animaciones de
Pukis, video de malabares. Se agregan en iteraciones posteriores una vez
validado el motor/arte/controles.

## Estado: ✅ MVP funcionando, con pivote de arquitectura (2026-09-12)

Primera pasada (sección aparte debajo del hero) probada y funcionando, pero
corregida el mismo día tras feedback: ahora el cuarto vive **dentro del
hero**, detrás de un click ("TV" con estática) — ver "Pivote de arquitectura"
arriba. Segunda versión también probada en navegador end-to-end (entrar a
`.gam` → estática, click → power-on + boot de Phaser + botones del hero
ocultos, moverse con WASD, interactuar con Pukis → modal, cambiar de modo →
destroy + TV vuelve a estática, volver a `.gam` → estática de nuevo, no
"jugando" residual), sin errores de consola:

- `js/theme-switcher.js` — `gam` como 4to modo (`MODES.gam`)
- Botones de modo en `index.html` (mode-bar, dropdown, menú mobile) +
  entrada en `command-palette.js` + textos i18n en `lang.js`
- `css/themes/gam.css` (paleta ámbar/magenta) + `css/gam-tv.css` (TV,
  estática, botón de inicio, prompt, modal placeholder, reglas que ocultan
  las secciones de scroll en `.gam`)
- `.gam-tv` dentro de `#hero .container`, oculta salvo `[data-theme="gam"]`
- `js/gam/gam-tv.js` — estática (canvas de ruido random ~14fps), botón
  "Click para comenzar", coordinación de loading/hint
- `js/gam/gam-scene.js` — `Phaser.Scene` con cuarto isométrico (proyección
  cartesiano→isométrico, colisiones AABB en espacio lógico, 10 hotspots
  del layout de la tabla de arriba, proximidad + tecla `E`) — sin cambios
  respecto a la v1, solo cambió *dónde y cuándo* se monta
- `js/gam/gam-loader.js` — ahora dispara el boot de Phaser desde el click
  de la TV (no desde `modeChange`); sigue confirmado en build que
  `phaser-*.js` y `gam-scene-*.js` quedan en chunks separados del bundle
  principal; destroy + reset de la TV al salir del modo; modal placeholder;
  puerta que vuelve al modo anterior
- `data/gam-hotspots.json` — contenido de cada objeto (con `videoUrl`/
  `modelUrl` en `null` a la espera del link de YouTube y del modelo 3D)
- Fallbacks agregados en `projects.js` (`COMING_SOON.gam`,
  `data/gam-projects.json` vacío), `sections.js` (`ABOUT_DATA.gam`,
  `SKILLS_DATA.gam` vacío) y los mapas sueltos de `dev/ia/sec` en
  `project-detail.js`, `project-gallery.js`, `section-divider.js`, `app.js`
  — quedan ahí por si `#projects`/`#skills` se vuelven a mostrar más
  adelante, aunque hoy no aplican porque esas secciones están ocultas

**Con arte placeholder** (rombos/bloques de color, sin sprites reales
todavía) — el motor, los controles y la integración con el resto del sitio
ya están validados.

## Fases 0-2 (2026-09-15/16) — motor, contenido real, minijuegos jugables

Retomado después del MVP. Rama de trabajo: `feat/gam-mode-fase0` (rebaseada
sobre `feat/dynamic-bg-interactions`).

**Fase 0 — base del motor:**
- El fondo global (`background.js`) se pausa por completo mientras
  `.gam-playing` (antes seguía simulando partículas invisibles detrás del
  juego) — `MutationObserver` sobre la clase del `body`.
- El panel de objetos pausa/retoma `GamScene` (`scene.pause`/`resume`) —
  antes el personaje se seguía moviendo y `E` reabría el modal detrás.
- `Phaser.Scale.FIT` + cámara con `startFollow` acotada al piso (antes
  canvas fijo 800×600 escalado solo por CSS).
- Controles táctiles: joystick virtual + botón `E` (`pointer:coarse`).
- JotAI (`#jotai-widget`, z-index 9940) se oculta mientras se juega — antes
  flotaba por encima de la TV a pantalla completa (9500).

**Fase 1 — contenido real (sin arte todavía):**
- desk/bookshelf/terminal pasan de modal placeholder a un panel `list` con
  los proyectos reales de `.dev`/`.ia`/`.sec` — click abre
  `ProjectGallery.open(p, modo)`, reutilizando la gallery existente.
  bookshelf además lista las skills `category:"ai"`.
- diplomas abre el drawer de trayectoria real (`portfolio:syncTrayectoria`)
  en vez de un modal propio.
- `data/gam-hotspots.json` pasa a bilingüe `{es,en}`.

**Fase 2 — minijuegos reales:**
- 🎹 Piano jugable: Web Audio (sin archivos), modo libre + modo desafío
  estilo Simon con récord en `localStorage`.
- 🤹 Malabares jugable: minijuego de reflejos (atrapar la pelota en la
  zona), récord en `localStorage`. El botón de video solo aparece si
  `videoUrl` tiene un link real (sigue en `null`).
- 🛹 Patineta: **todavía no** es el visor 3D real con `@google/model-viewer`
  — sin el `.glb` no hay nada que cargar ahí. Queda un adelanto honesto
  (deck dibujado con tilt 3D arrastrable) hasta que llegue el modelo; el
  módulo (`gam-skateboard.js`) se reemplaza entero sin tocar el resto.
- Progreso: `localStorage('gam-discovered')` cuenta los 10 objetos
  interactuables explorados, persistido entre visitas (`#gam-progress`,
  esquina sup. izq. de la TV), con un toast breve al completar los 10.
- Eventos `gam:start`/`gam:interact`/`gam:score` → `js/analytics.js`
  (`gam_start`/`gam_interact`/`gam_minigame_score`).

Todos los cambios de código verificados con `npm run build` (chunks
separados intactos: `phaser`, `gam-scene`, `gam-piano`, `gam-juggling`,
`gam-skateboard`) y chequeo de sintaxis de cada módulo — **sin probar en
navegador real** (sin acceso a Claude in Chrome en esas sesiones). Pendiente
que David lo juegue de punta a punta antes de la Fase 3.

## Pendiente — Fase 3 (arte real) y Fase 4 (pulido)

- **Decisión confirmada (2026-09-18): se mantiene isométrico.** La nota
  anterior de este documento recomendaba top-down para facilitar la
  consistencia del sprite del personaje; David decidió quedarse en
  isométrico de todas formas — el motor ya separa lógica cartesiana de
  proyección (`isoProject()`, `ISO_X`/`ISO_Y`), así que el costo de
  mantenerlo es puramente de arte (generar 4 direcciones consistentes), no
  de motor. No hay migración a top-down pendiente.
- **Arte real:** hoja de referencia del personaje (fotos reales de David) →
  sprites de caminata en 4 direcciones; sprite de Pukis; reemplazar los
  `ICON_DRAWERS` de los muebles por arte real, uno por uno. Specs y prompts
  completos en **`docs/gam-art-spec.md`** — mismo patrón de "generar
  afuera → soltar el archivo → fallback automático" que `docs/jotai-renders.md`,
  adaptado al loader nativo de Phaser (`preload()` + `textures.exists()`)
  en vez del probe `new Image()` del DOM que usa JotAI.
- **Sonido/mute:** sin sonido ambiente propio todavía (el piano usa audio
  como mecánica, no como ambientación) — no hay nada que mutear aún.
- **`docs/gam-mode-plan.md`/`CLAUDE.md`:** actualizados a esta fecha; seguir
  actualizando en cada fase nueva.
- Falta probar en un dispositivo móvil real (no solo el gating por
  `pointer:coarse` revisado en código).

## Fase 3-4 (2026-09-18) — profundidad, arte real, pulido — ✅ enviado

Continuación tras validar Fases 0-2, probado end-to-end en navegador real
(Chrome, `npm run dev`): cuarto con paredes/sombras/piso/ventana/rug
renderizando, contador de progreso, panel de Pukis abriendo con fade y
cerrando, botón de mute alternando ícono/estado/persistencia, sin errores
de consola (aparte del `console.error` esperado de Phaser al no encontrar
un asset todavía — ver nota en "Trampas conocidas"). `npm run build` limpio,
con `gam-audio` como chunk compartido nuevo (usado por `gam-scene` y
`gam-piano`).

- **Fase 3a — Profundidad del cuarto** (`js/gam/gam-scene.js`, solo código,
  sin dependencia de arte nuevo): paredes traseras (`_drawWalls()`),
  ventana con luz ambiental ámbar/magenta + estrellas (`_drawWindow()`),
  sombras de contacto bajo muebles/jugador, piso subdividido en grilla 6×6
  (reemplaza el rombo plano único, `_drawFloorGrid()`), alfombra decorativa
  bajo Pukis (`_drawRug()`), movimiento idle (`_addIdleMotion()` — Pukis
  respira vía halo pulsante, motas de polvo en la luz de la ventana) —
  gateado por `prefers-reduced-motion`. `_setupCamera()` suma `WALL_HEIGHT`
  al margen superior para no recortar la pared/ventana nuevas.
- **Fase 3b — Arte real (infraestructura)** (`js/gam/gam-scene.js`):
  `preload()` nuevo (16 claves de `ART_KEYS`), ramas de
  textura-real-vs-procedural en `_drawFloor()`/`_drawFurniture()`
  (`this.textures.exists(key)`), `Container` para el jugador
  (sombra + círculos fallback + `Image` de arte real, un solo
  `setPosition`/`setDepth`), estado de dirección (`this._player.facing`,
  derivado de la dirección **proyectada** de movimiento —
  `screenDx=dx-dy`, `screenDy=dx+dy` — no del cartesiano crudo) con
  degradación por-dirección (si falta el sprite de una sola dirección, esa
  dirección específica cae a los círculos). Bobbing vertical sinusoidal
  mientras camina en vez de walk-cycle real (ver `docs/gam-art-spec.md`).
  Funciona con cero assets reales presentes — confirmado en navegador
  (`[GamScene] Arte real: 0/16 assets`, room 100% procedural, sin errores).
  Specs/prompts completos en `docs/gam-art-spec.md`.
- **Fase 4 — Pulido**: `AudioContext` compartido (`js/gam/gam-audio.js`,
  extraído de `gam-piano.js`, que ahora lo importa en vez de tener el suyo
  propio), ambiente sonoro en loop + footsteps + blip de proximidad
  (`js/gam/gam-ambience.js`, todo Web Audio generado, sin archivos), botón
  de mute persistido en `localStorage('gam-muted')` (`#gam-mute` en
  `index.html`/`css/gam-tv.css`, cableado en `gam-scene.js`), fade
  opacity+scale en la apertura/cierre de `#gam-modal` vía clase
  `is-visible` (`gam-loader.js` `_showModal()`/`_closeModal()`,
  `css/gam-tv.css`), gateado por `prefers-reduced-motion`.
  Pendiente (no es tarea de código): prueba en dispositivo móvil real.

**Trampa nueva conocida:** en `vite dev` (`publicDir:false`), una ruta de
asset sin archivo real cae al fallback de historial de Vite y responde 200
con el HTML de la SPA en vez de un 404 — el loader de Phaser igual falla al
decodificarlo como imagen (`console.error` propio de Phaser, uno por
asset faltante, esperado y sin romper nada) y `textures.exists()` sigue
siendo la fuente de verdad correcta. El contador de diagnóstico en DEV lee
`textures.exists()` directamente (no eventos `loaderror` del loader) por
esto mismo — ver comentario en `GamScene.create()`.

**Trampa observada en `npm run dev` (2026-09-18), no reproducida en build de
producción:** `fetch('data/gam-hotspots.json')` (ruta relativa, tal como la
usa `_loadHotspots()` en `gam-loader.js`) devolvió intermitentemente el
fallback SPA de Vite (200 + HTML) en vez del JSON real, incluso con el
archivo presente en disco — mismo síntoma que la trampa de arte de arriba,
pero sobre un archivo que sí existe. Con ruta absoluta (`/data/gam-hotspots.json`)
respondió consistentemente bien. No se investigó a fondo (parece timing del
middleware de historial de Vite en dev, no algo del código de `.gam`) — si
vuelve a aparecer, revisar `server.fs`/el orden de middlewares en
`vite.config.js`, o mover ese fetch a ruta absoluta como los demás.

## Fase 5 (2026-09-18) — game feel / juice, sin arte nuevo — ✅ enviado

A pedido de David ("sigue muy básico") se priorizó juice de game feel sobre
las otras 3 líneas posibles (minijuegos más profundos, arte real, progresión)
para esta pasada — explícitamente sin generar assets nuevos: todo con
`Phaser.Graphics`/tweens/cámara/partículas (textura generada en código, no
archivos), CSS y Web Audio. Hallazgo que motivó la prioridad:
`_interact(f)` (`gam-scene.js`) no hacía nada visible antes de que el modal
apareciera — el verbo principal del juego se sentía "muerto".

- **`js/gam/gam-audio.js`**: `envelope()` (antes privada en
  `gam-ambience.js`) ahora exportada de acá — infra de audio compartida por
  cualquier módulo de `.gam` que necesite un SFX corto de un solo disparo.
- **`js/gam/gam-fx.js` (nuevo)**: helpers de Phaser puros —
  `burstParticles()` (textura de partícula generada en código,
  `generateTexture`, nunca un archivo) y `cameraPunch()` (zoom in/out corto
  vía tween sobre `cameras.main`). Vive junto a `gam-audio.js`/
  `gam-ambience.js` (misma separación infra/uso, pero para Phaser).
- **Feedback de interacción** (`gam-scene.js`, `_playInteractFx()` nuevo,
  llamado desde `_interact()`): glow pulsante en un aro por mueble (creado
  una vez en `_drawFurniture()`, nunca redibujado), burst de partículas del
  color del mueble, micro-punch de cámara y chime corto — más grande la
  primera vez que se visita cada mueble en la sesión
  (`this._visitedThisSession`). Gateado en bloque por `_reducedMotion`; el
  audio se gatea aparte solo por `_muted`, igual que footstep/blip.
- **Celebración de 10/10** (`GamScene.celebrateComplete()`, llamada desde
  `_celebrateComplete()` en `gam-loader.js` vía una referencia directa a la
  instancia de escena, `_sceneInstance`): flash de cámara + burst de
  partículas sobre el jugador + acorde de 3 notas. El toast de texto
  original queda intacto (sigue accesible con reduced motion).
- **Piano** (`gam-piano.js`): chime de "ronda completa" en modo desafío
  (antes solo sonaba la nota, sin refuerzo positivo distinto); racha de 5
  aciertos seguidos enciende brevemente `.gam-piano__keys.is-hot`.
- **Malabares** (`gam-juggling.js`): hito cada 5 atrapes (`.is-milestone` +
  chime); "calor" visual creciente (`--heat`, 0→1 según se acerca al período
  mínimo) intensificando el `drop-shadow` ya existente de la pelota.
- **Fix de contenido de paso**: `data/gam-hotspots.json` seguía diciendo
  "Todavía en construcción" para piano/malabares/patineta pese a estar
  implementados desde la Fase 2 — corregido a describir lo que abren hoy.
- **Bug de CSS pre-existente encontrado y corregido**: `.gam-piano__challenge`
  no respetaba `[hidden]` porque su propio `display:flex` (misma
  especificidad, origen "autor") le ganaba al `[hidden]{display:none}` del
  navegador — el panel de modo desafío quedaba visible aunque `mount()` lo
  marcara oculto en modo libre. Mismo patrón de fix que ya usan
  `.gam-modal__text[hidden]`/`.gam-modal__list[hidden]` en este archivo.

Verificado con `npm run build` (limpio, chunks intactos) y en navegador real
(Chrome vía automatización): boot, interacción con varios muebles (glow +
partículas + cámara + chime confirmados inspeccionando `scene.tweens`/
`cameras.main.zoom` en vivo, ya que el efecto es demasiado corto para
capturarlo con una captura de pantalla normal), flujo completo de
descubrir 9→10/10 disparando `celebrateComplete()` sin errores, gating de
`_reducedMotion` confirmado (cero tweens nuevos con `_reducedMotion=true`),
paneles de piano/malabares renderizando sin errores de consola. La
animación de la pelota de malabares (rAF del DOM, no de Phaser) no llegó a
verificarse en tiempo real por throttling del navegador automatizado —
la lógica se revisó por código, no quedó sin probar por elección.

**Corrección post-envío (mismo día):** David reportó los controles
"bugueados" tras probar en su propio navegador. Encontrado y corregido:

- **Bug real en `cameraPunch()` (`gam-fx.js`):** leía `cam.zoom` en vivo
  como base de cada "punch". Con interacts seguidos dentro de la ventana
  del tween (~90ms — fácil explorando rápido/mashing E), `killTweensOf`
  cortaba el tween anterior a mitad de camino con el zoom todavía elevado,
  y ese valor quedaba de base del siguiente punch — el zoom nunca volvía
  a 1.0 y se iba trepando con cada interacción, desincronizando la cámara
  del cuarto. Fix: cada punch fuerza `cam.setZoom(baseZoom)` (1.0) antes
  de animar, así nunca acumula sin importar cuán seguido se llame —
  confirmado con 30 interacts reales consecutivos (`_interact()`, no solo
  `_playInteractFx()` suelto) sin que el zoom se moviera de 1.
- **Hardening descubierto de paso:** Phaser (`RequestAnimationFrame.js`)
  agenda el próximo `requestAnimationFrame` recién DESPUÉS de que el
  callback del frame actual termine sin tirar — no hay ningún try/catch
  propio de Phaser en el step. Un throw sin capturar en cualquier punto de
  `update()` (incluido nuestro código nuevo dentro de `_interact()`) deja
  el loop entero congelado para siempre, sin recuperación posible salvo
  recargar la página — encaja con el patrón reportado ("se buherea",
  recargar lo arregla momentáneamente). Como medida preventiva (no se
  encontró un throw real reproducible en `_playInteractFx`/
  `celebrateComplete`, pero el riesgo arquitectónico es real y este código
  es nuevo): ambos quedaron envueltos en try/catch — un fallo ahí ahora
  loguea a consola y sigue el frame en vez de congelar el juego. Ver los
  comentarios en `GamScene._interact()` y `gam-loader.js _celebrateComplete()`.

Fuera de alcance esta pasada (a propósito): patineta (placeholder ya
documentado, esperando el `.glb`), minijuegos más profundos, arte real y
progresión/contenido nuevo — quedan para sesiones futuras, ya conversado
con David.

## Pivote a Three.js (2026-09-23, en curso) — spike Fase 1

David trajo una propuesta externa (pegada en el chat) para reemplazar Phaser
por Three.js: sin personaje caminando, navegación por selección de objeto
(hover/click, cámara vuela hacia la estación), justificado porque un visor
3D real de la patineta, arcos de malabares reales y cámaras cinemáticas no
son viables bien en un motor 2D. Se ejecutó la **Fase 1 (spike)** de esa
propuesta — validar el enfoque antes de invertir en el resto de las fases —
y se siguió iterando en la misma sesión con varias rondas de feedback en
vivo de David sobre el resultado.

**Rama:** `feat/gam-mode-threejs-spike` (creada desde el HEAD de
`fix/hero-widgets-mobile-scroll` — PR #56 abierto, no mergeado a `main`
todavía — porque esa rama ya tenía el Fase 5 de arriba, que `main` todavía
no tiene). **Nada de esto está commiteado** — todo vive en el working tree
sin commits propios. Hay además cambios previos sin relación (stray, no
tocados): `data/git-history.json` modificado (autogenerado en cada
`vite build`/`dev`, no importa), `public/CV-DavidAucancela.pdf` borrado,
`graphify-out/` y un par de imágenes nuevas sin trackear — nada de esto es
de esta sesión, se dejó como estaba.

**Hallazgo clave que abarató todo el spike:** `js/gam/gam-loader.js` ya era
agnóstico del motor de render — el contrato entero con la escena es el
evento `window.dispatchEvent('gam:interact', { detail: { id, kind, label,
content } })`. Paneles, `ProjectGallery`, el drawer de trayectoria, el
progreso y los minijuegos (piano/malabares/patineta) siguen funcionando sin
tocarlos. Lo único acoplado a Phaser dentro de `gam-loader.js` era el
`_game?.scene.pause('GamScene')`/`.resume(...)` al abrir/cerrar un panel —
resuelto con un shim: `GamThreeScene.mount()` devuelve
`{ scene: { pause, resume }, destroy }`, mismo shape que un `Phaser.Game`
en los puntos que `gam-loader.js` toca.

**`js/gam/gam-scene.js` (Phaser) queda intacto, sin usarse** — revertir el
spike es volver `_boot()` en `gam-loader.js` a importar `phaser` +
`gam-scene.js` en vez de `gam-three-scene.js`. `phaser` sigue en
`package.json` (no se desinstaló).

### `js/gam/gam-three-scene.js` (nuevo) — qué hace

- **Cámara fija con parallax + deriva autónoma** (no depende de mover el
  mouse) en reposo; al hacer click/Enter sobre un objeto, vuela con easing
  hacia una pose cercana a él y el resto del cuarto se atenúa (luces
  bajan de intensidad, un `focusLight` puntual sube sobre el objeto
  enfocado). El evento `gam:interact` (que dispara el panel de
  `gam-loader.js`) se dispara **recién cuando la cámara termina de
  llegar** — antes el panel (pantalla completa) tapaba el viaje de cámara
  antes de que se llegara a ver.
- **Controles:** click/tap sobre un objeto, o flechas ←→↑↓ para mover la
  selección + Enter/Espacio, o directo con teclas 1-9/0. Esc vuelve la
  cámara (además de cerrar el panel, que ya lo hacía `gam-loader.js`).
- **Objetos:** cada uno es un `THREE.Group` de formas compuestas simples
  (cajas/cilindros/esferas) — mismo criterio que `ICON_DRAWERS` en
  `gam-scene.js` (Phaser): un placeholder que ya se distingue a simple
  vista sin depender de arte generado afuera. Piano (cuerpo + tira de
  teclas), escritorio (tapa + 4 patas + monitor con brillo), malabares
  (pedestal + 3 pelotas de colores apiladas — referencia a que son pelotas
  reales tejidas a mano), cama (marco + colchón + almohada), puerta (hoja +
  picaporte), rincón de lectura (pila de libros), patineta (tabla + 4
  ruedas — cilindros rotados 90° para que se vean acostadas como rueda,
  no paradas como pata), Pukis (blob ovalado + cabeza + nariz). `diplomas`/
  `terminal`/`bookshelf` también tienen forma propia (marco, gabinete con
  pantalla, mueble con repisas) pero **ya no son hotspots** — ver abajo.
- **Sombra de contacto:** un blob radial oscuro (textura generada en
  `<canvas>`, un solo material compartido) debajo de cada objeto — sin
  esto, con solo 4 luces puntuales, cualquier cosa se lee como flotando
  aunque su geometría toque y=0 exacto. Se agregó después de que David
  reportara "elementos flotando en la nada"; en esa misma ronda se
  encontraron y corrigieron bugs reales de posicionamiento (patas del
  escritorio que medían el doble de alto que la tapa y sobresalían por
  arriba, el marco de diplomas con el centro mal calculado y flotando
  ~10% de su alto sobre el piso, las pelotas de malabares sueltas en el
  aire sin apoyo visible, las ruedas de la patineta orientadas como
  cilindros verticales en vez de horizontales).
- **Iluminación/atmósfera:** ACES tone mapping, exposure subido dos veces
  en la sesión (1.0 → 1.3 → 1.6) más piso/paredes más claros y fog más
  débil, en respuesta directa a feedback de "muy oscuro" — puede necesitar
  más ajuste, no se verificó en navegador real por Claude (ver más abajo).
- **Arte real por objeto (opcional, sin tocar código):** `loadArt()` prueba
  `public/images/gam/<id>.webp` al montar cada objeto — si existe, lo
  reemplaza por un `THREE.Sprite` (billboard, siempre mirando a cámara,
  así no hace falta dibujarlo en perspectiva) y esconde el placeholder
  compuesto (que sigue existiendo para el raycast/hitbox). Si no existe
  (404), sigue el placeholder. Mismo patrón que `docs/jotai-renders.md`.
  Spec completo + prompt para el escritorio (generado a partir de una foto
  real del escritorio de David) en **`docs/gam-three-art-spec.md`** —
  **todavía no se generó/soltó el archivo**, el escritorio sigue mostrando
  el placeholder compuesto. El resto de los objetos no tienen spec de arte
  real todavía (se define uno por uno, a pedido de David, mismo patrón).

### Cambios pedidos por David en esta sesión (aplicados)

- **`terminal`/`bookshelf`/`diplomas` dejaron de ser hotspots** — sin
  click, sin entrada en `data/gam-hotspots.json`, sin contar en
  `DISCOVERABLE_IDS` (`gam-loader.js`, bajó de 10 a 7 — piano, desk,
  juggling, bed, reading, skateboard, pukis). Siguen presentes como
  decoración (`interactive:false` en `FURNITURE`). **Interpretación de
  Claude, no confirmada explícitamente por David:** "eliminar" se tomó
  como "sacar la interactividad, dejarlos de ambientación" en vez de
  borrarlos del todo — revisar si es lo que quería.
- **Malabares:** el texto (`data/gam-hotspots.json`) ahora menciona que las
  3 pelotas son tejidas a mano por David — el minijuego en sí
  (`gam-juggling.js`, mecánica de "atrapar en la zona") **todavía no se
  cambió** por algo más completo (arcos reales tipo cascada, como pedía la
  propuesta original pegada) — pendiente, tarea aparte.
- **Navbar/mode-bar/contenido del hero/JotAI ocultos en TODO el modo
  `.gam`**, no solo mientras se juega — revierte una decisión anterior
  explícita (`css/gam-tv.css` tenía un comentario "el navbar queda visible
  a propósito"). Ahora solo se ve `.gam-tv` a pantalla completa. **Efecto
  secundario:** antes de arrancar el juego (pantalla "insertar moneda"),
  la única forma de salir del modo es el Command Palette (`Cmd+K`) — no
  confirmado con David si esto es aceptable o si hace falta algún indicio
  visual de "volver".
- **Sin iconos flotantes** sobre los muebles (se probaron y se sacaron a
  pedido — "quita los iconos").
- **Hint de controles** (`index.html`, `.gam-tv__hint`) actualizado de
  WASD a la navegación nueva. El joystick táctil (`#gam-touch`) quedó sin
  uso (no hay personaje que mover) — no se borró del DOM, solo se comentó.

### v2 — diorama (2026-09-23, misma rama, sin commitear)

Segunda propuesta de David (pegada en el chat) aplicada entera sobre
`gam-three-scene.js` — el objetivo era pasar de "caja oscura con cubos" a
**maqueta isométrica cortada**. `gam-loader.js`, paneles, minijuegos y
`data/gam-hotspots.json` no cambian (mismos `id`/`kind`/`label`).

- **Cámara ortográfica isométrica** (`FRUSTUM = 12`, dirección `(20,16,20)`).
  La cámara siempre está en `camLook + dir * CAM_DIST`; enfocar una estación
  anima `camera.zoom` (`f.zoom`, ~2.2–3.2) + el punto al que mira — nunca se
  mueve hacia adelante. Parallax/deriva = giro sutil (yaw/pitch) de esa
  dirección, que vuelve a 0 al enfocar. En portrait el frustum crece
  (`ROOM_SCREEN_W / aspect`) para que el diorama no se corte a los costados.
- **Cuarto diorama:** piso de 0.3 de grosor + pared trasera (`z=-4`) +
  pared izquierda (`x=-4`) + borde claro arriba (`S=8, H=5, T=0.25`). Sin
  pared derecha, sin grilla, sin niebla.
- **Luz:** `HemisphereLight` de relleno + sol `DirectionalLight` con sombras
  reales (PCFSoft, 2048 / 1024 en táctil) + `PointLight` de la lámpara del
  escritorio (posicionada con `group.localToWorld` desde `lampAnchor`).
  Pantallas, bombilla y la tira LED cian de la repisa son solo emisivos.
  Se borraron las sombras de contacto falsas (blobs) — las reemplazan las
  sombras reales + GTAO. El dimming de foco sigue (`focusT` sobre hemi/sol).
- **Postprocesado:** `EffectComposer` → `RenderPass` → `GTAOPass` (**no en
  `pointer:coarse`**) → `UnrealBloomPass(0.6, 0.4, 0.9)` → `OutputPass`. El
  umbral 0.9 se mide en luminancia: un emisivo azul puro con intensidad 3
  NO lo pasa (el verde pesa 0.72 en la fórmula) — por eso las pantallas usan
  celeste `0x7cc4ff`. La lámpara arrancó en 8 y lavaba todo el rincón del
  escritorio; quedó en 3.
- **Bordes redondeados:** todo mueble usa `RoundedBoxGeometry` con radio
  `min(0.06, lado_menor * 0.3)` (así teclas/pantallas finas no se deforman).
- **Fondo:** `CanvasTexture` con degradado radial ámbar `#ffb020` → marrón
  casi negro, como `scene.background`.
- **Layout por rincones:** pared trasera = escritorio (laptop, monitor,
  lámpara, silla) + repisa de trofeos con LED encima + terminal + patineta
  apoyada; pared izquierda = estante + piano vertical con banqueta + 3
  diplomas colgados encima + puerta incrustada cerca del frente; esquina
  frontal-derecha = cama + pedestal de malabares; centro = alfombra con
  Pukis durmiendo (el cuerpo "respira"); frontal-izquierda = rincón de
  lectura (puf + libros — la propuesta no lo ubicaba, decisión de Claude).
- **Bugs corregidos en el camino:**
  - Quitar el hover ponía `emissive = 0` en todas las piezas y apagaba las
    pantallas. Ahora cada pieza guarda `baseEmissive`/`baseEmissiveIntensity`
    y el glow de hover solo se aplica a piezas no emisivas.
  - En táctil no hay `pointermove` antes del tap → `hovered` vacío y el tap
    no hacía nada. `onClick` ahora hace su propio raycast.
  - El contador marcaba `10/7` para quien jugó antes del spike (ids viejos
    de terminal/estante/diplomas en `localStorage('gam-discovered')`) —
    `_loadDiscovered()` en `gam-loader.js` ahora filtra contra
    `DISCOVERABLE_IDS`.
  - `destroy()` usa `scene.traverse` para liberar todo + `forceContextLoss()`
    para no acumular contextos WebGL al entrar/salir de `.gam`.
- **Verificado en Chrome** (esta vez sí conectó): encuadre en desktop y en
  contenedor de 390×760, sin errores de consola, zoom a piano/Pukis con
  apertura del panel al llegar, Esc vuelve al plano general, la puerta
  cambia a `.dev`. Ojo al probar con automatización: con la pestaña oculta
  Chrome pausa `requestAnimationFrame` y el vuelo de cámara (y con él
  `gam:interact`) queda congelado hasta que la pestaña vuelve a pintar.

### v3 — fondo, habitación y hover (2026-09-23, misma rama, sin commitear)

Segunda ronda de feedback de David (pegada en el chat) sobre el diorama:
fondo naranja que competía con el sitio, cuarto que "flotaba", paredes y
centro vacíos, muebles chicos, piso sin textura, escritorio sin protagonismo
y sensación de "imagen" en vez de algo jugable. Todo en
`gam-three-scene.js` + un bloque `.gam-label` al final de `css/gam-tv.css`.

- **Fondo integrado:** `makeBackgroundTexture()` = negro de la página
  (`#050505`) con un resplandor ámbar apagado (`#3a2408`) detrás del cuarto.
  Sigue siendo `scene.background` (un canvas transparente rompe con el
  bloom).
- **Anclaje:** pedestal oscuro de museo bajo el piso (`PED_H`/`PED_MARGIN`),
  plaquita `Jonathan.gam` en la cara frontal `+z` y sombra de contacto
  difusa debajo (`makeContactShadow`). Es la única sombra falsa que queda —
  los objetos se anclan con sombras reales + GTAO.
- **Escala y encuadre:** piso `S = 8 → 6.8`, muebles ×`FURN_SCALE` (1.15;
  `scale` por objeto: Pukis 1.5, malabares 1.35, puerta/diplomas 1 porque
  van pegados a la pared), `DEFAULT_ZOOM = 1.15`. `ROOM_WORLD_W` × zoom
  define el ancho mínimo en portrait. Al escalar los grupos hubo que
  quitar el scale bump del hover (pisaba `root.scale`).
- **Texturas (todas pintadas en `<canvas>`, cero archivos nuevos):** piso de
  tablones (array de materiales en el `BoxGeometry`: la cara de arriba
  lleva la textura, la losa es más oscura), zócalo, ventana con cielo
  nocturno + cerros + luces de ciudad y **luz fría** (`windowLight`) que
  contrasta con la lámpara cálida, neón `.gam` (color HDR >1 en un
  `MeshBasicMaterial` para pasar el umbral del bloom), 2 pósters, reloj con
  segundero real, repisa flotante con plantas, planta de piso, alfombra con
  patrón, parlante y mochila.
- **Escritorio protagonista:** 2.6 de ancho, dos monitores + laptop con
  **pantallas texturadas** (editor de código / galería de proyectos —
  `makeScreenTexture` + `screenExtra`; una pantalla emisiva de color plano
  se quema a blanco con el bloom), teclado con tira RGB que cicla de
  matiz, tapete, cables (`TubeGeometry`), taza, auriculares, lámpara con
  `PointLight` real y silla gamer. La silla va **retirada hacia atrás** y
  girada: pegada al escritorio, su respaldo alto tapa las pantallas desde
  la cámara isométrica.
- **Jugable:** animaciones en reposo (Pukis respira, pelotas flotan,
  monitores/lámpara titilan, RGB, segundero — todas gateadas por
  `prefers-reduced-motion`); hover = el objeto **sube** `HOVER_LIFT`
  (lerp) + **contorno ámbar `OutlinePass`** + **etiqueta DOM** `.gam-label`
  proyectada sobre la cima del objeto (también con navegación por
  teclado); parallax bajado a ~1.7° (`PARALLAX_YAW`). En táctil no hay GTAO
  ni contorno (queda lift + etiqueta).
- **Decisiones de Claude (cambiables):** la ventana va en la pared trasera
  (no hay pared derecha real en el diorama); objetos "míos" elegidos sin
  consultar (taza, auriculares, mochila, parlante); pedestal + plaquita
  incluidos (David los ofreció como "un paso más").
- **Verificado en Chrome:** encuadre desktop (cuarto centrado, ~90% del
  alto) y contenedor 390×760 sin cortes, hover con contorno + etiqueta,
  zoom al escritorio con apertura del panel, puerta → `.dev` con
  `destroy()` limpio, sin errores de consola. **No verificado:** FPS real
  (la pestaña de automatización queda oculta y `requestAnimationFrame` se
  pausa, así que no se pudo medir) y táctil en dispositivo real —
  conviene mirar el rendimiento con GTAO + OutlinePass + sombras 2048 en
  una GPU modesta antes de dar el v3 por bueno.

### v4 — estaciones: cada objeto se vuelve dinámico al hacer zoom (2026-09-23)

Pedido de David: al hacer click en un objeto **no debe abrirse un panel** — la
cámara hace zoom, el objeto pasa a primer plano y se vuelve interactivo con
efectos/animaciones propias. Ejemplos que dio: piano con teclas tocables y
pestañas Libre/Reto arriba; computadora con tarjeta de características y
pequeños detalles; estante que muestra los libros; cama con animación de
día↔noche; patineta que se mueve en 3D.

- **Arquitectura:** `gam-three-scene.js` sigue dueño de cámara/luces/raycast y
  delega en `js/gam/gam-stations.js` (una fábrica por objeto, ver contrato en
  `CLAUDE.md`). `buildFurnitureGroup` deja `out.refs` para las estaciones.
  `gam-hud.js` dibuja la barra superior, estado, tarjeta y pines. Al llegar la
  cámara: `station.enter()` + `gam:interact` con `inScene:true` (el loader
  marca el progreso y **no abre panel**). Esc / "← Volver" → `leaveFocus()`.
- **Estaciones:** piano (8 teclas 3D + negras, ♪ de colores, pestañas
  Libre/Reto, teclado A S D F G H J K), escritorio (pantallas con código que se
  desplaza, `</>` flotantes, 7 pines de detalle, tarjeta con los proyectos
  `.dev` → `ProjectGallery`), estante (**vuelve a ser interactivo**: libros con
  el título de cada proyecto IA, se sacan al pasar el mouse, click = tarjeta +
  "Abrir proyecto"; 8 objetos descubribles ahora), cama (anochece/amanece con
  luces, cielo de la ventana, Zzz y botón para alternar; el momento del día se
  conserva), patineta (se despega de la pared, arrastrar para girarla, Kickflip /
  Shove-it), malabares (cascada de 3 pelotas + reto de atrapar con aro), lectura
  (libro que se levanta, se abre y pasa páginas), Pukis (caricias → corazones,
  cola y orejas). Piano y malabares reutilizan `gam-piano.js`/`gam-juggling.js`,
  reescritos como **motores sin DOM** (mismo récord en localStorage). Se borró
  `gam-skateboard.js` y el minijuego en modal de `gam-loader.js`.
- **Cámara:** `station.focus()` devuelve `{look, zoom, shift}`; `shift` corre la
  mirada para que el objeto quede a un lado y la tarjeta no lo tape (izquierda
  en desktop, arriba en portrait).
- **Decisiones/trampas:** glifos flotantes en escena `overlay` dibujada tras el
  composer (GTAO los convertía en cuadros negros); `localToWorld` **muta** el
  vector — clonar siempre; `PCFSoftShadowMap` ya no existe en esta versión de
  three → `PCFShadowMap`; el estante decidió reactivarse aunque en v1 se había
  vuelto decorativo (David lo pidió explícitamente); terminal y diplomas siguen
  decorativos — pendiente confirmar si también quiere estaciones para ellos.
- **Entorno:** el repo está en `~/Documents` (iCloud) y macOS evictó ~8.000
  archivos de `node_modules` (`dataless`, contenido vacío) en plena sesión →
  Vite fallaba con `pico is not a function` y el dev server dejó de responder.
  Se rehidrataron leyendo los archivos de `vite`/`rolldown`/`picomatch`/`three`
  (addons usados)/`data`/`js`/`css`. Si vuelve a pasar: `npm ci` o mover el repo
  fuera de iCloud.
- **Verificado en Chrome** (dev server propio): piano (teclado, notas), escritorio
  (pines + tarjeta), cama (noche y día), patineta (despegue, arrastre, kickflip),
  malabares (cascada + reto con atrape y caída), lectura, Pukis (caricias) y
  estante (hover, título, tarjeta) — sin errores de consola. **No verificado:**
  el layout portrait del HUD con viewport real de móvil (la ventana no se pudo
  achicar), táctil real (arrastre de la patineta, taps) y rendimiento/FPS.
  `npm run build` compila limpio con todo (chunk `gam-three-scene` ≈ 679 kB).

### Sin verificar en navegador real (v1 — ver v2/v3/v4 arriba)

**Claude no pudo abrir el navegador en ningún momento de esta sesión** — la
extensión de Chrome no estaba conectada (`tabs_context_mcp` falló todas las
veces que se intentó). Todo lo de esta sección se validó con
`npm run build` (sin errores, `gam-three-scene` queda en su propio chunk
lazy, `phaser` desapareció del bundle porque ya nada lo importa) y con
David mirando su propio `npm run dev` en vivo, dando feedback por texto.
Antes de dar el spike por bueno, probarlo en navegador de punta a punta
(desktop y mobile — el modo táctil/`pointer:coarse` de esta escena nueva
**no se probó nada todavía**, ni siquiera por código).

## Abierto / por confirmar con David

- **¿El spike de Three.js se siente bien?** — pregunta central de la Fase 1
  original: si sí, seguir con el resto del plan (Fase 2: sacar Phaser del
  repo del todo; Fase 3+: framework de estaciones, piano/malabares/patineta
  3D reales, trofeos/pulido/mobile/fallback — ver el mensaje pegado
  original para el detalle completo de fases)
- Confirmar la interpretación de "eliminar terminal/estante/diplomas" (ver
  arriba) — ¿decorativo está bien, o van fuera del todo?
- ¿Hace falta un indicio de "volver" en la pantalla de "insertar moneda"
  ahora que no hay navbar/mode-bar visibles en `.gam`?
- Arte real: escritorio (prompt listo en `docs/gam-three-art-spec.md`,
  falta generarlo y soltar el archivo) + definir specs para el resto de
  los objetos uno por uno
- Minijuego de malabares: rediseñar a algo más completo (arcos reales) —
  alcance todavía no definido
- Brillo/atmósfera del cuarto: subido dos veces en la sesión, puede seguir
  necesitando ajuste — pendiente de feedback visual real
- Probar en dispositivo táctil real (sin verificar ni siquiera por código
  en esta escena nueva)
- Link de YouTube del video de malabares (pendiente de que lo pases) —
  arrastrado de antes del pivote, sigue sin resolver
- Patineta: ¿ya existe un modelo 3D real del deck, o se genera igual que
  el resto de los objetos (spec + prompt, sprite billboard)? — con el
  pivote a Three.js esto se resuelve con el mismo mecanismo de
  `docs/gam-three-art-spec.md`, no hace falta un `.glb` necesariamente
