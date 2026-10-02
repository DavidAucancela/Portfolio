// Limpia y orienta el escaneo de la patineta de David:
//  - quita los restos del piso (triángulos planos a la altura de la cubierta fuera del contorno)
//  - gira: largo → +Y, ancho → +X, ruedas/stickers → +Z; la cara de la lija (no escaneada) en z≈0
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const [LH, WH, LOWY] = [Number(process.argv[2] || 0.405), Number(process.argv[3] || 0.108), 0.06];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('../skate-opt.glb');
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const posA = prim.getAttribute('POSITION');
const pos = posA.getArray();
const n = pos.length / 3;
const th = -0.41371826886494517, mx = 0.00197881002693438, mz = 0.057110717234112186;
const c = Math.cos(th), s = Math.sin(th);
const U = new Float32Array(n), V = new Float32Array(n), Y = new Float32Array(n);
for (let i = 0; i < n; i++) { const x = pos[i*3]-mx, z = pos[i*3+2]-mz; U[i] = x*c + z*s; V[i] = -x*s + z*c; Y[i] = pos[i*3+1]; }
// el contorno: rectángulo con nose/tail redondeados (cápsula), centrado en el medio de la tabla
const inside = (u, v) => { const k = Math.abs(u) - (LH - WH); return Math.abs(v) <= WH && (k <= 0 || k * k + v * v <= WH * WH); };
const idx = prim.getIndices().getArray();
const keep = [];
let dropped = 0;
for (let t = 0; t < idx.length; t += 3) {
  const a = idx[t], b = idx[t+1], d = idx[t+2];
  const cu = (U[a]+U[b]+U[d])/3, cv = (V[a]+V[b]+V[d])/3, cy = (Y[a]+Y[b]+Y[d])/3;
  if (cy < LOWY && !inside(cu, cv)) { dropped++; continue; }
  keep.push(a, b, d);
}
// eje de altura: piso de la cubierta (lija) en z = 0
let y0 = Infinity; for (let i = 0; i < n; i++) if (inside(U[i], V[i])) y0 = Math.min(y0, Y[i]);
const out = new Float32Array(n * 3);
let zmax = 0;
for (let i = 0; i < n; i++) { out[i*3] = V[i]; out[i*3+1] = U[i]; out[i*3+2] = Y[i] - y0; zmax = Math.max(zmax, Y[i] - y0); }
posA.setArray(out);
prim.getIndices().setArray(new Uint16Array(keep));
await doc.transform(prune());
await io.write('../skate-clean.glb', doc);
console.log({ dropped, kept: keep.length / 3, y0, zmax, LH, WH });
