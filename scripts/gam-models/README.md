# Modelos 3D del modo `.gam` — cómo se generaron

Escaneos de David, optimizados con [`@gltf-transform/cli`](https://gltf-transform.dev)
y limpiados con scripts de Node (`@gltf-transform/core` + `functions`).

## Aegis (`public/models/aegis/`)
```bash
npx @gltf-transform/cli resize "Aegis .glb" a.glb --width 2048 --height 2048
npx @gltf-transform/cli webp a.glb aegis.glb --quality 82
```
`aegis-2019.webp` / `aegis-2020.webp`: el baseColor recoloreado (esmalte verde → violeta /
marrón, plata → cobre / dorado).

## Patineta (`public/models/skate/skate.glb`)
```bash
npx @gltf-transform/cli resize 2_10_2026.glb s.glb --width 2048 --height 2048
npx @gltf-transform/cli webp s.glb skate-opt.glb --quality 82
node skate-1-clean.mjs     # quita restos del piso y orienta (largo +Y, ruedas +Z)
node skate-2-outline.mjs   # perfil + contorno limpio, recorta el canto deshilachado
```
Los scripts leen/escriben `../skate-*.glb` relativo a donde se corren (ajustar rutas).
`skate-2-outline.mjs` guarda el contorno en `mesh.extras.skateOutline`: la escena
(`loadSkateModel`) arma con eso la lija, el canto y el labio de madera.
