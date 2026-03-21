import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'

function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  readdirSync(src).forEach(file => {
    const srcPath  = resolve(src, file);
    const destPath = resolve(dest, file);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  });
}

/** Copia data/ y public/ al dist/ manteniendo la misma estructura de rutas. */
function copyStaticFolders() {
  return {
    name: 'copy-static-folders',
    closeBundle() {
      try {
        copyDirRecursive(resolve(__dirname, 'data'),   resolve(__dirname, 'dist', 'data'));
        copyDirRecursive(resolve(__dirname, 'public'), resolve(__dirname, 'dist', 'public'));
        copyDirRecursive(resolve(__dirname, 'assets'), resolve(__dirname, 'dist', 'assets'));
      } catch (e) {
        console.warn('[copy-static-folders] Warning:', e.message);
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',
  // Desactivar el publicDir de Vite para que no mueva public/ a la raíz de dist
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [copyStaticFolders()],
})
