# Modo `.gam` — Arte real (specs + prompts)

`GamScene` (`js/gam/gam-scene.js`) intenta cargar un set de imágenes reales
en `preload()`. Cualquier archivo que falte simplemente no entra al cache
de texturas de Phaser (el loader tolera 404 por-archivo sin romper la cola)
y el objeto correspondiente sigue dibujándose con el `Phaser.Graphics`
procedural que ya existe hoy (`ICON_DRAWERS`, el rombo de piso, los dos
círculos del jugador). **No hay que tocar código para activar un asset**:
basta con colocar el archivo con el nombre exacto de la tabla de abajo — es
el mismo contrato de "generar afuera → soltar el archivo → fallback
automático" que ya usa `docs/jotai-renders.md` para JotAI, adaptado al motor
de Phaser en vez de a un `<img>` del DOM (acá el "probe" es el loader nativo
de Phaser + `this.textures.exists(key)`, no un `new Image()`).

## Archivos esperados

Todo bajo `public/images/gam/`, formato WebP:

| Asset | Ruta | Objeto/uso |
|---|---|---|
| Piso | `public/images/gam/floor-tile.webp` | Tile del piso, repetido |
| Escritorio | `public/images/gam/furniture-desk.webp` | `desk` |
| Piano | `public/images/gam/furniture-piano.webp` | `piano` |
| Malabares | `public/images/gam/furniture-juggling.webp` | `juggling` |
| Diplomas | `public/images/gam/furniture-diplomas.webp` | `diplomas` |
| Cama | `public/images/gam/furniture-bed.webp` | `bed` |
| Puerta | `public/images/gam/furniture-door.webp` | `door` |
| Rincón de lectura | `public/images/gam/furniture-reading.webp` | `reading` |
| Terminal | `public/images/gam/furniture-terminal.webp` | `terminal` |
| Patineta (ícono 2D) | `public/images/gam/furniture-skateboard.webp` | `skateboard` |
| Estante | `public/images/gam/furniture-bookshelf.webp` | `bookshelf` |
| Pukis | `public/images/gam/pukis.webp` | `pukis` |
| Personaje — NE | `public/images/gam/player-ne.webp` | jugador, mirando arriba-derecha |
| Personaje — NO | `public/images/gam/player-nw.webp` | jugador, mirando arriba-izquierda |
| Personaje — SE | `public/images/gam/player-se.webp` | jugador, mirando abajo-derecha (default) |
| Personaje — SO | `public/images/gam/player-sw.webp` | jugador, mirando abajo-izquierda |

Fuente sin publicar (hoja de referencia del personaje, no se sirve en
`public/`, mismo criterio que `assets/images/jotai-sources/`):
`assets/images/gam-sources/character-turnaround.png`.

**Nota sobre `skateboard`:** `furniture-skateboard.webp` es solo el ícono 2D
del objeto dentro del cuarto — no tiene relación con el visor 3D
(`@google/model-viewer` + `.glb`) que sigue pendiente y bloqueado en
`docs/gam-mode-plan.md` ("Abierto / por confirmar"). Son dos assets
distintos con dos destinos distintos.

## Especificaciones técnicas (obligatorias)

- **Piso** (`floor-tile.webp`): 256×256px, textura **seamless** (repetible
  sin costura), sin necesidad de fondo transparente — se recorta al rombo
  del cuarto con una máscara en código, no por los bordes del PNG.
- **Muebles** (`furniture-*.webp`): lienzo recomendado ~300×300px (generar
  a 2x y reescalar para que quede nítido), **fondo transparente**, **ancla
  en base-centro** — el punto donde el objeto "toca el piso" debe quedar en
  el centro horizontal y el borde inferior del lienzo (el código lo ancla
  ahí con `setOrigin(0.5, 1)`). El tamaño final en el juego se escala para
  aproximarse al ancho de colisión que ya tiene cada objeto en `FURNITURE`
  (`js/gam/gam-scene.js`) — no hace falta calcular el número exacto, con
  que la proporción entre objetos se sienta parecida a la actual alcanza
  (el piano y el escritorio son los muebles más anchos hoy; patineta y
  malabares son los más chicos).
- **Personaje** (`player-*.webp`): lienzo recomendado ~200×260px, fondo
  transparente, ancla base-centro (mismo criterio que los muebles).
  **Generar primero una hoja de referencia/turnaround** a partir de fotos
  reales de David ya existentes en `public/` (mismo punto de partida que
  usó `docs/jotai-renders.md` con `body.png`), y recién ahí generar cada
  una de las 4 direcciones por **edición de imagen** (image-to-image) sobre
  esa hoja de referencia — no generar cada dirección desde cero, para que
  el outfit/proporciones/paleta no "cambien" entre direcciones. Es el mismo
  riesgo ya documentado en `docs/gam-mode-plan.md` ("Riesgo técnico:
  consistencia del sprite del personaje").
- **Pukis** (`pukis.webp`): lienzo recomendado ~160×120px, fondo
  transparente, ancla base-centro.
- **Conversión a WebP** (todos los assets):
  ```
  npx sharp-cli -i <archivo>.png -o <nombre-final>.webp -f webp -q 80 resize <ancho> --withoutEnlargement
  ```
  (mismo comando que ya usa el resto del repo para `public/images/projects/`).

## Prompts sugeridos

### Tier 1 — siluetas simples (edición directa, un prompt por objeto)

**`bed` — cama:**
> Generate a small cozy bed illustration, flat isometric game-art style,
> warm amber/brown palette (#ffb020, #2e2210, #c9a06a), simple shading, no
> outlines, transparent background, viewed from a 3/4 isometric angle
> matching a dimetric projection (not true 30° isometric).

**`reading` — rincón de lectura:**
> Generate a small reading-nook illustration (open book + soft rug/cushion),
> flat isometric game-art style, warm amber/brown palette (#ffb020,
> #c9a06a), simple shading, no outlines, transparent background, dimetric
> isometric angle.

**`door` — puerta:**
> Generate a simple wooden door illustration with a round doorknob, flat
> isometric game-art style, muted slate palette (#94a3b8) with warm amber
> trim (#ffb020), no outlines, transparent background, dimetric isometric
> angle.

**`juggling` — malabares:**
> Generate a small illustration of 3 juggling balls above a simple stand,
> flat isometric game-art style, warm orange palette (#ff8a3d), simple
> shading, no outlines, transparent background, dimetric isometric angle.

**`skateboard` — patineta (ícono 2D de cuarto, no el visor 3D):**
> Generate a small skateboard deck leaning against a low stand, flat
> isometric game-art style, teal accent (#06ffa5), simple shading, no
> outlines, transparent background, dimetric isometric angle.

### Tier 2 — objetos con más detalle (equivalentes a los `ICON_DRAWERS` actuales)

**`desk` — escritorio + monitor:**
> Generate a small desk with a dual-monitor setup, screens glowing soft
> blue (#60a5fa) against a dark bezel, flat isometric game-art style, no
> outlines, transparent background, dimetric isometric angle matching a
> low, wide desk silhouette.

**`piano` — piano vertical:**
> Generate a small upright piano with visible black/white keys, dark warm
> wood body (#2e2210), flat isometric game-art style, no outlines,
> transparent background, dimetric isometric angle.

**`terminal` — rincón terminal verde/hacker:**
> Generate a small retro CRT terminal glowing green (#00ff41) with visible
> text lines on screen, dark casing, flat isometric game-art style, subtle
> glow, no outlines, transparent background, dimetric isometric angle.

**`diplomas` — pared de diplomas:**
> Generate a small wall section with 2 framed diploma/certificate frames,
> warm cream/gold tones (#ffd580, #fff7e6), flat isometric game-art style,
> no outlines, transparent background, dimetric isometric angle.

**`bookshelf` — estante técnico:**
> Generate a small bookshelf with colorful book spines (varied warm/cool
> accent colors), flat isometric game-art style, no outlines, transparent
> background, dimetric isometric angle.

### Personaje — hoja de referencia + 4 direcciones

**Hoja de referencia (turnaround), a partir de fotos reales de David:**
> Generate a character turnaround/model reference sheet based on the
> attached photos: a friendly stylized isometric game-art avatar, casual
> outfit, consistent proportions, shown from multiple angles on one sheet
> (front, 3/4 front-left, 3/4 front-right, back), flat shading, no
> outlines, neutral flat background (not transparent — this sheet is a
> reference only, not used directly in-game).

Después, por cada dirección, edición **image-to-image sobre la hoja de
referencia** (no generación independiente):

**`player-se` (abajo-derecha, dirección default):**
> Edit this reference sheet: isolate and render the character walking
> toward the bottom-right in a 3/4 isometric dimetric view, same outfit,
> proportions and palette as the reference. Flat game-art shading, no
> outlines, transparent background. Do not change the outfit or face.

**`player-sw` (abajo-izquierda):**
> Edit this reference sheet: isolate and render the character walking
> toward the bottom-left in a 3/4 isometric dimetric view (mirror of the
> bottom-right pose), same outfit, proportions and palette as the
> reference. Flat game-art shading, no outlines, transparent background. Do
> not change the outfit or face.

**`player-ne` (arriba-derecha):**
> Edit this reference sheet: isolate and render the character walking
> toward the top-right in a 3/4 isometric dimetric view (back 3/4 pose),
> same outfit, proportions and palette as the reference. Flat game-art
> shading, no outlines, transparent background. Do not change the outfit or
> face.

**`player-nw` (arriba-izquierda):**
> Edit this reference sheet: isolate and render the character walking
> toward the top-left in a 3/4 isometric dimetric view (mirror of the
> top-right pose), same outfit, proportions and palette as the reference.
> Flat game-art shading, no outlines, transparent background. Do not change
> the outfit or face.

### Pukis (perro)

> Generate a small stylized dog illustration (homage pet portrait — usa una
> foto real de Pukis como referencia si está disponible), flat isometric
> game-art style, warm brown tones (#8b5a2b), simple shading, no outlines,
> transparent background, dimetric isometric angle, friendly sitting pose.

## Checklist al colocar un asset

1. Verificar fondo transparente y dimensiones/proporción recomendadas
2. Convertir a WebP q80 con el comando de arriba
3. Nombrar exactamente según la tabla de "Archivos esperados"
4. Colocar en `public/images/gam/`
5. Recargar `.gam`, entrar a jugar y confirmar que el objeto pasó de
   procedural a la imagen real sin tocar código (sin errores de consola)
6. Comprobar que el punto de contacto con el piso (base-centro) coincide
   con el rombo de footprint existente del objeto — que no quede flotando
   ni hundido
7. Comprobar que la etiqueta de texto sobre el objeto sigue leyéndose bien

## Estado

Assets pendientes — sección a completar cuando lleguen los primeros
archivos reales (mismo criterio que la sección "Estado" de
`docs/jotai-renders.md`).
