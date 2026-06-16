# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/backend/package.json apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter=@dyllu/backend...

COPY apps/backend apps/backend

RUN pnpm --filter=@dyllu/backend build

WORKDIR /repo/apps/backend/.medusa/server
RUN npm install --omit=dev --no-package-lock --legacy-peer-deps

FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

RUN addgroup -S medusa && adduser -S medusa -G medusa
USER medusa

COPY --from=builder --chown=medusa:medusa /repo/apps/backend/.medusa/server/ ./

ENV NODE_ENV=production
ENV PORT=9000
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD wget -qO- http://127.0.0.1:9000/health >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node_modules/.bin/medusa db:migrate && node_modules/.bin/medusa start"]
