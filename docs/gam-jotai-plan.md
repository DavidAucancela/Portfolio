# Modo `.gam` — JotAI como personaje del cuarto (plan)

> Estado: **aprobado** (2026-09-24) — **fases 1 a 4 hechas** (la 1 revisada por
> David en navegador el 2026-09-25; la 2 y la 3 verificadas en headless el
> 2026-09-29; la 4 el 2026-10-02, ver §12). Siguiente: Fase 5 (pulido). Se apoya en el diorama
> Three.js actual (`gam-three-scene.js` + `gam-stations.js`); ver
> `docs/gam-mode-plan.md` para el contexto del modo.
>
> **Decisiones de David (2026-09-24):**
> - **Presencia:** JotAI **vive siempre en el cuarto** — nunca está "afuera".
>   Al anochecer no entra por la puerta: arranca su rutina de irse a dormir desde donde esté (ver §3).
> - **Patineta:** sabe subirse y andar, pero es **muy novato**: los trucos
>   solo los *intenta* — nunca le salen (tambalea, se baja, se cae).
> - **Modelo:** **puro código** (procedural). Se evalúa cómo queda antes de
>   pensar en un `.glb`.
> - **Nombre oficial: JotAI** — la placa del pecho dice "JotAI", no "ARTI".

## Qué queremos

JotAI deja de ser solo el widget flotante del sitio y **vive en el cuarto**:
se mueve por el diorama y reacciona a lo que hace el visitante.

- **Anochecer** (ventana): JotAI deja lo que hacía, acaricia a Pukis,
  se sienta en la compu a escribir y a los pocos segundos se queda dormido
  sobre el escritorio.
- **Piano:** va a la banqueta y toca. Sus manos siguen las teclas que suenan.
- **Malabares:** hace él mismo la cascada con las 6 pelotas tejidas.
- **Patineta:** se sube, da una vuelta, intenta trucos y a veces se cae.
- Y en general: cada estación tiene una reacción del personaje (ajedrez,
  estante, Pukis, Lumbre, puerta…).

Una regla de diseño va por encima de todo: **el personaje acompaña, no
bloquea.** Toda estación sigue funcionando al instante aunque JotAI esté
cruzando el cuarto, dormido o desactivado (reduced-motion o un fallo). Nunca
se agrega espera para el visitante: si la cámara ya llegó al piano, las teclas
responden aunque JotAI todavía venga en camino.

---

## 1. El personaje: modelo 3D hecho en código

**Decisión recomendada: JotAI procedural, sin `.glb`.** Mismo criterio que el
resto del cuarto ("todo el arte sale de código, cero archivos nuevos"). El
render de referencia (`public/images/jotai/body.png`, robot "ARTI") se
traduce bien a primitivas:

| Pieza del render | Primitiva en Three.js |
|---|---|
| Cabeza cuadrada gris | `RoundedBoxGeometry` + orejas/antena laterales |
| Ojos LED azules en aro | 2 × `TorusGeometry` emisivos (bloom) + disco interior. El "párpado" es un `scaleY` |
| Sonrisa | Canvas texture chica sobre la cara, repintable por estado |
| Cuello de resorte | `TubeGeometry` sobre una hélice. Se estira/comprime (bostezo, sorpresa, dormido) |
| Torso con placa | Caja redondeada + placa canvas "JotAI" |
| Brazos segmentados (azul/naranja) | 3 pivotes por brazo: hombro → codo → muñeca, + pinza de 2 dedos |
| Piernas cortas terminadas en **ruedas** | 2 ruedas → **se desplaza rodando**. No hace falta ciclo de caminata, que es lo más caro de animar a mano |

- **Escala:** ~1.05 u de alto (la silla mide ~1.6 u con `FURN_SCALE`, el
  escritorio ~0.86 u). Así cabe en la banqueta del piano y en los banquitos
  del ajedrez. Hay que calibrarlo en el navegador.
- **Rig = jerarquía de `Group`s con nombre** (`hips`, `torso`, `neck`, `head`,
  `shoulderL`, `elbowL`, `wristL`, `wheelL`…). Las animaciones son **poses
  por nombre de articulación** (`{ shoulderR: [rx, ry, rz], … }`) mezcladas
  con amortiguación exponencial, y **clips** = secuencias de poses con tiempos
  (implementado en Fase 1 en vez de `AnimationMixer`: más simple de afinar a
  mano y sin atar nombres de tracks). Si algún día se reemplaza por un `.glb`
  riggeado con los mismos nombres de huesos, las poses siguen valiendo.
- **Capas por encima de la pose** (se aplican después de mezclarla):
  1. *Vida continua* (equivalente 3D de `_startLife` en `ia-mascot.js`):
     parpadeo con 22 % de doble parpadeo, respiración (bob del torso), antena
     que oscila.
  2. *Mirada:* la cabeza apunta a un objetivo (el cursor en vista general,
     la tecla que suena, Pukis, la pieza de ajedrez), con límites de giro y
     suavizado.
  3. *IK de 2 huesos* (analítico, hombro + codo) para los brazos cuando
     tienen que tocar algo concreto: tecla, pieza, cabeza de Pukis, pelota.
- **Estados de cara** = los mismos 8 de `ia-mascot.js` (`idle`, `thinking`,
  `success`, `confused`, `talking`, `listening`, `greeting`, `pointing`) más
  `sleeping`. Cada uno ajusta el color e intensidad de los LEDs, la forma del
  ojo, la boca y el cuello. Así se mantiene la misma personalidad que en el
  widget.
- **Sombras:** `castShadow` solo en torso, cabeza y ruedas (lo demás suma
  poco y cuesta).

**Alternativa descartada por ahora: `.glb` riggeado (Mixamo o generado).**
Da más calidad de movimiento, pero trae un pipeline de assets nuevo, más peso
de descarga y riesgo de que no se parezca al render. Dejamos la puerta abierta
con el rig por nombres.

---

## 2. Moverse por el cuarto

### Grilla de navegación
- El piso es de 6.8 × 6.8. Usamos una grilla de 0.17 u (40 × 40). Las celdas
  bloqueadas salen de la **huella real de cada mueble**:
  `Box3().setFromObject(group)` proyectado al piso e inflado por el radio del
  personaje (~0.25). La alfombra y la ventana no bloquean. Se calcula una vez
  al montar, así que los cambios de layout en `FURNITURE` no rompen nada.
- **A\*** sobre la grilla, y después se suaviza el camino recortando con
  línea de vista entre nodos, para que no quede en zigzag.
- **Spots** por estación: dónde se para y hacia dónde mira. Viven junto a
  `FURNITURE` como `JOTAI_SPOTS`, en coordenadas locales del mueble. Así
  giran con `rotY` y sobreviven si se mueve el mueble:
  - `piano` → sentado en la banqueta (local `z≈0.85`), mirando al teclado
  - `desk` → la silla; la silla gira hacia el escritorio y se arrima al
    sentarse
  - `chess` → el banquito del lado negro
  - `pukis` → costado de la cabeza, agachado
  - `juggling` → frente al pedestal
  - `skateboard`, `bookshelf`, `window`, `lumbre` → de pie frente al objeto
  - `door` → frente a la puerta (saludo de despedida)

### Locomoción
- Primero gira sobre sí mismo hacia la dirección del camino y después rueda
  (~1.3 u/s). Acelera y frena con suavidad, y el torso se inclina un poco
  hacia adelante al acelerar y hacia atrás al frenar.
- Las ruedas giran según la distancia recorrida (`dist / radio`).
- Al llegar, se alinea con el `facing` del spot y hace una transición corta
  a la pose del spot (sentado, agachado…).

---

## 3. Cerebro: rutinas, prioridades e interrupciones

Módulo propio con una **cola de pasos cancelable**, mismo patrón que el token
`_seq` de `ia-tour.js`: si llega algo más prioritario, la rutina actual se
corta limpia, sin callbacks zombis.

```js
routine('night', [
  stretch(),                        // deja lo que hacía y bosteza
  goTo('pukis'), pose('crouch'), petPukis(3),
  goTo('desk'),  sit('chair'), typeFor(8000),
  fallAsleep(),                     // queda en 'sleeping' hasta amanecer o click
]);
```

Pasos disponibles: `goTo(spot)`, `face(target)`, `pose(name)`, `play(clip)`,
`wait(ms)`, `say(texto)`, `emit(glifo)`, `call(fn)`. Cada uno devuelve una
promesa que respeta el token de cancelación.

**Prioridades** (la más alta interrumpe a las demás):
1. **Estación que abre el visitante.** Si está dormido, primero se despierta
   sobresaltado ("!").
2. **Rutina de ambiente** (anochecer / amanecer).
3. **Rutina autónoma en reposo** (ver abajo).

Al salir de una estación (`leaveFocus`), JotAI termina su gesto, se levanta
y vuelve al modo autónomo. Nunca se queda "congelado" en la pose de la
estación.

### ¿Dónde está JotAI? (presencia) — decidido: vive siempre en el cuarto

| Momento | Comportamiento |
|---|---|
| Arranque de día | Ya está en el cuarto, en su rincón (frente-derecha, junto a la alfombra) |
| Arranque de noche (hora local, `envFromClock`) | Ya está **dormido** en el escritorio |
| Anochecer (ventana) | Deja lo que hacía, se estira, va a Pukis → compu → dormir. No usa la puerta |
| Amanecer (ventana) | Se despierta, se estira (cuello de resorte al máximo) y vuelve a lo autónomo |
| Reposo de día | Pasea entre spots cada 10–20 s: mira por la ventana, hojea el estante, acaricia a Pukis, se sienta un rato |

La puerta queda solo para el saludo de despedida al salir del modo.

### Cámara durante las rutinas
- El diorama se ve completo en la vista isométrica por defecto, así que las
  rutinas "de película" se ven desde ahí.
- **Ventana → anochecer:** hoy la cámara se queda en la ventana y la rutina
  pasaría fuera de cuadro. Propuesta: al pulsar "Anochecer", la estación
  vuelve sola a la vista general tras ~0.8 s. Queda un subtítulo en el HUD
  ("JotAI se prepara para dormir…") y un botón para saltar la escena.
- **Estaciones:** hay que revisar el encuadre de cada `focus()` para que el
  spot de JotAI entre en cuadro (piano y ajedrez seguro; la patineta necesita
  otro encuadre, ver abajo).
- **Desenfoque de foco:** hoy todo lo que no está en `FOCUS_LAYER` se
  desenfoca. Mientras JotAI esté en el spot de la estación activa, hay que
  meter su `root` en esa capa (`setFocusLayer(jotai.root, true)`). Si no,
  saldría borroso justo al lado del objeto.

---

## 4. Comportamiento por estación

Las estaciones **no importan** al personaje: reciben un `c.jotai` opcional
(o un bus `c.cue(evento, datos)`) y lo usan con `?.`. Sin JotAI, todo sigue
exactamente igual que hoy.

| Estación | Qué hace JotAI | Enganche en el código actual |
|---|---|---|
| **Ventana** | Anochecer: rutina nocturna completa. Amanecer: despertar y estirarse | `windowStation.goTo(t)` → `cue('env', t)` |
| **Piano** | Sentado en la banqueta. Cada tecla que suena mueve la mano más cercana a esa tecla por IK y la cabeza la sigue. En **Reto**, él toca la secuencia de demostración y después te mira; si aciertas aplaude, si fallas pone cara `confused` | `createPiano({ onFlash })` ya avisa de cada nota, sea del jugador o de la demo. Solo hay que reenviar `cue('piano:key', i)` y los fin de ronda |
| **Malabares** | En **Mira**, la cascada pasa a sus manos: las 6 pelotas siguen arcos entre `wristL`/`wristR` (la matemática de la cascada ya existe; cambia el centro y el ancho). En **Reto**, él lanza la pelota; si fallas, le rebota en la cabeza | `jugglingStation.update` (modo `watch`), `onCatch` / `onFail` |
| **Patineta** | Nueva pestaña **Montar**: baja la tabla al piso, se sube (con los brazos abiertos para equilibrarse) y da una vuelta lenta por la alfombra. Es **novato**: Kickflip/Shove-it solo los *intenta* — nunca le salen. Variantes al azar: se agacha, salta y la tabla no se despega; la tabla sale disparada y él cae sentado; tambalea y se baja a tiempo. Siempre: estrellitas ✦ o sudor, cara `confused`, se levanta, se sacude, lo vuelve a intentar. La pestaña **Ver** conserva la inspección 3D actual | `skateStation` necesita un modo más; hoy la tabla flota frente a la cámara, cosa incompatible con que alguien se suba |
| **Pukis** | Se acerca, se agacha y lo acaricia cuando tú lo acaricias (a veces se adelanta). Pukis reacciona igual que hoy | `pukisStation.pet()` → `cue('pukis:pet')`. Hay que extraer la reacción de Pukis (cola, orejas, corazones) a una función que la rutina nocturna también pueda llamar |
| **Escritorio** | Sentado, escribe (manos alternando sobre el trackpad) y mira las pantallas. Si estaba dormido, se despierta de un salto. Si lo dejas solo, a los ~8 s se vuelve a dormir: cabeza sobre el escritorio, LEDs a media luz, glifos "z", pantalla en protector | Nuevo `refs.chair` en `case 'desk'`. Las pantallas ya se animan en `deskStation.update` |
| **Ajedrez** | **Es la IA rival**: sentado del lado negro. Mientras `thinking`, pone la mano en el mentón y puntos de pensar. Al mover, estira el brazo hacia la pieza (IK) justo antes del tween. Si gana: `success`; si pierde: `confused` y se rasca la cabeza | `aiMove()` / `move3D()` / `statusText()` → `cue('chess:*')` |
| **Estante** | Frente al estante; cuando sacas un libro, lo mira y señala (`pointing`) | `pointerDown` de `bookshelfStation` |
| **Lumbre** | Señala el póster y "presume" su juego | `enter()` |
| **Puerta (salir)** | Saluda con la mano antes de que cambie el modo | `kind:'exit'` en `interact()` |

---

## 5. Hablar e interactuar con él directamente

- **Click sobre JotAI** en vista general: te mira, saluda (`greeting`) y dice
  una frase corta según el contexto ("¿Jugamos ajedrez?", "zzz…" si duerme).
  Su hitbox va en una lista aparte de `interactiveMeshes` y se evalúa primero
  en `pick()`.
- **Globo de diálogo en escena:** un DOM proyectado sobre su cabeza, mismo
  patrón que `.gam-label` (texto nítido, estilo del sitio). Lleva typewriter
  como `ia-bubble.js` y un espejo `aria-live` para lectores de pantalla.
- **Frases bilingües** en `data/gam-jotai.json` (`{es,en}`, resueltas con
  `LangSwitcher.L`). El copy es texto, así que se puede ajustar sin tocar
  código.
- **Continuidad con el widget:** al entrar a jugar, `#jotai-widget` ya se
  oculta (`body.gam-playing`). Narrativamente, "JotAI se metió al juego".

---

## 6. Arquitectura de archivos

```
js/gam/
  gam-jotai.js          # modelo + rig + poses/clips + capas (vida, mirada, IK) + caras
  gam-jotai-nav.js      # grilla desde huellas de muebles, A*, suavizado, seguidor de camino
  gam-jotai-brain.js    # rutinas, prioridades, presencia, cues de estaciones, frases
  gam-jotai-bubble.js   # globo DOM proyectado (typewriter + aria-live)
data/
  gam-jotai.json        # frases bilingües por contexto
```

Cambios en archivos existentes:
- **`gam-three-scene.js`:** crear JotAI en `mount()`, `JOTAI_SPOTS`,
  `refs.chair`, llamar `jotai.update(now, dt)` en `frame()`
  (con `try/catch`: un throw ahí congela el loop entero), su capa de foco, su
  hitbox en `pick()`, pasar `jotai` en el `base` de `createStations` y
  liberarlo en `destroy()`.
- **`gam-stations.js`:** los `cue(...)` de la tabla de arriba, la pestaña
  Montar de la patineta y la reacción de Pukis como función reutilizable.
- **`analytics.js`:** `gam:jotai` → `track('gam_jotai', { action })`
  (routine_night, clicked, skate_bail…).
- Al terminar: documentarlo en `CLAUDE.md` (sección `.gam`) y en
  `docs/gam-mode-plan.md`.

---

## 7. Accesibilidad, mobile y performance

- **`prefers-reduced-motion`:** nada de rodar, JotAI aparece en el spot con
  un fade corto; poses estáticas sin bob ni parpadeo animado; los glifos se
  mantienen, pero sin desplazamiento. Las rutinas siguen ocurriendo, solo que
  por cortes.
- **Táctil (`lite`):** mismo personaje con menos segmentos (resorte, esferas)
  y sin sombras en las extremidades. El tap sobre JotAI funciona igual que el
  click.
- **Costo:** unas 40 mallas con materiales compartidos, un mezclador de poses y un A\* por
  destino (40 × 40, trivial). La grilla se calcula una vez. Hay que medirlo
  contra el presupuesto del loop actual (GTAO + bloom + blur ya son lo caro).
- **Pausa:** respeta `paused` (el shim `scene.pause()` de `gam-loader.js`) y
  el `document.hidden` implícito del rAF.

---

## 8. Fases

Cada fase se puede cerrar y revisar en el navegador antes de seguir.

**Fase 1: el personaje existe (sin moverse).** — ✔ **HECHA** (commit `8c7e319`). El modelo en código calcado
del render ARTI y calibrado a escala, rig con nombres, vida continua, mirada
al cursor, caras por estado y click → saludo + globo. Queda parado en un spot
fijo.
✅ *Se reconoce como JotAI, se ve bien con el bloom y las sombras, y no
tumba los FPS.*

**Fase 2: se mueve.** — ✔ **HECHA** (ver §11). Grilla, A\*, suavizado, locomoción rodando y paseo
autónomo de día.
✅ *Cruza el cuarto sin atravesar muebles, desde cualquier spot a cualquier
otro.* (verificado: los 90 pares de spots tienen camino y cada tramo tiene
línea de vista)

**Fase 3: la noche (el caso principal pedido).** — ✔ **HECHA** (ver §11). Rutina completa: se estira →
Pukis → escritorio → escribe → se duerme. Amanecer → despierta. Arranque
nocturno ya dormido, cámara cinemática en la ventana, skip, y click o
escritorio para despertarlo.
✅ *La secuencia se lee como una pequeña historia sin que el visitante
toque nada más.*

**Fase 4: estaciones.** — ✔ **HECHA** (ver §12). Antes se redefinieron los objetos del
cuarto (+ Logros, póster de Yoda, guitarra, barra de sonido). Piano (banqueta + demo del
Reto, sin IK), guitarra (la toca en brazos), ajedrez (rival, del lado de las negras),
malabares (cascada en sus manos), patineta (pestaña Montar + caídas), Logros, barra de
sonido, Star Wars, Pukis, estante, Lumbre y puerta.
✅ *Ninguna estación agrega espera y todas funcionan igual con JotAI
desactivado.*

**Fase 5: pulido.** — ⏭ **SIGUIENTE**. Analítica (`gam_jotai`), reduced-motion,
prueba en táctil real y en GPU, ajuste fino de encuadres, revisar el copy de las frases.

---

## 9. Riesgos conocidos

- **Encuadre:** algunos `focus()` están muy cerca (ajedrez con zoom 7.5, así
  que el banquito puede quedar fuera). Se resuelve spot por spot moviendo el
  `look`/`shift`, sin cambiar el sistema.
- **Blur de foco:** sin la capa de foco, JotAI sale borroso junto al objeto
  enfocado (ver §3).
- **Picks que compiten:** las estaciones hacen su propio raycast sobre listas
  concretas, así que JotAI no les roba clicks. En vista general sí se evalúa
  primero.
- **Interrupciones:** salir de una estación a mitad de camino, abrir otra o
  cambiar el día muy rápido. El token cancelable y las prioridades lo cubren;
  hay que probarlo a propósito.
- **Patineta:** la inspección 3D actual y "montar" son incompatibles en el
  mismo encuadre, por eso van en pestañas separadas.
- **"Uncanny" procedural:** si el robot en primitivas no convence, el rig por
  nombres permite cambiarlo a `.glb` sin tirar clips ni cerebro.

---

## 10. Decisiones

Todas resueltas el 2026-09-24 — ver el bloque al inicio del documento.

---

## 11. Traspaso — estado actual y cómo continuar (2026-09-29, tras la Fase 3)

> Pensado para retomar en un chat nuevo sin contexto previo. Leer esto + §8.

### Dónde está el código

- **Rama:** `feat/gam-jotai` (sale de `feat/gam-mode-threejs-spike`, pusheada a
  `origin`). Sin PR todavía. Commits: `66ef3d6` Lumbre como póster ·
  `ebaa30d` fix effects · `49049aa`/`633e7e9` git-history · `8c7e319` **JotAI Fase 1** ·
  **Fase 2** `50cd1b7` · **Fase 3** en el commit siguiente (`git log --grep "Fase 3"`).
- `data/git-history.json` lo regenera `npm run dev` al arrancar: aparece
  modificado casi siempre y se commitea aparte como `chore(data)`.

### Qué hay hecho (fases 1 a 3)

| Archivo | Qué contiene |
|---|---|
| `js/gam/gam-jotai.js` | `createJotai({ reducedMotion, lite, scale=0.92 })`. Modelo en código (~1.05 u de alto). Constantes arriba: `COLORS`, `MOVE` (locomoción), `POSES` (`stand`, `sit`, `type`, `sleepDesk`, `crouch`), `CLIPS` (`wave`, `nod`, `giggle`, `stretch`, `typing` (loop), `pet`, `startle`), `FACES` (10 caras, con `yawn`). API: `root`, `meshes`, `setFace(name, holdMs)`, `setPose(name)`, `play(clip, { loop }) → Promise`, `stopClip()`, `setLookTarget(v3\|null)`, `setTalking(bool)`, `headTop()`, `headWorld()`, `followPath(pts, { facing }) → Promise<bool>`, `faceTo(rad)`, `slideTo({x,z}, ms, heading) → Promise<bool>`, `stop()`, getters `moving` / `busy` / `face`, `update(now, dt)`, `dispose()`. Clips y caras usan el reloj del loop (`clockNow` = el `now` del último update), no `performance.now()` |
| `js/gam/gam-jotai-nav.js` | `createNavGrid(boxes, { half, cell, radius })` → `findPath(from, to)`, `nearestFree(x, z)`, `isFree`, `clear(a, b)` (línea de vista), `debugString()` (mapa ASCII). A\* 8-conexo sin cortar esquinas + suavizado. Si el destino cae en una celda bloqueada, termina en la libre más cercana |
| `js/gam/gam-jotai-bubble.js` | `createJotaiBubble(container, { reducedMotion })` → `say(text, {duration})`, `hide()`, `update(now, camera, anchorV3, w, h)`, getters `typing` / `visible`, `destroy()`. **`createJotaiCaption(container)`** → `show(text, onSkip, skipLabel)`, `hide()`: subtítulo de escena abajo al centro con botón "Saltar" (`.gam-jotai-caption*` en `gam-tv.css`) |
| `js/gam/gam-jotai-brain.js` | `createJotaiBrain({ jotai, bubble, caption, nav, spots, props, viewHeading, reducedMotion })` → `poke()`, `skip()`, `wantsStage(t)`, `update(now, { zoomed, focusLook, cursorLook, envT })`, QA: `goTo(id)`, `night()`, `dawn()`, getters `current` / `routine` / `seated` / `sleeping`. `props` = `{ chair, petPukis, emit }` (ver abajo). **Acá se cuelgan las estaciones de la Fase 4** |
| `data/gam-jotai.json` | Frases `{es,en}`: `hello`, `poke`, `tickle`, `night`, `wake`, `morning`, `muse_<spot>`. Agregar claves nuevas acá (y un fallback en `FALLBACK` del brain si no puede faltar) |
| `css/gam-tv.css` | `.gam-jotai-bubble*` y `.gam-jotai-caption*` (justo debajo de `.gam-label`) |
| `js/gam/gam-stations.js` | Pukis expone `react({ sound })` (corazones, cola, orejas, sin HUD). La ventana llama `c.onEnvScene(t)` y, si JotAI va a hacer su rutina, vuelve sola a la vista general a los 800 ms. `createStations` devuelve además `emit(glyph, color, pos, opts)` |

**Integración en `gam-three-scene.js`** (buscar por estos nombres):
- Junto a `FURNITURE`: `JOTAI_HOME` (posición inicial y spot `home`), `JOTAI_SPOTS`
  (`at` = [x, z] y `look` = [x, y, z] en coordenadas **locales** del mueble) y `NAV`
  (celda 0.17, radio 0.25, franja de alturas que bloquea: 0.06–1.1).
- Bloque `/* ── JotAI: personaje del cuarto` (tras el loop de `FURNITURE`):
  `collectNavBoxes()` — Box3 de **cada pieza** (`objects[].parts` + `decorParts`), no
  del mueble entero como decía §2: así la silla y la banqueta bloquean lo suyo sin
  tapar el hueco alrededor. `buildJotaiSpots(nav)` pasa los spots a mundo y los corre a
  celda libre (rumbo = mirar hacia `look`). Si la grilla falla, JotAI se queda quieto.
- `pickAny()` / `setJotaiHover()`: raycast conjunto muebles + JotAI (gana el
  más cercano). `onClick` → `jotaiBrain.poke()`. Tecla `J` en `onKeyDown`.
- En `frame()`, bloque `// JotAI: el brain decide qué mira…`: la escena solo calcula
  `focusLook` (objeto enfocado) y `cursorLook` (cursor movido en los últimos 4 s); la
  prioridad la decide el brain (foco > lo que mira en su spot > cursor > deriva).
  Después `brain.update` → `jotai.update` → des-hover si se alejó rodando de debajo del
  cursor → `bubble.update`, todo en `try/catch`.

**Cómo se mueve:**
- `followPath` recorre los puntos: fase `turn` (gira en el lugar, ruedas en sentidos
  opuestos) → `roll` (acelera a `MOVE.accel`, velocidad objetivo = √(2·decel·distancia
  hasta el fin o el próximo quiebre > `MOVE.sharp`), mínimo `vmin` para no quedar en
  Zenón) → `align` (gira hasta `facing`). Resuelve `true` al llegar, `false` si lo pisa
  otro `followPath`/`stop` (nunca rechaza). Capa corporal: torso inclinado por la
  aceleración + velocidad, la cabeza compensa, brazos un poco atrás, vaivén de cadera.
- Reduced-motion: corte directo al destino ya orientado (sin rodar).
- Tramos típicos: 3–8 s por viaje (`vmax` 1.3 u/s).

**Brain:**
- Token `seq`: cada `goTo` lo incrementa; al volver de un `await`, si ya no es el
  vigente, se corta. `interrupt()` (poke, `makeRoom`, QA) incrementa `seq` e
  `interrupts`, frena y reprograma el próximo paseo.
- `sleep(ms)` se resuelve en `update()` con el reloj del loop (`clock`), no con
  `setTimeout`: la pausa del cuarto (panel abierto) también pausa las rutinas.
- Paseo: solo en vista general, quieto (`!jotai.busy`), sin globo y ya saludado. Elige un
  spot distinto del actual y de los últimos `RECENT`; al llegar aplica `SPOT_ACTS[id]`
  (cara, `hold` mirando `spot.look`, clip opcional) y con `MUSE_CHANCE` dice `muse_<id>`.
- `makeRoom(f)` al empezar un zoom: si está en el spot de ese objeto, va hacia él, o
  está a menos de `CLEARANCE` (1.4 u), se va a `home` (evita taparle a la cámara el
  ajedrez/piano). En la Fase 4 las estaciones lo usan en vez de apartarlo.

### La noche (Fase 3) — cómo funciona

- **Fase día/noche** en el brain con histéresis sobre `env.t` (lo pasa la escena en
  `update`): `≥ NIGHT_T` (0.75) → noche, `≤ DAY_T` (0.25) → día. El primer `update`
  decide: si el cuarto arranca de noche (`envFromClock()`), `startAsleep()` lo deja ya
  dormido en la silla, sin rutina ni subtítulo. El saludo espera a que esté despierto.
- **Rutinas** con `run(nombre, fn)` (token `seq`; cada paso chequea `ok()` al volver de
  un `await`): `stroll` (día), `night`, `bed` (la corta: silla → teclear 2.5 s → dormir),
  `dawn`, `goTo`. `interrupt()` corta la vigente y deja el cuerpo coherente: termina las
  animaciones de la silla de golpe (`finishAnims`), y si estaba subiéndose o bajándose
  de la silla aplica `snap` (estado final). `sleep`/`anim` corren con el reloj del loop.
- **`night`**: bostezo + `stretch` → Pukis (`crouch`, `slideTo` hasta ~0.35 de la cabeza,
  clip `pet` + 3 × `props.petPukis()`) → `sitDown` → `typeThenSleep` (pose `type` + loop
  `typing` mirando el monitor secundario, bostezo, `sleepDesk` + cara `sleeping`; una "z"
  cada `Z_EVERY`). ~26 s en total.
- **`dawn`**: bosteza, `stretch` (sentado si estaba en la silla), `getUp`, saluda con
  `morning`. **`skip()`** (botón Saltar) salta al estado final de la que esté corriendo.
- **Silla** (`makeChairProp()` en la escena, `out.refs.chair` en `case 'desk'`):
  `set(k)` va de su lugar (k=0) a arrimada (k=1, `TUCK`) **girada −0.6 rad hacia el
  monitor secundario** — recta, el respaldo quedaba entre la cámara isométrica y JotAI y
  lo tapaba. `seat()` → `{ x, z, heading, side, look }`. `sitDown`: `travel('desk')` →
  silla a k=1 → rueda al `side` (fuera de la grilla) → `setPose('sit')` + `slideTo` al
  asiento. `getUp` al revés. Sentado, la escena le suma a `root.y` el `lift` del hover
  del escritorio.
- **Despertarse**: toque mientras duerme o abrir el escritorio (`onZoom` con `seated`)
  → `wakeStartled()` (cara `confused`, clip `startle`, glifo "!"); queda sentado y a los
  `BACK_TO_SLEEP` (10 s) de estar solo corre `bed`. De noche y despierto nunca pasea.
- **Cámara**: la ventana (`windowStation.goTo`) pregunta `c.onEnvScene(t)` →
  `brain.wantsStage(t)`; si hay rutina, sale a la vista general a los 800 ms. El
  subtítulo se oculta mientras hay zoom y vuelve al salir.
- Reduced-motion: las rutinas pasan igual, por cortes (sin rodar ni clips).

### Arranque concreto de la Fase 4 (estaciones)

Una estación por commit, en el orden de §8. Pautas comunes:
1. **Reemplazar `onZoom` por estación.** Hoy, al enfocar un objeto junto al que está,
   se aparta (`makeRoom`, dentro de `onZoom`). Para las estaciones con papel de JotAI,
   `onZoom(f)` debe ir al spot de esa estación (`run('station', …)`) y hacer lo suyo; al
   salir del zoom, volver a la iniciativa propia. Sin JotAI (`jotaiFailed`) todo tiene
   que seguir igual.
2. **Capa de foco:** mientras esté en la estación activa, `setFocusLayer(jotai.root,
   true)` (función de la escena) para que no salga desenfocado; apagarla al salir.
3. **Bus de eventos:** pasar `cue: (evento, datos) => jotaiBrain.cue?.(evento, datos)`
   en el `base` de `createStations` y llamarlo con `c.cue?.(…)` desde las estaciones
   (tabla de §4: `piano:key`, `chess:*`, `pukis:pet`, …).
4. **Sentarse en otros lados** (banqueta del piano, banquito del ajedrez): generalizar
   `sitDown`/`getUp` para recibir un "prop" como `chair` (`set(k)` opcional + `seat()`).
   La banqueta del piano es más baja que la silla: la pose `sit` tiene `hipsY` fijo
   (0.285 ≈ asiento a 0.6 u) — hará falta pasar la altura o una variante de pose.
5. **Piano** (primera): `createPiano({ onFlash })` ya avisa cada nota (jugador o
   demo). Sin IK todavía: alcanza con mover la mano del lado de la tecla (dos poses
   por lado) y que la cabeza la siga con `gaze`.

### Cómo verificar (sin la extensión de Chrome)

La extensión de Chrome no estaba conectada en la sesión anterior. Lo que
funcionó: **Playwright** del repo (`node_modules/playwright`) con Chromium
headless + SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`),
viewport 1440×900, `localStorage.portfolio-mode='gam'` en `addInitScript`,
click en `.gam-tv__start` y esperar `#gam-canvas-root canvas` (con
`state:'attached'`). Con la escena por defecto, JotAI queda en pantalla ≈ (773, 640).

Trampas del entorno headless:
- SwiftShader renderiza a **~1 fps**, y una captura a DPR 2–3 tarda varios
  segundos: los clips (~1–2 s) y el globo (~4 s) terminan antes de capturarlos.
- Truco para ver poses: en `addInitScript`, envolver `performance.now` y el
  timestamp de `requestAnimationFrame` con un reloj virtual escalable
  (`__setSlow(f)`, `__advance(ms)`). Usar `__gamJotai.jotai.play(...)` /
  `setFace(...)` y avanzar de a 50 ms con ~1.3 s reales entre pasos (cada
  frame necesita `dt>0` para que la amortiguación avance).
- **Nunca `__setSlow(0)`**: con el tiempo congelado la página se cuelga
  (algo espera a que `performance.now()` avance).
- `page.clock.install()` también sirve, pero es demasiado lento con SwiftShader.
- Matar los Chromium que quedan colgados antes de reintentar (`pkill -f headless`).

Verificar la locomoción y el brain **sin render** (lo que se usó en la Fase 2): dentro
de un `page.evaluate` async, avanzar un reloj virtual llamando a mano
`brain.update(t, { zoomed })` + `jotai.update(t, 0.016)` en un bucle, y entre pasos
`for (k<6) await null` — solo microtareas, así las promesas de `followPath`/`goTo` se
resuelven pero el rAF real no corre en el medio. Llamar **un** `update` antes del
primer `goTo`: con SwiftShader cada frame real tarda segundos y el `clock` del brain
queda atrasado, lo que adelanta el paseo autónomo. `nav.debugString()` + los spots
marcados con letras da el mapa de la grilla; chequear `findPath` para todos los pares
y `nav.clear()` en cada tramo.

### Pendientes y deudas conocidas

- JotAI no entra en `FOCUS_LAYER`: al enfocar un objeto sale desenfocado (Fase 4, ver arriba).
- Las estaciones no saben de JotAI (salvo la ventana y Pukis vía `react`) — Fase 4.
- Paseando puede cruzar por delante de un objeto mientras la cámara vuela hacia él
  (`makeRoom` solo mira dónde está y a dónde va, no el rayo de la cámara).
- La pantalla del escritorio no pasa a "protector" mientras duerme (el plan lo sugería).
- Nada de analítica todavía (`gam_jotai` en `js/analytics.js`, Fase 5).
- No se probó en un dispositivo táctil real ni en un navegador con GPU (solo headless).

---

## 12. Fase 4 — cómo quedó (2026-10-02)

Rama `feat/gam-jotai-fase4` (desde `main`, sin push). Commits: objetos nuevos (`cbc1a18`,
`6a99767`, `34ac886`, `b43d931`) y JotAI en las estaciones (el siguiente).

**Objetos del cuarto (decididos con David el 2026-10-01):** los 10 de antes + **Trofeos**
(`medals`, los 3 Aegis de Dota 2 en cajas: al frente, giran con el mouse, se abren y
muestran edición + año — cambiado el 2026-10-02, antes eran certificados), **Star Wars** (`starwars`, póster de Yoda real, solo se acerca),
**guitarra** (`guitar`, clásica con cutaway calcada de la de David, `gam-guitar.js`) y
**barra de sonido** (`soundbar`, estilo Mi Soundbar sobre el estante, la playlist).
Pendiente de David: canciones de la guitarra y la playlist (placeholders en
`gam-hotspots.json` / `SONGS`).

**Brain (`gam-jotai-brain.js`):**
- `ROLES` (tabla por estación: `seat`, `pose`, `face`, `clip`/`loop`, `near`, `point`,
  `faceCam`, `line`) reemplaza a `STATION_POSE`; `STATION_IDS` se exporta para la capa de
  foco. `enterStation(f)` → `travel` → (sentarse / arrimarse / girarse a cámara) → `duty = id`.
  `leaveStation()` al salir del zoom: se levanta con calma (`standFrom`) o vuelve al spot si
  estaba arrimado (Pukis).
- Asientos de estación: `props.seats = { bench }` (`makeSeatProp` en la escena:
  `PIANO_SEAT`, coords locales). `sitOn(name)` / `standFrom()`; estado
  `perch` + `perchHips`. `interrupt({ keepPerch })`: sin `keepPerch` baja de golpe al costado
  (noche, otra estación). La silla del escritorio sigue aparte (`seated`, rutina nocturna).
  `hipsForSeat(topY)` / `hipsForStand(y)` pasan alturas del mundo a `hipsY` con `scale`.
- `cue(evento, datos)` despacha por prefijo (`CUE_STATION`) y solo si está de servicio ahí:
  `piano:key|phase`, `guitar:strum|end`, `chess:think|move|end`, `juggle:mode|catch|fail`,
  `skate:mount|pos|trick|dismount`, `medals:pick`, `book:pick`, `lumbre:shot`, `pukis:pet`.
- De servicio puede hablar con zoom (el globo no se oculta) y su `gaze` le gana al objeto
  enfocado (mirar la tecla que suena, la pieza que mueve). `farewell()` en la puerta.
- Getters nuevos: `duty`, `riding`, `moving`.

**Personaje (`gam-jotai.js`):** poses `pianoSit`, `chessStand`, `chin`, `guitarHold`,
`juggle`, `ride`, `fallSit`; clips `reachL/R`, `scratch`, `strum`, `juggleHands`,
`pointL/R`, `salute`, `bob`, `hop`, `wobble`, `dust`; `setPose(name, { hipsY })`,
`handsWorld()`.

**Escena:** banqueta del piano más cerca del teclado; el ajedrez quedó con **un solo
banquito** (el del visitante, blancas): JotAI juega **de pie** del lado de las negras, solo
rueda hasta la mesa cuando hay partida (pedido de David, 2026-10-02) — de paso se arregló
que el spot del ajedrez quedaba fuera del cuarto. Mesa y pedestal de malabares girados 90°.
Al enfocar un objeto la cámara ya **no orbita** con el cursor (se sacó el free-look). Spot de malabares al costado del
pedestal. Ganchos en el `base` de las estaciones: `jotaiHere()`, `jotaiRiding()`,
`jotaiHands()`, `jotaiGuitar()` (todos null/false sin JotAI).

**Estaciones:** el piano avisa las fases del Reto (`onPhase` en `gam-piano.js`); la
guitarra pasa de flotar a sus brazos (`hold()`, escala 0.62, en diagonal); el ajedrez
avisa think/move/end y espera 260 ms para que estire el brazo; los malabares hacen la
cascada entre sus palmas (`jotaiCascade`); la patineta tiene **Ver / Montar** (tabla
acostada, círculo `RIDE` entre Pukis y el pedestal, trucos que siempre fallan: `stuck`,
`shoot`, `wobble`).

**Verificado (headless, SwiftShader):** brain con reloj virtual en las 11 estaciones (llega,
queda de servicio, cues, sale, la noche desde la banqueta); capturas de piano, guitarra,
ajedrez, malabares, patineta (montar + caída), Logros y Pukis; JotAI desactivado (la
patineta no ofrece Montar, el ajedrez juega igual). **No** probado en GPU real ni táctil.

**Pendientes:**
- Las manos del piano son por lado (sin IK); el piano se ve de espaldas a JotAI.
- Al salir de la patineta montado, queda donde estaba la tabla (en la grilla, pero no en su spot).
- Analítica `gam_jotai` y reduced-motion fino (Fase 5).

