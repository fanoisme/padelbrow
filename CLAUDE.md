# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PADEL BROW — Reclub-style padel community app. Clubs, meets, matches, competitions, feed, gamification. Deployed to GitHub Pages at `/padelbrow/`.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build → dist/
npm test           # Vitest (run mode, not watch)
npm run preview    # Preview production build
```

Run a single test file: `npx vitest run src/composables/useAuth.spec.js`

## Tech Stack

- **Vue 3** with Composition API (`<script setup>`)
- **Vite 5** build tool
- **vue-router 4** — hash-mode routing (required for GitHub Pages)
- **Supabase** — Postgres DB, Auth (email + Google OAuth), Storage, Realtime
- **PWA** via vite-plugin-pwa (auto-update, standalone)
- **Vitest 2** + @vue/test-utils — jsdom environment, co-located tests

## Environment Variables

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

GitHub Actions secrets mirror these for CI deploy.

## Architecture

### Core Pattern: Composables

All Supabase interactions wrapped in Vue composables (`src/composables/useXxx.js`). Each composable file has a co-located `.spec.js` test. 25 composables total.

### Auth Flow

`initAuth()` in `src/main.js` restores Supabase session before Vue app mounts. Routes with `meta: { requiresAuth: true }` redirect to `/login` via router guard.

### Design System (Lithium)

Vendored in `src/design-system/`. 57 `Li*` components + tokens in `tokens.css`. Brand color: `#FFAF03`. Dark-first with light mode support via `useTheme()` singleton (init in `App.vue`).

### Routing

Hash-mode (`#/path`) — 20 routes. Key path patterns:
- `/clubs/:id` — club detail
- `/meets/:meetId/match-session/:sessionId?` — match sessions within meets
- `/competitions/:id` — competition brackets

### Database

Supabase Postgres with 22 migrations in `supabase/migrations/`. RLS enabled on all tables (the real access-control boundary, since the anon key ships inside the static frontend build). Core tables: `profiles`, `clubs`, `club_members`, `meets`, `match_sessions`, `match_rounds`, competitions, payments, feed, notifications, chat, gamification.

Apply migrations to the linked Supabase project via the CLI: `npx supabase db push` (after `npx supabase login` + `npx supabase link --project-ref <ref>`).

### Layout

Single layout (`src/layouts/AppLayout.vue`) with bottom nav bar. Page transitions use `li-page` transition name with slide animation. Respects `prefers-reduced-motion`.

## Testing

- Tests co-located: `Component.spec.js` next to `Component.vue`
- Setup file: `src/test-setup.js` (polyfills for matchMedia, IntersectionObserver, ResizeObserver)
- `npm test` runs all tests; use `npx vitest run <path>` for single file

## Deployment

GitHub Actions on push to `main`: install → test → build → deploy to Pages. Base path `/padelbrow/` baked into vite config and PWA manifest.

## Key File Locations

- Entry: `src/main.js` → `src/App.vue` → `src/router/index.js`
- Supabase client: `src/lib/supabase.js`
- Design tokens: `src/design-system/tokens.css`
- Match/tournament logic: `src/lib/matchFormatGenerators.js`, `src/lib/tournamentGenerators.js`

## Project Docs

The app was built in phases from a design spec, with a plan doc per phase — check these before making architectural changes:
- `docs/superpowers/specs/2026-07-11-padel-brow-design.md` — full architecture, data model, and feature scope across all 9 planned phases
- `docs/superpowers/plans/*.md` — one plan per build phase (foundation, identity/clubs, meets, match engine, payments, competitions, feed, stats/leaderboard) plus later UI/UX rework and immersive-redesign phases
