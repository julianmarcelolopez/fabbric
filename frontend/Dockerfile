# Contexto de build: la RAÍZ del monorepo (ver docker-compose.yml) — npm workspaces
# necesita el package.json raíz para resolver dependencias hoisted.
FROM node:22-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm install --workspace @fabbric/frontend --no-audit --no-fund

WORKDIR /app/frontend
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
