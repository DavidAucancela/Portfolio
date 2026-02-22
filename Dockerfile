# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: deps — instala SOLO las dependencias de producción
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Instala libc6-compat para compatibilidad Alpine
RUN apk add --no-cache libc6-compat

# Copia solo los manifests para aprovechar la caché de Docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: builder — hace el build de Next.js
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Instala TODAS las dependencias (incluyendo devDependencies para el build)
COPY package.json package-lock.json ./
RUN npm ci

# Copia el código fuente
COPY . .

# Desactiva telemetría de Next.js en build
ENV NEXT_TELEMETRY_DISABLED=1

# Build de producción
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: runner — imagen mínima para producción (~150MB vs ~1GB)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crea usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copia los archivos de producción del builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cambia el propietario al usuario no-root
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone server
CMD ["node", "server.js"]
