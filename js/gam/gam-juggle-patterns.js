/**
 * gam-juggle-patterns.js — patrones de malabares de JotAI (modo .gam).
 *
 * Solo lógica: devuelve dónde está cada pelota en un marco local de las manos
 * — x a lo largo de izquierda → derecha (las manos en x = ∓1), y hacia arriba
 * (0 = altura de las manos) y z hacia adelante (hacia quien mira). Las
 * unidades son "medio ancho entre manos"; la estación las escala y las pasa
 * al mundo (ver la estación `juggling` en gam-stations.js).
 *
 * Los patrones son siteswaps asíncronos (las manos lanzan alternadas, un
 * lanzamiento por tiempo; el número = cuántos tiempos tarda en volver a
 * lanzarse esa pelota): cascada `3`, ducha `51`, una mano `40`, fuente de 4
 * `4`. Columnas no es asíncrono y va aparte. Cada pelota sigue su propio
 * estado (lanzada en el tiempo `c`, se vuelve a lanzar en `n`): el arranque
 * sale solo — las pelotas se lanzan de a una.
 *
 * Profundidad (que no se vea como un plano): lo que lanza la derecha pasa
 * por delante y lo de la izquierda por detrás, se lanza adelante y se recibe
 * atrás, y la mano lleva la pelota en un "cucharón" (baja y avanza).
 */

export const DWELL = 0.55;      // tiempos que la pelota pasa en la mano
const H3 = 1.8;                 // altura de un lanzamiento "3" (más alto tapaba la cara de JotAI)
const DIP = 0.32;               // cuánto baja la mano en el cucharón
const ZT = 0.28, ZC = -0.22;    // z donde se lanza / donde se recibe
const BULGE = 0.38;             // separación adelante / atrás en el aire

export const PATTERNS = [
  {
    id: 'cascade', n: 3, ss: [3], throwX: 0.45, catchX: 1.2, beat: 0.27,
    name: { es: 'Cascada', en: 'Cascade' },
    desc: { es: 'el clásico: cada pelota cruza al otro lado y dibuja una X', en: 'the classic: every ball crosses over, tracing an X' },
  },
  {
    id: 'reverse', n: 3, ss: [3], throwX: 1.25, catchX: 0.4, beat: 0.27,
    name: { es: 'Cascada inversa', en: 'Reverse cascade' },
    desc: { es: 'se lanza por fuera y las pelotas caen por el medio', en: 'thrown from the outside, the balls drop down the middle' },
  },
  {
    id: 'shower', n: 3, ss: [5, 1], throwX: 0.5, catchX: 1.15, beat: 0.24,
    name: { es: 'Ducha', en: 'Shower' },
    desc: { es: 'una mano lanza alto y la otra devuelve por abajo, en círculo', en: 'one hand throws high, the other passes back low, in a circle' },
  },
  {
    id: 'columns', n: 3, columns: true, beat: 0.27,
    name: { es: 'Columnas', en: 'Columns' },
    desc: { es: 'las de los costados suben juntas y la del medio sola', en: 'the outer two rise together, the middle one on its own' },
  },
  {
    id: 'onehand', n: 2, ss: [4, 0], throwX: 0.35, catchX: 1.25, beat: 0.25,
    name: { es: 'Una mano', en: 'One hand' },
    desc: { es: '2 pelotas en la derecha, dando vueltas — la izquierda descansa', en: '2 balls circling in the right hand — the left one rests' },
  },
  {
    id: 'four', n: 4, ss: [4], throwX: 0.45, catchX: 1.25, beat: 0.22, drops: true,
    name: { es: '4 pelotas', en: '4 balls' },
    desc: { es: 'dos en cada mano… todavía no le sale', en: 'two in each hand… he can’t do it yet' },
  },
];

const hand = (k) => (k % 2 === 0 ? 1 : -1);   // tiempos pares: derecha (+1)
const lerp = (a, b, t) => a + (b - a) * t;

/** Altura de un vuelo que dura `f` tiempos (crece más lento que la física real,
 *  así el "5" de la ducha entra en cuadro). */
const heightFor = (f) => H3 * Math.pow(Math.max(f, 0) / (3 - DWELL), 1.4);

/** Estado de un patrón: `sample(tau, out)` llena out[i] = {x,y,z} para el
 *  tiempo `tau` (en tiempos, desde que arrancó). `tau` tiene que crecer. */
export function createPattern(p) {
  const balls = [];

  if (!p.columns) {
    // arranque: en cada tiempo con lanzamiento al que no llega ninguna pelota, entra una nueva
    const per = p.ss.length;
    const lands = new Set();
    for (let k = 0; balls.length < p.n && k < 64; k++) {
      const v = p.ss[k % per];
      if (!v) continue;
      if (!lands.has(k)) balls.push({ c: null, n: k, v: 0, from: hand(k), to: hand(k) });
      lands.add(k + v);
    }
  }

  function advance(tau) {
    const per = p.ss.length;
    for (const b of balls) {
      while (tau >= b.n) {
        const v = p.ss[b.n % per];
        b.c = b.n;
        b.v = v;
        b.from = hand(b.n);
        b.n += v;
        b.to = hand(b.n);
      }
    }
  }

  function sampleSiteswap(tau, out) {
    advance(tau);
    balls.forEach((b, i) => {
      const o = out[i];
      if (b.c === null) {
        // todavía no la lanzó: espera en la mano que la va a lanzar
        o.x = b.from * lerp(p.catchX, p.throwX, 0.5); o.y = -DIP * 0.6; o.z = lerp(ZC, ZT, 0.5);
        return;
      }
      const flight = b.v - DWELL;
      const s = (tau - b.c) / flight;
      if (s < 1) {
        const same = b.from === b.to;
        // cruzadas: la derecha por delante, la izquierda por detrás; en la misma
        // mano se alternan para que las dos de la fuente no se pisen
        const side = same ? (Math.floor(b.c / 2) % 2 ? 1 : -1) : b.from;
        o.x = lerp(b.from * p.throwX, b.to * p.catchX, s);
        o.y = 4 * heightFor(flight) * s * (1 - s);
        o.z = lerp(ZT, ZC, s) + side * BULGE * Math.sin(Math.PI * s) * (same ? 0.6 : 1);
      } else {
        // cucharón: de donde la recibe (afuera, atrás) a donde la lanza (adentro, adelante)
        const u = Math.min(1, (tau - (b.n - DWELL)) / DWELL);
        o.x = lerp(b.to * p.catchX, b.to * p.throwX, u);
        o.y = -DIP * Math.sin(Math.PI * u);
        o.z = lerp(ZC, ZT, u);
      }
    });
  }

  /* Columnas: ciclo de 4 tiempos — las de los costados suben juntas en 0 y la
     del medio en 2, recta. Las tres suben y bajan sin cruzarse. */
  const CYCLE = 4, CDWELL = 0.8;
  function sampleColumns(tau, out) {
    const flight = CYCLE - CDWELL;
    const h = heightFor(flight * 0.62);
    [[-0.95, 0, -0.5], [0, 2, 1], [0.95, 0, -0.5]].forEach(([x, off, depth], i) => {
      const o = out[i];
      const t = tau - off;
      o.x = x;
      if (t < 0) { o.y = -DIP * 0.6; o.z = 0; return; }
      const ph = t % CYCLE;
      if (ph < flight) {
        const s = ph / flight;
        o.y = 4 * h * s * (1 - s);
        o.z = depth * BULGE * Math.sin(Math.PI * s);   // la del medio adelante, las otras atrás
      } else {
        o.y = -DIP * Math.sin(Math.PI * (ph - flight) / CDWELL);
        o.z = 0;
      }
    });
  }

  return {
    n: p.n,
    sample: (tau, out) => (p.columns ? sampleColumns(tau, out) : sampleSiteswap(tau, out)),
  };
}
