export interface TechInfo {
  color: string;
  iconSlug?: string;   // slug en cdn.simpleicons.org
  iconUrl?: string;    // URL directa (devicon u otra CDN) – tiene prioridad
  initials: string;
}

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

/**
 * Configuración de marca para cada tecnología.
 * - color: color del logo/marca oficial
 * - iconSlug: slug en cdn.simpleicons.org (la mayoría de tecnologías)
 * - iconUrl: URL directa de Devicon cuando simple-icons no funciona
 * - initials: fallback si ningún icono carga
 */
export const techConfig: Record<string, TechInfo> = {
  // ── Backend ──────────────────────────────
  'Node.js':        { color: '#339933',  iconSlug: 'nodedotjs',          initials: 'Nj' },
  'Django':         { color: '#092E20',  iconSlug: 'django',             initials: 'Dj' },
  'NestJS':         { color: '#E0234E',  iconSlug: 'nestjs',             initials: 'Ne' },
  'FastAPI':        { color: '#009688',  iconSlug: 'fastapi',            initials: 'Fa' },
  'ASP.NET Core':   { color: '#512BD4',  iconSlug: 'dotnet',             initials: '.N' },

  // ── Frontend ─────────────────────────────
  'React':          { color: '#61DAFB',  iconSlug: 'react',              initials: 'Re' },
  'Vue.js':         { color: '#4FC08D',  iconSlug: 'vuedotjs',           initials: 'Vu' },
  'Angular':        { color: '#DD0031',  iconSlug: 'angular',            initials: 'Ng' },
  'Svelte':         { color: '#FF3E00',  iconSlug: 'svelte',             initials: 'Sv' },
  'Next.js':        { color: '#000000',  iconSlug: 'nextdotjs',          initials: 'Nx' },

  // ── Base de Datos ────────────────────────
  'PostgreSQL':           { color: '#4169E1',  iconSlug: 'postgresql',                                                                   initials: 'Pg' },
  'MySQL':                { color: '#4479A1',  iconSlug: 'mysql',                                                                        initials: 'My' },
  'Redis':                { color: '#DC382D',  iconSlug: 'redis',                                                                        initials: 'Rd' },
  'Microsoft SQL Server': { color: '#CC2927',  iconUrl: `${DEVICON}/microsoftsqlserver/microsoftsqlserver-plain.svg`,                     initials: 'Ms' },

  // ── DevOps ───────────────────────────────
  'Docker':           { color: '#2496ED',  iconSlug: 'docker',          initials: 'Dk' },
  'Kubernetes':       { color: '#326CE5',  iconSlug: 'kubernetes',      initials: 'K8' },
  'Terraform':        { color: '#7B42BC',  iconSlug: 'terraform',       initials: 'Tf' },
  'Jenkins':          { color: '#D24939',  iconSlug: 'jenkins',         initials: 'Jk' },
  'GitHub Actions':   { color: '#2088FF',  iconSlug: 'githubactions',   initials: 'GA' },
  'Postman/Swagger':  { color: '#FF6C37',  iconSlug: 'postman',         initials: 'Pm' },

  // ── Cloud ────────────────────────────────
  'AWS':              { color: '#FF9900',  iconUrl: `${DEVICON}/amazonwebservices/amazonwebservices-original-wordmark.svg`,  initials: 'AW' },
  'Google Cloud':     { color: '#4285F4',  iconSlug: 'googlecloud',                                                         initials: 'GC' },
  'Microsoft Azure':  { color: '#0078D4',  iconUrl: `${DEVICON}/azure/azure-original.svg`,                                  initials: 'Az' },
  'Vercel':           { color: '#000000',  iconSlug: 'vercel',                                                               initials: 'Vc' },

  // ── IA & Herramientas ────────────────────
  'n8n':          { color: '#EA4B71',  iconSlug: 'n8n',                                                               initials: 'n8' },
  'OpenAI API':   { color: '#412991',  iconUrl: 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',                 initials: 'AI' },
  'Claude':       { color: '#D97706',  iconSlug: 'anthropic',                                                         initials: 'Cl' },
  'Cursor':       { color: '#000000',  iconUrl: 'https://www.cursor.com/brand/icon.svg',                              initials: 'Cu' },
  'TensorFlow':   { color: '#FF6F00',  iconSlug: 'tensorflow',                                                        initials: 'TF' },
};

export function getTechInfo(name: string): TechInfo {
  return techConfig[name] || { color: '#6B7280', initials: name.substring(0, 2) };
}

/** Devuelve la URL del icono: iconUrl directo > simple-icons CDN > null */
export function getTechIconUrl(name: string): string | null {
  const info = getTechInfo(name);
  // Prioridad 1: URL directa (devicon, worldvectorlogo, etc.)
  if (info.iconUrl) return info.iconUrl;
  // Prioridad 2: simple-icons CDN
  if (info.iconSlug) {
    const hex = info.color.replace('#', '');
    return `https://cdn.simpleicons.org/${info.iconSlug}/${hex}`;
  }
  return null;
}
