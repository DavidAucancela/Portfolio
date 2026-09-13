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
ya están validados. Siguiente paso natural: generar el sprite de David
(referencia de fotos existentes) y reemplazar los bloques de color por
arte real, objeto por objeto.

## Abierto / por confirmar con David

- Color de acento de `.gam` y tono general (¿arcade retro, cálido/hogareño?)
- Link de YouTube del video de malabares (pendiente de que lo pases)
- Patineta: ¿ya existe un modelo 3D (`.glb`) del deck, o hay que generarlo?
  Define si el visor 3D entra en el MVP o en una iteración posterior
