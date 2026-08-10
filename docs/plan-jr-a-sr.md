# Plan de crecimiento: Junior → Senior

> Documento de planificación personal, redactado el 10 de agosto de 2026.
> Basado en el estado del portafolio a esa fecha: 33 proyectos (14 `.dev`, 12 `.ia`, 7 `.sec`)
> y el puesto actual de Junior Developer en la Dirección de Sistemas Digitales de la UTE.

---

## 0. Base de evidencia y sus límites

Este análisis se construyó leyendo `data/dev-projects.json`, `data/ia-projects.json`,
`data/sec-projects.json` y `EXPERIENCE_DATA` en `js/sections.js`.

**Esos archivos son copy de portafolio, no la verdad del código.** Si un proyecto tiene
tests, CI o documentación de operación y no está declarado en el JSON, este análisis no
lo ve y lo cuenta como ausente. Antes de actuar sobre cualquier punto, verificar contra
los repos reales.

---

## 1. La premisa a corregir

La pregunta original fue *"¿qué proyectos debo hacer para subir de nivel?"*.

El cuello de botella **no es el proyecto número 34**. Con 33 proyectos ya construidos, el
patrón dominante es: *muchos proyectos nuevos, en solitario, greenfield, de corta duración*.
Ese es exactamente el perfil de un junior productivo.

Lo que falta no es cantidad. Es **profundidad, operación y código ajeno**.

---

## 2. Los cuatro huecos transversales

### 2.1 Nada muestra usuarios reales bajo carga

XV Tammy es lo más cercano: invitados reales validándose con QR en la puerta de un evento.
El resto son demos desplegadas en Railway. No hay evidencia de un sistema que haya
sobrevivido al contacto con carga real, fallos reales o usuarios impredecibles.

**Por qué importa:** la diferencia entre "lo construí" y "lo operé" es la frontera jr/sr
más reconocible en una entrevista.

### 2.2 Testing y operación casi invisibles

`whisperX` es el único proyecto que declara tests (39, con OpenAI mockeado). En los 32
restantes no aparece mención de suite de tests, CI, pruebas de carga, SLOs, alertas ni
postmortems.

**Por qué importa:** a un senior se le reconoce por su disciplina de pruebas y
observabilidad antes que por su velocidad escribiendo features.

### 2.3 Cero brownfield

Los 33 proyectos son greenfield propios. La habilidad senior central —entrar a un código
grande, ajeno y vivo; entenderlo; y cambiarlo sin romperlo— no está evidenciada en ninguno.

**Por qué importa:** el trabajo senior real es mayoritariamente brownfield. Irónicamente,
el trabajo diario en la UTE (Banner ERP, sistemas legacy) *sí* es brownfield puro y es el
material más rico y menos aprovechado del inventario.

### 2.4 Dispersión de stack

Django, Angular, Next.js, FastAPI, .NET, Unity, React Native, Node, Supabase, Neo4j.
Aproximadamente diez stacks en 33 proyectos.

**Por qué importa:** la amplitud es señal de junior explorando. La profundidad sostenida
en uno o dos stacks es señal de senior. La dispersión también diluye el mensaje del
portafolio: no queda claro qué se domina.

---

## 3. Recomendaciones por modo

### 3.1 Modo `.dev`

#### Prioridad 1 — Llevar UBApp de demo a operable

**No construir nada nuevo.** UBApp es el proyecto más sustancial del inventario (proyecto
de titulación con distinción, Django REST + Angular + pgvector, búsqueda semántica que
bajó un flujo de 4 min a 20 s). Ya tiene la parte difícil hecha.

Lo que le falta es todo lo que lo convierte en un sistema y no en una demo:

- Suite de tests con cobertura declarada (unitarios + integración sobre la API)
- CI que corra esos tests en cada push
- Pruebas de carga con números publicados: cuántas req/s aguanta, dónde se degrada
- Observabilidad: métricas, logs estructurados, alertas
- Un SLO explícito y documentado
- Estrategia de migración de base de datos y de rollback

**El entregable no es la app, es el README.** Un documento que diga: *esto aguanta X,
así se despliega, así se revierte, así se monitorea, esto es lo que se rompe primero.*

Este salto —de "funciona" a "es operable"— **es** la frontera jr/sr, y es la acción de
mayor señal por unidad de esfuerzo de todo este plan.

#### Prioridad 2 — Profundidad real en .NET/Oracle

Es el stack pagado y el único contexto con acceso a dominio real que nadie más tiene.
Construir algo reutilizable que la propia Dirección de Sistemas adopte:

- Un harness para medir y comparar performance de procedimientos PL/SQL
- O un framework de generación de reportes sobre Banner

**Señal senior:** tu código sobrevive a tu ticket. Que otra persona del equipo lo use
seis meses después vale más que diez proyectos personales.

#### Prioridad 3 — Contribuir a un OSS grande y ajeno

Aunque sean tres PRs aceptados en un proyecto establecido del stack propio. Es la única
forma práctica de cubrir el hueco 2.3, porque ningún proyecto propio lo va a cubrir jamás.

Valor secundario: expone a code review de gente con más experiencia, que es el mecanismo
de aprendizaje más rápido que existe.

---

### 3.2 Modo `.ia`

#### El problema de fondo: muchos wrappers, ninguna evaluación

Hay doce proyectos de IA y ninguno declara evaluación de calidad. `LLM Observatory` mide
costo y latencia — no mide si las respuestas son *buenas*. Ningún proyecto menciona
conjuntos de evaluación, métricas de accuracy ni detección de regresión al cambiar un prompt.

**Acción concreta:** meterle evaluación rigurosa a `CodeReviewX` o a `Visual QC Inspector`.

- Dataset etiquetado a mano como verdad de referencia
- Métricas de precisión/recall reportadas
- Suite de regresión que detecte cuándo un cambio de prompt empeora los resultados
- Comparación entre modelos con esos mismos criterios

Esto separa a quien hace ingeniería de IA de quien envolvió una API. Es, con diferencia,
el diferenciador más grande disponible en este modo.

#### Terminar KOS

Es de lejos lo más ambicioso del inventario: grafo de conocimiento en Neo4j con nueve
tipos de entidad, agentes de IA coordinados, embeddings locales con Ollama, y stack de
observabilidad completo (OpenTelemetry + Prometheus + Grafana).

Hay **dos proyectos simultáneos en estado "En desarrollo"** (KOS y ZeroDay) y un historial
claro de arrancar cosas nuevas. Cerrar uno difícil comunica más madurez que abrir dos.

#### Ingeniería de costo y latencia

Existen las piezas (`whisperX` como servicio central, `LLM Observatory` como monitoreo)
pero no la historia completa de servir en producción: caché, batching, fallback entre
modelos, y coste por petición medido y optimizado con números antes/después.

---

### 3.3 Modo `.sec`

#### Diagnóstico honesto

**Es el modo más débil y el que peor representa al perfil.**

- Meow, Fawn, Dancing y Redeemer son los cuatro labs de *Starting Point* de HackTheBox,
  el nivel más fácil que existe en la plataforma.
- Los dos certificados (Cisco *Introduction to Cybersecurity*, IBM *Ciberseguridad*) son
  introductorios.

Alguien que contrata seguridad lo lee como nivel principiante. Y el daño no se queda en
ese modo: le resta credibilidad a `.dev` y `.ia`, que sí tienen sustancia.

#### Dos caminos honestos — elegir uno

**Opción A — Reencuadrar hacia AppSec.** Es donde un perfil de desarrollador tiene ventaja
estructural sobre un pentester puro, y ya existe la semilla: SecuraBank (OWASP Top 10) y
las prácticas en ESPOCH DETIC.

- Threat modeling documentado de sistemas propios
- SAST/DAST integrado en CI
- Escaneo de dependencias y cadena de suministro
- **Entregable estrella:** una evaluación de seguridad completa de las apps propias en
  producción, con hallazgos, explotación demostrada, corrección y comparativa antes/después

**Opción B — Invertir en serio en ofensiva.** La ruta CPTS de HackTheBox o equivalente,
asumiendo con realismo que son meses de trabajo sostenido.

**Lo que no funciona es dejarlo como está.** Es la decisión más urgente de este documento.

---

## 4. Lo incómodo

De junior a senior **no se sube por portafolio.**

Se sube por alcance de responsabilidad, criterio técnico, comunicación e impacto medible.
La palanca principal para eso es el puesto en la UTE, no los proyectos personales. Los
side projects son evidencia de apoyo, no el motor.

Traducido a lo que hay que buscar activamente en el trabajo:

- Tomar problemas más ambiguos y de mayor alcance, no solo tickets bien definidos
- Ser la persona que otros consultan sobre un área concreta del sistema
- Medir y comunicar impacto en términos del negocio, no en features entregadas
- Mentorizar a alguien, aunque sea informalmente
- Participar en decisiones de diseño, no solo de implementación

Un portafolio brillante con un rol junior estancado no produce un ascenso. Un rol con
alcance creciente sí, y ahí el portafolio funciona como respaldo.

---

## 5. Orden de ejecución sugerido

Si solo se hace **una** cosa: **Prioridad 1 de `.dev` (UBApp operable)**. Máxima señal por
unidad de esfuerzo y no requiere empezar nada nuevo.

| # | Acción | Modo | Impacto | Esfuerzo |
|---|--------|------|---------|----------|
| 1 | UBApp: tests, CI, carga, observabilidad, SLO, rollback | `.dev` | Muy alto | Medio |
| 2 | Decidir el rumbo de `.sec` (AppSec o CPTS) y ejecutarlo | `.sec` | Alto | Alto |
| 3 | Evaluación rigurosa en CodeReviewX o Visual QC | `.ia` | Alto | Medio |
| 4 | Terminar KOS y congelar ZeroDay hasta cerrarlo | `.ia` | Medio | Alto |
| 5 | Herramienta .NET/Oracle adoptada por el equipo UTE | `.dev` | Alto | Medio |
| 6 | 3 PRs en un OSS grande y ajeno | `.dev` | Medio | Bajo |

**Regla transversal: no arrancar proyectos nuevos hasta cerrar los dos que están en
desarrollo.** El patrón a romper es el de acumular inicios.

---

## 6. Cómo medir el avance

Señales de que el movimiento jr→sr está ocurriendo de verdad:

- [ ] Existe al menos un sistema propio con SLO documentado y evidencia de operación
- [ ] Existe al menos un proyecto de IA con métricas de calidad, no solo de costo
- [ ] Hay contribuciones aceptadas en un código base que no es propio
- [ ] El modo `.sec` refleja un nivel que se puede defender en entrevista
- [ ] En la UTE: alcance de problemas asignados creciendo, no solo volumen
- [ ] Número de proyectos abiertos simultáneamente en desarrollo: ≤ 1
