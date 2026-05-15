# CIPHER — Intelligence Game

A dark, cinematic cyber-mystery intelligence game where players are elite agents of a secret organization called "The Archive" — solving puzzles, unraveling a branching storyline, competing globally, and evolving as players.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cipher-game run dev` — run the game frontend (port 21840)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with content
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + Framer Motion + TanStack Query
- API: Express 5 + Pino logger
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Source of truth for all API contracts
- `lib/api-client-react/src/generated/` — Generated TanStack Query hooks
- `lib/api-zod/src/generated/` — Generated Zod schemas for backend validation
- `lib/db/src/schema/` — Drizzle ORM schema (users, questions, story, matches, ranking)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, gameplay, story, ranking, social, ai)
- `artifacts/cipher-game/src/pages/` — All game pages (landing, register, dashboard, play, story, lore, leaderboard, profile, achievements, settings)
- `artifacts/cipher-game/src/components/` — Shared components (NavBar, RankBadge)
- `artifacts/cipher-game/src/lib/auth.ts` — Token management (localStorage "cipher_token")
- `scripts/src/seed.ts` — Database seed with questions, story, lore, achievements

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → typed hooks AND Zod schemas used on both client and server
- JWT-style token stored in localStorage ("cipher_token"), sent as `Authorization: Bearer <token>` via `setAuthTokenGetter`
- Dark mode enforced via `class="dark"` on `<html>` element (Tailwind v4 — can't use `@apply dark`)
- XP system: 500 XP per level, rank tiers: Bronze/Silver/Gold/Platinum/Diamond/Master/Legend
- Glassmorphism theme: deep-space black bg, electric blue/purple neon glows, monospace fonts

## Product

- **Landing** — Cinematic entry with lore teaser, agent login, and ghost agent access
- **Dashboard** — Command center with XP bar, stats, daily mission, recent activity
- **Play** — Live gameplay with animated timer ring, streak tracking, XP animations, answer feedback
- **Story** — Branching narrative chapters with dialogue nodes and player choices
- **Lore** — World codex with unlockable/classified entries about The Archive universe
- **Leaderboard** — Global and daily rankings with rank tier badges and season info
- **Profile** — Agent dossier with AI intelligence profile, match history, stats
- **Achievements** — Commendations catalog with unlock tracking
- **Settings** — Avatar selection, agent info display

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- After DB schema changes, run `pnpm run typecheck:libs` to rebuild DB declarations for the API server
- Tailwind v4 does not support `@apply dark` — always add `class="dark"` to HTML element instead
- The shared proxy routes `/api` to port 8080 (API server) and `/` to port 21840 (cipher-game frontend)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
