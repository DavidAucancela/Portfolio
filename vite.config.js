import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'

/**
 * Plugin que copia la carpeta data/ al dist/ en el build.
 * Los JSON de proyectos se cargan con fetch() en runtime.
 */
function copyDataPlugin() {
  return {
    name: 'copy-data-folder',
    closeBundle() {
      const src  = resolve(__dirname, 'data');
      const dest = resolve(__dirname, 'dist', 'data');
      try {
        mkdirSync(dest, { recursive: true });
        readdirSync(src).forEach(file => {
          if (statSync(resolve(src, file)).isFile()) {
            copyFileSync(resolve(src, file), resolve(dest, file));
          }
        });
      } catch (e) {
        console.warn('[copy-data-plugin] Warning:', e.message);
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [copyDataPlugin()],
})
