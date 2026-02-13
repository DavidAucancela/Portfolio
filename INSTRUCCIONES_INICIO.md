# 🚀 Instrucciones de Inicio Rápido

## Paso 1: Instalar Dependencias

```bash
npm install
```

## Paso 2: Personalizar tu Información

### 2.1 Información Personal
Edita `data/personal.json` con tus datos:
- Nombre completo
- Título profesional
- Biografía
- Email
- Ubicación
- Enlaces a redes sociales

### 2.2 Agregar tus Proyectos
Edita `data/projects.json`:
- Agrega tus proyectos reales
- Reemplaza las imágenes de ejemplo con screenshots de tus proyectos
- Actualiza los enlaces a demos y repositorios GitHub
- Ajusta las categorías (P1, P2, P3) según importancia

### 2.3 Actualizar Habilidades
Edita `data/skills.json`:
- Agrega todas tus habilidades técnicas
- Ajusta los niveles (beginner, intermediate, advanced, expert)
- Organiza por categorías (frontend, backend, tools, other)

## Paso 3: Personalizar Colores (Opcional)

Edita `tailwind.config.js` para cambiar los colores del tema según tu preferencia.

## Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver tu portfolio.

## Paso 5: Preparar para Producción

```bash
npm run build
npm run start
```

## Paso 6: Deploy a Vercel

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Vercel detectará automáticamente Next.js
4. Haz clic en "Deploy"
5. ¡Tu portfolio estará en línea en minutos!

## 📝 Notas Importantes

- **Imágenes**: Usa imágenes optimizadas. Puedes usar servicios como Cloudinary o simplemente subirlas a la carpeta `public/images/`
- **SEO**: El SEO básico ya está configurado. Puedes mejorarlo editando `app/layout.tsx`
- **Dominio Personalizado**: En Vercel puedes agregar tu dominio personalizado fácilmente

## 🎨 Personalización Avanzada

- **Fuentes**: Cambia las fuentes en `app/layout.tsx`
- **Animaciones**: Ajusta las animaciones en los componentes que usan Framer Motion
- **Estilos**: Modifica los estilos en `app/globals.css` o crea nuevos componentes

## ❓ Problemas Comunes

### Error al instalar dependencias
```bash
# Limpia la caché y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Error de imágenes
- Asegúrate de que las URLs de imágenes sean válidas
- O sube las imágenes a `public/images/` y usa rutas relativas

### Error de TypeScript
```bash
# Regenera los tipos de Next.js
npm run build
```

## 📚 Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Documentación de Framer Motion](https://www.framer.com/motion/)

¡Éxito con tu portfolio! 🎉
