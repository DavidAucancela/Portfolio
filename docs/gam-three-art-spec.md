# Modo `.gam` (Three.js) — Arte real por objeto

> **Nota (v2 diorama, 2026-09-23):** el cuarto ahora es un diorama
> isométrico con muebles low-poly de bordes redondeados, sombras reales y
> bloom (ver `docs/gam-mode-plan.md` § "v2 — diorama") — ya no cubos de
> color plano. Este mecanismo de sprites sigue funcionando, pero es
> **opcional**: un billboard plano puede desentonar con el resto del
> diorama en 3D. Probar un sprite junto a los objetos modelados antes de
> generar arte para todos.

Mismo patrón que `docs/jotai-renders.md`: **no hace falta tocar código** para
activar un render — `gam-three-scene.js` (`loadArt()`) ya prueba
`public/images/gam/<id>.webp` para cada objeto del cuarto y, si existe, lo
monta como un **sprite** (siempre mirando a cámara, sin importar el ángulo
desde el que se vea) parado sobre el mismo lugar que ocupa hoy el cubo de
color plano. Si el archivo no existe (404), sigue el cubo — no rompe nada
mientras no esté listo.

Por qué sprite (billboard) y no un modelo 3D con perspectiva dibujada a
mano: al mirar siempre a cámara, la ilustración no necesita "acertarle" a
ningún ángulo isométrico — se dibuja **de frente, plana**, como un recorte.
Eso la hace mucho más fácil de generar con IA de forma confiable que un
dibujo en perspectiva correcta, y sigue leyéndose bien tanto en el plano
general (cámara de reposo) como en el zoom (la cámara se acerca, pero el
sprite se sigue mostrando de frente).

## Especificaciones técnicas (obligatorias)

- **Ruta:** `public/images/gam/<id>.webp` (ej. `public/images/gam/desk.webp`)
- **Fondo:** transparente (alfa)
- **Encuadre:** de frente / elevación recta — **nunca** isométrico ni en
  3/4 — el objeto centrado en el lienzo con algo de aire alrededor para que
  no se corte al escalar
- **Proporción:** la que tenga sentido para el objeto real (el código lee el
  aspect ratio del archivo y escala el sprite solo — no hace falta cuadrado)
- **Estilo:** ilustración plana/stylized, cel-shading suave — **no
  fotorrealista** — coherente con los cubos de color low-poly del resto del
  cuarto
- **Iluminación pintada:** luz cálida ámbar (`#ffb020`) de un lado + brillo
  frío magenta (`#b14eff`) del otro, mismo dúo de acento que
  `css/themes/gam.css` y las luces reales de la escena (así no desentona
  cuando el render 3D las combina encima)
- **Conversión:** `npx sharp-cli -i render.png -o <id>.webp -f webp -q 80`
  (mismo comando que usa el resto del proyecto para assets — ver `CLAUDE.md`
  § Imágenes)

## `desk` — Escritorio (generado a partir de foto real)

Referencia: foto real del escritorio de David (MacBook Pro + monitor
secundario), usada como base para el prompt — mismo criterio que
`docs/jotai-renders.md` usa fotos reales para los renders de JotAI.

**Contenido a incluir** (de la foto real):
1. MacBook Pro gris espacial abierto, en el centro/primer plano — pantalla
   mostrando un editor de código en tema oscuro (líneas con syntax
   highlighting de color, no hace falta texto legible)
2. Monitor secundario a la derecha, apoyado sobre 2 cajas negras apiladas
   (parlante/subwoofer con íconos circulares blancos) — pantalla mostrando
   una grilla de miniaturas coloridas, estilo galería de proyectos
3. Lámpara de escritorio blanca (cuello de cisne/cúpula), atrás en el centro
4. Celular en un soporte/power bank negro a la izquierda — pantalla de
   bloqueo oscura con motivo espacial
5. Mouse inalámbrico blanco (ASUS) sobre un mousepad circular negro
6. Cuaderno de espiral blanco cerrado, esquina inferior derecha
7. Superficie de escritorio oscura, cables mínimos y prolijos
8. Sin pared/persiana de fondo — el cuarto ya tiene sus propias paredes

**`artHeight` en `gam-three-scene.js`:** `1.9` (unidades del cuarto) — ya
seteado en `FURNITURE`, ajustable si el resultado se ve muy grande/chico
respecto a los otros objetos.

### Prompt sugerido

> Flat stylized illustration, straight-on front view (no isometric or 3/4
> perspective), of a personal developer desk setup, isolated on a fully
> transparent background. Center: an open space gray MacBook Pro laptop,
> screen showing a dark-themed code editor with colorful syntax-highlighted
> text (abstract lines, not legible words). To its right, slightly angled, a
> secondary widescreen monitor propped up on two stacked black speaker
> boxes with small white circular icon markings on their fronts, screen
> showing a grid of small colorful thumbnail images like a project gallery.
> Behind and between the two screens, a white gooseneck desk lamp. To the
> left, a smartphone leaning on a black stand/power bank, dark lock screen
> with a faint space/planet motif. In front, a white wireless computer
> mouse resting on a round black mousepad, and a closed white spiral-bound
> notebook in the corner. Warm amber (#ffb020) rim light from the left side,
> soft magenta (#b14eff) glow from the right side, soft cel-shaded flat-color
> illustration style with clean vector-like shapes, subtle glow/bloom on the
> screens, no photorealism, no background, no shadow ground plane.

### Checklist al colocar el render

1. Verificar transparencia real (no tablero de ajedrez horneado como
   píxeles opacos — ver la trampa ya documentada en `jotai-renders.md`)
2. Convertir a WebP q80 con el comando de arriba
3. Nombrar exactamente `desk.webp` y colocarlo en `public/images/gam/`
4. Entrar a `.gam`, arrancar el cuarto: el cubo azul del escritorio debe
   desaparecer y aparecer el sprite en su lugar, de frente, sin importar
   el ángulo de la cámara (parallax/deriva/zoom)
5. Probar hover (debe agrandarse levemente + aclararse) y el zoom al hacer
   click (debe verse nítido de cerca — si se ve pixelado, regenerar a mayor
   resolución)

## Pendientes (mismo tratamiento, uno por uno)

El resto de los objetos interactivos (`piano`, `juggling`, `skateboard`,
`bed`, `reading`, `pukis`) todavía usan el cubo de color plano — se agregan
specs acá a medida que se van definiendo, mismo patrón que arriba. Los
objetos decorativos (`terminal`, `bookshelf`, `diplomas` — ver
`docs/gam-mode-plan.md`) también pueden recibir arte real más adelante con
el mismo mecanismo, aunque no sean interactivos.
