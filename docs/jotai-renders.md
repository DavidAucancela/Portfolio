# JotAI — Renders 3D por modo

El widget busca un render dedicado por modo y hace fallback automático al cuerpo
base + overlays SVG si el archivo no existe todavía. **No hay que tocar código**
para activarlos: basta con colocar los archivos.

## Archivos esperados

| Modo | Ruta |
|------|------|
| `.dev` | `public/images/jotai/body-dev.webp` |
| `.ia`  | `public/images/jotai/body-ia.webp` |
| `.sec` | `public/images/jotai/body-sec.webp` |

Fallback: `public/images/jotai/body.webp` (+ overlays SVG de accesorios).
Cuando el render del modo carga, la clase `jotai-baked` en `#jotai-widget`
oculta los overlays automáticamente.

## Especificaciones técnicas (obligatorias)

- **Dimensiones:** 307×660 px (o cualquier tamaño con esa proporción exacta)
- **Fondo:** transparente (alfa)
- **Pose y encuadre:** idénticos a `body.png` — generar por **edición de imagen**
  (image-to-image) usando `body.png` como referencia, no desde cero
- **Posición de ojos y boca:** sin mover. Los párpados, pupilas y boca vectoriales
  del widget están calibrados a: ojo izq (62,73), ojo der (135,69), boca (109,112)
  en coordenadas del viewBox 200×200
- **Conversión:** `npx sharp-cli -i render.png -o body-<modo>.webp -f webp -q 80`

## Prompts sugeridos (edición sobre body.png)

**`.dev` — gafas doradas nerd:**
> Edit this image: add round gold wire-rimmed nerd glasses over the robot's eyes,
> integrated with the scene lighting (soft reflections on the lenses). Keep the
> exact same pose, framing, colors and transparent background. Do not move the
> eyes or mouth.

**`.ia` — visor holográfico púrpura/teal:**
> Edit this image: add a futuristic holographic visor effect over the robot's
> eyes — glowing purple (#b14eff) and teal (#06ffa5) luminous rings around each
> eye, subtle floating holographic particles above the head. Keep the exact same
> pose, framing and transparent background. Do not move the eyes or mouth.

**`.sec` — ojo rojo Terminator:**
> Edit this image: turn the robot's right eye into a menacing red glowing
> Terminator-style eye (deep red iris, orange core), dim the left eye to a faint
> glow, slightly darker moody lighting on the head. Keep the exact same pose,
> framing and transparent background. Do not move the eyes or mouth.

## Checklist al colocar un render

1. Verificar transparencia y proporción 307:660
2. Convertir a WebP q80 con el comando de arriba
3. Nombrar exactamente `body-dev.webp` / `body-ia.webp` / `body-sec.webp`
4. Recargar y cambiar de modo: debe hacer crossfade y ocultar los overlays SVG
5. Comprobar que el parpadeo y la boca siguen alineados con los ojos del render

## Estado: ✅ renders generados (2026-07-02)

Los 3 renders están activos. Fuentes originales en `assets/images/jotai-sources/`
(fuera de `public/` para no desplegarlas — 1.9MB c/u).

**Ojo con la "transparencia falsa":** el generador entregó los PNG con un tablero
de ajedrez oscuro **horneado como píxeles opacos** (alfa 255 en todo el lienzo).
Se limpió con un script que usa el **canal alfa real de `body.png`** (pose idéntica)
como máscara: los píxeles color-tablero (gris neutro, `max-min ≤ 16` y `max ≤ 90`)
toman el alfa del original (0 fuera del robot, opaco dentro — preserva boca negra
y juntas oscuras), y el resto (accesorios, glows, neones) se conserva intacto.
Si se regeneran renders con el mismo defecto, repetir ese proceso antes del WebP.
