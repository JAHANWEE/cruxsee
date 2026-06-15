# Knowledge

## Stack
- Monorepo: Turborepo + pnpm@9.0.0
- Web: Next.js 16.1.0 (standalone output) → port 3000
- API: Express + tRPC, bundled via tsup → port 4000
- DB: PostgreSQL 15, ORM = Drizzle (packages/database)
- Reverse proxy: Caddy (auto SSL)
- CI/CD: GitHub Actions → GHCR → SSH pull on VM

## Deployment Flow
```
push main → GH Actions builds web+api images → pushes to ghcr.io → SSH into VM → docker compose pull && up -d
```

## Docker Architecture
- Multi-stage Dockerfile in `docker/Dockerfile`
  - Targets: `web` (Next.js standalone) and `api` (node dist)
- Production compose in `docker/docker-compose.yml`
  - Services: caddy, web, api, postgres
- Caddyfile handles domain routing + auto TLS

## Domains
- home.cruxsee.in → web (landing, temporary — will move to cruxsee.in later)
- chat.cruxsee.in → web (chat app, same Next.js app, different routes)
- api.cruxsee.in → api

## Secrets (GitHub Actions)
- VM_HOST, VM_USER, VM_SSH_KEY

## VM Path
- ~/cruxsee/ contains: docker-compose.yml, Caddyfile, .env

## Cleanup Done
- Removed @teachyst references from tsup.config.ts (replaced with @repo)
- Removed Streamyst references from API server
- next.config.js set to output: "standalone"
- API default port changed to 4000

## Phase 1 Status: COMPLETE ✅
- GitHub Actions deploy.yml created
- Multi-stage Dockerfile (web + api targets)
- Production docker-compose.yml with health checks
- Caddyfile for domain routing
- .env.example for VM configuration

## Next Phase: Database (Phase 3 per PLAN.md)
- Drizzle schema: User, Thread, Message, ToolCall tables
- packages/database already has drizzle setup
