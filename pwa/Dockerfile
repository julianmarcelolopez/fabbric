# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml) — npm workspaces
# necesita el package.json raíz para resolver dependencias hoisted.
FROM node:22-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json ./
COPY pwa/package.json ./pwa/
RUN npm install --workspace @fabbric/pwa --no-audit --no-fund

WORKDIR /app/pwa
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host"]

# ── Producción ────────────────────────────────────────────────────────────────
# Sin --target explícito, Docker toma el último stage del archivo por default:
# dejar "prod" al final para que sea el que arma un host que no pase --target
# (ej. EasyPanel).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY pwa/package.json ./pwa/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace @fabbric/pwa --workspace @fabbric/shared --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY pwa ./pwa

# Vite hornea las VITE_* en el bundle acá — tienen que estar seteadas ANTES del build,
# no se pueden cambiar después sin rebuildear.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/pwa
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/pwa/dist /usr/share/nginx/html
# SPA: cualquier ruta que no matchee un archivo real cae a index.html (igual que
# frontend/Dockerfile). sw.js lo sirve bien el default de nginx (.js), pero
# .webmanifest no está en su tabla de mime.types por default y cae a
# application/octet-stream — verificado al probar el build de producción, se
# fuerza acá el tipo correcto.
RUN printf 'server {\n    listen 80;\n    location / {\n        root /usr/share/nginx/html;\n        try_files $uri /index.html;\n    }\n    location ~* \\.webmanifest$ {\n        root /usr/share/nginx/html;\n        default_type application/manifest+json;\n    }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
