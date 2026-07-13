# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/backend/package.json apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter=@dyllu/backend...

COPY apps/backend apps/backend

RUN pnpm --filter=@dyllu/backend build

RUN HUSKY=0 pnpm --filter=@dyllu/backend deploy --prod --legacy /prod/backend

FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S medusa && adduser -S medusa -G medusa
USER medusa

COPY --from=builder --chown=medusa:medusa /prod/backend/node_modules ./node_modules
COPY --from=builder --chown=medusa:medusa /repo/apps/backend/.medusa/server/ ./

ENV NODE_ENV=production
ENV PORT=9000
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD wget -qO- http://127.0.0.1:9000/ready >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node_modules/.bin/medusa db:migrate && node_modules/.bin/medusa start"]
