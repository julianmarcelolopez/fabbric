# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml) — npm workspaces
# necesita el package.json raíz para resolver dependencias hoisted.
FROM node:22-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm install --workspace @fabbric/backend --no-audit --no-fund

WORKDIR /app/backend
EXPOSE 4000
CMD ["npx", "tsx", "watch", "src/index.ts"]

# ── Producción ────────────────────────────────────────────────────────────────
# @fabbric/shared exporta TypeScript crudo, sin build propio (ver
# packages/shared/package.json: exports "." -> "./src/index.ts") — se corre con
# tsx en vez de compilar con tsc, mismo runtime ya probado de punta a punta en
# dev durante todo el proyecto. Sin --target explícito, Docker toma el último
# stage del archivo por default: dejar este al final para que sea el que arma
# un host que no pase --target (ej. EasyPanel).
FROM node:22-alpine AS prod
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace @fabbric/backend --workspace @fabbric/shared --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY backend ./backend

WORKDIR /app/backend
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
