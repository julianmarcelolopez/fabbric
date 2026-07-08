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
