# ==========================================
# Etapa 1: Build & Compilación
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar ficheros de dependencias
COPY package.json tsconfig.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar TypeScript)
RUN npm install

# Copiar el código fuente
COPY src/ ./src

# Compilar TypeScript a JavaScript estándar en /app/dist
RUN npm run build

# ==========================================
# Etapa 2: Imagen de Producción Limpia
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Establecer entorno de producción
ENV NODE_ENV=production

# Copiar el package.json para instalar solo dependencias de producción
COPY package.json ./

# Instalar exclusivamente dependencias de producción
RUN npm install --omit=dev && npm cache clean --force

# Copiar los artefactos compilados desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Usuario sin privilegios por seguridad (Best Practice Docker)
USER node

# Comando por defecto para ejecutar la CLI
CMD ["node", "dist/index.js"]