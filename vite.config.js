import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

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

/**
 * Extrae el historial de PRs a partir de los mensajes de commit de `git log`,
 * sin depender de la API de GitHub (funciona offline / sin token).
 * Reconoce dos convenciones:
 *  - Squash-merge de GitHub: "<título> (#123)"
 *  - Merge commit clásico:   "Merge pull request #123 from user/branch-name"
 */
function parsePRHistory(cwd, limit = 8) {
  const DELIM = '\x1f'; // unit separator — no colisiona con shell ni con texto de commits
  const raw = execSync(
    `git log --pretty=format:%H${DELIM}%ad${DELIM}%s --date=short -n 500`,
    { cwd, encoding: 'utf-8' }
  ).trim();
  if (!raw) return [];

  const seen = new Set();
  const prs = [];

  raw.split('\n').forEach((line) => {
    const [hash, date, ...rest] = line.split(DELIM);
    const subject = rest.join(DELIM);

    let number = null;
    let title  = null;

    const squash = subject.match(/^(.*)\(#(\d+)\)\s*$/);
    const merge  = subject.match(/^Merge pull request #(\d+) from \S+\/(.+)$/);

    if (squash) {
      number = squash[2];
      title  = squash[1].trim();
    } else if (merge) {
      number = merge[1];
      title  = merge[2].replace(/[-_]/g, ' ').trim();
    }

    if (number && !seen.has(number)) {
      seen.add(number);
      prs.push({ number: Number(number), title, date, hash: hash.slice(0, 7) });
    }
  });

  return prs.slice(0, limit);
}

/** Cuenta los proyectos declarados en los 3 JSON de modo (dev/ia/sec), tal como se muestran en las cards. */
function countTotalProjects(cwd) {
  try {
    return ['dev-projects.json', 'ia-projects.json', 'sec-projects.json'].reduce((sum, file) => {
      const list = JSON.parse(readFileSync(resolve(cwd, 'data', file), 'utf-8'));
      return sum + (Array.isArray(list) ? list.length : 0);
    }, 0);
  } catch {
    return 0;
  }
}

/**
 * Genera data/git-history.json a partir de `git log` — commits por día de las
 * últimas 12 semanas + historial de PRs + stats generales, consumido por
 * js/git-history.js en el modo .dev (heatmap, PR list y cards de stats se
 * refrescan en vivo vía API de GitHub; este JSON es el fallback offline/sin token).
 * Falla en silencio (deja el JSON vacío) si git no está disponible.
 */
function generateGitHistory() {
  const WEEKS = 12;
  const outPath = resolve(__dirname, 'data', 'git-history.json');

  try {
    const raw = execSync(
      `git log --since="${WEEKS} weeks ago" --date=short --pretty=format:%ad`,
      { cwd: __dirname, encoding: 'utf-8' }
    ).trim();

    const counts = {};
    if (raw) {
      raw.split('\n').forEach((date) => {
        if (!date) return;
        counts[date] = (counts[date] || 0) + 1;
      });
    }

    const days = Object.keys(counts)
      .sort()
      .map((date) => ({ date, count: counts[date] }));

    const totalCommits = days.reduce((sum, d) => sum + d.count, 0);
    const prs = parsePRHistory(__dirname);

    const totalCommitsAllTime = Number(
      execSync('git rev-list --count HEAD', { cwd: __dirname, encoding: 'utf-8' }).trim()
    ) || totalCommits;

    const totalProjects = countTotalProjects(__dirname);

    writeFileSync(
      outPath,
      JSON.stringify(
        { weeks: WEEKS, days, totalCommits, totalCommitsAllTime, totalProjects, prs, generatedAt: new Date().toISOString() },
        null, 2
      )
    );
  } catch (e) {
    console.warn('[git-history] Warning:', e.message);
    writeFileSync(
      outPath,
      JSON.stringify({ weeks: WEEKS, days: [], totalCommits: 0, totalCommitsAllTime: 0, totalProjects: 0, prs: [], generatedAt: null })
    );
  }
}

/** Genera data/git-history.json al iniciar dev server y antes de cada build. */
function gitHistoryPlugin() {
  return {
    name: 'git-history',
    buildStart() {
      generateGitHistory();
    },
    configureServer() {
      generateGitHistory();
    },
  };
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
  plugins: [gitHistoryPlugin(), copyStaticFolders()],
})
