# Axiom Arena game server (WebSocket). Build context: repository root.
#   docker build -t axiom-arena-server .
#   docker run -p 8787:8787 -e NODE_ENV=production -e SUPABASE_URL=… -e SUPABASE_SERVICE_ROLE_KEY=… -e ALLOWED_ORIGINS=https://your-site axiom-arena-server
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run server:build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/server/dist ./server/dist
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/healthz || exit 1
USER node
CMD ["node", "server/dist/index.mjs"]
