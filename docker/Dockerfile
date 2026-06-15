# ─── Base ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ─── Dependencies ──────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/corsair/package.json ./packages/corsair/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY packages/services/package.json ./packages/services/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

# ─── Builder ───────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY . .

# ─── Web Builder ───────────────────────────────────────────────────────────
FROM builder AS web-builder
ARG NEXT_PUBLIC_API_URL=https://api.cruxsee.in
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm turbo build --filter=web

# ─── API Builder ───────────────────────────────────────────────────────────
FROM builder AS api-builder
RUN pnpm turbo build --filter=@repo/api

# ─── Web Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS web
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=web-builder /app/apps/web/.next/standalone ./
COPY --from=web-builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1
CMD ["node", "apps/web/server.js"]

# ─── API Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS api
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=prod
ENV PORT=4000

COPY --from=api-builder /app/apps/api/dist ./dist

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]

# ─── Migrator ─────────────────────────────────────────────────────────────
FROM builder AS migrator
RUN apk add --no-cache postgresql-client
WORKDIR /app
CMD ["sh", "-c", "cd packages/auth && pnpm migrate && cd ../database && pnpm db:migrate && cd ../corsair && psql $DATABASE_URL -f migration.sql"]
