/**
 * gam-jotai-nav.js — navegación de JotAI por el piso del cuarto (Fase 2 de
 * docs/gam-jotai-plan.md).
 *
 * Grilla cuadrada sobre el piso (`half` = medio lado, `cell` = tamaño de
 * celda). Las celdas bloqueadas salen de las cajas reales (Box3 en mundo) de
 * las piezas de los muebles, infladas por el radio del personaje: la escena
 * decide qué cajas cuentan (ver `collectNavBoxes` en gam-three-scene.js).
 * Se calcula una sola vez al montar.
 *
 * `findPath` = A* 8-conexo (sin cortar esquinas) + suavizado por línea de
 * vista, así el camino no queda en zigzag de celda en celda.
 *
 * API: createNavGrid(boxes, { half, cell, radius }) →
 *   { findPath(from, to) → [{x,z}…] | null, nearestFree(x, z) → {x,z} | null,
 *     isFree(x, z), clear(a, b), debugString() }
 */

export function createNavGrid(boxes, { half = 3.4, cell = 0.17, radius = 0.25 } = {}) {
  const N = Math.ceil((half * 2) / cell);
  const blocked = new Uint8Array(N * N);
  const cx = (i) => -half + (i + 0.5) * cell;          // centro de la celda en mundo
  const toI = (v) => Math.floor((v + half) / cell);
  const inside = (ix, iz) => ix >= 0 && iz >= 0 && ix < N && iz < N;
  const idx = (ix, iz) => iz * N + ix;

  // Bordes del piso: el centro de JotAI nunca a menos de `radius` del borde
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      if (Math.abs(cx(ix)) > half - radius || Math.abs(cx(iz)) > half - radius) blocked[idx(ix, iz)] = 1;
    }
  }
  // Muebles: celda bloqueada si su centro queda a menos de `radius` del rectángulo de la caja
  boxes.forEach((b) => {
    const x0 = Math.max(0, toI(b.min.x - radius)), x1 = Math.min(N - 1, toI(b.max.x + radius));
    const z0 = Math.max(0, toI(b.min.z - radius)), z1 = Math.min(N - 1, toI(b.max.z + radius));
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const px = cx(ix), pz = cx(iz);
        const dx = Math.max(b.min.x - px, 0, px - b.max.x);
        const dz = Math.max(b.min.z - pz, 0, pz - b.max.z);
        if (dx * dx + dz * dz < radius * radius) blocked[idx(ix, iz)] = 1;
      }
    }
  });

  const freeCell = (ix, iz) => inside(ix, iz) && !blocked[idx(ix, iz)];
  const isFree = (x, z) => freeCell(toI(x), toI(z));

  /** Celda libre más cercana (BFS en anillos). */
  function nearestCell(x, z) {
    const ix = toI(x), iz = toI(z);
    if (freeCell(ix, iz)) return [ix, iz];
    for (let r = 1; r < N; r++) {
      let best = null, bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!freeCell(ix + dx, iz + dz)) continue;
          const d = (cx(ix + dx) - x) ** 2 + (cx(iz + dz) - z) ** 2;
          if (d < bestD) { bestD = d; best = [ix + dx, iz + dz]; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function nearestFree(x, z) {
    if (isFree(x, z)) return { x, z };
    const c = nearestCell(x, z);
    return c ? { x: cx(c[0]), z: cx(c[1]) } : null;
  }

  /** Línea de vista entre dos puntos del mundo: muestreo cada ~1/3 de celda. */
  function clear(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(d / (cell * 0.33)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (!isFree(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /* A* con heap binario mínimo sobre índices de celda. */
  const g = new Float32Array(N * N);
  const came = new Int32Array(N * N);
  const closed = new Uint8Array(N * N);
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

  function astar(s, t) {
    g.fill(Infinity);
    came.fill(-1);
    closed.fill(0);
    const [tx, tz] = [t % N, Math.floor(t / N)];
    const h = (i) => {
      const dx = Math.abs((i % N) - tx), dz = Math.abs(Math.floor(i / N) - tz);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);   // octil
    };
    const heap = [];   // [f, i]
    const push = (f, i) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1, r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };

    g[s] = 0;
    push(h(s), s);
    while (heap.length) {
      const [, i] = pop();
      if (closed[i]) continue;
      if (i === t) break;
      closed[i] = 1;
      const ix = i % N, iz = Math.floor(i / N);
      for (const [dx, dz, cost] of DIRS) {
        const nx = ix + dx, nz = iz + dz;
        if (!freeCell(nx, nz)) continue;
        // diagonal: no cortar la esquina de un obstáculo
        if (dx && dz && (!freeCell(ix + dx, iz) || !freeCell(ix, iz + dz))) continue;
        const j = idx(nx, nz);
        const ng = g[i] + cost;
        if (ng < g[j]) {
          g[j] = ng;
          came[j] = i;
          push(ng + h(j), j);
        }
      }
    }
    if (s !== t && came[t] < 0) return null;
    const cells = [];
    for (let i = t; i !== -1; i = came[i]) cells.push(i);
    return cells.reverse();
  }

  /** Camino de `from` a `to` ({x,z} en mundo). El primer punto es `from`; el
   *  último es `to`, o la celda libre más cercana si `to` cae dentro de un
   *  mueble. null si no hay camino. */
  function findPath(from, to) {
    const sc = nearestCell(from.x, from.z);
    const tc = nearestCell(to.x, to.z);
    if (!sc || !tc) return null;
    const cells = astar(idx(sc[0], sc[1]), idx(tc[0], tc[1]));
    if (!cells) return null;

    const end = isFree(to.x, to.z) ? { x: to.x, z: to.z } : { x: cx(tc[0]), z: cx(tc[1]) };
    const raw = [{ x: from.x, z: from.z }];
    // si arranca dentro de una celda bloqueada, primero sale a la libre más cercana
    if (!isFree(from.x, from.z)) raw.push({ x: cx(sc[0]), z: cx(sc[1]) });
    for (let k = 1; k < cells.length - 1; k++) raw.push({ x: cx(cells[k] % N), z: cx(Math.floor(cells[k] / N)) });
    raw.push(end);

    // Suavizado: desde cada punto, saltar al más lejano con línea de vista
    const out = [raw[0]];
    let a = 0;
    while (a < raw.length - 1) {
      let b = raw.length - 1;
      while (b > a + 1 && !clear(raw[a], raw[b])) b--;
      out.push(raw[b]);
      a = b;
    }
    return out;
  }

  /** Mapa ASCII para depurar desde consola (`#` bloqueada, `·` libre; fila 0 = fondo, −z). */
  function debugString() {
    let s = '';
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) s += blocked[idx(ix, iz)] ? '#' : '·';
      s += '\n';
    }
    return s;
  }

  return { findPath, nearestFree, isFree, clear, debugString, size: N };
}
