// Pipeline final de la patineta: perfil + contorno real medidos del escaneo,
// recorte del canto deshilachado y de los flecos fuera del contorno. Guarda el
// contorno en los extras del mesh (la escena arma la lija y el canto con eso).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const T = 0.012, BIN = 0.01;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('../skate-clean.glb');
const mesh = doc.getRoot().listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const p = prim.getAttribute('POSITION').getArray();
const N = p.length / 3;
const pct = (a, q) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.max(0, Math.floor(q * (b.length - 1))))]; };
// 1) perfil (cara de stickers) por franja, en el centro
const Y0 = -0.42, NB = 84;
const surf = new Array(NB).fill(null);
for (let b = 0; b < NB; b++) {
  const c = [];
  for (let i = 0; i < N; i++) { const y = p[i*3+1]; if (Math.abs(p[i*3]) < 0.05 && y >= Y0 + b*BIN && y < Y0 + (b+1)*BIN) c.push(p[i*3+2]); }
  if (c.length > 8) surf[b] = pct(c, 0.05);
}
let b0 = surf.findIndex((v) => v != null), b1 = NB - 1 - [...surf].reverse().findIndex((v) => v != null);
// 2) contorno: en la banda de la tabla (cerca de la cara), x mín y máx por franja
const xmin = [], xmax = [];
for (let b = b0; b <= b1; b++) {
  const s = surf[b] ?? surf[b - 1];
  const xs = [];
  for (let i = 0; i < N; i++) {
    const y = p[i*3+1], z = p[i*3+2];
    if (y >= Y0 + b*BIN && y < Y0 + (b+1)*BIN && z > s - T && z < s + 0.006) xs.push(p[i*3]);
  }
  xmin.push(xs.length > 10 ? pct(xs, 0.01) : null);
  xmax.push(xs.length > 10 ? pct(xs, 0.99) : null);
}
// suavizado (media móvil de 5) y relleno de huecos
const fill = (a) => a.map((v, i) => v ?? a.slice(0, i).reverse().find((x) => x != null) ?? a.find((x) => x != null));
const smooth = (a, r = 2) => a.map((_, i) => { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const v = a[i + k]; if (v != null) { s += v; n++; } } return s / n; });
const S = smooth(fill(surf.slice(b0, b1 + 1)), 2);
// forma limpia y simétrica (como una tabla real): ancho y centro = mediana del tramo
// recto; puntas redondeadas (semicírculo) — el contorno medido es ruidoso en las puntas
const mid = (a) => { const b = a.filter((v) => v != null).sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const nB = xmin.length, core = [Math.floor(nB * 0.3), Math.floor(nB * 0.7)];
const W = mid(xmax.slice(...core).map((v, i) => (v - xmin[core[0] + i]) / 2));
const CX = mid(xmax.slice(...core).map((v, i) => (v + xmin[core[0] + i]) / 2));
const yA = Y0 + (b0 + 0.5) * BIN - 0.004, yB = Y0 + (b1 + 0.5) * BIN + 0.004;   // puntas
const halfAt = (y) => { const d = Math.max(yA + W - y, y - (yB - W), 0); return Math.sqrt(Math.max(0, W * W - d * d)); };
const ysAll = S.map((_, i) => Y0 + (b0 + i + 0.5) * BIN);
const ys = ysAll;
const XL = ysAll.map((y) => CX - halfAt(y)), XR = ysAll.map((y) => CX + halfAt(y));
// altura de la cara cerca del canto (la tabla está curvada a lo ancho)
const edgeRaw = ysAll.map((y, i) => {
  const sc = S[i], hw = halfAt(y), zs = [];
  for (let j = 0; j < N; j++) {
    const yy = p[j*3+1], dx = Math.abs(p[j*3] - CX), z = p[j*3+2];
    if (Math.abs(yy - y) < BIN / 2 && dx > hw - 0.016 && dx < hw - 0.005 && z > sc - 0.03 && z < sc + 0.01) zs.push(z);
  }
  return zs.length > 6 ? pct(zs, 0.9) : null;
});
const E = smooth(fill(edgeRaw), 2);
const faceAt = (x, y) => { const hw = Math.max(1e-4, halfAt(y)); const u = Math.min(1, Math.abs(x - CX) / hw); return at(S, y) + (at(E, y) - at(S, y)) * u * u; };
const at = (arr, y) => { const f = Math.max(0, Math.min(arr.length - 1, (y - ys[0]) / BIN)); const i = Math.floor(f), t = f - i; return arr[i] + ((arr[Math.min(arr.length - 1, i + 1)] - arr[i]) * t); };
// 3) recorte: canto deshilachado (todo lo que baja más de 3 mm de la cara) y flecos fuera del contorno
const idx = prim.getIndices().getArray();
const keep = []; let cut = 0;
for (let t = 0; t < idx.length; t += 3) {
  const v = [idx[t], idx[t+1], idx[t+2]];
  const cx = v.reduce((s, k) => s + p[k*3], 0) / 3, cy = v.reduce((s, k) => s + p[k*3+1], 0) / 3, cz = v.reduce((s, k) => s + p[k*3+2], 0) / 3;
  const s = faceAt(cx, cy);
  const below = cz < s - 0.003;
  // 5 mm hacia adentro del contorno: el borde dentado del corte queda bajo el labio de madera
  const outside = cz < s + 0.012 && (Math.abs(cx - CX) > halfAt(cy) - 0.005 || cy < yA + 0.005 || cy > yB - 0.005);
  if (below || outside) { cut++; continue; }
  keep.push(...v);
}
prim.getIndices().setArray(new Uint16Array(keep));
const r = (a) => a.map((v) => Math.round(v * 10000) / 10000);
mesh.setExtras({ skateOutline: { y: r(ys), surf: r(S), xl: r(XL), xr: r(XR), thick: T, cutBelow: 0.003, ends: r([yA, yB]), edge: r(E), cx: r([CX])[0], halfW: r([W])[0] } });
await doc.transform(prune());
await io.write('../skate-final.glb', doc);
console.log({ W, CX, yA, yB, cut, kept: keep.length / 3, n: ys.length, yRange: [ys[0], ys[ys.length - 1]], width: [Math.min(...XL), Math.max(...XR)] });
