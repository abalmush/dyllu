# syntax=docker/dockerfile:1.7

# Build from the monorepo root so pnpm-workspace.yaml and pnpm-lock.yaml
# are accessible. In Coolify: set Build Context = "/" and Dockerfile path
# = "apps/backend/Dockerfile".

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# Workspace manifest + root configs first for install-layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/backend/package.json apps/backend/package.json

# Install only the backend workspace and its transitive deps.
# --frozen-lockfile fails if pnpm-lock.yaml is out of sync.
RUN pnpm install --frozen-lockfile --filter=@dyllu/backend...

# Backend source
COPY apps/backend apps/backend

# Produce apps/backend/.medusa/server — the standalone production app
RUN pnpm --filter=@dyllu/backend build

# Install production-only deps inside the built artifact so the runtime
# stage can copy a self-contained directory.
WORKDIR /repo/apps/backend/.medusa/server
RUN pnpm install --prod

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# Non-root user
RUN addgroup -S medusa && adduser -S medusa -G medusa
USER medusa

COPY --from=builder --chown=medusa:medusa /repo/apps/backend/.medusa/server/ ./

ENV NODE_ENV=production
ENV PORT=9000
EXPOSE 9000

# Health check — Medusa exposes /health on the same port
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9000/health >/dev/null 2>&1 || exit 1

CMD ["pnpm", "start"]
