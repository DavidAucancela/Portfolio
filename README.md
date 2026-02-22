# Portfolio Fullstack - CV Online

Portfolio profesional para desarrollador fullstack con acceso a proyectos categorizados (P1, P2, P3).

## 🚀 Características

- ✅ Diseño moderno y responsive
- ✅ Categorización de proyectos (P1, P2, P3)
- ✅ Páginas de detalle de proyectos
- ✅ Sección de habilidades técnicas
- ✅ Información personal y contacto
- ✅ Optimizado para SEO
- ✅ Performance optimizada
- ✅ Animaciones suaves con Framer Motion

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Iconos**: Lucide React
- **Deployment**: Vercel (recomendado)

## 📦 Instalación

1. Clona el repositorio o descarga los archivos
2. Instala las dependencias:

```bash
npm install
```

3. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 📝 Configuración

### Personalizar Información Personal

Edita el archivo `data/personal.json` con tu información:

```json
{
  "name": "Tu Nombre",
  "title": "Tu Título",
  "bio": "Tu biografía...",
  "email": "tu.email@ejemplo.com",
  "location": "Tu Ciudad, País",
  "social": {
    "github": "https://github.com/tuusuario",
    "linkedin": "https://linkedin.com/in/tuusuario",
    "twitter": "https://twitter.com/tuusuario"
  }
}
```

### Agregar Proyectos

Edita el archivo `data/projects.json` y agrega tus proyectos siguiendo este formato. El campo `demo` en `links` es la URL del sistema desplegado; si no tienes demo, omítelo o déjalo vacío `""`.

```json
{
  "id": "1",
  "slug": "mi-proyecto",
  "title": "Título del Proyecto",
  "description": "Descripción corta",
  "fullDescription": "Descripción completa del proyecto...",
  "category": "P1",
  "tags": ["React", "Node.js"],
  "images": {
    "thumbnail": "URL_de_imagen",
    "gallery": ["URL1", "URL2"]
  },
  "links": {
    "demo": "https://tu-sistema-desplegado.com",
    "github": "https://github.com/usuario/proyecto"
  },
  "featured": true,
  "date": {
    "start": "2024-01-15",
    "end": "2024-03-20"
  },
  "techStack": {
    "frontend": ["React", "Next.js"],
    "backend": ["Node.js"],
    "tools": ["Docker"]
  },
  "highlights": [
    "Característica destacada 1",
    "Característica destacada 2"
  ]
}
```

### Agregar Habilidades

Edita el archivo `data/skills.json`:

```json
[
  {
    "name": "React",
    "category": "frontend",
    "level": "advanced"
  }
]
```

Niveles disponibles: `beginner`, `intermediate`, `advanced`, `expert`
Categorías: `frontend`, `backend`, `tools`, `other`

## 🎨 Personalización

### Colores

Edita `tailwind.config.js` para cambiar los colores del tema:

```javascript
colors: {
  primary: {
    DEFAULT: '#0066FF', // Tu color primario
    dark: '#0052CC',
    light: '#3385FF',
  }
}
```

### Fuentes

Las fuentes se configuran en `app/layout.tsx`. Puedes cambiar la fuente importando una diferente de Google Fonts.

## 🚀 Deployment

### Vercel (Recomendado)

1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Vercel detectará automáticamente Next.js y configurará todo
5. ¡Listo! Tu sitio estará en línea

### Otros Servicios

El proyecto también puede desplegarse en:
- Netlify
- AWS Amplify
- Railway
- Cualquier servicio que soporte Next.js

## 📁 Estructura del Proyecto

```
portfolio/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage
│   ├── projects/          # Páginas de proyectos
│   ├── about/             # Página sobre mí
│   ├── contact/           # Página de contacto
│   └── layout.tsx         # Layout principal
├── components/            # Componentes React
│   ├── ui/               # Componentes base
│   ├── sections/         # Secciones de página
│   ├── Navigation.tsx    # Navegación
│   └── Footer.tsx        # Footer
├── data/                 # Datos estáticos
│   ├── projects.json     # Proyectos
│   ├── skills.json       # Habilidades
│   └── personal.json     # Info personal
├── lib/                  # Utilidades
│   ├── api.ts           # Funciones de API
│   └── utils.ts         # Utilidades generales
└── types/               # TypeScript types
```

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Siéntete libre de hacer un fork y enviar un pull request.

## 📧 Contacto

Para preguntas o sugerencias, puedes contactarme a través de la página de contacto del portfolio.

---

Hecho con ❤️ usando Next.js y TypeScript
