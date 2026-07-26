import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'

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

        // Archivos que deben servirse desde la raíz del sitio (no /public/)
        ['robots.txt', 'sitemap.xml'].forEach((file) => {
          const srcPath = resolve(__dirname, file);
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, resolve(__dirname, 'dist', file));
          }
        });
      } catch (e) {
        console.warn('[copy-static-folders] Warning:', e.message);
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
    // Para probar api/jotai-chat.js en local: correr `vercel dev --listen 3001`
    // en otra terminal (emula las funciones serverless) junto con `npm run dev`.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // Necesario para que @huggingface/transformers cargue sus WASM correctamente
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  plugins: [copyStaticFolders()],
})
