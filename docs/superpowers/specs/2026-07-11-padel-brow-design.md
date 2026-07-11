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
  skill_level, home_area — free-text city/area used for lightweight location-based player
  discovery, created_at)
- `blocks` (blocker_id, blocked_id, created_at) — PK (blocker_id, blocked_id); blocked users'
  content/DMs/invites are filtered out by RLS + query-level exclusion.

### Clubs
- `clubs` (id, name, slug unique, avatar_url, description, visibility: public|private,
  owner_id → profiles, created_at)
- `club_members` (club_id, user_id, role: owner|organizer|member, tags text[], joined_at) —
  PK (club_id, user_id)
- `club_memberships` (id, club_id, name, price, period: monthly|quarterly|annual,
  perks jsonb, created_at) — recurring pass tiers a club can offer (e.g. priority slot
  booking, fee discount).
- `club_membership_subscriptions` (id, membership_id, user_id, status: active|expired|
  cancelled, started_at, expires_at, payment_id → `payments`) — renewal is manual
  proof-of-payment like everything else in Phase 5, just recurring.

### Meets
- `meets` (id, club_id nullable, creator_id, sport: padel|billiards|football|…,
  format: social|americano|mexicano, title, starts_at, duration_minutes, venue_name,
  venue_address, venue_lat, venue_lng, max_players, privacy: public|private,
  fee_amount, fee_currency, min_level, max_level, gender_restriction, age_restriction,
  repeat_rule, host_role: host_and_play|host_only, cancellation_freeze_hours,
  auto_approve bool, allow_plus_one bool, notes text, status: scheduled|completed|cancelled,
  created_at)
- `meet_participants` (id, meet_id, user_id, role: organizer|player,
  status: confirmed|waitlisted|invited|declined, invited_by nullable → profiles,
  is_plus_one bool, joined_at, payment_status: none|pending|proof_uploaded|confirmed) —
  `invited_by` lets an organizer query their own invite history/response-rate across meets.
- `meet_polls` (id, meet_id, question, type: mvp_vote|best_moment|custom, closes_at,
  created_at) + `meet_poll_votes` (poll_id, voter_id, choice_user_id nullable,
  choice_text nullable) — PK (poll_id, voter_id), one vote per user per poll.

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
- `meet_expenses` (id, meet_id, label — e.g. "Court fee", "Ball rental", total_amount,
  split_method: equal|custom, created_at) — an itemized cost to divide among participants.
- `meet_expense_shares` (id, meet_expense_id, user_id, amount_owed) — one row per
  participant per expense; equal split computes `amount_owed` at creation, custom split is
  entered manually by the organizer.
- `payments` (id, meet_id nullable, competition_id nullable, membership_subscription_id
  nullable, expense_share_id nullable, user_id, amount, proof_url — Supabase Storage path,
  status: pending|confirmed|rejected, confirmed_by, confirmed_at, created_at) — the actual
  settle-up record (proof upload + organizer confirmation) against any of: a meet's flat fee,
  a specific `meet_expense_shares` row, a competition fee, or a membership renewal.

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
- `dm_threads` (id, user_a, user_b, created_at) — one thread per unordered pair of users —
  and `dm_messages` (id, thread_id, author_id, body, created_at), same Realtime pattern as
  `chat_messages`. Blocked users (`blocks`) cannot open/send to a thread.

### Moderation
- `reports` (id, reporter_id, target_type: feed_post|feed_comment|chat_message|dm_message|
  user, target_id, reason, status: pending|reviewed|actioned, created_at) — club
  owners/organizers (for club-scoped content) or the target user's reports review queue.

### Stats / Leaderboard
No dedicated stats table — always derived via SQL views / RPC functions over
`matches` + `match_players` (and `competition_matches` for competitions): matches won,
points won, win %, points %, score differential. Scoped per club, per meet, or global.

### Skill Rating
- `player_ratings` (user_id, rating numeric, matches_played, reliability_pct, last_updated) —
  Elo-style rating, updated by a Postgres trigger/RPC whenever a `matches` row gets a final
  score. Backs the `min_level`/`max_level` filters on meets with a real, moving number instead
  of a static self-reported field. `reliability_pct` climbs asymptotically with
  `matches_played` (e.g. towards 100% around ~20-30 logged matches) and is shown next to the
  rating so others can tell "provisional" from "stable" (mirrors Playtomic's reliability
  concept).

### Social / Network
- `follows` (follower_id, followee_id, created_at) — PK (follower_id, followee_id). Powers
  "My Network": follow players, see a feed of meets your followees are joining/hosting,
  quick-invite them to a new meet.

### Sharing
- `meets.public_share_slug` and `competitions.public_share_slug` (unique, short, nullable —
  generated on demand) — a public, read-only RLS policy exposes meet/competition details +
  live standings to anyone with the link, no login required. Same mechanism backs the
  **TV/Big-screen mode** (a route that renders just the standings/bracket full-screen,
  auto-refreshing via Realtime, meant to be opened on a venue's TV/monitor during play).

### Gamification (advanced)
- `xp_events` (id, user_id, source: meet_played|meet_won|hosted_meet|competition_played|
  referral|challenge_completed, amount, meta jsonb, created_at) — append-only XP ledger.
- `level_thresholds` (level, title, min_xp) — static reference table (e.g. Rookie → Amateur →
  Pro → Legend); a player's level is `level_thresholds` looked up against `sum(xp_events.amount)`,
  not stored redundantly.
- `achievements` (id, key, name, description, tier: bronze|silver|gold|platinum, icon,
  unlock_criteria jsonb) — e.g. "Win 5 in a row", "Play your first Americano", "Host 10 meets".
- `player_achievements` (user_id, achievement_id, unlocked_at) — evaluated by a Postgres
  function run after each match/meet completion.
- `seasons` (id, name, starts_at, ends_at) — season-scoped leaderboards are a derived query
  (stats view filtered to a season's date range), not a separate stored leaderboard.
- `challenges` (id, key, title, description, period: weekly|monthly, target_criteria jsonb,
  xp_reward, starts_at, ends_at) + `player_challenge_progress` (challenge_id, user_id,
  progress numeric, completed_at) — e.g. "Play 3 meets this week."
- **Head-to-head rivalry** and **MVP per meet** are pure derived queries (no dedicated
  table): rivalry = win/loss aggregation over `match_players` for two specific users across
  all their shared matches; MVP = highest win% within a single meet's `match_session`,
  computed once the session completes and cached on `meets.mvp_user_id` for fast display.

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

### Payments (manual proof-of-payment + split)
Organizer sets a fee on the meet/competition, and/or adds itemized `meet_expenses` (court
fee, ball rental, extra guest fee) split equally or custom across participants, producing
`meet_expense_shares`. Each participant uploads a payment proof image to Supabase Storage
against their flat fee or their specific share; a `payments` row is created as `pending`.
Organizer reviews and marks `confirmed`/`rejected` from the Participants panel, with an
outstanding-balance view (who's settled, who hasn't) and a one-tap reminder
(creates a `notifications` row for that user).

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

### Shareable public link & TV mode
Any meet or competition can generate a `public_share_slug`. Visiting `/#/s/:slug` (no auth)
shows a read-only view of details + live standings/bracket, updating via Realtime. A "TV
mode" variant of the same route strips chrome/nav and renders standings/bracket full-screen
and larger — meant to be opened on a venue TV/monitor during play, matching what
Americano Padel App / PadelMix offer with their shareable live links.

### Add to calendar
Meet detail exposes an "Add to calendar" action that generates a `.ics` file client-side
from the meet's schedule/venue/title — no external calendar API integration needed.

### Share match result as an image
After a match's score is finalized, a "Share result" action renders that single match
(players, score, court) to a shareable PNG (same `html-to-image` utility as the leaderboard
export), story-format sized for IG/WhatsApp sharing — distinct from the full leaderboard
export, scoped to one match.

### Search & filter meets
Home/discovery view supports filtering meets by venue, date range, format
(Social/Americano/Mexicano), and skill level range — needed once multiple clubs and meets
accumulate.

### PWA installability
A web app manifest + icon set make the app installable ("Add to Home Screen") on
mobile/desktop for an app-like feel, without service-worker push (see Non-Goals) — just
installability and a standalone display mode.

### Gamification (advanced)
- **XP & levels:** players earn XP for playing, winning, hosting, and completing challenges;
  level/title (Rookie → Amateur → Pro → Legend) shown on their profile.
- **Achievements:** tiered (bronze/silver/gold/platinum) badges unlocked automatically after
  matches/meets complete, with an unlock animation consistent with Lithium's signature
  moments (scale-in + glow + confetti, per `DESIGN.md` §1B–1D). Profile has a badge showcase.
- **Weekly/monthly challenges:** e.g. "Play 3 meets this week" — progress tracked, XP awarded
  on completion.
- **Seasons:** leaderboards can be scoped to a season (auto-resetting) alongside an
  always-on all-time leaderboard.
- **Head-to-head rivalry:** on a player's profile or before a match, show your historical
  record against a specific opponent.
- **MVP per meet:** auto-computed and highlighted on the meet's Matches tab once the session
  completes.
- **MVP vote / best-moment poll:** organizer can additionally open a `meet_polls` vote (e.g.
  "who was tonight's MVP?", "best moment") once the meet completes — a community-voted
  complement to the auto-computed MVP, not a replacement.

### Reliability score
Shown alongside skill rating everywhere it appears (profile, meet min/max level filter,
player discovery) as a small "provisional"/"stable" indicator so a brand-new player's
untested rating isn't weighted the same as someone with 30 logged matches.

### Player discovery
A directory view lets players search/filter other players by skill-level range and
`home_area`, independent of any specific club or meet — for finding a new partner or
opponent. Respects `blocks` (blocked users excluded both ways).

### Direct messages
1:1 chat (`dm_threads`/`dm_messages`, Realtime) reachable from a player's profile — separate
from per-meet group chat. Blocked users can't start or continue a thread.

### Invite tracking
Because `meet_participants.invited_by` is recorded, an organizer's profile/club dashboard can
show "people I've invited" with their latest response (joined/declined/no response) across
all their meets, so they know who to invite again vs. skip next time.

### Next booking home widget
The home screen surfaces a single "Up Next" card for the user's soonest confirmed meet
(date/time, venue, quick link into the meet) above the full list — no need to scroll/search
for something you already know you're attending.

### Membership / recurring pass
A club can define `club_memberships` (e.g. "Monthly Regular — Rp150.000/month — priority
RSVP + 10% meet fee discount"). Members subscribe (`club_membership_subscriptions`), paying
via the same manual proof-of-payment flow, renewed manually each period (no recurring-billing
automation — consistent with no payment-gateway integration).

### Report & block
Any feed post/comment, chat message, DM message, or user profile can be reported
(`reports`), landing in a review queue for the relevant club's owner/organizer (club-scoped
content) or a lightweight self-service block for direct harassment (`blocks` — hides that
user's content/DMs/invites immediately, no review needed).

## 5. Build Phases

Each phase is its own spec → plan → build → review cycle; this document covers the overall
architecture/data model, detailed phase specs are written just-in-time as each phase starts.

1. **Foundation** — repo init, Vite+Vue3 scaffold, GitHub Actions deploy pipeline, Supabase
   project wiring (schema + RLS baseline), Lithium design system port, Allo Bank branding +
   new PADEL BROW logo design, base nav/layout, hash-mode router, PWA manifest/installability.
2. **Identity & Clubs** — auth (email + Google), profile, create/browse/join clubs, roles,
   My Network (follow players, see their upcoming meets), player discovery (level + area
   search), club memberships/recurring passes.
3. **Meets** — create-meet wizard, meet detail (Details/Participants/Chat), RSVP/waitlist,
   in-app notifications, search/filter meets, add-to-calendar export, shareable public link,
   "Up Next" home widget, direct messages, invite tracking.
4. **Match Engine** — Americano/Mexicano/Team Americano/Singles generator, courts, live
   scoring, standings, skill rating + reliability score updates, share-match-result image,
   TV/big-screen mode.
5. **Payments** — fee config, itemized/split expenses, proof-of-payment upload, organizer
   confirmation + outstanding-balance reminders.
6. **Competitions** — registration, seeding, bracket/draw, multi-day tracking, shareable
   public link + TV mode reused from Phase 3/4.
7. **Feed** — rich posts (photo/video), likes, comments, per-club and global feed, report &
   block (covers feed/chat/DM content by this point).
8. **Stats, History & Leaderboard Export** — aggregate stats, personal history, podium-style
   leaderboard export.
9. **Advanced Gamification** — XP & levels, tiered achievements with unlock animations,
   weekly/monthly challenges, seasonal + all-time leaderboards, head-to-head rivalry stats,
   MVP per meet + MVP/best-moment voting.

## 6. Non-Goals (for now)

- Real payment gateway integration (Midtrans/Xendit/etc.) — manual proof-of-payment only.
- Push notifications requiring a push service/VAPID/edge-function trigger — in-app
  notification center only. (The app is PWA-installable per Phase 1, but installability is
  not the same as push — no background notifications when the app is closed.)
- Court/venue booking against real venue inventory (no venue-partner API integration) — venue
  is free-text + map link, as in Reclub's own meets.
- Native mobile apps — web SPA only (mobile-responsive, installable as a PWA).

## 7. Open Items to Confirm During Phase 1

- Exact Supabase project provisioning (who owns the project, billing) — needs a decision
  before Phase 1 can wire up real credentials.
- Final PADEL BROW logo concept (mascot vs. wordmark vs. badge, in the style of the club
  badge seen in the Reclub screenshots) — to be designed and approved during Phase 1.
