# PADEL BROW

A Reclub-style padel community app: clubs, social meets with RSVP/waitlist, an
Americano/Mexicano match generator with live standings, formal competitions
(brackets), manual proof-of-payment, a rich social feed, in-app notifications,
and a podium-style leaderboard export.

Live site: https://fanoisme.github.io/padelbrow/

## Tech stack

- **Frontend:** Vue 3 (`<script setup>`) + Vite, hash-mode routing (`vue-router`)
- **Design system:** [Lithium](../Design%20Guide) `Li*` component library, vendored into `src/design-system/`
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage — accessed directly from the client via `@supabase/supabase-js`, secured with Row Level Security
- **Hosting:** GitHub Pages, built and deployed via GitHub Actions on every push to `main`
- **Testing:** Vitest + `@vue/test-utils`

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Other scripts:

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm test          # run the Vitest suite
```

## Database

Schema lives in `supabase/migrations/`. Migrations are applied to the live
Supabase project via the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Row Level Security is enabled on every table — it's the real access-control
boundary, since the anon key ships inside the static frontend build.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
app and publishes it to GitHub Pages. Two repo settings are required for this
to work (already configured for this repo):

- **Settings → Pages** → source set to "GitHub Actions"
- **Settings → Secrets and variables → Actions** → `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` set to the values from your Supabase project

## Project docs

- [Design spec](docs/superpowers/specs/2026-07-11-padel-brow-design.md) — full architecture, data model, and feature scope across all 9 planned build phases
- [Phase 1 (Foundation) plan](docs/superpowers/plans/2026-07-11-phase-1-foundation.md) — the implementation plan this codebase was built from

## Status

**Phase 1 (Foundation) complete:** app shell, design system, branding, PWA
installability, deploy pipeline, and the full database schema for all 9
planned phases. Feature phases (Identity & Clubs, Meets, Match Engine,
Payments, Competitions, Feed, Stats, Gamification) are built one at a time —
see the design spec for the full roadmap.
