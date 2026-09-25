# Modo `.gam` — JotAI como personaje del cuarto (plan)

> Estado: **aprobado** (2026-09-24) — **Fase 1 enviada** (revisada por David en
> navegador el 2026-09-25). Siguiente: Fase 2 (locomoción). Se apoya en el diorama
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
  `refs.doorLeaf` y `refs.chair`, llamar `jotai.update(now, dt)` en `frame()`
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

**Fase 1: el personaje existe (sin moverse).** El modelo en código calcado
del render ARTI y calibrado a escala, rig con nombres, vida continua, mirada
al cursor, caras por estado y click → saludo + globo. Queda parado en un spot
fijo.
✅ *Se reconoce como JotAI, se ve bien con el bloom y las sombras, y no
tumba los FPS.*

**Fase 2: se mueve.** Grilla, A\*, suavizado, locomoción rodando y paseo
autónomo de día.
✅ *Cruza el cuarto sin atravesar muebles, desde cualquier spot a cualquier
otro.*

**Fase 3: la noche (el caso principal pedido).** Rutina completa: se estira →
Pukis → escritorio → escribe → se duerme. Amanecer → despierta. Arranque
nocturno ya dormido, cámara cinemática en la ventana, skip, y click o
escritorio para despertarlo.
✅ *La secuencia se lee como una pequeña historia sin que el visitante
toque nada más.*

**Fase 4: estaciones.** Piano (manos por IK + demo del Reto) → ajedrez (rival)
→ malabares (cascada en sus manos) → patineta (pestaña Montar + caída) →
Pukis, estante, Lumbre, puerta. Una estación por commit.
✅ *Ninguna estación agrega espera y todas funcionan igual con JotAI
desactivado.*

**Fase 5: pulido.** Frases bilingües, analítica, reduced-motion, prueba en
táctil real, ajuste de encuadres y la documentación.

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
