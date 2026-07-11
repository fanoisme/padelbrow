# PADEL BROW — Design Spec

**Date:** 2026-07-11
**Status:** Approved for implementation (phased)

## 1. Summary

PADEL BROW is a Reclub-style padel community app: clubs, social "meets" with RSVP/waitlist,
an Americano/Mexicano match generator with live standings, formal competitions (brackets),
manual proof-of-payment, a rich social feed, in-app notifications, and a leaderboard with a
podium-style export. It is a real multi-user product (not a local-only demo).

**Reference material:**
- Feature/flow reference: `Reclub App Example/*.jpeg` (screenshots of Reclub)
- Design system: `../Design Guide/` (General Lithium 1.0 — `DESIGN.md`, `tokens.css`, `components/`)
- Branding: Allo Bank logo (`Pic/logo-allo.png`) + a new PADEL BROW logo (created in Phase 1)

**Competitor research informing scope:** Playtomic (booking + social formats + stats),
Americano Padel App / PadelMix (dedicated Americano/Mexicano tournament generators, shareable
live-updating standings link), Qlutch (fast scoring UX, stats, shareable results), Courtside
(Indonesia-market booking app, favorite clubs, notifications on slot open).

## 2. Architecture

- **Frontend:** Vue 3 (Composition API, `<script setup>`) + Vite. SPA, no SSR.
- **Hosting:** GitHub Pages, static build published via GitHub Actions on push to `main`.
- **Routing:** Vue Router in **hash mode** — GitHub Pages has no server-side rewrite, hash
  mode makes deep links (`/#/meets/:id`) work without a 404.html redirect hack.
- **Backend:** Supabase (hosted Postgres + Auth + Realtime + Storage). The SPA talks to
  Supabase directly via `@supabase/supabase-js` using the public anon key. All access control
  is enforced through Postgres **Row Level Security (RLS)** — this is the real security
  boundary since the anon key ships in the static bundle.
- **Auth:** Supabase Auth — email/password + Google OAuth. Redirect URLs configured for the
  GitHub Pages origin (and `localhost` for dev).
- **Design system:** Port the existing Lithium `Li*` component library (51 components,
  `tokens.css`, `composables/useRipple.js`, `composables/useToast.js`) from
  `../Design Guide/components` and `../Design Guide/composables` into this repo
  (e.g. `src/design-system/`). Follow `DESIGN.md` for all visual/motion rules — organic/glass
  aesthetic, signature moments (hero entrance, balance reveal, transaction success, card flip),
  pill buttons, `--radius-lg` minimum on cards, semantic color tokens only (never raw
  primitives), `prefers-reduced-motion` support.
- **Branding:** Allo Bank logo (`logo-allo.png`) in the hero entrance, nav header, and auth
  screens. A new PADEL BROW logo/mascot is designed in Phase 1 (SVG, following Lithium's
  organic-fintech visual language) and used as the primary app icon/wordmark.
- **State/data fetching:** Composables per domain (`useClubs`, `useMeets`, `useMatches`, …)
  wrapping Supabase queries; Pinia for cross-cutting client state (current user/session, UI
  state) if a single composable-per-page pattern proves insufficient once building starts.

## 3. Data Model (Supabase Postgres)

All tables have RLS enabled. Ownership/membership checks are expressed as policies, not
app-level checks.

### Identity
- `profiles` (id = auth.users.id, full_name, avatar_url, phone, gender, birthdate,
  skill_level, created_at)

### Clubs
- `clubs` (id, name, slug unique, avatar_url, description, visibility: public|private,
  owner_id → profiles, created_at)
- `club_members` (club_id, user_id, role: owner|organizer|member, tags text[], joined_at) —
  PK (club_id, user_id)

### Meets
- `meets` (id, club_id nullable, creator_id, sport: padel|billiards|football|…,
  format: social|americano|mexicano, title, starts_at, duration_minutes, venue_name,
  venue_address, venue_lat, venue_lng, max_players, privacy: public|private,
  fee_amount, fee_currency, min_level, max_level, gender_restriction, age_restriction,
  repeat_rule, host_role: host_and_play|host_only, cancellation_freeze_hours,
  auto_approve bool, allow_plus_one bool, notes text, status: scheduled|completed|cancelled,
  created_at)
- `meet_participants` (id, meet_id, user_id, role: organizer|player,
  status: confirmed|waitlisted|invited|declined, is_plus_one bool, joined_at,
  payment_status: none|pending|proof_uploaded|confirmed)

### Match engine
- `match_sessions` (id, meet_id, format: americano|mexicano|team_americano|singles,
  ranking_criteria: matches_won|points_won|win_pct|points_pct, num_courts,
  total_set_points, prioritize_least_matches bool, status: setup|in_progress|completed,
  created_at)
- `match_rounds` (id, match_session_id, round_number, status: pending|completed)
- `matches` (id, match_round_id, court_number, score_a, score_b, status)
- `match_players` (match_id, user_id, team: a|b) — join table, supports singles (1 per team)
  and doubles (2 per team) uniformly

### Competitions
- `competitions` (id, club_id, name, sport, format: single_elim|double_elim|round_robin|groups,
  registration_opens_at, registration_closes_at, starts_at, ends_at, max_participants,
  fee_amount, status: draft|registration_open|in_progress|completed, created_at)
- `competition_teams` (id, competition_id, name, player_ids uuid[])
- `competition_registrations` (competition_id, team_id, seed, status: pending|confirmed)
- `competition_matches` (id, competition_id, round_name, bracket_position, team_a_id,
  team_b_id, score_a, score_b, court, scheduled_at, status)

### Payments
- `payments` (id, meet_id nullable, competition_id nullable, user_id, amount,
  proof_url — Supabase Storage path, status: pending|confirmed|rejected, confirmed_by,
  confirmed_at, created_at)

### Feed (rich)
- `feed_posts` (id, club_id nullable, meet_id nullable, author_id, caption,
  media_urls text[] — Supabase Storage, created_at)
- `feed_likes` (post_id, user_id) — PK (post_id, user_id)
- `feed_comments` (id, post_id, author_id, body, created_at)

### Notifications
- `notifications` (id, user_id, type, payload jsonb, read_at nullable, created_at) —
  populated by Postgres triggers (new participant, meet full, waitlist promoted, new chat
  message, payment confirmed, competition round ready, new feed comment/like on your post,
  etc.), consumed via a Supabase Realtime subscription + bell icon in the nav.

### Chat
- `chat_messages` (id, meet_id, author_id, body, created_at) — realtime via Supabase
  Realtime (Postgres changes) on this table, one channel per meet.

### Stats / Leaderboard
No dedicated stats table — always derived via SQL views / RPC functions over
`matches` + `match_players` (and `competition_matches` for competitions): matches won,
points won, win %, points %, score differential. Scoped per club, per meet, or global.

## 4. Key Flows

### Create Meet wizard (mirrors Reclub)
1. Select club (or skip → personal/no-club meet)
2. Sport + format (Social / Americano / Mexicano)
3. Schedule: date/time, duration, venue (address + map link)
4. Players: max players, privacy (public/private), fee, min/max level
5. Advanced: gender/age restriction, repeat rule, host's role, cancellation freeze,
   auto-approve toggle, allow +1 toggle
6. Creates `meets` row + creator as `meet_participants` organizer row; if a club is selected,
   matching-tag members get notified (per `notifications`).

### Meet detail
Tabs: **Details** (club, organizer/participant avatars, contact hosts, schedule, venue +
map link, notes, "Get more players" CTA) / **Participants** (payments panel, auto-approve
toggle, organizers, confirmed/waitlisted list with tags) / **Matches** (match engine, below)
/ **Chat** (realtime per-meet thread).

### Match generation (Americano / Mexicano / Team Americano / Singles)
- **Americano:** full round-robin, schedule fixed upfront — every player partners with every
  other player across rounds.
- **Mexicano:** rounds generated dynamically after each round completes, based on current
  standings (winners paired together, etc.) — implemented as "generate next round" rather
  than "generate all rounds upfront."
- **Team Americano:** round robin over preset teams (from Participants tab), not individuals.
- **Singles:** round robin, 1v1.
- Setup: ranking criteria, number of courts, player selection (with "prioritize least
  matches" to equalize playing time when player count isn't a multiple of 4), total set
  points (16/21/24/32 or custom).
- Byes are computed and shown per round when player count doesn't divide evenly across
  courts.
- Standings view: sortable by wins / points / win% / points% (`By Wins`, `By Points`, etc.),
  each row shows wins (and match count), score differential.

### Payments (manual proof-of-payment)
Organizer sets a fee on the meet/competition. Participant uploads a payment proof image to
Supabase Storage; a `payments` row is created as `pending`. Organizer reviews and marks
`confirmed`/`rejected` from the Participants panel. `meet_participants.payment_status`
mirrors this for quick list rendering.

### Competitions (formal tournaments)
Separate creation flow from Meet: name, format (single/double elimination, round robin, or
groups), registration window, fee, max participants. Registration produces
`competition_teams` + `competition_registrations`. On registration close, an organizer
triggers seeding + bracket/draw generation, producing `competition_matches`. Multi-day
tracking: matches carry their own `scheduled_at`/`court`/`status`, independent of the parent
competition's date range.

### Feed (rich)
Posts scoped to a club and/or a specific meet, with photo/video upload (Supabase Storage),
caption, likes, and comments. Two views: per-club feed and a global feed aggregating across
the user's clubs. Meet completion surfaces a lightweight "share a moment from this meet?"
prompt (optional, not forced).

### Notifications (in-app)
Bell icon + list in the nav, backed by the `notifications` table and a Realtime subscription
(no service worker / push permissions / VAPID keys). Triggers: joined/waitlisted, meet full,
waitlist promotion, new chat message, payment confirmed, competition round generated, feed
like/comment on your post.

### Leaderboard & Export
Standings (per meet's match session, or aggregated per club/competition) render with a
distinct **podium treatment for #1/#2/#3** (gold/silver/bronze accents, medal iconography,
scaled/elevated card for #1) consistent with Lithium's celebratory motion language (confetti
burst / glow pulse on reveal, per `DESIGN.md` §1B–1D). An **Export** action renders the
current standings (podium + full list) to a shareable PNG image (client-side, e.g.
`html-to-image` against an off-screen styled component) — no server round-trip needed.

## 5. Build Phases

Each phase is its own spec → plan → build → review cycle; this document covers the overall
architecture/data model, detailed phase specs are written just-in-time as each phase starts.

1. **Foundation** — repo init, Vite+Vue3 scaffold, GitHub Actions deploy pipeline, Supabase
   project wiring (schema + RLS baseline), Lithium design system port, Allo Bank branding +
   new PADEL BROW logo design, base nav/layout, hash-mode router.
2. **Identity & Clubs** — auth (email + Google), profile, create/browse/join clubs, roles.
3. **Meets** — create-meet wizard, meet detail (Details/Participants/Chat), RSVP/waitlist,
   in-app notifications.
4. **Match Engine** — Americano/Mexicano/Team Americano/Singles generator, courts, live
   scoring, standings.
5. **Payments** — fee config, proof-of-payment upload, organizer confirmation.
6. **Competitions** — registration, seeding, bracket/draw, multi-day tracking.
7. **Feed** — rich posts (photo/video), likes, comments, per-club and global feed.
8. **Stats, History & Leaderboard Export** — aggregate stats, personal history, podium-style
   leaderboard export.

## 6. Non-Goals (for now)

- Real payment gateway integration (Midtrans/Xendit/etc.) — manual proof-of-payment only.
- Push notifications requiring service worker/PWA install — in-app notification center only.
- Court/venue booking against real venue inventory (no venue-partner API integration) — venue
  is free-text + map link, as in Reclub's own meets.
- Native mobile apps — web SPA only (mobile-responsive).

## 7. Open Items to Confirm During Phase 1

- Exact Supabase project provisioning (who owns the project, billing) — needs a decision
  before Phase 1 can wire up real credentials.
- Final PADEL BROW logo concept (mascot vs. wordmark vs. badge, in the style of the club
  badge seen in the Reclub screenshots) — to be designed and approved during Phase 1.
